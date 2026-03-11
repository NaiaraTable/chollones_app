import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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
    <div class="game-wrapper level-bg">
      <div class="hud-panel" *ngIf="game.level() >= 1 && game.level() <= 3 && !game.isFinished()">
        <div class="hud-item">
            <span class="hud-label">Nivel</span>
            <span class="hud-value">{{ game.level() }}</span>
        </div>
        <div class="hud-item">
            <span class="hud-label">Tiempo</span>
            <span class="hud-value">{{ game.remainingTime() }}</span>
        </div>
        <div class="hud-item">
            <span class="hud-label">Puntos</span>
            <span class="hud-value" [class.bounce]="game.score()">{{ game.score() }}</span>
        </div>
      </div>
      
      <div class="game-area">
        <ng-container [ngSwitch]="game.level()">
          <app-game-home *ngSwitchCase="0"></app-game-home>
          <app-game-l1 *ngSwitchCase="1"></app-game-l1>
          <app-game-l2 *ngSwitchCase="2"></app-game-l2>
          <app-game-l3 *ngSwitchCase="3"></app-game-l3>
          <app-game-ruleta *ngSwitchCase="4"></app-game-ruleta>
          <div *ngSwitchDefault>Cargando...</div>
        </ng-container>
      </div>

      <div class="finish-screen" *ngIf="game.isFinished() && game.level() < 4">
        <h1 class="glass-title" style="color: white; font-size: 2rem;">¡Oops!</h1>
        <h2 style="font-family: 'Titan One', cursive;">Puntuación Insuficiente</h2>
        <button class="btn-pill" style="margin-top: 30px" (click)="restart()">Volver a Jugar</button>
      </div>
    </div>
  `,
  styleUrls: ['./game-base.component.scss']
})
export class GameBaseComponent implements OnInit, OnDestroy {
  public game = inject(GameService);

  ngOnInit() {
    this.game.showHome();
  }

  ngOnDestroy() {
    this.game.stopTimer();
  }

  restart() {
    this.game.showHome();
  }
}
