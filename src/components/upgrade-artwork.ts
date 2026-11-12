'use client';
import { useEffect, useState } from 'react';
import type { AssetPack } from '@/game/assets/asset-pack';
import type { StageRuntime } from '@/game/services/stage-runtime';
import type { UpgradeMenu } from '@/game/services/upgrade-menu';
import type { UpgradeSlotId } from '@/game/core/upgrade-loading';
import { upgradePartBounds, upgradePreviewPlacement } from '@/game/core/upgrade-screen';

/** One retained renderer supplies the three _-Tr(0) previews, including their independent art clocks. */
export function useUpgradeArtwork(
  pack: AssetPack,
  stage: StageRuntime,
  menu: UpgradeMenu,
  canvases: Map<UpgradeSlotId, HTMLCanvasElement>,
) {
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false,
      unsubscribe: (() => void) | undefined;
    let renderer: import('@/game/render/creator-artwork').CreatorArtwork | undefined;
    let age = 1;
    const placements = new Map<number, ReturnType<typeof upgradePreviewPlacement>>();
    async function start() {
      const { CreatorArtwork } = await import('@/game/render/creator-artwork');
      if (cancelled) return;
      renderer = new CreatorArtwork(pack, 550);
      await renderer.init();
      if (cancelled) {
        renderer.destroy();
        return;
      }
      function draw() {
        const active = renderer;
        if (!active) return;
        menu.loading.slots.forEach(({ id, tank, card }) => {
          if (!tank || !card.attached) return;
          const index = id - 1;
          const canvas = canvases.get(id),
            ctx = canvas?.getContext('2d');
          if (!canvas || !ctx) return;
          const layer = `viewer:upgrade-${index}` as const,
            parts = tank.parts.map((part) => ({ part }));
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.setTransform(2, 0, 0, 2, 550, 550);
          if (!placements.has(index)) {
            active.draw(ctx, layer, parts, age);
            placements.set(
              index,
              upgradePreviewPlacement(
                tank.parts.flatMap((part) => {
                  const bounds = active.localBounds(part, layer);
                  return bounds ? [upgradePartBounds(part, bounds)] : [];
                }),
              ),
            );
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          const pose = placements.get(index)!;
          ctx.setTransform(2, 0, 0, 2, 550 + pose.x * 2, 550 + pose.y * 2);
          active.draw(ctx, layer, parts, age, pose.scale);
          canvas.dataset.upgradeReady = 'true';
          canvas.dataset.upgradeAge = String(age);
          canvas.dataset.upgradeScale = String(pose.scale);
          canvas.dataset.upgradeBounds = JSON.stringify(pose);
          menu.previewReady(id);
        });
      }
      unsubscribe = stage.subscribe({ step: () => age++, draw });
      draw();
    }
    void start().catch((error) => {
      if (!cancelled)
        setError(error instanceof Error ? error.message : 'Unable to render upgrade previews.');
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
      renderer?.destroy();
    };
  }, [pack, stage, menu, canvases]);
  return error;
}
