'use client';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { MAIN_MENU, type MainMenuMotion } from '@/game/core/main-menu';
import type { StageRuntime } from '@/game/services/stage-runtime';
import { BubbleText, Icon } from './ui';
import { mockMenuTarget, type MenuTarget } from '@/game/core/menu-hit';
import { MenuPointer } from '@/game/services/menu-pointer';

const controls = [
  { name: 'play_btn', label: 'Play', hint: 'Play / Tutorial', css: 'play', icon: 'play', size: 78 },
  {
    name: 'settings_btn',
    label: 'Settings',
    hint: 'Settings',
    css: 'settings',
    icon: 'settings',
    size: 21,
  },
  {
    name: 'partsPacks_btn',
    label: 'My tanks',
    hint: 'My tanks',
    css: 'library',
    icon: 'plus',
    size: 28,
  },
  {
    name: 'enemyCreator_btn',
    label: 'Enemy tank creator',
    hint: 'Enemy Tank Creator',
    css: 'create',
    icon: 'library',
    size: 26,
  },
  {
    name: 'pmg_btn',
    label: 'Change assets',
    hint: 'Change assets',
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
    buttons = useRef<HTMLDivElement>(null),
    title = useRef<HTMLDivElement>(null),
    isCovered = useRef(covered);
  const redraw = useRef<() => void>(() => {});
  const pointer = useRef<MenuPointer | null>(null),
    callbacks = useRef({ onAction });
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  useLayoutEffect(() => {
    isCovered.current = covered;
  }, [covered]);
  useLayoutEffect(() => {
    callbacks.current = { onAction };
  }, [onAction]);
  const activate = (target: MenuTarget) => {
    // A press on any registered target clears the message before the busy guard runs.
    if (target.kind !== 'blocked') setMessage('');
    if (motion.busy || motion.parked || isCovered.current) return;
    if (target.kind === 'control') {
      const control = controls.find((c) => c.name === target.name);
      if (control) callbacks.current.onAction(control.name);
    }
  };
  useLayoutEffect(() => {
    let cancelled = false,
      dispose: (() => void) | undefined;
    const release = () => {
      const cleanup = dispose;
      dispose = undefined;
      cleanup?.();
    };
    const input = new MenuPointer(root.current!, {
      enabled: () => !motion.parked && !isCovered.current,
      pick: (point) => mockMenuTarget(point),
      hover: (target) => {
        const label =
          target?.kind === 'control' ? controls.find((c) => c.name === target.name)?.hint : '';
        setMessage(label ?? '');
      },
      release: activate,
      paint: () => redraw.current(),
    });
    pointer.current = input;
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
        node.dataset.menuHovered = String(
          input.target?.kind === 'control' && input.target.name === piece.name,
        );
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
      const draw = () => {
        input.refresh();
        present();
      };
      redraw.current = draw;
      draw();
      const unsubscribe = stage.subscribe({ beforeStep: () => motion.advance(), draw });
      dispose = () => {
        unsubscribe();
        redraw.current = () => {};
      };
    }
    void start().catch(() => {
      release();
      input.dispose();
      if (pointer.current === input) pointer.current = null;
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
      input.dispose();
      if (pointer.current === input) pointer.current = null;
      release();
    };
  }, [pack, stage, motion, overlayRoot]);
  // The caption is plain text: default tracking and an opaque color.
  const caption = MAIN_MENU.rollover,
    captionFont = caption.font;
  return (
    <div ref={root} className="main-menu stage-background" data-assets={pack.mode}>
      <div className="menu-guest">
        <span aria-hidden="true">×</span> Playing as Guest
      </div>
      <span className="menu-version">OPEN · 0.1</span>
      <div ref={title} className="menu-title">
        <BubbleText size={57}>soap tank</BubbleText>
      </div>
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
              onFocus={(event) => {
                if (event.currentTarget.matches(':focus-visible'))
                  pointer.current?.focus({ kind: 'control', name: control.name });
              }}
              onBlur={() => pointer.current?.blur()}
              onClick={(event) => {
                if (event.detail === 0) activate({ kind: 'control', name: control.name });
              }}
            >
              <Icon name={control.icon} size={control.size} />
            </button>
          );
        })}
      </div>
      <p
        className="menu-rollover-caption"
        role="status"
        style={{
          left: caption.matrix.tx / 20 + caption.bounds.x,
          top:
            caption.matrix.ty / 20 +
            caption.bounds.y +
            2 +
            captionFont.size * (captionFont.ascent / 1024 - 1),
          width: caption.bounds.width,
          height: caption.bounds.height,
          fontSize: captionFont.size,
          letterSpacing: 0,
        }}
      >
        <span className="sr-only">{message}</span>
        <span aria-hidden="true">{message}</span>
      </p>
      {error ? <span role="alert">Menu artwork could not start.</span> : null}
    </div>
  );
}
