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
        <img src="assets/chololo.png" class="main-mascot animate-pop" alt="Chololo">
        <h1 class="glass-title animate-pop">
          ¡Atrapa Tus<br>
          <span class="highlight">Chollones!</span>
        </h1>
      </div>

      <div class="card animate-pop">
        <div class="level-selector">
          <div class="level-indicator l1">Fácil</div>
          <div class="level-indicator l2">Medio</div>
          <div class="level-indicator l3">Difícil</div>
        </div>

        <ng-container *ngIf="canPlayToday(); else alreadyPlayed">
          <button class="btn-pill start-btn" (click)="start()">¡INICIAR JUEGO!</button>
        </ng-container>

        <ng-template #alreadyPlayed>
          <div class="code-recovery" style="margin-top: 25px;">
            <p style="font-weight: bold;">Ya has jugado hoy. Tu código de premio fue:</p>
            <div class="last-code" style="font-size: 1.5rem; font-family: 'Titan One', cursive; color: #ff4757; margin: 15px 0;">
              {{ game.lastCode() || '---' }}
            </div>
            <small style="opacity: 0.8;">Vuelve mañana para jugar de nuevo.</small>
          </div>
        </ng-template>
      </div>

      <div class="terms animate-pop">
        <small>Al jugar aceptas los <a href="#">Términos y Condiciones</a></small>
      </div>
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
