/** DisplayObject setters retain signed8.8 alpha and integer twips, including truncation. */
export const displayAlpha = (value: number) => ((Math.trunc(value * 256) << 16) >> 16) / 256;
export const displayPixel = (value: number) => {
  const twips = Math.trunc(value * 20);
  return twips === 0 ? 0 : twips / 20;
};
