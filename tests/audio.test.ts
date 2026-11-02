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
    manager.requestMusic('menu');
    const menu = channels.at(-1)!;
    expect(menu.volume).toBe(0);
    frames(41);
    expect(menu.volume).toBe(0.8);
    manager.requestMusic('game');
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
    manager.setMusicEnabled(false);
    expect(game.paused).toBe(true);
    manager.setMusicEnabled(true);
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
    manager.requestMusic('menu');
    const firstMenu = channels[0];
    frames(5);
    expect(firstMenu.volume).toBe(0.1);
    manager.requestMusic('game'); // PlayMusic ignores a call during initial fade-in.
    frames(35);
    expect(channels).toHaveLength(1);
    expect(firstMenu.volume).toBe(0.8);
    manager.dispose();
    manager = new AudioManager(pack, stage);
    manager.requestMusic('menu');
    frames(40);
    const menu = channels.at(-1)!;
    manager.requestMusic('game');
    frames(2);
    manager.requestMusic('menu'); // Does not replace the accepted switch target.
    frames(38);
    const game = channels.at(-1)!;
    expect(game.src).not.toBe(menu.src);
    expect(game.volume).toBe(0);
    frames(20);
    expect(game.volume).toBe(0.8);
    manager.setMusicEnabled(false);
    manager.requestMusic('menu'); // Main does not call PlayMusic while muted.
    frames(100);
    expect(game.paused).toBe(true);
    manager.setMusicEnabled(true);
    expect(channels.at(-1)!.src).toBe(game.src);
    expect(channels.at(-1)!.volume).toBe(0.8);
    // Disposing must remove the shared subscription as well as stopping media.
    manager.requestMusic('game');
    manager.requestMusic('menu');
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

test('new same-track scenes transition, while settings changes do not request music', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  const channels: FakeAudio[] = [];
  class FakeAudio {
    volume = 1;
    paused = true;
    onended: (() => void) | null = null;
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
    { sounds: new Map([[568, new Blob(['menu'])]]) } as AssetPack,
    stage,
  );
  const frames = (n: number) => {
    for (let i = 0; i < n; i++) stage.advance(20, 50);
  };
  try {
    manager.setMusicEnabled(false);
    manager.requestMusic('menu');
    manager.setMusicEnabled(true);
    expect(channels).toHaveLength(0);
    manager.requestMusic('menu');
    frames(40);
    const menu = channels[0];
    manager.setMusicEnabled(true);
    frames(5);
    expect(channels).toHaveLength(1);
    expect(menu.volume).toBe(0.8);
    manager.requestMusic('menu');
    frames(39);
    expect(menu.volume).toBeCloseTo(0.02);
    expect(channels).toHaveLength(1);
    frames(1);
    expect(menu.paused).toBe(true);
    expect(channels).toHaveLength(2);
    expect(channels[1].src).toBe(menu.src);
    expect(channels[1].volume).toBe(0);
    frames(20);
    expect(channels[1].volume).toBe(0.8);
  } finally {
    manager.dispose();
    if (original) Object.defineProperty(globalThis, 'Audio', original);
    else Reflect.deleteProperty(globalThis, 'Audio');
  }
});

test('music completion restores full volume without resetting a fade or reviving stale voices', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  const channels: FakeAudio[] = [];
  class FakeAudio {
    volume = 1;
    loop = false;
    currentTime = 0;
    paused = true;
    plays = 0;
    onended: (() => void) | null = null;
    constructor(public src: string) {
      channels.push(this);
    }
    play() {
      this.paused = false;
      this.plays++;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: FakeAudio });
  const stage = new StageRuntime();
  const manager = new AudioManager(
    { sounds: new Map([567, 568].map((id) => [id, new Blob([String(id)])])) } as AssetPack,
    stage,
  );
  const frames = (n: number) => {
    for (let i = 0; i < n; i++) stage.advance(20, 50);
  };
  const finish = (audio: FakeAudio) => {
    audio.paused = true;
    audio.currentTime = 29;
    audio.onended!();
  };
  try {
    manager.requestMusic('menu');
    const menu = channels[0];
    const menuComplete = menu.onended!;
    expect(menu.loop).toBe(false);
    frames(5);
    expect(menu.volume).toBe(0.1);
    finish(menu);
    expect(menu.currentTime).toBe(0);
    expect(menu.volume).toBe(0.8);
    expect(menu.plays).toBe(2);
    frames(1);
    expect(menu.volume).toBeCloseTo(0.12);
    frames(34);
    manager.requestMusic('game');
    frames(5);
    expect(menu.volume).toBeCloseTo(0.7);
    finish(menu);
    expect(menu.volume).toBe(0.8);
    frames(1);
    expect(menu.volume).toBeCloseTo(0.68);
    frames(34);
    const game = channels[1];
    expect(menu.onended).toBe(null);
    const plays = menu.plays;
    menuComplete();
    expect(menu.plays).toBe(plays);
    expect(game.src).not.toBe(menu.src);
    frames(20);
    const gameComplete = game.onended!;
    manager.setMusicEnabled(false);
    gameComplete();
    expect(game.paused).toBe(true);
    expect(game.plays).toBe(1);
    manager.setMusicEnabled(true);
    const resumed = channels[2];
    gameComplete();
    expect(game.plays).toBe(1);
    expect(resumed.volume).toBe(0.8);
    const resumedComplete = resumed.onended!;
    manager.dispose();
    resumedComplete();
    expect(resumed.paused).toBe(true);
    expect(resumed.plays).toBe(1);
  } finally {
    manager.dispose();
    if (original) Object.defineProperty(globalThis, 'Audio', original);
    else Reflect.deleteProperty(globalThis, 'Audio');
  }
});
