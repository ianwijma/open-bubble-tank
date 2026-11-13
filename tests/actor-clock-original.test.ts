import { expect, test } from 'bun:test';
import first from './fixtures/actor-clock-original-a.json';
import second from './fixtures/actor-clock-original-b.json';
import { decode, rows, unpack } from '../tools/reference/actor-clock-evidence.mjs';

for (const [capture, original] of [
  ['a', first],
  ['b', second],
] as const) {
  const measured = rows(original.contract);
  const tree = measured.filter((r) => r.kind === 'tree');
  const at = (name: string, tick: number, phase = 'enter', label = 'before:controlled') =>
    tree.find((r) => r.name === name && r.tick === tick && r.phase === phase && r.label === label)!;

  test(`actor original ${capture}: constructors precede scripts and inside-ENTER birth holds`, () => {
    expect([1, 2, 3].map((t) => at('wiggle-negative', t).frame)).toEqual([1, 2, 3]);
    expect(
      [1, 2, 3].map((t) => at('wiggle-negative', t, 'enter', 'inside:mount-control').frame),
    ).toEqual([1, 1, 2]);
    expect(at('wiggle-positive', 0, 'constructor').frame).toBe(1);
    expect(at('wiggle-positive', 1).frame).toBe(1);
    expect(at('wiggle-positive', 1, 'exit').frame).toBe(51);
    expect([at('wiggle-negative', 50).frame, at('wiggle-negative', 50, 'exit').frame]).toEqual([
      50, 1,
    ]);
    expect(at('wiggle-positive', 50, 'exit').frame).toBe(51);
  });

  test(`actor original ${capture}: same mounts advance across ancestor detach and direct removal`, () => {
    const group = tree.filter(
      (r) => r.label === 'before:controlled' && r.name === 'wiggle-negative',
    );
    expect(new Set(group.map((r) => r.id)).size).toBe(1);
    expect(
      [111, 150, 200, 220, 221, 331, 400, 440, 441, 550].map((t) => at('wiggle-negative', t).frame),
    ).toEqual([13, 3, 4, 24, 25, 37, 8, 48, 49, 11]);
    const root = (phase: string) =>
      tree.find((r) => r.label === 'before:controlled' && r.path === '0' && r.phase === phase)!;
    expect([
      root('post-ancestor-glue').parentId,
      root('post-ancestor-glue').parentNull,
      root('post-ancestor-glue').rooted,
    ]).toEqual([-1, false, false]);
    expect([
      root('post-remove-glue').parentId,
      root('post-remove-glue').parentNull,
      root('post-remove-glue').rooted,
    ]).toEqual([0, true, false]);
    expect([root('post-root-restore-glue').id, root('post-root-restore-glue').rooted]).toEqual([
      root('constructor').id,
      true,
    ]);
  });

  test(`actor original ${capture}: stopped mounted root retains independently playing removed descendants`, () => {
    const rotor = measured.find((r) => r.label === 'inside:mount-control' && r.name === 'rotor')!;
    const group = measured.filter((r) => r.id === rotor.id);
    expect(group.every((r) => r.frame === 1 && r.total === 2)).toBe(true);
    const detached = group.filter((r) => r.tick > 111 && r.tick < 221);
    expect(detached.every((r) => r.kind === 'retained' && r.parentNull && !r.rooted)).toBe(true);
    const child = measured.find((r) => r.parentId === rotor.id)!;
    const childDetached = measured.filter(
      (r) => r.id === child.id && r.phase === 'enter' && r.tick > 111 && r.tick < 221,
    );
    expect(childDetached.every((r) => r.parentId === rotor.id && !r.parentNull && !r.rooted)).toBe(
      true,
    );
    expect(new Set(childDetached.map((r) => r.frame)).size).toBeGreaterThan(2);
    expect(at('rotor', 221, 'post-mount-return-glue', 'inside:mount-control').id).toBe(rotor.id);
    expect(
      original.sourceAudit.mounts.find((m) => m.id === 4015)!.tree.find((n) => n.symbol === 701)!
        .stop,
    ).toBe(true);
  });

  test(`actor original ${capture}: living builtin NPC survives actual restore without reconstruction`, () => {
    const npc = tree.filter((r) => r.label === 'before:npc' && r.path === '0');
    expect(npc.every((r) => r.className === 'EnemyAI' && r.frame === 0)).toBe(true);
    expect(new Set(npc.map((r) => r.id)).size).toBe(1);
    const before = tree.filter((r) => r.label === 'before:npc' && r.phase === 'pre-restore');
    const after = tree.filter(
      (r) => r.label === 'before:npc' && r.phase === 'post-restore-original',
    );
    expect(after.map((r) => [r.id, r.frame, r.parentId])).toEqual(
      before.map((r, i) => [r.id, r.frame, i === 0 ? -1 : r.parentId]),
    );
    expect(decode(after[0].words).slice(0, 2)).toEqual([13, 23]);
    const states = unpack(original.contract).filter((s) => s.startsWith('BT3_ACTOR_CLOCK_STATE '));
    expect(states.every((s) => s.split(' ').slice(3).join(' ') === '1 2 E10000033 0')).toBe(true);
    expect(original.sourceAudit.npc).toMatchObject({
      id: 'E10000033',
      name: 'Floaty',
      library: '_-UH',
      index: 13,
      mode: 3,
    });
  });

  test(`actor original ${capture}: repeated EXIT and binary Numbers remain literal evidence`, () => {
    const exits = tree.filter(
      (r) =>
        r.label === 'before:controlled' && r.path === '0' && r.tick === 1 && r.phase === 'exit',
    );
    expect(exits.length).toBeGreaterThan(1);
    expect(
      measured.every((r) => r.words.length === 24 && decode(r.words).every(Number.isFinite)),
    ).toBe(true);
    expect(measured.every((r) => r.isPlaying === 'not-read')).toBe(true);
    expect(original.originalAbcPayloadHashes).toEqual([
      '130eef8fcef585dc1ae00f427903d11c35a79feb22e11d4e93219f987c719a1c',
      'd849764541e5f8b5b7d3b9bbdb31960ad9e47b8fd4a3e24652ccfa408c8be596',
    ]);
  });
}

test('independent actor captures preserve different random outcomes without claiming entropy equality', () => {
  expect(first.probeSha256).toBe(second.probeSha256);
  expect(first.runtimeModules).toEqual(second.runtimeModules);
  expect(first.evidenceId).not.toBe(second.evidenceId);
  expect(first.contract.records.length).not.toBe(second.contract.records.length);
  const descendant = (original: typeof first) =>
    rows(original.contract).find(
      (r) => r.id === 31 && r.tick === 150 && r.phase === 'enter' && r.kind === 'retained',
    )!.frame;
  expect(descendant(first)).not.toBe(descendant(second));
});
