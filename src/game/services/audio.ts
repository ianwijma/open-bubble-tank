import type { AssetPack } from '../assets/asset-pack';
import type { Settings, WorldEvent } from '../core/types';
import { mockAudio } from './mock-audio';
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
  private track = 0;
  private wantedTrack = 0;
  private musicEnabled = true;
  private fade: { direction: 'in' | 'out'; frame: number; total: number; from: number } | null =
    null;
  private animation = 0;
  private fps = 50;
  private frame = 0;
  private last = new Map<number, number>();
  constructor(pack: AssetPack) {
    for (const [id, blob] of pack.sounds) this.urls.set(id, URL.createObjectURL(blob));
    if (pack.mode === 'mock')
      for (const id of [561, 562, 563, 564, 565, 566, 567, 568])
        this.urls.set(id, URL.createObjectURL(mockAudio(id)));
    let last = performance.now(),
      accumulator = 0;
    const tick = (now: number) => {
      accumulator += Math.min(100, now - last);
      last = now;
      while (accumulator >= 1000 / this.fps) {
        this.tickMusic();
        accumulator -= 1000 / this.fps;
      }
      this.animation = requestAnimationFrame(tick);
    };
    this.animation = requestAnimationFrame(tick);
  }
  playEvents(events: WorldEvent[], settings: Settings) {
    this.frame++;
    if (!settings.sound) return;
    for (const event of events) {
      const id = SOUND_IDS[event.type];
      if (!id) continue;
      const throttle = id === 563 ? 4 : 0;
      if (this.frame - (this.last.get(id) ?? -100) < throttle) continue;
      const url = this.urls.get(id);
      if (!url || this.channels.size >= 10) continue;
      const audio = new Audio(url);
      audio.volume = id === 562 ? 0.6 : id === 564 ? 0.9 : 1;
      this.channels.add(audio);
      this.last.set(id, this.frame);
      const release = () => this.channels.delete(audio);
      audio.onended = release;
      audio.onerror = release;
      void audio.play().catch(release);
    }
  }
  setFrameRate(fps: number) {
    this.fps = fps;
  }
  /** Re-enter playback inside a pointer/key gesture after autoplay rejection or media suspension. */
  unlock() {
    if (this.musicEnabled && this.music?.paused) void this.music.play().catch(() => {});
  }
  private startMusic(id: number, frames: number) {
    this.music?.pause();
    this.music = null;
    this.track = id;
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
    this.wantedTrack = id;
    if (!enabled) {
      this.musicEnabled = false;
      this.music?.pause();
      this.fade = null;
      return;
    }
    if (!this.musicEnabled) {
      this.musicEnabled = true;
      this.startMusic(id, 0); // MusicPlayer._-a3 restarts a muted track at full volume.
      return;
    }
    if (id === this.track && this.music) {
      this.unlock();
      return;
    }
    if (!this.music) {
      this.startMusic(id, 40);
      return;
    }
    if (this.fade?.direction !== 'out')
      this.fade = { direction: 'out', frame: 0, total: 40, from: this.music.volume };
  }
  setSound(enabled: boolean) {
    if (!enabled) {
      for (const channel of this.channels) channel.pause();
      this.channels.clear();
    }
  }
  dispose() {
    cancelAnimationFrame(this.animation);
    this.music?.pause();
    for (const a of this.channels) a.pause();
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.channels.clear();
    this.urls.clear();
  }
}
