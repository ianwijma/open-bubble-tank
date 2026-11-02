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
  private requestedTrack = 0;
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
    this.music?.pause();
    this.music = null;
    this.rememberedTrack = id;
    const url = this.urls.get(id);
    if (!url) return;
    this.music = new Audio(url);
    this.music.loop = true;
    this.music.volume = frames ? 0 : 0.8;
    this.fade = frames ? { direction: 'in', frame: 0, total: frames, from: 0 } : null;
    if (this.musicEnabled) void this.music.play().catch(() => {});
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
  setMusic(mode: 'menu' | 'game', enabled: boolean) {
    const id = mode === 'menu' ? 568 : 567;
    const changed = id !== this.requestedTrack;
    this.requestedTrack = id;
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
    // Main._-RO ignores muted route calls. PlayMusic accepts only idle/steady states;
    // a rejected request is not queued or retried on an unrelated profile update.
    if (!changed || this.fade) return this.unlock();
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
    this.music?.pause();
    for (const a of this.channels) a.pause();
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.channels.clear();
    this.urls.clear();
  }
}
