#!/usr/bin/env node
// generate-skills-catalog.mjs — build-time skills catalog generator.
//
// Read the shipping inventory and publish its index, category bookmarks and skill instructions.

import { readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { collectDistributionSkills, readSkillSystem } from '../../lib/distribution/skill-system.mjs';

const siteDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(siteDir);
const skillsRoot = join(repoRoot, 'skills');
const outDir = join(siteDir, 'docs-catalog');
const uiCatalog = JSON.parse(readFileSync(join(skillsRoot, 'prometheus-ui-ux/references/catalog.lock.json'), 'utf8'));
const uiEntries = new Map(uiCatalog.skills.map((entry) => [entry.id, entry]));

// Skill name -> category, for this repo's flat layout. Anything not listed falls into "other".
const CATEGORY_OF = new Map(
  Object.entries({
    'agent-team-creator': 'Agent Teams',
    'agent-team-manage': 'Agent Teams',
    'agent-team-models': 'Agent Teams',
    'agent-team-handoff': 'Agent Teams',
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
  if (uiEntries.has(name)) return 'UI & UX';
  if (name.startsWith('kbd-')) return 'KBD Process';
  if (name.startsWith('rust-')) return 'Context & Platform';
  return CATEGORY_OF.get(name) || 'Other';
}

const contract = readSkillSystem(repoRoot);
const groups = new Map();
const repoUrl = 'https://github.com/Prometheus-AGS/prometheus-skills-mini';
const skills = collectDistributionSkills(repoRoot, contract).map(({name, source}) => {
  const file = join(source, 'SKILL.md');
  const content = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(content);
  if (!match) throw new Error('Missing skill frontmatter: ' + file);
  const metadata = YAML.parse(match[1]);
  const body = content.slice(match[0].length).trim();
  if (!metadata.description?.trim() || !body) throw new Error('Incomplete skill: ' + file);
  const skill = {name, category: categoryFor(name), description: metadata.description.trim().replace(/\s+/g, ' '), body,
    sourceUrl: repoUrl + '/blob/main/' + relative(repoRoot, file).split(sep).map(encodeURIComponent).join('/'),
    version: metadata.version || metadata.metadata?.version, tags: metadata.metadata?.tags,
    invocation: uiEntries.get(name)?.invocation};
  if (!groups.has(skill.category)) groups.set(skill.category, []);
  groups.get(skill.category).push(skill);
  return skill;
});

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const front = (metadata) => '---\n' + YAML.stringify(metadata) + '---\n\n';
const categoryLink = cat => '[' + cat + '](./' + slug(cat) + '.md)';
const skillLink = skill => '[`' + skill.name + '`](./skills/' + skill.name + '.md)';
const text = s => s.replace(/[<>{}]/g, c => ({'<':'&lt;', '>':'&gt;', '{':'&#123;', '}':'&#125;'})[c]);

rmSync(outDir, {recursive: true, force: true});
mkdirSync(join(outDir, 'skills'), {recursive: true});
const categories = [...groups.keys()].sort();
const index = [front({title: 'Skills Catalog', sidebar_label: 'Overview'}), '# Skills Catalog', '',
  'Mini ' + contract.releaseVersion + ' includes **' + skills.length + ' skills** in ' + categories.length + ' categories.', '',
  '| Category | Skills |', '| --- | --- |'];
for (const cat of categories) {
  const members = groups.get(cat);
  index.push('| ' + categoryLink(cat) + ' | ' + members.length + ' |');
  const page = [front({title: cat}), '# ' + cat, '', '[All skills](./index.md)', ''];
  for (const skill of members) {
    // Keep category anchors stable for bookmarks from previous releases.
    page.push('## ' + skill.name, '', text(skill.description), '', skillLink(skill) + (skill.invocation === 'user-only' ? ' · User-only invocation' : '') + ' · [Source](' + skill.sourceUrl + ')', '');
  }
  writeFileSync(join(outDir, slug(cat) + '.md'), page.join('\n'));
}
index.push('', '## All skills', '');
for (const skill of skills) {
  index.push('- ' + skillLink(skill));
  const details = [front({title: skill.name, description: skill.description, mdx: {format:'md'}}),
    '# ' + skill.name, '', text(skill.description), '',
    '[Source instructions](' + skill.sourceUrl + ')', ''];
  const labels = [];
  if (skill.version) labels.push('Skill version ' + skill.version);
  if (skill.invocation === 'user-only') labels.push('User-only invocation');
  if (skill.tags) labels.push((Array.isArray(skill.tags) ? skill.tags : [skill.tags]).join(', '));
  if (labels.length) details.push(labels.join(' · '), '');
  details.push(skill.body, '');
  writeFileSync(join(outDir, 'skills', skill.name + '.md'), details.join('\n'));
}
writeFileSync(join(outDir, 'index.md'), index.join('\n') + '\n');
console.log('[skills-catalog] generated ' + skills.length + ' skill pages in ' + categories.length + ' categories.');
