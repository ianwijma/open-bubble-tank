'use client';
import { useEffect, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { Tank } from '@/game/core/types';
import { TANK_INFO, TankInfoMotion, infoTextLines, tankInfoFields } from '@/game/core/tank-info';
import { BubbleText, Dialog } from './ui';
import { TankPortrait } from './tank-portrait';

export function TankInfoPanel({
  pack,
  tank,
  fps,
  onClose,
}: {
  pack: AssetPack;
  tank: Tank;
  fps: number;
  onClose: () => void;
}) {
  const [motion] = useState(() => new TankInfoMotion());
  const [closing, setClosing] = useState(false);
  const nodes = useRef(new Map<string, HTMLElement>());
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    let frame = 0,
      last = performance.now(),
      accumulator = 0;
    const tick = (now: number) => {
      accumulator += Math.min(100, now - last);
      last = now;
      while (accumulator >= 1000 / fps) {
        motion.advance();
        accumulator -= 1000 / fps;
      }
      for (const [name, node] of nodes.current) {
        const p = motion.positions[name];
        node.style.transform = `translate(${p.x}px,${p.y}px)`;
      }
      if (motion.finished) {
        closeRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fps, motion]);
  const exit = () => {
    motion.exiting = true;
    setClosing(true);
  };
  const fields = tankInfoFields(tank.design);
  return (
    <Dialog title="Tank information" className="stage-dialog tank-info-screen" onClose={exit}>
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
        const p = motion.positions[piece.name],
          raster = pack.uiFrames.get(piece.symbol)?.[0];
        return (
          <div
            key={piece.name}
            className="tank-info-piece"
            ref={(node) => {
              if (node) nodes.current.set(piece.name, node);
              else nodes.current.delete(piece.name);
            }}
            style={{ transform: `translate(${p.x}px,${p.y}px)` }}
          >
            {raster && !image ? (
              <img
                alt=""
                src={raster.url}
                style={{
                  left: raster.x,
                  top: raster.y,
                  width: raster.width,
                  height: raster.height,
                }}
              />
            ) : null}
            {pack.mode === 'mock' && !image && !button ? (
              <MockInfoPiece name={piece.name} pack={pack} />
            ) : null}
            {piece.fields.map((field) => (
              <InfoText key={field.name} pack={pack} field={field} text={fields[field.name]} />
            ))}
            {image && !closing ? <TankPortrait tank={tank} pack={pack} /> : null}
            {button ? (
              <button
                className={`tank-info-back ${pack.mode === 'swf' ? 'native' : ''}`}
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
                {pack.mode === 'mock' ? 'BACK' : null}
              </button>
            ) : null}
          </div>
        );
      })}
    </Dialog>
  );
}

function InfoText({
  pack,
  field,
  text,
}: {
  pack: AssetPack;
  field: (typeof TANK_INFO.pieces)[number]['fields'][number];
  text: string;
}) {
  const measure = (value: string) => {
    const svg = pack.textSvg(value, field.size, '#fff', 'Arial');
    return svg ? Number(svg.match(/width="([\d.]+)"/)?.[1]) : value.length * field.size * 0.52;
  };
  const lines = infoTextLines(text, field.width - 4, measure);
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
      {pack.mode === 'swf'
        ? lines.map((line, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: 2,
                top: 2 + field.size * (field.ascent / 1024 - 1) + i * 16,
              }}
            >
              <BubbleText pack={pack} font="Arial" size={field.size}>
                {line}
              </BubbleText>
            </span>
          ))
        : text}
    </span>
  );
}

function MockInfoPiece({ name, pack }: { name: string; pack: AssetPack }) {
  if (name === 'Title_mc')
    return (
      <span className="tank-info-title">
        <BubbleText pack={pack} size={36}>
          tank information
        </BubbleText>
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
