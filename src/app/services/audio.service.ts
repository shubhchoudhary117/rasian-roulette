import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class AudioService {

    private SOUND_KEY = 'rr_sound_enabled';
    private MUSIC_KEY = 'rr_music_enabled';

    soundEnabled = true;
    musicEnabled = true;

    private userInteracted = false;
    private bgStartPending = false;

    private audioContext!: AudioContext;
    private buffers: Record<string, AudioBuffer> = {};

    private bgMusic = new Audio('assets/audios/bg-sound.mp3');

    constructor() {

        const sound = localStorage.getItem(this.SOUND_KEY);
        const music = localStorage.getItem(this.MUSIC_KEY);

        this.soundEnabled = sound !== 'false';
        this.musicEnabled = music !== 'false';

        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.25;
        this.bgMusic.preload = 'auto';

        this.audioContext = new (
            window.AudioContext ||
            (window as any).webkitAudioContext
        )();

        this.loadAllSounds();

        this.listenForFirstInteraction();

        document.addEventListener(
            'visibilitychange',
            async () => {

                if (
                    document.visibilityState === 'visible' &&
                    this.audioContext.state === 'suspended'
                ) {
                    try {
                        await this.audioContext.resume();
                    } catch { }
                }

            }
        );
    }

    // --------------------------------------------------
    // LOAD AUDIO BUFFERS
    // --------------------------------------------------

    private async loadAllSounds(): Promise<void> {

        await Promise.all([
            this.loadSound(
                'trigger',
                'assets/audios/trigger-sound.mp3'
            ),
            this.loadSound(
                'spin',
                'assets/audios/spin-sound.mp3'
            ),
            this.loadSound(
                'boom',
                'assets/audios/boom-sound.mp3'
            )
        ]);
    }

    private async loadSound(
        key: string,
        url: string
    ): Promise<void> {

        try {

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();

            this.buffers[key] =
                await this.audioContext.decodeAudioData(
                    arrayBuffer
                );

        } catch (err) {
            console.error(
                `Failed loading sound: ${key}`,
                err
            );
        }
    }

    // --------------------------------------------------
    // AUDIO UNLOCK
    // --------------------------------------------------

    private async unlockAudio(): Promise<void> {

        try {

            if (
                this.audioContext &&
                this.audioContext.state === 'suspended'
            ) {
                await this.audioContext.resume();
            }

            const silentBuffer =
                this.audioContext.createBuffer(
                    1,
                    1,
                    22050
                );

            const source =
                this.audioContext.createBufferSource();

            source.buffer = silentBuffer;
            source.connect(
                this.audioContext.destination
            );

            source.start(0);

        } catch { }
    }

    async resumeAudio(): Promise<void> {

        try {

            if (
                this.audioContext &&
                this.audioContext.state === 'suspended'
            ) {
                await this.audioContext.resume();
            }

        } catch { }
    }

    // --------------------------------------------------
    // FIRST INTERACTION
    // --------------------------------------------------

    private listenForFirstInteraction(): void {

        const handler = async () => {

            if (!this.userInteracted) {

                this.userInteracted = true;

                await this.unlockAudio();

                if (
                    this.bgStartPending &&
                    this.musicEnabled
                ) {
                    this.startBgMusic();
                }
            }

            document.removeEventListener(
                'touchstart',
                handler
            );

            document.removeEventListener(
                'click',
                handler
            );

            document.removeEventListener(
                'keydown',
                handler
            );
        };

        document.addEventListener(
            'touchstart',
            handler,
            { passive: true }
        );

        document.addEventListener(
            'click',
            handler
        );

        document.addEventListener(
            'keydown',
            handler
        );
    }

    // --------------------------------------------------
    // BG MUSIC
    // --------------------------------------------------

    private startBgMusic(): void {

        this.bgMusic.currentTime = 0;

        this.bgMusic.play().catch(() => { });
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

        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
    }

    // --------------------------------------------------
    // PLAY BUFFER
    // --------------------------------------------------

    private playBuffer(
        name: string,
        volume = 1
    ): void {

        if (!this.soundEnabled) return;

        const buffer =
            this.buffers[name];

        if (!buffer) return;

        try {

            if (
                this.audioContext.state ===
                'suspended'
            ) {
                this.audioContext.resume();
            }

            const source =
                this.audioContext
                    .createBufferSource();

            source.buffer = buffer;

            const gain =
                this.audioContext
                    .createGain();

            gain.gain.value = volume;

            source.connect(gain);

            gain.connect(
                this.audioContext.destination
            );

            source.start(0);

        } catch { }
    }

    // --------------------------------------------------
    // FX
    // --------------------------------------------------

    playTrigger(): void {
        this.playBuffer(
            'trigger',
            0.8
        );
    }

    playBoom(): void {
        this.playBuffer(
            'boom',
            0.8
        );
    }

    playSpin(): void {
        this.playBuffer(
            'spin',
            0.5
        );
    }

    stopSpin(): void {
        // Buffer sounds stop nahi karte
        // Spin short effect hai
    }

    // --------------------------------------------------
    // SETTINGS
    // --------------------------------------------------

    toggleSound(): void {

        this.soundEnabled =
            !this.soundEnabled;

        localStorage.setItem(
            this.SOUND_KEY,
            String(this.soundEnabled)
        );
    }

    toggleMusic(): void {

        this.musicEnabled =
            !this.musicEnabled;

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
}