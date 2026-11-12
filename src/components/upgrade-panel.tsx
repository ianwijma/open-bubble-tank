'use client';
import { useId, useRef, useState, type ReactNode } from 'react';
import type { AssetPack, SwfMatrix } from '@/game/assets/asset-pack';
import type { StageRuntime } from '@/game/services/stage-runtime';
import type { TankDesign } from '@/game/core/types';
import {
  UPGRADE_SCREEN,
  upgradeWidget,
  upgradeWeaponSummary,
  upgradeCardMatrix,
} from '@/game/core/upgrade-screen';
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
  offers,
  current,
  onSelect,
  onEdit,
}: {
  pack: AssetPack;
  stage: StageRuntime;
  offers: TankDesign[];
  current: TankDesign;
  onSelect: (tank: TankDesign) => void;
  onEdit: (tank: TankDesign) => void;
}) {
  const [hovered, setHovered] = useState(-1),
    [editHovered, setEditHovered] = useState(-1),
    [buildHovered, setBuildHovered] = useState(false);
  const canvases = useRef(new Map<number, HTMLCanvasElement>());
  const error = useUpgradeArtwork(pack, stage, offers, canvases.current);
  const clipId = `upgrade-${useId().replaceAll(':', '')}`,
    card = UPGRADE_SCREEN.viewers.cards[0],
    bounds = card.bounds;
  const cardArt = upgradeWidget(card.symbol),
    edit = UPGRADE_SCREEN.edit;
  return (
    <Dialog title="Upgrade your tank" className="stage-dialog upgrade-screen">
      <Group matrix={UPGRADE_SCREEN.shade.matrix}>
        <Art pack={pack} symbol={UPGRADE_SCREEN.shade.symbol} />
      </Group>
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
      <div className="upgrade-foreground">
        {UPGRADE_SCREEN.foreground.map((piece) => (
          <Group key={piece.name} matrix={piece.matrix}>
            {piece.name === 'buildTank_mc' ? (
              <button
                className="upgrade-current-button"
                aria-label="Edit Your Current Tank"
                onClick={() => onEdit(current)}
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
        <Group matrix={UPGRADE_SCREEN.viewers.matrix}>
          {offers.map((tank, index) => (
            <Group key={`${index}:${tank.id}`} matrix={upgradeCardMatrix(index, offers.length)}>
              <article
                className="upgrade-card"
                style={{
                  left: bounds.x,
                  top: bounds.y,
                  width: bounds.width,
                  height: bounds.height,
                }}
                onPointerEnter={() => setHovered(index)}
                onPointerLeave={() => {
                  setHovered(-1);
                  setEditHovered(-1);
                }}
                onFocusCapture={() => setHovered(index)}
                onBlurCapture={(event) => {
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
                      if (node) canvases.current.set(index, node);
                      else canvases.current.delete(index);
                    }}
                  />
                </div>
                <button
                  className="upgrade-pick"
                  aria-label={`Choose ${tank.name}`}
                  onClick={() => onSelect(tank)}
                  style={{ clipPath: `url(#${clipId})` }}
                />
                <button
                  className="upgrade-edit"
                  aria-label={`Edit ${tank.name}`}
                  onClick={() => onEdit(tank)}
                  style={{
                    left: edit.matrix.tx / 20 + edit.bounds.x - bounds.x,
                    top: edit.matrix.ty / 20 + edit.bounds.y - bounds.y,
                    width: edit.bounds.width,
                    height: edit.bounds.height,
                  }}
                  onPointerEnter={() => setEditHovered(index)}
                  onPointerLeave={() => setEditHovered(-1)}
                  onFocus={() => setEditHovered(index)}
                  onBlur={() => setEditHovered(-1)}
                />
              </article>
            </Group>
          ))}
        </Group>
      </div>
      {error ? (
        <output role="alert" className="upgrade-art-error">
          {error}
        </output>
      ) : null}
    </Dialog>
  );
}
