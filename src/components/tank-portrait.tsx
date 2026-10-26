'use client';
import { useEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { Tank } from '@/game/core/types';

/** A frozen copy of the current live pose, at the original scale, above the blurred field. */
export function TankPortrait({ pack, tank }: { pack: AssetPack; tank: Tank }) {
  const host = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const release = () => {
      const cleanup = dispose;
      dispose = undefined;
      cleanup?.();
    };
    async function render() {
      const [{ Application }, { TankView }, { SwfTextures }] = await Promise.all([
        import('pixi.js'),
        import('@/game/render/tank-view'),
        import('@/game/render/swf-textures'),
      ]);
      if (cancelled) return;
      const app = new Application(),
        textures = new SwfTextures();
      await app.init({
        width: 550,
        height: 450,
        resolution: 2,
        backgroundAlpha: 0,
        antialias: true,
        autoStart: false,
        preference: 'webgl',
        powerPreference: 'low-power',
        preserveDrawingBuffer: true,
      });
      const view = new TankView(tank.design, pack, textures);
      dispose = () => {
        view.destroy();
        app.destroy({ removeView: true }, { children: true });
        textures.destroy();
      };
      if (cancelled) {
        release();
        return;
      }
      app.canvas.setAttribute('aria-hidden', 'true');
      app.canvas.style.width = '550px';
      app.canvas.style.height = '450px';
      host.current?.appendChild(app.canvas);
      view.container.position.set(275, 225);
      view.update(tank);
      app.stage.addChild(view.container);
      app.render();
    }
    void render().catch(() => {
      release();
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
      release();
    };
  }, [pack, tank]);
  return (
    <span
      ref={host}
      className="tank-portrait"
      aria-label={`${tank.design.name} current appearance`}
      role="img"
    >
      {error ? <span role="alert">Tank preview could not start.</span> : null}
    </span>
  );
}
