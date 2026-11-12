'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { measureClass } from '@/game/assets/class-measurement';
import type { TankDesign, TankPart } from '@/game/core/types';
import type { ViewerLimits } from '@/game/core/tank-viewer';
import { costs, gunBudget, PARTS, partById } from '@/game/data/catalog';
import { canPlacePart } from '@/game/simulation/designer';
import { creatorSavePrerequisite } from '@/game/core/creator-save';
import { CREATOR_EDIT_ERRORS, creatorEditError } from '@/game/simulation/editor-validation';
import {
  initialEditorSnapshots,
  acceptedEditorParts,
  appendEditorSnapshot,
  undoEditorSnapshot,
} from '@/game/simulation/editor-history';
import { creatorSuggestedStats, creatorImportedSuggested } from '@/game/core/creator-enemy-stats';
import { firstAffordablePart, orderedPalette } from '@/game/simulation/editor-palette';
import { CreatorButton, CreatorSlider } from './creator-controls';
import { CREATOR_CONTROLS } from '@/game/core/creator-controls';
import { EditorDisplayState, editorDisplayTopology } from '@/game/simulation/editor-display';
import { DISPLAY_IDENTITY, displayMatrixProduct } from '@/game/core/display-transform';
import { displayPixel, displayRotation, displayTwips } from '@/game/core/display-values';
import { stageDisplayPoint } from './stage-pointer';
import { CreatorSaveDialog } from './creator-save-dialog';
import { CreatorGuide } from './creator-guide';
import { CreatorAlert } from './creator-alert';
import { CreatorStats } from './creator-stats';
import { CreatorEnemyStats, CreatorStatsTab } from './creator-enemy-stats';
import { CreatorPaletteFrame, CreatorPaletteTabs, CreatorPaletteRows } from './creator-palette';
import { CREATOR_PALETTE } from '@/game/core/creator-palette';
import { CreatorPartDetails } from './creator-part-details';
import { CreatorSelectionInfo } from './creator-selection-info';
import { creatorWeaponIcons, type CreatorWeaponIcon } from '@/game/core/creator-details';
import { creatorThumbnailScale, type CreatorDetailFocus } from '@/game/core/creator-details';
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
  initialSaveName = initial.name,
  helpSeen = true,
  onHelpStart,
  level,
  maxClass,
  unlockedParts,
  profileMaxClass,
  fps,
  onSave,
  onExit,
  onLoad,
}: {
  pack: AssetPack;
  overGame?: boolean;
  initial: TankDesign;
  initialSaveName?: string;
  helpSeen?: boolean;
  onHelpStart?: () => void;
  level: number;
  maxClass: number;
  unlockedParts?: readonly number[];
  profileMaxClass?: number;
  fps: number;
  onSave: (tank: TankDesign) => TankDesign | undefined;
  onExit: () => void;
  onLoad: (limits: ViewerLimits & { avatar: boolean }) => void;
}) {
  const [design, setDesignState] = useState<TankDesign>(() => structuredClone(initial)),
    designLive = useRef(design);
  const [displayState] = useState(() => new EditorDisplayState(initial.parts));
  const displayedParts = displayState.present(design.parts);
  // UpdateClass constructs fresh measurement clips from arrTankDetails metadata.
  const measuredDesign = (tank: TankDesign) => ({
    ...tank,
    parts: tank.parts.map((part) => ({
      ...part,
      x: displayPixel(part.x),
      y: displayPixel(part.y),
      rotation: displayRotation(part.rotation),
    })),
  });
  const [classId, setClassState] = useState(() => measureClass(measuredDesign(initial), pack)),
    classLive = useRef(classId);
  const [guideActive, setGuideActive] = useState(() => !helpSeen),
    [alertRequest, setAlertRequest] = useState<{ message: string } | null>(null),
    [alertActive, setAlertActive] = useState(false);
  const finalDesign = useMemo(() => ({ ...design, classId }), [design, classId]);
  const { gp, bp } = costs(design.parts),
    budget = design.avatar ? gunBudget(classId, level) : Math.floor(gunBudget(classId, 6) * 1.5);
  const paletteContext = { avatar: design.avatar, level, classId, budget, gp, bp, unlockedParts };
  const [category, setCategory] = useState(1),
    [chosen, setChosen] = useState<number | null>(() =>
      firstAffordablePart(
        PARTS.filter((p) => Math.floor(p.id / 1000) === 1),
        paletteContext,
      ),
    ),
    [placing, setPlacing] = useState<number | null>(null),
    [selection, setSelectionState] = useState<PartSelection>(emptySelection),
    [symmetric, setSymmetric] = useState(true),
    [message, setMessage] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const selectionLive = useRef(selection),
    marqueePending = useRef(false),
    workspaceSuspended = useRef(false),
    canceledPointers = useRef(new Set<number>()),
    releasedEvents = useRef(new WeakSet<Event>());
  const [history, setHistory] = useState(() => initialEditorSnapshots(initial.parts)),
    historyLive = useRef(history);
  const [suggested, setSuggested] = useState(
    () =>
      !initial.avatar &&
      (initial.id === 'new' || creatorImportedSuggested(initial, { parts: [], classId: 1 })),
  );
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
  const guideWasOpen = useRef(guideActive),
    alertWasOpen = useRef(false);
  useEffect(() => {
    if (guideWasOpen.current && !guideActive) preview.current?.focus({ preventScroll: true });
    guideWasOpen.current = guideActive;
  }, [guideActive]);
  useEffect(() => {
    if (alertWasOpen.current && !alertActive) {
      const opener = dialogOpener.current;
      (opener?.isConnected && opener.getClientRects().length ? opener : canvas.current)?.focus({
        preventScroll: true,
      });
    }
    alertWasOpen.current = alertActive;
  }, [alertActive]);
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
      beforeDisplay: TankPart[];
      from: { x: number; y: number };
      hit?: string;
      moving: boolean;
      moved: boolean;
      selection: PartSelection;
      beforeMarquee: boolean;
      session: SelectionDrag | null;
    } | null>(null),
    pointer = useRef({ x: 0, y: 0 }),
    snapLocked = useRef(false);
  const active = displayedParts.find(
    (p) => p.key === selection.keys.find((key) => !selection.ghosts.includes(key)),
  );
  const palette = orderedPalette(
    PARTS.filter((p) => Math.floor(p.id / 1000) === category),
    paletteContext,
  );
  function setDesign(next: TankDesign | ((previous: TankDesign) => TankDesign)) {
    const value = typeof next === 'function' ? next(designLive.current) : next;
    displayState.retain(value.parts);
    designLive.current = value;
    setDesignState(value);
  }
  function setSelection(next: PartSelection) {
    selectionLive.current = next;
    setSelectionState(next);
  }
  function setMeasuredClass(value: number) {
    classLive.current = value;
    setClassState(value);
  }
  function setSnapshots(next: typeof history) {
    historyLive.current = next;
    setHistory(next);
  }
  function showEditorAlert(message: string) {
    dialogOpener.current = document.activeElement as HTMLElement | null;
    const restored = { ...designLive.current, parts: acceptedEditorParts(historyLive.current) };
    displayState.reset(restored.parts);
    setDesign(restored);
    setMeasuredClass(measureClass(measuredDesign(restored), pack));
    setSelection(emptySelection());
    setDetails(null);
    placement.current = null;
    setPlacing(null);
    nudge.current = null;
    controlBefore.current = null;
    artwork.current?.clearLayer('design');
    artwork.current?.clearLayer('draft');
    setAlertActive(true);
    setAlertRequest({ message });
  }
  function commit(next: TankDesign, updateClass = true) {
    const nextClass = updateClass ? measureClass(measuredDesign(next), pack) : classLive.current,
      nextBudget = next.avatar
        ? gunBudget(nextClass, level)
        : Math.floor(gunBudget(nextClass, 6) * 1.5),
      error = creatorEditError(displayState.present(next.parts), nextClass, maxClass, nextBudget);
    if (error) {
      showEditorAlert(CREATOR_EDIT_ERRORS[error]);
      return false;
    }
    setDesign({ ...next, classId: nextClass });
    setMeasuredClass(nextClass);
    setSnapshots(appendEditorSnapshot(historyLive.current, next.parts));
    setMessage('');
    return true;
  }
  const controlBefore = useRef<{
    saved: TankDesign;
    displayed: TankPart[];
    field: 'scale' | 'rotation';
  } | null>(null);
  const nudge = useRef<{ selection: PartSelection; direction: number } | null>(null);
  const transform = selectedTransform(displayedParts, selection);
  function beginControl(field: 'scale' | 'rotation') {
    const saved = designLive.current;
    controlBefore.current = {
      saved: structuredClone(saved),
      displayed: structuredClone(displayState.present(saved.parts)),
      field,
    };
  }
  function endControl(cancel = false) {
    const before = controlBefore.current;
    controlBefore.current = null;
    if (!before) return;
    // _-1N/_-Xf refresh Script-bound outlines even after a no-op handle release.
    selectionBoxes.current = null;
    if (cancel) {
      displayState.adopt(before.displayed);
      setDesign(before.saved);
    } else
      commit(
        {
          ...designLive.current,
          parts: displayState.saveTransform(
            designLive.current.parts,
            selectionLive.current.keys,
            before.field,
          ),
        },
        before.field === 'scale',
      );
  }
  function nudgedDesign(direction: number, selected: PartSelection, frames = 1) {
    displayState.nudge(selected.keys, direction, frames);
    return {
      ...designLive.current,
      parts: nudgeSelection(designLive.current.parts, selected, direction, frames),
    };
  }
  function beginNudge(direction: number) {
    nudge.current = { selection, direction };
  }
  function endNudge() {
    const current = nudge.current;
    nudge.current = null;
    if (!current) return;
    // Target MOUSE_UP records held motion before stage selection callbacks.
    // The separate CLICK reads the surviving selection after those callbacks.
    commit(designLive.current, false);
  }
  function changePart(change: { rotation?: number; scale?: number }) {
    const saved = designLive.current;
    const transformed = unlinkPartialSelection(
      transformSelection(displayState.present(saved.parts), selection, change),
      selection,
    );
    displayState.adopt(transformed);
    const next = {
      ...saved,
      parts: editorDisplayTopology(saved.parts, transformed),
    };
    if (controlBefore.current) setDesign(next);
    else {
      // Accessible range input commits immediately; pointer gestures wait for release.
      marqueePending.current = false;
      const field = change.scale !== undefined ? 'scale' : 'rotation';
      commit(
        { ...next, parts: displayState.saveTransform(next.parts, selection.keys, field) },
        field === 'scale',
      );
    }
  }
  function draw() {
    const parts = displayState.present(designLive.current.parts);
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, 700, 700);
    ctx.save();
    ctx.scale(2, 2);
    ctx.translate(175, 175);
    const rings = pack.creatorFrames.get(`rings:${maxClass}`);
    if (!rings) {
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
        parts.map((part) => ({
          part,
          alpha: selection.ghosts.includes(part.key) ? 0.25 : 1,
        })),
        artworkFrame.current,
      );
    if (
      !selectionBoxes.current ||
      (!controlBefore.current &&
        (selectionBoxes.current.parts !== parts || selectionBoxes.current.selection !== selection))
    )
      selectionBoxes.current = { parts: parts, selection, boxes: new Map() };
    const selectionMoving = !!(drag.current?.moved && drag.current.moving);
    for (const p of parts) {
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
    if (
      iconSnapshot.current?.boxes !== selectionBoxes.current ||
      iconSnapshot.current?.hidden !== selectionMoving
    ) {
      iconSnapshot.current = { boxes: selectionBoxes.current, hidden: selectionMoving };
      setSelectionIcons(
        selectionMoving
          ? []
          : creatorWeaponIcons(parts, selection.keys, selectionBoxes.current.boxes),
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
      const viewer = CREATOR_PALETTE.details.viewer;
      dc.translate(viewer.matrix.tx / 20 - viewer.mask.x, viewer.matrix.ty / 20 - viewer.mask.y);
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
              const next = nudgedDesign(direction, selection, frames);
              setDesign(next);
              setMeasuredClass(measureClass(measuredDesign(next), pack));
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
    return stageDisplayPoint(e, canvas.current!.closest('.creator')!, CREATOR_CONTROLS.workspace);
  }
  function releaseMarquee(
    release: { x: number; y: number },
    rectangle?: { from: { x: number; y: number }; to: { x: number; y: number } },
  ) {
    const saved = designLive.current.parts;
    const next = marqueeSelection(
      displayState.present(saved),
      selectionLive.current,
      rectangle?.from ?? release,
      rectangle?.to ?? release,
      symmetric,
      hitPart,
      { saved, release, rectangle: !!rectangle },
    );
    // _-bp refreshes both handles even when membership did not change.
    setSelection({ keys: [...next.keys], ghosts: [...next.ghosts] });
    selectionBoxes.current = null;
  }
  function stageSelectionRelease(event: React.PointerEvent, release = point(event)) {
    if (
      event.button !== 0 ||
      workspaceSuspended.current ||
      guideActive ||
      alertActive ||
      saveDialog ||
      releasedEvents.current.has(event.nativeEvent)
    )
      return;
    releasedEvents.current.add(event.nativeEvent);
    // _-0m remains registered after _-bp clears its painted rectangle. Only
    // the workspace CLICK or _-JQ rebind clears the retained marquee flag.
    if (marqueePending.current) releaseMarquee(release);
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
    workspaceSuspended.current = mode === 'pointer';
    setDetails(null);
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
    workspaceSuspended.current = false;
    marqueePending.current = false;
    placement.current = null;
    setPlacing(null);
    if (!cancel) {
      const added = acceptedPlacement(
        pendingPlacement(gesture.id, pos, `part-${Date.now()}-${nextPart.current++}`),
        classId,
        maxClass,
      );
      const parts = [...design.parts, ...added];
      artwork.current?.adoptDraft(added);
      artwork.current?.clearLayer('draft');
      commit({ ...design, parts });
      const lastType = designLive.current.parts.at(-1)?.type ?? 0;
      if (lastType >= 1500 && lastType <= 1600)
        artwork.current?.restartClusters(designLive.current.parts);
    }
  }
  function finishDrag(cancel = false, release = pointer.current) {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    if (cancel) {
      marqueePending.current = current.beforeMarquee;
      displayState.adopt(current.beforeDisplay);
      setDesign(current.before);
      setSelection(current.selection);
    } else if (current.moved && current.moving) {
      const final = current.session!;
      if (marqueePending.current) releaseMarquee(release);
      const selected = selectionLive.current;
      snapLocked.current = final.locked;
      const invalid = final.parts
        .filter((p) => selected.keys.includes(p.key) && !canPlacePart(p, classId, maxClass))
        .map((p) => p.key);
      const released = displayState.saveSelected(designLive.current.parts, selected.keys);
      const parts = removeParts(unlinkPartialSelection(released, selected), invalid);
      if (commit({ ...design, parts }))
        setSelection({
          keys: selected.keys.filter((k) => !invalid.includes(k)),
          ghosts: selected.ghosts.filter((k) => !invalid.includes(k)),
        });
      if (Math.abs(release.x) <= 175 && Math.abs(release.y) <= 175) marqueePending.current = false;
    } else if (current.moved) {
      releaseMarquee(release, { from: current.from, to: pointer.current });
    } else {
      if (marqueePending.current) releaseMarquee(release);
      else if (Math.abs(release.x) <= 175 && Math.abs(release.y) <= 175)
        setSelection(toggleSelection(design.parts, selectionLive.current, current.hit, symmetric));
      if (Math.abs(release.x) <= 175 && Math.abs(release.y) <= 175) marqueePending.current = false;
    }
    draw();
  }
  const workspace = pack.creatorFrames.get(`rings:${maxClass}`);
  const editor = (
    <div
      className={`creator stage-background ${overGame ? 'over-game' : ''}`}
      data-assets={pack.mode}
      data-design={JSON.stringify(finalDesign)}
      data-displayed-design={JSON.stringify({ ...finalDesign, parts: displayedParts })}
      inert={!!saveDialog || guideActive || alertActive}
      aria-hidden={!!saveDialog || guideActive || alertActive || undefined}
      onPointerDownCapture={(event) => canceledPointers.current.delete(event.pointerId)}
      onPointerCancelCapture={(event) => canceledPointers.current.add(event.pointerId)}
      onLostPointerCaptureCapture={(event) => {
        if (event.buttons & 1) canceledPointers.current.add(event.pointerId);
      }}
      onPointerUpCapture={(event) => {
        if (canceledPointers.current.delete(event.pointerId))
          releasedEvents.current.add(event.nativeEvent);
      }}
      onPointerUp={stageSelectionRelease}
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
        onClick={() => {
          setDetails(null);
          onLoad({
            avatar: design.avatar,
            level,
            maxClass,
            gunPoints: budget,
            unlockedParts,
            profileMaxClass,
          });
        }}
      />
      <CreatorButton
        pack={pack}
        name="SaveExit_mc"
        label="SAVE"
        onClick={() => {
          setDetails(null);
          const error = creatorSavePrerequisite(finalDesign);
          if (error) {
            showEditorAlert(error);
            return;
          }
          const tank = {
            ...finalDesign,
            ...(!design.avatar && suggested ? creatorSuggestedStats(finalDesign, 'save') : {}),
          };
          setDesign(tank);
          dialogOpener.current = document.activeElement as HTMLElement | null;
          setSaveDialog({
            kind: 'save',
            tank,
          });
        }}
      />
      <CreatorButton
        pack={pack}
        name="Exit_mc"
        label="Exit tank creator"
        onClick={() => {
          setDetails(null);
          dialogOpener.current = document.activeElement as HTMLElement | null;
          setSaveDialog({ kind: 'exit', tank: finalDesign });
        }}
      />
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
        {workspace && (
          <img
            className="creator-workspace-rings"
            src={workspace.url}
            alt=""
            draggable={false}
            style={{
              left: CREATOR_CONTROLS.workspace.tx / 20 + workspace.x,
              top: CREATOR_CONTROLS.workspace.ty / 20 + workspace.y,
              width: workspace.width,
              height: workspace.height,
            }}
          />
        )}
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
            const hit = [...displayedParts].reverse().find((p) => hitPart(p, pos.x, pos.y));
            const moving = displayedParts.some(
              (p) => selection.keys.includes(p.key) && hitPart(p, pos.x, pos.y),
            );
            drag.current = {
              before: structuredClone(design),
              beforeDisplay: structuredClone(displayedParts),
              from: pos,
              hit: hit?.key,
              moving,
              moved: false,
              selection,
              beforeMarquee: marqueePending.current,
              session: null,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const pos = point(e);
            pointer.current = pos;
            const current = drag.current;
            if (current) {
              // _-5M/_-QV begin on the first move event, including zero delta.
              // A delivered move suppresses the following click selection toggle.
              current.moved = true;
              if (current.moved && current.moving) {
                current.session = advanceSelectionDrag(
                  current.session ??
                    beginSelectionDrag(
                      current.beforeDisplay,
                      current.selection,
                      current.from,
                      symmetric,
                      snapLocked.current,
                      pos,
                    ),
                  pos,
                );
                displayState.adopt(current.session.parts);
                setDesign({
                  ...designLive.current,
                  parts: editorDisplayTopology(designLive.current.parts, current.session.parts),
                });
                setSelection(current.session.selection);
              } else {
                marqueePending.current = true;
                draw();
              }
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
          onPointerUp={(event) => {
            if (event.button !== 0) return;
            releasedEvents.current.add(event.nativeEvent);
            finishDrag(false, point(event));
          }}
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
      {/* Source hides these clips without removing their later CLICK listeners. */}
      <div hidden={!active}>
        <span className="sr-only" role="status">
          Selected parts ({selection.keys.length})
        </span>
        <CreatorButton
          pack={pack}
          name="DeleteButton_mc"
          label="Delete selected part"
          releaseAction
          onClick={() => {
            commit({
              ...designLive.current,
              parts: removeParts(designLive.current.parts, selectionLive.current.keys),
            });
            setSelection(emptySelection());
          }}
        />
        <CreatorButton
          pack={pack}
          name="BringFront_mc"
          label="To front"
          onClick={() =>
            commit(
              {
                ...designLive.current,
                parts: orderSelection(designLive.current.parts, selectionLive.current, true),
              },
              false,
            )
          }
        />
        <CreatorButton
          pack={pack}
          name="SendBack_mc"
          label="To back"
          onClick={() =>
            commit(
              {
                ...designLive.current,
                parts: orderSelection(designLive.current.parts, selectionLive.current, false),
              },
              false,
            )
          }
        />
        <CreatorButton
          pack={pack}
          name="AlignCenter_mc"
          label="Align to Center"
          onClick={() => {
            const selected = selectionLive.current;
            const next = centerSelection(displayState.present(designLive.current.parts), selected);
            displayState.center(selected.keys);
            const parts = next.parts.map((part) => {
              const saved = design.parts.find((p) => p.key === part.key)!;
              return {
                ...part,
                x: saved.x,
                y: selected.keys.includes(part.key) ? 0 : saved.y,
                rotation: saved.rotation,
                scale: saved.scale,
              };
            });
            if (commit({ ...design, parts })) setSelection(next.selection);
          }}
        />
        {([-1, 1] as const).map((direction) => (
          <CreatorButton
            key={direction}
            pack={pack}
            name={direction < 0 ? 'Left_mc' : 'Right_mc'}
            label={direction < 0 ? 'Move selection left' : 'Move selection right'}
            onClick={() => {
              const next = nudgedDesign(direction, selectionLive.current);
              setDesign(next);
              setMeasuredClass(measureClass(measuredDesign(next), pack));
            }}
            onKeyboardClick={() => commit(nudgedDesign(direction, selectionLive.current))}
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
            point={(event, handle) =>
              stageDisplayPoint(
                event,
                canvas.current!.closest('.creator')!,
                layout.matrix,
                displayMatrixProduct(layout.matrix, {
                  ...DISPLAY_IDENTITY,
                  tx: displayTwips(handle.x),
                  ty: displayTwips(handle.y),
                }),
              )
            }
            onChange={(value) =>
              changePart(layout.name === 'Resize_mc' ? { scale: value } : { rotation: value })
            }
            onBegin={() => beginControl(layout.name === 'Resize_mc' ? 'scale' : 'rotation')}
            onEnd={endControl}
            onRelease={(event, handle) =>
              stageSelectionRelease(
                event,
                stageDisplayPoint(
                  event,
                  canvas.current!.closest('.creator')!,
                  CREATOR_CONTROLS.workspace,
                  displayMatrixProduct(layout.matrix, {
                    ...DISPLAY_IDENTITY,
                    tx: displayTwips(handle.x),
                    ty: displayTwips(handle.y),
                  }),
                ),
              )
            }
          />
        ))}
      </div>
      <CreatorButton
        pack={pack}
        name="Undo_mc"
        label="Undo"
        disabled={history.length <= 1}
        onClick={() => {
          const next = undoEditorSnapshot(historyLive.current),
            restored = { ...designLive.current, parts: acceptedEditorParts(next) };
          setSnapshots(next);
          displayState.reset(restored.parts);
          setDesign(restored);
          setMeasuredClass(measureClass(measuredDesign(restored), pack));
          artwork.current?.clearLayer('design');
          setSelection(emptySelection());
          setMessage('');
        }}
      />
      {message ? (
        <p role="alert" className="creator-message">
          {message}
        </p>
      ) : null}
      <CreatorPaletteFrame pack={pack} />
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
        onPointerUp={() => finishPlacement(pointer.current)}
        onPointerCancel={() => finishPlacement(pointer.current, true)}
        onClick={(e) => {
          if (e.detail !== 0 || chosen === null) return;
          beginPlacement(chosen, 'keyboard', { x: 0, y: 0 });
          canvas.current?.focus();
        }}
      >
        <canvas ref={previewCanvas} width={282} height={134} aria-hidden="true" />
      </button>
      <CreatorPaletteTabs
        pack={pack}
        avatar={design.avatar}
        category={category}
        onCategory={(id) => {
          setDetails(null);
          setAdvanced(false);
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
        detailsId={details ? detailsId : undefined}
        onScrollStart={() => {
          workspaceSuspended.current = true;
        }}
        onScrollEnd={() => {
          workspaceSuspended.current = false;
          marqueePending.current = false;
        }}
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
  );
  return (
    <>
      {editor}
      {guideActive ? (
        <CreatorGuide
          pack={pack}
          seen={false}
          onStart={onHelpStart}
          onClose={() => setGuideActive(false)}
        />
      ) : null}
      <CreatorAlert pack={pack} fps={fps} request={alertRequest} onActiveChange={setAlertActive} />
      {saveDialog ? (
        <CreatorSaveDialog
          pack={pack}
          kind={saveDialog.kind}
          tank={saveDialog.tank}
          initialName={initialSaveName}
          opener={dialogOpener.current}
          onSave={onSave}
          onClose={() => setSaveDialog(null)}
          onExit={onExit}
        />
      ) : null}
    </>
  );
}
