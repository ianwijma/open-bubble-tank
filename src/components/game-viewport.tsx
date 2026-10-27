'use client';
import { useEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { Settings } from '@/game/core/types';
import { GameInput } from '@/game/core/input';
import type { World } from '@/game/simulation/world';
import type { AudioManager } from '@/game/services/audio';
export function GameViewport({
  world,
  pack,
  settings,
  audio,
  onChange,
}: {
  world: World;
  pack: AssetPack;
  settings: Settings;
  audio: AudioManager | null;
  onChange: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    settingsRef = useRef(settings),
    changeRef = useRef(onChange),
    [error, setError] = useState('');
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);
  const mode = world.mode;
  useEffect(() => {
    if (mode === 'playing' || mode === 'transit' || mode === 'collapse')
      host.current?.focus({ preventScroll: true });
  }, [mode]);
  useEffect(() => {
    let cancelled = false,
      frame = 0,
      renderer: import('@/game/render/pixi-renderer').GameRenderer | undefined,
      input: GameInput | undefined;
    async function start() {
      const { GameRenderer } = await import('@/game/render/pixi-renderer');
      if (cancelled || !host.current) return;
      renderer = new GameRenderer(pack);
      try {
        await renderer.init(host.current, settingsRef.current);
        if (cancelled) {
          renderer.destroy();
          return;
        }
        input = new GameInput(
          host.current,
          () => settingsRef.current,
          () => {
            world.pause();
            input?.clear(false);
            changeRef.current();
          },
          () => {
            world.cycleLock();
            changeRef.current();
          },
          () => world.stopPrimaryFire(),
        );
        world.hitTest = pack.hitTest;
        world.protectionRadius = pack.protectionRadius;
        world.hitPart = pack.hitPart;
        world.hitProjectile = pack.hitProjectile;
        world.projectileBounds = (b) =>
          pack.projectileBounds(
            b,
            b.kind === 'turret' ? world.allTanks().find((t) => t.uid === b.owner) : undefined,
          );
        host.current.focus({ preventScroll: true });
        let last = performance.now(),
          accumulator = 0,
          lastRevision = -1;
        const tick = (now: number) => {
          if (cancelled) return;
          const elapsed = Math.max(0, now - last);
          last = now;
          world.advanceTime(elapsed);
          accumulator += Math.min(elapsed, 100);
          const step = 1000 / settingsRef.current.fps;
          while (accumulator >= step) {
            world.viewZoom = settingsRef.current.zoom;
            world.step(input!.frame(), 0);
            audio?.playEvents(world.drainEvents(), settingsRef.current);
            accumulator -= step;
          }
          renderer!.draw(world, settingsRef.current);
          if (world.revision !== lastRevision) {
            lastRevision = world.revision;
            changeRef.current();
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Graphics could not start.');
      }
    }
    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      input?.dispose();
      if (renderer?.app.renderer) renderer.destroy();
    };
  }, [world, pack, audio]);
  return (
    <div
      ref={host}
      className="game-canvas"
      tabIndex={0}
      role="application"
      aria-label="Bubble Tanks 3. WASD to move, mouse to aim and fire, Space for secondary weapons, P or Escape to pause."
    >
      {error ? (
        <div role="alert" className="graphics-error">
          Graphics could not start: {error}
          <br />
          This game needs a browser with WebGL enabled.
        </div>
      ) : null}
    </div>
  );
}
