'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { Tank } from '@/game/core/types';
import { TANK_INFO, TankInfoMotion, tankInfoFields } from '@/game/core/tank-info';
import { BubbleText, Dialog } from './ui';
import { TankPortrait } from './tank-portrait';
import type { StageRuntime } from '@/game/services/stage-runtime';

export function TankInfoPanel({
  pack,
  tank,
  fps,
  onClose,
  onExitStart,
  phase,
  embedded = false,
  stage,
  frozen = false,
}: {
  pack: AssetPack;
  tank: Tank;
  fps: number;
  onClose: () => void;
  onExitStart?: () => void;
  phase?: 'closed' | 'open' | 'closing';
  embedded?: boolean;
  stage?: StageRuntime;
  frozen?: boolean;
}) {
  const [motion] = useState(() => new TankInfoMotion());
  const [startedExit, setStartedExit] = useState(false);
  const closing = phase ? phase !== 'open' : startedExit;
  const nodes = useRef(new Map<string, HTMLElement>());
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useLayoutEffect(() => {
    if (phase) motion.exiting = phase !== 'open';
  }, [phase, motion]);
  useEffect(() => {
    const paint = () => {
      for (const [name, node] of nodes.current) {
        const p = motion.positions[name];
        node.style.transform = `translate(${p.x}px,${p.y}px)`;
      }
      if (motion.finished) closeRef.current();
    };
    if (stage)
      return stage.subscribe({
        beforeStep: () => {
          if (!frozen) motion.advance();
        },
        draw: paint,
      });
    let frame = 0,
      last = performance.now(),
      accumulator = 0;
    const tick = (now: number) => {
      accumulator += Math.min(100, now - last);
      last = now;
      while (accumulator >= 1000 / fps) {
        if (!frozen) motion.advance();
        accumulator -= 1000 / fps;
      }
      paint();
      if (motion.finished) {
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fps, motion, stage, frozen]);
  const exit = () => {
    motion.exiting = true;
    setStartedExit(true);
    onExitStart?.();
  };
  const fields = tankInfoFields(tank.design);
  const content = (
    <>
      <dl className="sr-only">
        {Object.entries(fields).map(([name, value]) => (
          <div key={name}>
            <dt>{name.replace('txt', '').replace('_txt', '')}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {TANK_INFO.pieces.map((piece) => {
        const button = piece.name === 'btnBack_mc',
          image = piece.name === 'TankImage_mc';
        const p = motion.positions[piece.name];
        return (
          <div
            key={piece.name}
            className="tank-info-piece"
            data-info-piece={piece.name}
            ref={(node) => {
              if (node) nodes.current.set(piece.name, node);
              else nodes.current.delete(piece.name);
            }}
            style={{ transform: `translate(${p.x}px,${p.y}px)` }}
          >
            {!image && !button ? <MockInfoPiece name={piece.name} /> : null}
            {piece.fields.map((field) => (
              <InfoText key={field.name} field={field} text={fields[field.name]} />
            ))}
            {image && !closing ? <TankPortrait tank={tank} pack={pack} stage={stage} /> : null}
            {button ? (
              <button
                className="tank-info-back"
                disabled={closing}
                aria-label="BACK"
                onClick={exit}
                style={{
                  left: piece.bounds.x,
                  top: piece.bounds.y,
                  width: piece.bounds.width,
                  height: piece.bounds.height,
                }}
              >
                BACK
              </button>
            ) : null}
          </div>
        );
      })}
    </>
  );
  return embedded ? (
    <div className="tank-info-screen" inert={closing} aria-hidden={phase === 'closed'}>
      {content}
    </div>
  ) : (
    <Dialog title="Tank information" className="stage-dialog tank-info-screen" onClose={exit}>
      {content}
    </Dialog>
  );
}

function InfoText({
  field,
  text,
}: {
  field: (typeof TANK_INFO.pieces)[number]['fields'][number];
  text: string;
}) {
  return (
    <span
      className="tank-info-field"
      aria-hidden="true"
      style={{
        left: field.x,
        top: field.y,
        width: field.width,
        height: field.height,
        fontSize: field.size,
      }}
    >
      {text}
    </span>
  );
}

function MockInfoPiece({ name }: { name: string }) {
  if (name === 'Title_mc')
    return (
      <span className="tank-info-title">
        <BubbleText size={36}>tank information</BubbleText>
      </span>
    );
  if (name === 'ClassHealth_mc')
    return (
      <div className="tank-info-attributes">
        {['Class', 'Speed', 'Armor'].map((label, i) => (
          <span key={label} style={{ left: 49 + i * 133 }}>
            <b>{label}</b>
            <i>{['□', '➜', '⬟'][i]}</i>
          </span>
        ))}
      </div>
    );
  return (
    <strong className="tank-info-category">
      {name === 'PrimaryWeapons_mc'
        ? 'Primary'
        : name === 'SecondaryWeapons_mc'
          ? 'Secondary'
          : 'Passive'}{' '}
      Weapons:
    </strong>
  );
}
