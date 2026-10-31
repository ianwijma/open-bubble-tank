import geometry from '../data/settings-geometry.json';
import type { Settings } from './types';
import { displayPixel } from './display-values';
export interface SettingsLeaf {
  name: string;
  symbol: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  bounds: { x: number; y: number; width: number; height: number };
  frames: number;
  label: { text: string; size: number; font: string } | null;
  field: { size: number; align: number; font: number; ascent: number } | null;
}
export interface SettingsElement extends SettingsLeaf {
  children: SettingsLeaf[];
}
export interface SettingsLayout {
  origin: { x: number; y: number };
  out: Record<string, { x: number; y: number }>;
  pieces: SettingsElement[];
}
export const SETTINGS_SCREEN: Record<
  'menu' | 'pause',
  Record<'settings' | 'hotkeys', SettingsLayout>
> = geometry;
export const HOTKEYS = [
  ['h1', 'Move up', 'Up_mc', 'up'],
  ['h2', 'Move down', 'Down_mc', 'down'],
  ['h3', 'Move left', 'Left_mc', 'left'],
  ['h4', 'Move right', 'Right_mc', 'right'],
  ['h5', 'Pause', 'Paused_mc', 'pause'],
] as const;
export type Hotkey = (typeof HOTKEYS)[number][0];
export const SETTING_ROWS = [
  {
    name: 'FrameRate_mc',
    key: 'fps',
    label: 'Frame Rate',
    names: ['gs1', 'gs2', 'gs3'],
    values: [35, 50, 65],
    labels: ['Slow', 'Regular', 'Fast'],
  },
  {
    name: 'Quality_mc',
    key: 'quality',
    label: 'Quality',
    names: ['g1', 'g2', 'g3'],
    values: ['low', 'medium', 'high'],
    labels: ['Low', 'Medium', 'High'],
  },
  {
    name: 'Music_mc',
    key: 'music',
    label: 'Music',
    names: ['m1', 'm2'],
    values: [false, true],
    labels: ['Off', 'On'],
  },
  {
    name: 'Sounds_mc',
    key: 'sound',
    label: 'Sound effects',
    names: ['s1', 's2'],
    values: [false, true],
    labels: ['Off', 'On'],
  },
  {
    name: 'ScreenShake_mc',
    key: 'shake',
    label: 'Screen Shake',
    names: ['v1', 'v2'],
    values: [false, true],
    labels: ['Off', 'On'],
  },
  {
    name: 'EfficientMode_mc',
    key: 'efficient',
    label: 'Efficiency Mode (Slow Computers)',
    names: ['v2', 'v1'],
    values: [false, true],
    labels: ['Off', 'On'],
  },
] as const;
export function changeSetting(
  settings: Settings,
  key: (typeof SETTING_ROWS)[number]['key'],
  value: string | number | boolean,
): Settings {
  if (key === 'efficient')
    return {
      ...settings,
      efficient: !!value,
      sound: !value,
      music: !value,
      shake: !value,
      quality: value ? 'low' : 'high',
      fps: value ? 90 : 50,
    };
  if (key === 'fps') {
    if (![35, 50, 65].includes(value as number)) return settings;
    return {
      ...settings,
      fps: value as Settings['mainFps'],
      mainFps: value as Settings['mainFps'],
    };
  }
  return { ...settings, [key]: value };
}
/** _-Sm's selector belongs to a menu instance, not its transient Settings645 child. */
export class MenuSettingsState {
  selectedFps: Settings['mainFps'];
  constructor(mainFps: Settings['mainFps']) {
    this.selectedFps = mainFps;
  }
  change(key: (typeof SETTING_ROWS)[number]['key'], value: string | number | boolean) {
    if (key === 'efficient') this.selectedFps = value ? 65 : 50;
    else if (key === 'fps' && [35, 50, 65].includes(value as number))
      this.selectedFps = value as Settings['mainFps'];
  }
}
export function settingSelection(
  settings: Settings,
  key: (typeof SETTING_ROWS)[number]['key'],
  overPause: boolean,
  menu?: MenuSettingsState,
) {
  return key === 'fps' && !overPause ? (menu?.selectedFps ?? settings.mainFps) : settings[key];
}
/** PauseMenu._-C7/_-B9/_-Lz/_-eE; gates see preceding setters in the same frame. */
export class SettingsMotion {
  readonly settings = Object.fromEntries(
    SETTINGS_SCREEN.pause.settings.pieces.map((p) => [
      p.name,
      {
        x: p.x,
        y: SETTINGS_SCREEN.pause.settings.out[
          p.name === 'btnBack_mc' ? 'ButtonSettingsOut2_mc' : 'ButtonSettingsOut_mc'
        ].y,
      },
    ]),
  );
  readonly hotkeys = Object.fromEntries(
    SETTINGS_SCREEN.pause.hotkeys.pieces.map((p) => [
      p.name,
      { x: p.x, y: SETTINGS_SCREEN.pause.hotkeys.out.ButtonSettingsOut_mc.y },
    ]),
  );
  seen = false;
  returning = false;
  advance(active: boolean, hotkeys: boolean, frozen = false) {
    if (frozen || (!active && !this.seen)) return;
    if (active) this.seen = true;
    const enter = (
      positions: Record<string, { x: number; y: number }>,
      pieces: SettingsElement[],
      order: string[],
      gate: number,
    ) => {
      for (let i = 0; i < order.length; i++) {
        if (i && positions[order[i - 1]].y >= gate) continue;
        const name = order[i],
          target = pieces.find((p) => p.name === name)!,
          p = positions[name];
        p.x = displayPixel(p.x * 0.9 + target.x * 0.1);
        p.y = displayPixel(p.y * 0.9 + target.y * 0.1);
      }
    };
    const retract = (positions: Record<string, { x: number; y: number }>, backSeparate = false) => {
      for (const [name, p] of Object.entries(positions)) {
        const y =
          backSeparate && name === 'btnBack_mc'
            ? SETTINGS_SCREEN.pause.settings.out.ButtonSettingsOut2_mc.y
            : backSeparate
              ? SETTINGS_SCREEN.pause.settings.out.ButtonSettingsOut_mc.y
              : SETTINGS_SCREEN.pause.hotkeys.out.ButtonSettingsOut_mc.y;
        p.y = displayPixel(p.y * 0.93 + y * 0.07);
      }
    };
    if (active && !hotkeys)
      enter(
        this.settings,
        SETTINGS_SCREEN.pause.settings.pieces,
        [
          'Title_mc',
          'FrameRate_mc',
          'Quality_mc',
          'Music_mc',
          'Sounds_mc',
          'ScreenShake_mc',
          'EfficientMode_mc',
          'btnHotkeys_mc',
          'btnBack_mc',
        ],
        200,
      );
    else retract(this.settings, true);
    if (active && hotkeys) {
      enter(
        this.hotkeys,
        SETTINGS_SCREEN.pause.hotkeys.pieces,
        ['Title_mc', 'Up_mc', 'Down_mc', 'Left_mc', 'Right_mc', 'Paused_mc'],
        400,
      );
      // Back and the retired lock row share Pause's gate; neither gates the other.
      if (this.hotkeys.Paused_mc.y < 400)
        for (const name of ['btnBack_mc', 'Locked_mc']) {
          const p = this.hotkeys[name],
            target = SETTINGS_SCREEN.pause.hotkeys.pieces.find((p) => p.name === name)!;
          p.x = displayPixel(p.x * 0.9 + target.x * 0.1);
          p.y = displayPixel(p.y * 0.9 + target.y * 0.1);
        }
    } else if (active && this.returning) retract(this.hotkeys);
  }
}
