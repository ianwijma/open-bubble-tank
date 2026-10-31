import { captureFrame } from './pixi-capture';
import { Application, Container, Rectangle } from 'pixi.js';
import {
  AssetPack,
  type Raster,
  type SpriteInfo,
  type SwfGlowFilter,
} from '../../src/game/assets/asset-pack';
import { buildDisplayList } from '../../src/game/assets/display-list';
import { IDENTITY_COLOR, type SwfColorTransform } from '../../src/game/assets/swf-color-transform';
import { HUD } from '../../src/game/core/hud';
import { SwfSymbolView } from '../../src/game/render/swf-symbol-view';
import { SwfTextures } from '../../src/game/render/swf-textures';
import { oracleColor, oracleGlow, premultiply } from './glow-oracle';

/** Authored parameter coverage, independent shader pixels, and native-effect snapshots. */
export async function showGlowProof(pack: AssetPack, host: HTMLElement) {
  const app = new Application(),
    textures = new SwfTextures(),
    synthetic = new AssetPack('mock');
  await app.init({
    width: 550,
    height: 450,
    resolution: 1,
    backgroundAlpha: 0,
    autoStart: false,
    preference: 'webgl',
    preserveDrawingBuffer: true,
    antialias: false,
  });
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 24;
  const source = canvas.getContext('2d')!,
    pixels = source.createImageData(32, 24);
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4;
      pixels.data[i + 2] = 255;
      pixels.data[i + 3] = x < 16 ? 128 : 255;
    }
  source.putImageData(pixels, 0, 0);
  synthetic.leaves.set(30002, {
    canvas,
    x: -16,
    y: -12,
    width: 32,
    height: 24,
    resolution: 1,
    pixels: pixels.data,
    url: '',
  } satisfies Raster);
  const sprite: SpriteInfo = {
    id: 30000,
    frameCount: 1,
    placements: [{ frame: 1, depth: 1, charId: 30002 }],
  };
  const overlap: SpriteInfo = {
    id: 30004,
    frameCount: 1,
    placements: [
      { frame: 1, depth: 1, charId: 30002 },
      { frame: 1, depth: 2, charId: 30002 },
    ],
  };
  const sprites = new Map([
    [30000, sprite],
    [30004, overlap],
  ]);
  synthetic.spriteInfo = (id) => sprites.get(id);
  synthetic.displayList = (id, age) => {
    const info = sprites.get(id);
    return info ? buildDisplayList(info, age) : [];
  };
  const view = new SwfSymbolView(30000, synthetic, textures),
    scene = new Container();
  scene.addChild(view.root);
  view.root.position.set(64, 64);
  const raw = document.createElement('canvas');
  raw.width = raw.height = 128;
  const rawCtx = raw.getContext('2d')!;
  rawCtx.drawImage(canvas, 48, 52);
  const base = premultiply(rawCtx.getImageData(0, 0, 128, 128).data);
  const baseFilter: SwfGlowFilter = {
    kind: 'glow',
    color: [255, 153, 51, 255],
    blurX: 6,
    blurY: 6,
    strength: 1,
    inner: false,
    knockout: false,
    compositeSource: true,
    passes: 1,
  };
  const cases: {
    name: string;
    filters: SwfGlowFilter[];
    color?: SwfColorTransform;
    alpha?: number;
  }[] = [
    { name: 'Unfiltered control', filters: [] },
    ...[false, true].flatMap((inner) => [
      { name: `${inner ? 'Inner' : 'Outer'} composite`, filters: [{ ...baseFilter, inner }] },
      {
        name: `${inner ? 'Inner' : 'Outer'} knockout`,
        filters: [{ ...baseFilter, inner, knockout: true }],
      },
      {
        name: `${inner ? 'Inner' : 'Outer'} hidden source`,
        filters: [{ ...baseFilter, inner, compositeSource: false }],
      },
    ]),
    { name: 'No-pass still composes', filters: [{ ...baseFilter, passes: 0, knockout: true }] },
    {
      name: 'Zero axes still compose',
      filters: [{ ...baseFilter, blurX: 0, blurY: 1, knockout: true }],
    },
    {
      name: 'Inherited fade after knockout',
      filters: [{ ...baseFilter, knockout: true }],
      alpha: 0.5,
    },
    {
      name: 'Tint after orange glow',
      filters: [baseFilter],
      color: { mult: [141 / 256, 141 / 256, 141 / 256, 1], add: [115, 115, 115, 0] },
    },
    {
      name: 'Saturation before premultiply',
      filters: [],
      color: { mult: [2, 2, 2, 2], add: [0, 0, 0, 0] },
    },
    {
      name: 'Add-alpha preserves empty pixels',
      filters: [baseFilter],
      color: { mult: [1, 1, 1, 0.5], add: [0, 0, 0, 40] },
    },
  ];
  const unique = new Map<string, SwfGlowFilter>();
  for (let id = 1; id < 65536; id++)
    for (const p of pack.spriteInfo(id)?.placements ?? [])
      for (const f of p.filters ?? []) unique.set(JSON.stringify(f), f);
  for (const [i, f] of [...unique.values()].entries())
    cases.push({ name: `Authored variant ${i + 1}`, filters: [f] });
  if (pack.mode === 'swf') {
    const stack = pack.spriteInfo(1506)!.placements.find((p) => p.filters?.length === 2)!.filters!;
    cases.push({ name: 'Fire HUD ordered stack', filters: stack, alpha: HUD.fire.alpha });
  }
  const gallery = document.createElement('canvas');
  gallery.width = 550;
  gallery.height = 450;
  const g = gallery.getContext('2d')!;
  g.fillStyle = '#0b3c5a';
  g.fillRect(0, 0, 550, 450);
  const results: { name: string; maxDelta: number; meanDelta: number; ink: number }[] = [];
  const extract = (target: Container) => {
    const frame = captureFrame(app.renderer, {
      target,
      frame: new Rectangle(0, 0, 128, 128),
      resolution: 1,
    });
    return { image: frame.canvas, pixels: frame.pixels };
  };
  const snapshot = (image: HTMLCanvasElement, index: number, label: string) => {
    const x = (index % 3) * 183.3333,
      y = Math.floor(index / 3) * 150;
    g.drawImage(image, x + 27, y + 15, 128, 128);
    g.fillStyle = '#e7f7ff';
    g.font = '10px Arial';
    g.fillText(label, x + 4, y + 12);
  };
  try {
    for (const [index, item] of cases.entries()) {
      sprite.placements[0].filters = item.filters;
      sprite.placements[0].color = item.color;
      view.setParentAlpha(item.alpha ?? 1);
      view.update(index + 1);
      const { image, pixels: actual } = extract(scene);
      let expected = base;
      for (const filter of item.filters) expected = oracleGlow(expected, 128, 128, filter);
      if (item.color) expected = oracleColor(expected, item.color);
      if (item.alpha !== undefined)
        expected = oracleColor(expected, { ...IDENTITY_COLOR, mult: [1, 1, 1, item.alpha] });
      let maxDelta = 0,
        sumDelta = 0,
        ink = 0;
      for (let i = 0; i < actual.length; i++) {
        const delta = Math.abs(actual[i] - expected[i]);
        maxDelta = Math.max(maxDelta, delta);
        sumDelta += delta;
        if (i % 4 === 3 && actual[i]) ink++;
      }
      results.push({ name: item.name, maxDelta, meanDelta: sumDelta / actual.length, ink });
      if (pack.mode !== 'swf' && index < 9) snapshot(image, index, item.name);
    }
    const cache: { cached: boolean; layer: boolean; alpha: number }[] = [];
    for (const cached of [false, true])
      for (const layer of [false, true]) {
        Object.assign(sprite.placements[0], {
          charId: 30004,
          filters: [],
          color: undefined,
          cacheAsBitmap: +cached,
          blendMode: layer ? 2 : 1,
        });
        view.setParentAlpha(0.5);
        view.update(cases.length + cache.length + 1);
        const { pixels } = extract(scene);
        cache.push({ cached, layer, alpha: pixels[(64 * 128 + 70) * 4 + 3] });
      }
    if (pack.mode === 'swf') {
      const examples = [
        [1820, 1, 'Life bubble · frame1'],
        [1820, 15, 'Life bubble · frame15'],
        [1820, 26, 'Life bubble · frame26'],
        [2178, 1, 'Seeker mine · unarmed'],
        [2178, 41, 'Seeker mine · armed'],
        [2058, 40, 'Apocalypse · frame40'],
        [1506, 1, 'Fire HUD · inner/outer'],
        [1520, 1, 'Minimap · halo'],
        [2173, 51, 'Collapse · isolated ERASE'],
      ] as const;
      for (const [index, [id, frame, name]] of examples.entries()) {
        const art = new SwfSymbolView(id, pack, textures),
          native = new Container();
        native.addChild(art.root);
        art.root.position.set(
          id === 1506 || id === 1520 ? 20 : 64,
          id === 1506 || id === 1520 ? 20 : 64,
        );
        if (id === 1506) {
          art.root.scale.set(0.5);
          art.setAlpha(HUD.fire.alpha);
        }
        if (id === 2173) {
          art.root.scale.set(0.1);
          art.setBlendMode(2);
        }
        art.update(frame);
        const { image } = extract(native);
        snapshot(image, index, name);
        art.destroy();
        native.destroy({ children: true });
      }
    }
    let hash = 2166136261;
    for (const byte of g.getImageData(0, 0, 550, 450).data) hash = Math.imul(hash ^ byte, 16777619);
    return { mode: pack.mode, variants: unique.size, results, cache, galleryHash: hash >>> 0 };
  } finally {
    view.destroy();
    scene.destroy({ children: true });
    textures.destroy();
    app.destroy(true, { children: true });
    host.replaceChildren(gallery);
  }
}
