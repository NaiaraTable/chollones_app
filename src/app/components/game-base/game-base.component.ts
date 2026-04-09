import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';
import { GameHomeComponent } from '../game-home/game-home.component';
import { GameL1Component } from '../game-l1/game-l1.component';
import { GameL2Component } from '../game-l2/game-l2.component';
import { GameL3Component } from '../game-l3/game-l3.component';
import { GameRuletaComponent } from '../game-ruleta/game-ruleta.component';

@Component({
  selector: 'app-game-base',
  standalone: true,
  imports: [CommonModule, GameHomeComponent, GameL1Component, GameL2Component, GameL3Component, GameRuletaComponent],
  template: `
    <div class="game-wrapper">
      <div class="game-area">

        <div class="hud-container" *ngIf="game.level() >= 1 && game.level() <= 3">
          <div class="hud-glass">
            <div class="hud-section">
              <span class="hud-label">PUNTOS</span>
              <span class="hud-value">{{ game.score() }}</span>
            </div>
            <div class="hud-divider"></div>
            <div class="hud-section">
              <span class="hud-label">TIEMPO</span>
              <span class="hud-value" [class.low-time]="game.timeLeft() <= 5">
                {{ game.timeLeft() }}s
              </span>
            </div>
          </div>
        </div>

        <ng-container [ngSwitch]="game.level()">
          <app-game-home *ngSwitchCase="0"></app-game-home>
          <app-game-l1 *ngSwitchCase="1"></app-game-l1>
          <app-game-l2 *ngSwitchCase="2"></app-game-l2>
          <app-game-l3 *ngSwitchCase="3"></app-game-l3>
          <app-game-ruleta *ngSwitchCase="4"></app-game-ruleta>
        </ng-container>
      </div>
    </div>
  `,
  styleUrls: ['./game-base.component.scss']
})
export class GameBaseComponent {
  public game = inject(GameService);
}
