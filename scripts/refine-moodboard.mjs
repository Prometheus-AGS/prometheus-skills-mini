#!/usr/bin/env node
// refine-moodboard.mjs
//
// LLM-primary moodboard synthesizer. First script in this repo where the LLM
// is the engine, not a sidecar.
//
// Pipeline:
//   --mode llm (default when proxy reachable):
//     1. Construct structured prompt asking for { palette, typography, motifs, tone } JSON
//     2. Call chat("refiner-evaluate", ...) — medium tier
//     3. Validate JSON shape; fall back to placeholder if invalid
//     4. Persist as a synthetic brand TOML; render moodboard.html via template-forge
//
//   --mode placeholder (or LLM fallback):
//     1. If --brand supplied: use that brand's palette + typography directly
//     2. Else: neutral gray placeholder
//     3. Render moodboard.html
//
// Usage:
//   node scripts/refine-moodboard.mjs \
//     --use-case "developer tool dashboard" \
//     --audience "backend engineers" \
//     --aesthetic "minimal, mono, ember" \
//     [--brand knowme] \
//     --output /tmp/mb.html \
//     [--mode llm|placeholder] (default: llm)

import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const toml = require("@iarna/toml");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const FORGE_BIN = resolve(REPO_ROOT, "tools/template-forge-rs/target/release/template-forge");
const TEMPLATES = resolve(REPO_ROOT, "tools/template-forge-rs/templates");
const BRANDS = resolve(REPO_ROOT, "assets/library/brands");

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
for (const k of ["use-case", "audience", "aesthetic", "output"]) {
  if (!argv[k]) { console.error(`missing --${k}`); process.exit(2); }
}
const USE_CASE = argv["use-case"];
const AUDIENCE = argv["audience"];
const AESTHETIC = argv["aesthetic"];
const BRAND = argv["brand"] ?? null;
const OUTPUT = argv["output"];
const MODE = argv["mode"] ?? "llm";

// --- Helpers ---
function toTomlString(spec) {
  // Minimal TOML emitter for the brand-data shape we need.
  // (Avoids adding a TOML *serializer* dep; we already have @iarna/toml as a parser
  //  and it can stringify, but a small hand-roll keeps this self-contained.)
  const tomlString = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const palette = (p) => `bg = ${tomlString(p.bg)}
surface = ${tomlString(p.surface)}
ink = ${tomlString(p.ink)}
muted = ${tomlString(p.muted)}
ember = ${tomlString(p.ember)}
ember_alt = ${tomlString(p.ember_alt ?? p.ember)}
info = ${tomlString(p.info ?? "#60A5FA")}
border = ${tomlString(p.border ?? "#1E2A3A")}`;
  // TOML: a bare `key = value` after a table header belongs to THAT table, so
  // every top-level scalar must be emitted before the first `[table]`. `tone`
  // used to be appended at the end, where it was silently absorbed into the
  // last `[[motifs]]` entry (or `[typography]`) and never reached
  // `BrandData.tone`.
  let out = "";
  if (Array.isArray(spec.tone) && spec.tone.length > 0) {
    out += `tone = [${spec.tone.map(tomlString).join(", ")}]\n\n`;
  }
  out += `[meta]
name = ${tomlString(spec.meta.name)}
tagline = ${tomlString(spec.meta.tagline)}
description = ${tomlString(spec.meta.description)}

[colors.light]
${palette(spec.palette.light)}

[colors.dark]
${palette(spec.palette.dark)}

[typography]
display = ${tomlString(spec.typography.display)}
ui = ${tomlString(spec.typography.ui)}
body = ${tomlString(spec.typography.body)}
mono = ${tomlString(spec.typography.mono)}
`;
  if (Array.isArray(spec.motifs) && spec.motifs.length > 0) {
    for (const m of spec.motifs) {
      out += `\n[[motifs]]\ntitle = ${tomlString(m.title)}\ndescription = ${tomlString(m.description)}\n`;
    }
  }
  return out;
}

function validateSpec(s) {
  // Hand-rolled shape validator
  const reasons = [];
  if (!s || typeof s !== "object") { reasons.push("not_an_object"); return reasons; }
  if (!s.meta?.name) reasons.push("missing_meta_name");
  for (const variant of ["light", "dark"]) {
    const p = s.palette?.[variant];
    if (!p) { reasons.push(`missing_palette_${variant}`); continue; }
    for (const k of ["bg", "surface", "ink", "muted", "ember"]) {
      if (typeof p[k] !== "string" || !/^#[0-9a-fA-F]{3,8}$/.test(p[k])) {
        reasons.push(`bad_palette_${variant}_${k}`);
      }
    }
  }
  if (!s.typography?.display || !s.typography?.ui || !s.typography?.body) {
    reasons.push("missing_typography");
  }
  // motifs/tone are optional — but if present, must be the right shape.
  if (s.motifs !== undefined) {
    if (!Array.isArray(s.motifs)) {
      reasons.push("motifs_not_array");
    } else {
      s.motifs.forEach((m, i) => {
        if (!m || typeof m !== "object") reasons.push(`motif_${i}_not_object`);
        else {
          if (typeof m.title !== "string" || !m.title.trim()) reasons.push(`motif_${i}_bad_title`);
          if (typeof m.description !== "string" || !m.description.trim()) reasons.push(`motif_${i}_bad_description`);
        }
      });
    }
  }
  if (s.tone !== undefined) {
    if (!Array.isArray(s.tone)) {
      reasons.push("tone_not_array");
    } else {
      s.tone.forEach((t, i) => {
        if (typeof t !== "string" || !t.trim()) reasons.push(`tone_${i}_not_string`);
      });
    }
  }
  return reasons;
}

function placeholderSpec() {
  const base = BRAND ? loadBrandAsSpec(BRAND) : null;
  if (base) return base;
  return {
    meta: { name: "Moodboard", tagline: USE_CASE, description: `Audience: ${AUDIENCE}. Aesthetic: ${AESTHETIC}.` },
    palette: {
      light: { bg: "#F8FAFC", surface: "#FFFFFF", ink: "#1A1A1A", muted: "#6B7280", ember: "#666666", ember_alt: "#888888", info: "#3B82F6", border: "#E5E7EB" },
      dark:  { bg: "#1A1A1A", surface: "#2A2A2A", ink: "#F5F5F5", muted: "#9CA3AF", ember: "#888888", ember_alt: "#AAAAAA", info: "#60A5FA", border: "#3A3A3A" },
    },
    typography: { display: "system-ui", ui: "system-ui", body: "system-ui", mono: "ui-monospace" },
  };
}

function loadBrandAsSpec(brand) {
  try {
    const d = toml.parse(readFileSync(`${BRANDS}/${brand}.toml`, "utf8"));
    return {
      meta: {
        name: d.meta?.name ?? brand,
        tagline: d.meta?.tagline ?? USE_CASE,
        description: d.meta?.description ?? `Audience: ${AUDIENCE}. Aesthetic: ${AESTHETIC}.`,
      },
      palette: { light: d.colors?.light ?? {}, dark: d.colors?.dark ?? {} },
      typography: {
        display: d.typography?.display ?? "system-ui",
        ui: d.typography?.ui ?? "system-ui",
        body: d.typography?.body ?? "system-ui",
        mono: d.typography?.mono ?? "ui-monospace",
      },
      ...(Array.isArray(d.motifs) ? { motifs: d.motifs } : {}),
      ...(Array.isArray(d.tone) ? { tone: d.tone } : {}),
    };
  } catch {
    return null;
  }
}

async function llmSpec() {
  let chat, HostHarnessRoutingError;
  try {
    const mod = await import("./lib/openai-client.mjs");
    chat = mod.chat;
    HostHarnessRoutingError = mod.HostHarnessRoutingError;
  } catch (e) {
    console.warn(`[refine-moodboard] could not load openai-client: ${e.message}`);
    return null;
  }

  const prompt = `You are a brand designer producing a moodboard for a new project.
Return ONLY valid JSON, no prose, no markdown fence, exactly matching this shape:

{
  "meta": {
    "name": "<short brand-style name based on the use case>",
    "tagline": "<one short sentence>",
    "description": "<one to two sentences>"
  },
  "palette": {
    "light": { "bg": "#hex", "surface": "#hex", "ink": "#hex", "muted": "#hex", "ember": "#hex", "ember_alt": "#hex", "info": "#hex", "border": "#hex" },
    "dark":  { "bg": "#hex", "surface": "#hex", "ink": "#hex", "muted": "#hex", "ember": "#hex", "ember_alt": "#hex", "info": "#hex", "border": "#hex" }
  },
  "typography": {
    "display": "<google font name>",
    "ui": "<google font name>",
    "body": "<google font name>",
    "mono": "<google font name>"
  },
  "motifs": [
    { "title": "<2-4 word phrase>", "description": "<one sentence>" }
  ],
  "tone": ["<adjective>", "<adjective>", "<adjective>"]
}

Constraints:
- All hex values must be exactly "#" followed by 6 hex digits.
- Light bg should be very light; dark bg should be very dark.
- Ink must contrast strongly against bg in each variant (WCAG AA+).
- Ember is the brand accent color; reserve for emphasis.
- Typography choices should be real Google Font names.
- Provide 4-6 motifs describing visual idioms or texture references.
- Provide 4-6 tone descriptors (single-word adjectives preferred).

Use case: ${USE_CASE}
Audience: ${AUDIENCE}
Aesthetic: ${AESTHETIC}
${BRAND ? `Anchor to existing brand: ${BRAND}` : ""}`;

  try {
    const reply = await chat(
      "refiner-evaluate",
      [{ role: "user", content: prompt }],
      { artifactName: "moodboard", maxTokens: 800, temperature: 0.7 },
    );
    // Strip markdown fences if present
    let cleaned = reply.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    // Reject prompt-injection markers
    if (/SYSTEM:|IGNORE PREVIOUS|disregard prior/i.test(cleaned)) {
      console.warn(`[refine-moodboard] response contains prompt-injection markers; rejecting`);
      return null;
    }
    const parsed = JSON.parse(cleaned);
    const reasons = validateSpec(parsed);
    if (reasons.length > 0) {
      console.warn(`[refine-moodboard] LLM spec validation failed: ${reasons.join(", ")}; falling back`);
      return null;
    }
    return parsed;
  } catch (e) {
    if (e?.name === "HostHarnessRoutingError") {
      console.warn(`[refine-moodboard] host_harness routing — proxy unavailable; falling back to placeholder`);
    } else {
      console.warn(`[refine-moodboard] LLM call failed: ${e.message}; falling back to placeholder`);
    }
    return null;
  }
}

// --- Resolve spec ---
let spec;
if (MODE === "llm") {
  spec = await llmSpec();
  if (!spec) spec = placeholderSpec();
} else {
  spec = placeholderSpec();
}

// --- Persist as synthetic brand TOML, render via template-forge ---
const tmpDir = mkdtempSync(join(tmpdir(), "moodboard-"));
const tmpLib = join(tmpDir, "library");
mkdirSync(join(tmpLib, "brands"), { recursive: true });
const tmpBrand = "synthetic";
writeFileSync(join(tmpLib, "brands", `${tmpBrand}.toml`), toTomlString(spec));

try {
  execSync(
    `${FORGE_BIN} render --brand "${tmpBrand}" --template moodboard --engine minijinja --library "${tmpLib}" --templates-base "${TEMPLATES}" --output "${OUTPUT}"`,
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  // Post-render: append a WCAG contrast report before </body>.
  // Simpler than serializing the report into TOML + the template; avoids
  // coupling the renderer to the validator.
  try {
    const { report } = await import("./lib/wcag-contrast.mjs");
    const pairs = [];
    for (const variant of ["light", "dark"]) {
      const p = spec.palette?.[variant];
      if (!p) continue;
      pairs.push({ fg: p.ink, bg: p.bg, label: `ink on bg (${variant})` });
      pairs.push({ fg: p.ember, bg: p.bg, label: `ember on bg (${variant})` });
      if (p.muted) pairs.push({ fg: p.muted, bg: p.bg, label: `muted on bg (${variant})` });
      pairs.push({ fg: p.ink, bg: p.surface, label: `ink on surface (${variant})` });
    }
    const rows = report(pairs);
    const colorFor = (lvl) => lvl === "FAIL" ? "#FF4D4D" : lvl === "A" ? "#FFB020" : "#5BD370";
    const reportHtml = `
  <section style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--color-border);">
    <h2>WCAG Contrast Report</h2>
    <p style="color: var(--color-muted);">Pair ratios computed against light + dark palette swatches. AA = 4.5+, AAA = 7.0+.</p>
    <table style="width:100%;border-collapse:collapse;font-family:var(--font-mono);font-size:0.9rem;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:0.5rem 0.75rem;">Pair</th>
          <th style="padding:0.5rem 0.75rem;">Ratio</th>
          <th style="padding:0.5rem 0.75rem;">Level</th>
        </tr>
      </thead>
      <tbody>
${rows.map(r => `        <tr style="border-bottom:1px solid var(--color-border);">
          <td style="padding:0.5rem 0.75rem;">${r.label}</td>
          <td style="padding:0.5rem 0.75rem;">${r.ratio}</td>
          <td style="padding:0.5rem 0.75rem;color:${colorFor(r.level)};font-weight:600;">${r.level}</td>
        </tr>`).join("\n")}
      </tbody>
    </table>
  </section>
`;
    const rendered = readFileSync(OUTPUT, "utf8");
    const patched = rendered.includes("</body>")
      ? rendered.replace("</body>", `${reportHtml}</body>`)
      : `${rendered}\n${reportHtml}`;
    writeFileSync(OUTPUT, patched);
  } catch (e) {
    console.warn(`[refine-moodboard] WCAG post-render skipped: ${e.message}`);
  }

  console.log(`Wrote ${OUTPUT} (mode=${MODE === "llm" && spec ? "llm" : "placeholder"})`);
  console.log(`  brand-name: ${JSON.stringify(spec.meta.name)}`);
  console.log(`  ember:      ${spec.palette.dark.ember}`);
} catch (e) {
  console.error(`[refine-moodboard] template-forge render failed: ${e.message}`);
  process.exit(1);
}
