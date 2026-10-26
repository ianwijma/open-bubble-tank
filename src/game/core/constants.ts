// Verified: Main.as, AvatarInterface.as, _-HJ.as. All units are per simulation frame.
export const STAGE = { width: 550, height: 450, cx: 275, cy: 225 } as const;
export const MAX_LIFE = [50, 100, 170, 250, 400, 800, 2000] as const;
export const CLASS_SPEED = [1, 0.9, 0.8, 0.45, 0.4, 0.3] as const;
export const CLASS_ARMOR = [1, 1.1, 1.2, 2, 2.5, 3] as const;
export const GUN_BUDGET = [
  [2, 3, 5, 7, 10, 13],
  [2, 4, 6, 8, 11, 14],
  [0, 5, 7, 10, 13, 16],
  [0, 0, 10, 13, 16, 20],
  [0, 0, 0, 15, 18, 22],
  [0, 0, 0, 0, 20, 25],
] as const;
export const CLASS_PIXELS = [3465, 7600, 12370, 18850, 29700, Infinity];
// TankCreatorScreen.rings_mc (symbol 819), recovered authored radii.
export const CLASS_RINGS = [35, 55, 75, 100, 137.5, 175] as const;
export const FIELD_RADIUS = 423.75;
export const BULLET_RADIUS = 415;
export const DEFAULT_SETTINGS = {
  zoom: 1,
  sound: true,
  music: true,
  shake: true,
  fps: 50,
  quality: 'high',
  efficient: false,
  h1: 'KeyW',
  h2: 'KeyS',
  h3: 'KeyA',
  h4: 'KeyD',
  h5: 'KeyP',
  h6: 'KeyQ',
} as const;
