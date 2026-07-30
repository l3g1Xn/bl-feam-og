import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Play match/i }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Ready/i }).click();
await page.waitForTimeout(400);

// Find hand buttons by looking for cost numbers in hand strip - click all playable by trying each card named
const names = ['Squire','Spark Imp','Bolt','Insight','Warden','Arc Blade','Frost Hound','Mend','Temper'];
for (const name of names) {
  const btn = page.getByRole('button', { name: new RegExp(`^${name}`, 'i') }).first();
  if (await btn.count() && await btn.isVisible()) {
    // only click if might be affordable - try
    await btn.click().catch(()=>{});
    await page.waitForTimeout(200);
  }
}
await page.screenshot({ path: '/workspace/screenshots/equate-after-plays.png' });

// End a few turns to build board
for (let t = 0; t < 4; t++) {
  // try play cards again
  for (const name of names) {
    const btn = page.getByRole('button', { name: new RegExp(name, 'i') }).first();
    if (await btn.count()) {
      await btn.click().catch(()=>{});
      await page.waitForTimeout(150);
    }
  }
  const end = page.getByRole('button', { name: /^End$/ });
  if (await end.isEnabled()) {
    await end.click();
    await page.waitForTimeout(2800);
  }
}

await page.screenshot({ path: '/workspace/screenshots/equate-midgame.png' });

// Try select a minion with green ring (can attack) - click first board minion on player side
// Get all minion-like tokens
const body = await page.locator('body').innerText();
console.log('midgame:\n', body.slice(0, 800));
console.log('errors', errors);

// Click Live Math region exists
const math = page.getByText('Live Math');
console.log('math panel', await math.count());

await browser.close();
