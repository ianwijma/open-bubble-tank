import { describe, expect, test } from 'bun:test';
import { StageCapture } from '../src/game/services/stage-capture';

const source = (value: number) => ({ value }) as unknown as CanvasImageSource;

/** A small canvas port records composition; these tests do not claim browser pixels. */
function withCanvas<T>(run: (created: () => number) => T): T {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let created = 0;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: (tag: string) => {
        if (tag !== 'canvas') throw new Error('Unexpected element');
        created++;
        const pixels = new Uint8ClampedArray(550 * 450 * 4);
        const context = {
          save() {},
          restore() {},
          drawImage(image: unknown) {
            pixels[0] = (image as { value: number }).value;
          },
          getImageData(x: number, y: number, width: number, height: number) {
            expect([x, y, width, height]).toEqual([0, 0, 550, 450]);
            return { data: pixels, width, height, colorSpace: 'srgb' } as ImageData;
          },
        } as unknown as CanvasRenderingContext2D;
        return { width: 0, height: 0, getContext: () => context };
      },
    },
  });
  try {
    return run(() => created);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
}

describe('owned stage capture preparation', () => {
  test('fresh capture reads model changes before a scheduled draw, without changing default capture', () =>
    withCanvas(() => {
      const capture = new StageCapture();
      let worldValue = 1,
        renderedValue = 1,
        preparations = 0;
      capture.register({
        order: 0,
        base: true,
        prepare: () => {
          renderedValue = worldValue;
          preparations++;
        },
        draw: (context) => context.drawImage(source(renderedValue), 0, 0),
      });
      worldValue = 50;
      expect(capture.capture()!.data[0]).toBe(1);
      expect(preparations).toBe(0);
      expect(capture.capture({ refresh: true })!.data[0]).toBe(50);
      expect(preparations).toBe(1);
      expect(worldValue).toBe(50);
    }));

  test('all layers prepare in composition order before the first layer is copied', () =>
    withCanvas(() => {
      const capture = new StageCapture(),
        seen: string[] = [];
      capture.register({
        order: 10,
        prepare: () => {
          seen.push('effects.prepare');
        },
        draw: () => {
          seen.push('effects.copy');
        },
      });
      capture.register({
        order: -1,
        prepare: () => {
          seen.push('background.prepare');
        },
        draw: () => {
          seen.push('background.copy');
        },
      });
      capture.register({
        order: 0,
        base: true,
        prepare: () => {
          seen.push('world.prepare');
        },
        draw: () => {
          seen.push('world.copy');
        },
      });
      capture.capture({ refresh: true });
      expect(seen).toEqual([
        'background.prepare',
        'world.prepare',
        'effects.prepare',
        'background.copy',
        'world.copy',
        'effects.copy',
      ]);
    }));

  test('missing base never triggers preparation or allocates a capture surface', () =>
    withCanvas((created) => {
      const capture = new StageCapture();
      let prepared = false;
      capture.register({
        order: 10,
        prepare: () => {
          prepared = true;
        },
        draw: () => {},
      });
      expect(capture.capture({ refresh: true })).toBeUndefined();
      expect(prepared).toBe(false);
      expect(created()).toBe(0);
    }));

  test('a released layer is neither prepared nor copied later in the same capture', () =>
    withCanvas(() => {
      const capture = new StageCapture(),
        seen: string[] = [];
      let release = () => {};
      capture.register({
        order: 0,
        base: true,
        prepare: () => {
          seen.push('world.prepare');
          release();
        },
        draw: () => {
          seen.push('world.copy');
        },
      });
      release = capture.register({
        order: 10,
        prepare: () => {
          seen.push('disposed.prepare');
        },
        draw: () => {
          seen.push('disposed.copy');
        },
      });
      capture.capture({ refresh: true });
      expect(seen).toEqual(['world.prepare', 'world.copy']);
    }));

  test('releasing the base during preparation does not copy a disposed surface', () =>
    withCanvas((created) => {
      const capture = new StageCapture();
      let release = () => {},
        copied = false;
      release = capture.register({
        order: 0,
        base: true,
        prepare: () => release(),
        draw: () => {
          copied = true;
        },
      });
      expect(capture.capture({ refresh: true })).toBeUndefined();
      expect(copied).toBe(false);
      expect(created()).toBe(0);
    }));

  test('layers added while preparing wait until a later capture', () =>
    withCanvas(() => {
      const capture = new StageCapture(),
        seen: string[] = [];
      let added = false;
      capture.register({
        order: 0,
        base: true,
        prepare: () => {
          if (added) return;
          added = true;
          capture.register({
            order: 10,
            prepare: () => {
              seen.push('new.prepare');
            },
            draw: () => {
              seen.push('new.copy');
            },
          });
        },
        draw: () => {
          seen.push('world.copy');
        },
      });
      capture.capture({ refresh: true });
      expect(seen).toEqual(['world.copy']);
      seen.length = 0;
      capture.capture({ refresh: true });
      expect(seen).toEqual(['new.prepare', 'world.copy', 'new.copy']);
    }));

  test('preparation failures propagate instead of silently returning stale paint', () =>
    withCanvas((created) => {
      const capture = new StageCapture(),
        failure = new Error('paint failed');
      let copied = false;
      capture.register({
        order: 0,
        base: true,
        prepare: () => {
          throw failure;
        },
        draw: () => {
          copied = true;
        },
      });
      expect(() => capture.capture({ refresh: true })).toThrow(failure);
      expect(copied).toBe(false);
      expect(created()).toBe(0);
    }));
});
