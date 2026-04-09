import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';

interface RouletteSlice {
  label: string;
  probWeight: number;
  bg: string;
  startAngle: number;
  endAngle: number;
  fontSize?: string;
}

@Component({
  selector: 'app-game-ruleta',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ruleta-container">
      <h1 class="ruleta-title" *ngIf="!showCode">¡Tu Premio!</h1>
      <p class="ruleta-info" *ngIf="!showCode">Puntos Acumulados: {{ finalScore }}</p>

      <div class="ruleta-wrapper" *ngIf="!showCode">
        <div class="ruleta-wheel" [style.transform]="'rotate(' + currentRotation + 'deg)'">
          <div class="slice-label" *ngFor="let s of slices"
               [style.transform]="'rotate(' + getLabelRotation(s) + 'deg) translate(0, -115px)'"
               [style.fontSize]="s.fontSize">
            {{s.label}}
          </div>
          <div class="wheel-bg" [style.background]="wheelGradient"></div>
        </div>
        <div class="ruleta-pointer"></div>
      </div>

      <button class="btn-pill spin-btn" *ngIf="!isSpinning && !spinResult && !showCode" (click)="spin()">
        GIRAR RULETA
      </button>

      <div class="result-card animate-pop" *ngIf="showCode">
        <div class="prize-header">
          <div class="confetti-icon">🎉</div>
          <h2>¡ENHORABUENA!</h2>
          <p class="prize-description">Has conseguido un descuento de:</p>
        </div>

        <div class="prize-badge">
          {{ wonPercent }}
        </div>

        <div class="coupon-box">
          <p>Copia tu código y canjéalo:</p>
          <div class="final-code">{{ finalCode }}</div>
        </div>

        <button class="btn-pill finish-btn" (click)="game.resetGame(finalCode)">
          VOLVER AL INICIO
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./game-ruleta.component.scss']
})
export class GameRuletaComponent implements OnInit {
  public game = inject(GameService);
  private cdr = inject(ChangeDetectorRef);

  finalScore = 0;
  isSpinning = false;
  spinResult: string | null = null;
  wonPercent = '';
  finalCode = '';
  showCode = false;

  currentRotation = 0;
  wheelGradient = '';

  slices: RouletteSlice[] = [];

  ngOnInit() {
    this.finalScore = this.game.score();
    this.calculateWheel();
  }

  calculateWheel() {

    let w5  = 70; // 70%
    let w10 = 18; // 18%
    let w15 = 7;  // 7%
    let w20 = 3;  // 3%
    let w25 = 2;  // 2%


    if (this.finalScore > 60) {
      w5  -= 10; // Baja a 60%
      w10 += 6;  // Sube a 24%
      w15 += 2;  // Sube a 9%
      w20 += 1;  // Sube a 4%
      w25 += 1;  // Sube a 3%
    }

    if (this.finalScore > 120) {
      w5  -= 10; // Baja a 50%
      w10 += 6;  // Sube a 30% 
      w15 += 2;  // Sube a 11%
      w20 += 1;  // Sube a 5%
      w25 += 1;  // Sube a 4%
    }

    this.slices = [
      { label: '5%', probWeight: w5, bg: '#ff8a95', startAngle: 0, endAngle: 0 },
      { label: '10%', probWeight: w10, bg: '#ffb86c', startAngle: 0, endAngle: 0 },
      { label: '15%', probWeight: w15, bg: '#ffe066', startAngle: 0, endAngle: 0 },
      { label: '20%', probWeight: w20, bg: '#69e29a', startAngle: 0, endAngle: 0 },
      { label: '25%', probWeight: w25, bg: '#66b2ff', startAngle: 0, endAngle: 0 }
    ];


    let currentAngle = 0;
    const totalProb = this.slices.reduce((sum, s) => sum + s.probWeight, 0);
    const parts: string[] = [];

    this.slices.forEach(s => {
      s.startAngle = currentAngle;
      const sliceDeg = (s.probWeight / totalProb) * 360;
      s.endAngle = currentAngle + sliceDeg;
      currentAngle = s.endAngle;

      // Control para que el texto no se monte si el trozo es muy estrecho
      s.fontSize = sliceDeg < 18 ? '14px' : '22px';

      parts.push(`${s.bg} ${s.startAngle}deg ${s.endAngle}deg`);
    });

    this.wheelGradient = `conic-gradient(${parts.join(', ')})`;
  }

  getLabelRotation(s: RouletteSlice) {
    return s.startAngle + (s.endAngle - s.startAngle) / 2;
  }

  spin() {
    if (this.isSpinning) return;
    this.isSpinning = true;

    const totalProb = this.slices.reduce((sum, s) => sum + s.probWeight, 0);
    let rand = Math.random() * totalProb;
    let selected = this.slices[0];

    for (const s of this.slices) {
      rand -= s.probWeight;
      if (rand <= 0) {
        selected = s;
        break;
      }
    }

    const targetAngle = this.getLabelRotation(selected);
    const extraSpins = 360 * 5;
    this.currentRotation += extraSpins + (360 - (this.currentRotation % 360)) - targetAngle;

    setTimeout(() => {
      this.isSpinning = false;
      this.wonPercent = selected.label;
      this.spinResult = selected.label;
      this.finalCode = 'CHOLLO-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      this.cdr.detectChanges();

      setTimeout(() => {
        this.showCode = true;
        this.cdr.detectChanges();
      }, 1000);
    }, 4000);
  }
}
