import type { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { World } from '../../src/game/simulation/world';
import { PlaythroughPilot } from './pilot';
import { showWinScreen } from '../fixtures/screens';

/** Accelerated control-only session with the exact browser collision providers used by GameViewport. */
export async function runPlaythrough(
  pack: AssetPack,
  host: HTMLElement,
  progress: (text: string) => void,
) {
  const seed = 17,
    world = new World([], [], seed),
    pilot = new PlaythroughPilot();
  world.hitTest = pack.hitTest;
  world.hitPart = pack.hitPart;
  world.hitProjectile = pack.hitProjectile;
  world.protectionRadius = pack.protectionRadius;
  world.projectileBounds = (bullet) =>
    pack.projectileBounds(
      bullet,
      bullet.kind === 'turret'
        ? world.allTanks().find((tank) => tank.uid === bullet.owner)
        : undefined,
    );
  const renderer = new GameRenderer(pack),
    settings = { ...DEFAULT_SETTINGS, quality: 'low' as const };
  await renderer.init(host, settings);
  const sheet = document.createElement('canvas');
  sheet.id = 'run-history';
  sheet.width = 550;
  sheet.height = 1250;
  const ctx = sheet.getContext('2d')!;
  ctx.fillStyle = '#0b3c5a';
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  const milestones: {
    label: string;
    frame: number;
    level: number;
    life: number;
    tank: string;
    field: string;
  }[] = [];
  let frame = 0,
    digest = 2166136261,
    choices = 0,
    bossSeen = false,
    downGrades = 0,
    previousLevel = 0;
  const capture = (label: string) => {
    renderer.draw(world, settings);
    const index = milestones.length,
      x = (index % 2) * 275,
      y = Math.floor(index / 2) * 250;
    ctx.drawImage(renderer.app.canvas, x, y, 275, 225);
    ctx.fillStyle = '#e7f7ff';
    ctx.font = '11px Arial';
    ctx.fillText(`${label} · f${frame} · HP${world.player.life}`, x + 8, y + 243);
    milestones.push({
      label,
      frame,
      level: world.progression.level,
      life: world.player.life,
      tank: world.player.design.id,
      field: `${world.field.col},${world.field.row}`,
    });
  };
  capture('Fresh game');
  try {
    for (; frame < 200000 && world.mode !== 'won'; frame++) {
      const input = pilot.input(world);
      if (pilot.upgrades.length > choices) {
        choices = pilot.upgrades.length;
        if (milestones.length < 7) capture(`Upgrade${world.progression.level}`);
      }
      // Replay fingerprint includes every normal input; it is evidence, not a gameplay mutation.
      for (const value of [
        Number(input.up),
        Number(input.down),
        Number(input.left),
        Number(input.right),
        Number(input.fire),
        Number(input.secondary),
        Math.round(input.aim.x * 100),
        Math.round(input.aim.y * 100),
      ])
        digest = Math.imul(digest ^ value, 16777619);
      world.step(input);
      world.drainEvents();
      if (world.progression.level < previousLevel) downGrades++;
      previousLevel = world.progression.level;
      if (world.bossTriggered && !bossSeen) {
        bossSeen = true;
        capture('Boss field generated');
      }
      if (frame % 1000 === 0) {
        progress(
          `Run · frame${frame} · level${world.progression.level} · life${world.player.life} · ${world.stats.kills} kills`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    if (world.mode !== 'won')
      throw new Error(
        `Pilot did not win after${frame} frames: level${world.progression.level}, life${world.player.life}, boss${world.bossTriggered}/${world.bossDefeated}`,
      );
    capture('Boss defeated · won');
    const panel = document.createElement('div');
    panel.style.position = 'absolute';
    panel.style.inset = '0';
    host.appendChild(panel);
    const unmount = showWinScreen(pack, panel, (action) => (host.dataset.winAction = action));
    sheet.style.width = '550px';
    sheet.style.height = '1250px';
    host.after(sheet);
    const proof = {
      seed,
      assets: pack.mode,
      frames: frame,
      inputDigest: digest >>> 0,
      mode: world.mode,
      bossTriggered: world.bossTriggered,
      bossDefeated: world.bossDefeated,
      badge: world.achievements.has('Boss Badge'),
      upgrades: pilot.upgrades,
      helpClosed: pilot.helpClosed,
      downGrades,
      stats: { ...world.stats },
      milestones,
    };
    return {
      renderer,
      proof,
      unmount: () => {
        unmount();
        panel.remove();
        sheet.remove();
      },
    };
  } catch (error) {
    renderer.destroy();
    throw error;
  }
}
