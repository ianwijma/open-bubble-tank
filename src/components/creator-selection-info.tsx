'use client';
import { useId, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import { CREATOR_CONTROLS } from '@/game/core/creator-controls';
import { CREATOR_PALETTE } from '@/game/core/creator-palette';
import { creatorWeaponInfoText, type CreatorWeaponIcon } from '@/game/core/creator-details';
import { partById } from '@/game/data/catalog';
import { CreatorPrimitives, CreatorRasterArt } from './creator-controls';
import { CreatorText } from './creator-text';
export function CreatorSelectionInfo({
  pack,
  icons,
}: {
  pack: AssetPack;
  icons: CreatorWeaponIcon[];
}) {
  const [focus, setFocus] = useState<{ key: string; icons: CreatorWeaponIcon[] } | null>(null),
    id = useId();
  // Rebuilding source _-Ev removes its popup, even when the selected IDs are unchanged.
  const active = focus?.icons === icons ? icons.find((i) => i.key === focus.key) : undefined;
  const part = active && partById(active.type),
    p = CREATOR_PALETTE.selectionInfo,
    icon = pack.creatorFrames.get('selection-info:icon'),
    popup = pack.creatorFrames.get('selection-info:popup'),
    b = p.icon.bounds;
  const close = () => setFocus(null);
  return (
    <div
      className="creator-selection-info"
      style={{ left: CREATOR_CONTROLS.workspace.tx / 20, top: CREATOR_CONTROLS.workspace.ty / 20 }}
    >
      {icons.map((item) => (
        <button
          className="creator-weapon-info-icon"
          key={item.key}
          data-part-key={item.key}
          aria-label={`Info for ${partById(item.type)?.name ?? item.type}`}
          aria-describedby={active?.key === item.key ? id : undefined}
          style={{ left: item.x + b.x, top: item.y + b.y, width: b.width, height: b.height }}
          onPointerEnter={() => setFocus({ key: item.key, icons })}
          onFocus={() => setFocus({ key: item.key, icons })}
          onBlur={close}
          onClick={() => setFocus({ key: item.key, icons })}
          onPointerDown={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
          }}
        >
          {icon ? (
            <CreatorRasterArt raster={icon} offsetX={-b.x} offsetY={-b.y} />
          ) : (
            <svg aria-hidden="true" width={b.width} height={b.height} viewBox="0 0 14.05 15">
              <rect width={14.05} height={15} fill="white" fillOpacity={0.6} />
              <path
                d="M7.5 7.05H2v5.5h5.5V7.05"
                fill="none"
                stroke="black"
                strokeWidth={1}
                strokeLinejoin="round"
              />
              <path
                d="M4.25 10.3L12.3 2.25M7.45 2.25h4.85v4.3"
                fill="none"
                stroke="black"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      ))}
      {active && part ? (
        <aside
          role="tooltip"
          id={id}
          aria-label={`${part.name} selection info`}
          className="creator-weapon-info-popup"
          data-part-key={active.key}
          style={{
            left: active.x,
            top: active.y,
            width: p.popup.bounds.width,
            height: p.popup.bounds.height,
          }}
          onPointerLeave={close}
          onPointerDown={(e) => e.preventDefault()}
        >
          {popup ? (
            <CreatorRasterArt raster={popup} />
          ) : (
            <svg aria-hidden="true" width={p.popup.bounds.width} height={p.popup.bounds.height}>
              <CreatorPrimitives pieces={p.popup.static} />
            </svg>
          )}
          {p.popup.fields.map((field) => (
            <CreatorText
              key={field.name}
              pack={pack}
              field={field}
              text={creatorWeaponInfoText(part)[field.name] ?? ''}
            />
          ))}
        </aside>
      ) : null}
    </div>
  );
}
