import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Collect uncaught errors and CSP violations so a broken script or policy fails the test. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) errors.push(msg.text());
  });
  return errors;
}

test.describe('page shell', () => {
  test('loads without script errors or CSP violations', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(page).toHaveTitle(/^Greenbar Quality Engineering/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('green bar');
    const facts = page.locator('.hero').getByRole('definition');
    await expect(facts).toHaveText(['in test automation', 'working fully remote', '.NET and TypeScript']);
    await page.getByRole('button', { name: /Re-run/ }).click();
    await expect(page.locator('#term')).toHaveClass(/running/);
    expect(errors).toEqual([]);
  });

  test('has no horizontal scroll', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('skip link moves focus to main content', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard navigation is a desktop concern');
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('serves its own fonts', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (req) => { if (!req.url().startsWith('http://127.0.0.1')) external.push(req.url()); });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    for (const family of ['IBM Plex Sans', 'Bricolage Grotesque', 'JetBrains Mono']) {
      expect(await page.evaluate((f) => document.fonts.check(`16px "${f}"`), family), family).toBe(true);
    }
    expect(external).toEqual([]);
  });

  test('section nav jumps to each section', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Sections' });
    for (const [label, id] of [
      ['Services', 'services'],
      ['Approach', 'approach'],
      ['Work', 'work'],
      ['Engagements', 'engagements'],
      ['Toolbelt', 'tools'],
      ['FAQ', 'faq'],
    ]) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id} h2`)).toBeInViewport();
    }
  });
});

test.describe('footer and privacy', () => {
  test('footer shows the current year and GitHub link', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toContainText(`© ${new Date().getFullYear()} `);
    const elsewhere = footer.getByRole('navigation', { name: 'Elsewhere' });
    await expect(elsewhere.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', /github\.com\//);
    await elsewhere.getByRole('link', { name: 'Privacy' }).click();
    await expect(page.getByRole('heading', { name: 'Privacy' })).toBeInViewport();
  });

  test('privacy notes and analytics stay off until configured', async ({ page }) => {
    const beacons: string[] = [];
    page.on('request', (req) => { if (req.url().includes('cloudflareinsights')) beacons.push(req.url()); });
    await page.goto('/');
    await expect(page.locator('#privacyForm')).toBeHidden();
    await expect(page.locator('#privacyAnalytics')).toBeHidden();
    expect(beacons).toEqual([]);
  });

  test('configured form endpoint and analytics token switch their features on', async ({ page }) => {
    await page.route('http://127.0.0.1:4173/', async (route) => {
      const res = await route.fetch();
      const html = (await res.text())
        .replace('data-endpoint=""', 'data-endpoint="https://formspree.io/f/test"')
        .replace('name="cf-analytics-token" content=""', 'name="cf-analytics-token" content="abc123"');
      await route.fulfill({ response: res, body: html });
    });
    let beacon = '';
    await page.route('https://static.cloudflareinsights.com/beacon.min.js', (route) => {
      beacon = route.request().url();
      return route.fulfill({ contentType: 'text/javascript', body: '' });
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Send my request' })).toBeVisible();
    await expect(page.locator('#privacyForm')).toBeVisible();
    await expect(page.locator('#privacyAnalytics')).toBeVisible();
    await expect.poll(() => beacon).not.toBe('');
    await expect(page.locator('script[src*="cloudflareinsights"]')).toHaveAttribute('data-cf-beacon', '{"token":"abc123"}');
  });
});

test.describe('work, offer and FAQ', () => {
  test('case studies each state the challenge and the work', async ({ page }) => {
    await page.goto('/#work');
    const cases = page.locator('#work .case');
    await expect(cases).toHaveCount(3);
    for (const card of await cases.all()) {
      for (const term of ['Challenge', 'What I did']) {
        await expect(card.getByRole('term').filter({ hasText: term })).toBeVisible();
      }
    }
  });

  test('points to this site\'s own tests and CI', async ({ page }) => {
    await page.goto('/#work');
    await expect(page.getByRole('link', { name: 'See the tests and CI' }))
      .toHaveAttribute('href', 'https://github.com/vipparla2002/sdet-services');
  });

  test('entry offer pre-selects the fix-up in the form', async ({ page }) => {
    await page.goto('/#engagements');
    await page.getByRole('link', { name: 'Start small' }).click();
    await expect(page.getByRole('checkbox', { name: 'Flaky test fix-up' })).toBeChecked();
  });

  test('FAQ answers open and close', async ({ page }) => {
    await page.goto('/#faq');
    const question = page.getByText('Will our product details stay confidential?');
    const answer = page.getByText('Nothing about your product, code or data');
    await expect(answer).toBeHidden();
    await question.click();
    await expect(answer).toBeVisible();
    await question.click();
    await expect(answer).toBeHidden();
  });

  test('sample audit report is linked and accessible', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/#engagements');
    await page.getByRole('link', { name: 'see a sample', exact: true }).click();
    await expect(page).toHaveURL(/sample-audit\.html$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test audit: Northwind Bookings');
    await expect(page.getByText('Northwind Bookings is a fictional product')).toBeVisible();
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(results.violations.map((v) => `${scheme}: ${v.id}`)).toEqual([]);
    }
    await page.getByRole('link', { name: 'Ask about an audit' }).click();
    await expect(page).toHaveURL(/#contact$/);
    expect(errors).toEqual([]);
  });
});

test.describe('404 page', () => {
  test('explains the error and links home', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/404.html');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page failed its test.');
    await expect(page.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '__SITE_URL__/');
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
    expect(errors).toEqual([]);
  });
});

test.describe('search and social metadata', () => {
  test('has description, canonical, Open Graph and favicon', async ({ page, request }) => {
    await page.goto('/');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length).toBeGreaterThan(50);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/$/);
    for (const prop of ['og:title', 'og:description', 'og:url', 'og:image']) {
      await expect(page.locator(`meta[property="${prop}"]`)).toHaveAttribute('content', /\S/);
    }
    // The preview image and favicon referenced by the page must exist.
    expect((await request.get('/assets/og-image.png')).ok()).toBe(true);
    const icon = await page.locator('link[rel="icon"]').getAttribute('href');
    expect((await request.get('/' + icon)).ok()).toBe(true);
  });

  test('structured data is valid JSON describing the service', async ({ page }) => {
    await page.goto('/');
    const raw = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(raw ?? '');
    expect(data['@type']).toBe('ProfessionalService');
    expect(data.email).toBeUndefined();
    expect(data.hasOfferCatalog.itemListElement).toHaveLength(3);
  });

  test('serves robots.txt and a sitemap', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain('Sitemap: __SITE_URL__/sitemap.xml');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain('<loc>__SITE_URL__/</loc>');
    expect(await sitemap.text()).toContain('<loc>__SITE_URL__/sample-audit.html</loc>');
  });
});

test.describe('contact brief', () => {
  test('engagement button pre-selects its service', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Plan a build' }).click();
    await expect(page.getByRole('checkbox', { name: 'Framework build' })).toBeChecked();
  });

  test('rejects a missing name and invalid email', async ({ page }) => {
    await page.goto('/#contact');
    await page.getByLabel('Work email').fill('not-an-email');
    await page.getByRole('button', { name: 'Email my request' }).click();

    const status = page.getByRole('status');
    await expect(status).toHaveText('Add your name and a valid work email so I can reply.');
    await expect(page.getByLabel('Name')).toBeFocused();
    await expect(page.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Work email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('opens the email app with the request written out', async ({ page }) => {
    await page.goto('/#contact');
    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Company').fill('Analytical Engines');
    await page.getByLabel('Work email').fill('ada@example.com');
    await page.getByRole('checkbox', { name: 'API testing' }).check();
    await page.getByRole('checkbox', { name: 'Performance' }).check();
    await page.getByLabel('Timeline').selectOption('Next quarter');
    await page.getByLabel('Project details').fill('Flaky checkout suite');
    await page.getByRole('button', { name: 'Email my request' }).click();

    const status = page.getByRole('status');
    await expect(status).toContainText('Your email app should open');
    await expect(status).toContainText('From: Ada Lovelace (Analytical Engines) <ada@example.com>');
    await expect(status).toContainText('Services: API testing, Performance');
    await expect(status).toContainText('Timeline: Next quarter');
    await expect(status).toContainText('Details: Flaky checkout suite');
    await expect(page.getByLabel('Work email')).not.toHaveAttribute('aria-invalid', /.*/);

    // The same prefilled email is offered as a link, and the page itself stays put.
    const href = await status.getByRole('link', { name: 'vipparla2002@gmail.com' }).getAttribute('href');
    const url = new URL(href ?? '');
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('vipparla2002@gmail.com');
    expect(url.searchParams.get('subject')).toBe('Project request from Ada Lovelace (Analytical Engines)');
    expect(url.searchParams.get('body')).toContain('Details: Flaky checkout suite');
    await expect(page).toHaveURL(/#contact$/);
  });

  test('keeps the contact address off the page until a request is prepared', async ({ page }) => {
    await page.goto('/');
    expect(await page.content()).not.toContain('@gmail.com');
    await expect(page.locator('#privacyMail')).toBeVisible();
  });

  test('sends to the form endpoint when one is configured', async ({ page }) => {
    let body: Record<string, string> = {};
    await page.route('https://formspree.io/f/test', async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto('/#contact');
    await page.locator('#brief').evaluate((f: HTMLFormElement) => { f.dataset.endpoint = 'https://formspree.io/f/test'; });
    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Work email').fill('ada@example.com');
    await page.getByRole('checkbox', { name: 'QA audit' }).check();
    await page.getByRole('button', { name: 'Email my request' }).click();

    await expect(page.getByRole('status')).toHaveText(/^Thanks, Ada Lovelace\. Your request is in\./);
    expect(body).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', services: 'QA audit', _gotcha: '' });
    await expect(page.getByLabel('Name')).toHaveValue('');
  });

  test('falls back to the summary when sending fails', async ({ page }) => {
    await page.route('https://formspree.io/f/test', (route) => route.fulfill({ status: 500 }));
    await page.goto('/#contact');
    await page.locator('#brief').evaluate((f: HTMLFormElement) => { f.dataset.endpoint = 'https://formspree.io/f/test'; });
    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Work email').fill('ada@example.com');
    await page.getByRole('button', { name: 'Email my request' }).click();

    const status = page.getByRole('status');
    await expect(status).toContainText('Sending failed');
    await expect(status).toContainText('From: Ada Lovelace <ada@example.com>');
    await expect(status.getByRole('link', { name: 'vipparla2002@gmail.com' })).toHaveAttribute('href', /^mailto:/);
    await expect(page.getByRole('button', { name: 'Email my request' })).toBeEnabled();
  });
});

test.describe('accessibility (axe, WCAG 2.2 AA)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`no violations in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      // Include both form result states in the scan.
      await page.getByRole('button', { name: 'Email my request' }).click();
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      expect(summary).toEqual([]);
    });
  }
});
