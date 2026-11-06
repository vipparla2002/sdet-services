// @ts-check
// Page behaviour: footer year, optional analytics, terminal re-run, engagement pre-select,
// contact brief (opens the visitor's email app, or sends to Formspree when configured).

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T}
 */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error('Missing element #' + id);
  return /** @type {T} */ (el);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Contact address. It is not on the page: visitors see it once they prepare a request.
// Kept split so scrapers reading page source for addresses do not pick it up.
const CONTACT = ['vipparla2002', 'gmail.com'].join('@');

// Footer year
byId('year').textContent = String(new Date().getFullYear());

// Cookieless analytics, only when a Cloudflare Web Analytics token is configured
const cfToken = document.querySelector('meta[name="cf-analytics-token"]')?.getAttribute('content');
if (cfToken) {
  const beacon = document.createElement('script');
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.defer = true;
  beacon.dataset.cfBeacon = JSON.stringify({ token: cfToken });
  document.head.append(beacon);
  byId('privacyAnalytics').hidden = false;
}

// Terminal re-run animation
const term = byId('term');
byId('rerun').addEventListener('click', () => {
  term.classList.remove('running');
  void term.offsetWidth; // restart CSS animation
  term.classList.add('running');
});

// Engagement buttons pre-select the matching service
document.querySelectorAll('[data-service]').forEach((el) => {
  const a = /** @type {HTMLElement} */ (el);
  a.addEventListener('click', () => {
    const box = /** @type {HTMLInputElement | null} */ (
      document.querySelector('.checks input[value="' + a.dataset.service + '"]')
    );
    if (box) box.checked = true;
  });
});

// Contact brief
/** @type {HTMLFormElement} */
const form = byId('brief');
/** @type {HTMLInputElement} */
const nameInput = byId('name');
/** @type {HTMLInputElement} */
const companyInput = byId('company');
/** @type {HTMLInputElement} */
const emailInput = byId('workEmail');
/** @type {HTMLSelectElement} */
const timelineInput = byId('timeline');
/** @type {HTMLTextAreaElement} */
const detailsInput = byId('details');
/** @type {HTMLInputElement} */
const honeypot = byId('website');
/** @type {HTMLButtonElement} */
const submitBtn = byId('submitBrief');
const out = byId('result');
// With a form service endpoint configured the form sends from the page; without one it opens the visitor's email app.
if (form.dataset.endpoint) {
  submitBtn.textContent = 'Send my request';
  byId('privacyForm').hidden = false;
  byId('privacyMail').hidden = true;
}

/**
 * @param {HTMLInputElement} input
 * @param {boolean} invalid
 */
function markInvalid(input, invalid) {
  if (invalid) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', 'result');
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const nameBad = !name;
  const emailBad = !EMAIL_RE.test(email);
  markInvalid(nameInput, nameBad);
  markInvalid(emailInput, emailBad);
  out.hidden = false;

  if (nameBad || emailBad) {
    out.className = 'result err';
    out.textContent = 'Add your name and a valid work email so I can reply.';
    (nameBad ? nameInput : emailInput).focus();
    return;
  }

  const services = Array.from(
    form.querySelectorAll('input[name="svc"]:checked'),
    (c) => /** @type {HTMLInputElement} */ (c).value,
  );
  const company = companyInput.value.trim();
  const summary =
    'From: ' + name + (company ? ' (' + company + ')' : '') + ' <' + email + '>\n' +
    'Services: ' + (services.length ? services.join(', ') : 'Not sure yet') + '\n' +
    'Timeline: ' + timelineInput.value + '\n' +
    'Details: ' + (detailsInput.value.trim() || '-');
  const mailto =
    'mailto:' + CONTACT +
    '?subject=' + encodeURIComponent('Project request from ' + name + (company ? ' (' + company + ')' : '')) +
    '&body=' + encodeURIComponent(summary + '\n');
  // Shown after opening the email app, and when sending fails: a link to try again plus the text to copy.
  const showSummary = (/** @type {string} */ intro) => {
    const link = document.createElement('a');
    link.href = mailto;
    link.textContent = CONTACT;
    out.className = 'result';
    out.replaceChildren(intro + ' Email it to ', link, ' or copy it:\n\n' + summary);
  };

  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    showSummary('Your email app should open with this request ready to send. If it did not:');
    location.href = mailto;
    return;
  }

  out.className = 'result';
  out.textContent = 'Sending…';
  submitBtn.disabled = true;
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      name,
      company,
      email,
      services: services.join(', '),
      timeline: timelineInput.value,
      details: detailsInput.value.trim(),
      _subject: 'New project request from ' + name,
      _gotcha: honeypot.value,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.reset();
      out.textContent = 'Thanks, ' + name + '. Your request is in. I will reply to ' + email + ' within one business day.';
    })
    .catch(() => showSummary('Sending failed, so nothing was lost.'))
    .finally(() => { submitBtn.disabled = false; });
});
