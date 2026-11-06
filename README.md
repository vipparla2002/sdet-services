# Greenbar Quality Engineering

Single-page services site for SDET / test automation work. Plain HTML, CSS and JS — no build step. Node is only used for checks (type-checking, HTML lint, Playwright + axe tests).

## Before publishing

- The contact address is not shown on the page. It lives only in `CONTACT` at the top of `assets/main.js`, split in two so scrapers reading the page source miss it. Visitors see it once they prepare a request.
- When adding a new case study, mark the card `data-draft` until you have checked it against what you actually did. CI refuses to deploy from `main` while any `data-draft`, `TODO:` marker or `your-username` placeholder remains.
- Set your commit email to your GitHub no-reply address before the first commit (GitHub → Settings → Emails), so no personal or work address is published in the history.
- Change the brand name ("Greenbar") and footer if you want your own name. If you change the brand or headline, update `scripts/og-image.mjs` and re-render the share image with `node scripts/og-image.mjs`.
- **Contact form:** by default, "Email my request" opens the visitor's own email app with a message to you already written (subject plus their name, company, services, timeline and details). No third party, no account, no limit. The page also shows the request with a link to your address, for visitors without an email app set up.
  - **Optional, one-click sending:** create a free form at [formspree.io](https://formspree.io) (about 50 submissions/month), then paste its URL into `data-endpoint` on `<form id="brief">`, e.g. `data-endpoint="https://formspree.io/f/abcdwxyz"`. The button changes to "Send my request" and submissions arrive in your inbox. If sending fails, the visitor gets the email-app fallback, so no lead is lost. A hidden `_gotcha` field filters spam bots.

- **Analytics (optional):** add the site in Cloudflare Web Analytics (free, no cookies, no consent banner needed), and paste its token into `<meta name="cf-analytics-token">`. Left empty, nothing is loaded.

The Privacy section shows the Formspree and analytics paragraphs only when those services are configured, so it always matches what the site actually does.

## Search and social metadata

`index.html`, `robots.txt` and `sitemap.xml` contain a `__SITE_URL__` placeholder. When CI assembles the site it replaces it with the Pages address (`https://<owner>.github.io/<repo>`, or `https://<owner>.github.io` for a `<owner>.github.io` repo) and stamps the sitemap's `lastmod` with the deploy date. To deploy somewhere else, set a repository variable `SITE_URL` (**Settings → Secrets and variables → Actions → Variables**), e.g. `https://greenbar.pages.dev`.

The page ships with a keyword-rich title and description, a canonical URL, Open Graph / Twitter card tags with a 1200×630 preview image (`assets/og-image.png`), an SVG favicon, and `ProfessionalService` JSON-LD listing the three engagements.

After the first deploy:

1. **Google Search Console** → add a *URL prefix* property with your full site URL. Verify with the HTML-tag method: paste the `<meta name="google-site-verification" ...>` tag it gives you into the `<head>` of `index.html` and push. Then submit `sitemap.xml` under **Sitemaps**.
2. **Bing Webmaster Tools** → import the site from Search Console (this also covers DuckDuckGo).
3. Check the share card with [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) and the structured data with Google's [Rich Results Test](https://search.google.com/test/rich-results).

Crawlers only read `robots.txt` at the root of a host. On a project site (`<owner>.github.io/sdet-services/`) it sits in a subfolder and is ignored, which is harmless because the page allows everything anyway. Submit the sitemap through Search Console directly. Name the repo `<owner>.github.io` if you want the files at the root.

## Develop and test

```bash
npm install
npx playwright install chromium
npm run serve       # http://127.0.0.1:4173
npm run check       # typecheck + HTML lint + Playwright tests
npm run test:ui     # Playwright UI mode
npm run fonts       # re-copy self-hosted fonts after updating the @fontsource packages
npm run og-image    # re-render the share preview image
```

CI also runs, on the assembled site:

- **Link check** ([lychee](https://github.com/lycheeverse/lychee)): any broken internal link, anchor or external URL fails the build.
- **Lighthouse** (`lighthouserc.json`): fails below 90 performance, 100 accessibility, 90 best practices or 95 SEO. Reports are uploaded as the `lighthouse-report` artifact.

Dependabot (`.github/dependabot.yml`) opens one grouped PR a week for npm packages and one for GitHub Actions; CI checks each before you merge.

| Path | Purpose |
|---|---|
| `index.html` | Markup and styles |
| `assets/main.js` | Page behaviour (`// @ts-check`, type-checked by `tsc`) |
| `404.html` | Page GitHub Pages shows for missing URLs |
| `sample-audit.html` | Sample test audit report for a fictional product, linked from the Work section and the Test audit plan |
| `assets/fonts/` | Self-hosted fonts (latin subsets), so no visitor data goes to Google |
| `assets/og-image.png`, `assets/favicon.svg` | Share preview image and favicon |
| `robots.txt`, `sitemap.xml` | Crawler files; `__SITE_URL__` is filled in by CI |
| `scripts/og-image.mjs`, `scripts/copy-fonts.mjs` | Re-render the share image; copy fonts from `node_modules` |
| `lighthouserc.json` | Lighthouse score budgets enforced in CI |
| `tests/site.spec.ts` | E2E tests on desktop and mobile, plus axe WCAG 2.2 AA scans in light and dark mode |
| `.github/workflows/ci.yml` | Runs every check on each PR; deploys to Pages from `main` only if they pass |

Scripts must live in files under `assets/`. The CSP blocks inline `<script>` blocks, and a test fails on any CSP violation.

## Host on GitHub Pages

1. Create a repository on your personal GitHub account, e.g. `sdet-services`
   (or `<your-username>.github.io` to serve it at the root domain).
2. Push this folder:

   ```bash
   git init
   git add .
   git commit -m "Add services site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/sdet-services.git
   git push -u origin main
   ```

3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Every push to `main` runs the CI workflow. If the checks pass, it publishes only the site files (`index.html`, `404.html`, `sample-audit.html`, `robots.txt`, `sitemap.xml`, `assets/`, `.nojekyll`) with the site URL filled in. After a minute the site is live at `https://<your-username>.github.io/sdet-services/`.

A `.nojekyll` file is included so GitHub serves the files as-is.
