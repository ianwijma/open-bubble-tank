import { svgMaskDefinition } from '../../src/game/assets/svg-mask';
import { AssetPack } from '../../src/game/assets/asset-pack';

/** The real compiler must retain nested group transforms, holes and alpha-zero mask fills. */
async function composedMask() {
  const pack = new AssetPack('swf');
  const matrix = (x = 0, y = 0) => ({ a: 1, b: 0, c: 0, d: 1, tx: x * 20, ty: y * 20 });
  Object.assign(pack, {
    shapes: new Map(
      [96001, 96002].map((id) => [
        id,
        {
          id,
          bounds: { xMin: 0, yMin: 0, xMax: 2000, yMax: 2000 },
        },
      ]),
    ),
    symbols: {
      svgByCid: new Map([
        [96001, '<svg><rect width="100" height="100" fill="red"/></svg>'],
        [
          96002,
          '<svg><path fill="blue" fill-opacity="0" fill-rule="evenodd" d="M0 0H40V40H0Z M10 10H30V30H10Z"/></svg>',
        ],
      ]),
    },
    sprites: new Map([
      [
        96003,
        {
          id: 96003,
          frameCount: 1,
          placements: [
            {
              frame: 1,
              depth: 1,
              charId: 96002,
              matrix: matrix(10, 20),
              color: { mult: [1, 1, 1, 0], add: [0, 0, 0, 0] },
            },
          ],
        },
      ],
      [
        96000,
        {
          id: 96000,
          frameCount: 1,
          placements: [
            { frame: 1, depth: 1, charId: 96003, matrix: matrix(20, 0), clipDepth: 2 },
            { frame: 1, depth: 2, charId: 96001 },
          ],
        },
      ],
    ]),
  });
  try {
    const raster = await pack.rasterSymbol(96000);
    if (!raster) throw new Error('Missing synthetic compound mask raster');
    const pixel = (x: number, y: number) =>
      Array.from(
        raster.canvas
          .getContext('2d')!
          .getImageData(
            Math.floor((x - raster.x) * raster.resolution),
            Math.floor((y - raster.y) * raster.resolution),
            1,
            1,
          ).data,
      );
    return { visible: pixel(35, 25), hole: pixel(45, 35), outside: pixel(75, 25) };
  } finally {
    pack.dispose();
  }
}

/** Pixel evidence for the production SVG composer, independent of Pixi masks. */
export async function showSvgMasks(pack: AssetPack, host: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  host.append(canvas);
  const context = canvas.getContext('2d')!;
  const bounds = { x: 0, y: 0, width: 100, height: 100 };
  const inner = svgMaskDefinition(
    'inner',
    '<g transform="translate(10 0)"><rect width="10" height="100"/></g>',
    bounds,
  );
  const cases = [
    [
      'transformed',
      '<g transform="translate(10 20)"><g transform="scale(2)"><rect width="10" height="10"/></g></g>',
    ],
    [
      'transparent-fill',
      '<g opacity="0" filter="url(#absent)"><path fill="red" fill-opacity="0" d="M10 10H30V30H10Z"/></g>',
    ],
    ['stroke-only', '<path fill="none" stroke="red" stroke-width="20" d="M10 10H30V30H10Z"/>'],
    ['hole', '<path fill="red" fill-rule="evenodd" d="M10 10H80V80H10Z M30 30H60V60H30Z"/>'],
    [
      'nested',
      `<defs>${inner}</defs><g transform="translate(20 0)"><g mask="url(#inner)"><rect width="80" height="80"/></g></g>`,
    ],
  ];
  const proof: Record<string, { visible: number[]; outside: number[] }> = {};
  const probes = [
    [15, 25, 35, 25],
    [15, 15, 35, 15],
    [15, 15, 5, 15],
    [15, 15, 40, 40],
    [35, 15, 25, 15],
  ];
  for (const [index, [name, body]] of cases.entries()) {
    const image = new Image();
    const mask = svgMaskDefinition('outer', body, bounds);
    image.src =
      'data:image/svg+xml,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs>${mask}</defs><rect width="100" height="100" fill="red" mask="url(#outer)"/></svg>`,
      );
    await image.decode();
    const x = index * 105;
    context.drawImage(image, x, 0);
    const [px, py, ox, oy] = probes[index];
    proof[name] = {
      visible: Array.from(context.getImageData(x + px, py, 1, 1).data),
      outside: Array.from(context.getImageData(x + ox, oy, 1, 1).data),
    };
  }
  let native: null | {
    cacheCount: number;
    detailBackground: number[];
    closedHeader: number[];
    closedBody: number[];
    openBody: number[];
    guideRemote: number[];
    guideLocal: number[];
    guideNote: number[];
  } = null;
  if (pack.mode === 'swf') {
    const detail = pack.creatorFrames.get('viewer:1169:1');
    const closed = pack.creatorFrames.get('viewer:1137:1');
    const open = pack.creatorFrames.get('viewer:statistics:10');
    const guide = pack.creatorFrames.get('viewer:1412:2');
    const pixel = (raster: typeof detail, x: number, y: number) => {
      if (!raster) throw new Error('Missing viewer raster');
      const px = Math.floor((x - raster.x) * raster.resolution),
        py = Math.floor((y - raster.y) * raster.resolution);
      return Array.from(raster.canvas.getContext('2d')!.getImageData(px, py, 1, 1).data);
    };
    native = {
      cacheCount: [...pack.creatorFrames.keys()].filter((key) => key.startsWith('viewer:')).length,
      detailBackground: pixel(detail, 0, 0),
      closedHeader: pixel(closed, 50, -80),
      closedBody: pixel(closed, 50, -40),
      openBody: pixel(open, 50, -40),
      guideRemote: pixel(guide, 300, 80),
      guideLocal: pixel(guide, 200, 190),
      guideNote: pixel(guide, 100, 300),
    };
  }
  if (native) {
    for (const [i, key] of [
      'viewer:1169:1',
      'viewer:1137:1',
      'viewer:statistics:10',
      'viewer:1412:2',
    ].entries()) {
      const raster = pack.creatorFrames.get(key)!;
      const scale = Math.min(1, 130 / raster.width, 250 / raster.height);
      context.drawImage(raster.canvas, i * 135, 140, raster.width * scale, raster.height * scale);
    }
  }
  return { cases: proof, composed: await composedMask(), native };
}
