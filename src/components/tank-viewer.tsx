'use client';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { TankDesign } from '@/game/core/types';
import type { StageRuntime } from '@/game/services/stage-runtime';
import {
  TANK_VIEWER,
  viewerWidget,
  viewerRoot,
  localViewerTanks,
  sortViewerTanks,
  viewerSelectionError,
  viewerPartSummary,
  type ViewerLimits,
  type ViewerPiece,
} from '@/game/core/tank-viewer';
import { costs, AVATARS, ENEMIES } from '@/game/data/catalog';
import { decodeTankCode, encodeTankCode } from '@/game/services/tank-code';
import { community } from '@/game/services/extensions';
import { TankViewerSort } from './tank-viewer-sort';
import { TankViewerStatistics } from './tank-viewer-statistics';
import { useViewerFade } from './viewer-fades';
import { CreatorText } from './creator-text';
import { viewerCardName, type ViewerPane } from '@/game/core/viewer-panes';
import { ViewerCodeFlow, viewerToolbarName } from '@/game/core/viewer-code-flow';
import {
  initialViewerNavigation,
  navigateViewer,
  type ViewerNavigationAction,
} from '@/game/core/viewer-navigation';
import { ViewerPaneLayer } from './viewer-pane-layer';
import { useViewerHighlights } from './viewer-highlights';
import {
  ViewerArt,
  ViewerFields,
  ViewerButton,
  ViewerGroup,
  useViewerArtwork,
  type ViewerJob,
} from './tank-viewer-art';
const builtinIds = new Set([...AVATARS, ...ENEMIES].map((t) => t.id));
function SourceModal({
  label,
  onClose,
  children,
  active = true,
  motionRef,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  active?: boolean;
  motionRef?: RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) ref.current?.focus({ preventScroll: true });
  }, [active]);
  return (
    <div
      ref={(node) => {
        ref.current = node;
        if (motionRef) motionRef.current = node;
      }}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="viewer-modal"
      inert={!active}
      aria-hidden={!active || undefined}
      style={{ pointerEvents: active ? undefined : 'none' }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        if (e.key === 'Tab') {
          const items = Array.from(
              ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),textarea,input') ??
                [],
            ),
            first = items[0],
            last = items.at(-1);
          if (
            e.shiftKey &&
            (document.activeElement === first || document.activeElement === ref.current)
          ) {
            e.preventDefault();
            last?.focus();
          } else if (
            !e.shiftKey &&
            (document.activeElement === last || document.activeElement === ref.current)
          ) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      {children}
    </div>
  );
}
export function TankViewer({
  pack,
  stage,
  tanks,
  avatar,
  limits,
  onSelect,
  onBack,
  onSaveLocal,
  onDelete,
  helpSeen,
  onHelpComplete,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  tanks: TankDesign[];
  avatar: boolean;
  limits: ViewerLimits;
  onSelect: (tank: TankDesign) => void;
  onBack: () => void;
  onSaveLocal: (tank: TankDesign) => void;
  onDelete: (id: string) => void;
  helpSeen: boolean;
  onHelpComplete: () => void;
}) {
  const local = useMemo(() => localViewerTanks(tanks, avatar), [tanks, avatar]);
  const [codeFlow] = useState(() => new ViewerCodeFlow(avatar));
  const panes = codeFlow.panes,
    fades = codeFlow.fades;
  const paneView = useSyncExternalStore(panes.subscribe, panes.getSnapshot, panes.getSnapshot);
  const initialLocal = useRef(local);
  const [guide, setGuide] = useState(helpSeen ? 0 : 1);
  const [navigation, setNavigation] = useState(() => initialViewerNavigation(local.length));
  const { offset, detail } = navigation;
  const [queue, setQueue] = useState<TankDesign[] | null>(null),
    [ready, setReady] = useState(false),
    [description, setDescription] = useState(''),
    [confirmation, setConfirmation] = useState<{
      tank: TankDesign;
      deleting: boolean;
      instance: number;
    } | null>(null),
    [codeOpen, setCodeOpen] = useState(false),
    [code, setCode] = useState(''),
    [codePrompt, setCodePrompt] = useState(true),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState<Set<string>>(() => new Set()),
    [sortOpen, setSortOpen] = useState(false);
  const canvases = useRef(new Map<string, HTMLCanvasElement>()),
    instances = useRef(0),
    codeRequest = useRef(0),
    mounted = useRef(true),
    opener = useRef<HTMLElement | null>(null);
  const confirmationLayer = useViewerFade(confirmation, 'confirmation', fades, true),
    codeLayer = useViewerFade(codeOpen ? true : null, 'code', fades),
    messageLayer = useViewerFade(message || null, 'message', fades),
    shownConfirmation = confirmationLayer.value;
  const all = queue ?? local,
    selected = paneView.detail?.tank,
    covered = !!confirmation || codeOpen || !!message || (ready && guide > 0);
  const highlights = useViewerHighlights(
    pack,
    stage,
    paneView.cards,
    limits,
    ready && !detail && !covered,
  );
  const jobs: ViewerJob[] = ready
    ? [
        ...paneView.cards.flatMap((p) => (p?.ownsArt ? [{ pane: p, fit: true }] : [])),
        ...(paneView.detail?.ownsArt ? [{ pane: paneView.detail, fit: false }] : []),
      ].map(({ pane, fit }) => ({
        key: pane.instance,
        tank: pane.tank,
        fit,
        canvas: () => canvases.current.get(pane.instance) ?? null,
        highlighted: () =>
          fit && highlights.model.rows.some((row) => row.instance === pane.instance && row.glow),
      }))
    : [];
  if (confirmation)
    jobs.push({
      key: `confirm:${confirmation.instance}`,
      tank: confirmation.tank,
      fit: false,
      canvas: () => canvases.current.get(`confirm:${confirmation.instance}`) ?? null,
    });
  const artworkError = useViewerArtwork(pack, stage, jobs);
  useEffect(() => stage.subscribe({ step: () => fades.step() }), [fades, stage]);
  useEffect(() => {
    if (ready) panes.setup(initialLocal.current.slice(0, 4));
  }, [ready, panes]);
  useEffect(() => {
    mounted.current = true;
    let frames = 0;
    const count = Math.ceil((local.length + 1) / 5) + 1;
    const unsubscribe = stage.subscribe({
      step: () => {
        if (++frames === count) setReady(true);
      },
    });
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [stage, avatar]);
  useEffect(() => {
    if (!covered) opener.current?.focus({ preventScroll: true });
  }, [covered]);
  function capture() {
    opener.current = document.activeElement as HTMLElement | null;
  }
  function navigate(action: ViewerNavigationAction, length = all.length) {
    const next = navigateViewer(navigation, length, action);
    setNavigation(next);
    return next;
  }
  function reset(list: TankDesign[] | null = null, sorted = false) {
    codeFlow.localPosition();
    setQueue(list);
    navigate({ type: sorted ? 'sort' : 'local' }, (list ?? local).length);
    const page = (list ?? local).slice(0, 4);
    if (detail) panes.returnToCards(page);
    else panes.setup(page);
    setCopied(new Set());
    setSortOpen(false);
  }
  function confirm(tank: TankDesign, deleting = false) {
    const error = !deleting && viewerSelectionError(tank, avatar, limits);
    capture();
    if (error) {
      setMessage(error);
      return;
    }
    const index = paneView.cards.findIndex((p) => p?.tank === tank);
    if (index !== -1) highlights.model.clear(index);
    setConfirmation({ tank, deleting, instance: ++instances.current });
  }
  async function copy(tank: TankDesign) {
    try {
      await navigator.clipboard.writeText(await encodeTankCode(tank));
      if (mounted.current) setCopied((old) => new Set([...old, tank.id]));
    } catch (e) {
      if (mounted.current) {
        capture();
        setMessage(e instanceof Error ? e.message : 'Unable to copy this tank.');
      }
    }
  }
  async function unavailable() {
    capture();
    try {
      await community.search({ avatar });
    } catch (e) {
      if (mounted.current)
        setMessage(e instanceof Error ? e.message : 'Community tank search is not connected.');
    }
  }
  async function readCode() {
    const request = ++codeRequest.current;
    setBusy(true);
    try {
      const tank = await decodeTankCode(code);
      if (tank.avatar !== avatar) throw new Error(`Load an ${avatar ? 'avatar' : 'enemy'} tank.`);
      if (mounted.current && request === codeRequest.current) {
        returnFromCode([tank]);
      }
    } catch (e) {
      if (mounted.current && request === codeRequest.current) {
        returnFromCode([]);
        setMessage(
          e instanceof Error ? e.message : "The tank(s) you've requested could not be loaded.",
        );
      }
    } finally {
      if (mounted.current && request === codeRequest.current) setBusy(false);
    }
  }
  function returnFromCode(imported?: TankDesign[]) {
    codeRequest.current++;
    const next = imported ?? all;
    if (imported) setQueue(imported);
    setCodeOpen(false);
    setBusy(false);
    navigate({ type: 'code' }, next.length);
    setCopied(new Set());
    setDescription('');
    if (busy || imported) codeFlow.returnAfterRead(next);
    else codeFlow.returnToView(next);
  }
  function closeCode() {
    returnFromCode();
  }
  function openCode() {
    capture();
    codeFlow.open(detail);
    setCode('');
    setCodePrompt(true);
    setSortOpen(false);
    setDescription('');
    setCodeOpen(true);
  }
  function page(direction: -1 | 0 | 1) {
    const next = navigate({ type: 'page', direction });
    if (detail && all[next.offset]) panes.replaceDetail(all[next.offset]);
    else {
      panes.setup(all.slice(next.offset, next.offset + 4));
      if (!all[next.offset]) setMessage("The tank(s) you've requested could not be loaded.");
    }
    setCopied(new Set());
  }
  function canvas(key: string, tank: TankDesign) {
    return (
      <canvas
        width={1100}
        height={1100}
        aria-label={`${tank.name} animated tank preview`}
        ref={(node) => {
          if (node) canvases.current.set(key, node);
          else canvases.current.delete(key);
        }}
        className="viewer-tank-art"
        data-viewer-instance={key}
      />
    );
  }
  function button(
    piece: ViewerPiece,
    label: string,
    action: () => void,
    disabled = false,
    done = false,
  ) {
    return (
      <ViewerButton
        key={piece.name}
        pack={pack}
        piece={piece}
        label={label}
        onClick={action}
        disabled={disabled}
        done={done}
        onHover={setDescription}
      />
    );
  }
  const row = viewerWidget(1176),
    rowButtons = viewerWidget(1116),
    detailWidget = viewerWidget(1169),
    confirmWidget = viewerWidget(1403, confirmation?.deleting ? 2 : 1),
    codeWidget = viewerWidget(1386, 4);
  function card(pane: ViewerPane, index: number) {
    const tank = pane.tank;
    const place = viewerRoot(`TankLoad${index + 1}_mc`),
      selection = row.children.find((p) => p.name === 'btnTankSelect_mc')!,
      b = selection.bounds,
      key = pane.instance,
      error = viewerSelectionError(tank, avatar, limits);
    return (
      <ViewerGroup key={tank.id} matrix={place.matrix} className="viewer-card">
        <ViewerArt pack={pack} symbol={1176} />
        <div
          className="viewer-preview-mask"
          style={{
            left: TANK_VIEWER.mask.x,
            top: TANK_VIEWER.mask.y,
            width: TANK_VIEWER.mask.width,
            height: TANK_VIEWER.mask.height,
          }}
        >
          <div
            style={{ position: 'absolute', left: -TANK_VIEWER.mask.x, top: -TANK_VIEWER.mask.y }}
          >
            {pane.ownsArt ? canvas(key, tank) : null}
          </div>
        </div>
        <div
          className="viewer-group"
          ref={(node) => {
            highlights.lines.current[index] = node;
          }}
        >
          <ViewerGroup matrix={row.children.find((p) => p.name === 'lines_mc')!.matrix}>
            <ViewerArt pack={pack} symbol={1173} />
          </ViewerGroup>
        </div>
        <ViewerGroup matrix={selection.matrix}>
          <button
            className="viewer-select-tank"
            aria-label={`Load ${tank.name}`}
            style={{ left: b.x, top: b.y, width: b.width, height: b.height }}
            onClick={() => confirm(tank)}
            onPointerEnter={() => {
              setDescription(error || 'Select this tank');
            }}
            onPointerLeave={() => {
              setDescription('');
            }}
            onFocus={() => {
              highlights.focused.current = index;
            }}
            onBlur={() => {
              highlights.focused.current = null;
            }}
          />
        </ViewerGroup>
        <ViewerGroup matrix={row.children.find((p) => p.name === 'ButtonsContainer')!.matrix}>
          <ViewerArt pack={pack} symbol={1116} />
          <ViewerFields
            pack={pack}
            symbol={1116}
            values={{
              txtTankName_txt: tank.name,
              txtClass_txt: `Class: ${tank.classId}`,
              txtBubbles_txt: String(costs(tank.parts).bp),
              txtGP_txt: String(costs(tank.parts).gp),
            }}
          />
          {rowButtons.children
            .filter((p) =>
              ['btnDetails_mc', 'btnCopy_mc', 'btnDelete_mc', 'btnSave_mc'].includes(p.name),
            )
            .map((p) => {
              if (
                (p.name === 'btnDelete_mc' && builtinIds.has(tank.id)) ||
                (p.name === 'btnSave_mc' && local.some((t) => t.id === tank.id))
              )
                return null;
              return button(
                p,
                `${p.name === 'btnDetails_mc' ? 'Details for' : p.name === 'btnCopy_mc' ? 'Copy code for' : p.name === 'btnDelete_mc' ? 'Delete' : 'Save locally'} ${tank.name}`,
                () => {
                  if (p.name === 'btnDetails_mc') {
                    highlights.model.clear(index);
                    panes.detail(index);
                    navigate({ type: 'detail', index: offset + index });
                  } else if (p.name === 'btnCopy_mc') void copy(tank);
                  else if (p.name === 'btnDelete_mc') confirm(tank, true);
                  else onSaveLocal(tank);
                },
                false,
                p.name === 'btnCopy_mc' && copied.has(tank.id),
              );
            })}
          <div
            className="viewer-group"
            ref={(node) => {
              highlights.cautions.current[index] = node;
            }}
          >
            <ViewerGroup
              matrix={rowButtons.children.find((p) => p.name === 'CautionSign_mc')!.matrix}
            >
              <ViewerArt pack={pack} symbol={1115} />
            </ViewerGroup>
          </div>
        </ViewerGroup>
      </ViewerGroup>
    );
  }
  return (
    <div
      ref={highlights.host}
      className="tank-viewer"
      onPointerMove={(e) => {
        highlights.pointer.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerLeave={() => {
        highlights.pointer.current = null;
      }}
      data-viewer-type={avatar ? 'Avatar' : 'Enemy'}
      data-viewer-ready={String(ready)}
      data-guide-page={ready ? guide : 0}
    >
      {artworkError ? (
        <p className="viewer-art-error" role="alert">
          {artworkError}
        </p>
      ) : null}
      <div className="viewer-content" inert={covered} aria-hidden={covered || undefined}>
        {!ready ? (
          <ViewerGroup matrix={{ a: 1, b: 0, c: 0, d: 1, tx: 5500, ty: 4500 }}>
            <ViewerArt pack={pack} symbol={1431} />
            <ViewerFields
              pack={pack}
              symbol={1431}
              values={{ txtLoading_txt: 'Loading Tanks...', txtErrorMessage_txt: '' }}
            />
          </ViewerGroup>
        ) : null}
        {ready
          ? paneView.cards.map((pane, index) =>
              pane ? (
                <ViewerPaneLayer
                  key={pane.instance}
                  fades={fades}
                  name={viewerCardName(index)}
                  active={!detail && !codeOpen}
                >
                  {card(pane, index)}
                </ViewerPaneLayer>
              ) : null,
            )
          : null}
        {selected && paneView.detail ? (
          <ViewerPaneLayer fades={fades} name="detail" active={detail && !codeOpen}>
            <ViewerGroup className="viewer-detail" matrix={viewerRoot('DetailedTank_mc').matrix}>
              <ViewerArt pack={pack} symbol={1169} />
              {canvas(paneView.detail.instance, selected)}
              <ViewerFields
                pack={pack}
                symbol={1169}
                opacities={{ txtTankData_txt: 0.8 }}
                values={{
                  largeName_txt: selected.name,
                  largeAuthor_txt: `By ${selected.author}`,
                  txtTankID_txt: `Tank ID: ${selected.id}`,
                  txtTankData_txt: viewerPartSummary(selected),
                  txtHealth_txt: selected.avatar ? '' : `Health: ${selected.life}`,
                  txtBubblesReturned_txt: selected.avatar
                    ? ''
                    : `Bubbles Returned: ${selected.reward}`,
                  txtSpeed_txt: selected.avatar ? '' : `Speed: ${selected.speed}`,
                  txtDiffRating_txt: selected.avatar
                    ? ''
                    : `Difficulty Rating: ${selected.difficulty}`,
                }}
              />
              <TankViewerStatistics pack={pack} stage={stage} tank={selected} />
              {detailWidget.children
                .filter((p) =>
                  ['btnLargeBack_mc', 'btnLargeDelete_mc', 'btnCopy_mc', 'btnLargeSave'].includes(
                    p.name,
                  ),
                )
                .map((p) => {
                  if (
                    (p.name === 'btnLargeDelete_mc' && builtinIds.has(selected.id)) ||
                    (p.name === 'btnLargeSave' && local.some((t) => t.id === selected.id))
                  )
                    return null;
                  return button(
                    p,
                    p.name === 'btnLargeBack_mc'
                      ? 'Return to small view'
                      : `${p.name === 'btnCopy_mc' ? 'Copy code for' : p.name === 'btnLargeDelete_mc' ? 'Delete' : 'Save locally'} ${selected.name}`,
                    () => {
                      if (p.name === 'btnLargeBack_mc') {
                        const next = navigate({ type: 'cards' });
                        panes.returnToCards(all.slice(next.offset, next.offset + 4));
                      } else if (p.name === 'btnCopy_mc') void copy(selected);
                      else if (p.name === 'btnLargeDelete_mc') confirm(selected, true);
                      else onSaveLocal(selected);
                    },
                    false,
                    p.name === 'btnCopy_mc' && copied.has(selected.id),
                  );
                })}
            </ViewerGroup>
          </ViewerPaneLayer>
        ) : null}
        {ready
          ? TANK_VIEWER.root
              .filter(
                (p) =>
                  p.name.startsWith('btn') &&
                  ![
                    'btnLoadCurrentProfile_mc',
                    'btnMyAvatar_mc',
                    'btnCreateATank_mc',
                    'btnSortTanks_mc',
                    'btnCurrentPoints_mc',
                  ].includes(p.name),
              )
              .map((p) => (
                <ViewerPaneLayer
                  key={p.name}
                  name={viewerToolbarName(p.name)}
                  fades={fades}
                  active={!codeOpen}
                >
                  {button(
                    p,
                    (
                      {
                        btnFirst_mc: 'First page',
                        btnPrev_mc: 'Previous page',
                        btnNext_mc: 'Next page',
                        btnMainMenu_mc: 'Return to Tank Creator',
                        btnSearchForTanks_mc: 'Search for tanks online',
                        btnEnterTankID_mc: 'Enter tank ID',
                        btnEnterTankCode_mc: 'View tank from code',
                        btnViewLocalTanks_mc: 'View local tanks',
                      } as Record<string, string>
                    )[p.name],
                    () => {
                      if (p.name === 'btnMainMenu_mc') onBack();
                      else if (p.name === 'btnFirst_mc') page(0);
                      else if (p.name === 'btnPrev_mc') page(-1);
                      else if (p.name === 'btnNext_mc') page(1);
                      else if (p.name === 'btnEnterTankCode_mc') openCode();
                      else if (p.name === 'btnViewLocalTanks_mc') reset();
                      else void unavailable();
                    },
                    p.name === 'btnFirst_mc'
                      ? !navigation.first
                      : p.name === 'btnPrev_mc'
                        ? !navigation.previous
                        : p.name === 'btnNext_mc'
                          ? !navigation.next
                          : false,
                  )}
                </ViewerPaneLayer>
              ))
          : null}
        <ViewerPaneLayer
          name={viewerToolbarName('btnSortTanks_mc')}
          fades={fades}
          active={!codeOpen}
        >
          <TankViewerSort
            x={codeFlow.sortX}
            pack={pack}
            stage={stage}
            open={sortOpen}
            enabled={ready && !detail}
            onOpen={setSortOpen}
            onHover={setDescription}
            onSort={(sort) => {
              reset(sortViewerTanks(all, sort), true);
            }}
          />
        </ViewerPaneLayer>
        {ready && avatar ? (
          <ViewerPaneLayer
            name={viewerToolbarName('btnCurrentPoints_mc')}
            fades={fades}
            active={!codeOpen}
          >
            <ViewerGroup matrix={viewerRoot('btnCurrentPoints_mc').matrix}>
              <ViewerArt pack={pack} symbol={1258} />
              <ViewerFields
                pack={pack}
                symbol={1258}
                values={{
                  txtClass_txt: String(limits.maxClass),
                  txtBBL_txt: '100',
                  txtGP_txt: String(limits.gunPoints),
                }}
              />
            </ViewerGroup>
          </ViewerPaneLayer>
        ) : null}
        {ready ? (
          <ViewerFields
            pack={pack}
            symbol={1413}
            values={{
              txtPageNumCurrent_txt: codeOpen
                ? ''
                : detail
                  ? `Tank: ${offset + 1} out of: ${all.length}`
                  : `Page: ${navigation.page} out of: ${Math.ceil(all.length / 4)}`,
              txtExplination_txt: description,
            }}
          />
        ) : null}
      </div>
      {ready && guide > 0 ? (
        <SourceModal label="Tank viewer guide" onClose={() => setGuide(0)}>
          <span className="sr-only">
            {guide === 1
              ? 'Welcome to the Tank Viewer Screen!'
              : 'View built-in and saved tanks. Online sharing is offline. Search through your locally stored tanks here.'}
          </span>
          <ViewerGroup matrix={viewerRoot('Tutorial_mc').matrix}>
            <ViewerArt pack={pack} symbol={1412} frame={guide} />
            {guide === 2 ? (
              <ViewerGroup matrix={TANK_VIEWER.guideNote.matrix}>
                <CreatorText
                  pack={pack}
                  field={TANK_VIEWER.guideNote}
                  text={'View built-in and saved tanks.\nOnline sharing is offline.'}
                />
              </ViewerGroup>
            ) : null}
            {viewerWidget(1412, guide)
              .children.filter((p) => guide === 2 || p.name !== 'back_mc')
              .map((p) =>
                button(p, p.name === 'back_mc' ? 'Previous guide page' : 'Next guide page', () => {
                  if (p.name === 'back_mc') setGuide(1);
                  else if (guide === 1) setGuide(2);
                  else {
                    setGuide(0);
                    onHelpComplete();
                  }
                }),
              )}
          </ViewerGroup>
        </SourceModal>
      ) : null}
      {shownConfirmation ? (
        <SourceModal
          active={!!confirmation}
          motionRef={confirmationLayer.ref}
          label={`${shownConfirmation.deleting ? 'Delete' : 'Load'} ${shownConfirmation.tank.name}?`}
          onClose={() => setConfirmation(null)}
        >
          <ViewerGroup matrix={viewerRoot('selectTankScreen_mc').matrix}>
            <ViewerArt pack={pack} symbol={1403} frame={confirmation?.deleting ? 2 : 1} />
            {confirmation
              ? canvas(`confirm:${shownConfirmation.instance}`, shownConfirmation.tank)
              : null}
            {confirmWidget.children.map((p) =>
              button(p, p.name === 'btnYes_mc' ? 'Yes' : 'No', () => {
                if (p.name === 'btnYes_mc') {
                  if (shownConfirmation.deleting) {
                    onDelete(shownConfirmation.tank.id);
                    reset(local.filter((t) => t.id !== shownConfirmation.tank.id));
                  } else onSelect(shownConfirmation.tank);
                }
                setConfirmation(null);
              }),
            )}
          </ViewerGroup>
        </SourceModal>
      ) : null}
      {codeLayer.value ? (
        <SourceModal
          label="Enter tank code"
          onClose={closeCode}
          active={codeOpen}
          motionRef={codeLayer.ref}
        >
          <ViewerGroup matrix={viewerRoot('SearchForTanksScreen_mc').matrix}>
            <ViewerArt pack={pack} symbol={1386} frame={4} />
            <ViewerFields pack={pack} symbol={1386} frame={4} values={{ txtEnterID_txt: '' }} />
            {codeWidget.fields
              .filter((f) => f.name === 'txtEnterID_txt')
              .map((f) => (
                <ViewerGroup key={f.name} matrix={f.matrix}>
                  <textarea
                    aria-label="Tank code"
                    spellCheck={false}
                    className="viewer-code"
                    value={code}
                    placeholder={codePrompt ? 'Enter Code Here' : ''}
                    onFocus={() => setCodePrompt(false)}
                    onChange={(e) => setCode(e.target.value)}
                    style={{
                      left: f.x,
                      top: f.y,
                      width: f.width,
                      height: f.height,
                      fontSize: f.size,
                    }}
                  />
                </ViewerGroup>
              ))}
            {codeWidget.children.map((p) =>
              button(
                p,
                p.name === 'btnBack_mc' ? 'Back' : 'Submit tank code',
                () => (p.name === 'btnBack_mc' ? closeCode() : void readCode()),
                busy,
              ),
            )}
          </ViewerGroup>
        </SourceModal>
      ) : null}
      {messageLayer.value ? (
        <SourceModal
          label="Tank viewer message"
          onClose={() => setMessage('')}
          active={!!message}
          motionRef={messageLayer.ref}
        >
          <button
            className="viewer-notification"
            aria-label="Dismiss message"
            onClick={() => setMessage('')}
          >
            <ViewerGroup matrix={viewerRoot('NotifyScreen_mc').matrix}>
              <ViewerArt pack={pack} symbol={1390} />
              <ViewerFields
                pack={pack}
                symbol={1390}
                values={{ txtDisplayMessage_txt: messageLayer.value }}
              />
            </ViewerGroup>
          </button>
        </SourceModal>
      ) : null}
    </div>
  );
}
