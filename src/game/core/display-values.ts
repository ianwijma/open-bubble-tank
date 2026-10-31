/** DisplayObject setters: truncating, saturating signed8.8 alpha and signed32 twips. */
export const displayAlpha = (value: number) => {
  const fixed = Math.trunc(value * 256) || 0;
  return Math.max(-32768, Math.min(32767, fixed)) / 256;
};
export const displayPixel = (value: number) => {
  const twips = Math.trunc(value * 20) || 0;
  return Math.max(-2147483648, Math.min(2147483647, twips)) / 20;
};
