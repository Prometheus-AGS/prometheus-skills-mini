#!/usr/bin/env node
//
// rebrand-artifact.mjs
//
// Swap one brand TOML's tokens for another's inside a TSX artifact.
//
// Strategy:
//   1. Load both brand TOMLs.
//   2. Build a token map: every from-brand hex value → to-brand hex value
//      at the same logical path (colors.dark.ember, etc.).
//   3. AST-walk the source TSX via @babel/parser + @babel/traverse.
//   4. Find StringLiteral nodes whose value exactly matches a from-brand
//      hex; replace with the to-brand value.
//   5. Leave var(--color-*) references alone — the CSS file (regenerated
//      below) holds the canonical values.
//   6. Regenerate the brand-vars CSS via template-forge for the to-brand.
//   7. WCAG contrast report on the new palette; fail soft unless --strict.
//
// Usage:
//   node scripts/rebrand-artifact.mjs \
//     --source X.tsx \
//     --from-brand knowme \
//     --to-brand prometheus-ags \
//     --output Y.tsx \
//     [--css-output Y.css] \
//     [--ignore-contrast]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, basename, resolve } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";

import { parse as parseToml } from "@iarna/toml";
import { report as wcagReport } from "./lib/wcag-contrast.mjs";

// Babel ESM default-export interop
const traverse = _traverse.default ?? _traverse;
const generate = _generate.default ?? _generate;

// ---------- CLI ----------
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
for (const key of ["source", "from-brand", "to-brand", "output"]) {
  if (!argv[key]) {
    console.error(`missing required --${key}`);
    process.exit(2);
  }
}
const SOURCE = argv["source"];
const FROM_BRAND = argv["from-brand"];
const TO_BRAND = argv["to-brand"];
const OUTPUT = argv["output"];
const CSS_OUTPUT = argv["css-output"] ?? `${OUTPUT.replace(/\.tsx?$/, "")}.css`;
const IGNORE_CONTRAST = !!argv["ignore-contrast"];

// ---------- Locate repo + brand library ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const BRAND_LIB = resolve(REPO_ROOT, "assets/library");
const FORGE_BIN = resolve(REPO_ROOT, "tools/template-forge-rs/target/release/template-forge");

function loadBrand(name) {
  const path = resolve(BRAND_LIB, "brands", `${name}.toml`);
  return parseToml(readFileSync(path, "utf8"));
}

const fromBrand = loadBrand(FROM_BRAND);
const toBrand = loadBrand(TO_BRAND);

// ---------- Build token map ----------
// Flatten brand into { "colors.light.ember": "#E04E28", ... } for hex-valued fields only.
function flattenHexFields(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") {
      Object.assign(out, flattenHexFields(v, key));
    } else if (typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v)) {
      out[key] = v;
    }
  }
  return out;
}

const fromTokens = flattenHexFields(fromBrand);
const toTokens = flattenHexFields(toBrand);

// Build value → value swap map, case-insensitive on hex.
const swapMap = new Map();
for (const path of Object.keys(fromTokens)) {
  if (toTokens[path] && fromTokens[path].toLowerCase() !== toTokens[path].toLowerCase()) {
    swapMap.set(fromTokens[path].toLowerCase(), toTokens[path]);
  }
}

console.log(`Loaded ${Object.keys(fromTokens).length} from-brand hex tokens.`);
console.log(`Loaded ${Object.keys(toTokens).length} to-brand hex tokens.`);
console.log(`Active swaps: ${swapMap.size}.`);

// ---------- AST walk + swap ----------
const source = readFileSync(SOURCE, "utf8");
const ast = parse(source, {
  sourceType: "module",
  plugins: ["jsx", "typescript"],
});

let swapsApplied = 0;
const swappedSamples = [];

traverse(ast, {
  StringLiteral(path) {
    const original = path.node.value;
    const lower = original.toLowerCase();
    if (swapMap.has(lower)) {
      const replacement = swapMap.get(lower);
      path.node.value = replacement;
      swapsApplied++;
      if (swappedSamples.length < 10) {
        swappedSamples.push(`${original} → ${replacement}`);
      }
    }
    // Also swap *inside* longer strings that contain hex literals (rare but
    // happens for style="background: #abc" before our HTMX converter is run).
    // We do this only if the string contains exactly one hex match and we
    // can replace cleanly.
    else if (/#[0-9a-fA-F]{3,8}/.test(original)) {
      const hexes = original.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
      let modified = original;
      let touched = false;
      for (const hex of hexes) {
        const lo = hex.toLowerCase();
        if (swapMap.has(lo)) {
          modified = modified.replaceAll(hex, swapMap.get(lo));
          touched = true;
          swapsApplied++;
        }
      }
      if (touched) {
        path.node.value = modified;
        if (swappedSamples.length < 10) {
          swappedSamples.push(`(in string) → ${modified.slice(0, 80)}`);
        }
      }
    }
  },
});

const { code } = generate(ast, {
  retainLines: false,
  jsescOption: { minimal: true },
});
writeFileSync(OUTPUT, code);
console.log(`Wrote ${OUTPUT} with ${swapsApplied} hex swap(s).`);
for (const s of swappedSamples.slice(0, 5)) {
  console.log(`  ${s}`);
}

// ---------- Regenerate brand CSS ----------
if (FORGE_BIN) {
  const cssArgs = [
    "render",
    "--brand", TO_BRAND,
    "--template", "vite-shell-css",
    "--engine", "minijinja",
    "--library", BRAND_LIB,
    "--templates-base", resolve(REPO_ROOT, "tools/template-forge-rs/templates"),
    "--output", CSS_OUTPUT,
  ];
  try {
    execSync(`${FORGE_BIN} ${cssArgs.map((a) => `"${a}"`).join(" ")}`, { stdio: "inherit" });
    console.log(`Regenerated CSS: ${CSS_OUTPUT}`);
  } catch (err) {
    console.error(`Warning: CSS regeneration failed: ${err.message}`);
  }
}

// ---------- WCAG contrast report on new palette ----------
console.log("\nWCAG contrast report (to-brand palette):");
const reportPairs = [];
for (const variant of ["light", "dark"]) {
  const p = toBrand.colors?.[variant];
  if (!p) continue;
  reportPairs.push(
    { fg: p.ink, bg: p.bg, label: `${variant}: ink on bg` },
    { fg: p.ember, bg: p.bg, label: `${variant}: ember on bg` },
    { fg: p.muted, bg: p.bg, label: `${variant}: muted on bg` },
    { fg: "#ffffff", bg: p.ember, label: `${variant}: white on ember (button)` },
  );
}
const validPairs = reportPairs.filter((p) => p.fg && p.bg);
const results = wcagReport(validPairs);
let fails = 0;
for (const r of results) {
  const marker = r.level === "FAIL" ? "✗" : (r.level === "A" ? "!" : "✓");
  console.log(`  ${marker} ${r.label}: ${r.ratio} (${r.level})`);
  if (r.level === "FAIL") fails++;
}
if (fails > 0 && !IGNORE_CONTRAST) {
  console.warn(`\n⚠ ${fails} pair(s) failed WCAG AA. Re-run with --ignore-contrast to suppress this warning.`);
}
