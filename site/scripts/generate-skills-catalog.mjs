#!/usr/bin/env node
// generate-skills-catalog.mjs — build-time skills catalog generator.
//
// Ported mechanism from prometheus-skill-pack/site/scripts/generate-skills-catalog.mjs, adapted
// for this repo's FLAT skills/<name>/SKILL.md layout — there is no category subdirectory level
// here, unlike the full pack's skills/<category>/<name>/SKILL.md. Skills are bucketed into
// logical groups inferred from their names/purpose (see CATEGORY_OF below) so the catalog reads
// as organized reference material instead of one flat 50-row list.
//
// Walks ../skills/*/SKILL.md, parses YAML frontmatter, and emits one Markdown page per category
// plus an index into site/docs-catalog/ (generated, gitignored). Wired via `build:deploy` and
// `generate:catalog`. Idempotent: output depends only on the SKILL.md inputs.

import { readdirSync, readFileSync, lstatSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const siteDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(siteDir);
const skillsRoot = join(repoRoot, 'skills');
const outDir = join(siteDir, 'docs-catalog');

// Skill name -> category, for this repo's flat layout. Anything not listed falls into "other".
const CATEGORY_OF = new Map(
  Object.entries({
    'kbd-process-orchestrator': 'KBD Process',
    'kbd-init': 'KBD Process',
    'kbd-assess': 'KBD Process',
    'kbd-analyze': 'KBD Process',
    'kbd-spec': 'KBD Process',
    'kbd-plan': 'KBD Process',
    'kbd-execute': 'KBD Process',
    'kbd-reflect': 'KBD Process',
    'kbd-apply': 'KBD Process',
    'kbd-status': 'KBD Process',
    'kbd-audit': 'KBD Process',
    'kbd-pause': 'KBD Process',
    'kbd-resume': 'KBD Process',
    'kbd-cancel': 'KBD Process',
    'kbd-new-phase': 'KBD Process',
    'kbd-next-phase': 'KBD Process',
    'kbd-new-child': 'KBD Process',
    'kbd-next-child': 'KBD Process',
    'kbd-child-exit': 'KBD Process',
    'kbd-bottleneck-detector': 'KBD Process',
    'kbd-memory-recall': 'KBD Process',
    'kbd-inject-agent-rules': 'KBD Process',
    'kbd-evolve': 'KBD Process',
    'kbd-goal-check': 'KBD Process',
    'adversarial-review': 'Review & Ideation',
    'ideation-mindmap': 'Review & Ideation',
    'karpathy-progress-memory': 'Review & Ideation',
    'artifact-refiner': 'Artifact Refinement',
    'refine-a2ui': 'Artifact Refinement',
    'refine-content': 'Artifact Refinement',
    'refine-image': 'Artifact Refinement',
    'refine-logo': 'Artifact Refinement',
    'refine-mcp-ui': 'Artifact Refinement',
    'refine-moodboard': 'Artifact Refinement',
    'refine-status': 'Artifact Refinement',
    'refine-ui': 'Artifact Refinement',
    'refine-validate': 'Artifact Refinement',
    'rebrand-artifact': 'Artifact Refinement',
    'design-svg-logo': 'Artifact Refinement',
    'scaffold-flutter-a2ui': 'Scaffolding',
    'scaffold-react-vite': 'Scaffolding',
    'scaffold-react-vite-a2ui': 'Scaffolding',
    'scaffold-react-vite-agui': 'Scaffolding',
    'scaffold-react-vite-tauri': 'Scaffolding',
    'convert-htmx-pdf': 'Conversion',
    'convert-htmx-react': 'Conversion',
    'convert-md-to-htmx': 'Conversion',
    'prometheus-context-bootstrap': 'Context & Platform',
    'prometheus-rust-workspace': 'Context & Platform',
    'doctor': 'Context & Platform',
  }),
);

function categoryFor(name) {
  return CATEGORY_OF.get(name) || 'Other';
}

/** Recursively find SKILL.md files under skillsRoot, one level deep per skill directory. */
function findSkillFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const p = join(dir, entry);
    let st;
    try {
      st = lstatSync(p); // never follow symlinks
    } catch {
      console.warn(`[skills-catalog] WARN: cannot stat ${p} — skipped`);
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      const skillFile = join(p, 'SKILL.md');
      try {
        if (lstatSync(skillFile).isFile()) out.push(skillFile);
      } catch {
        // not a skill directory (e.g. skills/AGENTS.md lives at this level too) — skip
      }
    }
  }
  return out;
}

/** Parse frontmatter; returns null when absent/invalid. */
function parseFrontmatter(file) {
  const text = readFileSync(file, 'utf8');
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    console.warn(`[skills-catalog] WARN: no frontmatter in ${file} — degraded entry`);
    return null;
  }
  try {
    return YAML.parse(m[1]);
  } catch {
    console.warn(`[skills-catalog] WARN: unparseable frontmatter in ${file} — degraded entry`);
    return null;
  }
}

const files = findSkillFiles(skillsRoot).sort();
const byCategory = new Map();
let count = 0;

for (const file of files) {
  const fm = parseFrontmatter(file);
  const rel = relative(skillsRoot, file); // e.g. kbd-analyze/SKILL.md
  const dirName = rel.split('/')[0];
  const name = (fm && fm.name) || dirName;
  const description = ((fm && fm.description) || '').toString().trim().replace(/\s+/g, ' ');
  const tags = fm && fm.metadata && Array.isArray(fm.metadata.tags) ? fm.metadata.tags : [];
  const version = (fm && (fm.version || (fm.metadata && fm.metadata.version))) || '';
  const category = categoryFor(dirName);
  if (!byCategory.has(category)) byCategory.set(category, []);
  byCategory.get(category).push({ name, description, tags, version, rel });
  count += 1;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const esc = (s) =>
  s.replace(/[<>{}]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '{': '&#123;', '}': '&#125;' })[c]);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const categories = [...byCategory.keys()].sort();
let indexRows = '';
for (const cat of categories) {
  const skills = byCategory.get(cat);
  const catSlug = slug(cat);
  indexRows += `| [${cat}](./${catSlug}) | ${skills.length} |\n`;

  let body = `---\ntitle: ${cat}\nsidebar_label: ${cat}\n---\n\n# ${cat}\n\n`;
  body += `${skills.length} skill${skills.length === 1 ? '' : 's'}. Source of truth: [\`skills/\`](https://github.com/Prometheus-AGS/prometheus-skills-mini/tree/main/skills).\n\n`;
  for (const s of skills.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    body += `## ${esc(s.name)}\n\n`;
    if (s.description) body += `${esc(s.description)}\n\n`;
    const meta = [];
    if (s.version) meta.push(`v${s.version}`);
    if (s.tags.length) meta.push(s.tags.map((t) => `\`${t}\``).join(' '));
    meta.push(
      `[source](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/skills/${s.rel})`,
    );
    body += `${meta.join(' · ')}\n\n`;
  }
  writeFileSync(join(outDir, `${catSlug}.md`), body);
}

writeFileSync(
  join(outDir, 'index.md'),
  `---\ntitle: Skills Catalog\nsidebar_label: Overview\n---\n\n# Skills Catalog\n\n` +
    `Generated at build time from SKILL.md frontmatter — **${count} skills** across ${categories.length} categories.\n\n` +
    `| Category | Skills |\n|---|---|\n${indexRows}`,
);

console.log(
  `[skills-catalog] generated ${count} skills across ${categories.length} categories -> ${relative(siteDir, outDir)}`,
);
