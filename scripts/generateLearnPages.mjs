// Post-build step: generates plain static HTML under dist/learn/** from Astra's existing
// numerology + glossary data. Runs after `vite build` (which empties dist/ on every run), never
// before — see the package.json build script ordering. No React, no headless browser: the data is
// timeless and the whole point is real HTML on disk before any JavaScript runs, since GPTBot/
// ClaudeBot/PerplexityBot/OAI-SearchBot don't execute JavaScript at all.
//
// All /learn/* public URLs use a trailing slash (canonical tags, sitemap <loc>, internal links,
// JSON-LD). Confirmed via a live post-deploy curl check that Render's dashboard SPA rewrite only
// skips real-file matching for the exact on-disk path a trailing-slash URL maps to
// (.../learn/x/index.html) — the no-slash form falls through to the SPA shell on every single
// page type, consistently. Existing app routes (/, /auth, /pricing) are untouched.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GLOSSARY } from '../src/data/glossary.ts'
import { NUMEROLOGY_MEANINGS } from '../src/data/numerologyMeanings.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const SITE_URL = 'https://astraastroconsultancy.com'
const SITE_NAME = 'Astra'

// Mirrors the section comments inside glossary.ts itself — not a new taxonomy, just reading the
// file's existing grouping into code so the glossary index page can render by category. Checked
// both ways against the live GLOSSARY object at generation time (see buildCategoryIndex), so this
// can't silently drift out of sync with glossary.ts.
const GLOSSARY_CATEGORIES = [
  { name: 'Planet', keys: ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'] },
  {
    name: 'Rashi (sign)',
    keys: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'],
  },
  { name: 'House', keys: Array.from({ length: 12 }, (_, i) => `house-${i + 1}`) },
  { name: 'Dignity', keys: ['exalted', 'debilitated', 'own'] },
  { name: 'Dasha & timing', keys: ['mahadasha', 'antardasha', 'retrograde', 'sade sati', 'guru gochar', 'ascendant'] },
  {
    name: 'Numerology',
    keys: [
      'life path number',
      'expression number',
      'soul urge number',
      'personality number',
      'birthday number',
      'master number',
      'personal year',
      'personal month',
      'personal day',
    ],
  },
]

// The 5 numerology sub-types, matching CORE_NUMBER_ROWS in NumerologyPage.tsx exactly — every
// sub-type calls the same meaningForNumber(n), so these are presentational labels/cross-links,
// not separate data.
const CORE_NUMBER_TYPES = [
  { label: 'Life Path', glossaryTerm: 'life path number' },
  { label: 'Expression', glossaryTerm: 'expression number' },
  { label: 'Soul Urge', glossaryTerm: 'soul urge number' },
  { label: 'Personality', glossaryTerm: 'personality number' },
  { label: 'Birthday', glossaryTerm: 'birthday number' },
]

const STATIC_URLS = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/pricing', changefreq: 'monthly', priority: '0.6' },
  { loc: '/auth', changefreq: 'monthly', priority: '0.3' },
]

// The only place that knows the trailing-slash convention for generated /learn/* URLs — every
// href/canonical/sitemap-loc pointing at a page this script writes routes through here, so the
// convention can't drift out of sync across the ~20 call sites that need it.
function learnHref(p) {
  return p.endsWith('/') ? p : `${p}/`
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Guards against a stray "</script>" substring in content prematurely closing the JSON-LD tag —
// < is a valid JSON escape for "<" that JSON.parse reverses correctly, so this is safe on
// both sides (never triggered by today's content, but must be here from day one since this runs
// unattended on every deploy).
function toSafeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

function slugify(key) {
  return key
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleCaseTerm(key) {
  if (key.startsWith('house-')) return `House ${key.slice('house-'.length)}`
  return key
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function buildSlugMap(keys) {
  const map = new Map()
  for (const key of keys) {
    const slug = slugify(key)
    if (map.has(slug)) {
      throw new Error(`Slug collision: "${key}" and "${map.get(slug)}" both slugify to "${slug}"`)
    }
    map.set(slug, key)
  }
  return map
}

function buildCategoryIndex() {
  const keyToCategory = new Map()
  for (const cat of GLOSSARY_CATEGORIES) {
    for (const key of cat.keys) {
      if (keyToCategory.has(key)) throw new Error(`Glossary key "${key}" appears in multiple categories in GLOSSARY_CATEGORIES`)
      keyToCategory.set(key, cat)
    }
  }
  for (const key of Object.keys(GLOSSARY)) {
    if (!keyToCategory.has(key)) {
      throw new Error(`Glossary key "${key}" is not assigned to a category — add it to GLOSSARY_CATEGORIES in generateLearnPages.mjs`)
    }
  }
  for (const key of keyToCategory.keys()) {
    if (!(key in GLOSSARY)) throw new Error(`GLOSSARY_CATEGORIES references "${key}", which no longer exists in glossary.ts`)
  }
  return keyToCategory
}

function breadcrumbHtml(trail) {
  const parts = trail.map((t, i) =>
    i === trail.length - 1 ? `<span>${escapeHtml(t.label)}</span>` : `<a href="${learnHref(t.href)}">${escapeHtml(t.label)}</a>`,
  )
  return `<nav class="breadcrumb">${parts.join(' <span aria-hidden="true">/</span> ')}</nav>`
}

const PAGE_CSS = `
:root{--color-paper:#faf7f1;--color-paper-raised:#f2ece1;--color-paper-sunken:#ece4d6;--color-ink:#201c16;--color-ink-muted:#6b6255;--color-ink-faint:#a89e8d;--color-line:#e2d8c7;--color-line-strong:#cabfa8;--color-accent:#b5502f;--color-accent-strong:#97401f;--color-accent-soft:#f1ddc9;--color-accent-ink:#fff8f0;--font-display:'Newsreader',ui-serif,Georgia,serif;--font-body:'Manrope',ui-sans-serif,system-ui,sans-serif;}
@media (prefers-color-scheme: dark){:root{--color-paper:#17140f;--color-paper-raised:#1f1b14;--color-paper-sunken:#100e0a;--color-ink:#f2ece1;--color-ink-muted:#b6ab97;--color-ink-faint:#756b5a;--color-line:#322b20;--color-line-strong:#453b2c;--color-accent:#dd8158;--color-accent-strong:#e89b76;--color-accent-soft:#33261c;--color-accent-ink:#1a1209;}}
*{box-sizing:border-box;border-color:var(--color-line);}
html{color-scheme:light dark;}
body{margin:0;background:var(--color-paper);color:var(--color-ink);font-family:var(--font-body);-webkit-font-smoothing:antialiased;line-height:1.6;}
a{color:inherit;}
.site-header{display:flex;align-items:center;justify-content:space-between;max-width:760px;margin:0 auto;padding:24px 20px;}
.wordmark{font-family:var(--font-display);font-size:1.25rem;text-decoration:none;color:var(--color-ink);}
.site-nav{display:flex;align-items:center;gap:18px;font-size:0.9rem;}
.site-nav a{text-decoration:none;color:var(--color-ink-muted);}
.site-nav a:hover{color:var(--color-ink);}
.site-nav .cta{padding:8px 16px;border-radius:999px;background:var(--color-accent);color:var(--color-accent-ink);font-weight:600;}
.site-nav .cta:hover{background:var(--color-accent-strong);}
main{max-width:760px;margin:0 auto;padding:0 20px 64px;}
.breadcrumb{font-size:0.8rem;color:var(--color-ink-faint);margin-bottom:24px;}
.breadcrumb a{color:var(--color-ink-faint);text-decoration:none;}
.breadcrumb a:hover{color:var(--color-ink);}
h1{font-family:var(--font-display);font-size:2.25rem;line-height:1.15;margin:0 0 12px;}
h2{font-family:var(--font-display);font-size:1.4rem;margin:40px 0 12px;}
h3{font-family:var(--font-display);font-size:1.1rem;margin:0 0 8px;}
.lede{font-size:1.05rem;color:var(--color-ink-muted);margin:0 0 24px;}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;background:var(--color-accent-soft);color:var(--color-accent-strong);font-size:0.75rem;font-weight:600;margin-bottom:16px;}
.card{border:1px solid var(--color-line);background:var(--color-paper-raised);border-radius:16px;padding:24px;margin:0;}
ul{padding-left:1.25em;margin:0;}
li{margin:0 0 6px;}
.grid-2{display:grid;grid-template-columns:1fr;gap:24px;margin:0 0 8px;}
@media (min-width:560px){.grid-2{grid-template-columns:1fr 1fr;}}
.eyebrow{font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-ink-faint);margin:0 0 8px;}
.subtype-row{border-top:1px solid var(--color-line);padding:16px 0;}
.subtype-row:first-child{border-top:none;padding-top:0;}
.subtype-row a{color:var(--color-accent-strong);text-decoration:underline;text-decoration-color:var(--color-accent-soft);text-underline-offset:3px;}
.number-nav{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 32px;}
.number-nav a{display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:36px;padding:0 10px;border-radius:10px;border:1px solid var(--color-line);text-decoration:none;color:var(--color-ink-muted);font-variant-numeric:tabular-nums;}
.number-nav a:hover{border-color:var(--color-accent);color:var(--color-accent-strong);}
.number-nav a.current{background:var(--color-accent);border-color:var(--color-accent);color:var(--color-accent-ink);font-weight:600;}
.cta-panel{text-align:center;border:1px solid var(--color-line);background:var(--color-paper-raised);border-radius:20px;padding:32px 24px;margin:40px 0;}
.cta-panel a.button{display:inline-block;margin-top:14px;padding:12px 24px;border-radius:999px;background:var(--color-accent);color:var(--color-accent-ink);text-decoration:none;font-weight:600;}
.cta-panel a.button:hover{background:var(--color-accent-strong);}
.term-list{display:grid;grid-template-columns:1fr;gap:0 24px;margin:0 0 32px;}
@media (min-width:560px){.term-list{grid-template-columns:1fr 1fr;}}
.term-list a{display:block;padding:10px 0;border-bottom:1px solid var(--color-line);text-decoration:none;color:var(--color-ink);}
.term-list a:hover{color:var(--color-accent-strong);}
.site-footer{max-width:760px;margin:0 auto;padding:32px 20px 48px;border-top:1px solid var(--color-line);color:var(--color-ink-faint);font-size:0.85rem;}
.site-footer a{color:var(--color-ink-faint);text-decoration:none;}
.site-footer a:hover{color:var(--color-ink);}
.site-footer p{margin:4px 0;}
`

function pageShell({ title, description, canonicalPath, breadcrumb, bodyHtml, jsonLd = [] }) {
  const canonicalUrl = `${SITE_URL}${learnHref(canonicalPath)}`
  const jsonLdHtml = jsonLd.map((obj) => `<script type="application/ld+json">${toSafeJsonLd(obj)}</script>`).join('\n    ')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#b5502f" />
    <meta name="robots" content="index, follow" />
    <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(title)}</title>
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

    ${jsonLdHtml}
    <style>${PAGE_CSS}</style>
  </head>
  <body>
    <header class="site-header">
      <a class="wordmark" href="/">Astra</a>
      <nav class="site-nav">
        <a href="${learnHref('/learn')}">Learn</a>
        <a class="cta" href="/auth">Open Astra</a>
      </nav>
    </header>
    <main>
      ${breadcrumb}
      ${bodyHtml}
    </main>
    <footer class="site-footer">
      <p>&copy; ${new Date().getFullYear()} Astra — <a href="/">astraastroconsultancy.com</a></p>
      <p><a href="${learnHref('/learn')}">Learn</a> &middot; <a href="/pricing">Pricing</a> &middot; <a href="/auth">Sign in</a></p>
    </footer>
  </body>
</html>
`
}

function renderNumerologyPage(meaning, order) {
  const { number, isMaster, title, positiveTraits, shadowTraits, careers, compatibility, lifeLesson } = meaning
  const traitsPreview = positiveTraits.slice(0, 3).map((t) => t.toLowerCase()).join(', ')

  const subtypeHtml = CORE_NUMBER_TYPES.map(
    ({ label, glossaryTerm }) => `
    <div class="subtype-row">
      <h3>${escapeHtml(label)} ${number}</h3>
      <p>${escapeHtml(GLOSSARY[glossaryTerm])} <a href="${learnHref(`/learn/glossary/${slugify(glossaryTerm)}`)}">More on the ${escapeHtml(label)} number &rarr;</a></p>
    </div>`,
  ).join('')

  const linkNumbers = (nums) =>
    nums.length ? nums.map((n) => `<a href="${learnHref(`/learn/numerology/${n}`)}">${n}</a>`).join(', ') : 'None flagged'

  const masterBlock = isMaster
    ? `<p class="lede">${escapeHtml(GLOSSARY['master number'])} <a href="${learnHref('/learn/glossary/master-number')}">More on master numbers &rarr;</a></p>`
    : ''

  const navHtml = order
    .map((n) => `<a class="${n === number ? 'current' : ''}" href="${learnHref(`/learn/numerology/${n}`)}">${n}</a>`)
    .join('')

  const bodyHtml = `
    ${isMaster ? '<span class="badge">Master Number</span>' : ''}
    <h1>Number ${number} in Numerology — ${escapeHtml(title)}</h1>
    <p class="lede">People with the number ${number} tend to be ${escapeHtml(traitsPreview)}. Life lesson: ${escapeHtml(lifeLesson)}</p>
    ${masterBlock}

    <div class="grid-2">
      <div class="card">
        <p class="eyebrow">Strengths</p>
        <ul>${positiveTraits.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      </div>
      <div class="card">
        <p class="eyebrow">Growth edges</p>
        <ul>${shadowTraits.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      </div>
    </div>

    <h2>Well-suited careers</h2>
    <p>${careers.map((c) => escapeHtml(c)).join(', ')}</p>

    <h2>Compatibility</h2>
    <p>Most harmonious with: ${linkNumbers(compatibility.mostHarmonious)}<br />Can be more challenging with: ${linkNumbers(compatibility.mostChallenging)}</p>
    <p>${escapeHtml(compatibility.note)}</p>

    <h2>Where number ${number} shows up for you</h2>
    <p>Numerology pulls five core numbers from your birth date and full birth name — the number ${number} means the same thing wherever it lands, but each of these draws on a different part of who you are.</p>
    ${subtypeHtml}

    <h2>All numbers</h2>
    <div class="number-nav">${navHtml}</div>

    <div class="cta-panel">
      <p class="eyebrow">Free on Astra</p>
      <p>See your actual Life Path, Expression, Soul Urge, Personality, and Birthday numbers — computed from your real name and birth date, not a generic template.</p>
      <a class="button" href="/auth">Get your numbers free</a>
    </div>
  `

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: CORE_NUMBER_TYPES.map(({ label, glossaryTerm }) => ({
      '@type': 'Question',
      name: `What does ${label} number ${number} mean?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${GLOSSARY[glossaryTerm]} People with ${label} number ${number} are known in numerology as "${title}."`,
      },
    })),
  }

  return pageShell({
    title: `Number ${number} in Numerology — ${title} | Astra`,
    description: `Number ${number} in numerology — ${title}: strengths, growth edges, careers, and compatibility. Also what ${number} means as your Life Path, Expression, Soul Urge, Personality, or Birthday number.`,
    canonicalPath: `/learn/numerology/${number}`,
    breadcrumb: breadcrumbHtml([
      { label: 'Learn', href: '/learn' },
      { label: 'Numerology', href: '/learn/numerology' },
      { label: String(number) },
    ]),
    bodyHtml,
    jsonLd: [jsonLd],
  })
}

function renderGlossaryPage(key, definition, category) {
  const displayName = titleCaseTerm(key)
  const relatedHtml =
    category.name === 'Numerology'
      ? `<p><a href="${learnHref('/learn/numerology')}">Explore what each number means &rarr;</a></p>`
      : ''

  const bodyHtml = `
    <span class="badge">${escapeHtml(category.name)}</span>
    <h1>${escapeHtml(displayName)}</h1>
    <p class="lede">${escapeHtml(definition)}</p>
    ${relatedHtml}
    <div class="cta-panel">
      <p class="eyebrow">Free on Astra</p>
      <p>See this and everything else in your real Vedic birth chart — computed from your exact birth date, time, and place.</p>
      <a class="button" href="/auth">Open your chart free</a>
    </div>
    <p><a href="${learnHref('/learn/glossary')}">&larr; Back to the full glossary</a></p>
  `

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: displayName,
    description: definition,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Astra Vedic Astrology & Numerology Glossary',
      url: `${SITE_URL}${learnHref('/learn/glossary')}`,
    },
  }

  return pageShell({
    title: `${displayName} — Vedic Astrology & Numerology Glossary | Astra`,
    description: definition,
    canonicalPath: `/learn/glossary/${slugify(key)}`,
    breadcrumb: breadcrumbHtml([{ label: 'Learn', href: '/learn' }, { label: 'Glossary', href: '/learn/glossary' }, { label: displayName }]),
    bodyHtml,
    jsonLd: [jsonLd],
  })
}

function renderLearnHub() {
  const bodyHtml = `
    <h1>Learn</h1>
    <p class="lede">Plain-English explanations of the Vedic astrology and numerology concepts used throughout Astra — no account required.</p>
    <div class="grid-2">
      <div class="card">
        <h2 style="margin-top:0">Numerology meanings</h2>
        <p>What each number means — 1 through 9, plus the master numbers 11, 22, and 33.</p>
        <p><a href="${learnHref('/learn/numerology')}">Browse all 12 numbers &rarr;</a></p>
      </div>
      <div class="card">
        <h2 style="margin-top:0">Astrology glossary</h2>
        <p>Planets, signs, houses, dignities, and dasha/timing terms used across your chart.</p>
        <p><a href="${learnHref('/learn/glossary')}">Browse all ${Object.keys(GLOSSARY).length} terms &rarr;</a></p>
      </div>
    </div>
    <div class="cta-panel">
      <p class="eyebrow">Free on Astra</p>
      <p>These are the building blocks. See them applied to your own real birth chart and numbers.</p>
      <a class="button" href="/auth">Get started free</a>
    </div>
  `
  return pageShell({
    title: 'Learn — Vedic Astrology & Numerology | Astra',
    description: 'Plain-English explanations of Vedic astrology and numerology concepts — numerology number meanings and a full astrology glossary. No account required.',
    canonicalPath: '/learn',
    breadcrumb: breadcrumbHtml([{ label: 'Learn' }]),
    bodyHtml,
  })
}

function renderNumerologyIndex(order) {
  const items = order
    .map((n) => {
      const m = NUMEROLOGY_MEANINGS[n]
      return `<a href="${learnHref(`/learn/numerology/${n}`)}"><strong>${n}</strong> — ${escapeHtml(m.title)}</a>`
    })
    .join('')
  const bodyHtml = `
    <h1>Numerology — number meanings</h1>
    <p class="lede">Every core number in numerology, 1 through 9, plus the three master numbers.</p>
    <div class="term-list">${items}</div>
  `
  return pageShell({
    title: 'Numerology Number Meanings — 1 to 9, 11, 22, 33 | Astra',
    description: 'What every number means in numerology — Life Path, Expression, Soul Urge, Personality, and Birthday numbers, from 1 through 9 plus the master numbers 11, 22, and 33.',
    canonicalPath: '/learn/numerology',
    breadcrumb: breadcrumbHtml([{ label: 'Learn', href: '/learn' }, { label: 'Numerology' }]),
    bodyHtml,
  })
}

function renderGlossaryIndex() {
  const sections = GLOSSARY_CATEGORIES.map((cat) => {
    const items = cat.keys
      .map((k) => `<a href="${learnHref(`/learn/glossary/${slugify(k)}`)}">${escapeHtml(titleCaseTerm(k))}</a>`)
      .join('')
    return `<h2>${escapeHtml(cat.name)}</h2><div class="term-list">${items}</div>`
  }).join('')
  const bodyHtml = `
    <h1>Astrology &amp; numerology glossary</h1>
    <p class="lede">Plain-English definitions for every term used across Astra.</p>
    ${sections}
  `
  return pageShell({
    title: 'Vedic Astrology & Numerology Glossary | Astra',
    description: `Plain-English definitions for every planet, sign, house, dignity, dasha, and numerology term used across Astra — ${Object.keys(GLOSSARY).length} terms, explained clearly.`,
    canonicalPath: '/learn/glossary',
    breadcrumb: breadcrumbHtml([{ label: 'Learn', href: '/learn' }, { label: 'Glossary' }]),
    bodyHtml,
  })
}

function buildSitemapXml(urls) {
  const entries = urls
    .map((u) => `  <url>\n    <loc>${SITE_URL}${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

function writePage(urlPath, html) {
  const dir = path.join(DIST, urlPath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8')
}

function main() {
  if (!fs.existsSync(DIST)) {
    throw new Error('dist/ does not exist — run "vite build" before generateLearnPages.mjs (see package.json build script order)')
  }

  const keyToCategory = buildCategoryIndex()
  buildSlugMap(Object.keys(GLOSSARY))

  const sitemapUrls = [...STATIC_URLS]

  writePage('/learn', renderLearnHub())
  sitemapUrls.push({ loc: learnHref('/learn'), changefreq: 'monthly', priority: '0.7' })

  const numerologyOrder = Object.keys(NUMEROLOGY_MEANINGS)
    .map(Number)
    .sort((a, b) => a - b)

  writePage('/learn/numerology', renderNumerologyIndex(numerologyOrder))
  sitemapUrls.push({ loc: learnHref('/learn/numerology'), changefreq: 'monthly', priority: '0.6' })

  for (const n of numerologyOrder) {
    writePage(`/learn/numerology/${n}`, renderNumerologyPage(NUMEROLOGY_MEANINGS[n], numerologyOrder))
    sitemapUrls.push({ loc: learnHref(`/learn/numerology/${n}`), changefreq: 'yearly', priority: '0.5' })
  }

  writePage('/learn/glossary', renderGlossaryIndex())
  sitemapUrls.push({ loc: learnHref('/learn/glossary'), changefreq: 'monthly', priority: '0.6' })

  for (const [key, definition] of Object.entries(GLOSSARY)) {
    const slug = slugify(key)
    const category = keyToCategory.get(key)
    writePage(`/learn/glossary/${slug}`, renderGlossaryPage(key, definition, category))
    sitemapUrls.push({ loc: learnHref(`/learn/glossary/${slug}`), changefreq: 'yearly', priority: '0.4' })
  }

  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemapXml(sitemapUrls), 'utf8')

  const generatedCount = sitemapUrls.length - STATIC_URLS.length
  console.log(`generateLearnPages: wrote ${generatedCount} /learn/* pages, ${sitemapUrls.length} total URLs in dist/sitemap.xml`)
}

try {
  main()
} catch (err) {
  console.error('generateLearnPages failed:', err)
  process.exit(1)
}
