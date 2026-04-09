import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  // L0 = Home | L1 = Fácil | L2 = Medio | L3 = Difícil | L4 = Ruleta
  level = signal<number>(0);
  score = signal<number>(0);

  // Cambiado de remainingTime a timeLeft para solucionar el error TS2339 en game-base
  timeLeft = signal<number>(0);

  lastCode = signal<string | null>(localStorage.getItem('ultimo_codigo'));

  private timerInterval: any;
  private supabase = inject(SupabaseService);

  constructor() { }

  showHome() {
    this.level.set(0);
    this.stopTimer();
  }

  // Inicia todo el flujo automático
  async startFullGame() {
    this.score.set(0);
    this.level.set(1);
    this.runLevel(20); // Nivel 1: Fácil (20s)
  }

  private runLevel(seconds: number) {
    this.timeLeft.set(seconds);
    this.startTimer();
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update(val => val - 1);
      } else {
        // Cuando el tiempo llega a 0, salta solo al siguiente nivel
        this.autoNextLevel();
      }
    }, 1000);
  }

  private autoNextLevel() {
    this.stopTimer();
    const current = this.level();

    if (current === 1) {
      this.level.set(2);
      this.runLevel(20);
    } else if (current === 2) {
      this.level.set(3);
      this.runLevel(20);
    } else if (current === 3) {
      this.level.set(4);
    }
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // Los puntos se suman sin que el usuario lo vea en pantalla
  addScore(points: number) {
    this.score.update(val => Math.max(0, val + points));
  }

  saveFinalCode(code: string) {
    this.lastCode.set(code);
    localStorage.setItem('ultimo_codigo', code);
  }

  /**
   * NUEVO MÉTODO: resetGame
   * Soluciona el error en game-ruleta.component.ts
   */
  resetGame(code?: string) {
    if (code) {
      this.saveFinalCode(code);
    }
    this.showHome();
  }

  async canPlayToday(): Promise<boolean> {
    const user = this.supabase.userValue;
    const today = new Date().toDateString();

    // Comprobación rápida local
    const localKey = 'ultima_partida_' + (user ? user.id : 'anon');
    if (localStorage.getItem(localKey) === today) {
      return false;
    }

    if (!user) return true;

    // Comprobación en Supabase por si jugó en otro móvil
    const lastPlayed = user.user_metadata?.['ultima_partida'];
    return lastPlayed !== today;
  }

  async registerPlay(): Promise<void> {
    const today = new Date().toDateString();
    const user = this.supabase.userValue;

    const localKey = 'ultima_partida_' + (user ? user.id : 'anon');
    localStorage.setItem(localKey, today);

    if (user) {
      try {
        await this.supabase.updateProfile({ ultima_partida: today });
      } catch (error) {
        console.error('Error registrando la partida:', error);
      }
    }
  }
}
