import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class GameService {
    // L0 = Home
    // L1 = Atrapa Monedas
    // L2 = Memory
    // L3 = Match 3
    // L4 = Ruleta Final
    level = signal<number>(0);
    score = signal<number>(0);
    remainingTime = signal<number>(0);
    isFinished = signal<boolean>(false);
    extraSpins = signal<number>(0);

    private timerInterval: any;

    constructor() { }

    showHome() {
        this.level.set(0);
        this.score.set(0);
        this.isFinished.set(false);
        this.extraSpins.set(0);
        this.stopTimer();
    }

    startGame() {
        this.level.set(1);
        this.score.set(0);
        this.isFinished.set(false);
        this.extraSpins.set(0);
        this.startLevel1();
    }

    private startLevel1() {
        this.level.set(1);
        this.remainingTime.set(40); // 40 secs para nivel 1
        this.startTimer();
    }

    private startLevel2() {
        this.level.set(2);
        this.remainingTime.set(40); // 40 secs para nivel 2
        this.startTimer();
    }

    private startLevel3() {
        this.level.set(3);
        this.remainingTime.set(40); // 40 secs para nivel 3
        this.startTimer();
    }

    private showRuleta() {
        this.level.set(4);
        this.calculateExtraSpins();
    }

    private calculateExtraSpins() {
        const finalScore = this.score();
        let spins = 0;
        if (finalScore >= 180) spins = 3;
        else if (finalScore >= 120) spins = 2;
        else if (finalScore >= 60) spins = 1;
        this.extraSpins.set(spins);
    }

    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            if (this.remainingTime() > 0) {
                this.remainingTime.update(val => val - 1);
            } else {
                this.checkLevelProgression();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    addScore(points: number) {
        this.score.update(val => Math.max(0, val + points));
    }

    private checkLevelProgression() {
        this.stopTimer();
        const l = this.level();

        if (l === 1) {
            this.startLevel2();
        } else if (l === 2) {
            this.startLevel3();
        } else if (l === 3) {
            this.showRuleta(); // Nivel 3 termina, siempre va a ruleta
        }
    }

    private endGameFailed() {
        this.stopTimer();
        this.isFinished.set(true);
    }

    restart() {
        this.showHome();
    }
}
