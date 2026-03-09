import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';

interface RouletteSlice {
    label: string;
    weight: number;
    bg: string;
    text: string;
    startAngle: number;
    endAngle: number;
}

@Component({
    selector: 'app-game-ruleta',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="ruleta-container">
        <h1 class="ruleta-title">Ruleta Final</h1>
        <p class="ruleta-score">Puntos totales: {{ game.score() }}</p>
        <p class="ruleta-spins" *ngIf="!spinResult && !showCode">Tiradas extra disponibles: {{ game.extraSpins() }}</p>

        <div class="ruleta-wrapper" *ngIf="!showCode">
            <div class="ruleta-wheel" [style.transform]="'rotate(' + currentRotation + 'deg)'">
                <div class="slice-label" *ngFor="let s of slices" 
                     [style.transform]="'rotate(' + getLabelRotation(s) + 'deg) translate(0, -90px)'">
                </div>
                <!-- Drawing slices with conic-gradient via TS style injection -->
                <div class="wheel-bg" [style.background]="wheelGradient"></div>
            </div>
            <div class="ruleta-pointer"></div>
        </div>

        <button class="btn-pill spin-btn" *ngIf="!isSpinning && !spinResult && !showCode && canSpin" (click)="spin()">
            Girar Ruleta
        </button>

        <!-- Paso 1 de Premio: Tirada finaliza pero el código aún NO se muestra -->
        <div class="result-box" *ngIf="spinResult && !showCode">
            <h2>¡Enhorabuena!</h2>
            <p>Has ganado un código de descuento.</p>
            
            <div class="decision-buttons" *ngIf="game.extraSpins() > 0">
                <p>Aún tienes {{ game.extraSpins() }} tiradas más.</p>
                <button class="btn-pill" (click)="keepCode()">Me quedo este premio</button>
                <button class="btn-pill btn-danger" (click)="spinAgain()">Arriesgar y tirar de nuevo</button>
            </div>
            <div class="decision-buttons" *ngIf="game.extraSpins() === 0">
                <button class="btn-pill" (click)="keepCode()">Ver mi Código</button>
            </div>
        </div>

        <!-- Paso 2 de Premio: El usuario acepta el premio y SE MUESTRA el código -->
        <div class="result-box" *ngIf="showCode">
            <h2>Este es tu código:</h2>
            <div class="discount-code">{{ spinResult }}</div>
            <div class="decision-buttons">
                <button class="btn-pill" (click)="finishGame()">Aceptar y Salir</button>
            </div>
        </div>
        
        <div *ngIf="!canSpin && !spinResult && !showCode" style="margin-top: 20px;">
            <p>No tienes más tiradas.</p>
            <button class="btn-pill" (click)="finishGame()">Volver a Jugar</button>
        </div>
    </div>
    `,
    styleUrls: ['./game-ruleta.component.scss']
})
export class GameRuletaComponent implements OnInit, OnDestroy {
    public game = inject(GameService);
    private cdr = inject(ChangeDetectorRef);

    isSpinning = false;
    currentRotation = 0;

    // Cambiamos 'wonCode' por dos variables para manejar si conocemos el premio y si debemos mostrarlo
    spinResult: string | null = null;
    showCode = false;

    slices: RouletteSlice[] = [
        { label: '5%', weight: 40, bg: '#ff8a95', text: '#333', startAngle: 0, endAngle: 0 },
        { label: '10%', weight: 30, bg: '#ffb86c', text: '#333', startAngle: 0, endAngle: 0 },
        { label: '15%', weight: 25, bg: '#ffe066', text: '#333', startAngle: 0, endAngle: 0 },
        { label: '20%', weight: 3, bg: '#69e29a', text: '#333', startAngle: 0, endAngle: 0 },
        { label: '25%', weight: 2, bg: '#66b2ff', text: '#333', startAngle: 0, endAngle: 0 }
    ];

    wheelGradient = '';

    // For sounds
    private audioCtx: any = null;

    ngOnInit() {
        this.calculateSlices();
        try {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) { }
    }

    ngOnDestroy() {
        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close();
        }
    }

    get canSpin() {
        return this.game.extraSpins() > 0;
    }

    calculateSlices() {
        const totalWeight = this.slices.reduce((sum, s) => sum + s.weight, 0);
        let currentAngle = 0;
        let gradientParts: string[] = [];

        this.slices.forEach(s => {
            const anglePct = (s.weight / totalWeight) * 360;
            s.startAngle = currentAngle;
            currentAngle += anglePct;
            s.endAngle = currentAngle;

            gradientParts.push(`${s.bg} ${s.startAngle}deg ${s.endAngle}deg`);
        });

        this.wheelGradient = `conic-gradient(${gradientParts.join(', ')})`;
    }

    getLabelRotation(slice: RouletteSlice): number {
        return slice.startAngle + (slice.endAngle - slice.startAngle) / 2;
    }

    spin() {
        if (!this.canSpin || this.isSpinning) return;

        this.game.extraSpins.update(v => v - 1);
        this.isSpinning = true;
        this.playSound('spin');

        const totalWeight = this.slices.reduce((sum, s) => sum + s.weight, 0);
        let randomVal = Math.random() * totalWeight;
        let selectedSlice = this.slices[0];

        for (const s of this.slices) {
            randomVal -= s.weight;
            if (randomVal <= 0) {
                selectedSlice = s;
                break;
            }
        }

        const sliceCenterAngle = this.getLabelRotation(selectedSlice);

        // Para evitar problemas con la transición CSS, simplemente añadimos vueltas completas sobre 
        // la rotación actual en lugar de intentar resetear a 0, ya que CSS no anima bien "saltos".
        // Eliminamos el comportamiento anterior y forzamos siempre mínimo 5 vueltas extra + el ajuste exacto al nuevo slice.

        // Calculamos cuánto necesitamos girar adicionalmente para caer en el slice a partir de la nueva posición base.
        const currentMod = this.currentRotation % 360; // Dónde está apuntando ahora mismo en [0, 360)

        // Queremos que acabe en (360 - sliceCenterAngle).
        let adjustment = (360 - sliceCenterAngle) - currentMod;
        if (adjustment < 0) {
            adjustment += 360;
        }

        const extraSpinsRotation = 360 * 5; // 5 vueltas completas
        this.currentRotation += (extraSpinsRotation + adjustment);

        setTimeout(() => {
            this.isSpinning = false;
            let numeric = selectedSlice.label.replace('%', '');
            this.spinResult = `CHOLLO${numeric}`;

            // Forzar actualización de vista en caso de que ChangeDetection pierda el hilo en OnPush/Zoneless
            this.cdr.detectChanges();

            this.playSound('win');
        }, 3000); // matches CSS animation duration
    }

    keepCode() {
        // En lugar de salir directamente, mostramos el código oculto al usuario.
        this.showCode = true;
        this.cdr.detectChanges();
    }

    spinAgain() {
        // El usuario arriesga: perdemos el código de esta tirada y volvemos a mostrar la ruleta
        this.spinResult = null;
        this.showCode = false;
        this.cdr.detectChanges();
    }

    finishGame() {
        // Reiniciamos todo el juego ahora que el usuario vio y aceptó su código,
        // lo cual automáticamente cerrará esta vista y volverá a home.
        this.game.restart();
    }

    playSound(type: 'spin' | 'win') {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        if (type === 'spin') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(100, this.audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 3);
            gainNode.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 3);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            oscillator.start();
            oscillator.stop(this.audioCtx.currentTime + 3);
        } else if (type === 'win') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, this.audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + 1);
            gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            oscillator.start();
            oscillator.stop(this.audioCtx.currentTime + 1);
        }
    }
}
