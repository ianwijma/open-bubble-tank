import fixture from '../tests/fixtures/world-layer.json' with { type: 'json' };
import { expect, test } from '@playwright/test';

function measured(age: number, role: string, key: string) {
  const row = fixture.samples.find(
    (s) => s.phase === 'collapse' && s.age === age && s.role === role,
  )!;
  const words = row.words[fixture.fields.indexOf(key)],
    bytes = new DataView(new ArrayBuffer(8));
  bytes.setUint32(0, words[0]);
  bytes.setUint32(4, words[1]);
  return bytes.getFloat64(0);
}

test(`mock collapse retains its field pivot, separate layers and isolated knockout composition`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('collapse');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-collapse'))!);
  expect(proof.snapshots.map((s: { age: number; frame: number }) => [s.age, s.frame])).toEqual([
    [0, 1],
    [51, 51],
    [119, 119],
  ]);
  for (const s of proof.snapshots) {
    const scale = measured(s.age, 'root', 'own.a');
    expect(s.camera).toBe(0.75);
    expect(s.center).toEqual({ x: 275, y: 225 });
    expect(s.avatar.x).toBeCloseTo(275 + measured(s.age, 'avatar', 'x') * 0.75, 5);
    expect(s.avatar.y).toBeCloseTo(225 + measured(s.age, 'avatar', 'y') * 0.75, 5);
    expect(s.avatarScale).toBeCloseTo(measured(s.age, 'avatar', 'own.a'), 5);
    expect(s.fieldWidth / proof.snapshots[0].fieldWidth).toBeCloseTo(scale, 5);
    expect(s.retainedPosition).toEqual({ x: -105, y: 52.5 });
    expect(s.mockShotScale).toBeCloseTo(scale, 5);
  }
  expect(proof.completed).toEqual({ mode: 'transit', hasCollapse: false, shake: 0, flash: true });
  expect(proof.erase).toEqual({
    center: [255, 0, 0, 255],
    ring: [0, 0, 255, 255],
    outside: [255, 0, 0, 255],
  });
  for (const sample of proof.glow)
    for (let channel = 0; channel < 4; channel++)
      expect(
        Math.abs(sample.actual[channel] - sample.expected[channel]),
        JSON.stringify(sample),
      ).toBeLessThanOrEqual(2);
  await page.locator('#stage').screenshot({ path: `test-results/mock-collapse.png` });
  expect(errors).toEqual([]);
});
