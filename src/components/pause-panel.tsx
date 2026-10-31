'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { Tank, Settings } from '@/game/core/types';
import type { StageRuntime } from '@/game/services/stage-runtime';
import { PAUSE, PauseMotion } from '@/game/core/pause-motion';
import { BubbleText, Dialog, Icon } from './ui';
import { TankInfoPanel } from './tank-info-panel';
import { PauseBackdrop } from './pause-backdrop';
import { SettingsPanel } from './settings-panel';

const buttons = [
  {
    name: 'btnPlay_mc',
    label: 'PLAY',
    caption: 'Continue Playing',
    icon: 'play',
    action: 'resume',
  },
  { name: 'btn3_mc', label: 'Main menu', caption: 'Quit Playing', icon: 'quit', action: 'menu' },
  {
    name: 'btn5_mc',
    label: 'Tank info',
    caption: 'Tank Information',
    icon: 'info',
    action: 'info',
  },
  {
    name: 'btnSettings_mc',
    label: 'Settings',
    caption: 'Settings',
    icon: 'settings',
    action: 'settings',
  },
] as const;

/** One retained source button layer, shared alpha and stage clock for pause and Info. */
export function PausePanel({
  pack,
  tank,
  stage,
  fps,
  closeKey,
  onResume,
  onSettings,
  onMenu,
  covered = false,
  settings,
  onSettingsChange,
  onSettingsClose,
}: {
  pack: AssetPack;
  tank: Tank;
  stage: StageRuntime;
  fps: number;
  closeKey: string;
  onResume: () => void;
  onSettings: () => void;
  onMenu: () => void;
  covered?: boolean;
  settings: Settings;
  onSettingsChange: (settings: Settings, control?: 'shake' | 'efficiency') => void;
  onSettingsClose: () => void;
}) {
  const [motion] = useState(() => new PauseMotion());
  const [info, setInfo] = useState<'closed' | 'open' | 'closing'>('closed');
  const [settingsFrozen, setSettingsFrozen] = useState(false);
  const [infoFrozen, setInfoFrozen] = useState(false);
  const [settingsHotkeys, setSettingsHotkeys] = useState(false);
  const settingsControls = useRef<{ back: () => void }>(null);
  const [closing, setClosing] = useState(false);
  const [caption, setCaption] = useState('');
  const [hovered, setHovered] = useState('');
  const nodes = useRef(new Map<string, HTMLElement>());
  const layer = useRef<HTMLDivElement>(null);
  const resumeRef = useRef(onResume);
  const infoSeen = useRef(false),
    resumeSent = useRef(false);
  useLayoutEffect(() => {
    resumeRef.current = onResume;
  }, [onResume]);
  useLayoutEffect(() => {
    if (!closing) motion.phase = covered || info === 'open' ? 'info' : 'menu';
  }, [covered, closing, info, motion]);
  useLayoutEffect(() => {
    if (!covered) (layer.current?.closest('[role="dialog"]') as HTMLElement | null)?.focus();
  }, [covered]);
  useLayoutEffect(() => {
    if (info !== 'closed')
      (layer.current?.closest('[role="dialog"]') as HTMLElement | null)?.focus();
  }, [info]);
  useLayoutEffect(
    () =>
      stage.subscribe({
        beforeStep: () => motion.advance(),
        draw: () => {
          if (layer.current) {
            layer.current.style.opacity = String(motion.layerAlpha);
            layer.current.dataset.pauseAge = String(motion.age);
            layer.current.dataset.pausePhase = motion.phase;
          }
          for (const [name, node] of nodes.current) {
            const p = motion.positions[name],
              piece = PAUSE.pieces.find((piece) => piece.name === name)!;
            node.style.transform = `translate(${p.x}px,${p.y}px) scale(${motion.scales[name]}) translate(${piece.bounds.x}px,${piece.bounds.y}px)`;
            node.style.opacity = String(
              name === 'btnPlay_mc'
                ? motion.playAlpha
                : name === 'Paused_mc'
                  ? motion.titleAlpha
                  : 1,
            );
          }
          if (motion.finished && !resumeSent.current) {
            resumeSent.current = true;
            resumeRef.current();
          }
        },
      }),
    [motion, stage],
  );
  const close = () => {
    if (closing) return;
    if (covered) {
      settingsControls.current?.back();
      return;
    }
    if (info === 'open') {
      motion.phase = 'menu';
      setInfo('closing');
    } else {
      motion.phase = 'closing';
      setClosing(true);
    }
  };
  const resume = () => {
    if (covered) onSettingsClose();
    motion.phase = 'closing';
    setClosing(true);
  };
  const hover = (name = '', text = '') => {
    motion.hovered = name;
    setHovered(name);
    setCaption(text);
  };
  const title = PAUSE.pieces.find((piece) => piece.name === 'Paused_mc')!;
  const titleRaster = pack.uiFrames.get(title.symbol)?.[0];
  const pieceStyle = (piece: typeof title) => {
    const p = motion.positions[piece.name];
    return {
      left: 0,
      top: 0,
      width: piece.bounds.width,
      height: piece.bounds.height,
      transformOrigin: '0 0',
      transform: `translate(${p.x}px,${p.y}px) scale(${motion.scales[piece.name]}) translate(${piece.bounds.x}px,${piece.bounds.y}px)`,
    };
  };
  return (
    <Dialog
      title={covered ? 'Settings' : info === 'open' ? 'Tank information' : 'Paused'}
      className="stage-dialog pause-screen"
      closeKey={covered && settingsHotkeys ? undefined : closeKey}
      onClose={close}
      onShortcutClose={resume}
      scrimClassName="pause-bitmap-scrim"
    >
      <PauseBackdrop stage={stage} motion={motion} />
      <div
        ref={layer}
        className="pause-button-layer"
        inert={closing}
        style={{ opacity: motion.layerAlpha }}
        data-pause-age={motion.age}
        data-pause-phase={motion.phase}
      >
        <div
          data-pause-main
          inert={covered || info === 'open' || closing}
          aria-hidden={covered || info === 'open' || closing}
        >
          <div
            className="pause-title"
            ref={(node) => {
              if (node) nodes.current.set(title.name, node);
              else nodes.current.delete(title.name);
            }}
            style={pieceStyle(title)}
          >
            {titleRaster ? (
              <img
                alt="paused"
                src={titleRaster.url}
                style={{
                  position: 'absolute',
                  left: titleRaster.x - title.bounds.x,
                  top: titleRaster.y - title.bounds.y,
                  width: titleRaster.width,
                  height: titleRaster.height,
                }}
              />
            ) : (
              <BubbleText pack={pack} size={40}>
                paused
              </BubbleText>
            )}
          </div>
          {buttons.map((button) => {
            const piece = PAUSE.pieces.find((piece) => piece.name === button.name)!;
            const raster = pack.uiFrames.get(piece.symbol)?.[hovered === button.name ? 1 : 0];
            return (
              <button
                key={button.name}
                className="pause-orb"
                aria-label={button.label}
                data-pause-piece={button.name}
                style={pieceStyle(piece)}
                ref={(node) => {
                  if (node) nodes.current.set(button.name, node);
                  else nodes.current.delete(button.name);
                }}
                onPointerEnter={() => hover(button.name, button.caption)}
                onPointerLeave={() => hover()}
                onFocus={() => hover(button.name, button.caption)}
                onBlur={() => hover()}
                onClick={() => {
                  hover();
                  if (button.action === 'resume') close();
                  else if (button.action === 'info') {
                    setSettingsFrozen(true);
                    setInfoFrozen(false);
                    infoSeen.current = true;
                    motion.phase = 'info';
                    setInfo('open');
                  } else if (button.action === 'settings') {
                    setSettingsFrozen(false);
                    setInfoFrozen(true);
                    onSettings();
                  } else onMenu();
                }}
              >
                {raster ? (
                  <img
                    src={raster.url}
                    alt=""
                    style={{
                      position: 'absolute',
                      left: raster.x - piece.bounds.x,
                      top: raster.y - piece.bounds.y,
                      width: raster.width,
                      height: raster.height,
                    }}
                  />
                ) : (
                  <Icon name={button.icon} size={20} />
                )}
              </button>
            );
          })}
          <div className="pause-caption" aria-live="polite">
            <BubbleText pack={pack} font="Accidental Presidency" size={17}>
              {caption || ' '}
            </BubbleText>
          </div>
        </div>
        <SettingsPanel
          pack={pack}
          settings={settings}
          stage={stage}
          overPause
          embedded
          controller={settingsControls}
          onHotkeysChange={setSettingsHotkeys}
          active={covered}
          frozen={closing || settingsFrozen}
          onChange={onSettingsChange}
          onClose={onSettingsClose}
        />
        <TankInfoPanel
          pack={pack}
          tank={tank}
          fps={fps}
          stage={stage}
          embedded
          frozen={closing || infoFrozen || !infoSeen.current}
          phase={info}
          onExitStart={() => {
            motion.phase = 'menu';
            setInfo('closing');
          }}
          onClose={() => {
            if (info === 'closing') setInfo('closed');
          }}
        />
      </div>
    </Dialog>
  );
}
