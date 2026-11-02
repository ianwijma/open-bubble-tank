import { expect, test } from 'bun:test';
import { AudioManager } from '../src/game/services/audio';
import type { AssetPack } from '../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';
import { mockAudio } from '../src/game/services/mock-audio';
import { StageRuntime } from '../src/game/services/stage-runtime';

test('sound slots recover after muting; music fades between tracks and restarts after unmuting', () => {
  const original = new Map(
    ['Audio'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  const channels: FakeAudio[] = [];
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
  const stage = new StageRuntime();
  const manager = new AudioManager(
    {
      sounds: new Map([566, 567, 568].map((id) => [id, new Blob([String(id)])])),
    } as AssetPack,
    stage,
  );
  function frames(count: number) {
    for (let i = 0; i < count; i++) stage.advance(20, 50);
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

test('music accepts steady-state route calls, remembers mute state, and uses the shared stage clock', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  const channels: { src: string; volume: number; paused: boolean }[] = [];
  class FakeAudio {
    volume = 1;
    paused = true;
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
  const stage = new StageRuntime();
  const pack = {
    sounds: new Map([567, 568].map((id) => [id, new Blob([String(id)])])),
  } as AssetPack;
  let manager = new AudioManager(pack, stage);
  const frames = (n: number) => {
    for (let i = 0; i < n; i++) stage.advance(1000 / 30, 30);
  };
  try {
    manager.setMusic('menu', true);
    const firstMenu = channels[0];
    frames(5);
    expect(firstMenu.volume).toBe(0.1);
    manager.setMusic('game', true); // PlayMusic ignores a call during initial fade-in.
    frames(35);
    expect(channels).toHaveLength(1);
    expect(firstMenu.volume).toBe(0.8);
    manager.dispose();
    manager = new AudioManager(pack, stage);
    manager.setMusic('menu', true);
    frames(40);
    const menu = channels.at(-1)!;
    manager.setMusic('game', true);
    frames(2);
    manager.setMusic('menu', true); // Does not replace the accepted switch target.
    frames(38);
    const game = channels.at(-1)!;
    expect(game.src).not.toBe(menu.src);
    expect(game.volume).toBe(0);
    frames(20);
    expect(game.volume).toBe(0.8);
    manager.setMusic('game', false);
    manager.setMusic('menu', false); // Main does not call PlayMusic while muted.
    frames(100);
    expect(game.paused).toBe(true);
    manager.setMusic('menu', true);
    expect(channels.at(-1)!.src).toBe(game.src);
    expect(channels.at(-1)!.volume).toBe(0.8);
    // Disposing must remove the shared subscription as well as stopping media.
    manager.setMusic('game', true);
    manager.setMusic('menu', true);
    frames(1);
    const last = channels.at(-1)!;
    manager.dispose();
    const volume = last.volume;
    frames(5);
    expect(last.volume).toBe(volume);
  } finally {
    manager.dispose();
    if (original) Object.defineProperty(globalThis, 'Audio', original);
    else Reflect.deleteProperty(globalThis, 'Audio');
  }
});
