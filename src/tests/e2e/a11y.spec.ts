import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('a11y: no serious violations on each bench', async ({ page }) => {
  await page.goto('/');
  for (const tab of ['포물선', '진자 · 용수철', '파동 수조']) {
    await page.getByRole('tab', { name: tab }).click();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, `${tab}: ${JSON.stringify(serious.map((v) => v.id))}`).toEqual([]);
  }
});
