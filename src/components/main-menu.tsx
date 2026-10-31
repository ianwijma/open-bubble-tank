'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { MAIN_MENU, type MainMenuMotion } from '@/game/core/main-menu';
import type { StageRuntime } from '@/game/services/stage-runtime';
import type { MainMenuView } from '@/game/render/main-menu-view';
import { BubbleText, Icon } from './ui';
import { MENU_SERIES, SERIES_CONTROLS, type SeriesControl } from '@/game/core/menu-series';
import { MockMenuSeriesView } from '@/game/render/mock-menu-series-view';
import { legacyWebsites, type LegacyWebsites } from '@/game/services/extensions';
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
    name: 'credits_btn',
    label: 'Credits',
    hint: 'Credits',
    css: 'credits',
    icon: 'file',
    size: 21,
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
  websites = legacyWebsites,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  motion: MainMenuMotion;
  covered: boolean;
  overlayRoot: RefObject<HTMLFieldSetElement | null>;
  onAction: (name: (typeof controls)[number]['name']) => void;
  websites?: LegacyWebsites;
}) {
  const root = useRef<HTMLDivElement>(null),
    canvasHost = useRef<HTMLDivElement>(null),
    buttons = useRef<HTMLDivElement>(null),
    title = useRef<HTMLDivElement>(null),
    native = useRef<MainMenuView | null>(null),
    isCovered = useRef(covered);
  const seriesRoot = useRef<HTMLDivElement>(null),
    seriesHost = useRef<HTMLDivElement>(null),
    seriesButtons = useRef(new Map<string, HTMLButtonElement>()),
    mockSeries = useRef<MockMenuSeriesView | null>(null),
    redraw = useRef<() => void>(() => {});
  const pointer = useRef<MenuPointer | null>(null),
    callbacks = useRef({ onAction, websites });
  const [seriesMessage, setSeriesMessage] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    isCovered.current = covered;
  }, [covered]);
  useEffect(() => {
    callbacks.current = { onAction, websites };
  }, [onAction, websites]);
  const activate = (target: MenuTarget) => {
    if (motion.busy || motion.parked || isCovered.current) return;
    if (target.kind === 'control') {
      const control = controls.find((c) => c.name === target.name);
      if (control) callbacks.current.onAction(control.name);
    } else if (target.kind === 'series' && target.name) {
      try {
        callbacks.current.websites.open(SERIES_CONTROLS[target.name].destination);
      } catch (error) {
        setSeriesMessage(
          error instanceof Error ? error.message : 'This game website is not connected.',
        );
      }
    }
  };
  useEffect(() => {
    let cancelled = false,
      dispose: (() => void) | undefined;
    const release = () => {
      const cleanup = dispose;
      dispose = undefined;
      cleanup?.();
    };
    const input = new MenuPointer(root.current!, {
      enabled: () => !motion.parked && !isCovered.current,
      pick: (point) =>
        pack.mode === 'mock' ? mockMenuTarget(point, motion) : native.current?.hit(point, motion),
      hover: (target, previous) => {
        if (previous?.kind === 'control') native.current?.hover(previous.name, false);
        if (previous?.kind === 'series') motion.series.hover(false);
        if (target?.kind === 'control') native.current?.hover(target.name, true);
        if (target?.kind === 'series') motion.series.hover(true);
        const label =
          target?.kind === 'control'
            ? controls.find((c) => c.name === target.name)?.hint
            : target?.kind === 'series'
              ? target.name
                ? SERIES_CONTROLS[target.name].label
                : 'More Bubbletanks Games'
              : '';
        setSeriesMessage(label ?? '');
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
      const series = seriesRoot.current!;
      series.dataset.seriesFrame = String(motion.series.pose.frame);
      series.inert = motion.parked || isCovered.current;
      series.style.left = `${motion.parked ? -100 : MAIN_MENU.series.matrix.tx / 20}px`;
      series.style.top = `${motion.parked ? -100 : MAIN_MENU.series.matrix.ty / 20}px`;
      series.style.width = `${motion.series.width}px`;
      series.style.opacity = String(Math.max(0, Math.min(1, motion.controlAlpha)));
      for (const [name, button] of seriesButtons.current)
        button.hidden = !motion.series.activeControls.includes(name as SeriesControl);
      mockSeries.current?.draw(motion.series);
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
      if (pack.mode === 'mock') {
        const view = new MockMenuSeriesView();
        mockSeries.current = view;
        seriesHost.current!.appendChild(view.canvas);
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
          mockSeries.current = null;
          view.canvas.remove();
        };
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
        if (input.refresh()) view.update(motion);
        root.current!.dataset.titleFrame = String(view.titleFrame);
        app.render();
        present();
      };
      const unsubscribe = stage.subscribe({ beforeStep: () => motion.advance(), draw });
      redraw.current = draw;
      dispose = () => {
        unsubscribe();
        native.current = null;
        redraw.current = () => {};
        view.destroy();
        app.destroy({ removeView: true }, { children: true });
        textures.destroy();
      };
      draw();
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
  const caption = MAIN_MENU.rollover,
    captionFont = caption.font;
  const captionSvg =
    seriesMessage &&
    pack.textSvg(
      seriesMessage,
      captionFont.size,
      '#fff',
      captionFont.name,
      captionFont.letterSpacing,
    );
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
              onFocus={(event) => {
                if (event.currentTarget.matches(':focus-visible'))
                  pointer.current?.focus({ kind: 'control', name: control.name });
              }}
              onBlur={() => pointer.current?.blur()}
              onClick={(event) => {
                if (event.detail === 0) activate({ kind: 'control', name: control.name });
              }}
            >
              {pack.mode === 'mock' ? <Icon name={control.icon} size={control.size} /> : null}
            </button>
          );
        })}
      </div>
      <div
        ref={seriesRoot}
        className="main-menu-series"
        role="group"
        aria-label="More Bubbletanks Games"
        tabIndex={0}
        style={{ left: -100, top: -100, width: 131, opacity: 0 }}
        onFocusCapture={(event) => {
          if (event.target === event.currentTarget && event.currentTarget.matches(':focus-visible'))
            pointer.current?.focus({ kind: 'series' });
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) pointer.current?.blur();
        }}
        inert
      >
        <div ref={seriesHost} className="menu-series-art" />
        {MENU_SERIES.controls.map((piece) => {
          const name = piece.name as SeriesControl,
            control = SERIES_CONTROLS[name];
          return (
            <button
              key={name}
              ref={(node) => {
                if (node) seriesButtons.current.set(name, node);
                else seriesButtons.current.delete(name);
              }}
              hidden
              aria-label={control.label}
              style={{
                left: piece.matrix.tx / 20 + piece.bounds.x,
                top: piece.matrix.ty / 20 + piece.bounds.y,
                width: piece.bounds.width,
                height: piece.bounds.height,
              }}
              onFocus={(event) => {
                if (event.currentTarget.matches(':focus-visible'))
                  pointer.current?.focus({ kind: 'series', name });
              }}
              onClick={(event) => {
                if (event.detail === 0) activate({ kind: 'series', name });
              }}
            />
          );
        })}
      </div>
      <p
        className="menu-series-caption"
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
          letterSpacing: captionFont.letterSpacing,
          opacity: (captionFont.color[3] ?? 255) / 255,
        }}
      >
        <span className="sr-only">{seriesMessage}</span>
        {captionSvg ? (
          <img
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ height: captionFont.size * 1.4 }}
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(captionSvg)}`}
          />
        ) : (
          <span aria-hidden="true">{seriesMessage}</span>
        )}
      </p>
      {error ? <span role="alert">Menu artwork could not start.</span> : null}
    </div>
  );
}
