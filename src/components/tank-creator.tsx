'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { measureClass } from '@/game/assets/class-measurement';
import type { TankDesign, TankPart } from '@/game/core/types';
import { costs, gunBudget, PARTS, partById } from '@/game/data/catalog';
import { canPlacePart, suggestedStats, validateBuild } from '@/game/simulation/designer';
import { exportDesign } from '@/game/services/profile';
import {
  paletteState,
  firstAffordablePart,
  affordabilityHint,
  orderedPalette,
} from '@/game/simulation/editor-palette';
import { CreatorButton, CreatorSlider } from './creator-controls';
import { CREATOR_CONTROLS } from '@/game/core/creator-controls';
import { TankCodeDialog } from './tank-code-dialog';
import { weaponSummary } from './game-panels';
import { CLASS_RINGS, CLASS_SPEED } from '@/game/core/constants';
import {
  placementParts,
  acceptedPlacement,
  validPlacement,
} from '@/game/simulation/editor-placement';
import {
  emptySelection,
  marqueeSelection,
  orderSelection,
  removeParts,
  toggleSelection,
  transformSelection,
  unlinkPartialSelection,
  centerSelection,
  nudgeSelection,
  selectedTransform,
  type PartSelection,
} from '@/game/simulation/editor-selection';
import {
  beginSelectionDrag,
  advanceSelectionDrag,
  type SelectionDrag,
} from '@/game/simulation/editor-drag';

export function TankCreator({
  pack,
  overGame = false,
  initial,
  level,
  maxClass,
  fps,
  onSave,
  onExit,
}: {
  pack: AssetPack;
  overGame?: boolean;
  initial: TankDesign;
  level: number;
  maxClass: number;
  fps: number;
  onSave: (tank: TankDesign) => void;
  onExit: () => void;
}) {
  const [design, setDesign] = useState<TankDesign>(() => structuredClone(initial));
  const classId = useMemo(() => measureClass(design, pack), [design, pack]);
  const finalDesign = useMemo(() => ({ ...design, classId }), [design, classId]);
  const { gp, bp } = costs(design.parts),
    budget = design.avatar ? gunBudget(classId, level) : Math.floor(gunBudget(classId, 6) * 1.5);
  const errors = validateBuild(finalDesign, level, maxClass);
  const paletteContext = { avatar: design.avatar, level, classId, budget, gp, bp };
  const [category, setCategory] = useState(1),
    [chosen, setChosen] = useState<number | null>(() =>
      firstAffordablePart(
        PARTS.filter((p) => Math.floor(p.id / 1000) === 1),
        paletteContext,
      ),
    ),
    [placing, setPlacing] = useState<number | null>(null),
    [selection, setSelection] = useState<PartSelection>(emptySelection),
    [symmetric, setSymmetric] = useState(true),
    [message, setMessage] = useState(''),
    [loading, setLoading] = useState(false);
  const [undo, setUndo] = useState<TankDesign[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const artwork = useRef<import('@/game/render/creator-artwork').CreatorArtwork | null>(null);
  const artworkFrame = useRef(1);
  const drawRef = useRef<() => void>(() => {});
  const preview = useRef<HTMLButtonElement>(null);
  const placement = useRef<{ id: number; mode: 'pointer' | 'keyboard' } | null>(null);
  const nextPart = useRef(0);
  const radii = useRef(new Map<number, number>());
  const selectionBoxes = useRef<{
    parts: TankPart[];
    selection: PartSelection;
    boxes: Map<string, { x: number; y: number; width: number; height: number }>;
  } | null>(null);
  const drag = useRef<{
      before: TankDesign;
      from: { x: number; y: number };
      hit?: string;
      moving: boolean;
      moved: boolean;
      selection: PartSelection;
      session: SelectionDrag | null;
    } | null>(null),
    pointer = useRef({ x: 0, y: 0 }),
    snapLocked = useRef(false);
  const active = design.parts.find(
    (p) => p.key === selection.keys.find((key) => !selection.ghosts.includes(key)),
  );
  const palette = orderedPalette(
    PARTS.filter((p) => Math.floor(p.id / 1000) === category),
    paletteContext,
  );
  function commit(next: TankDesign) {
    setUndo((previous) => [...previous.slice(-9), structuredClone(design)]);
    setDesign(next);
    setMessage('');
  }
  const controlBefore = useRef<TankDesign | null>(null);
  const nudge = useRef<{ before: TankDesign; selection: PartSelection; direction: number } | null>(
    null,
  );
  const transform = selectedTransform(design.parts, selection);
  function beginControl() {
    controlBefore.current = structuredClone(design);
  }
  function endControl(cancel = false) {
    const before = controlBefore.current;
    controlBefore.current = null;
    if (!before) return;
    if (cancel) setDesign(before);
    else if (JSON.stringify(design) !== JSON.stringify(before))
      setUndo((previous) => [...previous.slice(-9), before]);
  }
  function beginNudge(direction: number) {
    nudge.current = { before: structuredClone(design), selection, direction };
  }
  function endNudge(click: boolean) {
    const current = nudge.current;
    nudge.current = null;
    if (!current) return;
    if (click)
      setDesign((previous) => ({
        ...previous,
        parts: nudgeSelection(previous.parts, current.selection, current.direction),
      }));
    if (click || JSON.stringify(design.parts) !== JSON.stringify(current.before.parts))
      setUndo((previous) => [...previous.slice(-9), current.before]);
  }
  function changePart(change: { rotation?: number; scale?: number }) {
    const next = {
      ...design,
      parts: unlinkPartialSelection(transformSelection(design.parts, selection, change), selection),
    };
    if (controlBefore.current) setDesign(next);
    else commit(next);
  }
  function draw() {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, 700, 700);
    ctx.save();
    ctx.scale(2, 2);
    ctx.translate(175, 175);
    const rings = pack.creatorFrames.get(`rings:${maxClass}`);
    if (rings) ctx.drawImage(rings.canvas, rings.x, rings.y, rings.width, rings.height);
    else {
      for (let i = maxClass; i >= 1; i--) {
        ctx.strokeStyle = i === maxClass ? 'rgba(160,241,255,.32)' : 'rgba(137,228,249,.12)';
        ctx.lineWidth = i === classId ? 1.2 : 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, CLASS_RINGS[i - 1], 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(130,227,240,.14)';
      ctx.beginPath();
      ctx.moveTo(-162, 0);
      ctx.lineTo(160, 0);
      ctx.stroke();
      ctx.fillStyle = '#bceeffaa';
      ctx.beginPath();
      ctx.moveTo(162, 0);
      ctx.lineTo(153, -7);
      ctx.lineTo(153, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.stroke();
    }
    if (artwork.current)
      artwork.current.draw(
        ctx,
        'design',
        design.parts.map((part) => ({
          part,
          alpha: selection.ghosts.includes(part.key) ? 0.25 : 1,
        })),
        artworkFrame.current,
      );
    if (
      !selectionBoxes.current ||
      (!controlBefore.current &&
        (selectionBoxes.current.parts !== design.parts ||
          selectionBoxes.current.selection !== selection))
    )
      selectionBoxes.current = { parts: design.parts, selection, boxes: new Map() };
    for (const p of design.parts) {
      if (!artwork.current) {
        ctx.save();
        if (selection.ghosts.includes(p.key)) ctx.globalAlpha = 0.25;
        pack.drawPart(ctx, p);
        ctx.restore();
      }
      if (selection.keys.includes(p.key) && !drag.current?.moved) {
        let box = selectionBoxes.current.boxes.get(p.key);
        if (!box) {
          const r = artwork.current?.localBounds(p) ?? pack.part(p.type),
            angle = (p.rotation * Math.PI) / 180;
          const corners = [
            [r.x, r.y],
            [r.x + r.width, r.y],
            [r.x + r.width, r.y + r.height],
            [r.x, r.y + r.height],
          ].map(([x, y]) => ({
            x: p.x + (x * Math.cos(angle) - y * Math.sin(angle)) * p.scale,
            y: p.y + (x * Math.sin(angle) + y * Math.cos(angle)) * p.scale,
          }));
          box = {
            x: Math.min(...corners.map((c) => c.x)),
            y: Math.min(...corners.map((c) => c.y)),
            width: Math.max(...corners.map((c) => c.x)) - Math.min(...corners.map((c) => c.x)),
            height: Math.max(...corners.map((c) => c.y)) - Math.min(...corners.map((c) => c.y)),
          };
          selectionBoxes.current.boxes.set(p.key, box);
        }
        ctx.strokeStyle = '#00cbff';
        ctx.lineWidth = 1;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }
    }
    if (drag.current?.moved && !drag.current.moving) {
      ctx.strokeStyle = '#00cbff';
      ctx.lineWidth = 1;
      const from = drag.current.from,
        to = pointer.current;
      ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
    }
    const drafts = placing ? pendingPlacement(placing, pointer.current) : [];
    if (artwork.current)
      artwork.current.draw(
        ctx,
        'draft',
        drafts.map((part, index) => ({
          part,
          alpha: index === 0 ? 1 : 0.25,
          invalid: !validPlacement(part, classId, maxClass),
        })),
        artworkFrame.current,
      );
    else {
      for (const [index, part] of drafts.entries()) {
        ctx.save();
        ctx.globalAlpha = index === 0 ? 1 : 0.25;
        if (!validPlacement(part, classId, maxClass)) ctx.filter = 'grayscale(1)';
        pack.drawPart(ctx, part);
        ctx.restore();
      }
    }
    ctx.restore();
    const pc = previewCanvas.current?.getContext('2d');
    if (pc) {
      pc.clearRect(0, 0, 284, 140);
      pc.save();
      pc.scale(2, 2);
      pc.translate(71, 35);
      const part: TankPart | null =
        chosen === null
          ? null
          : {
              key: `preview-${chosen}`,
              type: chosen,
              x: 0,
              y: 0,
              radius: 0,
              scale: 1,
              rotation: 0,
              twin: '',
            };
      if (artwork.current)
        artwork.current.draw(pc, 'preview', part ? [{ part }] : [], artworkFrame.current);
      else if (part) pack.drawPart(pc, part);
      pc.restore();
    }
  }
  useEffect(() => {
    drawRef.current = draw;
    draw();
  });
  useEffect(() => {
    let cancelled = false,
      request = 0;
    let renderer: import('@/game/render/creator-artwork').CreatorArtwork | undefined;
    async function start() {
      try {
        const { CreatorArtwork } = await import('@/game/render/creator-artwork');
        if (cancelled) return;
        renderer = new CreatorArtwork(pack);
        await renderer.init();
        if (cancelled) {
          renderer.destroy();
          return;
        }
        artwork.current = renderer;
        selectionBoxes.current = null;
        let previous = performance.now(),
          accumulator = 0;
        const tick = (now: number) => {
          if (cancelled) return;
          accumulator += document.hidden ? 0 : Math.min(100, now - previous);
          previous = now;
          const step = 1000 / fps;
          if (accumulator >= step) {
            const frames = Math.floor(accumulator / step);
            if (nudge.current) {
              const { selection, direction } = nudge.current;
              setDesign((previous) => ({
                ...previous,
                parts: nudgeSelection(previous.parts, selection, direction * frames),
              }));
            }
            artworkFrame.current += frames;
            accumulator %= step;
            drawRef.current();
          }
          request = requestAnimationFrame(tick);
        };
        drawRef.current();
        request = requestAnimationFrame(tick);
      } catch (error) {
        if (artwork.current === renderer) artwork.current = null;
        renderer?.destroy();
        if (!cancelled)
          setMessage(
            `Animated artwork could not start: ${error instanceof Error ? error.message : 'WebGL unavailable'}`,
          );
      }
    }
    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(request);
      artwork.current = null;
      if (renderer) renderer.destroy();
    };
  }, [pack, fps]);
  function hitPart(part: TankPart, x: number, y: number) {
    return artwork.current?.hitPart(part, x, y) ?? pack.hitDesignPart(part, x, y);
  }
  function point(e: { clientX: number; clientY: number }) {
    const r = canvas.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * 350) / r.width - 175,
      y: ((e.clientY - r.top) * 350) / r.height - 175,
    };
  }
  function pendingPlacement(id: number, pos: { x: number; y: number }, key = 'preview') {
    let radius = radii.current.get(id);
    if (radius === undefined) {
      const symbol = partById(id)?.symbol;
      radius =
        symbol && pack.mode === 'swf'
          ? (pack.symbolBounds(symbol)?.width ?? pack.part(id).width - 4) / 2
          : (pack.part(id).width - 6) / 2;
      radii.current.set(id, radius);
    }
    return placementParts(id, radius, pos, symmetric, key);
  }
  function beginPlacement(id: number, mode: 'pointer' | 'keyboard', pos: { x: number; y: number }) {
    pointer.current = pos;
    radii.current.delete(id);
    const radius = artwork.current?.beginDraft(
      placementParts(id, 0, pos, symmetric, 'preview'),
      artworkFrame.current,
    );
    if (radius !== undefined) radii.current.set(id, radius);
    placement.current = { id, mode };
    setPlacing(id);
  }
  function finishPlacement(pos: { x: number; y: number }, cancel = false) {
    const gesture = placement.current;
    if (!gesture) return;
    placement.current = null;
    setPlacing(null);
    if (!cancel) {
      const added = acceptedPlacement(
        pendingPlacement(gesture.id, pos, `part-${Date.now()}-${nextPart.current++}`),
        classId,
        maxClass,
      );
      const parts = [...design.parts, ...added];
      if (added.length) {
        artwork.current?.adoptDraft(added);
        commit({ ...design, parts });
      }
      const lastType = parts.at(-1)?.type ?? 0;
      if (lastType >= 1500 && lastType <= 1600) artwork.current?.restartClusters(parts);
    }
  }
  function finishDrag(cancel = false) {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    if (cancel) {
      setDesign(current.before);
      setSelection(current.selection);
    } else if (current.moved && current.moving) {
      const final = current.session!;
      snapLocked.current = final.locked;
      const invalid = final.parts
        .filter((p) => final.selection.keys.includes(p.key) && !canPlacePart(p, classId, maxClass))
        .map((p) => p.key);
      const parts = removeParts(unlinkPartialSelection(final.parts, final.selection), invalid);
      setDesign({ ...design, parts });
      setSelection({
        keys: final.selection.keys.filter((k) => !invalid.includes(k)),
        ghosts: final.selection.ghosts.filter((k) => !invalid.includes(k)),
      });
      setUndo((prev) => [...prev.slice(-9), current.before]);
    } else if (current.moved) {
      setSelection(
        marqueeSelection(
          design.parts,
          selection,
          current.from,
          pointer.current,
          symmetric,
          hitPart,
        ),
      );
    } else {
      setSelection(toggleSelection(design.parts, selection, current.hit, symmetric));
    }
    draw();
  }
  return (
    <div
      className={`creator stage-background ${overGame ? 'over-game' : ''}`}
      data-assets={pack.mode}
    >
      <CreatorButton
        pack={pack}
        name="SymmetricMode_mc"
        label="Symmetric Mode"
        checked={symmetric}
        onClick={() => {
          setSymmetric(!symmetric);
          setSelection(emptySelection());
        }}
      />
      <CreatorButton
        pack={pack}
        name="LoadTank_mc"
        label="Load a Tank..."
        onClick={() => setLoading(true)}
      />
      <CreatorButton
        pack={pack}
        name="SaveExit_mc"
        label="SAVE"
        onClick={() => {
          if (errors.length) {
            setMessage(errors[0]);
            return;
          }
          onSave({ ...finalDesign, name: design.name.trim() || 'Untitled Tank' });
        }}
      />
      <CreatorButton pack={pack} name="Exit_mc" label="Exit tank creator" onClick={onExit} />
      <span className="creator-stats-tab">Stats</span>
      <div className="creator-name">
        <label>
          Tank name{' '}
          <input
            aria-label="Tank name"
            maxLength={40}
            value={design.name}
            onChange={(e) => setDesign({ ...design, name: e.target.value })}
          />
        </label>
        <button onClick={() => exportDesign(finalDesign)}>Export</button>
      </div>
      <div className="creator-meters">
        <div>
          Class {classId}
          <span className="creator-meter">
            <i style={{ width: `${(classId / maxClass) * 100}%` }} />
          </span>
          <small>Max Class: {maxClass}</small>
        </div>
        <div>
          Complexity
          <span className={`creator-meter ${bp > 100 ? 'invalid' : ''}`}>
            <i style={{ width: `${Math.min(100, bp)}%` }} />
          </span>
        </div>
        <div className={gp > budget ? 'invalid' : ''}>
          GP: {gp}
          <small>Max GP: {budget}</small>
        </div>
      </div>
      <div className="creator-workspace">
        <canvas
          ref={canvas}
          width="700"
          height="700"
          style={{
            left: CREATOR_CONTROLS.workspace.tx / 20 - 175,
            top: CREATOR_CONTROLS.workspace.ty / 20 - 175,
          }}
          aria-label="Tank design area. Choose a palette row, then drag its preview here. For keyboard placement, activate the preview, move with arrow keys and press Enter. Click parts to toggle selection. Drag empty space to select a group. Drag selected parts to move them."
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            const pos = point(e);
            pointer.current = pos;
            if (placement.current?.mode === 'keyboard') {
              finishPlacement(pos);
              return;
            }
            const hit = [...design.parts].reverse().find((p) => hitPart(p, pos.x, pos.y));
            const moving = design.parts.some(
              (p) => selection.keys.includes(p.key) && hitPart(p, pos.x, pos.y),
            );
            drag.current = {
              before: structuredClone(design),
              from: pos,
              hit: hit?.key,
              moving,
              moved: false,
              selection,
              session: null,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const pos = point(e);
            pointer.current = pos;
            const current = drag.current;
            if (current) {
              if (Math.hypot(pos.x - current.from.x, pos.y - current.from.y) > 0.25)
                current.moved = true;
              if (current.moved && current.moving) {
                current.session = advanceSelectionDrag(
                  current.session ??
                    beginSelectionDrag(
                      current.before.parts,
                      current.selection,
                      current.from,
                      symmetric,
                      snapLocked.current,
                      pos,
                    ),
                  pos,
                );
                setDesign({ ...design, parts: current.session.parts });
                setSelection(current.session.selection);
              } else draw();
            } else if (placing) draw();
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (placement.current?.mode !== 'keyboard') return;
            const delta = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, -1],
              ArrowDown: [0, 1],
            }[e.key];
            if (delta) {
              e.preventDefault();
              const step = e.shiftKey ? 5 : 1;
              pointer.current = {
                x: pointer.current.x + delta[0] * step,
                y: pointer.current.y + delta[1] * step,
              };
              draw();
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              finishPlacement(pointer.current);
              preview.current?.focus();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              finishPlacement(pointer.current, true);
              preview.current?.focus();
            }
          }}
          onPointerUp={() => finishDrag()}
          onPointerCancel={() => finishDrag(true)}
        />
        <aside className="creator-stats">
          <div className="creator-summary">
            <p>Speed: {Math.round(CLASS_SPEED[classId - 1] * 100)}%</p>
            {(design.avatar
              ? [
                  ['Primary Weapons', 2],
                  ['Secondary Weapons', 3],
                  ['Passive Weapons', 5],
                ]
              : [
                  ['Weapons', 4],
                  ['Behavior', 6],
                ]
            ).map(([label, cat]) => (
              <p key={label}>
                {label}:<br />
                {weaponSummary(design, Number(cat))}
              </p>
            ))}
          </div>
        </aside>
      </div>
      {!design.avatar ? (
        <details className="creator-inspector">
          <summary>Enemy stats</summary>
          <div>
            {!design.avatar ? (
              <div className="enemy-stats">
                {(['life', 'reward', 'speed'] as const).map((key) => (
                  <label key={key}>
                    {key === 'reward' ? 'Bubbles' : key}
                    <input
                      aria-label={`Enemy ${key}`}
                      type="number"
                      min={key === 'speed' ? 0 : 1}
                      max={key === 'speed' ? 4 : key === 'life' ? 1000 : 500}
                      step={key === 'speed' ? 0.1 : 1}
                      value={design[key]}
                      onChange={(e) => setDesign({ ...design, [key]: Number(e.target.value) })}
                    />
                  </label>
                ))}
                <button onClick={() => setDesign({ ...design, ...suggestedStats(finalDesign) })}>
                  Use suggested stats
                </button>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
      {active ? (
        <>
          <span className="sr-only" role="status">
            Selected parts ({selection.keys.length})
          </span>
          <CreatorButton
            pack={pack}
            name="DeleteButton_mc"
            label="Delete selected part"
            onClick={() => {
              commit({ ...design, parts: removeParts(design.parts, selection.keys) });
              setSelection(emptySelection());
            }}
          />
          <CreatorButton
            pack={pack}
            name="BringFront_mc"
            label="To front"
            onClick={() =>
              commit({ ...design, parts: orderSelection(design.parts, selection, true) })
            }
          />
          <CreatorButton
            pack={pack}
            name="SendBack_mc"
            label="To back"
            onClick={() =>
              commit({ ...design, parts: orderSelection(design.parts, selection, false) })
            }
          />
          <CreatorButton
            pack={pack}
            name="AlignCenter_mc"
            label="Align to Center"
            onClick={() => {
              const next = centerSelection(design.parts, selection);
              commit({ ...design, parts: next.parts });
              setSelection(next.selection);
            }}
          />
          {([-1, 1] as const).map((direction) => (
            <CreatorButton
              key={direction}
              pack={pack}
              name={direction < 0 ? 'Left_mc' : 'Right_mc'}
              label={direction < 0 ? 'Move selection left' : 'Move selection right'}
              onClick={() =>
                commit({ ...design, parts: nudgeSelection(design.parts, selection, direction) })
              }
              onHoldStart={() => beginNudge(direction)}
              onHoldEnd={endNudge}
            />
          ))}
          {CREATOR_CONTROLS.sliders.map((layout) => (
            <CreatorSlider
              key={layout.name}
              pack={pack}
              layout={layout}
              label={layout.name === 'Resize_mc' ? 'Part scale' : 'Part rotation'}
              value={layout.name === 'Resize_mc' ? transform.scale : transform.rotation}
              resetKey={selection}
              min={layout.name === 'Resize_mc' ? 0.5 : 0}
              max={layout.name === 'Resize_mc' ? 2 : 360}
              onChange={(value) =>
                changePart(layout.name === 'Resize_mc' ? { scale: value } : { rotation: value })
              }
              onBegin={beginControl}
              onEnd={endControl}
            />
          ))}
        </>
      ) : null}
      <CreatorButton
        pack={pack}
        name="Undo_mc"
        label="Undo"
        disabled={!undo.length}
        onClick={() => {
          setDesign(undo[undo.length - 1]);
          setUndo(undo.slice(0, -1));
          setSelection(emptySelection());
          setMessage('');
        }}
      />
      {message ? (
        <p role="alert" className="creator-message">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        ref={preview}
        className="creator-part-preview"
        disabled={chosen === null}
        aria-label={chosen ? `Drag ${partById(chosen)?.name} into design` : 'Choose a part'}
        onPointerDown={(e) => {
          if (e.button !== 0 || chosen === null) return;
          beginPlacement(chosen, 'pointer', point(e));
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (placement.current?.mode === 'pointer') {
            pointer.current = point(e);
            draw();
          }
        }}
        onPointerUp={(e) => finishPlacement(point(e))}
        onPointerCancel={() => finishPlacement(pointer.current, true)}
        onClick={(e) => {
          if (e.detail !== 0 || chosen === null) return;
          beginPlacement(chosen, 'keyboard', { x: 0, y: 0 });
          canvas.current?.focus();
        }}
      >
        <canvas ref={previewCanvas} width={284} height={140} aria-hidden="true" />
        <span>Click and Drag Object</span>
      </button>
      <div className="palette-tabs">
        {(design.avatar
          ? [
              [1, 'Body'],
              [2, 'Primary'],
              [3, 'Secondary'],
              [5, 'Interface'],
            ]
          : [
              [1, 'Body'],
              [4, 'Weapons'],
              [6, 'Behavior'],
            ]
        ).map(([id, label]) => (
          <button
            key={id}
            className={category === id ? 'active' : ''}
            onClick={() => {
              setCategory(Number(id));
              setChosen(
                firstAffordablePart(
                  PARTS.filter((p) => Math.floor(p.id / 1000) === Number(id)),
                  paletteContext,
                ),
              );
              placement.current = null;
              setPlacing(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="part-palette">
        {palette.map((p) => {
          const state = paletteState(p, paletteContext),
            locked = state.locked;
          const hint = affordabilityHint(p, state.reason);
          return (
            <button
              disabled={locked}
              key={p.id}
              aria-label={locked ? `${p.name}, unlocks at level ${p.tier}` : `Place ${p.name}`}
              title={`${p.name} · ${p.gp} GP · ${p.bp} BP${locked ? ` · unlocks at level ${p.tier}` : hint ? ` · ${hint}` : ''}`}
              aria-description={hint || undefined}
              className={`${chosen === p.id ? 'selected' : ''} ${!state.affordable ? 'unaffordable' : ''}`}
              aria-pressed={chosen === p.id}
              onClick={() => {
                setChosen(p.id);
                placement.current = null;
                setPlacing(null);
                setMessage('');
              }}
            >
              {p.id >= 2000 ? <span className="palette-cost">{locked ? '?' : p.gp}</span> : null}
              {locked ? '???' : p.name}
            </button>
          );
        })}
      </div>
      {loading ? (
        <TankCodeDialog
          onClose={() => setLoading(false)}
          onImport={(tank) => {
            if (tank.avatar !== design.avatar) {
              setMessage(`Load an ${design.avatar ? 'avatar' : 'enemy'} tank.`);
              return;
            }
            commit(tank);
            placement.current = null;
            setSelection(emptySelection());
            setPlacing(null);
          }}
        />
      ) : null}
    </div>
  );
}
