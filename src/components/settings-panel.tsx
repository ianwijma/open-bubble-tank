'use client';
import {
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from 'react';
import { DEFAULT_SETTINGS } from '@/game/core/constants';
import type { Settings } from '@/game/core/types';
import { BubbleText, Dialog } from './ui';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { StageRuntime } from '@/game/services/stage-runtime';
import {
  SETTINGS_SCREEN,
  SETTING_ROWS,
  HOTKEYS,
  SettingsMotion,
  MenuSettingsState,
  changeSetting,
  settingSelection,
  type Hotkey,
} from '@/game/core/settings-screen';
import { canonicalHotkey, hotkeyLabel, validHotkey } from '@/game/core/hotkeys';
type Piece = (typeof SETTINGS_SCREEN.pause.settings.pieces)[number];
type Leaf = Piece['children'][number];
const boundsStyle = (p: Leaf): CSSProperties => ({
  left: p.bounds.x,
  top: p.bounds.y,
  width: p.bounds.width,
  height: p.bounds.height,
});
const transform = (p: Leaf) => `translate(${p.x}px,${p.y}px) scale(${p.scaleX},${p.scaleY})`;
const buttonStyle = (p: Leaf): CSSProperties => ({
  width: p.bounds.width,
  height: p.bounds.height,
  transform: `${transform(p)} translate(${p.bounds.x}px,${p.bounds.y}px)`,
});
const artworkOffset = (p: Leaf): CSSProperties => ({
  position: 'absolute',
  left: -p.bounds.x,
  top: -p.bounds.y,
});

export function SettingsPanel({
  settings,
  pack,
  onChange,
  onClose,
  overPause = false,
  stage,
  active = true,
  frozen = false,
  embedded = false,
  controller,
  onHotkeysChange,
  menuState,
}: {
  settings: Settings;
  pack: AssetPack;
  onChange: (s: Settings, control?: 'shake' | 'efficiency') => void;
  onClose: () => void;
  overPause?: boolean;
  stage?: StageRuntime;
  active?: boolean;
  frozen?: boolean;
  embedded?: boolean;
  controller?: Ref<{ back: () => void }>;
  onHotkeysChange?: (hotkeys: boolean) => void;
  menuState?: MenuSettingsState;
}) {
  const [binding, setBinding] = useState<Hotkey | null>(null),
    [hotkeys, setHotkeys] = useState(false),
    [draft, setDraft] = useState(settings);
  const [motion] = useState(() => new SettingsMotion());
  const [ownMenuState] = useState(() => new MenuSettingsState(settings.mainFps));
  const menu = menuState ?? ownMenuState;
  const [hovered, setHovered] = useState('');
  const [hoverFps, setHoverFps] = useState('');
  const nodes = useRef(new Map<string, HTMLElement>());
  const layer = useRef<HTMLDivElement>(null);
  const current = useRef({ active, hotkeys, frozen });
  useLayoutEffect(() => {
    current.current = { active, hotkeys, frozen };
  }, [active, hotkeys, frozen]);
  useLayoutEffect(() => {
    if (active) motion.returning = false;
  }, [active, motion]);
  useLayoutEffect(() => {
    if (!overPause || !stage) return;
    return stage.subscribe({
      beforeStep: () =>
        motion.advance(current.current.active, current.current.hotkeys, current.current.frozen),
      draw: () => {
        for (const [id, node] of nodes.current) {
          const [screen, name] = id.split(':');
          const p = (screen === 'settings' ? motion.settings : motion.hotkeys)[name];
          node.style.transform = `translate(${p.x}px,${p.y}px)`;
        }
      },
    });
  }, [motion, overPause, stage]);
  useLayoutEffect(() => {
    if (!active || !hotkeys || !binding) return;
    const keyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (validHotkey(event.code))
        setDraft((old) => ({ ...old, [binding]: canonicalHotkey(event.code) }));
    };
    window.addEventListener('keydown', keyDown, true);
    return () => window.removeEventListener('keydown', keyDown, true);
  }, [active, hotkeys, binding]);
  const openHotkeys = () => {
    setDraft(settings);
    setBinding(null);
    setHotkeys(true);
    motion.returning = false;
  };
  const back = () => {
    setBinding(null);
    if (hotkeys) {
      onChange({ ...settings, ...Object.fromEntries(HOTKEYS.map(([key]) => [key, draft[key]])) });
      setHotkeys(false);
      motion.returning = true;
    } else onClose();
  };
  useImperativeHandle(controller, () => ({ back }), [back]);
  useLayoutEffect(() => {
    onHotkeysChange?.(hotkeys);
  }, [hotkeys, onHotkeysChange]);
  useLayoutEffect(() => {
    if (active) layer.current?.focus();
  }, [active, hotkeys]);
  const choose = (key: (typeof SETTING_ROWS)[number]['key'], value: string | number | boolean) => {
    if (!overPause) menu.change(key, value);
    onChange(
      changeSetting(settings, key, value),
      key === 'shake' ? 'shake' : key === 'efficient' ? 'efficiency' : undefined,
    );
  };
  const layouts = overPause ? SETTINGS_SCREEN.pause : SETTINGS_SCREEN.menu;
  const asset = (p: Leaf, frame = 0) => {
    const raster = pack.uiFrames.get(p.symbol)?.[frame] ?? pack.uiFrames.get(p.symbol)?.[0];
    return raster ? (
      <img
        alt=""
        src={raster.url}
        style={{
          position: 'absolute',
          left: raster.x,
          top: raster.y,
          width: raster.width,
          height: raster.height,
          pointerEvents: 'none',
        }}
      />
    ) : null;
  };
  const keyFor = (name: string) =>
    HOTKEYS.find(([, , , short]) => name === `${short}_mc` || name === `${short}_txt`);
  const renderLeaf = (
    p: Leaf,
    screen: 'settings' | 'hotkeys',
    row?: (typeof SETTING_ROWS)[number],
  ) => {
    const leafId = `${screen}:${row?.name ?? 'root'}:${p.name}`;
    if (
      p.name === 'lock_mc' ||
      p.name === 'lock_txt' ||
      p.name === 'lockLabel_mc' ||
      p.name === 'lock_label'
    )
      return null;
    const entry =
      row ??
      SETTING_ROWS.find((r) =>
        (r.key === 'efficient' ? ['e1', 'e2'] : r.names).some((n) => n === p.name),
      );
    const names = entry?.key === 'efficient' && !overPause ? ['e1', 'e2'] : entry?.names;
    const index = names?.findIndex((n) => n === p.name) ?? -1;
    if (entry && index >= 0) {
      const value = entry.values[index],
        selected = settingSelection(settings, entry.key, overPause, menu) === value;
      const option = (
        <label
          className={`authored-option ${selected ? 'selected' : ''} ${pack.mode}`}
          style={{ transform: transform(p) }}
          onPointerEnter={() => {
            setHovered(leafId);
            if (entry.key === 'fps') setHoverFps(String(value));
          }}
          onPointerLeave={() => {
            setHovered('');
            setHoverFps('');
          }}
        >
          {pack.mode === 'swf' ? (
            asset(p, selected || hovered === leafId ? 1 : 0)
          ) : (
            <span className="mock-option" style={boundsStyle(p)}>
              {entry.labels[index]}
            </span>
          )}
          <input
            type="radio"
            name={`setting-${entry.key}`}
            aria-label={entry.key === 'fps' ? `${value} FPS` : entry.labels[index]}
            checked={selected}
            onChange={() => choose(entry.key, value)}
            onClick={() => {
              if (selected) choose(entry.key, value);
            }}
            style={boundsStyle(p)}
          />
        </label>
      );
      return row ? (
        option
      ) : (
        <fieldset className="settings-single-group" aria-label={entry.label}>
          {option}
        </fieldset>
      );
    }
    const key = keyFor(p.name);
    if (key && p.name.endsWith('_mc')) {
      const fields = overPause
        ? layouts.hotkeys.pieces.find((piece) => piece.name === key[2])!.children
        : layouts.hotkeys.pieces;
      const field = fields.find((piece) => piece.name === `${key[3]}_txt`)!;
      const origin = overPause ? p : layouts.hotkeys.pieces.find((piece) => piece.name === p.name)!;
      const x = Math.min(p.bounds.x, field.x + field.bounds.x - origin.x),
        y = Math.min(p.bounds.y, field.y + field.bounds.y - origin.y);
      const hit = {
        ...p,
        bounds: {
          x,
          y,
          width:
            Math.max(
              p.bounds.x + p.bounds.width,
              field.x + field.bounds.x + field.bounds.width - origin.x,
            ) - x,
          height:
            Math.max(
              p.bounds.y + p.bounds.height,
              field.y + field.bounds.y + field.bounds.height - origin.y,
            ) - y,
        },
      };
      return (
        <button
          className={`authored-key ${pack.mode}`}
          aria-label={`Change ${key[1].toLowerCase()} key`}
          aria-pressed={binding === key[0]}
          style={buttonStyle(hit)}
          onClick={() => setBinding(key[0])}
        >
          <span style={artworkOffset(hit)}>
            {pack.mode === 'swf' ? (
              asset(p, binding === key[0] ? 1 : 0)
            ) : (
              <span
                className={`mock-key ${binding === key[0] ? 'binding' : ''}`}
                style={boundsStyle(p)}
              />
            )}
            <span className="settings-hit" style={boundsStyle(hit)} />
          </span>
        </button>
      );
    }
    if (p.field) {
      const text = key ? hotkeyLabel(draft[key[0]]) : p.name === 'fps_txt' ? hoverFps : '';
      return (
        <span
          className="settings-field"
          style={{
            ...boundsStyle(p),
            left: p.x + p.bounds.x + 2,
            top: p.y + p.bounds.y + 2 + p.field.size * (p.field.ascent / 1024 - 1),
            fontSize: p.field.size,
          }}
        >
          <BubbleText pack={pack} font="Arial" size={p.field.size}>
            {text}
          </BubbleText>
        </span>
      );
    }
    const isHotkeys = p.name === 'btnHotkeys_mc' || p.name === 'hotkeys';
    const isBack =
      p.name === 'btnBack_mc' ||
      (screen === 'settings' ? p.name === 'back_btn' : p.name === 'backSettings');
    // Main-menu back_btn remains attached on frame2, but is parked under the hotkey layout.
    if (screen === 'hotkeys' && p.name === 'back_btn') return null;
    if (isHotkeys || isBack)
      return (
        <button
          className={`authored-action ${pack.mode} ${isBack && screen === 'settings' ? 'back-orb' : ''}`}
          style={buttonStyle(p)}
          aria-label={
            isHotkeys ? 'HotKey Options' : screen === 'hotkeys' ? 'Back to settings' : 'DONE'
          }
          onClick={isHotkeys ? openHotkeys : back}
          onPointerEnter={() => setHovered(leafId)}
          onPointerLeave={() => setHovered('')}
        >
          <span style={artworkOffset(p)}>
            {pack.mode === 'swf' ? (
              asset(p, hovered === leafId ? 1 : 0)
            ) : (
              <span className="mock-action" style={boundsStyle(p)}>
                {p.label?.text ?? (isHotkeys ? 'HotKey Options' : 'BACK')}
              </span>
            )}
            <span className="settings-hit" style={boundsStyle(p)} />
          </span>
        </button>
      );
    if (pack.mode === 'swf')
      return (
        <span className="settings-static" style={{ transform: transform(p) }}>
          {asset(p)}
        </span>
      );
    const title = p.symbol === 619 || p.symbol === 608 || p.name === 'Title_mc';
    if (title)
      return (
        <span
          className="settings-mock-title"
          style={{ transform: transform(p), ...boundsStyle(p) }}
        >
          <BubbleText pack={pack} size={p.label?.size ?? 40}>
            {p.label?.text ?? (screen === 'hotkeys' ? 'Hotkeys' : 'settings')}
          </BubbleText>
        </span>
      );
    const copy = p.symbol >= 626 && p.symbol <= 633 ? null : p.label;
    return copy ? (
      <span
        className="settings-mock-copy"
        style={{ transform: transform(p), ...boundsStyle(p), fontSize: copy.size }}
      >
        {copy.text}
      </span>
    ) : null;
  };
  const content = (
    <div
      ref={layer}
      className={`settings-layers ${embedded ? 'authored-settings' : ''}`}
      data-stage-fps={settings.fps}
      data-configured-fps={settings.mainFps}
      tabIndex={-1}
      inert={embedded && !active}
      aria-hidden={(embedded && !active) || undefined}
    >
      {(['settings', 'hotkeys'] as const)
        .filter((screen) => overPause || (hotkeys ? screen === 'hotkeys' : screen === 'settings'))
        .map((screen) => {
          const layout = layouts[screen],
            selected = (screen === 'hotkeys') === hotkeys;
          return (
            <div
              key={screen}
              className="settings-page"
              data-settings-page={screen}
              inert={!active || !selected}
              aria-hidden={!active || !selected}
              style={{ left: layout.origin.x, top: layout.origin.y }}
            >
              {layout.pieces
                .filter(
                  (p) =>
                    p.name !== 'Locked_mc' &&
                    (overPause ||
                      (layout.origin.x + p.x + p.bounds.x * p.scaleX < 550 &&
                        layout.origin.x + p.x + (p.bounds.x + p.bounds.width) * p.scaleX > 0 &&
                        layout.origin.y + p.y + p.bounds.y * p.scaleY < 450 &&
                        layout.origin.y + p.y + (p.bounds.y + p.bounds.height) * p.scaleY > 0)),
                )
                .map((piece) => {
                  const row = SETTING_ROWS.find((r) => r.name === piece.name);
                  const position = overPause
                    ? (screen === 'settings' ? motion.settings : motion.hotkeys)[piece.name]
                    : piece;
                  const id = `${screen}:${piece.name}`;
                  const children = piece.children.length
                    ? piece.children.map((p) => (
                        <span key={p.name}>{renderLeaf(p, screen, row)}</span>
                      ))
                    : renderLeaf({ ...piece, x: 0, y: 0 }, screen);
                  return (
                    <div
                      key={id}
                      className="settings-piece"
                      data-settings-piece={id}
                      ref={(node) => {
                        if (node) nodes.current.set(id, node);
                        else nodes.current.delete(id);
                      }}
                      style={{ transform: `translate(${position.x}px,${position.y}px)` }}
                    >
                      {row ? (
                        <fieldset className="settings-row" aria-label={row.label}>
                          {children}
                        </fieldset>
                      ) : (
                        children
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      {active && !hotkeys ? (
        <fieldset className="camera-zoom">
          <legend>Camera zoom</legend>
          <label htmlFor="camera-zoom">{Math.round(settings.zoom * 100)}%</label>
          <input
            id="camera-zoom"
            aria-label="Camera zoom"
            aria-valuetext={`${Math.round(settings.zoom * 100)}%`}
            type="range"
            min="50"
            max="150"
            step="5"
            value={Math.round(settings.zoom * 100)}
            onChange={(e) => onChange({ ...settings, zoom: Number(e.target.value) / 100 })}
          />
          <div>
            <span>Farther</span>
            <span>Closer</span>
          </div>
          <button onClick={() => onChange({ ...settings, zoom: 1 })}>Reset to 100%</button>
        </fieldset>
      ) : active && hotkeys ? (
        <button
          className="restore-hotkeys"
          onClick={() => {
            setBinding(null);
            setDraft((old) => ({
              ...old,
              ...Object.fromEntries(HOTKEYS.map(([key]) => [key, DEFAULT_SETTINGS[key]])),
            }));
          }}
        >
          Restore defaults
        </button>
      ) : null}
    </div>
  );
  return embedded ? (
    content
  ) : (
    <Dialog
      title="Settings"
      onClose={back}
      active={active}
      className="stage-dialog settings-screen authored-settings"
    >
      {content}
    </Dialog>
  );
}
