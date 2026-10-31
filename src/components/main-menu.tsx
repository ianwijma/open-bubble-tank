'use client';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { MAIN_MENU, type MainMenuMotion } from '@/game/core/main-menu';
import type { StageRuntime } from '@/game/services/stage-runtime';
import type { MainMenuView } from '@/game/render/main-menu-view';
import { BubbleText, Icon } from './ui';

const controls = [
  { name: 'play_btn', label: 'Play', caption: 'PLAY', css: 'play', icon: 'play', size: 78 },
  {
    name: 'settings_btn',
    label: 'Settings',
    caption: 'SETTINGS',
    css: 'settings',
    icon: 'settings',
    size: 21,
  },
  {
    name: 'partsPacks_btn',
    label: 'My tanks',
    caption: 'MY TANKS',
    css: 'library',
    icon: 'plus',
    size: 28,
  },
  {
    name: 'credits_btn',
    label: 'Credits',
    caption: 'CREDITS',
    css: 'credits',
    icon: 'file',
    size: 21,
  },
  {
    name: 'enemyCreator_btn',
    label: 'Enemy tank creator',
    caption: 'CREATE A TANK',
    css: 'create',
    icon: 'library',
    size: 26,
  },
  {
    name: 'pmg_btn',
    label: 'Change assets',
    caption: 'CHANGE ASSETS',
    css: 'assets',
    icon: 'back',
    size: 20,
  },
] as const;

export function MainMenu({
  pack,
  stage,
  motion,
  covered,
  overlayRoot,
  onAction,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  motion: MainMenuMotion;
  covered: boolean;
  overlayRoot: RefObject<HTMLFieldSetElement | null>;
  onAction: (name: (typeof controls)[number]['name']) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    canvasHost = useRef<HTMLDivElement>(null),
    buttons = useRef<HTMLDivElement>(null),
    title = useRef<HTMLDivElement>(null),
    native = useRef<MainMenuView | null>(null),
    isCovered = useRef(covered);
  const [error, setError] = useState(false);
  useLayoutEffect(() => {
    isCovered.current = covered;
  }, [covered]);
  useLayoutEffect(() => {
    let cancelled = false,
      dispose: (() => void) | undefined;
    const release = () => {
      const cleanup = dispose;
      dispose = undefined;
      cleanup?.();
    };
    const present = () => {
      if (!root.current || !buttons.current) return;
      root.current.dataset.menuAge = String(motion.age);
      root.current.dataset.menuParked = String(motion.parked);
      root.current.dataset.menuBusy = String(motion.busy);
      root.current.dataset.controlAlpha = String(motion.controlAlpha);
      root.current.dataset.titleAlpha = String(motion.titleAlpha);
      buttons.current.inert = motion.parked || isCovered.current;
      for (const [index, piece] of MAIN_MENU.controls.entries()) {
        const node = buttons.current.children[index] as HTMLElement,
          m = piece.matrix;
        node.style.left = `${(motion.parked ? -100 : m.tx / 20) + piece.bounds.x * m.a}px`;
        node.style.top = `${(motion.parked ? -100 : m.ty / 20) + piece.bounds.y * m.d}px`;
        node.style.opacity = String(Math.max(0, Math.min(1, motion.controlAlpha)));
      }
      if (title.current)
        title.current.style.opacity = String(Math.max(0, Math.min(1, motion.titleAlpha)));
      if (overlayRoot.current) {
        const wasBlocked = overlayRoot.current.disabled;
        overlayRoot.current.disabled = motion.busy;
        overlayRoot.current.dataset.menuBusy = String(motion.busy);
        if (
          wasBlocked &&
          !motion.busy &&
          isCovered.current &&
          !overlayRoot.current.contains(document.activeElement)
        )
          overlayRoot.current.querySelector<HTMLElement>('[role="dialog"]')?.focus();
      }
    };
    async function start() {
      if (pack.mode === 'mock') {
        present();
        dispose = stage.subscribe({ beforeStep: () => motion.advance(), draw: present });
        return;
      }
      const [{ Application }, { MainMenuView }, { SwfTextures }] = await Promise.all([
        import('pixi.js'),
        import('@/game/render/main-menu-view'),
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
      const view = new MainMenuView(pack, textures);
      native.current = view;
      app.stage.addChild(view.root);
      app.canvas.setAttribute('aria-hidden', 'true');
      canvasHost.current?.appendChild(app.canvas);
      const draw = () => {
        view.update(motion);
        root.current!.dataset.titleFrame = String(view.titleFrame);
        app.render();
        present();
      };
      const unsubscribe = stage.subscribe({ beforeStep: () => motion.advance(), draw });
      dispose = () => {
        unsubscribe();
        native.current = null;
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
      release();
    };
  }, [pack, stage, motion, overlayRoot]);
  return (
    <div ref={root} className="main-menu stage-background" data-assets={pack.mode}>
      <div className="menu-guest">
        <span aria-hidden="true">×</span> Playing as Guest
      </div>
      <span className="menu-version">OPEN · 0.1</span>
      {pack.mode === 'mock' ? (
        <>
          <div ref={title} className="menu-title">
            <BubbleText pack={pack} size={57}>
              bubble tanks 3
            </BubbleText>
          </div>
        </>
      ) : (
        <div ref={canvasHost} className="main-menu-art" role="img" aria-label="Bubble Tanks 3" />
      )}
      <div ref={buttons} className="main-menu-controls" inert>
        {controls.map((control, index) => {
          const piece = MAIN_MENU.controls[index];
          return (
            <button
              key={control.name}
              className={`menu-orb menu-${control.css}`}
              aria-label={control.label}
              data-menu-control={control.name}
              style={{
                left: -100,
                top: -100,
                opacity: 0,
                width: piece.bounds.width * piece.matrix.a,
                height: piece.bounds.height * piece.matrix.d,
              }}
              onMouseEnter={() => native.current?.hover(control.name, true)}
              onMouseLeave={() => native.current?.hover(control.name, false)}
              onFocus={() => native.current?.hover(control.name, true)}
              onBlur={() => native.current?.hover(control.name, false)}
              onClick={() => onAction(control.name)}
            >
              {pack.mode === 'mock' ? <Icon name={control.icon} size={control.size} /> : null}
              <span className="orb-caption">{control.caption}</span>
            </button>
          );
        })}
      </div>
      {error ? <span role="alert">Menu artwork could not start.</span> : null}
    </div>
  );
}
