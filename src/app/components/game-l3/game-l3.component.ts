import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';

interface Candy {
    id: number;
    type: string;
    bg: string;
    text: string;
    marked: boolean;
    row: number;
    col: number;
    isBomb: boolean;
    isDropping?: boolean;
}

const BUBBLE_TYPES = [
    { label: '5%', weight: 40, bg: '#ff8a95', text: '#333' },
    { label: '10%', weight: 30, bg: '#ffb86c', text: '#333' },
    { label: '15%', weight: 25, bg: '#ffe066', text: '#333' },
    { label: '20%', weight: 3, bg: '#69e29a', text: '#333' },
    { label: '25%', weight: 2, bg: '#66b2ff', text: '#333' }
];

@Component({
    selector: 'app-game-l3',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div id="game-container-l3">
        <div class="match-grid">
            <div *ngFor="let item of grid" 
                class="match-candy" 
                [class.marked]="item.marked"
                [class.dropping]="item.isDropping"
                [ngStyle]="getStyle(item)"
                (click)="clickCandy(item)">
                <ng-container *ngIf="!item.isBomb && item.type !== 'empty'">{{ item.type }}</ng-container>
            </div>
        </div>

        <div *ngFor="let p of particles" 
            class="pop-particle-l3" 
            [style.left.px]="p.left" 
            [style.top.px]="p.top"
            [style.color]="p.color">
            {{ p.text }}
        </div>
    </div>
  `,
    styleUrls: ['./game-l3.component.scss']
})
export class GameL3Component implements OnInit, OnDestroy {
    public game = inject(GameService);

    readonly ROWS = 7;
    readonly COLS = 7;

    grid: Candy[] = [];
    particles: any[] = [];
    private particleIdCounter = 0;
    private idCounter = 0;

    private selectedCandy: Candy | null = null;
    private isAnimating = false;

    private audioCtx: any = null;

    ngOnInit() {
        try {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) { }

        this.initGrid();
    }

    ngOnDestroy() {
        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close();
        }
    }

    getStyle(item: Candy): any {
        if (item.isBomb) {
            return {
                backgroundImage: "url('assets/bomba.png')",
                backgroundSize: "80%",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundColor: 'white',
                border: 'none',
                boxShadow: 'none'
            };
        }
        return {
            backgroundColor: item.bg,
            color: item.text
        };
    }

    playSound(type: 'select' | 'bomb' | 'pop') {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        if (type === 'select') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, this.audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
        } else if (type === 'pop') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(400, this.audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
        } else if (type === 'bomb') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, this.audioCtx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(50, this.audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
        }

        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + (type === 'bomb' ? 0.3 : 0.2));
    }

    initGrid() {
        this.grid = [];
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const newCandy = this.createRandomCandy(r, c);
                newCandy.isDropping = false; // no drop on init
                this.grid.push(newCandy);
            }
        }
    }

    createRandomCandy(r: number, c: number): Candy {
        const isBomb = Math.random() > 0.95;
        if (isBomb) {
            return { id: this.idCounter++, type: 'bomb', bg: 'white', text: '#fff', marked: false, row: r, col: c, isBomb: true, isDropping: true };
        }

        const type = BUBBLE_TYPES[Math.floor(Math.random() * BUBBLE_TYPES.length)];
        return {
            id: this.idCounter++,
            type: type.label,
            bg: type.bg,
            text: type.text,
            marked: false,
            row: r,
            col: c,
            isBomb: false,
            isDropping: true
        };
    }

    clickCandy(item: Candy) {
        if (this.isAnimating) return;
        if (item.isBomb) {
            this.triggerBomb(item);
            return;
        }

        if (!this.selectedCandy) {
            this.selectedCandy = item;
            item.marked = true;
            this.playSound('select');
        } else {
            const first = this.selectedCandy;
            first.marked = false;
            this.selectedCandy = null;

            if (first === item) return;

            const isAdjacent = (Math.abs(first.row - item.row) + Math.abs(first.col - item.col)) === 1;
            if (isAdjacent) {
                this.swap(first, item);
                this.isAnimating = true;
                setTimeout(() => {
                    const hasMatch = this.checkAndResolveMatches();
                    if (!hasMatch) {
                        this.swap(first, item);
                        this.isAnimating = false;
                    }
                }, 300);
            } else {
                this.selectedCandy = item;
                item.marked = true;
                this.playSound('select');
            }
        }
    }

    swap(c1: Candy, c2: Candy) {
        const idx1 = c1.row * this.COLS + c1.col;
        const idx2 = c2.row * this.COLS + c2.col;

        const tempRow = c1.row;
        const tempCol = c1.col;
        c1.row = c2.row;
        c1.col = c2.col;
        c2.row = tempRow;
        c2.col = tempCol;

        this.grid[idx1] = c2;
        this.grid[idx2] = c1;
    }

    getCandy(r: number, c: number): Candy | null {
        if (r < 0 || r >= this.ROWS || c < 0 || c >= this.COLS) return null;
        return this.grid[r * this.COLS + c];
    }

    checkAndResolveMatches(): boolean {
        let matchedSet = new Set<Candy>();

        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS - 2; c++) {
                let c1 = this.getCandy(r, c);
                let c2 = this.getCandy(r, c + 1);
                let c3 = this.getCandy(r, c + 2);
                if (c1 && c2 && c3 && !c1.isBomb && !c2.isBomb && !c3.isBomb && c1.type !== 'empty'
                    && c1.type === c2.type && c2.type === c3.type) {
                    matchedSet.add(c1); matchedSet.add(c2); matchedSet.add(c3);
                    let c4 = this.getCandy(r, c + 3);
                    if (c4 && !c4.isBomb && c1.type === c4.type) {
                        matchedSet.add(c4);
                        let c5 = this.getCandy(r, c + 4);
                        if (c5 && !c5.isBomb && c1.type === c5.type) matchedSet.add(c5);
                    }
                }
            }
        }

        for (let c = 0; c < this.COLS; c++) {
            for (let r = 0; r < this.ROWS - 2; r++) {
                let c1 = this.getCandy(r, c);
                let c2 = this.getCandy(r + 1, c);
                let c3 = this.getCandy(r + 2, c);
                if (c1 && c2 && c3 && !c1.isBomb && !c2.isBomb && !c3.isBomb && c1.type !== 'empty'
                    && c1.type === c2.type && c2.type === c3.type) {
                    matchedSet.add(c1); matchedSet.add(c2); matchedSet.add(c3);
                    let c4 = this.getCandy(r + 3, c);
                    if (c4 && !c4.isBomb && c1.type === c4.type) {
                        matchedSet.add(c4);
                        let c5 = this.getCandy(r + 4, c);
                        if (c5 && !c5.isBomb && c1.type === c5.type) matchedSet.add(c5);
                    }
                }
            }
        }

        if (matchedSet.size > 0) {
            this.playSound('pop');
            let pts = 5;
            if (matchedSet.size === 4) pts = 10;
            if (matchedSet.size >= 5) pts = 15;
            this.game.addScore(pts);

            let bombsToExplode = new Set<Candy>();
            matchedSet.forEach(c => {
                const neighbors = [
                    this.getCandy(c.row - 1, c.col),
                    this.getCandy(c.row + 1, c.col),
                    this.getCandy(c.row, c.col - 1),
                    this.getCandy(c.row, c.col + 1)
                ];
                neighbors.forEach(n => {
                    if (n && n.isBomb && !bombsToExplode.has(n)) {
                        bombsToExplode.add(n);
                    }
                });
            });

            bombsToExplode.forEach(b => {
                this.playSound('bomb');
                this.game.addScore(-20);
                this.showParticleAtCell(b, '-20', '#ff4757');
                b.type = 'empty';
                b.bg = 'transparent';
                b.text = 'transparent';
                b.isBomb = false;
            });

            matchedSet.forEach(c => {
                this.showParticleAtCell(c, '+', c.bg);
                c.type = 'empty';
                c.bg = 'transparent';
                c.text = 'transparent';
            });

            setTimeout(() => this.dropCandies(), 400);
            return true;
        }
        return false;
    }

    dropCandies() {
        for (let c = 0; c < this.COLS; c++) {
            for (let r = this.ROWS - 1; r >= 0; r--) {
                let candy = this.getCandy(r, c);
                if (candy && candy.type === 'empty') {
                    for (let above = r - 1; above >= 0; above--) {
                        let topCandy = this.getCandy(above, c);
                        if (topCandy && topCandy.type !== 'empty' && !topCandy.isBomb) {
                            topCandy.isDropping = true;
                            this.swap(candy, topCandy);
                            break;
                        }
                    }
                }
            }
            for (let r = this.ROWS - 1; r >= 0; r--) {
                let candy = this.getCandy(r, c);
                if (candy && candy.type === 'empty') {
                    let newC = this.createRandomCandy(r, c);
                    this.grid[r * this.COLS + c] = newC;
                }
            }
        }

        setTimeout(() => {
            this.grid.forEach(c => c.isDropping = false);
            if (!this.checkAndResolveMatches()) {
                this.isAnimating = false;
            }
        }, 400);
    }

    triggerBomb(bomb: Candy) {
        if (this.isAnimating) return;
        this.playSound('bomb');
        this.game.addScore(-20);
        this.showParticleAtCell(bomb, '-20', '#ff4757');
    }

    showParticleAtCell(item: Candy, text: string, color: string) {
        // rough approximation of screen pos
        const px = (item.col * 50) + (window.innerWidth / 2) - (this.COLS * 25);
        const py = (item.row * 50) + window.innerHeight / 3;

        const p = { id: this.particleIdCounter++, text, left: px, top: py, color };
        this.particles.push(p);
        setTimeout(() => {
            this.particles = this.particles.filter(x => x.id !== p.id);
        }, 500);
    }
}
