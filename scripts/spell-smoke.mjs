import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
// Launcher: Play tab -> launch
await page.getByRole('button', { name: /Launch match|Ranked practice/i }).first().click().catch(async () => {
  await page.getByText('Play', { exact: true }).first().click();
  await page.getByRole('button', { name: /Ranked practice/i }).click();
});
await page.waitForTimeout(600);
// Mulligan ready
if (await page.getByRole('button', { name: /Ready/i }).count()) {
  await page.getByRole('button', { name: /Ready/i }).click();
}
await page.waitForTimeout(700);

// Inject a spell into hand via store if exposed - use UI: look for Bolt or Firelance
// Force-state through page evaluate of zustand
const result = await page.evaluate(async () => {
  // Access vite HMR modules not available - use window if any
  return { href: location.href, body: document.body.innerText.slice(0, 200) };
});
console.log('page', result);

// Try click a spell card (look for cards with Spell in accessible name)
const spellish = page.locator('button').filter({ hasText: /Bolt|Firelance|Sweep|Insight|Mend|Temper|Reckoning|Cataclysm|Precise|Scorch/i });
const n = await spellish.count();
console.log('spell buttons', n);

// Play minion first if needed then spell
// End turn a few times to get mana
for (let i = 0; i < 3; i++) {
  const end = page.getByRole('button', { name: 'End', exact: true });
  if (await end.isEnabled().catch(() => false)) {
    await end.click();
    await page.waitForTimeout(2800);
  }
}
await page.screenshot({ path: '/workspace/screenshots/after-mana.png' });

// Find firelance/bolt/reckoning in hand
const handCards = page.locator('#battle-stage button').filter({ has: page.locator('img[src*="/cards/"]') });
const hc = await handCards.count();
console.log('hand', hc);

// Click each playable looking card and try target enemy hero
let spellWorked = false;
for (let i = 0; i < Math.min(hc, 8); i++) {
  const card = handCards.nth(i);
  const name = await card.innerText().catch(() => '');
  await card.click();
  await page.waitForTimeout(200);
  // if message choose target
  const msg = await page.locator('text=Choose a target').count();
  if (msg > 0) {
    // click enemy hero
    await page.getByRole('button', { name: /Enemy/i }).first().click();
    await page.waitForTimeout(700);
    const logHas = await page.locator('text=/Cast |spell damage|dmg/i').count();
    spellWorked = logHas > 0 || (await page.locator('text=Invalid').count()) === 0;
    console.log('targeted spell', name.slice(0,40), 'worked?', spellWorked);
    break;
  }
  // instant may have applied
  await page.waitForTimeout(500);
}

await page.screenshot({ path: '/workspace/screenshots/spell-test.png' });
console.log('errors', errors);
await browser.close();
if (errors.length) process.exit(1);
