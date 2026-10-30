import { expect, test } from '@playwright/test';

test('home loads and fires', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Physics Lab/ })).toBeVisible();
  await page.getByRole('button', { name: '발사하기' }).click();
  await expect(page.getByText('발사!')).toBeVisible();
});

test('moon gravity flies farther than earth', async ({ page }) => {
  await page.goto('/');
  const readout = page.locator('#readout');
  await page.getByRole('button', { name: '발사하기' }).click();
  const earthText = (await readout.textContent()) ?? '';
  const earthRange = parseFloat(earthText.match(/비거리 ([\d.]+)m/)?.[1] ?? '0');

  await page.locator('#gravity').selectOption('moon');
  await page.getByRole('button', { name: '발사하기' }).click();
  const moonText = (await readout.textContent()) ?? '';
  const moonRange = parseFloat(moonText.match(/비거리 ([\d.]+)m/)?.[1] ?? '0');

  expect(earthRange).toBeGreaterThan(1);
  expect(moonRange / earthRange).toBeGreaterThan(5.5);
  expect(moonRange / earthRange).toBeLessThan(6.6);
});

test('bench tabs switch + trial recorded + challenges visible', async ({ page }) => {
  await page.goto('/');
  // 포물선: 발사하면 실험 노트에 기록
  await page.getByRole('button', { name: '발사하기' }).click();
  await expect(page.getByText(/총 \d+회 기록됨/)).toBeVisible();

  // 진자 탭
  await page.getByRole('tab', { name: '진자 · 용수철' }).click();
  await expect(page.getByRole('button', { name: '측정하고 기록하기' })).toBeVisible();
  await page.getByRole('button', { name: '측정하고 기록하기' }).click();
  await expect(page.locator('#readout', { hasText: /측정 주기/ })).toBeVisible();

  // 파동 탭
  await page.getByRole('tab', { name: '파동 수조' }).click();
  await expect(page.getByRole('button', { name: '관측 기록하기' })).toBeVisible();
  await expect(page.getByText(/파장 λ=/)).toBeVisible();

  // 도전 카드 + CSV 버튼
  await expect(page.getByText('도전 카드')).toBeVisible();
  await expect(page.getByText('12m 표적 맞히기')).toBeVisible();
  await expect(page.getByRole('button', { name: 'CSV 내보내기' })).toBeVisible();
});

test('CSV export downloads a file', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '발사하기' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV 내보내기' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/physics-lab-trials\.csv/);
});

test('teacher mode reveals printable worksheet', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#worksheet')).toBeHidden();
  await page.getByText('교사모드(학습지)').click();
  await expect(page.locator('#worksheet')).toBeVisible();
  await expect(page.getByText('탐구 학습지')).toBeVisible();
});
