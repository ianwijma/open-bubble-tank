'use client';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { UpgradeMenu } from '@/game/services/upgrade-menu';
import type { UpgradeSlotId } from '@/game/core/upgrade-loading';
import type { AssetPack, SwfMatrix } from '@/game/assets/asset-pack';
import type { StageRuntime } from '@/game/services/stage-runtime';
import type { TankDesign } from '@/game/core/types';
import { UPGRADE_SCREEN, upgradeWidget, upgradeWeaponSummary } from '@/game/core/upgrade-screen';
import { CreatorPrimitives, CreatorRasterArt } from './creator-controls';
import { CreatorText } from './creator-text';
import { useUpgradeArtwork } from './upgrade-artwork';
import { Dialog } from './ui';

const transform = (m: SwfMatrix) => `matrix(${m.a},${m.b},${m.c},${m.d},${m.tx / 20},${m.ty / 20})`;
function Group({ matrix, children }: { matrix: SwfMatrix; children: ReactNode }) {
  return (
    <div className="upgrade-group" style={{ transform: transform(matrix) }}>
      {children}
    </div>
  );
}
function Art({ pack, symbol, frame = 1 }: { pack: AssetPack; symbol: number; frame?: number }) {
  const widget = upgradeWidget(symbol, frame),
    raster = pack.creatorFrames.get(`upgrade:${symbol}:${frame}`);
  return raster ? (
    <CreatorRasterArt raster={raster} />
  ) : (
    <svg className="upgrade-art" width={1} height={1} aria-hidden="true">
      <CreatorPrimitives
        pieces={widget.art.map((piece) =>
          piece.kind === 'text'
            ? { ...piece, font: 'Arial', bold: piece.font === 'Billo' || piece.bold }
            : piece,
        )}
      />
    </svg>
  );
}

export function UpgradePanel({
  pack,
  stage,
  menu,
  active = true,
  current,
  onSelect,
  onEdit,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  menu: UpgradeMenu;
  active?: boolean;
  current: TankDesign;
  onSelect: (tank: TankDesign) => void;
  onEdit: (tank: TankDesign) => void;
}) {
  const [hovered, setHovered] = useState(-1),
    [editHovered, setEditHovered] = useState(-1),
    [buildHovered, setBuildHovered] = useState(false);
  useSyncExternalStore(menu.subscribe, menu.snapshot, menu.snapshot);
  const canvases = useRef(new Map<UpgradeSlotId, HTMLCanvasElement>());
  const foreground = useRef<HTMLDivElement>(null);
  const loadingArt = useRef<HTMLDivElement>(null);
  const { loading } = menu;
  const rootPieces = UPGRADE_SCREEN.rootFrames.find(
    ({ frame }) => frame === loading.rootFrame,
  )!.pieces;
  const rootMatrix = (name: string) => rootPieces.find((piece) => piece.name === name)!.matrix;
  useLayoutEffect(
    () =>
      menu.observe(() => {
        const layer = foreground.current;
        if (!layer) return;
        layer.style.opacity = String(menu.motion.foregroundAlpha);
        layer.dataset.upgradeAlpha = String(menu.motion.foregroundAlpha);
        layer.dataset.upgradeCounter = String(menu.motion.counter);
        for (const button of layer.querySelectorAll<HTMLButtonElement>(
          '.upgrade-pick,.upgrade-edit',
        )) {
          const id = Number(
            button.closest<HTMLElement>('[data-upgrade-slot]')!.dataset.upgradeSlot,
          ) as UpgradeSlotId;
          button.disabled =
            !menu.motion.cardInputEnabled ||
            loading.rootFrame !== 2 ||
            !loading.slot(id).card.clickListener;
        }
        const build = layer.querySelector<HTMLButtonElement>('.upgrade-current-button');
        if (build) build.disabled = !menu.motion.bottomInputEnabled;
        if (loadingArt.current) {
          const frame = loading.loadingAnimationFrame;
          loadingArt.current.dataset.upgradeLoadingFrame = String(frame);
          for (const dot of loadingArt.current.querySelectorAll<HTMLElement>(
            '[data-upgrade-dot]',
          )) {
            const pose = UPGRADE_SCREEN.loading.animation.frames[frame - 1].find(
              (p) => p.depth === Number(dot.dataset.upgradeDot),
            )!;
            dot.style.opacity = String(pose.alpha);
          }
        }
      }),
    [menu],
  );
  const error = useUpgradeArtwork(pack, stage, menu, canvases.current);
  const clipId = `upgrade-${useId().replaceAll(':', '')}`,
    card = UPGRADE_SCREEN.viewers.cards[0],
    bounds = card.bounds;
  const cardArt = upgradeWidget(card.symbol),
    edit = UPGRADE_SCREEN.edit;
  return (
    <Dialog
      title="Upgrade your tank"
      className="stage-dialog upgrade-screen"
      active={active}
      scrimClassName={active ? '' : 'upgrade-retained-child'}
    >
      {loading.rootFrame !== 4 ? (
        <Group matrix={UPGRADE_SCREEN.shade.matrix}>
          <Art pack={pack} symbol={UPGRADE_SCREEN.shade.symbol} />
        </Group>
      ) : null}
      <svg width={0} height={0} aria-hidden="true">
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            {cardArt.art.flatMap((piece, index) =>
              piece.paths
                ?.filter((path) => path.fill)
                .map((path, j) => (
                  <path
                    key={`${index}:${j}`}
                    d={path.d}
                    fillRule={path.rule}
                    transform={`translate(${-bounds.x} ${-bounds.y}) ${transform(piece.matrix)}`}
                  />
                )),
            )}
          </clipPath>
        </defs>
      </svg>
      <div
        ref={foreground}
        className="upgrade-foreground"
        data-upgrade-root-frame={loading.rootFrame}
        data-upgrade-pending={loading.pending}
      >
        {UPGRADE_SCREEN.foreground.map((piece) => (
          <Group key={piece.name} matrix={rootMatrix(piece.name)}>
            {piece.name === 'buildTank_mc' ? (
              <button
                className="upgrade-current-button"
                aria-label="Edit Your Current Tank"
                disabled={!menu.motion.bottomInputEnabled}
                onClick={() => {
                  if (menu.motion.bottomInputEnabled) onEdit(current);
                }}
                style={{
                  left: piece.bounds.x,
                  top: piece.bounds.y,
                  width: piece.bounds.width,
                  height: piece.bounds.height,
                }}
                onPointerEnter={() => setBuildHovered(true)}
                onPointerLeave={() => setBuildHovered(false)}
                onFocus={() => setBuildHovered(true)}
                onBlur={() => setBuildHovered(false)}
              >
                <span
                  className="upgrade-group"
                  style={{ left: -piece.bounds.x, top: -piece.bounds.y }}
                >
                  <Art pack={pack} symbol={piece.symbol} frame={buildHovered ? 2 : 1} />
                </span>
              </button>
            ) : (
              <Art pack={pack} symbol={piece.symbol} />
            )}
          </Group>
        ))}
        <div
          className="upgrade-group"
          ref={loadingArt}
          style={{ transform: transform(rootMatrix('loadingBar_mc')) }}
        >
          {loading.rootFrame === 1 ? (
            <span className="sr-only" role="status">
              Loading tanks
            </span>
          ) : null}
          <Group matrix={UPGRADE_SCREEN.loading.label.matrix}>
            <Art pack={pack} symbol={UPGRADE_SCREEN.loading.label.symbol} />
          </Group>
          <Group matrix={UPGRADE_SCREEN.loading.animation.matrix}>
            {UPGRADE_SCREEN.loading.animation.frames[0].map((dot) => (
              <span
                key={dot.depth}
                className="upgrade-group"
                data-upgrade-dot={dot.depth}
                style={{ transform: transform(dot.matrix), opacity: dot.alpha }}
              >
                <Art pack={pack} symbol={dot.symbol} />
              </span>
            ))}
          </Group>
        </div>
        <div
          className="upgrade-group"
          style={{ transform: transform(rootMatrix('viewers_mc')) }}
          inert={loading.rootFrame !== 2}
        >
          {loading.slots.map((slot) => {
            const tank = slot.tank,
              index = slot.id - 1;
            if (!tank || !slot.card.attached) return null;
            return (
              <Group
                key={slot.id}
                matrix={{ ...UPGRADE_SCREEN.viewers.cards[index].matrix, tx: slot.card.x * 20 }}
              >
                <article
                  className="upgrade-card"
                  data-upgrade-slot={slot.id}
                  data-upgrade-card-frame={hovered === index ? 2 : 1}
                  style={{
                    left: bounds.x,
                    top: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                  }}
                  onPointerEnter={() => {
                    if (menu.motion.cardInputEnabled) setHovered(index);
                  }}
                  onPointerLeave={() => {
                    if (!menu.motion.cardInputEnabled) return;
                    setHovered(-1);
                    setEditHovered(-1);
                  }}
                  onFocusCapture={() => {
                    if (menu.motion.cardInputEnabled) setHovered(index);
                  }}
                  onBlurCapture={(event) => {
                    if (!menu.motion.cardInputEnabled) return;
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setHovered(-1);
                      setEditHovered(-1);
                    }
                  }}
                >
                  <div className="upgrade-group" style={{ left: -bounds.x, top: -bounds.y }}>
                    <Art pack={pack} symbol={card.symbol} frame={hovered === index ? 2 : 1} />
                    {cardArt.fields.map((field) => (
                      <Group key={field.name} matrix={field.matrix}>
                        <CreatorText
                          pack={pack}
                          field={field}
                          text={
                            (
                              {
                                tankName_dt: tank.name,
                                creator_dt: `by ${tank.author}`,
                                class_dt: `Class: ${tank.classId}`,
                                primary_dt: `Primary: ${upgradeWeaponSummary(tank, 2)}`,
                                secondary_dt: `Secondary: ${upgradeWeaponSummary(tank, 3)}`,
                                passive_dt: `Passive: ${upgradeWeaponSummary(tank, 5)}`,
                              } as Record<string, string>
                            )[field.name]
                          }
                        />
                      </Group>
                    ))}
                    <Group matrix={edit.matrix}>
                      <Art pack={pack} symbol={edit.symbol} frame={editHovered === index ? 2 : 1} />
                    </Group>
                    <canvas
                      width={1100}
                      height={1100}
                      className="upgrade-tank-art"
                      aria-label={`${tank.name} animated tank preview`}
                      ref={(node) => {
                        if (node) canvases.current.set(slot.id, node);
                        else canvases.current.delete(slot.id);
                      }}
                    />
                  </div>
                  <button
                    className="upgrade-pick"
                    aria-label={`Choose ${tank.name}`}
                    disabled={
                      !menu.motion.cardInputEnabled ||
                      !slot.card.clickListener ||
                      loading.rootFrame !== 2
                    }
                    onClick={() => {
                      if (
                        menu.motion.cardInputEnabled &&
                        slot.card.clickListener &&
                        loading.rootFrame === 2
                      )
                        onSelect(tank);
                    }}
                    style={{ clipPath: `url(#${clipId})` }}
                  />
                  <button
                    className="upgrade-edit"
                    aria-label={`Edit ${tank.name}`}
                    disabled={
                      !menu.motion.cardInputEnabled ||
                      !slot.card.editClickListener ||
                      loading.rootFrame !== 2
                    }
                    onClick={() => {
                      if (
                        menu.motion.cardInputEnabled &&
                        slot.card.editClickListener &&
                        loading.rootFrame === 2
                      )
                        onEdit(tank);
                    }}
                    style={{
                      left: edit.matrix.tx / 20 + edit.bounds.x - bounds.x,
                      top: edit.matrix.ty / 20 + edit.bounds.y - bounds.y,
                      width: edit.bounds.width,
                      height: edit.bounds.height,
                    }}
                    onPointerEnter={() => {
                      if (menu.motion.cardInputEnabled) setEditHovered(index);
                    }}
                    onPointerLeave={() => {
                      if (menu.motion.cardInputEnabled) setEditHovered(-1);
                    }}
                    onFocus={() => {
                      if (menu.motion.cardInputEnabled) setEditHovered(index);
                    }}
                    onBlur={() => {
                      if (menu.motion.cardInputEnabled) setEditHovered(-1);
                    }}
                  />
                </article>
              </Group>
            );
          })}
        </div>
      </div>
      {error ? (
        <output role="alert" className="upgrade-art-error">
          {error}
        </output>
      ) : null}
    </Dialog>
  );
}
