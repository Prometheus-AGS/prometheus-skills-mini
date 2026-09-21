#!/usr/bin/env node
// design-svg-logo.mjs
//
// Generate SVG logo variants (icon, wordmark, lockup) + PNG export set.
// Mode-switching: --mode llm (LLM-suggested SVG with strict validation, fallback
// to placeholder) or --mode placeholder (deterministic Minijinja template).
//
// Usage:
//   node scripts/design-svg-logo.mjs \
//     --brand-name "KnowMe" \
//     --brief "identity layer for human-AI collaboration" \
//     [--style "geometric minimal"] \
//     [--primary-color "#E04E28"] \
//     --output-dir /tmp/logo \
//     [--mode llm|placeholder] (default: llm)
//     [--variants icon,wordmark,lockup] (default: all)
//     [--png-sizes 16,32,64,128,256,512] (default)

import { mkdirSync, writeFileSync, copyFileSync, mkdtempSync, writeFileSync as fsWriteFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";
import { isValidSvg } from "./lib/svg-validate.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const FORGE_BIN = resolve(REPO_ROOT, "tools/template-forge-rs/target/release/template-forge");
const TEMPLATES = resolve(REPO_ROOT, "tools/template-forge-rs/templates");

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
for (const k of ["brand-name", "brief", "output-dir"]) {
  if (!argv[k]) { console.error(`missing --${k}`); process.exit(2); }
}
const BRAND_NAME = argv["brand-name"];
const BRIEF = argv["brief"];
const STYLE = argv["style"] ?? "modern";
const PRIMARY_COLOR = argv["primary-color"] ?? "#E04E28";
const OUTPUT_DIR = argv["output-dir"];
const MODE = argv["mode"] ?? "llm";
const VARIANTS = (argv["variants"] ?? "icon,wordmark,lockup").split(",").map((s) => s.trim());
const PNG_SIZES = (argv["png-sizes"] ?? "16,32,64,128,256,512").split(",").map((s) => parseInt(s, 10));

const KEBAB = BRAND_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const INITIAL = (BRAND_NAME.match(/[A-Za-z]/)?.[0] ?? "?").toUpperCase();

mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(join(OUTPUT_DIR, "png"), { recursive: true });

// --- Placeholder SVG generators ---
function placeholderIcon() {
  // Render via template-forge logo-icon.html with a synthetic brand TOML
  return renderViaForge();
}

function placeholderWordmark() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" width="1200" height="300">
  <text x="50%" y="50%" font-family="system-ui, -apple-system, sans-serif" font-size="200" font-weight="700" fill="${PRIMARY_COLOR}" text-anchor="middle" dominant-baseline="central">${escapeXml(BRAND_NAME)}</text>
</svg>`;
}

function placeholderLockup() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 400" width="1600" height="400">
  <rect x="50" y="50" width="300" height="300" fill="${PRIMARY_COLOR}" rx="40"/>
  <text x="200" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="180" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${INITIAL}</text>
  <text x="420" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="160" font-weight="700" fill="${PRIMARY_COLOR}" dominant-baseline="central">${escapeXml(BRAND_NAME)}</text>
</svg>`;
}

function renderViaForge() {
  // Synthesize a minimal brand TOML so template-forge can render logo-icon.html
  const tmpDir = mkdtempSync(join(tmpdir(), "logo-"));
  const lib = join(tmpDir, "library");
  mkdirSync(join(lib, "brands"), { recursive: true });
  const toml = `[meta]
name = "${escapeToml(BRAND_NAME)}"

[colors.light]
bg = "#FFFFFF"
surface = "#F5F5F5"
ink = "#111111"
ember = "${PRIMARY_COLOR}"

[colors.dark]
bg = "#0B0F14"
surface = "#0F1620"
ink = "#E5EEF8"
ember = "${PRIMARY_COLOR}"

[typography]
display = "system-ui"
ui = "system-ui"
body = "system-ui"
`;
  fsWriteFileSync(join(lib, "brands", "synthetic.toml"), toml);
  return execSync(
    `${FORGE_BIN} render --brand synthetic --template logo-icon --engine minijinja --library "${lib}" --templates-base "${TEMPLATES}"`,
    { stdio: ["ignore", "pipe", "pipe"] },
  ).toString();
}

function escapeXml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function escapeToml(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }

// --- LLM-suggested SVG ---
async function llmSvg(variant) {
  let chat, HostHarnessRoutingError;
  try {
    const mod = await import("./lib/openai-client.mjs");
    chat = mod.chat;
    HostHarnessRoutingError = mod.HostHarnessRoutingError;
  } catch (e) {
    console.warn(`[design-svg-logo] could not load openai-client: ${e.message}`);
    return null;
  }

  const variantPrompts = {
    icon:     `a square icon (viewBox 0 0 512 512)`,
    wordmark: `a wide wordmark spelling "${BRAND_NAME}" (viewBox 0 0 1200 300)`,
    lockup:   `a lockup combining an icon mark and the wordmark "${BRAND_NAME}" (viewBox 0 0 1600 400)`,
  };
  const prompt = `Produce a self-contained SVG ${variantPrompts[variant]} for brand "${BRAND_NAME}".

Brand brief: ${BRIEF}
Style keywords: ${STYLE}
Primary color: ${PRIMARY_COLOR}

Requirements:
- Output ONLY the SVG markup, no prose, no markdown fence
- Must be valid XML / SVG
- Must include viewBox + width + height
- Must NOT contain <script> tags
- Must NOT contain on* event handlers (onclick, onload, etc.)
- Must NOT use javascript: URLs
- Use brand primary color ${PRIMARY_COLOR} prominently
- For text in SVG, use system-ui or sans-serif fallbacks
- Prefer paths, rects, circles, ellipses, lines, polygons over external assets
- Keep it geometric and clean`;

  try {
    const reply = await chat(
      "refiner-iterate",
      [{ role: "user", content: prompt }],
      { artifactName: `logo-${KEBAB}`, maxTokens: 1000, temperature: 0.6 },
    );
    let cleaned = reply.trim();
    cleaned = cleaned.replace(/^```(?:xml|svg|html)?\s*/i, "").replace(/\s*```$/i, "");
    const { valid, reasons } = isValidSvg(cleaned);
    if (!valid) {
      console.warn(`[design-svg-logo] LLM ${variant} invalid: ${reasons.join(", ")}; falling back to placeholder`);
      return null;
    }
    return cleaned;
  } catch (e) {
    if (e?.name === "HostHarnessRoutingError") {
      console.warn(`[design-svg-logo] ${variant}: proxy unavailable; using placeholder`);
    } else {
      console.warn(`[design-svg-logo] ${variant} call failed: ${e.message}; using placeholder`);
    }
    return null;
  }
}

// --- Generate each variant ---
const have = (cmd) => spawnSync("which", [cmd], { stdio: "ignore" }).status === 0;
const haveRsvg = have("rsvg-convert");

for (const variant of VARIANTS) {
  let svg;
  if (MODE === "llm") {
    svg = await llmSvg(variant);
  }
  if (!svg) {
    if (variant === "icon") svg = placeholderIcon();
    else if (variant === "wordmark") svg = placeholderWordmark();
    else if (variant === "lockup") svg = placeholderLockup();
  }
  const svgPath = join(OUTPUT_DIR, `${KEBAB}-${variant}.svg`);
  writeFileSync(svgPath, svg);
  console.log(`Wrote ${svgPath} (${svg.length} bytes; mode=${MODE === "llm" && svg ? "llm-or-fallback" : "placeholder"})`);

  // PNG exports (icon at all sizes; wordmark/lockup at a couple representative sizes)
  const sizesForVariant = variant === "icon" ? PNG_SIZES : PNG_SIZES.filter((s) => s >= 128);
  for (const size of sizesForVariant) {
    const pngPath = join(OUTPUT_DIR, "png", `${KEBAB}-${variant}-${size}.png`);
    if (haveRsvg) {
      try {
        execSync(`rsvg-convert -w "${size}" "${svgPath}" -o "${pngPath}"`, { stdio: ["ignore", "pipe", "pipe"] });
      } catch {
        copyFileSync(svgPath, pngPath);
      }
    } else {
      copyFileSync(svgPath, pngPath);
    }
  }
}

if (!haveRsvg) {
  console.warn(`[design-svg-logo] rsvg-convert not on PATH; PNG files are SVG copies. Install librsvg for real rasterization.`);
}

console.log(`\nLogo set written to ${OUTPUT_DIR}/`);
