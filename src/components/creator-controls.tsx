'use client';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { AssetPack, Raster } from '@/game/assets/asset-pack';
import type { Vec } from '@/game/core/types';
import { displayPixel } from '@/game/core/display-values';
import {
  creatorControl,
  type CreatorPrimitive,
  type CreatorSliderLayout,
} from '@/game/core/creator-controls';
const rgba = (c: number[]) => `rgba(${c.slice(0, 3).join(',')},${(c[3] ?? 255) / 255})`;
const matrix = (m: CreatorPrimitive['matrix']) =>
  `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.tx / 20} ${m.ty / 20})`;
export function CreatorPrimitives({ pieces }: { pieces: CreatorPrimitive[] }) {
  return pieces.map((p, i) => {
    const b = p.bounds,
      x = b.xMin / 20,
      y = b.yMin / 20,
      w = (b.xMax - b.xMin) / 20,
      h = (b.yMax - b.yMin) / 20;
    const style = {
      fill: p.fill ? rgba(p.fill) : 'none',
      stroke: p.stroke ? rgba(p.stroke.color) : 'none',
      strokeWidth: p.stroke?.width ?? 0,
    };
    return (
      <g key={i} transform={matrix(p.matrix)}>
        {p.kind === 'paths' ? (
          p.paths?.map((path, j) => (
            <path
              key={j}
              d={path.d}
              fill={path.fill ? rgba(path.fill) : 'none'}
              fillRule={path.rule}
              stroke={path.stroke ? rgba(path.stroke) : 'none'}
              strokeWidth={path.width}
              strokeLinecap={path.cap}
              strokeLinejoin={path.join}
            />
          ))
        ) : p.kind === 'text' && p.textLines ? (
          p.textLines.map((line, j) => (
            <text
              key={j}
              x={line.x}
              y={line.y}
              fontFamily={p.font?.startsWith('Arial') ? 'Arial, sans-serif' : 'monospace'}
              fontWeight={p.bold ? 'bold' : 'normal'}
              fontStyle={p.italic ? 'italic' : 'normal'}
              fontSize={line.size}
              textLength={line.width}
              lengthAdjust="spacingAndGlyphs"
              fill={rgba(line.color)}
            >
              {line.text}
            </text>
          ))
        ) : p.kind === 'text' ? (
          p.glyphs?.map((g, j) => (
            <text
              key={j}
              x={g.x}
              y={g.y}
              fontFamily={p.font?.startsWith('Arial') ? 'Arial, sans-serif' : 'monospace'}
              fontWeight={p.bold ? 'bold' : 'normal'}
              fontStyle={p.italic ? 'italic' : 'normal'}
              fontSize={g.size}
              fill={rgba(g.color)}
            >
              {g.text}
            </text>
          ))
        ) : p.kind === 'detail-panel' ? (
          <>
            <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} {...style} />
            <path
              d={`M${x + 4.5} ${y + 60.25}h175.75`}
              fill="none"
              stroke="white"
              strokeWidth={1}
              strokeLinecap="round"
            />
          </>
        ) : p.kind === 'detail-arrow' ? (
          <path d={`M${x + h / 2} ${y}H${x + w}v${h}H${x + h / 2}L${x} ${y + h / 2}Z`} {...style} />
        ) : p.kind === 'warning-triangle' ? (
          <path
            d={`M${x + w / 2} ${y}L${x + w} ${y + h}H${x}Z${p.innerBounds ? `M${(p.innerBounds.xMin + p.innerBounds.xMax) / 40} ${p.innerBounds.yMin / 20}L${p.innerBounds.xMin / 20} ${p.innerBounds.yMax / 20}H${p.innerBounds.xMax / 20}Z` : ''}`}
            {...style}
            fillRule="evenodd"
          />
        ) : p.kind === 'warning-mark' ? (
          <>
            <rect x={x} y={y} width={w} height={h * 0.7} {...style} />
            <ellipse cx={x + w / 2} cy={y + h - w / 2} rx={w / 2} ry={w / 2} {...style} />
          </>
        ) : p.kind === 'checked-box' ? (
          <>
            <rect x={x} y={y} width={w} height={h} {...style} />
            <path
              d={`M${x + 1} ${y + 1}l${w - 2} ${h - 2}M${x + w - 1} ${y + 1}l${2 - w} ${h - 2}`}
              fill="none"
              stroke="white"
              strokeWidth={1}
            />
          </>
        ) : p.kind === 'scroll-grip' ? (
          <>
            <rect x={x} y={y} width={w} height={h} {...style} />
            {[8, 13, 18].map((offset) => (
              <path
                key={offset}
                d={`M${x + 2.5} ${y + offset}h${w - 5}`}
                stroke="#73b2ce"
                strokeWidth={1}
                fill="none"
              />
            ))}
          </>
        ) : p.kind === 'up-arrow' ? (
          <>
            <rect x={x} y={y} width={w} height={h} {...style} />
            <path
              d={`M${x + w / 2} ${y + h * 0.22}L${x + w * 0.8} ${y + h * 0.78}H${x + w * 0.2}Z`}
              fill={style.stroke}
            />
          </>
        ) : p.kind === 'right-arrow' ? (
          <path
            d={`M${x} ${y + h * 0.3}H${x + w - h / 2}V${y}L${x + w} ${y + h / 2}L${x + w - h / 2} ${y + h}V${y + h * 0.7}H${x}Z`}
            {...style}
          />
        ) : p.kind === 'arrow' ? (
          <path d={`M${x} ${y + h / 2}L${x + w} ${y}v${h}Z`} {...style} />
        ) : (
          <rect x={x} y={y} width={w} height={h} {...style} />
        )}
      </g>
    );
  });
}
export function CreatorRasterArt({
  raster,
  offsetX = 0,
  offsetY = 0,
}: {
  raster: Raster;
  offsetX?: number;
  offsetY?: number;
}) {
  return (
    <img
      alt=""
      aria-hidden="true"
      draggable={false}
      src={raster.url}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        maxWidth: 'none',
        left: raster.x + offsetX,
        top: raster.y + offsetY,
        width: raster.width,
        height: raster.height,
      }}
    />
  );
}
export function CreatorButton({
  pack,
  name,
  label,
  disabled = false,
  checked,
  onClick,
  onKeyboardClick,
  releaseAction = false,
  onHoldStart,
  onHoldEnd,
}: {
  pack: AssetPack;
  name: string;
  label: string;
  disabled?: boolean;
  checked?: boolean;
  onClick: () => void;
  onKeyboardClick?: () => void;
  releaseAction?: boolean;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
}) {
  const p = creatorControl(name),
    b = p.bounds;
  const [state, setState] = useState<'up' | 'over' | 'down'>('up');
  const held = useRef(false),
    pressed = useRef(false);
  const frame = name === 'Undo_mc' ? (disabled ? 1 : 2) : checked === false ? 2 : 1;
  const raster = pack.creatorFrames.get(`${name}:${frame}:${state}`);
  const style: CSSProperties = {
    left: p.matrix.tx / 20,
    top: p.matrix.ty / 20,
    transform: `matrix(${p.matrix.a},${p.matrix.b},${p.matrix.c},${p.matrix.d},0,0) translate(${b.x}px,${b.y}px)`,
    transformOrigin: '0 0',
    width: b.width,
    height: b.height,
  };
  const art = raster ? (
    <CreatorRasterArt raster={raster} offsetX={-b.x} offsetY={-b.y} />
  ) : (
    <svg
      aria-hidden="true"
      viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
      width={b.width}
      height={b.height}
      style={{ overflow: 'visible' }}
    >
      <CreatorPrimitives pieces={p.variants[`${frame}:${state}`]} />
    </svg>
  );
  const events = {
    onPointerEnter: () => setState('over'),
    onPointerLeave: () => {
      setState('up');
      if (held.current) {
        held.current = false;
        onHoldEnd?.();
      }
    },
    onPointerDown: (event: React.PointerEvent) => {
      if (event.button !== 0 || disabled) return;
      setState('down');
      pressed.current = true;
      if (onHoldStart) {
        held.current = true;
        onHoldStart();
      }
    },
    onPointerUp: (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      setState('over');
      if (held.current) {
        held.current = false;
        onHoldEnd?.();
      }
      // Delete's target MOUSE_UP precedes the creator's stage release listener.
      if (releaseAction && pressed.current) {
        pressed.current = false;
        onClick();
      }
    },
    onPointerCancel: () => {
      setState('up');
      pressed.current = false;
      if (held.current) {
        held.current = false;
        onHoldEnd?.();
      }
    },
    onFocus: () => setState('over'),
    onBlur: () => setState('up'),
  };
  return checked === undefined ? (
    <button
      className="creator-control"
      data-creator-control={name}
      aria-label={label}
      disabled={disabled}
      style={style}
      {...events}
      onClick={(event) => {
        if (event.detail === 0 && onKeyboardClick) onKeyboardClick();
        else if (!releaseAction || event.detail === 0) onClick();
      }}
    >
      {art}
    </button>
  ) : (
    <label className="creator-control" data-creator-control={name} style={style} {...events}>
      {art}
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={onClick}
      />
    </label>
  );
}
export function CreatorSlider({
  pack,
  layout,
  label,
  value,
  resetKey,
  min,
  max,
  onChange,
  onBegin,
  onEnd,
  onRelease,
  disabled = false,
  coordinates,
  point,
}: {
  pack: AssetPack;
  layout: CreatorSliderLayout;
  label: string;
  value: number;
  resetKey: unknown;
  disabled?: boolean;
  coordinates?: {
    toX: (value: number) => number;
    fromX: (x: number) => number;
    min: number;
    max: number;
  };
  point?: (event: React.PointerEvent<HTMLInputElement>, handle: Vec) => Vec;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onBegin: () => void;
  onEnd: (cancel: boolean) => void;
  onRelease?: (event: React.PointerEvent<HTMLInputElement>, handle: Vec) => void;
}) {
  const [current, setCurrent] = useState(value),
    [hover, setHover] = useState(false);
  const dragging = useRef<{ value: number; cursorX: number | null } | null>(null);
  const [cursorX, setCursorX] = useState<number | null>(null);
  // Flash recomputes averages on selection changes, while a dragged handle retains its chosen value.
  useLayoutEffect(() => {
    setCurrent(value);
    setCursorX(null);
  }, [resetKey]);
  const normalized = Math.max(0, Math.min(1, (current - min) / (max - min))),
    x = cursorX ?? displayPixel(coordinates?.toX(current) ?? -57 + 114 * normalized),
    y = layout.handle.matrix.ty / 20;
  const hitRadius = Math.max(
    ...layout.handle.variants[hover ? 1 : 0].map((p) => (p.bounds.xMax - p.bounds.xMin) / 40),
  );
  const track = pack.creatorFrames.get(`${layout.name}:track`),
    handle = pack.creatorFrames.get(`handle:${hover ? 2 : 1}`);
  const change = (value: number) => {
    setCurrent(value);
    onChange(value);
  };
  const local = (e: React.PointerEvent<HTMLInputElement>) => {
    if (point) return point(e, { x, y });
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * 138) / r.width - 69,
      y: ((e.clientY - r.top) * 28) / r.height - 12,
    };
  };
  const finish = (cancel: boolean) => {
    if (dragging.current === null) return;
    if (cancel) {
      setCurrent(dragging.current.value);
      setCursorX(dragging.current.cursorX);
    }
    dragging.current = null;
    onEnd(cancel);
  };
  return (
    <div
      className="creator-transform-slider"
      data-creator-slider={layout.name}
      style={{
        left: layout.matrix.tx / 20,
        top: layout.matrix.ty / 20,
        transform: `matrix(${layout.matrix.a},${layout.matrix.b},${layout.matrix.c},${layout.matrix.d},0,0)`,
        transformOrigin: '0 0',
      }}
    >
      {track ? (
        <CreatorRasterArt raster={track} />
      ) : (
        <svg
          aria-hidden="true"
          viewBox="-65 -18 130 36"
          width="130"
          height="36"
          style={{ position: 'absolute', left: -65, top: -18, overflow: 'visible' }}
        >
          <CreatorPrimitives pieces={layout.track} />
        </svg>
      )}
      {handle ? (
        <CreatorRasterArt raster={handle} offsetX={x} offsetY={y} />
      ) : (
        <span
          className="creator-mock-handle"
          style={{ left: x - 5, top: y - 5, transform: hover ? 'scale(1.25)' : undefined }}
        />
      )}
      <input
        aria-label={label}
        type="range"
        disabled={disabled}
        min={min}
        max={max}
        step="any"
        value={current}
        onChange={(e) => {
          setCursorX(null);
          change(Number(e.target.value));
        }}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        onPointerMove={(e) => {
          if (disabled) return;
          const p = local(e);
          if (dragging.current !== null) {
            if (coordinates) {
              const raw = Math.max(coordinates.min, Math.min(coordinates.max, p.x));
              setCursorX(displayPixel(raw));
              change(coordinates.fromX(raw));
            } else {
              const raw = Math.max(-57, Math.min(57, p.x));
              setCursorX(displayPixel(raw));
              change(min + ((raw + 57) / 114) * (max - min));
            }
          } else setHover(Math.hypot(p.x - x, p.y - y) <= hitRadius);
        }}
        onPointerLeave={() => {
          if (dragging.current === null) setHover(false);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0 || disabled) return;
          e.preventDefault();
          const p = local(e);
          if (Math.hypot(p.x - x, p.y - y) > hitRadius) return;
          dragging.current = { value: current, cursorX };
          onBegin();
          e.currentTarget.setPointerCapture(e.pointerId);
          setHover(true);
        }}
        onPointerUp={(event) => {
          if (event.button === 0 && dragging.current !== null) {
            // Both source callbacks are on stage; its earlier workspace
            // listener can change selection before the transform copies it.
            onRelease?.(event, { x, y });
            finish(false);
          }
        }}
        onPointerCancel={() => finish(true)}
        onLostPointerCapture={() => finish(true)}
      />
    </div>
  );
}
