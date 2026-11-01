'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { CREATOR_PALETTE, type CreatorField } from '@/game/core/creator-palette';
import {
  advanceSuggestedConfirm,
  HIDDEN_SUGGESTED_CONFIRM,
  enemyStatHandle,
  enemyStatFromHandle,
  enemyStatText,
  ENEMY_STAT_LIMITS,
  type EnemyStat,
  type EnemyStats,
} from '@/game/core/creator-enemy-stats';
import { CreatorPrimitives, CreatorRasterArt, CreatorSlider } from './creator-controls';
import { CreatorText } from './creator-text';
const keys: EnemyStat[] = ['life', 'reward', 'speed'];
export function CreatorStatsTab({
  pack,
  basic = false,
  onClick,
}: {
  pack: AssetPack;
  basic?: boolean;
  onClick: () => void;
}) {
  const [state, setState] = useState<'up' | 'over' | 'down'>('up'),
    p = CREATOR_PALETTE.advanced,
    b = basic ? p.basicTab : p.tab,
    r = b.bounds;
  const raster = pack.creatorFrames.get(`enemy:${basic ? 'basic' : 'tab'}:${state}`);
  return (
    <button
      className="creator-stats-switch"
      aria-label={basic ? 'Tank statistics' : 'Enemy Info'}
      style={{
        left: p.origin.tx / 20 + b.matrix.tx / 20 + r.x,
        top: p.origin.ty / 20 + b.matrix.ty / 20 + r.y,
        width: r.width,
        height: r.height,
      }}
      onClick={onClick}
      onPointerEnter={() => setState('over')}
      onPointerLeave={() => setState('up')}
      onPointerDown={(e) => {
        if (e.button === 0) setState('down');
      }}
      onPointerUp={(e) => {
        if (e.button === 0) setState('over');
      }}
      onPointerCancel={() => setState('up')}
      onFocus={() => setState('over')}
      onBlur={() => setState('up')}
    >
      {raster ? (
        <CreatorRasterArt raster={raster} offsetX={-r.x} offsetY={-r.y} />
      ) : (
        <svg
          aria-hidden="true"
          width={r.width}
          height={r.height}
          viewBox={`${r.x} ${r.y} ${r.width} ${r.height}`}
        >
          <CreatorPrimitives pieces={b.art[state === 'up' ? 0 : state === 'over' ? 1 : 2]} />
        </svg>
      )}
    </button>
  );
}
export function CreatorEnemyStats({
  pack,
  values,
  suggested,
  open,
  fps,
  onOpen,
  onValues,
  onSuggested,
}: {
  pack: AssetPack;
  values: EnemyStats;
  suggested: boolean;
  open: boolean;
  fps: number;
  onOpen: () => void;
  onValues: (values: EnemyStats) => void;
  onSuggested: (enabled: boolean) => void;
}) {
  const confirmationMask = useId();
  const p = CREATOR_PALETTE.advanced,
    [confirm, setConfirm] = useState(HIDDEN_SUGGESTED_CONFIRM),
    [reset, setReset] = useState({ life: 0, reward: 0, speed: 0 }),
    before = useRef<EnemyStats>(values);
  const [hoverConfirm, setHoverConfirm] = useState<{ name: string; state: 'over' | 'down' } | null>(
    null,
  );
  useEffect(() => {
    if (!open) {
      setConfirm(HIDDEN_SUGGESTED_CONFIRM);
      setDraft(null);
    }
  }, [open]);
  useEffect(() => {
    if (!confirm.playing || !open) return;
    let request = 0,
      last = performance.now(),
      accumulator = 0;
    const tick = (now: number) => {
      accumulator += now - last;
      last = now;
      const frames = Math.floor(accumulator / (1000 / fps));
      if (frames) {
        setConfirm((c) => advanceSuggestedConfirm(c, frames));
        accumulator %= 1000 / fps;
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [confirm.playing, open, fps]);
  const [draft, setDraft] = useState<{ value: string; key: EnemyStat } | null>(null);
  const bump = (key?: EnemyStat) =>
    setReset((r) =>
      key
        ? { ...r, [key]: r[key] + 1 }
        : { life: r.life + 1, reward: r.reward + 1, speed: r.speed + 1 },
    );
  if (!open) return <CreatorStatsTab pack={pack} onClick={onOpen} />;
  const raster = pack.creatorFrames.get('enemy:static'),
    check = pack.creatorFrames.get(`enemy:suggested:${suggested ? 2 : 1}`),
    box = p.suggested.bounds;
  const confirmFrame = p.confirm.frames.find((f) => f.frame === confirm.frame),
    hoveredButton =
      confirm.frame === 12 && confirm.interactive && hoverConfirm
        ? p.confirm.buttons.find((button) => button.name === hoverConfirm.name)
        : undefined,
    confirmRaster = pack.creatorFrames.get(
      hoveredButton
        ? `enemy:confirm:without:${hoveredButton.name}`
        : `enemy:confirm:${confirm.frame}`,
    );
  const textFor = (field: CreatorField) => {
    const index = field.name.startsWith('Life') ? 0 : field.name.startsWith('Bubbles') ? 1 : 2,
      key = keys[index];
    return String(
      field.name.includes('Max')
        ? ENEMY_STAT_LIMITS[key].max
        : draft?.key === key
          ? draft.value
          : values[key],
    );
  };
  const respond = (yes: boolean) => {
    if (yes) {
      onSuggested(true);
      setDraft(null);
      bump();
    }
    setConfirm((c) => ({ ...c, playing: true, interactive: false }));
  };
  return (
    <section
      className="creator-enemy-stats"
      aria-label="Enemy statistics"
      style={{ left: p.origin.tx / 20, top: p.origin.ty / 20 }}
    >
      {raster ? (
        <CreatorRasterArt raster={raster} />
      ) : (
        <svg className="creator-stat-background" aria-hidden="true" width={154} height={161}>
          <CreatorPrimitives pieces={p.static} />
          {[58.85, 99.85, 138.15].map((y) => (
            <rect
              key={y}
              x={84.5}
              y={y}
              width={27.4}
              height={11}
              fill="none"
              stroke="white"
              strokeWidth={1}
              strokeDasharray="1 3"
            />
          ))}
        </svg>
      )}
      {p.fields.map((field) => (
        <CreatorText key={field.name} pack={pack} field={field} text={textFor(field)} />
      ))}
      <label
        className="creator-suggested"
        style={{
          left: p.suggested.matrix.tx / 20 + box.x,
          top: p.suggested.matrix.ty / 20 + box.y,
          width: box.width,
          height: box.height,
        }}
      >
        {check ? (
          <CreatorRasterArt raster={check} offsetX={-box.x} offsetY={-box.y} />
        ) : (
          <svg
            aria-hidden="true"
            width={box.width}
            height={box.height}
            viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
          >
            <CreatorPrimitives
              pieces={p.suggested.art[suggested ? 1 : 0].map((leaf) =>
                leaf.id === 894
                  ? {
                      ...leaf,
                      kind: 'checked-box',
                      fill: null,
                      stroke: { color: [255, 255, 255, 255], width: 0.7 },
                    }
                  : leaf,
              )}
            />
          </svg>
        )}
        <input
          type="checkbox"
          aria-label="Use Suggested Settings"
          checked={suggested}
          onChange={() => {
            setDraft(null);
            if (suggested) onSuggested(false);
            else {
              setHoverConfirm(null);
              setConfirm({ frame: 2, playing: true, interactive: true });
            }
          }}
        />
      </label>
      {keys.map((key, i) => {
        const field = p.fields.find(
            (f) =>
              f.name ===
              (i === 0
                ? 'LifeCurrent_txt'
                : i === 1
                  ? 'BubblesReturnedCurrent_txt'
                  : 'SpeedCurrent_txt'),
          )!,
          limits = ENEMY_STAT_LIMITS[key];
        return (
          <div key={key}>
            <input
              className="creator-stat-input"
              type="text"
              inputMode="decimal"
              aria-label={`Enemy ${key}`}
              readOnly={suggested}
              maxLength={5}
              value={draft?.key === key ? draft.value : String(values[key])}
              style={{
                left: field.x,
                top: field.y,
                width: field.width,
                height: field.height,
                fontSize: field.size,
              }}
              onChange={(e) => {
                const value = enemyStatText(key, e.target.value);
                if (value === undefined) setDraft({ key, value: e.target.value });
                else {
                  setDraft(null);
                  onValues({ ...values, [key]: value });
                  bump(key);
                }
              }}
            />
            <CreatorSlider
              pack={pack}
              layout={p.sliders[i]}
              label={`Enemy ${key} slider`}
              min={limits.min}
              max={limits.max}
              value={values[key]}
              resetKey={reset[key]}
              disabled={suggested}
              coordinates={{
                min: -55,
                max: 55,
                toX: (value) => enemyStatHandle(key, value),
                fromX: (x) => enemyStatFromHandle(key, x),
              }}
              onBegin={() => {
                before.current = { ...values };
                setDraft(null);
              }}
              onChange={(value) => onValues({ ...values, [key]: value })}
              onEnd={(cancel) => {
                if (cancel) onValues(before.current);
              }}
            />
          </div>
        );
      })}
      {confirm.frame > 1 && confirmFrame ? (
        <div
          className="creator-stat-confirm"
          role="dialog"
          aria-label="Replace manual enemy statistics"
          data-confirm-frame={confirm.frame}
          style={{ left: p.confirm.matrix.tx / 20, top: p.confirm.matrix.ty / 20 }}
        >
          {confirmRaster ? (
            <CreatorRasterArt raster={confirmRaster} />
          ) : (
            <svg
              aria-hidden="true"
              width={160}
              height={70}
              viewBox="-80 -35 160 70"
              style={{ position: 'absolute', left: -80, top: -35, overflow: 'visible' }}
            >
              <defs>
                <mask
                  id={confirmationMask}
                  maskUnits="userSpaceOnUse"
                  x={-80}
                  y={-35}
                  width={160}
                  height={70}
                >
                  <rect x={-80} y={-35} width={160} height={70} fill="white" />
                  {p.confirm.buttons.map((button) => (
                    <rect
                      key={button.name}
                      x={button.matrix.tx / 20 + button.bounds.x}
                      y={button.matrix.ty / 20 + button.bounds.y}
                      width={button.bounds.width}
                      height={button.bounds.height}
                      fill="black"
                    />
                  ))}
                </mask>
              </defs>
              {/* Source913 has button cutouts; numerical mock rectangles need that mask. */}
              <g mask={`url(#${confirmationMask})`}>
                <CreatorPrimitives pieces={confirmFrame.art.filter((leaf) => leaf.id === 913)} />
              </g>
              <CreatorPrimitives
                pieces={confirmFrame.art.filter(
                  (leaf) =>
                    leaf.id !== 913 &&
                    (!hoveredButton ||
                      (['a', 'b', 'c', 'd', 'tx', 'ty'] as const).some(
                        (key) => leaf.matrix[key] !== hoveredButton.matrix[key],
                      )),
                )}
              />
            </svg>
          )}
          {confirm.frame === 12 && confirm.interactive && hoverConfirm
            ? p.confirm.buttons
                .filter((b) => b.name === hoverConfirm.name)
                .map((button) => {
                  const art = pack.creatorFrames.get(
                      `enemy:confirm:${button.name}:${hoverConfirm.state}`,
                    ),
                    b = button.bounds;
                  return art ? (
                    <CreatorRasterArt
                      key={button.name}
                      raster={art}
                      offsetX={button.matrix.tx / 20}
                      offsetY={button.matrix.ty / 20}
                    />
                  ) : (
                    <svg
                      key={button.name}
                      aria-hidden="true"
                      width={b.width}
                      height={b.height}
                      viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
                      style={{
                        position: 'absolute',
                        left: button.matrix.tx / 20 + b.x,
                        top: button.matrix.ty / 20 + b.y,
                      }}
                    >
                      <CreatorPrimitives
                        pieces={button.art[hoverConfirm.state === 'over' ? 1 : 2]}
                      />
                    </svg>
                  );
                })
            : null}
          {confirmFrame.fields.map((field) => (
            <CreatorText
              key={field.symbol}
              pack={pack}
              field={field}
              text={field.initialText ?? ''}
            />
          ))}
          {p.confirm.buttons.map((button) => {
            const b = button.bounds;
            return (
              <button
                key={button.name}
                aria-label={
                  button.name === 'btnYes'
                    ? 'Yes, use suggested settings'
                    : 'No, keep manual settings'
                }
                disabled={!confirm.interactive}
                onClick={() => respond(button.name === 'btnYes')}
                onPointerEnter={() => setHoverConfirm({ name: button.name, state: 'over' })}
                onPointerLeave={() => setHoverConfirm(null)}
                onPointerDown={(e) => {
                  if (e.button === 0) setHoverConfirm({ name: button.name, state: 'down' });
                }}
                onPointerUp={(e) => {
                  if (e.button === 0) setHoverConfirm({ name: button.name, state: 'over' });
                }}
                onPointerCancel={() => setHoverConfirm(null)}
                onFocus={() => setHoverConfirm({ name: button.name, state: 'over' })}
                onBlur={() => setHoverConfirm(null)}
                style={{
                  left: button.matrix.tx / 20 + b.x,
                  top: button.matrix.ty / 20 + b.y,
                  width: b.width,
                  height: b.height,
                }}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
