import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// Start match → mulligan
await page.getByRole('button', { name: /Play match/i }).click();
await page.waitForTimeout(800);

// Wait for images to load
await page.waitForFunction(() => {
  const imgs = [...document.querySelectorAll('img')];
  return imgs.length >= 3 && imgs.every(i => i.complete && i.naturalWidth > 0);
}, { timeout: 10000 }).catch(() => {});

await page.screenshot({ path: '/workspace/screenshots/mulligan-art.png', fullPage: false });

// Toggle one redraw
const cards = page.locator('button').filter({ hasText: /Squire|Spark|Warden|Arc|Frost|Bolt|Insight|Mend|Temper|Grove|Shield|Blood|Iron|Storm|Math|Void|Ember|Prism|Night|Fire|Sweep|Cataclysm|Reckon|Scorch|Precise/i });
const n = await cards.count();
console.log('mulligan cards visible', n);

// Check art images
const artInfo = await page.evaluate(() => {
  return [...document.querySelectorAll('img')].map(img => ({
    src: img.getAttribute('src'),
    w: img.naturalWidth,
    h: img.naturalHeight,
    complete: img.complete,
  }));
});
console.log('art', JSON.stringify(artInfo, null, 2));

// Redraw first card if any
if (n > 0) {
  await cards.first().click();
  await page.waitForTimeout(300);
}
await page.screenshot({ path: '/workspace/screenshots/mulligan-selected.png' });

await page.getByRole('button', { name: /Ready/i }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: '/workspace/screenshots/battle-with-art.png' });

// Mobile mulligan
await page.getByRole('button', { name: '' }).first(); // noop
// restart
await page.locator('button[title="New game"]').click().catch(async () => {
  // from battle use restart
});
// Use rotate icon - title New game
const restart = page.locator('button[title="New game"]');
if (await restart.count()) {
  await restart.click();
  await page.waitForTimeout(400);
}

// From mulligan or menu
if (await page.getByRole('button', { name: /Play match/i }).count()) {
  await page.getByRole('button', { name: /Play match/i }).click();
  await page.waitForTimeout(600);
}

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: '/workspace/screenshots/mulligan-mobile-art.png' });

console.log('errors', errors);
await browser.close();
