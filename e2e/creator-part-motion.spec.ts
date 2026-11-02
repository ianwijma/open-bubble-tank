import { expect, test } from '@playwright/test';
import { dropPreview, readCreatorDesign } from './helpers/creator';
import { waitForMainMenu } from './helpers/main-menu';

test('mock creator previews animate Skittish and Phasing before and after placement', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'Enemy tank creator' }).click();
  await page.getByRole('button', { name: 'Behavior', exact: true }).click();
  await page.getByLabel('Symmetric Mode').uncheck();
  const preview = page.locator('.creator-part-preview canvas');
  const designHash = () =>
    page.locator('.creator-workspace canvas').evaluate((element) => {
      const c = element as HTMLCanvasElement;
      let h = 2166136261;
      for (const v of c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data)
        h = Math.imul(h ^ v, 16777619);
      return h >>> 0;
    });
  for (const name of ['Skittish', 'Phasing']) {
    await page.getByRole('button', { name: `Place ${name}`, exact: true }).click();
    await expect(
      page.getByRole('button', { name: `Drag ${name} into design`, exact: true }),
    ).toBeVisible();
    const hash = async () =>
      preview.evaluate((element) => {
        const c = element as HTMLCanvasElement;
        let h = 2166136261;
        for (const v of c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data)
          h = Math.imul(h ^ v, 16777619);
        return h >>> 0;
      });
    const first = await hash();
    await expect.poll(hash, { timeout: 5000 }).not.toBe(first);
    await dropPreview(page, name === 'Skittish' ? -30 : 30, -20);
    expect((await readCreatorDesign(page)).parts).toHaveLength(1);
    const placed = await designHash();
    await expect.poll(designHash, { timeout: 5000 }).not.toBe(placed);
    // Each accepted design contains one behavior type, as the original requires.
    if (name === 'Skittish') await page.getByRole('button', { name: 'Undo', exact: true }).click();
  }
  await page.screenshot({ path: 'test-results/mock-creator-live-behaviors.png' });
});
