import { FieldVisit } from '../../src/game/core/field-visit';
import { AssetPack } from '../../src/game/assets/asset-pack';
import { DEFAULT_SETTINGS } from '../../src/game/core/constants';
import { STARTER } from '../../src/game/data/catalog';
import type { TankDesign } from '../../src/game/core/types';
import { World, emptyInput } from '../../src/game/simulation/world';
import { createTank } from '../../src/game/simulation/tank';
import { GameRenderer } from '../../src/game/render/pixi-renderer';
import { direction } from '../../src/game/core/math';
import { applyProjectileStatus } from '../../src/game/simulation/status';
import { WEAPONS } from '../../src/game/data/weapons';
import { showMorphProof } from './morphs';
import { showPlaybackProof } from './playback';
import { showMinimapProof } from './minimap';
import { showHudProof } from './hud';
import { showFieldOverlayProof } from './field-overlays';
import { showTacticalHudProof } from './tactical-hud';
import { runPlaythrough } from '../playthrough/browser';
import { showPauseFlow } from './pause-flow';
import { showWinScreen } from './screens';
import { showDegradationProof } from './degradation';
import { showCrossingProof } from './crossing';
import { showPickupProof } from './pickups';
import { showPlayerClocks } from './player-clocks';
import { showCombatEffectsProof } from './combat-effects';
import { showProjectileOrderProof } from './projectile-order';
import { showActorAi } from './actor-ai';
import { showSeekerMineProof } from './seeker-mines';
import { showSpecialProjectilesProof } from './special-projectiles';
import { showProjectileClocksProof } from './projectile-clocks';
import { showMockAssetsProof } from './mock-assets';
import { showBubbleBusterProof } from './bubble-buster';
import { showTankArtProof } from './tank-art';
import { showScreenEffectsProof } from './screen-effects';
import { showMainEffects } from './main-effects';
import { showCollapseProof } from './collapse';
import { showGlowProof } from './glows';
import { showMockPartsProof } from './mock-parts';
import { showPartSnapshots } from './part-snapshots';
import { showMountedArt } from './mounted-art';
import { showTurretProtection } from './turret-protection';
import { showShieldOwnership } from './shield-ownership';
import { showForcefieldOrder } from './forcefield-order';
import { showShapeContact } from './shape-contact';
import { showForcefieldLifecycle } from './forcefield-lifecycle';
import { showMockPartMotion } from './mock-part-motion';
import { showMainMenuFlow } from './main-menu';
import { showSvgMasks } from './svg-masks';
import { showViewerFlow } from './viewer-flow';
import { showUnlockRetention } from './unlock-retention';

const file = document.querySelector<HTMLInputElement>('#swf')!;
const fixture = document.querySelector<HTMLSelectElement>('#fixture')!;
const stage = document.querySelector<HTMLDivElement>('#stage')!;
const status = document.querySelector<HTMLOutputElement>('#status')!;
const advance = document.querySelector<HTMLButtonElement>('#step')!;
const downgrade = document.querySelector<HTMLButtonElement>('#downgrade')!;
const secondary = document.querySelector<HTMLButtonElement>('#secondary')!;
const hit = document.querySelector<HTMLButtonElement>('#hit')!;
const zoom = document.querySelector<HTMLInputElement>('#zoom')!;
let pack: AssetPack | undefined, renderer: GameRenderer | undefined, world: World | undefined;
let unmountScreen: (() => void) | undefined;

const body = { ...STARTER.parts[0], type: 1003, scale: 1, radius: 22.5, x: 0, y: 0 };
function design(id: string, weapon?: number): TankDesign {
  return {
    ...STARTER,
    id,
    name: id,
    avatar: false,
    speed: 0,
    life: 100,
    parts: [body, ...(weapon ? [{ ...STARTER.parts[1], type: weapon, x: 0, y: 0, scale: 1 }] : [])],
  };
}
function simulate(count: number, secondary = false) {
  if (!world || !renderer) return;
  const input = { ...emptyInput(), fire: fixture.value === 'damage', secondary };
  world.viewZoom = Number(zoom.value) / 100;
  for (let i = 0; i < count; i++) world.step(input);
  renderer.draw(world, { ...DEFAULT_SETTINGS, zoom: Number(zoom.value) / 100 });
  status.dataset.playerDesign = world.player.design.id;
  status.dataset.secondary = world.player.guns
    .filter((gun) => gun.part.type >= 3000 && gun.part.type < 4000)
    .map((gun) => gun.part.type)
    .join(',');
  status.dataset.shield = String(world.player.shield);
  status.dataset.forcefieldReady = String(world.player.forcefieldReady);
  status.dataset.forcefieldFrame = String(world.player.forcefieldFrame);
  status.dataset.cameraScale = String(renderer.root.scale.x);
  status.dataset.travel = world.mode;
  status.dataset.field = `${world.field.col},${world.field.row}`;
  status.dataset.connections = String(world.connections.size);
  const beams = world.bullets.filter((b) => b.kind === 'beam' || b.kind === 'healBeam');
  const turrets = world.bullets.filter((b) => b.kind === 'turret');
  status.dataset.statusMarks = String(
    world.field.enemies.reduce((sum, tank) => sum + (tank.statusDecoration?.marks.length ?? 0), 0),
  );
  status.dataset.infectedLife = String(
    world.field.enemies.find((tank) => tank.status.infect > 0)?.life ?? '',
  );
  const beam = beams[0];
  if (beam) {
    const unit = direction(beam.angle);
    const sample = (distance: number) =>
      world!.hitProjectile(beam, beam.x + unit.x * distance, beam.y + unit.y * distance);
    status.dataset.beamMidHit = String(sample((beam.beamLength ?? 0) / 2));
    status.dataset.beamBeyondHit = String(sample((beam.beamLength ?? 0) + 30));
  } else {
    delete status.dataset.beamMidHit;
    delete status.dataset.beamBeyondHit;
  }
  status.textContent = `Ready · frame ${world.stats.frames} · ${beams.length} beam(s) · ${turrets.length} turret(s) · builds ${turrets.map((b) => b.build).join(',')} · patients ${world.field.enemies.map((t) => Math.floor(t.life)).join(',')}`;
}
async function reset() {
  if (!pack) return;
  advance.disabled = true;
  renderer?.destroy();
  unmountScreen?.();
  unmountScreen = undefined;
  renderer = undefined;
  world = undefined;
  stage.replaceChildren();
  stage.style.height = '';
  if (fixture.value === 'main-menu') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    unmountScreen = showMainMenuFlow(pack, stage);
    status.textContent = 'Ready · manually clocked production main menu';
    return;
  }
  if (fixture.value === 'pause-flow') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    unmountScreen = await showPauseFlow(pack, stage);
    status.textContent = 'Ready · manually clocked production pause/Info flow';
    return;
  }
  if (fixture.value === 'playthrough') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const run = await runPlaythrough(pack, stage, (text) => (status.textContent = text));
    renderer = run.renderer;
    unmountScreen = run.unmount;
    status.dataset.playthrough = JSON.stringify(run.proof);
    status.textContent = 'Ready · complete control-only run through boss and win';
    return;
  }
  if (fixture.value === 'mock-part-motion') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.mockPartMotion = JSON.stringify(await showMockPartMotion(pack, stage));
    status.textContent = 'Ready · all31 weapon and behavior previews with source motion';
    return;
  }
  if (fixture.value === 'mock-body-motion') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.mockBodyMotion = JSON.stringify(await showMockPartMotion(pack, stage, true));
    status.textContent = 'Ready · all20 procedural body parts with source motion';
    return;
  }
  if (fixture.value === 'turret-protection') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.turretProtection = JSON.stringify(await showTurretProtection(pack, stage));
    status.textContent = 'Ready · turret protection lifecycle and retained hits';
    return;
  }
  if (fixture.value === 'shield-ownership') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.shieldOwnership = JSON.stringify(await showShieldOwnership(pack, stage));
    status.textContent = 'Ready · independent shield mounts and callbacks';
    return;
  }
  if (fixture.value === 'forcefield-order') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.forcefieldOrder = JSON.stringify(await showForcefieldOrder(pack, stage));
    status.textContent = 'Ready · source child order and retained shield film';
    return;
  }
  if (fixture.value === 'shape-contact') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.shapeContact = JSON.stringify(await showShapeContact(pack, stage));
    status.textContent = 'Ready · geometric contact and attached artwork';
    return;
  }
  if (fixture.value === 'forcefield-lifecycle') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.forcefieldLifecycle = JSON.stringify(await showForcefieldLifecycle(pack, stage));
    status.textContent = 'Ready · forcefield cleanup and passive reconstruction';
    return;
  }
  if (fixture.value === 'mounted-art') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.mountedArt = JSON.stringify(await showMountedArt(pack, stage));
    status.textContent = 'Ready · independent mounted charge playback and contact';
    return;
  }
  if (fixture.value === 'part-snapshots') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.partSnapshots = JSON.stringify(await showPartSnapshots(pack, stage));
    status.textContent = 'Ready · independent frozen part poses and body-only class counting';
    return;
  }
  if (fixture.value === 'svg-masks') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.svgMasks = JSON.stringify(await showSvgMasks(pack, stage));
    status.textContent = 'Ready · grouped SVG mask pixels';
    return;
  }
  if (fixture.value === 'unlock-retention') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    unmountScreen = showUnlockRetention(pack, stage);
    status.textContent = 'Ready · retained run unlocks after two real downgrades';
    return;
  }
  if (['viewer-flow', 'viewer-flow-avatar', 'viewer-flow-eligibility'].includes(fixture.value)) {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    unmountScreen = showViewerFlow(
      pack,
      stage,
      fixture.value !== 'viewer-flow',
      fixture.value === 'viewer-flow-eligibility' ? 2 : 1,
    );
    status.textContent = 'Ready · manual viewer fade clock';
    return;
  }
  if (fixture.value === 'mock-parts') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    status.dataset.mockParts = JSON.stringify(await showMockPartsProof(pack, stage));
    status.textContent = 'Ready · all gun and behavior module silhouettes';
    return;
  }
  if (fixture.value === 'glows') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showGlowProof(pack, stage);
    status.dataset.glows = JSON.stringify(proof);
    status.textContent = 'Ready · authored glows, ordered filters and post-filter color';
    return;
  }
  if (fixture.value === 'collapse') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showCollapseProof(pack, stage);
    status.dataset.collapse = JSON.stringify(proof);
    status.textContent = 'Ready · collapse pivot, frame hold and isolated erase';
    return;
  }
  if (fixture.value === 'main-effects') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    unmountScreen = showMainEffects(pack, stage, (proof) => {
      status.dataset.mainEffects = JSON.stringify(proof);
      status.textContent = 'Ready · Main shake and independent flashes';
    });
    return;
  }
  if (fixture.value === 'screen-effects') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showScreenEffectsProof(pack, stage);
    status.dataset.screenEffects = JSON.stringify(proof);
    status.textContent = 'Ready · independent screen effects, pause looping and arrival cleanup';
    return;
  }
  if (fixture.value === 'tank-art') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showTankArtProof(pack, stage);
    status.dataset.tankArt = JSON.stringify(proof);
    status.textContent = 'Ready · tank stage clocks and source protection sizing';
    return;
  }
  if (fixture.value === 'bubble-buster') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showBubbleBusterProof(pack, stage);
    status.dataset.bubbleBuster = JSON.stringify(proof);
    status.textContent = 'Ready · Bubble Buster virtual walls and retained projectile state';
    return;
  }
  if (fixture.value === 'mock-assets') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showMockAssetsProof(pack, stage);
    status.dataset.mockAssets = JSON.stringify(proof);
    status.textContent = 'Ready · mock colors, authored sizes and shoot-down geometry';
    return;
  }
  if (fixture.value === 'projectile-clocks') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showProjectileClocksProof(pack, stage);
    status.dataset.projectileClocks = JSON.stringify(proof);
    status.textContent = 'Ready · retained projectile clocks';
    return;
  }
  if (fixture.value === 'special-projectiles') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showSpecialProjectilesProof(pack, stage);
    status.dataset.specialProjectiles = JSON.stringify(proof);
    status.textContent = 'Ready · special projectile phases and fresh instances';
    return;
  }
  if (fixture.value === 'seeker-mines') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showSeekerMineProof(pack, stage);
    status.dataset.seekerMines = JSON.stringify(proof);
    status.textContent = 'Ready · seeker-mine bounds and independent clocks';
    return;
  }
  if (fixture.value === 'actor-ai') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showActorAi(pack, stage);
    status.dataset.actorAi = JSON.stringify(proof);
    status.textContent = 'Ready · source actor movement and behavior clocks';
    return;
  }
  if (fixture.value === 'projectile-order') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showProjectileOrderProof(pack, stage);
    status.dataset.projectileOrder = JSON.stringify(proof);
    status.textContent = 'Ready · projectile alpha contact order';
    return;
  }
  if (fixture.value === 'combat-effects') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showCombatEffectsProof(pack, stage);
    status.dataset.combatEffects = JSON.stringify(proof);
    status.textContent = 'Ready · combat effect timelines and layers';
    return;
  }
  if (fixture.value === 'player-clocks') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    unmountScreen = showPlayerClocks(pack, stage, (proof) => {
      status.dataset.playerClocks = JSON.stringify(proof);
      status.textContent = 'Ready · production player clock loop';
    });
    return;
  }
  if (fixture.value === 'pickups') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showPickupProof(pack, stage);
    status.dataset.pickups = JSON.stringify(proof);
    status.textContent = 'Ready · pickup alpha contact';
    return;
  }
  if (fixture.value === 'crossing-combat') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showCrossingProof(pack, stage);
    status.dataset.crossing = JSON.stringify(proof);
    status.textContent = 'Ready · active crossing fields';
    return;
  }
  if (fixture.value === 'degradation') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showDegradationProof(pack, stage);
    status.dataset.degradation = JSON.stringify(proof);
    status.textContent = `Ready · body degradation ${JSON.stringify(proof)}`;
    return;
  }
  if (fixture.value === 'win-screen') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    unmountScreen = showWinScreen(pack, stage, (action) => {
      status.dataset.winAction = action;
    });
    status.textContent = 'Ready · authored win screen';
    return;
  }
  if (fixture.value === 'tactical-hud') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showTacticalHudProof(pack, stage);
    status.dataset.tacticalHud = JSON.stringify(proof);
    status.textContent = `Ready · tactical HUD ${JSON.stringify(proof)}`;
    return;
  }
  if (fixture.value === 'field-overlays') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showFieldOverlayProof(pack, stage);
    status.dataset.fieldOverlays = JSON.stringify(proof);
    status.textContent = `Ready · field overlays ${JSON.stringify(proof)}`;
    return;
  }
  if (fixture.value === 'hud') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showHudProof(pack, stage);
    status.dataset.hud = JSON.stringify(proof);
    status.textContent = `Ready · native HUD ${JSON.stringify(proof)}`;
    return;
  }
  if (fixture.value === 'minimap') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showMinimapProof(pack, stage);
    status.dataset.minimap = JSON.stringify(proof);
    status.textContent = `Ready · minimap alpha samples ${JSON.stringify(proof)}`;
    return;
  }
  if (fixture.value === 'playback') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showPlaybackProof(pack, stage);
    status.dataset.playbackSamples = String(proof.solidSamples);
    status.dataset.playbackMissed = String(proof.missedSolid);
    status.dataset.playbackSpurious = String(proof.spuriousHits);
    status.dataset.playbackFrames = JSON.stringify(proof.frames);
    status.textContent = `Ready · ${proof.solidSamples} solid samples · ${proof.missedSolid} misses · ${proof.spuriousHits} spurious hits`;
    return;
  }
  if (fixture.value === 'morphs') {
    downgrade.disabled = secondary.disabled = hit.disabled = true;
    const proof = await showMorphProof(pack, stage);
    status.dataset.morphSamples = String(proof.samples);
    status.dataset.morphError = String(proof.maxMeanError);
    status.dataset.morphErrors = JSON.stringify(proof.errors);
    status.dataset.morphCachePixels = String(proof.pixelCache);
    status.dataset.morphMaskMoves = String(proof.nestedMaskMoves);
    status.textContent = `Ready · ${proof.samples} morph/SVG comparisons · max mean error ${proof.maxMeanError.toFixed(3)} / 255 · ${proof.pixelCache.toLocaleString()} cached pixels`;
    return;
  }
  world = new World([], [], 50);
  world.player.guns = [];
  world.player.x = 0;
  world.player.y = 100;
  world.field.tutorial = 0;
  world.field.cleared = false;
  world.fieldVisit = new FieldVisit();
  let frames = 30;
  if (fixture.value === 'healing') {
    world.field.enemies = [
      createTank(1000, design('healer', 6002), 'enemy', -170, 0),
      createTank(1001, design('patient'), 'enemy', 90, 0, 100, 50),
    ];
  } else if (fixture.value === 'damage') {
    world.player = createTank(
      world.player.uid,
      { ...design('beam', 2017), avatar: true },
      'player',
      -100,
      0,
      50,
      1,
    );
    world.field.enemies = [createTank(1000, design('target'), 'enemy', 100, 0, 1000, 1000)];
  } else if (fixture.value === 'downgrade') {
    const lower = { ...design('lower', 3010), avatar: true };
    const higher = {
      ...design('higher', 3009),
      avatar: true,
      parts: [
        body,
        ...[-35, 35].map((x, i) => ({ ...body, x, key: `extra-${i}` })),
        { ...STARTER.parts[1], type: 3009, x: 0, y: 0 },
      ],
    };
    world = new World([], [STARTER, lower, higher], 50);
    world.secondaryHelpSeen = true; // This fixture isolates restored weapon artwork and firing.
    world.field.tutorial = 0;
  } else if (fixture.value === 'travel') {
    world.player.x = 425;
    world.player.y = 0;
    world.jump({ x: 1, y: 0 });
    frames = 1;
  } else if (fixture.value === 'protection') {
    world.player = createTank(
      world.player.uid,
      { ...design('forcefield', 5005), avatar: true },
      'player',
      0,
      100,
      50,
      1,
    );
    world.field.enemies = [createTank(1000, design('shield'), 'enemy', 120, 0)];
    world.field.enemies[0].shield = 1000;
    frames = 5;
  } else if (fixture.value === 'ink') {
    world.field.enemies = [createTank(1000, design('inked target'), 'enemy', 100, 0)];
    applyProjectileStatus(world, world.player, 'ink');
  } else if (fixture.value === 'statuses') {
    world.field.enemies = ['sticky', 'jam', 'stun', 'weaken', 'infect'].map((kind, index) => {
      const tank = createTank(
        1000 + index,
        {
          ...design(kind),
          parts: [
            body,
            ...[
              [-20, -20],
              [20, -20],
              [-20, 20],
              [20, 20],
            ].map(([x, y], i) => ({ ...body, key: `satellite-${i}`, type: 1001, radius: 7, x, y })),
          ],
        },
        'enemy',
        index < 3 ? ((index % 3) - 1) * 130 : (index - 3.5) * 160,
        index < 3 ? -20 : 90,
      );
      applyProjectileStatus(world!, tank, kind as 'sticky' | 'jam' | 'stun' | 'weaken' | 'infect');
      return tank;
    });
  } else {
    world.field.enemies = [createTank(1000, design('turret', 4032), 'enemy', 180, -50)];
    frames =
      { 'turret-1': 110, 'turret-2': 200, 'turret-3': 280, 'turret-4': 380 }[fixture.value] ?? 110;
  }
  world.hitTest = pack.hitTest;
  world.hitPart = pack.hitPart;
  world.hitProjectile = pack.hitProjectile;
  world.projectileBounds = (b) =>
    pack!.projectileBounds(
      b,
      b.kind === 'turret' ? world!.allTanks().find((t) => t.uid === b.owner) : undefined,
    );
  renderer = new GameRenderer(pack);
  await renderer.init(stage, DEFAULT_SETTINGS);
  simulate(frames);
  advance.disabled = false;
  secondary.disabled = false;
  downgrade.disabled = fixture.value !== 'downgrade';
  hit.disabled = fixture.value !== 'protection';
}
file.addEventListener('change', async () => {
  const selected = file.files?.[0];
  if (!selected) return;
  file.disabled = true;
  try {
    pack = await AssetPack.fromSWF(selected, (progress, label) => {
      status.textContent = `${Math.round(progress * 100)}% ${label}`;
    });
    await reset();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    file.disabled = false;
  }
});
document.querySelector('#mock')!.addEventListener('click', async () => {
  renderer?.destroy();
  renderer = undefined;
  unmountScreen?.();
  unmountScreen = undefined;
  pack?.dispose();
  pack = await AssetPack.mock();
  await reset();
});
fixture.addEventListener('change', () => {
  void reset().catch((error) => {
    status.textContent = String(error);
  });
});
advance.addEventListener('click', () => simulate(10));
secondary.addEventListener('click', () => simulate(1, true));
downgrade.addEventListener('click', () => {
  if (world) {
    world.damage(world.player, world.player.life + 1);
    simulate(1);
  }
});
zoom.addEventListener('input', () => simulate(0));
hit.addEventListener('click', () => {
  if (!world || !world.player.guns[0]) return;
  world.spawnVolley(world.player, world.player.guns[0], WEAPONS[2001]);
  const shot = world.bullets.at(-1)!;
  shot.x = world.player.x + 100;
  shot.y = world.player.y;
  world.damage(world.player, 10, shot);
  shot.dead = true;
  simulate(1);
});
