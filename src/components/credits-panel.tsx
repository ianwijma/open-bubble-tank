'use client';
import { useEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { StageRuntime } from '@/game/services/stage-runtime';
import {
  CREDITS,
  CREDIT_CONTROLS,
  CreditsMotion,
  creditCopy,
  type CreditControl,
} from '@/game/core/credits-screen';
import {
  legacyWebsites,
  type LegacyWebsites,
  type CreditWebsite,
} from '@/game/services/extensions';
import { Dialog } from './ui';

/** Authored Credits592 in either asset mode, sharing the menu's running stage. */
export function CreditsPanel({
  pack,
  stage,
  onClose,
  websites = legacyWebsites,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  onClose: () => void;
  websites?: LegacyWebsites;
}) {
  const host = useRef<HTMLDivElement>(null),
    pane = useRef<HTMLDivElement>(null);
  const [motion] = useState(() => new CreditsMotion(pack));
  const [message, setMessage] = useState(''),
    [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false,
      dispose: (() => void) | undefined;
    const release = () => {
      const cleanup = dispose;
      dispose = undefined;
      cleanup?.();
    };
    const present = () => {
      if (!pane.current) return;
      pane.current.dataset.creditsFrame = String(motion.pose.frame);
      pane.current.dataset.creditsAlpha = String(
        motion.pose.children.get(1)?.placement.color?.mult[3] ?? 1,
      );
      pane.current.dataset.backFrame = String(motion.pose.children.get(1)?.clip.frame);
    };
    const unsubscribe = stage.subscribe({ beforeStep: () => motion.advance(), draw: present });
    present();
    async function start() {
      const [{ Application }, { SwfSymbolView }, { SwfTextures }] = await Promise.all([
        import('pixi.js'),
        import('@/game/render/swf-symbol-view'),
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
      });
      if (cancelled) {
        app.destroy({ removeView: true }, { children: true });
        textures.destroy();
        return;
      }
      dispose = () => {
        app.destroy({ removeView: true }, { children: true });
        textures.destroy();
      };
      const view = new SwfSymbolView(CREDITS.symbol, pack, textures);
      app.stage.addChild(view.root);
      app.canvas.setAttribute('aria-hidden', 'true');
      host.current?.appendChild(app.canvas);
      const draw = () => {
        view.updatePose(motion.pose);
        app.render();
      };
      const releaseDraw = stage.subscribe({ draw });
      dispose = () => {
        releaseDraw();
        view.destroy();
        app.destroy({ removeView: true }, { children: true });
        textures.destroy();
      };
      draw();
    }
    void start().catch(() => {
      release();
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
      unsubscribe();
      release();
    };
  }, [pack, stage, motion]);
  const click = (name: CreditControl) => {
    if (name === 'back_btn') {
      onClose();
      return;
    }
    const destination: CreditWebsite =
      name === 'hero_link' ? 'studio' : name === 'composer_link' ? 'composer' : 'social';
    try {
      websites.open(destination);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'This website link is not connected.');
    }
  };
  return (
    <Dialog title="Credits" className="stage-dialog credits-screen" onClose={onClose}>
      <div ref={pane} className="credits-content">
        <div ref={host} className="credits-art" />
        <div className="sr-only">
          {CREDITS.texts
            .filter((t) => t.id !== 573)
            .map((t) => (
              <p key={t.id}>{creditCopy(t.id)}</p>
            ))}
        </div>
        {CREDITS.controls.map((control) => {
          const name = control.name as CreditControl,
            m = control.matrix,
            b = control.bounds;
          return (
            <button
              key={name}
              className="credits-control"
              aria-label={CREDIT_CONTROLS[name]}
              data-credits-control={name}
              style={{
                left: m.tx / 20 + b.x,
                top: m.ty / 20 + b.y,
                width: b.width,
                height: b.height,
              }}
              onClick={() => click(name)}
              onPointerEnter={() => motion.hover(name, true)}
              onPointerLeave={() => motion.hover(name, false)}
              onFocus={() => motion.hover(name, true)}
              onBlur={() => motion.hover(name, false)}
            />
          );
        })}
        {message ? (
          <p role="status" className="credits-link-status">
            {message}
          </p>
        ) : null}
        {error ? <p role="alert">Credits artwork could not start.</p> : null}
      </div>
    </Dialog>
  );
}
