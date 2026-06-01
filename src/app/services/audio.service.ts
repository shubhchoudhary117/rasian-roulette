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

        Object.values(this.sounds).forEach(audio => {
            audio.preload = 'auto';
            audio.load();
        });

        this.listenForFirstInteraction();
    }

    // --------------------------------------------------
    // AUDIO UNLOCK (iPhone Fix)
    // --------------------------------------------------

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

    // --------------------------------------------------
    // FIRST USER INTERACTION
    // --------------------------------------------------

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

    // --------------------------------------------------BG MUSIC

    private startBgMusic(): void {
        const bg = this.sounds['bg'];
        if (!bg) return;
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
        bg.pause();
        bg.currentTime = 0;
    }

    // --------------------------------------------------FX
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

    // -------------------------------------------------- SETTINGS
    toggleSound(): void {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem(
            this.SOUND_KEY,
            String(this.soundEnabled)
        );

        if (!this.soundEnabled) {

            ['trigger', 'spin', 'boom']
                .forEach(k => this.stop(k));
        }
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

    // --------------------------------------------------CORE PLAY
    private play(name: string): void {
        if (!this.soundEnabled && name !== 'bg') return;
        if (name === 'bg' && !this.musicEnabled) return;

        const audio = this.sounds[name];

        if (!audio) return;
        if (name === 'bg') {

            audio.play().catch(() => { });
            return;
        }

        // Trigger/Boom overlap fix
        const clone = audio.cloneNode(true) as HTMLAudioElement;
        clone.volume = audio.volume;
        clone.play().catch(() => { });
    }

    private stop(name: string): void {
        const audio = this.sounds[name];
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
    }
}