import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';

interface Card {
    id: number;
    type: string;
    color: string;
    text: string;
    isBomb: boolean;
    matched: boolean;
    flipped: boolean;
    shuffling: boolean;
}

const BUBBLE_TYPES = [
    { label: '5%', weight: 40, bg: '#ffb3ba', text: '#333' },
    { label: '10%', weight: 30, bg: '#ffdfba', text: '#333' },
    { label: '15%', weight: 25, bg: '#ffffba', text: '#333' },
    { label: '20%', weight: 3, bg: '#baffc9', text: '#333' },
    { label: '25%', weight: 2, bg: '#bae1ff', text: '#333' }
];

@Component({
    selector: 'app-game-l2',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div id="game-container-l2">
      <div class="memory-grid">
        <div *ngFor="let card of deck; let i = index" 
             class="memory-card" 
             [class.flipped]="card.flipped" 
             [class.matched]="card.matched"
             [class.shuffling]="card.shuffling"
             (click)="handleCardClick(i, $event)">
             
          <div class="memory-card-front"></div>
          
          <div class="memory-card-back" [ngStyle]="getCardStyle(card)">
            <ng-container *ngIf="!card.isBomb">{{ card.type }}</ng-container>
          </div>

        </div>
      </div>
      
      <div *ngFor="let p of particles" 
           class="pop-particle-l2" 
           [style.left.px]="p.left" 
           [style.top.px]="p.top"
           [style.color]="p.color">
        {{ p.text }}
      </div>
    </div>
  `,
    styleUrls: ['./game-l2.component.scss']
})
export class GameL2Component implements OnInit, OnDestroy {
    public game = inject(GameService);

    deck: Card[] = [];
    particles: any[] = [];
    private particleIdCounter = 0;

    private hasFlippedCard = false;
    private lockBoard = false;
    private firstCardIdx: number | null = null;
    private secondCardIdx: number | null = null;

    private audioCtx: any = null;

    ngOnInit() {
        try {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) { }
        this.initDeck();
    }

    ngOnDestroy() {
        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close();
        }
    }

    getCardStyle(card: Card): any {
        if (card.isBomb) {
            return {
                backgroundImage: "url('assets/bomba.png')",
                backgroundSize: "70%",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundColor: "transparent"
            };
        }
        return {
            backgroundColor: card.color,
            color: card.text,
            background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.6), ${card.color})`
        };
    }

    playSound(type: 'match' | 'bomb' | 'flip') {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        if (type === 'match') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, this.audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + 0.1);
        } else if (type === 'bomb') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, this.audioCtx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(50, this.audioCtx.currentTime + 0.3);
        } else {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(300, this.audioCtx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(200, this.audioCtx.currentTime + 0.05);
        }

        gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + (type === 'bomb' ? 0.3 : 0.1));

        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + (type === 'bomb' ? 0.3 : 0.1));
    }

    initDeck() {
        const config: any = {
            '5%': 4,
            '10%': 3,
            '15%': 2,
            '20%': 1,
            '25%': 1
        };

        let idCounter = 0;
        this.deck = [];

        for (const label in config) {
            const typeInfo = BUBBLE_TYPES.find(t => t.label === label) || { bg: '#ccc', text: '#333' };
            for (let i = 0; i < config[label] * 2; i++) {
                this.deck.push({
                    id: idCounter++, type: label, color: typeInfo.bg, text: typeInfo.text,
                    isBomb: false, matched: false, flipped: false, shuffling: false
                });
            }
        }

        for (let i = 0; i < 3; i++) {
            this.deck.push({
                id: idCounter++, type: 'bomb', color: '#ff4757', text: '#fff',
                isBomb: true, matched: false, flipped: false, shuffling: false
            });
        }

        this.shuffleArray(this.deck);
    }

    shuffleArray(array: any[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    handleCardClick(index: number, e: MouseEvent) {
        if (this.lockBoard) return;
        const card = this.deck[index];
        if (card.flipped || card.matched) return;

        this.playSound('flip');
        card.flipped = true;

        let px = e.pageX;
        let py = e.pageY;
        if (e.target instanceof Element) {
            const rect = e.target.getBoundingClientRect();
            px = rect.left + rect.width / 2;
            py = rect.top + rect.height / 2;
        }

        if (card.isBomb) {
            this.handleBomb(px, py, card);
            return;
        }

        if (!this.hasFlippedCard) {
            this.hasFlippedCard = true;
            this.firstCardIdx = index;
            return;
        }

        this.secondCardIdx = index;
        this.checkForMatch(px, py);
    }

    handleBomb(px: number, py: number, card: Card) {
        this.lockBoard = true;
        this.playSound('bomb');
        this.createParticle(px, py, '-20', '#ff4757');

        this.game.addScore(-20);
        card.matched = true; // Mark as matched so it stays face up and doesn't get shuffled

        setTimeout(() => {
            if (this.firstCardIdx !== null) this.deck[this.firstCardIdx].flipped = false;

            // Note: Bombs that are matched stay flipped naturally due to CSS or just not being reset here.

            this.shuffleUnmatchedCards();
            this.resetBoardState();
        }, 1500);
    }

    checkForMatch(px: number, py: number) {
        if (this.firstCardIdx === null || this.secondCardIdx === null) return;

        let card1 = this.deck[this.firstCardIdx];
        let card2 = this.deck[this.secondCardIdx];

        if (card1.type === card2.type) {
            card1.matched = true;
            card2.matched = true;
            this.playSound('match');
            this.createParticle(px, py, '+10', card1.color);
            this.game.addScore(10);
            this.resetBoardState();
        } else {
            this.lockBoard = true;
            setTimeout(() => {
                card1.flipped = false;
                card2.flipped = false;
                this.resetBoardState();
            }, 1000);
        }
    }

    resetBoardState() {
        this.hasFlippedCard = false;
        this.lockBoard = false;
        this.firstCardIdx = null;
        this.secondCardIdx = null;
    }

    shuffleUnmatchedCards() {
        let unmatchedCards = this.deck.filter(c => !c.matched);
        let unmatchedIndices = this.deck.map((c, i) => !c.matched ? i : -1).filter(i => i !== -1);

        this.shuffleArray(unmatchedCards);

        unmatchedIndices.forEach((origIdx, i) => {
            const card = unmatchedCards[i];
            card.shuffling = true;
            this.deck[origIdx] = card;
            setTimeout(() => { card.shuffling = false; }, 500);
        });
    }

    createParticle(x: number, y: number, text: string, color: string) {
        const p = {
            id: this.particleIdCounter++,
            text, left: x - 20, top: y, color
        };
        this.particles.push(p);
        setTimeout(() => {
            this.particles = this.particles.filter(x => x.id !== p.id);
        }, 800);
    }
}
