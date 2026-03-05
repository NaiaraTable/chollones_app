import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';

@Component({
    selector: 'app-game-home',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="home-container">
      <div class="logo-area">
          <img src="assets/chololo.png" class="main-mascot animate-pop" alt="Chololo" style="width: 150px; margin-bottom: 20px;">
          <h1 class="glass-title animate-pop" style="animation-delay: 0.1s; margin-bottom: 30px; line-height: 1.2;">
              ¡Atrapa Tus<br>
              <span style="color: #2c3e50;">Chollones!</span>
          </h1>
      </div>

      <div class="card animate-pop" style="animation-delay: 0.2s; margin-bottom: 30px; max-width: 400px; width: 90%;">
          <ul style="text-align: left; list-style: none; padding: 0; font-size: 1.1rem; line-height: 1.8;">
              <li>🐒 Ayuda a Chololo</li>
              <li>⚡ 3 Niveles de dificultad</li>
              <li>🎁 Gana cupones </li>
              <li>❌ Ojo con las bombas</li>
          </ul>
      </div>

      <button class="btn-pill animate-pop" style="animation-delay: 0.3s;" (click)="play()">🎮 Jugar Ahora</button>

      <div class="terms animate-pop" style="animation-delay: 0.4s;">
          <small>Al jugar aceptas los <a href="#" style="color: var(--primary);">Términos y Condiciones</a></small>
      </div>
    </div>
  `,
    styleUrls: ['./game-home.component.scss']
})
export class GameHomeComponent {
    public game = inject(GameService);

    play() {
        this.game.startGame();
    }
}
