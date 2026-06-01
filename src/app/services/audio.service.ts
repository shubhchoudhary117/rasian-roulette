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

    private userInteracted = false;
    private bgStartPending = false;
    private spinPlaying = false; 

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

        this.sounds['spin'].loop = true;

        Object.values(this.sounds).forEach(audio => {
            audio.preload = 'auto';
            audio.load();
        });

        this.listenForFirstInteraction();
    }

    // ── Audio Unlock (iPhone fix) ──────────────────────────
    private unlockAudio(): void {
        Object.values(this.sounds).forEach(sound => {
            sound.muted = true;
            sound.play()
                .then(() => {
                    sound.pause();
                    sound.currentTime = 0;
                    sound.muted = false;
                })
                .catch(() => { });
        });
    }

    // ── First interaction ──────────────────────────────────
    private listenForFirstInteraction(): void {
        const handler = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                this.unlockAudio();
                if (this.bgStartPending && this.musicEnabled) {
                    this.startBgMusic();
                }
            }
            document.removeEventListener('touchstart', handler);
            document.removeEventListener('click', handler);
            document.removeEventListener('keydown', handler);
        };

        document.addEventListener('touchstart', handler, { passive: true });
        document.addEventListener('click', handler);
        document.addEventListener('keydown', handler);
    }

    // ── BG Music ───────────────────────────────────────────
    private startBgMusic(): void {
        const bg = this.sounds['bg'];
        if (!bg || bg.readyState < 2) return; 
        bg.currentTime = 0;
        bg.play().catch(() => { });
    }

    tryStartBg(): void {
        if (!this.musicEnabled) return;
        if (this.userInteracted) {
            this.startBgMusic();
        } else {
            this.bgStartPending = true;
        }
    }

    stopBg(): void {
        this.bgStartPending = false;
        const bg = this.sounds['bg'];
        if (!bg) return;
        bg.pause();
        bg.currentTime = 0;
    }

    // ── Spin ───────────────────────────────────────────────
    playSpin(): void {
        if (!this.soundEnabled) return;
        if (this.spinPlaying) return; 

        const audio = this.sounds['spin'];
        if (!audio) return;

        audio.pause();
        audio.currentTime = 0;
        audio.play()
            .then(() => { this.spinPlaying = true; })
            .catch(() => { this.spinPlaying = false; });
    }

    stopSpin(): void {
        const audio = this.sounds['spin'];
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
        this.spinPlaying = false; 
    }

    // ── FX ─────────────────────────────────────────────────
    playTrigger(): void {
        if (!this.soundEnabled) return;
        this.playClone('trigger');
    }

    playBoom(): void {
        if (!this.soundEnabled) return;
        this.playClone('boom');
    }

    // ── Settings ───────────────────────────────────────────
    toggleSound(): void {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem(this.SOUND_KEY, String(this.soundEnabled));

        if (!this.soundEnabled) {
            this.stopSpin();
            this.stop('boom');
            this.stop('trigger');
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


    private playClone(name: string): void {
        const audio = this.sounds[name];
        if (!audio) return;
        const clone = audio.cloneNode(true) as HTMLAudioElement;
        clone.volume = audio.volume;
        clone.play().catch(() => { });
        clone.addEventListener('ended', () => clone.remove(), { once: true });
    }

    private stop(name: string): void {
        const audio = this.sounds[name];
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
    }
}