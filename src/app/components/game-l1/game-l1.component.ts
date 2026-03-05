import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';

interface BubbleType {
  label: string;
  weight: number;
  bg: string;
  text: string;
}

const BUBBLE_TYPES: BubbleType[] = [
  { label: '5%', weight: 40, bg: '#ffb3ba', text: '#333' }, // Pastel Pink - 40%
  { label: '10%', weight: 30, bg: '#ffdfba', text: '#333' }, // Pastel Orange - 30%
  { label: '15%', weight: 25, bg: '#ffffba', text: '#333' }, // Pastel Yellow - 25%
  { label: '20%', weight: 3, bg: '#baffc9', text: '#333' },  // Pastel Green - 3%
  { label: '25%', weight: 2, bg: '#bae1ff', text: '#333' }   // Pastel Blue - 2%
];

@Component({
  selector: 'app-game-l1',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div id="game-container">
      <div *ngFor="let target of targets" 
           class="logo-target" 
           [class.bomb-target]="target.isBomb"
           [style.left.px]="target.x" 
           [style.top.px]="target.y"
           [ngStyle]="getTargetStyle(target)"
           (mousedown)="onTargetClick(target.id, $event)"
           (touchstart)="onTargetClick(target.id, $event)">
      
          <ng-container *ngIf="!target.isBomb">
            {{ target.type.label }}
          </ng-container>
      </div>

      <div *ngFor="let p of particles" 
           class="pop-particle"
           [class.bad]="p.isBad" 
           [style.left.px]="p.x" 
           [style.top.px]="p.y"
           [style.color]="p.color">
        {{ p.text }}
      </div>
    </div>
  `,
  styleUrls: ['./game-l1.component.scss']
})
export class GameL1Component implements OnInit, OnDestroy {
  public game = inject(GameService);

  targets: any[] = [];
  particles: any[] = [];
  private spawnInterval: any;
  private targetIdCounter = 0;
  private particleIdCounter = 0;
  private audioCtx: any = null;

  ngOnInit() {
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) { }
    this.spawnInterval = setInterval(() => this.spawnTarget(), 450);
  }

  ngOnDestroy() {
    if (this.spawnInterval) clearInterval(this.spawnInterval);
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }

  getTargetStyle(target: any): any {
    if (target.isBomb) {
      return {
        backgroundImage: "url('assets/bomba.png')"
      };
    }
    return {
      backgroundColor: target.type.bg,
      color: target.type.text,
      background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), ${target.type.bg})`,
      boxShadow: `0 10px 20px rgba(0,0,0,0.2), inset 0 0 20px ${target.type.bg}`
    };
  }

  playSound(type: 'coin' | 'bomb') {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    if (type === 'coin') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1500, this.audioCtx.currentTime + 0.1);
    } else {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, this.audioCtx.currentTime);
      oscillator.frequency.linearRampToValueAtTime(50, this.audioCtx.currentTime + 0.3);
    }

    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + (type === 'coin' ? 0.1 : 0.3));

    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    oscillator.start();
    oscillator.stop(this.audioCtx.currentTime + (type === 'coin' ? 0.1 : 0.3));
  }

  spawnTarget() {
    const isBomb = Math.random() > 0.8;
    const safeW = window.innerWidth - 120;
    const safeH = window.innerHeight - 150 - 50;

    const x = Math.random() * safeW + 20;
    const y = Math.random() * safeH + 90;

    let type = BUBBLE_TYPES[0];
    if (!isBomb) {
      const totalWeight = BUBBLE_TYPES.reduce((sum, t) => sum + t.weight, 0);
      let rnd = Math.random() * totalWeight;
      for (const bt of BUBBLE_TYPES) {
        if (rnd < bt.weight) {
          type = bt;
          break;
        }
        rnd -= bt.weight;
      }
    }

    const t = { id: this.targetIdCounter++, x, y, isBomb, type };
    this.targets.push(t);

    setTimeout(() => {
      this.targets = this.targets.filter(item => item.id !== t.id);
    }, 1200);
  }

  onTargetClick(id: number, e: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const target = this.targets.find(t => t.id === id);
    if (!target) return;

    let px = 0, py = 0;
    if (e instanceof MouseEvent) {
      px = e.pageX; py = e.pageY;
    } else if (e instanceof TouchEvent) {
      px = e.touches[0].pageX; py = e.touches[0].pageY;
    }

    if (target.isBomb) {
      this.game.addScore(-5);
      this.playSound('bomb');
      this.createParticle(px, py, '-5', true, '#ff4757');
    } else {
      this.game.addScore(2);
      this.playSound('coin');
      this.createParticle(px, py, '+2', false, target.type.bg);
    }

    this.targets = this.targets.filter(t => t.id !== id);
  }

  createParticle(x: number, y: number, text: string, isBad: boolean, color: string) {
    const p = { id: this.particleIdCounter++, x: x - 20, y, text, isBad, color };
    this.particles.push(p);
    setTimeout(() => {
      this.particles = this.particles.filter(item => item.id !== p.id);
    }, 500);
  }
}
