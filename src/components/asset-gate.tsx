'use client';
import { useEffect, useState } from 'react';
import { AssetPack } from '@/game/assets/asset-pack';
import { BubbleText } from './ui';
export function AssetGate({ onReady }: { onReady: (pack: AssetPack) => void }) {
  const [progress, setProgress] = useState<number | null>(null),
    [label, setLabel] = useState(''),
    [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  async function load() {
    if (!ready || progress !== null) return;
    setError('');
    setProgress(0);
    try {
      const pack = await AssetPack.mock((n, text) => {
        setProgress(n);
        setLabel(text);
      });
      onReady(pack);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to prepare the artwork.');
      setProgress(null);
    }
  }
  return (
    <div className="asset-gate stage-background">
      <div className="gate-bubbles" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="gate-wordmark">
        <BubbleText size={40}>bubble tanks 3</BubbleText>
        <span>OPEN BUBBLE TANK</span>
      </div>
      <div className="asset-panel">
        <div className="eyebrow">BRING YOUR BUBBLES</div>
        <h1>Your game. Original artwork.</h1>
        {progress === null ? (
          <button className="mock-button" disabled={!ready} onClick={() => void load()}>
            Play with mock assets <span aria-hidden="true">→</span>
          </button>
        ) : (
          <div className="asset-progress" role="status">
            <div className="loading-bubble">
              {Math.round(progress * 100)}
              <small>%</small>
            </div>
            <p>{label}</p>
            <progress max="1" value={progress} aria-label="Asset extraction progress" />
          </div>
        )}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
