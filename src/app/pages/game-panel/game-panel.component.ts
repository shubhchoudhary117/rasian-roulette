import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChildren, ElementRef, QueryList, NgZone, HostListener
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { HeaderComponent } from '../../shared/layouts/header/header.component';
import { AudioService } from '../../services/audio.service';
import { GameInfoModalComponent } from "../../shared/components/game-info-modal/game-info-modal.component";
import { GameMenuService } from '../../services/game-menu.service';

interface SlotConfig {
  x: number;
  y: number;
  isBullet: boolean;
  isHit: boolean;
  isBoom: boolean;   // ← naya: bomb animation
}

interface DrumState {
  slots: SlotConfig[];
  bulletSet: Set<number>;
  rotation: number;
  triggerTop: string;
  winGlow: boolean;
  loseGlow: boolean;
}

@Component({
  selector: 'app-game-panel',
  standalone: true,
  imports: [CommonModule, HeaderComponent, GameInfoModalComponent,NgIf],
  templateUrl: './game-panel.component.html',
  styleUrl: './game-panel.component.scss'
})
export class GamePanelComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChildren('drumRings') drumRingRefs!: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChildren('triggerEls') triggerRefs!: QueryList<ElementRef<HTMLDivElement>>;

  readonly TOTAL_SLOTS = 6;
  readonly BET_STEPS = [0.10, 0.25, 0.50, 1, 2, 5, 10, 25, 50, 100];
  // Slot-0 top pe (12 o'clock), baaki clockwise
  // Angle formula: slot i → (i * 60 - 90) degrees
  readonly SLOT_ANGLES = [0, 60, 120, 180, 240, 300];
  stakes: any = [0.10,
    0.40, 0.80, 1.40, 1.80, 3.00, 5.00, 8.00, 10.00, 14.00, 18.00, 40.00, 75.00, 150.00, 250.00,
    400.00, 500.00, 1000]
  autoBetsRoundsNumbers: number[] = [10, 25, 50, 75, 100, 200, 250, 500, 1000]
  bullets = 3;
  numDrums = 1;
  betIndex = 3;
  balance = 1000.00;
  spinning = false;
  drumStates: DrumState[] = [];

  drumSize = 200;
  triggerSize = 60;
  slotSize = 36;
  centerSize = 44;
  slotRadius = 65;

  winPopupVisible = false;
  losePopupVisible = false;
  winAmount = 0;
  showStakesModal: boolean = false;
  showAutoBetModal: boolean = false;
  currentBet = 1;

  selectedAutoRounds = 10;
  isAutoPlaying = false;
  autoPlayTimer: any = null;
  remainingRounds = 0;
  showGameInfo: boolean = false;

  private winPopupTimer: any;
  private losePopupTimer: any;
  private resizeObserver?: ResizeObserver;
  gameIsLoading = true;

  constructor(private ngZone: NgZone, private audio: AudioService, public gameMenuService: GameMenuService) { }

  ngOnInit(): void {
    this.rebuildAllDrums();
    this.currentBet = this.stakes[0];
    this.preloadAssets(); 
  }

  ngAfterViewInit(): void {
    const box = document.querySelector('.gp__game-box') as HTMLElement;
    if (box && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => this.recalcSizes(box));
      });
      this.resizeObserver.observe(box);
      this.recalcSizes(box);
    }
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    clearTimeout(this.winPopupTimer);
    clearTimeout(this.losePopupTimer);
  }

  @HostListener('window:resize')
  onResize(): void {
    const box = document.querySelector('.gp__game-box') as HTMLElement;
    if (box) this.recalcSizes(box);
  }


  private setupResizeObserver(): void {
    const trySetup = () => {
      const box = document.querySelector('.gp__game-box') as HTMLElement;
      if (box) {
        if (typeof ResizeObserver !== 'undefined') {
          this.resizeObserver = new ResizeObserver(() => {
            this.ngZone.run(() => this.recalcSizes(box));
          });
          this.resizeObserver.observe(box);
        }
        this.recalcSizes(box);
      } else {
        setTimeout(trySetup, 100);
      }
    };
    trySetup();
  }

  private preloadAssets(): void {
    const images = [
      'assets/images/wow.png',
      'assets/images/boom.png',
      'assets/images/pointer.png',
      'assets/images/drum-center-icon.png',
      'assets/images/drum.png',
      'assets/images/bullet.png',
      'assets/images/blast-bullet.png',
    ];

    const audios = [
      'assets/audios/trigger-sound.mp3',
      'assets/audios/spin-sound.mp3',
      'assets/audios/boom-sound.mp3',
      'assets/audios/bg-sound.mp3',
    ];

    const imagePromises = images.map(src =>
      new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      })
    );

    // Mobile pe canplaythrough reliable nahi — readyState check better hai
    const audioPromises = audios.map(src =>
      new Promise<void>(resolve => {
        const audio = new Audio();

        // Already enough data hai to play
        const check = () => {
          if (audio.readyState >= 3) { // HAVE_FUTURE_DATA
            resolve();
            return;
          }
        };

        audio.oncanplaythrough = () => resolve();
        audio.onprogress = check;
        audio.onstalled = () => resolve();  // Network slow — aage badho
        audio.onerror = () => resolve();

        // 5 sec max wait — mobile pe kabhi kabhi audio block hoti
        const timeout = setTimeout(() => resolve(), 5000);

        audio.addEventListener('canplaythrough', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });

        audio.preload = 'auto';
        audio.src = src;
        audio.load();
      })
    );

    Promise.all([...imagePromises, ...audioPromises]).then(() => {
      this.ngZone.run(() => {
        this.gameIsLoading = false;
        this.audio.tryStartBg(); 
        setTimeout(() => this.setupResizeObserver(), 50);
      });
    });
  }


  // ── Size calculation ──────────────────────────────────────
  private recalcSizes(box: HTMLElement): void {
    const padding = 32;
    const gap = 16;
    const boxW = box.clientWidth - padding;
    const boxH = box.clientHeight - padding;

    const cols = this.numDrums <= 3 ? this.numDrums : 3;
    const rows = this.numDrums <= 3 ? 1 : 2;

    const availW = (boxW - gap * (cols - 1)) / cols;
    const availH = (boxH - gap * (rows - 1)) / rows;

    const size = Math.floor(Math.min(availW, availH));
    this.drumSize = Math.max(size, 60);
    this.triggerSize = Math.round(this.drumSize * 0.29);
    this.slotRadius = Math.round(this.drumSize * 0.335);
    this.slotSize = Math.round(this.drumSize * 0.185);
    this.centerSize = Math.round(this.drumSize * 0.22);
    this.rebuildSlotPositions();
  }

  // ── Helpers ───────────────────────────────────────────────
  private getSlotPos(angleIndex: number): { x: number; y: number } {
    // slot-0 → -90deg (top), slot-1 → -30deg, slot-2 → 30deg ...
    this.slotRadius = Math.round(this.drumSize * 0.28);
    const angle = (angleIndex * 60 - 90) * Math.PI / 180;
    const cx = this.drumSize / 2;
    const cy = this.drumSize / 2;
    return {
      x: cx + Math.cos(angle) * this.slotRadius - this.slotSize / 2,
      y: cy + Math.sin(angle) * this.slotRadius - this.slotSize / 2,
    };
  }

  private triggerBaseTop(): string {
    return `-${Math.round(this.triggerSize * 0.22)}px`;
  }

  // ── Drum building ─────────────────────────────────────────
  private randomBulletSet(): Set<number> {
    const idx = Array.from({ length: this.TOTAL_SLOTS }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return new Set(idx.slice(0, this.bullets));
  }

  private buildSlots(bulletSet: Set<number>): SlotConfig[] {
    return this.SLOT_ANGLES.map((_, i) => {
      const pos = this.getSlotPos(i);
      return { x: pos.x, y: pos.y, isBullet: bulletSet.has(i), isHit: false, isBoom: false };
    });
  }

  private rebuildAllDrums(): void {
    this.drumStates = Array.from({ length: this.numDrums }, () => {
      const bulletSet = this.randomBulletSet();
      return {
        slots: this.buildSlots(bulletSet),
        bulletSet,
        rotation: 0,
        triggerTop: this.triggerBaseTop(),
        winGlow: false,
        loseGlow: false,
      };
    });
  }

  private rebuildSlotPositions(): void {
    this.drumStates.forEach(ds => {
      ds.slots = ds.slots.map((slot, i) => {
        const pos = this.getSlotPos(i);
        return { ...slot, x: pos.x, y: pos.y };
      });
      ds.triggerTop = this.triggerBaseTop();
    });
  }

  // ── Getters ──────────────────────────────────────────────
  get bet(): number {
    return this.currentBet;
  }

  get betDisplay(): string {
    return this.currentBet.toFixed(2);
  }
  get balanceDisplay(): string {
    return this.balance.toLocaleString('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }) + ' $';
  }
  get multiplier(): number {
    const safe = this.TOTAL_SLOTS - this.bullets;
    if (safe <= 0) return 1;
    return parseFloat(((this.TOTAL_SLOTS / safe) * (1 + (this.numDrums - 1) * 0.12)).toFixed(2));
  }

  // ── Settings ──────────────────────────────────────────────
  setBullets(n: number): void {
    if (this.spinning) return;
    this.bullets = n;
    this.rebuildAllDrums();
  }

  setDrums(n: number): void {
    if (this.spinning) return;
    this.numDrums = n;
    this.rebuildAllDrums();
    setTimeout(() => {
      const box = document.querySelector('.gp__game-box') as HTMLElement;
      if (box) this.recalcSizes(box);
    }, 0);
  }



  resetBalance(): void {
    if (this.spinning) return;
    this.balance = 1000;
    this.winPopupVisible = false;
    this.losePopupVisible = false;
    clearTimeout(this.winPopupTimer);
    clearTimeout(this.losePopupTimer);
    this.drumStates.forEach(ds => { ds.rotation = 0; });
    this.drumRingRefs?.forEach(ref => { ref.nativeElement.style.transform = ''; });
    this.rebuildAllDrums();
  }


  selectStake(amount: number): void {
    if (this.spinning) return;

    this.currentBet = amount;
  }

  increaseBet(): void {
    const currentIndex = this.stakes.findIndex(
      (stake: any) => Number(stake) === Number(this.currentBet)
    );
    if (currentIndex < this.stakes.length - 1) {
      this.currentBet = this.stakes[currentIndex + 1];
    }
  }

  decreaseBet(): void {
    const currentIndex = this.stakes.findIndex(
      (stake: any) => Number(stake) === Number(this.currentBet)
    );
    if (currentIndex > 0) {
      this.currentBet = this.stakes[currentIndex - 1];
    }
  }


  // ── SPIN ──────────────────────────────────────────────────
  async spin(): Promise<void> {
    if (this.spinning) return;

    this.audio.playSpin();

    if (this.balance < this.bet) {
      this.stopAutoPlay();
      this.showLosePopup();
      return;
    }

    this.spinning = true;
    this.winPopupVisible = false;
    this.losePopupVisible = false;
    clearTimeout(this.winPopupTimer);
    clearTimeout(this.losePopupTimer);

    this.balance -= this.bet;

    const rings = this.drumRingRefs.toArray();
    const triggers = this.triggerRefs.toArray();
    const duration = 2600 + Math.random() * 800;
    const extraSpins = (4 + Math.floor(Math.random() * 4)) * 360;

    // ── Per-drum result prepare ──────────────────────────────
    const results: { targetSlot: number; isWin: boolean; drumIndex: number }[] = [];

    this.drumStates.forEach((ds, d) => {
      const bulletSet = this.randomBulletSet();
      ds.bulletSet = bulletSet;
      ds.slots = this.buildSlots(bulletSet);

      // Win probability = empty slots / total
      const emptySlots = Array.from({ length: this.TOTAL_SLOTS }, (_, i) => i).filter(i => !bulletSet.has(i));
      const bulletSlots = Array.from(bulletSet);

      const willWin = Math.random() < (emptySlots.length / this.TOTAL_SLOTS);
      const targetSlot = willWin
        ? emptySlots[Math.floor(Math.random() * emptySlots.length)]
        : bulletSlots[Math.floor(Math.random() * bulletSlots.length)];

      results.push({ targetSlot, isWin: willWin, drumIndex: d });
    });



    const spinPromises = this.drumStates.map((ds, d) => {
      const { targetSlot } = results[d];
      const slotToTopDeg = ((6 - targetSlot) % 6) * 60;  // ← FIXED
      const finalRot = ds.rotation + extraSpins + slotToTopDeg;

      return this.animateSpin(rings[d].nativeElement, ds.rotation, finalRot, duration)
        .then(() => {
          ds.rotation = finalRot;
          return this.settleBounce(rings[d].nativeElement, finalRot);
        });
    });

    await Promise.all(spinPromises);

    this.audio.stopSpin();

    const actualResults = this.drumStates.map((ds, drumIndex) => {

      const slotIndex = this.getSlotUnderTrigger(ds.rotation);

      const isBullet = ds.bulletSet.has(slotIndex);

      return {
        drumIndex,
        targetSlot: slotIndex,
        isWin: !isBullet
      };
    });

    // ── Pointer trigger ──────────────────────────────────────
    const anyLoss = actualResults.some(r => !r.isWin);
    const pointerPromises = actualResults.map(r =>
      this.triggerPointer(triggers[r.drumIndex].nativeElement, !r.isWin, this.drumSize)
    );
    await Promise.all(pointerPromises);

    // ── Apply results ────────────────────────────────────────
    this.ngZone.run(() => {
      if (!anyLoss) {
        // WIN
        const payout = parseFloat((this.bet * this.multiplier).toFixed(2));
        this.balance += payout;
        this.winAmount = payout;
        this.winPopupVisible = true;

        this.drumStates.forEach(ds => {
          ds.winGlow = true;
          setTimeout(() => { ds.winGlow = false; }, 1600);
        });

      } else {
        // LOSS — bomb animation on hit slots
        actualResults.forEach(r => {
          if (!r.isWin) {
            this.audio.playBoom();
            const ds = this.drumStates[r.drumIndex];

            // isHit: bullet flash
            ds.slots[r.targetSlot].isHit = true;
            // isBoom: bomb overlay neeche
            ds.slots[r.targetSlot].isBoom = true;

            ds.loseGlow = true;

            setTimeout(() => {
              ds.slots[r.targetSlot].isHit = false;
              ds.slots[r.targetSlot].isBoom = false;
              ds.loseGlow = false;
            }, 1800);
          }
        });

        this.showLosePopup();
      }

      this.spinning = false;
    });
  }

  private showLosePopup(): void {
    this.losePopupVisible = true;
    clearTimeout(this.losePopupTimer);
    this.losePopupTimer = setTimeout(() => {
      this.losePopupVisible = false;
    }, 3000);
  }

  // ── Animations ────────────────────────────────────────────
  private animateSpin(ring: HTMLElement, from: number, to: number, durationMs: number): Promise<void> {
    return new Promise(resolve => {
      const start = performance.now();
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
      const frame = (now: number) => {
        const t = Math.min((now - start) / durationMs, 1);
        ring.style.transform = `rotate(${from + (to - from) * easeOut(t)}deg)`;
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  private settleBounce(ring: HTMLElement, finalRot: number): Promise<void> {
    return new Promise(resolve => {
      ring.style.transition = 'transform 0.12s ease-out';
      ring.style.transform = `rotate(${finalRot + 3}deg)`;
      setTimeout(() => {
        ring.style.transform = `rotate(${finalRot}deg)`;
        ring.style.transition = '';
        setTimeout(resolve, 100);
      }, 120);
    });
  }

  private triggerPointer(
    trigger: HTMLElement,
    isHit: boolean,
    drumSizePx: number
  ): Promise<void> {

    return new Promise(resolve => {

      const travel = Math.round(drumSizePx * 0.11);
      const baseTop = -Math.round(this.triggerSize * 0.22);

      const DOWN_MS = 80;
      const HOLD_MS = isHit ? 140 : 80;
      const UP_MS = 90;

      trigger.style.transition =
        `top ${DOWN_MS}ms cubic-bezier(0.22,1,0.36,1)`;

      trigger.style.top = `${baseTop + travel}px`;

      this.audio.playTrigger();

      setTimeout(() => {

        trigger.style.transition =
          `top ${UP_MS}ms cubic-bezier(0.22,1,0.36,1)`;

        trigger.style.top = `${baseTop}px`;

        setTimeout(resolve, UP_MS);

      }, DOWN_MS + HOLD_MS);

    });
  }

  private getSlotUnderTrigger(rotation: number): number {
    const normalized = ((rotation % 360) + 360) % 360;

    let closestSlot = 0;
    let minDiff = 999;

    for (let i = 0; i < this.TOTAL_SLOTS; i++) {
      const slotAngle = (i * 60 + normalized) % 360;

      const diff = Math.min(
        Math.abs(slotAngle),
        360 - Math.abs(slotAngle)
      );

      if (diff < minDiff) {
        minDiff = diff;
        closestSlot = i;
      }
    }

    return closestSlot;
  }

  startAutoPlay(): void {
    if (this.isAutoPlaying) return;
    this.closeAutoBetModal();
    this.isAutoPlaying = true;
    this.remainingRounds = this.selectedAutoRounds;

    this.runAutoPlay();
  }

  private async runAutoPlay(): Promise<void> {
    while (
      this.isAutoPlaying &&
      this.remainingRounds > 0 &&
      this.balance >= this.bet
    ) {
      await this.spin();
      this.remainingRounds--;
      await new Promise(resolve =>
        setTimeout(resolve, 600)
      );
    }
    this.stopAutoPlay();
  }

  stopAutoPlay(): void {
    this.isAutoPlaying = false;
    this.remainingRounds = 0;
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
    }
  }

  openAutobetModal() {
    this.showAutoBetModal = true;
  }
  closeAutoBetModal() {
    this.showAutoBetModal = false;
  }

  openStakesModal() {
    this.showStakesModal = true;
  }
  closeStakesModal() {
    this.showStakesModal = false;
  }


}