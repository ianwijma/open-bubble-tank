'use client';
import { useState } from 'react';
import { DEFAULT_SETTINGS } from '@/game/core/constants';
import type { Settings } from '@/game/core/types';
import { BubbleText, Dialog } from './ui';
import type { AssetPack } from '@/game/assets/asset-pack';
import {
  changeSetting,
  settingSelection,
  type MenuSettingsState,
} from '@/game/core/settings-screen';
const keys = [
  ['h1', 'Move up'],
  ['h2', 'Move down'],
  ['h3', 'Move left'],
  ['h4', 'Move right'],
  ['h5', 'Pause'],
  ['h6', 'Target lock'],
] as const;
export function SettingsPanel({
  settings,
  pack,
  onChange,
  onClose,
  overPause = false,
  menuState,
}: {
  settings: Settings;
  pack: AssetPack;
  onChange: (s: Settings, control?: 'shake' | 'efficiency') => void;
  onClose: () => void;
  overPause?: boolean;
  menuState?: MenuSettingsState;
}) {
  const [binding, setBinding] = useState<keyof Settings | null>(null);
  const [hotkeys, setHotkeys] = useState(false);
  return (
    <Dialog
      title="Settings"
      onClose={onClose}
      className="stage-dialog settings-screen"
      scrimClassName={overPause ? 'pause-owned-overlay' : ''}
    >
      <div
        className="settings-title"
        data-stage-fps={settings.fps}
        data-configured-fps={settings.mainFps}
      >
        <BubbleText pack={pack} size={35}>
          {hotkeys ? 'Hotkeys' : 'settings'}
        </BubbleText>
      </div>
      {!hotkeys ? (
        <>
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
          <div className="original-settings">
            <SettingOptions
              label="Frame Rate"
              pack={pack}
              options={[
                [35, 'Slow'],
                [50, 'Regular'],
                [65, 'Fast'],
              ]}
              value={settingSelection(settings, 'fps', overPause, menuState) as number}
              onChange={(fps) => {
                if (!overPause) menuState?.change('fps', fps);
                onChange(changeSetting(settings, 'fps', fps));
              }}
            />
            <SettingOptions
              label="Quality"
              pack={pack}
              options={[
                ['low', 'Low'],
                ['medium', 'Medium'],
                ['high', 'High'],
              ]}
              value={settings.quality}
              onChange={(quality) =>
                onChange({ ...settings, quality: quality as Settings['quality'] })
              }
            />
            {(['music', 'sound', 'shake'] as const).map((key) => (
              <SettingOptions
                key={key}
                label={
                  key === 'sound' ? 'Sound effects' : key === 'shake' ? 'Screen Shake' : 'Music'
                }
                pack={pack}
                options={[
                  [0, 'Off'],
                  [1, 'On'],
                ]}
                value={Number(settings[key])}
                onChange={(value) =>
                  onChange({ ...settings, [key]: !!value }, key === 'shake' ? 'shake' : undefined)
                }
              />
            ))}
            <SettingOptions
              label="Efficiency Mode (Slow Computers)"
              pack={pack}
              options={[
                [0, 'Off'],
                [1, 'On'],
              ]}
              value={Number(settings.efficient)}
              onChange={(value) => {
                if (!overPause) menuState?.change('efficient', !!value);
                onChange(changeSetting(settings, 'efficient', !!value), 'efficiency');
              }}
            />
            <button className="hotkey-options" onClick={() => setHotkeys(true)}>
              HotKey Options
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="key-grid">
            {keys.map(([key, label]) => (
              <div className="key-binding" key={key}>
                <span>{label}</span>
                <button
                  aria-label={`Change ${label.toLowerCase()} key`}
                  className={binding === key ? 'binding' : ''}
                  onClick={() => setBinding(key)}
                  onKeyDown={(e) => {
                    if (binding !== key) return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.code === 'Escape') {
                      setBinding(null);
                      return;
                    }
                    if (!/^(Key[A-Z]|Digit\d|Arrow(Up|Down|Left|Right))$/.test(e.code)) return;
                    const next = { ...settings };
                    const other = keys.find(([k]) => k !== key && settings[k] === e.code);
                    if (other) next[other[0]] = settings[key];
                    next[key] = e.code;
                    onChange(next);
                    setBinding(null);
                  }}
                >
                  {binding === key
                    ? 'Press key…'
                    : settings[key].replace('Key', '').replace('Digit', '')}
                </button>
              </div>
            ))}
          </div>
          <button
            className="restore-hotkeys"
            onClick={() => {
              setBinding(null);
              onChange({
                ...settings,
                h1: DEFAULT_SETTINGS.h1,
                h2: DEFAULT_SETTINGS.h2,
                h3: DEFAULT_SETTINGS.h3,
                h4: DEFAULT_SETTINGS.h4,
                h5: DEFAULT_SETTINGS.h5,
                h6: DEFAULT_SETTINGS.h6,
              });
            }}
          >
            Restore defaults
          </button>
        </>
      )}
      <button
        className="settings-back"
        aria-label={hotkeys ? 'Back to settings' : 'DONE'}
        onClick={() => (hotkeys ? setHotkeys(false) : onClose())}
      >
        BACK
      </button>
    </Dialog>
  );
}

function SettingOptions({
  label,
  pack,
  options,
  value,
  onChange,
}: {
  label: string;
  pack: AssetPack;
  options: (readonly [string | number, string])[];
  value: string | number;
  onChange: (value: string | number) => void;
}) {
  return (
    <fieldset className="setting-options">
      <legend>{label}</legend>
      <div>
        {options.map(([id, title]) => (
          <label key={id} className={value === id ? 'selected' : ''}>
            <input
              type="radio"
              name={label}
              aria-label={label === 'Frame Rate' ? `${id} FPS` : title}
              checked={value === id}
              onChange={() => {}}
              onClick={() => onChange(id)}
            />
            <BubbleText pack={pack} font="Accidental Presidency" size={14}>
              {title}
            </BubbleText>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
