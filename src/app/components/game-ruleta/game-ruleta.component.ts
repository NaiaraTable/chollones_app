import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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
        <p class="ruleta-spins" *ngIf="!wonCode">Tiradas extra disponibles: {{ game.extraSpins() }}</p>

        <div class="ruleta-wrapper" *ngIf="!wonCode">
            <div class="ruleta-wheel" [style.transform]="'rotate(' + currentRotation + 'deg)'">
                <div class="slice-label" *ngFor="let s of slices" 
                     [style.transform]="'rotate(' + getLabelRotation(s) + 'deg) translate(0, -90px)'">
                    {{ s.label }}
                </div>
                <!-- Drawing slices with conic-gradient via TS style injection -->
                <div class="wheel-bg" [style.background]="wheelGradient"></div>
            </div>
            <div class="ruleta-pointer"></div>
        </div>

        <button class="btn-pill spin-btn" *ngIf="!isSpinning && !wonCode && canSpin" (click)="spin()">
            Girar Ruleta
        </button>

        <div class="result-box" *ngIf="wonCode">
            <h2>¡Enhorabuena!</h2>
            <p>Has ganado el código:</p>
            <div class="discount-code">{{ wonCode }}</div>
            
            <div class="decision-buttons" *ngIf="game.extraSpins() > 0">
                <p>Aún tienes {{ game.extraSpins() }} tiradas más.</p>
                <button class="btn-pill" (click)="keepCode()">Me quedo este código</button>
                <button class="btn-pill btn-danger" (click)="spinAgain()">Arriesgar y tirar de nuevo</button>
            </div>
            <div class="decision-buttons" *ngIf="game.extraSpins() === 0">
                <button class="btn-pill" (click)="keepCode()">Volver a Jugar</button>
            </div>
        </div>
        
        <div *ngIf="!canSpin && !wonCode" style="margin-top: 20px;">
            <p>No tienes más tiradas.</p>
            <button class="btn-pill" (click)="finishGame()">Volver a Jugar</button>
        </div>
    </div>
    `,
    styleUrls: ['./game-ruleta.component.scss']
})
export class GameRuletaComponent implements OnInit, OnDestroy {
    public game = inject(GameService);

    isSpinning = false;
    currentRotation = 0;
    wonCode: string | null = null;

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

        // El puntero está arriba (0 deg). Para que el sector caiga sobre el puntero,
        // necesitamos rotar la rueda de manera que el slice center llegue a 360 - 0.
        // Haremos 5 vueltas completas (1800 deg) + la rotación necesaria.

        const extraSpinsRotation = 360 * 5;
        const targetRotation = extraSpinsRotation + (360 - sliceCenterAngle);

        this.currentRotation += targetRotation;

        setTimeout(() => {
            this.isSpinning = false;
            let numeric = selectedSlice.label.replace('%', '');
            this.wonCode = `CHOLLO${numeric}`;
            this.playSound('win');
        }, 3000); // matches CSS animation duration
    }

    keepCode() {
        // En una app real, guardaríamos el código en base de datos aquí.
        // Para este prototipo, volvemos a empezar.
        this.finishGame();
    }

    spinAgain() {
        this.wonCode = null; // Reiniciamos el premio y mostramos ruleta de nuevo
    }

    finishGame() {
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
