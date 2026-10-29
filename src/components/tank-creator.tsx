'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { measureClass } from '@/game/assets/class-measurement';
import type { TankDesign, TankPart } from '@/game/core/types';
import { costs, gunBudget, PARTS, partById } from '@/game/data/catalog';
import { canPlacePart, validateBuild } from '@/game/simulation/designer';
import { exportDesign } from '@/game/services/profile';
import { firstAffordablePart, orderedPalette } from '@/game/simulation/editor-palette';
import { CreatorButton, CreatorSlider } from './creator-controls';
import { CREATOR_CONTROLS } from '@/game/core/creator-controls';
import { CreatorPaletteFrame, CreatorPaletteRows } from './creator-palette';
import { CreatorSelectionInfo } from './creator-selection-info';
import { creatorWeaponIcons, type CreatorWeaponIcon } from '@/game/core/creator-details';
import { CreatorPartDetails } from './creator-part-details';
import { creatorThumbnailScale, type CreatorDetailFocus } from '@/game/core/creator-details';
import { CreatorStats } from './creator-stats';
import { CreatorEnemyStats, CreatorStatsTab } from './creator-enemy-stats';
import { creatorSuggestedStats, creatorImportedSuggested } from '@/game/core/creator-enemy-stats';
import { CREATOR_PALETTE } from '@/game/core/creator-palette';
import { CreatorSaveDialog } from './creator-save-dialog';
import { CLASS_RINGS } from '@/game/core/constants';
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
  onLoad,
}: {
  pack: AssetPack;
  overGame?: boolean;
  initial: TankDesign;
  level: number;
  maxClass: number;
  fps: number;
  onSave: (tank: TankDesign) => TankDesign | undefined;
  onExit: () => void;
  onLoad: (limits: { avatar: boolean; level: number; maxClass: number; gunPoints: number }) => void;
}) {
  const [design, setDesign] = useState<TankDesign>(() => structuredClone(initial));
  const [transformClass, setTransformClass] = useState<number | null>(null);
  const classId = useMemo(
    () => transformClass ?? measureClass(design, pack),
    [design, pack, transformClass],
  );
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
    [message, setMessage] = useState('');
  const [advanced, setAdvanced] = useState(false),
    [suggested, setSuggested] = useState(
      () =>
        !initial.avatar &&
        (initial.id === 'new' || creatorImportedSuggested(initial, { parts: [], classId: 1 })),
    );
  const [undo, setUndo] = useState<TankDesign[]>([]);
  const [saveDialog, setSaveDialog] = useState<{ kind: 'save' | 'exit'; tank: TankDesign } | null>(
    null,
  );
  const dialogOpener = useRef<HTMLElement | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const detailCanvas = useRef<HTMLCanvasElement>(null),
    detailsCounter = useRef(0),
    detailsId = useId();
  const [details, setDetails] = useState<CreatorDetailFocus | null>(null);
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
  const [selectionIcons, setSelectionIcons] = useState<CreatorWeaponIcon[]>([]);
  const iconSnapshot = useRef<{ boxes: object | null; hidden: boolean } | null>(null);
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
    setTransformClass(classId);
  }
  function endControl(cancel = false) {
    const before = controlBefore.current;
    controlBefore.current = null;
    setTransformClass(null);
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
    const selectionMoving = !!(drag.current?.moved && drag.current.moving);
    for (const p of design.parts) {
      if (!artwork.current) {
        ctx.save();
        if (selection.ghosts.includes(p.key)) ctx.globalAlpha = 0.25;
        pack.drawPart(ctx, p);
        ctx.restore();
      }
      if (selection.keys.includes(p.key) && !selectionMoving) {
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
    const iconsHidden = selectionMoving;
    if (
      iconSnapshot.current?.boxes !== selectionBoxes.current ||
      iconSnapshot.current?.hidden !== iconsHidden
    ) {
      iconSnapshot.current = { boxes: selectionBoxes.current, hidden: iconsHidden };
      setSelectionIcons(
        iconsHidden
          ? []
          : creatorWeaponIcons(design.parts, selection.keys, selectionBoxes.current.boxes),
      );
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
      pc.clearRect(0, 0, 282, 134);
      pc.save();
      pc.scale(2, 2);
      pc.translate(
        -CREATOR_PALETTE.library.preview.bounds.x,
        -CREATOR_PALETTE.library.preview.bounds.y,
      );
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
    const dc = detailCanvas.current?.getContext('2d');
    if (!details) artwork.current?.clearLayer('details');
    else if (dc) {
      dc.clearRect(0, 0, 98, 98);
      dc.save();
      dc.scale(2, 2);
      dc.translate(24.5, 24.5);
      const part: TankPart = {
        key: `details-${details.instance}`,
        type: details.id,
        x: 0,
        y: 0,
        radius: 0,
        scale: 1,
        rotation: 0,
        twin: '',
      };
      if (artwork.current) artwork.current.draw(dc, 'details', [{ part }], artworkFrame.current);
      else {
        const raster = pack.part(part.type),
          padding = pack.mode === 'swf' ? 4 : 6;
        part.scale = creatorThumbnailScale(raster.width - padding, raster.height - padding);
        pack.drawPart(dc, part);
      }
      dc.restore();
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
      <div
        className="creator-editor-content"
        inert={!!saveDialog}
        aria-hidden={!!saveDialog || undefined}
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
          onClick={() => onLoad({ avatar: design.avatar, level, maxClass, gunPoints: budget })}
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
            const tank = {
              ...finalDesign,
              ...(!design.avatar && suggested ? creatorSuggestedStats(finalDesign, 'save') : {}),
            };
            setDesign(tank);
            setDetails(null);
            dialogOpener.current = document.activeElement as HTMLElement | null;
            setSaveDialog({ kind: 'save', tank });
          }}
        />
        <CreatorButton
          pack={pack}
          name="Exit_mc"
          label="Exit tank creator"
          onClick={() => {
            dialogOpener.current = document.activeElement as HTMLElement | null;
            setSaveDialog({ kind: 'exit', tank: finalDesign });
          }}
        />
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
              setAdvanced(false);
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
          {advanced ? (
            <CreatorStatsTab pack={pack} basic onClick={() => setAdvanced(false)} />
          ) : (
            <CreatorStats pack={pack} design={design} classId={classId} />
          )}
        </div>
        {!design.avatar ? (
          <CreatorEnemyStats
            pack={pack}
            values={design}
            suggested={suggested}
            open={advanced}
            fps={fps}
            onOpen={() => {
              setAdvanced(true);
              if (suggested) setDesign({ ...design, ...creatorSuggestedStats(finalDesign) });
            }}
            onValues={(values) => setDesign({ ...design, ...values })}
            onSuggested={(enabled) => {
              setSuggested(enabled);
              if (enabled) setDesign({ ...design, ...creatorSuggestedStats(finalDesign) });
            }}
          />
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
          style={{
            left:
              CREATOR_PALETTE.origin.tx / 20 +
              CREATOR_PALETTE.library.matrix.tx / 20 +
              CREATOR_PALETTE.library.preview.x +
              CREATOR_PALETTE.library.preview.bounds.x,
            top:
              CREATOR_PALETTE.origin.ty / 20 +
              CREATOR_PALETTE.library.matrix.ty / 20 +
              CREATOR_PALETTE.library.preview.y +
              CREATOR_PALETTE.library.preview.bounds.y,
            width: CREATOR_PALETTE.library.preview.bounds.width,
            height: CREATOR_PALETTE.library.preview.bounds.height,
          }}
          disabled={chosen === null}
          aria-label={chosen ? `Drag ${partById(chosen)?.name} into design` : 'Choose a part'}
          onPointerDown={(e) => {
            if (e.button !== 0 || chosen === null) return;
            setDetails(null);
            setAdvanced(false);
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
            setDetails(null);
            beginPlacement(chosen, 'keyboard', { x: 0, y: 0 });
            canvas.current?.focus();
          }}
        >
          <canvas ref={previewCanvas} width={282} height={134} aria-hidden="true" />
        </button>
        <CreatorPaletteFrame
          pack={pack}
          avatar={design.avatar}
          category={category}
          onCategory={(id) => {
            setAdvanced(false);
            setDetails(null);
            setCategory(id);
            setChosen(
              firstAffordablePart(
                PARTS.filter((p) => Math.floor(p.id / 1000) === id),
                paletteContext,
              ),
            );
            placement.current = null;
            setPlacing(null);
          }}
        />
        <CreatorPaletteRows
          key={category}
          pack={pack}
          parts={palette}
          context={paletteContext}
          chosen={chosen}
          detailsId={detailsId}
          onDetails={(anchor) =>
            setDetails(anchor ? { ...anchor, instance: ++detailsCounter.current } : null)
          }
          onChoose={(id) => {
            if (details && chosen !== id)
              setDetails({ ...details, id, selected: true, instance: ++detailsCounter.current });
            setAdvanced(false);
            setChosen(id);
            placement.current = null;
            setPlacing(null);
            setMessage('');
          }}
        />
        <CreatorSelectionInfo pack={pack} icons={selectionIcons} />
        <CreatorPartDetails pack={pack} focus={details} canvas={detailCanvas} id={detailsId} />
      </div>
      {saveDialog ? (
        <CreatorSaveDialog
          pack={pack}
          kind={saveDialog.kind}
          tank={saveDialog.tank}
          opener={dialogOpener.current}
          onSave={onSave}
          onClose={() => setSaveDialog(null)}
          onExit={onExit}
        />
      ) : null}
    </div>
  );
}
