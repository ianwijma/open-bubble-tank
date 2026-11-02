import type { AssetPack } from '../assets/asset-pack';
import type { Settings, WorldEvent } from '../core/types';
import { mockAudio } from './mock-audio';
import type { StageRuntime } from './stage-runtime';
const SOUND_IDS: Partial<Record<WorldEvent['type'], number>> = {
  shoot: 561,
  collect: 562,
  hit: 563,
  hurt: 564,
  pop: 566,
  death: 565,
};
export class AudioManager {
  private urls = new Map<number, string>();
  private channels = new Set<HTMLAudioElement>();
  private music: HTMLAudioElement | null = null;
  private wantedTrack = 0;
  private rememberedTrack = 0;
  private musicEnabled = true;
  private fade: { direction: 'in' | 'out'; frame: number; total: number; from: number } | null =
    null;
  private unsubscribe: () => void;
  constructor(pack: AssetPack, stage: StageRuntime) {
    for (const [id, blob] of pack.sounds) this.urls.set(id, URL.createObjectURL(blob));
    if (pack.mode === 'mock')
      for (const id of [561, 562, 563, 564, 565, 566, 567, 568])
        this.urls.set(id, URL.createObjectURL(mockAudio(id)));
    // MusicPlayer registers on the stage before the World/Main listener.
    this.unsubscribe = stage.subscribe({ beforeStep: () => this.tickMusic() });
  }
  playEvents(events: WorldEvent[], settings: Settings) {
    if (!settings.sound) return;
    for (const event of events) {
      const id = SOUND_IDS[event.type];
      if (!id) continue;
      const url = this.urls.get(id);
      if (!url || this.channels.size >= 10) continue;
      const audio = new Audio(url);
      audio.volume = id === 562 ? 0.6 : id === 564 ? 0.9 : 1;
      this.channels.add(audio);
      const release = () => this.channels.delete(audio);
      audio.onended = release;
      audio.onerror = release;
      void audio.play().catch(release);
    }
  }
  /** Re-enter playback inside a pointer/key gesture after autoplay rejection or media suspension. */
  unlock() {
    if (this.musicEnabled && this.music?.paused) void this.music.play().catch(() => {});
  }
  private startMusic(id: number, frames: number) {
    this.stopMusic();
    this.rememberedTrack = id;
    const url = this.urls.get(id);
    if (!url) return;
    this.music = new Audio(url);
    // MusicPlayer receives SOUND_COMPLETE and starts the same Sound again.
    // Native looping would bypass its volume write during an active transition.
    this.music.loop = false;
    this.music.volume = frames ? 0 : 0.8;
    const audio = this.music;
    audio.onended = () => {
      if (!this.musicEnabled || this.music !== audio) return;
      audio.currentTime = 0;
      audio.volume = 0.8;
      // Completion replaces the voice, not MusicPlayer's transition/counter.
      void audio.play().catch(() => {});
    };
    this.fade = frames ? { direction: 'in', frame: 0, total: frames, from: 0 } : null;
    if (this.musicEnabled) void this.music.play().catch(() => {});
  }
  private stopMusic() {
    const audio = this.music;
    this.music = null;
    if (audio) {
      audio.onended = null;
      audio.pause();
    }
  }
  private tickMusic() {
    if (!this.musicEnabled || !this.fade || !this.music) return;
    const fade = this.fade,
      progress = Math.min(1, ++fade.frame / fade.total);
    this.music.volume = fade.direction === 'in' ? 0.8 * progress : fade.from * (1 - progress);
    if (progress === 1) {
      this.fade = null;
      if (fade.direction === 'out') this.startMusic(this.wantedTrack, 20);
    }
  }
  setMusicEnabled(enabled: boolean) {
    if (enabled === this.musicEnabled) return;
    if (!enabled) {
      if (this.musicEnabled && this.fade?.direction === 'out')
        this.rememberedTrack = this.wantedTrack;
      this.musicEnabled = false;
      this.music?.pause();
      this.fade = null;
      return;
    }
    if (!this.musicEnabled) {
      this.musicEnabled = true;
      if (this.rememberedTrack) this.startMusic(this.rememberedTrack, 0);
    }
  }
  /** Main._-RO is called for a fresh menu/game, including an already playing track. */
  requestMusic(mode: 'menu' | 'game') {
    // Muted/fading calls are discarded, not queued for a later settings update.
    if (!this.musicEnabled || this.fade) return;
    const id = mode === 'menu' ? 568 : 567;
    if (!this.music) this.startMusic(id, 40);
    else {
      this.wantedTrack = id;
      this.fade = { direction: 'out', frame: 0, total: 40, from: 0.8 };
    }
  }
  setSound(enabled: boolean) {
    if (!enabled) {
      for (const channel of this.channels) channel.pause();
      this.channels.clear();
    }
  }
  dispose() {
    this.unsubscribe();
    this.stopMusic();
    this.fade = null;
    for (const a of this.channels) a.pause();
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.channels.clear();
    this.urls.clear();
  }
}
