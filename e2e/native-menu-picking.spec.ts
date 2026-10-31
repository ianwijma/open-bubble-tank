import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { MenuTarget } from '../src/game/core/menu-hit';
const reference = JSON.parse(
  readFileSync(new URL('../tests/fixtures/menu-pointer-reference.json', import.meta.url), 'utf8'),
) as {
  observations: { label: string; target?: { name: string; parent: string } }[];
};
const geometry = JSON.parse(
  readFileSync(new URL('../src/game/data/main-menu-geometry.json', import.meta.url), 'utf8'),
) as {
  controls: { name: string }[];
};
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

test('SWF native menu geometry matches original targets, link lifetimes and full stroke transforms', async ({
  page,
}) => {
  test.skip(!existsSync(swf), 'A local research SWF is required.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('native-menu-picking');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  const stage = page.locator('#stage');
  await expect(stage).toHaveAttribute('data-native-menu-picks', /samples/, { timeout: 60000 });
  const proof = JSON.parse((await stage.getAttribute('data-native-menu-picks'))!) as {
    samples: { label: string; target: MenuTarget | null }[];
    corners: { name: string; target: MenuTarget | null }[];
    stroke?: { x: number; y: number; target: MenuTarget | null };
    series: {
      frame: number;
      generic: MenuTarget;
      corner: MenuTarget | null;
      links: (MenuTarget | null)[];
    }[];
  };
  await test.info().attach('native-menu-picks', {
    body: JSON.stringify(proof, null, 2),
    contentType: 'application/json',
  });
  const samples = reference.observations.filter((sample) => sample.target);
  expect(proof.samples).toHaveLength(samples.length);
  for (const [index, sample] of samples.entries()) {
    const target = sample.target!;
    const expected =
      target.name === 'inner'
        ? { kind: 'control', name: target.parent }
        : geometry.controls.some((piece) => piece.name === target.name)
          ? { kind: 'decoration', name: target.name }
          : null;
    expect(proof.samples[index], sample.label).toEqual({ label: sample.label, target: expected });
  }
  for (const corner of proof.corners) expect(corner.target?.kind, corner.name).not.toBe('control');
  expect(proof.stroke).toBeDefined();
  expect(proof.stroke!.target?.kind, JSON.stringify(proof.stroke)).not.toBe('control');
  const links = [
    { name: 'bt_mc', birth: 4, removal: 18 },
    { name: 'bt2_mc', birth: 6, removal: 16 },
    { name: 'bta_mc', birth: 8, removal: 14 },
    { name: 'bttd_mc', birth: 10, removal: 12 },
  ];
  expect(proof.series).toHaveLength(19);
  for (const row of proof.series) {
    expect(row.generic).toEqual({ kind: 'series' });
    expect(row.corner).toBeNull();
    for (const [index, link] of links.entries()) {
      if (row.frame >= link.birth && row.frame < link.removal)
        expect(row.links[index]).toEqual({ kind: 'series', name: link.name });
      else expect(row.links[index]).not.toEqual({ kind: 'series', name: link.name });
    }
  }
  await stage.screenshot({ path: 'test-results/native-menu-picking.png' });
  expect(errors).toEqual([]);
});
