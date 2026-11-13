'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { Settings } from '@/game/core/types';
import { GameInput } from '@/game/core/input';
import type { World } from '@/game/simulation/world';
import type { AudioManager } from '@/game/services/audio';
import type { StageRuntime } from '@/game/services/stage-runtime';
export function GameViewport({
  world,
  pack,
  settings,
  audio,
  stage,
  onChange,
  onReady,
  isUpgradeOpen,
}: {
  world: World;
  pack: AssetPack;
  settings: Settings;
  audio: AudioManager | null;
  stage: StageRuntime;
  onChange: () => void;
  onReady?: () => void;
  isUpgradeOpen?: () => boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    settingsRef = useRef(settings),
    changeRef = useRef(onChange),
    readyRef = useRef(onReady),
    upgradeOpenRef = useRef(isUpgradeOpen),
    [error, setError] = useState('');
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);
  useLayoutEffect(() => {
    upgradeOpenRef.current = isUpgradeOpen;
  }, [isUpgradeOpen]);
  const mode = world.mode;
  useEffect(() => {
    if (mode === 'playing' || mode === 'transit' || mode === 'collapse' || mode === 'stopped')
      host.current?.focus({ preventScroll: true });
  }, [mode]);
  useLayoutEffect(() => {
    const previous = world.onBackgroundChange;
    const apply = (running: boolean) => {
      if (running) stage.background.resume();
      else stage.background.stop();
    };
    const backgroundState = (running: boolean) => {
      apply(running);
      previous(running);
    };
    world.onBackgroundChange = backgroundState;
    apply(world.backgroundRunning);
    return () => {
      if (world.onBackgroundChange === backgroundState) world.onBackgroundChange = previous;
      stage.background.resume();
    };
  }, [world, stage]);
  useLayoutEffect(() => {
    let cancelled = false,
      unsubscribe: (() => void) | undefined,
      releaseCapture: (() => void) | undefined,
      renderer: import('@/game/render/pixi-renderer').GameRenderer | undefined,
      input: GameInput | undefined;
    async function start() {
      const { GameRenderer } = await import('@/game/render/pixi-renderer');
      if (cancelled || !host.current) return;
      renderer = new GameRenderer(pack, true);
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
        world.onCameraMove = (x, y) => stage.background.move(x, y);
        world.hitTest = (t, x, y) => pack.hitTest(t, x, y, settingsRef.current.zoom);
        world.protectionRadius = pack.protectionRadius;
        world.displayWidth = pack.tankDisplayWidth;
        world.hitPart = (t, p, x, y) => pack.hitPart(t, p, x, y, settingsRef.current.zoom);
        world.hitProjectile = (b, x, y) => pack.hitProjectile(b, x, y, settingsRef.current.zoom);
        world.projectileBounds = (b) =>
          pack.projectileBounds(
            b,
            b.kind === 'turret' ? world.allTanks().find((t) => t.uid === b.owner) : undefined,
          );
        host.current.focus({ preventScroll: true });
        renderer.draw(world, settingsRef.current);
        releaseCapture = stage.capture.register({
          order: 0,
          base: true,
          prepare: () => renderer!.draw(world, settingsRef.current),
          draw: (context) => renderer!.capture(context),
        });
        readyRef.current?.();
        let lastRevision = -1;
        unsubscribe = stage.subscribe({
          elapsed: (elapsed) => world.advanceTime(elapsed),
          mainStep: () => {
            world.viewZoom = settingsRef.current.zoom;
            world.screenShake = settingsRef.current.shake;
            // Choose once at entry: a newly born menu does not interrupt this World.Run.
            if (upgradeOpenRef.current?.()) world.advanceArtwork();
            else world.step(input!.frame(), 0, false);
            audio?.playEvents(world.drainEvents(), settingsRef.current);
          },
          draw: () => {
            renderer!.draw(world, settingsRef.current);
            if (world.revision !== lastRevision) {
              lastRevision = world.revision;
              changeRef.current();
            }
          },
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Graphics could not start.');
      }
    }
    void start();
    return () => {
      cancelled = true;
      releaseCapture?.();
      unsubscribe?.();
      input?.dispose();
      world.onCameraMove = () => {};
      if (renderer?.app.renderer) renderer.destroy();
    };
  }, [world, pack, audio, stage]);
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
