import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

await page.getByRole('button', { name: /Play match/i }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/workspace/screenshots/equate-mulligan.png' });

await page.getByRole('button', { name: /Ready/i }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: '/workspace/screenshots/equate-battle.png' });

// Play cheapest playable card from hand - click cards that aren't dimmed
const handArea = page.locator('div.border-t.border-border').last();
const handCards = handArea.locator('button');
const n = await handCards.count();
console.log('hand cards', n);
if (n > 0) {
  await handCards.first().click();
  await page.waitForTimeout(500);
}
await page.screenshot({ path: '/workspace/screenshots/equate-played.png' });

const endBtn = page.getByRole('button', { name: /^End$/ });
await endBtn.click();
await page.waitForTimeout(3500);
await page.screenshot({ path: '/workspace/screenshots/equate-after-turn.png' });

// Try attack: select player minion if any, then enemy face
const boardMinions = page.locator('button').filter({ hasText: /Squire|Arc|Warden|Spark|Frost|Blood|Shield|Grove|Math|Iron|Storm|Void|Ember|Night|Prism/ });
// simpler: after turn, click our board area minions

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: '/workspace/screenshots/equate-mobile.png' });

// Check overflow
const overflow = await page.evaluate(() => {
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyText: document.body.innerText.slice(0, 300),
  };
});
console.log('viewport', overflow);
console.log('errors:', JSON.stringify(errors));

// Verify production build with preview on different... actually start preview on 8081 briefly
await browser.close();
