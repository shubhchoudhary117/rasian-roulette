import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class AudioService {

    private sounds: Record<string, HTMLAudioElement> = {};

    private SOUND_KEY = 'rr_sound_enabled';
    private MUSIC_KEY = 'rr_music_enabled';

    soundEnabled = true;
    musicEnabled = true;

    // User ne interact kiya ya nahi
    private userInteracted = false;
    private bgStartPending = false;

    constructor() {
        const sound = localStorage.getItem(this.SOUND_KEY);
        const music = localStorage.getItem(this.MUSIC_KEY);

        this.soundEnabled = sound !== 'false';
        this.musicEnabled = music !== 'false';

        this.sounds['trigger'] = new Audio('assets/audios/trigger-sound.mp3');
        this.sounds['spin'] = new Audio('assets/audios/spin-sound.mp3');
        this.sounds['boom'] = new Audio('assets/audios/boom-sound.mp3');
        this.sounds['bg'] = new Audio('assets/audios/bg-sound.mp3');

        this.sounds['bg'].loop = true;
        this.sounds['spin'].volume = 0.5;
        this.sounds['bg'].volume = 0.25;
        this.sounds['boom'].volume = 0.8;
        this.sounds['trigger'].volume = 0.8;

        // Preload all sounds
        Object.values(this.sounds).forEach(audio => {
            audio.preload = 'auto';
            audio.load();
        });

        // User ka pehla interaction pakdo — tab music shuru karo
        this.listenForFirstInteraction();
    }

    // ─────────────────────────────────────────────
    // First interaction listener
    // ─────────────────────────────────────────────
    private listenForFirstInteraction(): void {
        const handler = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                if (this.bgStartPending && this.musicEnabled) {
                    this.startBgMusic();
                }
            }
            // Listeners hata do — ek baar kafi hai
            document.removeEventListener('touchstart', handler);
            document.removeEventListener('click', handler);
            document.removeEventListener('keydown', handler);
        };

        document.addEventListener('touchstart', handler, { passive: true });
        document.addEventListener('click', handler);
        document.addEventListener('keydown', handler);
    }

    private startBgMusic(): void {
        const bg = this.sounds['bg'];
        if (!bg) return;
        bg.currentTime = 0;
        bg.play().catch(() => { });
    }

    // ─────────────────────────────────────────────
    // SOUND FX
    // ─────────────────────────────────────────────

    playTrigger(): void {
        this.play('trigger');
    }

    playSpin(): void {
        this.play('spin');
    }

    stopSpin(): void {
        this.stop('spin');
    }

    playBoom(): void {
        this.play('boom');
    }

    // ─────────────────────────────────────────────
    // BACKGROUND MUSIC
    // ─────────────────────────────────────────────

    tryStartBg(): void {
        if (!this.musicEnabled) return;

        if (this.userInteracted) {
            // User already interact kar chuka — seedha play karo
            this.startBgMusic();
        } else {
            // Interaction ka wait karo — flag set karo
            this.bgStartPending = true;
        }
    }

    stopBg(): void {
        this.bgStartPending = false;
        this.stop('bg');
    }

    // ─────────────────────────────────────────────
    // TOGGLES
    // ─────────────────────────────────────────────

    toggleSound(): void {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem(this.SOUND_KEY, String(this.soundEnabled));

        // Sound band karo toh sab fx ruk jayein
        if (!this.soundEnabled) {
            ['trigger', 'spin', 'boom'].forEach(k => this.stop(k));
        }
    }

    toggleMusic(): void {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem(this.MUSIC_KEY, String(this.musicEnabled));

        if (this.musicEnabled) {
            this.tryStartBg();
        } else {
            this.stopBg();
        }
    }

    // ─────────────────────────────────────────────
    // CORE
    // ─────────────────────────────────────────────

    private play(name: string): void {
        if (!this.soundEnabled && name !== 'bg') return;
        if (name === 'bg' && !this.musicEnabled) return;

        const audio = this.sounds[name];
        if (!audio) return;

        audio.currentTime = 0;
        audio.play().catch(() => { });
    }

    private stop(name: string): void {
        const audio = this.sounds[name];
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
    }
}