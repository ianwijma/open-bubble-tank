'use client';
import { useEffect, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { TankDesign } from '@/game/core/types';
export function TankPreview({
  tank,
  pack,
  size = 130,
}: {
  tank: TankDesign;
  pack: AssetPack;
  size?: number;
}) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    setSrc(pack.preview(tank, size));
  }, [tank, pack, size]);
  return src ? (
    <img className="tank-preview" width={size} height={size} src={src} alt={`${tank.name} tank`} />
  ) : (
    <span style={{ width: size, height: size }} />
  );
}
