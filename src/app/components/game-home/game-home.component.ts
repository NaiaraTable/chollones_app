import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-game-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <div class="logo-area">
        <h1 class="glass-title animate-pop">
          Juega<br>
          <span class="highlight">y gana</span>
        </h1>
      </div>

        <ng-container *ngIf="canPlayToday(); else alreadyPlayed">
          <button class="btn-pill start-btn" (click)="start()">INICIAR JUEGO</button>
        </ng-container>

        <ng-template #alreadyPlayed>
          <div class="code-recovery" style="text-align: center;">
            <p>JUEGO TERMINADO</p>
            <div class="last-code">{{ game.lastCode() }}</div>
            <small style="color: var(--text-muted); opacity: 0.6;">
              Protocolo disponible en 24h
            </small>
          </div>
        </ng-template>

        <div *ngIf="canPlayToday() && game.lastCode()"
             class="code-recovery"
             style="margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border-color); text-align: center;">
          <p style="font-size: 0.7rem; letter-spacing: 1px;">ÚLTIMO CÓDIGO:</p>
          <div class="last-code" style="font-size: 1.2rem; margin: 10px 0;">
            {{ game.lastCode() }}
          </div>
        </div>
      </div>

      <div class="terms animate-pop" style="animation-delay: 0.4s">
        <small>Al acceder, usted ratifica los <a href="#">Términos de Servicio</a></small>
      </div>
  `,
  styleUrls: ['./game-home.component.scss']
})
export class GameHomeComponent implements OnInit {
  public game = inject(GameService);
  canPlayToday = signal<boolean>(false);

  async ngOnInit() {
    this.canPlayToday.set(await this.game.canPlayToday());
    this.canPlayToday.set(true);
  }

  async start() {
    if (this.canPlayToday()) {
      await this.game.registerPlay();
      this.game.startFullGame();
    }
  }
}
