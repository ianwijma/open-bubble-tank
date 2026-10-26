'use client';
import { useEffect, useRef, useState } from 'react';
import { AssetPack } from '@/game/assets/asset-pack';
import { BubbleText, Icon } from './ui';
export function AssetGate({ onReady }: { onReady: (pack: AssetPack) => void }) {
  const [progress, setProgress] = useState<number | null>(null),
    [label, setLabel] = useState(''),
    [error, setError] = useState(''),
    [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  async function load(file?: File) {
    if (!ready || progress !== null) return;
    setError('');
    setProgress(0);
    try {
      const update = (n: number, text: string) => {
        setProgress(n);
        setLabel(text);
      };
      const pack = file ? await AssetPack.fromSWF(file, update) : await AssetPack.mock(update);
      onReady(pack);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to read this file.');
      setProgress(null);
    }
  }
  return (
    <div
      className={`asset-gate stage-background ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void load(e.dataTransfer.files[0]);
      }}
    >
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
        <p>Open your Bubble Tanks 3 Flash file to use its original bubbles, weapons, and music.</p>
        <input
          ref={input}
          id="swf-file"
          type="file"
          accept=".swf"
          aria-label="Bubble Tanks 3 Flash file"
          disabled={!ready || progress !== null}
          onChange={(e) => void load(e.target.files?.[0])}
        />
        {progress === null ? (
          <>
            <button
              className="upload-button"
              disabled={!ready}
              onClick={() => input.current?.click()}
            >
              <Icon name="file" size={25} />
              <span>
                Choose a .swf file<small>or drop it anywhere here</small>
              </span>
            </button>
            <button className="mock-button" disabled={!ready} onClick={() => void load()}>
              Play with mock assets <span aria-hidden="true">→</span>
            </button>
            <p className="swf-download-guide">
              Need the game file? Open{' '}
              <a href="https://archive.org/details/bubble-tanks-3" target="_blank" rel="noreferrer">
                Bubble Tanks 3 on Internet Archive
              </a>
              , choose <strong>SHOCKWAVE FLASH</strong> under Download Options, then select the
              downloaded .swf here.
            </p>
          </>
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
      <p className="gate-note">
        Extracted on your device. Your file stays in this browser.
        <br />
        No Flash Player needed.
      </p>
    </div>
  );
}
