// Renders assets/og-image.png, the 1200x630 preview shown when the site is shared on LinkedIn, Slack, WhatsApp, etc.
// Re-run after changing the brand or headline: node scripts/og-image.mjs
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const html = `<!doctype html><html><head><style>
  body { margin: 0; width: 1200px; height: 630px; background: #13201c; color: #d6e5df;
         font-family: "Segoe UI", system-ui, sans-serif; display: flex; flex-direction: column; justify-content: center; padding: 0 90px; box-sizing: border-box; }
  .brand { display: flex; align-items: center; gap: 18px; font-size: 40px; font-weight: 800; color: #fff; }
  .brand i { width: 56px; height: 20px; border-radius: 4px; background: #5fd3a2; }
  h1 { font-size: 64px; line-height: 1.08; margin: 44px 0 26px; color: #fff; letter-spacing: -1px; }
  h1 em { font-style: normal; color: #5fd3a2; }
  p { font-size: 30px; margin: 0; color: #a9bdb5; }
  .run { margin-top: 50px; font: 600 26px Consolas, ui-monospace, monospace; color: #7f948c; }
  .run b { color: #5fd3a2; }
  .bar { margin-top: 18px; height: 14px; border-radius: 7px; background: #5fd3a2; }
</style></head><body>
  <div class="brand"><i></i>Greenbar</div>
  <h1>Releases you can ship<br>on a <em>green bar</em>, not a gut feeling.</h1>
  <p>Freelance SDET · Test automation · CI quality gates</p>
  <div class="run"><b>148 passed</b>  0 failed  0 flaky</div>
  <div class="bar"></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: fileURLToPath(new URL('../assets/og-image.png', import.meta.url)) });
await browser.close();
