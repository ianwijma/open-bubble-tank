'use client';
import { useEffect, useState } from 'react';
import type { TankDesign } from '@/game/core/types';
import { decodeTankCode, encodeTankCode } from '@/game/services/tank-code';
import { Dialog } from './ui';
export function TankCodeDialog({
  tank,
  onImport,
  onClose,
}: {
  tank?: TankDesign;
  onImport?: (t: TankDesign) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(!!tank),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!tank) return;
    let cancelled = false;
    void encodeTankCode(tank)
      .then((value) => {
        if (!cancelled) {
          setCode(value);
          setBusy(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tank]);
  return (
    <Dialog title={tank ? 'Share tank code' : 'Import tank code'} onClose={onClose}>
      <p>
        {tank
          ? 'This code uses the original Bubble Tanks 3 format.'
          : 'Paste an original Bubble Tanks 3 tank code to add it to your local library.'}
      </p>
      <textarea
        className="tank-code"
        aria-label="Tank code"
        spellCheck={false}
        value={code}
        readOnly={!!tank}
        placeholder="Paste tank code…"
        onChange={(e) => setCode(e.target.value)}
        onFocus={(e) => {
          if (tank) e.currentTarget.select();
        }}
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dialog-actions">
        <button className="text-button" onClick={onClose}>
          Back
        </button>
        {tank ? (
          <button
            className="game-button"
            disabled={busy || !code}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
              } catch {
                setError('Select and copy the code from the box.');
              }
            }}
          >
            {copied ? 'COPIED' : 'COPY CODE'}
          </button>
        ) : (
          <button
            className="game-button"
            disabled={busy || !code}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const design = await decodeTankCode(code);
                onImport?.(design);
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Unable to import this tank.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'READING…' : 'IMPORT'}
          </button>
        )}
      </div>
    </Dialog>
  );
}
