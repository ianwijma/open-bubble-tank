'use client';
import { useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { TankDesign } from '@/game/core/types';
import { partById } from '@/game/data/catalog';
import { BubbleText, Dialog } from './ui';
import { TankPreview } from './tank-preview';
import { HUD } from '@/game/core/hud';

export function SecondaryHelpPanel({ pack, onClose }: { pack: AssetPack; onClose: () => void }) {
  const [hovered, setHovered] = useState(false);
  const copy = (
    <>
      You have a secondary weapon
      <br />
      on your current tank!
      <br />
      <br />
      (Secondary weapons are used
      <br />
      by pressing the spacebar)
    </>
  );
  return (
    <Dialog title="Secondary weapon help" className="stage-dialog secondary-help-screen">
      <p className="sr-only">{copy}</p>
      {pack.mode === 'mock' ? (
        <div className="secondary-help-copy" aria-hidden="true">
          {copy}
        </div>
      ) : null}
      {HUD.secondaryHelp.map((piece) => {
        const button = piece.name === 'close_mc';
        const raster = pack.uiFrames.get(piece.symbol)?.[button && hovered ? 1 : 0];
        const art = raster ? (
          <img
            alt=""
            src={raster.url}
            style={{
              position: 'absolute',
              left: button ? raster.x - piece.bounds.x : piece.x + raster.x,
              top: button ? raster.y - piece.bounds.y : piece.y + raster.y,
              width: raster.width,
              height: raster.height,
              pointerEvents: 'none',
            }}
          />
        ) : null;
        return button ? (
          <button
            key={piece.symbol}
            className="secondary-help-close"
            aria-label="Close secondary weapon help"
            onClick={onClose}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            style={{
              left: piece.x + piece.bounds.x,
              top: piece.y + piece.bounds.y,
              width: piece.bounds.width,
              height: piece.bounds.height,
            }}
          >
            {art ?? 'Close'}
          </button>
        ) : (
          <span key={piece.symbol} aria-hidden="true">
            {art}
          </span>
        );
      })}
    </Dialog>
  );
}

export function EditConfirmPanel({
  pack,
  onYes,
  onNo,
}: {
  pack: AssetPack;
  onYes: () => void;
  onNo: () => void;
}) {
  const [hovered, setHovered] = useState('');
  return (
    <Dialog title="Edit your tank?" className="stage-dialog edit-confirm-screen" onClose={onNo}>
      <p className="sr-only">
        Are you sure you want to edit your tank? Your bubble total will restart at the last upgrade
        point.
      </p>
      {HUD.editConfirm.map((piece) => {
        const label = piece.name === 'yes_btn' ? 'YES' : piece.name === 'no_btn' ? 'NO' : '';
        const raster = pack.uiFrames.get(piece.symbol)?.[hovered === label && label ? 1 : 0];
        if (label)
          return (
            <button
              key={piece.symbol}
              className="edit-confirm-button"
              aria-label={label}
              onClick={label === 'YES' ? onYes : onNo}
              onPointerEnter={() => setHovered(label)}
              onPointerLeave={() => setHovered('')}
              onFocus={() => setHovered(label)}
              onBlur={() => setHovered('')}
              style={{
                left: piece.x + piece.bounds.x,
                top: piece.y + piece.bounds.y,
                width: piece.bounds.width,
                height: piece.bounds.height,
              }}
            >
              {raster ? (
                <img
                  alt=""
                  src={raster.url}
                  style={{
                    position: 'absolute',
                    left: raster.x - piece.bounds.x,
                    top: raster.y - piece.bounds.y,
                    width: raster.width,
                    height: raster.height,
                  }}
                />
              ) : (
                label
              )}
            </button>
          );
        return raster ? (
          <img
            key={piece.symbol}
            alt=""
            className="edit-confirm-art"
            src={raster.url}
            style={{
              left: piece.x + raster.x,
              top: piece.y + raster.y,
              width: raster.width,
              height: raster.height,
            }}
          />
        ) : null;
      })}
      {pack.mode === 'mock' ? (
        <div className="edit-confirm-copy" aria-hidden="true">
          <p>Are you sure you want to edit your tank?</p>
          <p>Your bubble total will restart at the last upgrade point.</p>
        </div>
      ) : null}
    </Dialog>
  );
}

export function weaponSummary(tank: TankDesign, category: number) {
  const counts = new Map<number, number>();
  for (const p of tank.parts) {
    if (Math.floor(p.type / 1000) === category) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  }
  return (
    [...counts].map(([id, count]) => `${count} ${partById(id)?.name ?? id}`).join(', ') || 'N/A'
  );
}

export function UpgradePanel({
  pack,
  offers,
  current,
  onSelect,
  onEdit,
}: {
  pack: AssetPack;
  offers: TankDesign[];
  current: TankDesign;
  onSelect: (tank: TankDesign) => void;
  onEdit: (tank: TankDesign) => void;
}) {
  return (
    <Dialog title="Upgrade your tank" className="stage-dialog upgrade-screen">
      <div className="upgrade-title">
        <BubbleText pack={pack} size={35}>
          Upgrade your tank
        </BubbleText>
      </div>
      <div className="upgrade-subtitle">
        <BubbleText pack={pack} font="Accidental Presidency" size={18}>
          Choose or modify a premade tank:
        </BubbleText>
      </div>
      <div className="upgrade-cards">
        {offers.map((tank) => (
          <article className="upgrade-card" key={tank.id}>
            <div className="upgrade-preview">
              <button
                className="upgrade-pick"
                aria-label={`Choose ${tank.name}`}
                onClick={() => onSelect(tank)}
              >
                <span className="upgrade-name">{tank.name}</span>
                <span className="upgrade-class">Class: {tank.classId}</span>
                <small className="upgrade-author">by {tank.author}</small>
                <TankPreview tank={tank} pack={pack} size={100} />
              </button>
              <button
                className="upgrade-edit"
                aria-label={`Edit ${tank.name}`}
                onClick={() => onEdit(tank)}
              >
                Edit
              </button>
            </div>
            <div className="upgrade-weapon-list">
              {(
                [
                  ['Primary', 2],
                  ['Secondary', 3],
                  ['Passive', 5],
                ] as const
              ).map(([label, category]) => (
                <p key={label}>
                  {label}: {weaponSummary(tank, category)}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="upgrade-alternatives">
        <BubbleText pack={pack} font="Accidental Presidency" size={18}>
          or choose from the following...
        </BubbleText>
        <button onClick={() => onEdit(current)}>
          <BubbleText pack={pack} font="Accidental Presidency" size={17}>
            Edit Your Current Tank
          </BubbleText>
        </button>
      </div>
    </Dialog>
  );
}
