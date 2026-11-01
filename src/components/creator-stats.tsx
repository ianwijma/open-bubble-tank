'use client';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { TankDesign } from '@/game/core/types';
import { CLASS_SPEED } from '@/game/core/constants';
import { CREATOR_PALETTE, creatorWeaponSummary } from '@/game/core/creator-palette';
import { CreatorPrimitives, CreatorRasterArt } from './creator-controls';
import { CreatorText } from './creator-text';
export function CreatorStats({
  pack,
  design,
  classId,
}: {
  pack: AssetPack;
  design: TankDesign;
  classId: number;
}) {
  const p = CREATOR_PALETTE,
    raster = pack.creatorFrames.get('palette:stats');
  const values: Record<string, string> = {
    Speed_txt: design.avatar ? 'Speed:' : '',
    speed_txt: design.avatar ? ` ${Math.round(CLASS_SPEED[classId - 1] * 100)}%` : '',
    PrimarySecondary_txt: design.avatar
      ? 'Primary Weapons:\n\n\nSecondary Weapons:'
      : 'Primary Weapons:\n\n\nBehavior Weapons:',
    PassiveBehavior_txt: design.avatar ? 'Passive Weapons:' : '',
    primary_txt: creatorWeaponSummary(design, design.avatar ? 2 : 4),
    secondary_txt: creatorWeaponSummary(design, design.avatar ? 3 : 6),
    passive_txt: design.avatar ? creatorWeaponSummary(design, 5) : '',
  };
  return (
    <aside
      className="creator-stats"
      aria-label="Tank statistics"
      style={{ left: p.origin.tx / 20, top: p.origin.ty / 20 }}
    >
      {raster ? (
        <CreatorRasterArt raster={raster} />
      ) : (
        <svg aria-hidden="true" width={154} height={161} viewBox="0 0 154 161">
          <CreatorPrimitives pieces={[...p.stats.background, ...p.stats.header]} />
        </svg>
      )}
      {p.stats.fields.map((field) => (
        <CreatorText
          key={field.name}
          pack={pack}
          field={field}
          y={field.y + (!design.avatar && !field.name.toLowerCase().includes('speed') ? -18 : 0)}
          text={values[field.name] ?? ''}
        />
      ))}
    </aside>
  );
}
