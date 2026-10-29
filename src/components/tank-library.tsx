'use client';
import { useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { TankDesign } from '@/game/core/types';
import { exportDesign, importDesign } from '@/game/services/profile';
import { viewerTankIdentity } from '@/game/core/viewer-storage';
import { TankCodeDialog } from './tank-code-dialog';
import { TankPreview } from './tank-preview';
import { Icon } from './ui';
export function TankLibrary({
  pack,
  tanks,
  onEdit,
  onImport,
  onDelete,
  onBack,
}: {
  pack: AssetPack;
  tanks: TankDesign[];
  onEdit: (t: TankDesign) => void;
  onImport: (t: TankDesign) => void;
  onDelete: (tank: TankDesign) => void;
  onBack: () => void;
}) {
  const [error, setError] = useState(''),
    [deleting, setDeleting] = useState<TankDesign | null>(null),
    [codeTank, setCodeTank] = useState<TankDesign | null | undefined>(undefined);
  return (
    <div className="tank-library stage-background">
      <div className="library-top">
        <button className="icon-button" aria-label="Back to main menu" onClick={onBack}>
          <Icon name="back" />
        </button>
        <h2>MY TANKS</h2>
        <button className="game-button" onClick={() => setCodeTank(null)}>
          PASTE CODE
        </button>
        <label className="game-button">
          IMPORT FILE
          <input
            type="file"
            accept=".json"
            aria-label="Import tank design"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 200000) throw new Error('Choose a tank file under 200 KB.');
                onImport(importDesign(await file.text()));
                setError('');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Cannot import tank.');
              }
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {tanks.length ? (
        <div className="saved-tanks">
          {tanks.map((t) => (
            <article key={`${t.id}:${t.avatar}:${viewerTankIdentity(t)}`}>
              <button className="saved-tank-image" onClick={() => onEdit(t)}>
                <TankPreview tank={t} pack={pack} size={110} />
                <strong>{t.name}</strong>
                <span>
                  {t.avatar ? 'Avatar' : 'Enemy'} · Class {t.classId}
                </span>
              </button>
              <div>
                <button onClick={() => onEdit(t)}>Edit</button>
                <button onClick={() => exportDesign(t)}>JSON</button>
                <button onClick={() => setCodeTank(t)}>Code</button>
                {deleting === t ? (
                  <button
                    onClick={() => {
                      onDelete(t);
                      setDeleting(null);
                    }}
                  >
                    Confirm delete
                  </button>
                ) : (
                  <button onClick={() => setDeleting(t)}>Delete</button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-library">
          <Icon name="library" size={52} />
          <h3>A world of your own.</h3>
          <p>
            Create an enemy tank from the main menu,
            <br />
            or save your own avatar as you grow.
          </p>
          <button className="game-button" onClick={onBack}>
            BACK TO MENU
          </button>
        </div>
      )}
      {codeTank !== undefined ? (
        <TankCodeDialog
          tank={codeTank ?? undefined}
          onImport={onImport}
          onClose={() => setCodeTank(undefined)}
        />
      ) : null}
    </div>
  );
}
