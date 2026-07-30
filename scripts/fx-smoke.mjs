import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Play match/i }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Ready/i }).click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'End', exact: true }).click();
await page.waitForTimeout(3500);
await page.screenshot({ path: '/workspace/screenshots/fx-after-enemy.png' });
const entities = await page.locator('[data-entity]').count();
console.log('entities', entities, 'errors', errors);
await page.setViewportSize({ width: 1280, height: 900 });
await page.locator('button[title="New game"]').click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Ready/i }).click();
await page.waitForTimeout(700);
// Try play first playable hand card (1-cost)
const cards = page.locator('#battle-stage button').filter({ has: page.locator('img[src*="/cards/"]') });
const n = await cards.count();
console.log('hand cards', n);
if (n > 0) {
  await cards.first().click();
  await page.waitForTimeout(600);
}
await page.screenshot({ path: '/workspace/screenshots/fx-battle-desktop.png' });
// offline package serve check
console.log('apk size', (await import('node:fs')).statSync('/workspace/artifacts/EQUATE-debug.apk').size);
await browser.close();
