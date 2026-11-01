import { DEFAULT_SETTINGS } from '../core/constants';
import { validHotkey, canonicalHotkey } from '../core/hotkeys';
import type { Profile, Settings, TankDesign, TankPart } from '../core/types';
import { PART_BY_ID, AVATARS, ENEMIES, BOSSES, difficulty } from '../data/catalog';
const KEY = 'open-bubble-tank.profile.v1';
const builtinIds = new Set([...AVATARS, ...ENEMIES, ...BOSSES].map((tank) => tank.id));
export function defaultProfile(): Profile {
  return {
    version: 1,
    secondaryHelpSeen: false,
    progression: [],
    tanks: [],
    settings: { ...DEFAULT_SETTINGS },
    achievements: [],
    nextTankId: 10000001,
  };
}
/** A valid creator export is a fresh local design, including edits of saved tanks. */
export function saveCreatedTank(profile: Profile, design: TankDesign) {
  const tank: TankDesign = {
    ...design,
    sourceCode: undefined,
    difficulty: difficulty(design),
    id: `L${profile.nextTankId}`,
  };
  const tanks = [...profile.tanks.filter((previous) => previous.id !== tank.id), tank];
  return {
    tank,
    profile: {
      ...profile,
      tanks,
      nextTankId: profile.nextTankId + 1,
      achievements:
        tanks.filter((tank) => !builtinIds.has(tank.id)).length >= 3
          ? [...new Set([...profile.achievements, 'Tank Creator'])]
          : profile.achievements,
    },
  };
}
/** _-VM reserves an ID before checking empty fields, including failed submissions. */
export function submitCreatedTank(profile: Profile, design: TankDesign) {
  if (!design.parts.length || design.author === '' || design.name === '')
    return { tank: null, profile: { ...profile, nextTankId: profile.nextTankId + 1 } };
  return saveCreatedTank(profile, design);
}
export function validateDesign(value: unknown): value is TankDesign {
  if (!value || typeof value !== 'object') return false;
  const t = value as TankDesign;
  return (
    (t.sourceCode === undefined ||
      (typeof t.sourceCode === 'string' &&
        t.sourceCode.length <= 200000 &&
        /^([a-f0-9]{3})(?:[a-f0-9]{32})+([a-f0-9]{3})$/i.test(t.sourceCode))) &&
    typeof t.name === 'string' &&
    t.name.length <= 100 &&
    typeof t.id === 'string' &&
    typeof t.author === 'string' &&
    typeof t.avatar === 'boolean' &&
    Number.isInteger(t.classId) &&
    t.classId >= 1 &&
    t.classId <= 6 &&
    Number.isFinite(t.life) &&
    t.life > 0 &&
    t.life <= 100000 &&
    Number.isFinite(t.speed) &&
    t.speed >= 0 &&
    t.speed <= 4 &&
    Number.isFinite(t.reward) &&
    t.reward >= 0 &&
    t.reward <= 10000 &&
    Array.isArray(t.parts) &&
    t.parts.length > 0 &&
    t.parts.length <= 400 &&
    t.parts.every(
      (p: TankPart) =>
        p &&
        typeof p.key === 'string' &&
        PART_BY_ID.has(p.type) &&
        [p.x, p.y, p.rotation, p.scale, p.radius].every(Number.isFinite) &&
        Math.abs(p.x) <= 2000 &&
        Math.abs(p.y) <= 2000 &&
        p.scale > 0 &&
        p.scale <= 3 &&
        p.radius > 0 &&
        p.radius <= 200,
    )
  );
}
export function validateSettings(value: unknown): Settings {
  const d = { ...DEFAULT_SETTINGS } as Settings;
  if (!value || typeof value !== 'object') return d;
  const s = value as Settings;
  if (Number.isFinite(s.zoom)) d.zoom = Math.max(0.5, Math.min(1.5, s.zoom));
  for (const key of ['sound', 'music', 'shake', 'efficient'] as const)
    if (typeof s[key] === 'boolean') d[key] = s[key];
  if ([35, 50, 65, 90].includes(s.fps)) d.fps = s.fps;
  if ([35, 50, 65].includes(s.mainFps)) d.mainFps = s.mainFps;
  else if ([35, 50, 65].includes(s.fps)) d.mainFps = s.fps as Settings['mainFps'];
  if (['low', 'medium', 'high'].includes(s.quality)) d.quality = s.quality;
  for (const key of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const)
    if (validHotkey(s[key])) d[key] = canonicalHotkey(s[key]);
  return d;
}
export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const p = JSON.parse(raw) as Partial<Profile>;
    if (p.version !== 1) return defaultProfile();
    return {
      ...defaultProfile(),
      secondaryHelpSeen: p.secondaryHelpSeen === true,
      settings: restoreSettings(p.settings),
      tanks: Array.isArray(p.tanks) ? p.tanks.filter(validateDesign).slice(0, 200) : [],
      progression: Array.isArray(p.progression)
        ? p.progression.filter(validateDesign).slice(0, 7)
        : [],
      achievements: Array.isArray(p.achievements)
        ? p.achievements.filter((n) => typeof n === 'string').slice(0, 30)
        : [],
      nextTankId: Number.isSafeInteger(p.nextTankId) ? p.nextTankId! : 10000001,
    };
  } catch {
    return defaultProfile();
  }
}
export function saveProfile(profile: Profile): boolean {
  try {
    // Main.SaveGameData writes mainFPS, not Stage.frameRate; intCurrE is session-only.
    const { mainFps, ...settings } = profile.settings;
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...profile, settings: { ...settings, fps: mainFps, efficient: false } }),
    );
    return true;
  } catch {
    return false;
  }
}
export function restoreSettings(value: unknown): Settings {
  const settings = validateSettings(value);
  return { ...settings, fps: settings.mainFps, efficient: false };
}
export function exportDesign(design: TankDesign) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `${design.name.replace(/[^a-z0-9_-]/gi, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function importDesign(text: string): TankDesign {
  const value = JSON.parse(text);
  if (!validateDesign(value))
    throw new Error('This file does not contain a valid local tank design.');
  return value;
}
