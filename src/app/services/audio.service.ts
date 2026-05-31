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

    constructor() {

        // ── LocalStorage ─────────────────────────────
        const sound = localStorage.getItem(this.SOUND_KEY);
        const music = localStorage.getItem(this.MUSIC_KEY);

        this.soundEnabled = sound !== 'false';
        this.musicEnabled = music !== 'false';

        // ── Load Sounds ──────────────────────────────
        this.sounds['trigger'] = new Audio('assets/audios/trigger-sound.mp3');
        this.sounds['spin'] = new Audio('assets/audios/spin-sound.mp3');
        this.sounds['boom'] = new Audio('assets/audios/boom-sound.mp3');
        this.sounds['bg'] = new Audio('assets/audios/bg-sound.mp3');

        // Background music loop
        this.sounds['bg'].loop = true;

        // volumes
        this.sounds['spin'].volume = 0.5;
        this.sounds['bg'].volume = 0.25;
        this.sounds['boom'].volume = 0.8;
        this.sounds['trigger'].volume = 0.8;

        // autoplay try
        this.tryStartBg();
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

        const bg = this.sounds['bg'];

        bg.play().catch(() => {
            // browser block karega jab tak user interact na kare
        });
    }

    stopBg(): void {
        this.stop('bg');
    }

    // ─────────────────────────────────────────────
    // TOGGLES
    // ─────────────────────────────────────────────

    toggleSound(): void {
        this.soundEnabled = !this.soundEnabled;

        localStorage.setItem(
            this.SOUND_KEY,
            String(this.soundEnabled)
        );
    }

    toggleMusic(): void {

        this.musicEnabled = !this.musicEnabled;

        localStorage.setItem(
            this.MUSIC_KEY,
            String(this.musicEnabled)
        );

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