'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { CreatorDetailAnchor } from '@/game/core/creator-details';
import type { PartDefinition } from '@/game/core/types';
import { CREATOR_PALETTE, CreatorPaletteScroll } from '@/game/core/creator-palette';
import {
  paletteState,
  affordabilityHint,
  type PaletteContext,
} from '@/game/simulation/editor-palette';
import { CreatorPrimitives, CreatorRasterArt } from './creator-controls';
import { CreatorText } from './creator-text';

export function CreatorPaletteFrame({
  pack,
  avatar,
  category,
  onCategory,
}: {
  pack: AssetPack;
  avatar: boolean;
  category: number;
  onCategory: (category: number) => void;
}) {
  const p = CREATOR_PALETTE,
    lib = p.library,
    [hover, setHover] = useState(0),
    raster = pack.creatorFrames.get('palette:base');
  const x = p.origin.tx / 20 + lib.matrix.tx / 20,
    y = p.origin.ty / 20 + lib.matrix.ty / 20;
  return (
    <>
      <div
        className="creator-palette-backdrop"
        aria-hidden="true"
        style={{ left: x, top: y, width: lib.bounds.width, height: lib.bounds.height }}
      >
        {raster ? (
          <CreatorRasterArt raster={raster} />
        ) : (
          <>
            <span
              className="creator-mock-preview-border"
              style={{
                left: lib.preview.x + lib.preview.bounds.x - 3,
                top: lib.preview.y + lib.preview.bounds.y - 3,
                width: lib.preview.bounds.width + 6,
                height: lib.preview.bounds.height + 6,
              }}
            />
            <span
              className="creator-mock-row-border"
              style={{
                left: lib.mask.x - 3,
                top: lib.mask.y - 3,
                width: lib.mask.width + 6,
                height: lib.mask.height + 6,
              }}
            />
          </>
        )}
      </div>
      <div className="creator-palette-caption" style={{ left: x, top: y }}>
        <CreatorText pack={pack} field={lib.caption} text="Click and Drag Object" />
      </div>
      <div
        className="palette-tabs"
        role="group"
        aria-label="Part categories"
        style={{ left: p.origin.tx / 20, top: p.origin.ty / 20 }}
      >
        {p.tabs
          .filter((t) =>
            avatar ? [1, 2, 3, 5].includes(t.category) : [1, 4, 6].includes(t.category),
          )
          .map((tab) => {
            const frame = category === tab.category || hover === tab.category ? 1 : 2,
              b = tab.bounds,
              raster = pack.creatorFrames.get(`palette:${tab.name}:${frame}`);
            return (
              <button
                key={tab.category}
                aria-label={tab.label}
                aria-pressed={category === tab.category}
                className={category === tab.category ? 'active' : ''}
                style={{
                  left: tab.matrix.tx / 20 + b.x,
                  top: tab.matrix.ty / 20 + b.y,
                  width: b.width,
                  height: b.height,
                }}
                onPointerEnter={() => setHover(tab.category)}
                onPointerLeave={() => setHover(0)}
                onFocus={() => setHover(tab.category)}
                onBlur={() => setHover(0)}
                onClick={() => onCategory(tab.category)}
              >
                {raster ? (
                  <CreatorRasterArt raster={raster} offsetX={-b.x} offsetY={-b.y} />
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
                    width={b.width}
                    height={b.height}
                    style={{ overflow: 'visible' }}
                  >
                    <CreatorPrimitives pieces={tab.art[frame - 1]} />
                  </svg>
                )}
              </button>
            );
          })}
      </div>
    </>
  );
}

export function CreatorPaletteRows({
  pack,
  parts,
  context,
  chosen,
  onChoose,
  onDetails,
  detailsId,
}: {
  pack: AssetPack;
  parts: PartDefinition[];
  context: PaletteContext;
  chosen: number | null;
  onChoose: (id: number) => void;
  onDetails: (anchor: CreatorDetailAnchor | null) => void;
  detailsId: string;
}) {
  const p = CREATOR_PALETTE,
    lib = p.library;
  const portId = useId();
  const port = useRef<HTMLDivElement>(null),
    model = useRef(new CreatorPaletteScroll(parts.length)),
    [position, setPosition] = useState({ offset: 0, barY: 18, scrollTop: 0 }),
    [hover, setHover] = useState(0);
  const publish = () => {
    const m = model.current;
    onDetails(null);
    // Chromium rounds scrollTop; the content transform preserves the authored fractional offset.
    if (port.current) port.current.scrollTop = m.offset;
    setPosition({ offset: m.offset, barY: m.barY, scrollTop: port.current?.scrollTop ?? 0 });
  };
  useEffect(() => {
    const node = port.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY) {
        model.current.step(e.deltaY > 0 ? 1 : -1);
        publish();
      }
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, []);
  const step = (amount: number) => {
    model.current.step(amount);
    publish();
  };
  const drag = (y: number) => {
    model.current.drag(y);
    publish();
  };
  const nameField = p.row.fields.find((f) => f.name === 'name_txt')!,
    costField = p.row.fields.find((f) => f.name === 'cost_txt')!;
  return (
    <>
      <div
        ref={port}
        id={portId}
        className="part-palette"
        role="group"
        aria-label="Parts palette"
        style={{
          left: p.origin.tx / 20 + lib.matrix.tx / 20 + lib.mask.x,
          top: p.origin.ty / 20 + lib.matrix.ty / 20 + lib.mask.y,
          width: lib.mask.width,
          height: lib.mask.height,
        }}
        onScroll={(e) => {
          const top = e.currentTarget.scrollTop;
          if (Math.abs(top - model.current.offset) <= 0.5) return;
          model.current.scrollTo(top);
          publish();
        }}
      >
        <div
          style={{
            position: 'relative',
            height: lib.mask.height + model.current.extent,
            transform: `translateY(${position.scrollTop - position.offset}px)`,
          }}
        >
          {parts.map((part, index) => {
            const state = paletteState(part, context),
              selected = chosen === part.id,
              frame = state.locked ? 4 : selected ? 3 : hover === part.id ? 2 : 1,
              body = part.id < 2000,
              code = p.row.codes[part.id] ?? 1,
              raster = pack.creatorFrames.get(`palette:row:${frame}:${Number(body)}:${code}`),
              hint = affordabilityHint(part, state.reason),
              color = p.row.states[frame - 1].color;
            return (
              <button
                key={part.id}
                disabled={state.locked}
                aria-label={
                  state.locked
                    ? `${part.name}, unlocks at level ${part.tier}`
                    : `Place ${part.name}`
                }
                aria-description={hint || undefined}
                aria-pressed={selected}
                aria-describedby={hover === part.id && !state.locked ? detailsId : undefined}
                className={`${selected ? 'selected' : ''} ${!state.affordable ? 'unaffordable' : ''}`}
                data-row-frame={frame}
                style={{
                  position: 'absolute',
                  left: lib.inside.x - lib.mask.x,
                  top: lib.inside.y - lib.mask.y + index * p.row.height,
                  width: p.row.bounds.width,
                  height: p.row.height,
                  opacity: state.locked ? 0.5 : state.affordable ? 1 : 0.4,
                }}
                onPointerEnter={() => {
                  setHover(part.id);
                  if (!state.locked)
                    onDetails({
                      id: part.id,
                      rowY:
                        p.origin.ty / 20 +
                        lib.matrix.ty / 20 +
                        lib.inside.y +
                        index * p.row.height -
                        model.current.offset,
                      alpha: state.affordable ? 1 : 0.4,
                      selected,
                    });
                }}
                onPointerLeave={() => {
                  setHover(0);
                  onDetails(null);
                }}
                onFocus={() => {
                  setHover(part.id);
                  if (!state.locked)
                    onDetails({
                      id: part.id,
                      rowY:
                        p.origin.ty / 20 +
                        lib.matrix.ty / 20 +
                        lib.inside.y +
                        index * p.row.height -
                        model.current.offset,
                      alpha: state.affordable ? 1 : 0.4,
                      selected,
                    });
                }}
                onBlur={() => {
                  setHover(0);
                  onDetails(null);
                }}
                onMouseUp={(e) => {
                  if (e.button === 0) onChoose(part.id);
                }}
                onClick={(e) => {
                  if (e.detail === 0) onChoose(part.id);
                }}
              >
                {raster ? (
                  <CreatorRasterArt raster={raster} />
                ) : (
                  <>
                    <span
                      className="creator-mock-row-paint"
                      style={{ background: `rgb(${color.slice(0, 3).join(',')})` }}
                    />
                    {!body ? <span className="palette-cost" aria-hidden="true" /> : null}
                    {code === 3 ? (
                      <span className="creator-row-indicator" aria-hidden="true">
                        •••
                      </span>
                    ) : null}
                  </>
                )}
                <CreatorText
                  pack={pack}
                  field={nameField}
                  text={state.locked ? '???' : part.name}
                  opacity={state.locked ? 0.5 : 1}
                />
                {!body ? (
                  <CreatorText
                    pack={pack}
                    field={costField}
                    text={state.locked ? '?' : String(part.gp)}
                    x={costField.x - (part.gp > 9 ? 0.5 : 0)}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <PaletteScrollbar
        pack={pack}
        portId={portId}
        enabled={model.current.enabled}
        offset={position.offset}
        barY={position.barY}
        extent={model.current.extent}
        onStep={step}
        onDrag={drag}
      />
    </>
  );
}

function PaletteScrollbar({
  pack,
  portId,
  enabled,
  barY,
  offset,
  extent,
  onStep,
  onDrag,
}: {
  pack: AssetPack;
  portId: string;
  enabled: boolean;
  barY: number;
  offset: number;
  extent: number;
  onStep: (delta: number) => void;
  onDrag: (y: number) => void;
}) {
  const p = CREATOR_PALETTE,
    root = useRef<HTMLDivElement>(null),
    dragging = useRef(false),
    [hover, setHover] = useState('');
  const localY = (event: PointerEvent) => {
    const r = root.current!.getBoundingClientRect();
    return ((event.clientY - r.top) * 183) / r.height;
  };
  return (
    <div
      ref={root}
      className="creator-palette-scroll"
      style={{
        left: p.origin.tx / 20 + p.library.matrix.tx / 20 + p.scroll.matrix.tx / 20,
        top: p.origin.ty / 20 + p.library.matrix.ty / 20 + p.scroll.matrix.ty / 20,
      }}
    >
      {p.scroll.pieces.map((piece) => {
        const bar = piece.name === 'bar_mc',
          frame = bar
            ? enabled
              ? hover === piece.name
                ? 3
                : 2
              : 1
            : hover === piece.name
              ? 2
              : 1,
          b = piece.frameBounds?.[frame - 1] ?? piece.bounds,
          raster = pack.creatorFrames.get(`palette:${piece.name}:${frame}`),
          m = piece.matrix;
        const style: CSSProperties = {
          left: m.tx / 20,
          top: bar ? barY : m.ty / 20,
          width: b.width,
          height: b.height,
          transform: `matrix(${m.a},${m.b},${m.c},${m.d},0,0) translate(${b.x}px,${b.y}px)`,
          transformOrigin: '0 0',
        };
        const art = raster ? (
          <CreatorRasterArt raster={raster} offsetX={-b.x} offsetY={-b.y} />
        ) : (
          <svg
            aria-hidden="true"
            width={b.width}
            height={b.height}
            viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
            style={{ overflow: 'visible' }}
          >
            <CreatorPrimitives pieces={piece.art[frame - 1]} />
          </svg>
        );
        return bar ? (
          <div
            key={piece.name}
            role="scrollbar"
            aria-controls={portId}
            aria-label="Scroll parts"
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={extent}
            aria-valuenow={offset}
            aria-disabled={!enabled}
            tabIndex={enabled ? 0 : -1}
            style={style}
            onFocus={() => setHover(piece.name)}
            onBlur={() => setHover('')}
            onPointerEnter={() => {
              if (enabled) setHover(piece.name);
            }}
            onPointerLeave={() => {
              if (!dragging.current) setHover('');
            }}
            onPointerDown={(e) => {
              if (!enabled || e.button !== 0) return;
              e.preventDefault();
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (dragging.current) onDrag(localY(e) - Math.round(b.height / 2));
            }}
            onPointerUp={() => {
              dragging.current = false;
            }}
            onPointerCancel={() => {
              dragging.current = false;
              setHover('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                onStep(e.key === 'ArrowDown' ? 1 : -1);
              } else if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                onDrag(e.key === 'Home' ? 18 : 138);
              }
            }}
          >
            {art}
          </div>
        ) : (
          <button
            key={piece.name}
            disabled={!enabled}
            aria-label={piece.name === 'up_mc' ? 'Scroll parts up' : 'Scroll parts down'}
            style={style}
            onPointerEnter={() => setHover(piece.name)}
            onPointerLeave={() => setHover('')}
            onMouseDown={(e) => {
              if (e.button === 0) onStep(piece.name === 'up_mc' ? -1 : 1);
            }}
            onClick={(e) => {
              if (e.detail === 0) onStep(piece.name === 'up_mc' ? -1 : 1);
            }}
          >
            {art}
          </button>
        );
      })}
    </div>
  );
}
