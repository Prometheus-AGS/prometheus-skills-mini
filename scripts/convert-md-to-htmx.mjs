#!/usr/bin/env node
// convert-md-to-htmx.mjs
//
// Deterministic Markdown → branded HTMX (single-file HTML) converter.
//
// Pipeline:
//   1. Read MD source; extract frontmatter via gray-matter
//   2. markdown-it (GFM + heading anchors) → HTML body
//   3. Wrap in semantic HTML per --document-type
//   4. Inject brand CSS via template-forge render --template vite-shell-css
//   5. Emit single self-contained .html file
//
// Usage:
//   node scripts/convert-md-to-htmx.mjs \
//     --source <md-path> \
//     --brand <brand-name> \
//     --output <html-path> \
//     [--document-type article|brief|spec|moodboard|none]
//
// Frontmatter overrides flags:
//   ---
//   title: Custom Title
//   document-type: brief
//   ---

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const FORGE_BIN = resolve(REPO_ROOT, "tools/template-forge-rs/target/release/template-forge");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

const argv = parseArgs(process.argv);
for (const k of ["source", "brand", "output"]) {
  if (!argv[k]) { console.error(`missing --${k}`); process.exit(2); }
}
const SOURCE = argv["source"];
const BRAND = argv["brand"];
const OUTPUT = argv["output"];
const DOC_TYPE_FLAG = argv["document-type"] ?? "article";

// --- Read MD + frontmatter ---
const raw = readFileSync(SOURCE, "utf8");
const { data: frontmatter, content: mdBody } = matter(raw);
const DOC_TYPE = frontmatter["document-type"] ?? DOC_TYPE_FLAG;
const TITLE = frontmatter.title ?? basename(SOURCE).replace(/\.md$/i, "");

if (DOC_TYPE === "moodboard") {
  console.warn(`[convert-md-to-htmx] --document-type=moodboard: this script doesn't synthesize moodboards.`);
  console.warn(`  Use refine-moodboard.mjs instead for moodboard generation from a brief.`);
  console.warn(`  Continuing as 'article' for this conversion…`);
}

// --- Render MD → HTML body ---
const md = new MarkdownIt({
  html: false,        // Allow HTML in MD? No — sanitize-first
  linkify: true,      // Auto-link bare URLs
  typographer: true,  // Smart quotes + dashes
  breaks: false,
});
md.use(markdownItAnchor, {
  level: [1, 2, 3, 4],
  permalink: markdownItAnchor.permalink.headerLink(),
});
const bodyHtml = md.render(mdBody);

// --- Render brand CSS via template-forge ---
function renderBrandCss() {
  if (!FORGE_BIN) return "";
  try {
    const out = execSync(
      `${FORGE_BIN} render --brand "${BRAND}" --template vite-shell-css --engine minijinja --library "${resolve(REPO_ROOT, "assets/library")}" --templates-base "${resolve(REPO_ROOT, "tools/template-forge-rs/templates")}"`,
      { stdio: ["ignore", "pipe", "pipe"] },
    ).toString();
    return out;
  } catch (e) {
    console.warn(`[convert-md-to-htmx] template-forge render failed: ${e.message}`);
    return "";
  }
}
const brandCss = renderBrandCss();

// --- Wrap in semantic HTML per document type ---
function wrap(documentType, title, body, css) {
  const documentTypeWrap = {
    article: `
  <article style="max-width: 70ch; margin: 0 auto; padding: 4rem 6vw;">
    <header>
      <h1>${escapeHtml(title)}</h1>
    </header>
    <main>
      ${body}
    </main>
    <footer style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--color-border); color: var(--color-muted); font-family: var(--font-mono); font-size: 0.85rem;">
      Document type: ${escapeHtml(documentType)}
    </footer>
  </article>`,
    brief: `
  <article style="max-width: 70ch; margin: 0 auto; padding: 4rem 6vw;">
    <header>
      <p style="color: var(--color-muted); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8rem;">Brief</p>
      <h1>${escapeHtml(title)}</h1>
    </header>
    <main>
      ${body}
    </main>
  </article>`,
    spec: `
  <article style="max-width: 80ch; margin: 0 auto; padding: 4rem 6vw;">
    <header>
      <p style="color: var(--color-muted); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8rem;">Specification</p>
      <h1>${escapeHtml(title)}</h1>
    </header>
    <main>
      ${body}
    </main>
  </article>`,
    none: body,
  };
  const wrapped = documentTypeWrap[documentType] ?? documentTypeWrap.article;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
${css}

/* Document-type styling overlay */
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-body);
  line-height: 1.6;
}
article h1, article h2, article h3, article h4 {
  font-family: var(--font-display);
  line-height: 1.2;
}
article h1 { color: var(--color-ember); font-size: clamp(2rem, 4vw, 3rem); margin-bottom: 1rem; }
article h2 { font-size: clamp(1.4rem, 2vw, 1.8rem); margin-top: 2.5rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.3rem; }
article h3 { font-size: 1.2rem; margin-top: 2rem; }
article a { color: var(--color-ember); }
article a:hover { text-decoration: underline; }
article code { font-family: var(--font-mono); background: var(--color-surface); padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.9em; }
article pre { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 1rem; overflow-x: auto; }
article pre code { background: none; padding: 0; }
article table { border-collapse: collapse; margin: 1.5rem 0; }
article th, article td { border: 1px solid var(--color-border); padding: 0.5rem 1rem; text-align: left; }
article th { background: var(--color-surface); font-family: var(--font-ui); }
article ul, article ol { padding-left: 1.5rem; }
article li { margin: 0.3rem 0; }
article blockquote { border-left: 3px solid var(--color-ember); padding-left: 1rem; color: var(--color-muted); margin: 1.5rem 0; }
.header-anchor { color: var(--color-muted); text-decoration: none; }
.header-anchor:hover { color: var(--color-ember); }
  </style>
</head>
<body>${wrapped}</body>
</html>
`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const html = wrap(DOC_TYPE === "moodboard" ? "article" : DOC_TYPE, TITLE, bodyHtml, brandCss);
writeFileSync(OUTPUT, html);
console.log(`Wrote ${OUTPUT} (${html.length} bytes; document-type=${DOC_TYPE}; title=${JSON.stringify(TITLE)})`);
