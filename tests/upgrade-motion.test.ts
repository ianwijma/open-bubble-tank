import { describe, expect, test } from 'bun:test';
import { UpgradeMenuMotion, type UpgradeMenuCommand } from '../src/game/core/upgrade-motion';
import { PauseBitmapHistory } from '../src/game/core/bitmap-blur';

function advance(menu: UpgradeMenuMotion, count: number) {
  return Array.from({ length: count }, () => menu.advance()).flat();
}

function openingSteps(count = 39) {
  const menu = new UpgradeMenuMotion();
  const commands = advance(menu, count);
  return { menu, commands };
}

describe('UpgradeMenu retained presentation clock', () => {
  test('starts opaque and keeps loaded cards independent of delayed bottom controls', () => {
    const menu = new UpgradeMenuMotion();
    expect(menu.foregroundAlpha).toBe(1);
    expect(menu.counter).toBe(0);
    expect(menu.historyIndex).toBe(0);
    expect(menu.cardInputEnabled).toBe(true);
    expect(menu.bottomInputEnabled).toBe(false);
    const commands = advance(menu, 38);
    expect(menu.foregroundAlpha).toBe(1);
    expect(menu.counter).toBe(38);
    expect(menu.bottomInputEnabled).toBe(false);
    expect(commands.some((command) => command.type === 'write-foreground-alpha')).toBe(false);
    expect(menu.advance()).toEqual([{ type: 'attach-bottom-handlers' }]);
    expect(menu.counter).toBe(39);
    expect(menu.bottomInputEnabled).toBe(true);
    expect(advance(menu, 5)).toEqual([]);
  });

  test('saves the pre-blur bitmap nineteen times on opening frames2 through38', () => {
    const menu = new UpgradeMenuMotion();
    const actual: { frame: number; commands: UpgradeMenuCommand[] }[] = [];
    for (let frame = 1; frame <= 39; frame++) {
      const commands = menu.advance();
      if (commands.some((command) => command.type === 'save-bitmap'))
        actual.push({ frame, commands });
    }
    expect(actual).toEqual(
      Array.from({ length: 19 }, (_, index) => ({
        frame: (index + 1) * 2,
        commands: [{ type: 'save-bitmap', index }, { type: 'blur-bitmap' }],
      })),
    );
    expect(menu.savedFrames).toBe(19);
    expect(menu.historyIndex).toBe(19);
    expect(menu.foregroundAlpha).toBe(1);
  });

  test('selection reverses the partial history instead of inventing a completed opening', () => {
    const { menu } = openingSteps(7);
    expect(menu.beginClosing()).toBe(true);
    expect(menu.cardInputEnabled).toBe(false);
    expect(menu.bottomInputEnabled).toBe(false);
    expect(menu.beginClosing()).toBe(false);
    const frames = Array.from({ length: 8 }, () => menu.advance());
    expect(
      frames.map((commands) => commands.filter((command) => command.type === 'restore-bitmap')),
    ).toEqual([
      [{ type: 'restore-bitmap', index: 3, written: false }],
      [],
      [{ type: 'restore-bitmap', index: 2, written: true }],
      [],
      [{ type: 'restore-bitmap', index: 1, written: true }],
      [],
      [{ type: 'restore-bitmap', index: 0, written: true }],
      [],
    ]);
    expect(menu.counter).toBe(-1);
    expect(menu.historyIndex).toBe(-1);
    expect(menu.finished).toBe(false);
    expect(menu.advance()).toEqual([{ type: 'finish' }]);
  });

  test('even partial opening retains the source reverse-slot asymmetry', () => {
    const { menu } = openingSteps(2);
    menu.beginClosing();
    expect(menu.advance().map((command) => command.type)).toEqual(['write-foreground-alpha']);
    expect(menu.counter).toBe(1);
    expect(menu.advance()).toEqual([
      { type: 'write-foreground-alpha', value: 249 / 256 - 0.025, alpha: 242 / 256 },
      { type: 'restore-bitmap', index: 1, written: false },
    ]);
    expect(menu.counter).toBe(0);
    expect(menu.historyIndex).toBe(0);
    expect(menu.advance().map((command) => command.type)).toEqual(['write-foreground-alpha']);
    expect(menu.counter).toBe(-1);
    expect(menu.advance()).toEqual([{ type: 'finish' }]);
  });

  test('a selection before the first clock step still performs its one closing write', () => {
    const menu = new UpgradeMenuMotion();
    menu.beginClosing();
    expect(menu.advance()).toEqual([
      { type: 'write-foreground-alpha', value: 0.975, alpha: 249 / 256 },
    ]);
    expect(menu.counter).toBe(-1);
    expect(menu.savedFrames).toBe(0);
    expect(menu.finished).toBe(false);
    expect(menu.advance()).toEqual([{ type: 'finish' }]);
  });

  test('steady closing writes forty times, retains signed alpha and finishes one frame later', () => {
    const { menu } = openingSteps();
    menu.beginClosing();
    const frames = Array.from({ length: 40 }, () => menu.advance());
    expect(
      frames.flat().filter((command) => command.type === 'write-foreground-alpha'),
    ).toHaveLength(40);
    expect(frames[0]).toEqual([
      { type: 'write-foreground-alpha', value: 0.975, alpha: 249 / 256 },
      { type: 'restore-bitmap', index: 19, written: false },
    ]);
    expect(frames.flat().filter((command) => command.type === 'restore-bitmap')).toEqual(
      Array.from({ length: 20 }, (_, index) => ({
        type: 'restore-bitmap',
        index: 19 - index,
        written: index !== 0,
      })),
    );
    expect(frames[35][0]).toMatchObject({ alpha: 4 / 256 });
    expect(frames[36][0]).toMatchObject({ alpha: -2 / 256 });
    expect(frames[37][0]).toMatchObject({ alpha: -8 / 256 });
    expect(frames[38][0]).toMatchObject({ alpha: -14 / 256 });
    expect(frames[39][0]).toMatchObject({ alpha: -20 / 256 });
    expect(menu.foregroundAlpha).toBe(-20 / 256);
    expect(menu.counter).toBe(-1);
    expect(menu.finished).toBe(false);
    expect(menu.bottomInputEnabled).toBe(true);
    expect(menu.advance()).toEqual([{ type: 'finish' }]);
    expect(menu.finished).toBe(true);
    expect(menu.bottomInputEnabled).toBe(false);
    expect(menu.advance()).toEqual([]);
  });

  test('an already enabled bottom action remains usable while cards are closing', () => {
    const { menu } = openingSteps();
    menu.beginClosing();
    expect(menu.bottomInputEnabled).toBe(true);
    expect(menu.showChild('creator')).toBe(true);
    expect(menu.bottomHandlersAttached).toBe(true);
    expect(menu.bottomInputEnabled).toBe(false);
    advance(menu, 3);
    expect(menu.returnToOffers()).toBe(true);
    expect(menu.bottomInputEnabled).toBe(true);
    expect(menu.cardInputEnabled).toBe(false);
    expect(menu.counter).toBe(36);
  });

  test('creator and viewer visits keep the same clock, alpha and history', () => {
    const { menu } = openingSteps(10);
    menu.showChild('creator');
    expect(menu.cardInputEnabled).toBe(false);
    advance(menu, 3);
    expect(menu.returnToOffers()).toBe(true);
    expect(menu.counter).toBe(13);
    expect(menu.historyIndex).toBe(6);
    menu.showChild('viewer');
    expect(menu.advance()).toEqual([
      { type: 'update-viewer' },
      { type: 'save-bitmap', index: 6 },
      { type: 'blur-bitmap' },
    ]);
    menu.returnToOffers();
    expect(menu.counter).toBe(14);
    expect(menu.historyIndex).toBe(7);
    expect(menu.savedFrames).toBe(7);
    expect(menu.foregroundAlpha).toBe(1);
    expect(menu.advance()).toEqual([]);
    expect(menu.counter).toBe(15);
  });

  test('bottom listeners attach while a child is displayed without restarting on return', () => {
    const { menu } = openingSteps(38);
    menu.showChild('creator');
    expect(menu.advance()).toEqual([{ type: 'attach-bottom-handlers' }]);
    expect(menu.bottomHandlersAttached).toBe(true);
    expect(menu.bottomInputEnabled).toBe(false);
    menu.returnToOffers();
    expect(menu.bottomInputEnabled).toBe(true);
    expect(menu.counter).toBe(39);
    expect(menu.historyIndex).toBe(19);
    expect(menu.advance()).toEqual([]);
  });

  test('a retained viewer updates before the closing completion callback', () => {
    const { menu } = openingSteps();
    menu.beginClosing();
    menu.showChild('viewer');
    expect(menu.advance()).toEqual([
      { type: 'update-viewer' },
      { type: 'write-foreground-alpha', value: 0.975, alpha: 249 / 256 },
      { type: 'restore-bitmap', index: 19, written: false },
    ]);
    advance(menu, 39);
    expect(menu.finished).toBe(false);
    expect(menu.advance()).toEqual([{ type: 'update-viewer' }, { type: 'finish' }]);
    expect(menu.child).toBeNull();
    expect(menu.showChild('creator')).toBe(false);
    expect(menu.returnToOffers()).toBe(false);
    expect(menu.advance()).toEqual([]);
  });

  test('the retained bitmap-history seam leaves the first transparent reverse slot unchanged', () => {
    const menu = new UpgradeMenuMotion();
    const history = new PauseBitmapHistory(
      2,
      1,
      new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
    );
    const initial = history.pixels.slice();
    for (let frame = 0; frame < 39; frame++) {
      menu.advance();
      history.advance(menu.counter, false);
    }
    expect(history.savedFrames).toBe(19);
    const blurred = history.pixels.slice();
    expect(blurred).not.toEqual(initial);
    menu.beginClosing();
    const first = menu.advance();
    expect(first.at(-1)).toEqual({ type: 'restore-bitmap', index: 19, written: false });
    expect(history.advance(menu.counter, true)).toBe(false);
    expect(history.pixels).toEqual(blurred);
    expect(history.index).toBe(menu.historyIndex);
    for (let frame = 1; frame < 40; frame++) {
      menu.advance();
      history.advance(menu.counter, true);
    }
    expect(history.index).toBe(-1);
    expect(history.pixels).toEqual(initial);
    history.dispose();
  });
});
