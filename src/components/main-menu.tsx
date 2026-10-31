'use client';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { MAIN_MENU, type MainMenuMotion } from '@/game/core/main-menu';
import type { StageRuntime } from '@/game/services/stage-runtime';
import type { MainMenuView } from '@/game/render/main-menu-view';
import { BubbleText, Icon } from './ui';
import { MENU_SERIES, SERIES_CONTROLS, type SeriesControl } from '@/game/core/menu-series';
import { MockMenuSeriesView } from '@/game/render/mock-menu-series-view';
import { legacyWebsites, type LegacyWebsites } from '@/game/services/extensions';

function seriesControl(target: EventTarget | null): SeriesControl | undefined {
  const name =
    target instanceof Element
      ? target.closest<HTMLElement>('[data-series-control]')?.dataset.seriesControl
      : undefined;
  return name && name in SERIES_CONTROLS ? (name as SeriesControl) : undefined;
}

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
  const [seriesMessage, setSeriesMessage] = useState('');
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
      const series = seriesRoot.current!;
      series.dataset.seriesFrame = String(motion.series.pose.frame);
      series.inert = motion.parked || isCovered.current;
      series.style.left = `${motion.parked ? -100 : MAIN_MENU.series.matrix.tx / 20}px`;
      series.style.top = `${motion.parked ? -100 : MAIN_MENU.series.matrix.ty / 20}px`;
      series.style.width = `${motion.series.width}px`;
      // Mock leaf paint applies the source multiplier before channel clamping.
      series.style.opacity = '1';
      for (const [name, button] of seriesButtons.current)
        button.hidden = !motion.series.activeControls.includes(name as SeriesControl);
      mockSeries.current?.draw(motion.series, motion.controlAlpha);
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
        const view = new MockMenuSeriesView();
        mockSeries.current = view;
        seriesHost.current!.appendChild(view.canvas);
        redraw.current = present;
        present();
        const unsubscribe = stage.subscribe({ beforeStep: () => motion.advance(), draw: present });
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
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
      release();
    };
  }, [pack, stage, motion, overlayRoot]);
  const hoverSeries = (over: boolean, target?: EventTarget | null) => {
    motion.series.hover(over);
    const name = seriesControl(target ?? null);
    setSeriesMessage(over ? (name ? SERIES_CONTROLS[name].label : 'More Bubbletanks Games') : '');
    redraw.current();
  };
  // _-Sm assigns plain TextField.text: default format has no HTML tracking or color alpha.
  const caption = MAIN_MENU.rollover,
    captionFont = caption.font;
  const captionSvg =
    seriesMessage && pack.textSvg(seriesMessage, captionFont.size, '#fff', captionFont.name);
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
              onClick={() => {
                setSeriesMessage('');
                onAction(control.name);
              }}
            >
              {pack.mode === 'mock' ? <Icon name={control.icon} size={control.size} /> : null}
              <span className="orb-caption">{control.caption}</span>
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
        onMouseOver={(event) => hoverSeries(true, event.target)}
        onMouseOut={() => hoverSeries(false)}
        onFocusCapture={(event) => hoverSeries(true, event.target)}
        onClick={(event) => {
          setSeriesMessage('');
          if (motion.busy || motion.parked || isCovered.current) return;
          const name = seriesControl(event.target);
          if (!name) return;
          try {
            websites.open(SERIES_CONTROLS[name].destination);
          } catch (error) {
            setSeriesMessage(
              error instanceof Error ? error.message : 'This game website is not connected.',
            );
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) hoverSeries(false);
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
              data-series-control={name}
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
          letterSpacing: 0,
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
