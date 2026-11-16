'use client';
import { Dialog } from './ui';
import { HUD } from '@/game/core/hud';

export function SecondaryHelpPanel({ onClose }: { onClose: () => void }) {
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
      <div className="secondary-help-copy" aria-hidden="true">
        {copy}
      </div>
      {HUD.secondaryHelp.map((piece) =>
        piece.name === 'close_mc' ? (
          <button
            key={piece.symbol}
            className="secondary-help-close"
            aria-label="Close secondary weapon help"
            onClick={onClose}
            style={{
              left: piece.x + piece.bounds.x,
              top: piece.y + piece.bounds.y,
              width: piece.bounds.width,
              height: piece.bounds.height,
            }}
          >
            Close
          </button>
        ) : (
          <span key={piece.symbol} aria-hidden="true" />
        ),
      )}
    </Dialog>
  );
}

export function EditConfirmPanel({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <Dialog title="Edit your tank?" className="stage-dialog edit-confirm-screen" onClose={onNo}>
      <p className="sr-only">
        Are you sure you want to edit your tank? Your bubble total will restart at the last upgrade
        point.
      </p>
      {HUD.editConfirm.map((piece) => {
        const label = piece.name === 'yes_btn' ? 'YES' : piece.name === 'no_btn' ? 'NO' : '';
        return label ? (
          <button
            key={piece.symbol}
            className="edit-confirm-button"
            aria-label={label}
            onClick={label === 'YES' ? onYes : onNo}
            style={{
              left: piece.x + piece.bounds.x,
              top: piece.y + piece.bounds.y,
              width: piece.bounds.width,
              height: piece.bounds.height,
            }}
          >
            {label}
          </button>
        ) : null;
      })}
      <div className="edit-confirm-copy" aria-hidden="true">
        <p>Are you sure you want to edit your tank?</p>
        <p>Your bubble total will restart at the last upgrade point.</p>
      </div>
    </Dialog>
  );
}

export { UpgradePanel } from './upgrade-panel';
export { upgradeWeaponSummary as weaponSummary } from '@/game/core/upgrade-screen';
