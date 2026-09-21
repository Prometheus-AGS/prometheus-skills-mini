#!/usr/bin/env node
/**
 * convert-htmx-pdf.mjs — HTML/HTMX → paginated PDF via headless Chromium.
 *
 * Five stages: embed fonts → inject print CSS → preflight → render → verify.
 * Every stage exists because skipping it produced a visibly wrong PDF at least once.
 *
 * Usage:
 *   node scripts/convert-htmx-pdf.mjs --source report.html --output report.pdf \
 *     --header-left "Acme · Q3 Report" --header-right "DOC-001" \
 *     --footer-left "Prepared by A. Author" --preview /tmp/page-1.png
 *
 * See skills/convert-htmx-pdf/SKILL.md and references/print-pagination.md.
 */

import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── argv ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const o = {
    format: 'Letter',
    landscape: false,
    margin: '0.62in',
    embedFonts: true,
    injectPrintCss: true,
    verify: true,
    headerFooter: true,
    minPageWords: 40,
    contentRatio: 0.9,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--source': o.source = next(); break;
      case '--output': o.output = next(); break;
      case '--format': o.format = next(); break;
      case '--margin': o.margin = next(); break;
      case '--print-css': o.printCss = next(); break;
      case '--preview': o.preview = next(); break;
      case '--header-left': o.headerLeft = next(); break;
      case '--header-right': o.headerRight = next(); break;
      case '--footer-left': o.footerLeft = next(); break;
      case '--min-page-words': o.minPageWords = Number(next()); break;
      case '--landscape': o.landscape = true; break;
      case '--no-embed-fonts': o.embedFonts = false; break;
      case '--no-inject-print-css': o.injectPrintCss = false; break;
      case '--no-verify': o.verify = false; break;
      case '--no-header-footer': o.headerFooter = false; break;
      case '--help': case '-h': o.help = true; break;
      default:
        if (a.startsWith('--')) fail(`unknown flag: ${a}`);
    }
  }
  return o;
}

const log = (...m) => console.log('[pdf]', ...m);
const warn = (...m) => console.warn('[pdf] WARN', ...m);
function fail(msg) { console.error(`[pdf] ERROR ${msg}`); process.exit(1); }

// ── stage 1 · font embedding ────────────────────────────────────────────────

/** Keep only @font-face blocks whose unicode-range covers Latin / Latin-Ext. */
function latinBlocks(css) {
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  return blocks.filter((b) => {
    const m = /unicode-range:\s*([^;]+);/.exec(b);
    if (!m) return true; // no range declared → keep
    return m[1].includes('U+0000-00FF') || /U\+0100-02/.test(m[1]);
  });
}

async function embedGoogleFonts(html) {
  const linkRe =
    /<link[^>]+href=["'](https:\/\/fonts\.googleapis\.com\/css2?\?[^"']+)["'][^>]*>/gi;
  const links = [...html.matchAll(linkRe)];
  if (links.length === 0) {
    log('stage 1 · font embedding — no Google Fonts links; skipping');
    return html;
  }

  let out = html;
  const cache = new Map();

  for (const [tag, rawHref] of links) {
    const href = rawHref.replace(/&amp;/g, '&');
    let css;
    try {
      css = await (await fetch(href, { headers: { 'User-Agent': UA } })).text();
    } catch (e) {
      warn(`could not fetch ${href} — leaving the <link> in place (${e.message})`);
      continue;
    }

    const kept = latinBlocks(css);
    const total = (css.match(/@font-face/g) ?? []).length;
    let bytes = 0;

    const inlined = [];
    for (const block of kept) {
      const m = /url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/.exec(block);
      if (!m) continue;
      const url = m[1];
      if (!cache.has(url)) {
        const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
        bytes += buf.length;
        cache.set(url, `data:font/woff2;base64,${buf.toString('base64')}`);
      }
      inlined.push(block.replace(url, cache.get(url)));
    }

    out = out.replace(tag, `<style data-embedded-fonts>\n${inlined.join('\n')}\n</style>`);
    log(
      `stage 1 · font embedding — ${kept.length}/${total} @font-face kept (Latin), ` +
      `${(bytes / 1024).toFixed(0)} KB inlined`
    );
  }
  return out;
}

// ── stage 2 · print stylesheet ──────────────────────────────────────────────

const BASELINE_PRINT_CSS = `
/* convert-htmx-pdf · baseline print stylesheet.
   Fixes what is always wrong. Inserts NO page breaks — that stays with the artifact. */
@media print {
  html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* Fixed chrome prints on every page or collides with the running header. */
  nav[class*="nav"], .nav, header[class*="fixed"], .sidebar, .toc,
  [class*="sticky"], [style*="position:fixed"], [style*="position: fixed"] { display: none !important; }

  /* Collapse page shells to a single column. */
  .page-body, .layout, .container-grid { display: block !important; grid-template-columns: 1fr !important; }
  .main, main { padding: 0 !important; max-width: 100% !important; }

  /* Keep components whole. */
  .callout, .quote, .card, .phase, .panel, .figure, figure, .diagram,
  .tbl-wrap, table, pre, blockquote, li, .miniapp, .split-card, .gate {
    break-inside: avoid;
  }
  tr, thead { break-inside: avoid; }
  thead { display: table-header-group; }

  /* A heading must never be the last thing on a page. */
  h1, h2, h3, h4, h5, h6, .section-header { break-after: avoid; break-inside: avoid; }

  p, li { orphans: 3; widows: 3; }

  /* Links print as text; the URL is noise on paper. */
  a { color: inherit; text-decoration: none; }

  img, svg { max-width: 100% !important; height: auto !important; }
}
`.trim();

async function injectPrintCss(html, extraPath) {
  let css = BASELINE_PRINT_CSS;
  if (extraPath) {
    if (!existsSync(extraPath)) fail(`--print-css not found: ${extraPath}`);
    css += `\n\n/* --print-css: ${path.basename(extraPath)} */\n` + (await readFile(extraPath, 'utf8'));
  }
  const style = `<style data-print-baseline>\n${css}\n</style>`;
  log(`stage 2 · print CSS — baseline injected${extraPath ? ' + artifact stylesheet' : ''}`);
  return html.includes('</head>')
    ? html.replace('</head>', `${style}\n</head>`)
    : style + html;
}

// ── stage 3 · preflight ─────────────────────────────────────────────────────

function preflight(html, opts) {
  const findings = [];
  let out = html;

  // The one that costs a rebuild: @page margin overrides renderer margins.
  const pageMargin = /@page\s*\{[^}]*\bmargin\s*:[^;}]+;?[^}]*\}/g;
  if (opts.headerFooter && pageMargin.test(html)) {
    out = out.replace(pageMargin, (blk) => blk.replace(/\bmargin\s*:[^;}]+;?/g, ''));
    findings.push(
      'stripped `margin` from @page — it overrides the renderer margins and the header would draw into the text'
    );
  }

  // Over-aggressive forced breaks produce orphan pages. Count the SELECTORS a
  // break-before rule applies to, not the number of rules — one comma-separated
  // selector list can force a break on every section in the document.
  let broken = 0;
  for (const m of html.matchAll(/([^{}]+)\{[^}]*break-before\s*:\s*page[^}]*\}/g)) {
    broken += m[1].split(',').filter((s) => s.trim()).length;
  }
  const sections = (html.match(/<section\b/g) ?? []).length;
  if (broken > 0 && sections > 0 && broken / sections > 0.34) {
    findings.push(
      `break-before:page applies to ${broken} selector(s) against ~${sections} sections — ` +
      `expect near-empty pages; restrict forced breaks to structural boundaries`
    );
  }

  // Render-time network dependencies make the PDF non-reproducible.
  const extImg = (html.match(/<img[^>]+src=["']https?:/gi) ?? []).length;
  const extCss = (html.match(/<link[^>]+rel=["']stylesheet["'][^>]+https?:/gi) ?? []).length;
  if (extImg) findings.push(`${extImg} external <img> — inline as data: URIs for a reproducible render`);
  if (extCss) findings.push(`${extCss} external stylesheet(s) still referenced`);

  if (findings.length === 0) log('stage 3 · preflight — clean');
  else findings.forEach((f) => warn(`stage 3 · preflight — ${f}`));

  return out;
}

// ── stage 4 · render ────────────────────────────────────────────────────────

const TPL_FONT = "font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;";

const bar = (left, right, extra = '') => `
<div style="${TPL_FONT}width:100%;padding:0 0.62in;margin:0;font-size:6.6pt;color:#9A9A9A;
            letter-spacing:.08em;display:flex;justify-content:space-between;align-items:baseline;${extra}">
  <span>${left ?? ''}</span><span>${right ?? ''}</span>
</div>`;

async function resolveChromium(playwright) {
  // Sandboxes frequently ship a Chromium that Playwright's default path misses.
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    '/opt/pw-browsers/chromium-1234/chrome-linux64/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return undefined; // let Playwright resolve its own
}

async function render(htmlPath, opts) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    fail('playwright not installed — run: npm i -D playwright && npx playwright install chromium');
  }

  const executablePath = await resolveChromium(playwright);
  const browser = await playwright.chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage({ deviceScaleFactor: 2 });

  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(1200); // let webfonts settle and any on-load JS draw

  const wantsBar = opts.headerFooter && (opts.headerLeft || opts.headerRight || opts.footerLeft);
  const margin = {
    top: wantsBar ? '0.72in' : opts.margin,
    bottom: wantsBar ? '0.62in' : opts.margin,
    left: opts.margin,
    right: opts.margin,
  };

  await page.pdf({
    path: opts.output,
    format: opts.format,
    landscape: opts.landscape,
    printBackground: true,
    preferCSSPageSize: false,
    margin,
    displayHeaderFooter: Boolean(wantsBar),
    headerTemplate: wantsBar ? bar(opts.headerLeft, opts.headerRight, 'text-transform:uppercase;') : '<span></span>',
    footerTemplate: wantsBar
      ? bar(
          opts.footerLeft ? `<span style="text-transform:uppercase;">${opts.footerLeft}</span>` : '',
          '<span class="pageNumber"></span> / <span class="totalPages"></span>'
        )
      : '<span></span>',
  });

  const sourceWords = await page.evaluate(
    () => (document.body.innerText || '').trim().split(/\s+/).filter(Boolean).length
  );

  await browser.close();
  log(`stage 4 · render — ${opts.output}`);
  return { sourceWords };
}

// ── stage 5 · verification ──────────────────────────────────────────────────

const has = (bin) => {
  try { execFileSync('which', [bin], { stdio: 'ignore' }); return true; } catch { return false; }
};
const run = (bin, args, quiet = false) =>
  execFileSync(bin, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    // Type 3 fonts (Skia's output for variable-font instances) make poppler emit
    // benign "Bad bounding box" warnings. They are noise, not a defect.
    stdio: quiet ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'pipe', 'inherit'],
  });

function verify(pdf, { sourceWords }, opts) {
  const problems = [];
  log('stage 5 · verification');

  if (!has('pdfinfo') || !has('pdftotext')) {
    warn('  poppler-utils not found — install for full verification (apt-get install poppler-utils)');
    return problems;
  }

  const pages = Number(/^Pages:\s*(\d+)/m.exec(run('pdfinfo', [pdf]))?.[1] ?? 0);
  log(`  pages: ${pages}`);

  // One extraction, split on the form feed pdftotext emits between pages.
  // (Spawning pdftotext per page is correct and unusably slow past ~15 pages.)
  const text = run('pdftotext', [pdf, '-']);
  const perPage = text.split('\f');
  const count = (s) => s.trim().split(/\s+/).filter(Boolean).length;

  // Content preservation — catches clipped or dropped content.
  const pdfWords = count(text);
  const ratio = sourceWords ? pdfWords / sourceWords : 1;
  log(`  words: ${pdfWords} in PDF vs ${sourceWords} visible in source (ratio ${ratio.toFixed(2)})`);
  if (pdfWords === 0) problems.push('no extractable text — the page rendered as images');
  else if (ratio < opts.contentRatio)
    problems.push(`content loss: PDF carries ${(ratio * 100).toFixed(0)}% of the source words`);

  // Page density — catches orphan pages from over-aggressive breaks.
  const thin = [];
  for (let i = 0; i < Math.min(perPage.length, pages); i++) {
    const n = count(perPage[i]);
    const pageNo = i + 1;
    if (n < opts.minPageWords && pageNo !== 1 && pageNo !== pages) thin.push(`${pageNo} (${n}w)`);
  }
  if (thin.length) problems.push(`near-empty page(s): ${thin.join(', ')} — check forced page breaks`);
  else log(`  density: no orphan pages (threshold ${opts.minPageWords} words)`);

  // Font embedding — catches silent substitution.
  if (has('pdffonts')) {
    const lines = run('pdffonts', [pdf]).split('\n').slice(2).filter(Boolean);
    const notEmbedded = lines.filter((l) => / no  *(yes|no) /.test(l) || /\bno\b\s+\bno\b/.test(l));
    if (notEmbedded.length) problems.push(`${notEmbedded.length} font(s) not embedded — expect substitution`);
    else log(`  fonts: ${lines.length} embedded`);
  }

  if (problems.length === 0) log('  PASS');
  else problems.forEach((p) => warn(`  FAIL ${p}`));
  return problems;
}

async function preview(pdf, png) {
  if (!has('pdftoppm')) { warn(`could not write preview — pdftoppm not found`); return; }
  const base = png.replace(/\.png$/, '');
  run('pdftoppm', ['-png', '-r', '90', '-f', '1', '-l', '1', pdf, base]);
  log(`preview: ${base}-1.png — open it and confirm before reporting success`);
}

// ── main ────────────────────────────────────────────────────────────────────

const USAGE = `
convert-htmx-pdf — HTML/HTMX → paginated PDF via headless Chromium

  --source <file.html>        (required)
  --output <file.pdf>         (required)
  --format Letter|A4|Legal|Tabloid   default Letter
  --landscape
  --margin <css-length>       default 0.62in
  --header-left <text>        enables the running header
  --header-right <text>
  --footer-left <text>        page numbers always sit footer-right
  --no-header-footer
  --no-embed-fonts
  --print-css <file.css>      appended after the baseline print stylesheet
  --no-inject-print-css
  --preview <file.png>        rasterize page 1 for visual check
  --no-verify
  --min-page-words <n>        orphan-page threshold, default 40
`.trim();

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) { console.log(USAGE); return; }
  if (!opts.source || !opts.output) { console.log(USAGE); fail('--source and --output are required'); }
  if (!existsSync(opts.source)) fail(`source not found: ${opts.source}`);

  let html = await readFile(opts.source, 'utf8');
  if (opts.embedFonts) html = await embedGoogleFonts(html);
  if (opts.injectPrintCss) html = await injectPrintCss(html, opts.printCss);
  html = preflight(html, opts);

  // Render from a temp copy beside the source so relative asset paths still resolve.
  const dir = await mkdtemp(path.join(tmpdir(), 'htmx-pdf-'));
  const staged = path.join(path.dirname(path.resolve(opts.source)), `.htmx-pdf-${path.basename(opts.source)}`);
  await writeFile(staged, html, 'utf8');

  let problems = [];
  try {
    const meta = await render(staged, opts);
    if (opts.verify) problems = verify(opts.output, meta, opts);
    if (opts.preview) await preview(opts.output, opts.preview);
  } finally {
    await rm(staged, { force: true });
    await rm(dir, { recursive: true, force: true });
  }

  if (problems.length) {
    console.error('\n[pdf] verification found issues — see references/print-pagination.md');
    process.exit(2);
  }
  log('done');
}

main().catch((e) => fail(e.stack || e.message));
