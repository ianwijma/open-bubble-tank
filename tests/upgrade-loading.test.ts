import { describe, expect, test } from 'bun:test';
import {
  UpgradeLoadingState,
  type UpgradeLoadingTank,
  type UpgradeSlotId,
} from '../src/game/core/upgrade-loading';
import { UpgradeMenuMotion } from '../src/game/core/upgrade-motion';
import { defaultUpgradeTank } from '../src/game/core/upgrade-offers';
import { AVATARS } from '../src/game/data/catalog';
import type { TankDesign } from '../src/game/core/types';

// Authored viewer1934 registrations, in pixels (upgrade-screen.json stores twips).
const AUTHORED_X = [-181, 0, 181] as const;
type NamedTank = UpgradeLoadingTank & { name: string };
const tank = (classId: number, name = `Class ${classId}`): NamedTank => ({ classId, name });
const model = (cached = 3) => new UpgradeLoadingState<NamedTank>(cached, AUTHORED_X);

function install(menu: UpgradeLoadingState<NamedTank>, id: UpgradeSlotId, data = tank(id + 1)) {
  const receipt = menu.receiveTank(id, data)!;
  menu.completeAttachment(receipt);
  return receipt;
}

describe('UpgradeLoadingState source slot initialization (_-96 / SecondSetup)', () => {
  test('constructor preserves three authored identities before the index0 sentinel exists', () => {
    const menu = model();
    expect(menu.initialized).toBe(false);
    expect(menu.sentinel).toBeNull();
    expect(menu.pending).toBe(0); // AS int default, before SecondSetup.
    expect(menu.rootFrame).toBe(1);
    expect(menu.slots.map((slot) => slot.id)).toEqual([1, 2, 3]);
    expect(menu.slots.map((slot) => slot.card.authoredX)).toEqual([...AUTHORED_X]);
    expect(menu.slots.map((slot) => slot.card.x)).toEqual([...AUTHORED_X]);
    for (const slot of menu.slots) {
      expect(menu.namedCards[slot.id - 1]).toBe(slot.card);
      expect(slot.card.attached).toBe(true);
      expect(slot.requestedClass).toBeNull();
      expect(slot.tank).toBeNull();
    }
  });

  test.each([
    [1, [null, 1, 2], ['12', '23'], 2],
    [3, [2, 3, 4], ['21', '32', '43'], 3],
    [6, [5, 6, null], ['51', '62'], 2],
  ] as const)(
    'live class%i keeps authored holes and class/slot TAG order',
    (live, classes, tags, pending) => {
      const menu = model(live);
      const requests = menu.secondSetup(live);
      expect(menu.slots.map((slot) => slot.requestedClass)).toEqual([...classes]);
      expect(requests.map((request) => request.tag)).toEqual([...tags]);
      expect(menu.pending).toBe(pending);
      expect(menu.sentinel).toEqual({ tank: null, classId: 0 });
      expect(menu.initialized).toBe(true);
      for (const request of requests) install(menu, request.slotId, tank(request.classId));
      menu.finishResults();
      expect(menu.pending).toBe(0);
      expect(menu.rootFrame).toBe(2);
      expect(menu.slots.filter((slot) => slot.card.attached).map((slot) => slot.card.x)).toEqual(
        live === 3 ? [-181, 0, 181] : [-90.5, 90.5],
      );
    },
  );

  test('cached middle class with live class1 requests only two results but remains pending1', () => {
    const menu = model(3);
    const requests = menu.secondSetup(1);
    expect(requests.map((request) => request.slotId)).toEqual([2, 3]);
    expect(menu.pending).toBe(3);
    for (const request of requests) install(menu, request.slotId, tank(request.classId));
    expect(menu.finishResults()).toEqual([]);
    expect(menu.pending).toBe(1);
    expect(menu.rootFrame).toBe(1);
    expect(menu.slot(1).card.attached).toBe(true);
  });

  test('cached edge with live middle class can reach zero mid-array then finish at minus1', () => {
    const menu = model(1);
    expect(menu.secondSetup(3).map((request) => request.classId)).toEqual([2, 3, 4]);
    install(menu, 1);
    install(menu, 2);
    expect(menu.pending).toBe(0);
    // _-aG tests the counter AFTER all entries, not inside each successful entry.
    expect(menu.rootFrame).toBe(1);
    install(menu, 3);
    expect(menu.pending).toBe(-1);
    expect(menu.finishResults()).toEqual([]);
    expect(menu.rootFrame).toBe(1);
    expect(menu.slots.map((slot) => slot.card.x)).toEqual([...AUTHORED_X]);
  });

  test('the level-two class2 reference set fills Nimble / Heavy Seeker / Punisher in order', () => {
    const menu = new UpgradeLoadingState<TankDesign>(2, AUTHORED_X);
    const requests = menu.secondSetup(2);
    for (const request of requests) {
      const data = defaultUpgradeTank(AVATARS, request.classId, 2);
      const receipt = menu.receiveTank(request.slotId, data)!;
      menu.completeAttachment(receipt);
    }
    menu.finishResults();
    expect(menu.slots.map((slot) => slot.tank?.name)).toEqual([
      'Nimble',
      'Heavy Seeker',
      'Punisher',
    ]);
    expect(menu.rootFrame).toBe(2);
    expect(menu.pending).toBe(0);
    expect(menu.slots.map((slot) => slot.card.x)).toEqual([...AUTHORED_X]);
  });
});

describe('data receipt versus successful source installation (_-aG AS489–539)', () => {
  test('data and its actual class precede preview/field/listener success and counter decrement', () => {
    const menu = model();
    menu.secondSetup(3);
    const data = tank(6, 'Returned class differs from requested class2');
    const receipt = menu.receiveTank(1, data)!;
    expect(menu.slot(1).requestedClass).toBe(2);
    expect(menu.slot(1).tank).toBe(data);
    expect(menu.slot(1).tankClass).toBe(6);
    expect(receipt.attached).toBe(false);
    expect(menu.slot(1).card.previews).toEqual([]);
    expect(menu.slot(1).card.clickListener).toBe(false);
    expect(menu.slot(1).card.editClickListener).toBe(false);
    expect(menu.pending).toBe(3);
    expect(menu.finishResults()).toEqual([]);
    menu.completeAttachment(receipt);
    expect(menu.pending).toBe(2);
    expect(menu.slot(1).card.previews[0]).toBe(receipt);
    expect(receipt.attached).toBe(true);
    expect(menu.slot(1).card.clickListener).toBe(true);
    expect(menu.slot(1).card.editClickListener).toBe(true);
  });

  test('all null defaults leave the sentinel initialized and loading pending indefinitely', () => {
    const menu = model();
    const requests = menu.secondSetup(3);
    for (const request of requests) expect(menu.receiveTank(request.slotId, null)).toBeNull();
    expect(menu.finishResults()).toEqual([]);
    for (let frame = 0; frame < 500; ++frame) menu.advanceLoadingAnimation();
    expect(menu.initialized).toBe(true);
    expect(menu.pending).toBe(3);
    expect(menu.rootFrame).toBe(1);
    expect(menu.slots.every((slot) => slot.tank === null && slot.card.attached)).toBe(true);
  });

  test('null never clears earlier data or a completed card and never decrements pending', () => {
    const menu = model();
    menu.secondSetup(3);
    const first = install(menu, 1);
    const card = menu.slot(1).card;
    expect(menu.receiveTank(1, null)).toBeNull();
    expect(menu.slot(1).tank).toBe(first.tank);
    expect(card.previews).toEqual([first]);
    expect(card.clickListener).toBe(true);
    expect(menu.pending).toBe(2);
  });

  test('SearchFailed checks CLICK completion, not data presence, and reads the live class again', () => {
    const menu = model();
    menu.secondSetup(3);
    install(menu, 1);
    menu.receiveTank(2, tank(3, 'Initialization failed before CLICK'));
    expect(menu.searchFailed(1)).toEqual([
      { slotId: 2, classId: 1, tag: '12' },
      { slotId: 3, classId: 2, tag: '23' },
    ]);
    expect(menu.pending).toBe(2);
    expect(menu.searchFailed(6)).toEqual([{ slotId: 2, classId: 6, tag: '62' }]);
    expect(menu.slot(2).tank?.name).toBe('Initialization failed before CLICK');
  });

  test('distinct repeated successful callbacks append identities and can take pending below zero', () => {
    const menu = model(1);
    menu.secondSetup(1);
    const first = install(menu, 2, tank(1, 'First'));
    install(menu, 3);
    menu.finishResults();
    expect(menu.pending).toBe(0);
    const repeated = install(menu, 2, tank(1, 'Second callback'));
    expect(repeated).not.toBe(first);
    expect(menu.slot(2).card.previews).toEqual([first, repeated]);
    expect(menu.slot(2).tank).toBe(repeated.tank);
    expect(menu.pending).toBe(-1);
    expect(menu.finishResults()).toEqual([]);
    // Adapter misuse is different from a second source result/receipt.
    expect(() => menu.completeAttachment(repeated)).toThrow('already completed');
    expect(menu.pending).toBe(-1);
  });
});

describe('retained unsaved creator return and ordered removal (_-Zo / SecondSetup / _-aG)', () => {
  test.each([
    [[], [0, 0, 0]],
    [[1], [0, 90.5, 90.5]],
    [[2], [-90.5, 0, 90.5]],
    [[3], [-90.5, -90.5, 0]],
    [
      [1, 2],
      [-90.5, 90.5, 181],
    ],
    [
      [1, 3],
      [-90.5, 0, 90.5],
    ],
    [
      [2, 3],
      [-181, -90.5, 90.5],
    ],
    [
      [1, 2, 3],
      [-181, 0, 181],
    ],
  ] as const)(
    'CLICK slots %j retain source-order positions %j, including detached named cards',
    (available, expectedX) => {
      const menu = model();
      menu.secondSetup(3);
      for (const id of available) install(menu, id);
      menu.finishResults();
      if (available.length !== 3) expect(menu.rootFrame).toBe(1);
      menu.setRootFrame(3);
      expect(menu.returnFromUnsavedCreator(6)).toEqual([]);
      expect(menu.pending).toBe(0);
      expect(menu.rootFrame).toBe(2);
      expect(menu.slots.map((slot) => slot.card.x)).toEqual([...expectedX]);
      for (const slot of menu.slots) {
        expect(slot.card.attached).toBe((available as readonly number[]).includes(slot.id));
        expect(menu.namedCards[slot.id - 1]).toBe(slot.card);
      }
      // Each absent card now fails removeChild BEFORE any of that block's shifts.
      for (let visit = 0; visit < 3; ++visit) {
        menu.setRootFrame(3);
        expect(menu.returnFromUnsavedCreator(1)).toEqual([]);
        expect(menu.slots.map((slot) => slot.card.x)).toEqual([...expectedX]);
      }
    },
  );

  test('partial data survives promotion without a lookup, request or initialization identity reset', () => {
    const menu = model();
    menu.secondSetup(3);
    const sentinel = menu.sentinel;
    const slots = [...menu.slots];
    const initialized = install(menu, 2, tank(3, 'Retained preview'));
    const incomplete = menu.receiveTank(3, tank(4, 'Data without successful preview'))!;
    expect(menu.pending).toBe(2);
    menu.setRootFrame(3);
    expect(menu.returnFromUnsavedCreator(1)).toEqual([]);
    expect(menu.sentinel).toBe(sentinel);
    for (const slot of slots) expect(menu.slot(slot.id)).toBe(slot);
    expect(menu.slots.map((slot) => slot.requestedClass)).toEqual([2, 3, 4]);
    expect(menu.slot(2).card.previews[0]).toBe(initialized);
    expect(menu.slot(2).tank).toBe(initialized.tank);
    expect(menu.slot(3).tank).toBe(incomplete.tank);
    expect(menu.slot(3).card.previews).toEqual([]);
    expect(menu.slot(3).card.attached).toBe(false);
    expect(menu.rootFrame).toBe(2);
    // No epoch/generation guard is invented for a later callback: raw counter becomes -1.
    menu.completeAttachment(incomplete);
    expect(menu.pending).toBe(-1);
    expect(menu.slot(3).card.attached).toBe(false);
    expect(menu.slot(3).card.previews[0]).toBe(incomplete);
    expect(menu.finishResults()).toEqual([]);
  });

  test('all-null initialization returns ready with no cards, rather than starting another lookup', () => {
    const menu = model();
    const requests = menu.secondSetup(3);
    for (const request of requests) menu.receiveTank(request.slotId, null);
    menu.finishResults();
    menu.setRootFrame(3);
    expect(menu.returnFromUnsavedCreator(3)).toEqual([]);
    expect(menu.pending).toBe(0);
    expect(menu.rootFrame).toBe(2);
    expect(menu.slots.every((slot) => !slot.card.attached)).toBe(true);
    expect(menu.finishResults().map((block) => block.outcome)).toEqual(['error', 'error', 'error']);
    expect(menu.slots.map((slot) => slot.card.x)).toEqual([0, 0, 0]);
  });

  test('middle block tests viewer2 before writing a missing viewer3; earlier removal/shift survive', () => {
    const menu = model(1);
    menu.secondSetup(3); // Cached edge count2, three valid authored slots.
    install(menu, 1);
    install(menu, 3);
    // Controlled missing-name case; no ordinary frame transition is claimed to cause this.
    menu.namedCards[2] = null;
    expect(menu.finishResults()).toEqual([
      { slotId: 1, outcome: 'retained' },
      { slotId: 2, outcome: 'error' },
      { slotId: 3, outcome: 'error' },
    ]);
    expect(menu.slot(2).card.attached).toBe(false);
    expect(menu.namedCards[1]).toBe(menu.slot(2).card); // Guard remains true AFTER removal.
    expect(menu.slot(1).card.x).toBe(-90.5); // Write before the guarded missing-name failure.
    expect(menu.slot(3).card.x).toBe(181);
    expect(menu.rootFrame).toBe(2); // Each swallowed Error still reaches gotoAndStop(2).
  });

  test('an earlier removal error skips its shifts while later blocks still remove and recenter', () => {
    const menu = model();
    menu.secondSetup(3);
    menu.slot(1).card.attached = false; // Retained named card, already removed by the host.
    menu.returnFromUnsavedCreator(3);
    expect(menu.slots.map((slot) => slot.card.attached)).toEqual([false, false, false]);
    expect(menu.slots.map((slot) => slot.card.x)).toEqual([0, 90.5, 90.5]);
    expect(menu.rootFrame).toBe(2);
  });
});

describe('root/loading state is independent of retained motion', () => {
  test('frame3/4 preserve card, preview, listener and named identities without advancing motion', () => {
    const menu = model();
    const motion = new UpgradeMenuMotion();
    menu.secondSetup(3);
    const preview = install(menu, 2);
    const card = menu.slot(2).card;
    for (let frame = 0; frame < 7; ++frame) motion.advance();
    motion.showChild('creator');
    for (const frame of [3, 4, 1] as const) {
      menu.setRootFrame(frame);
      expect(menu.slot(2).card).toBe(card);
      expect(menu.namedCards[1]).toBe(card);
      expect(card.previews[0]).toBe(preview);
      expect(card.attached && card.clickListener && card.editClickListener).toBe(true);
      expect(menu.pending).toBe(2);
    }
    menu.returnFromUnsavedCreator(3);
    expect(motion.counter).toBe(7);
    expect(motion.historyIndex).toBe(3);
    expect(motion.foregroundAlpha).toBe(1);
    expect(motion.child).toBe('creator');
  });

  test('LoadingAnimation_199 frame25 jumps to3 even on a stopped/offstage root, without finishing loads', () => {
    const menu = model();
    menu.secondSetup(3);
    for (let tick = 0; tick < 23; ++tick) menu.advanceLoadingAnimation();
    expect(menu.loadingAnimationFrame).toBe(24);
    menu.setRootFrame(3);
    menu.advanceLoadingAnimation();
    expect(menu.loadingAnimationFrame).toBe(3);
    expect(menu.rootFrame).toBe(3);
    expect(menu.pending).toBe(3);
    menu.returnFromUnsavedCreator(3);
    expect(menu.loadingAnimationFrame).toBe(3);
    for (let tick = 0; tick < 22; ++tick) menu.advanceLoadingAnimation();
    expect(menu.loadingAnimationFrame).toBe(3);
    expect(menu.rootFrame).toBe(2);
  });
});
