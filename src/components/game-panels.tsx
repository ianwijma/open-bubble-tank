'use client';
import { useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { Dialog } from './ui';
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

export { UpgradePanel } from './upgrade-panel';
export { upgradeWeaponSummary as weaponSummary } from '@/game/core/upgrade-screen';
