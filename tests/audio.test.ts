import { expect, test } from 'bun:test';
import { AudioManager } from '../src/game/services/audio';
import type { AssetPack } from '../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';
import { mockAudio } from '../src/game/services/mock-audio';

test('sound slots recover after muting; music fades between tracks and restarts after unmuting', () => {
  const original = new Map(
    ['Audio', 'requestAnimationFrame', 'cancelAnimationFrame'].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const channels: FakeAudio[] = [];
  let callback: FrameRequestCallback = () => {};
  class FakeAudio {
    volume = 1;
    loop = false;
    paused = true;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public src: string) {
      channels.push(this);
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: FakeAudio });
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (next: FrameRequestCallback) => {
      callback = next;
      return 1;
    },
  });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: () => {},
  });
  const manager = new AudioManager({
    sounds: new Map([566, 567, 568].map((id) => [id, new Blob([String(id)])])),
  } as AssetPack);
  let now = performance.now();
  function frames(count: number) {
    for (let i = 0; i < count; i++) callback((now += 20));
  }
  try {
    manager.playEvents(
      Array.from({ length: 11 }, () => ({ type: 'pop' as const })),
      DEFAULT_SETTINGS,
    );
    expect(channels).toHaveLength(10);
    manager.setSound(false);
    expect(channels.every((channel) => channel.paused)).toBe(true);
    manager.playEvents([{ type: 'pop' }], DEFAULT_SETTINGS);
    expect(channels).toHaveLength(11);
    manager.setMusic('menu', true);
    const menu = channels.at(-1)!;
    expect(menu.volume).toBe(0);
    frames(41);
    expect(menu.volume).toBe(0.8);
    manager.setMusic('game', true);
    frames(41);
    const game = channels.at(-1)!;
    expect(menu.paused).toBe(true);
    expect(game.src).not.toBe(menu.src);
    frames(20);
    expect(game.volume).toBe(0.8);
    game.pause();
    const count = channels.length;
    manager.unlock();
    expect(game.paused).toBe(false);
    expect(channels).toHaveLength(count);
    manager.setMusic('game', false);
    expect(game.paused).toBe(true);
    manager.setMusic('game', true);
    expect(channels.at(-1)!.volume).toBe(0.8);
    expect(channels.at(-1)!.paused).toBe(false);
  } finally {
    manager.dispose();
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
test('mock audio contains playable PCM samples and a quiet looping music phrase', async () => {
  for (const id of [561, 562, 567, 568]) {
    const blob = mockAudio(id),
      bytes = new Uint8Array(await blob.arrayBuffer());
    expect(blob.type).toBe('audio/wav');
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe('WAVE');
    expect(bytes.slice(44).some((value) => value !== 0)).toBe(true);
  }
});
