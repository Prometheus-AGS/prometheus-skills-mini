// Completed-phase integration: real CLI processes, project files and shipped helpers.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ui = path.join(root, 'skills/prometheus-ui-ux/scripts/cli.mjs');
const creator = path.join(root, 'skills/agent-team-creator/scripts/cli.mjs');
const bootstrap = path.join(root, 'scripts/prometheus-context-bootstrap.mjs');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'uiux phase Ω '));
const results = [];
const only = process.env.UIUX_CASE;
function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content)); }
function project(name) { const p = path.join(temporary, name); fs.mkdirSync(p, { recursive: true }); return p; }
function call(script, args, expected = 0) {
  const out = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...process.env, IMPECCABLE_BIN: '' } });
  assert.equal(out.status, expected, out.stderr + out.stdout);
  return out.stdout;
}
function jsonCall(script, command, input, expected = 0) {
  const file = path.join(temporary, 'request.json'); write(file, input);
  const out = call(script, [command, '--input', file], expected);
  return expected === 0 ? JSON.parse(out) : out;
}
function snapshot(directory) {
  const out = {};
  function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name), rel = path.relative(directory, file);
    if (e.isSymbolicLink()) out[rel] = 'link:' + fs.readlinkSync(file);
    else if (e.isDirectory()) walk(file);
    else out[rel] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } }
  walk(directory); return out;
}
function scenario(name, run) {
  if (only && !only.split(',').includes(name)) return;
  try { run(); results.push({ name, status: 'pass' }); }
  catch (error) { results.push({ name, status: 'fail', error: error.stack }); }
}
const team = {
  schemaVersion: 1, id: 'web-team', outcome: 'Implement the product', scope: 'project', harness: 'codex',
  roles: [
    { id: 'designer', description: 'UI designer', prompt: 'Design scoped UI.', skills: [], owns: ['src/ui'], inputs: [], outputs: ['UI'], dependsOn: [] },
    { id: 'reviewer', description: 'UI reviewer', prompt: 'Read-only review.', skills: [], owns: [], inputs: [], outputs: ['evidence'], dependsOn: [] },
    { id: 'backend', description: 'Backend implementer', prompt: 'Implement service.', skills: [], owns: ['server'], inputs: [], outputs: [], dependsOn: [] },
  ],
};

scenario('bootstrap-preservation-idempotence', () => {
  const p = project('fresh project');
  write(path.join(p, 'package.json'), { dependencies: { react: '19' } });
  write(path.join(p, 'CLAUDE.md'), 'Operator prose Ω\r\n');
  write(path.join(p, 'AGENTS.md'), 'Existing instructions\r\n');
  call(bootstrap, ['--path', p]);
  assert.ok(fs.readFileSync(path.join(p, 'CLAUDE.md'), 'utf8').includes('Operator prose Ω\r\n'));
  assert.ok(fs.existsSync(path.join(p, '.agents/skills/ui-ux-pro-max/data/styles.csv')));
  assert.ok(fs.existsSync(path.join(p, '.claude/skills/prometheus-ui-ux/SKILL.md')), 'Claude native preloading needs .claude/skills');
  const before = snapshot(p);
  call(bootstrap, ['--path', p]);
  assert.deepEqual(snapshot(p), before, 'repeat bootstrap changed bytes');
  call(bootstrap, ['--path', p, '--check']);
  call(ui, ['install', '--project', p, '--check']);
  const installed = path.join(p, '.agents/skills/prometheus-ui-ux/scripts/cli.mjs');
  const result = jsonCall(installed, 'route', { project: p, ui: true, operation: 'new', model: 'gpt-6' });
  assert.ok(result.skills.includes('gpt-taste'));
});
scenario('corrupt-markers-preflight', () => {
  for (const broken of ['<!-- uiux-routing:start v1 -->', '<!-- uiux-routing:end -->\n<!-- uiux-routing:start v1 -->', '<!-- uiux-routing:start v2 -->']) {
    const p = project('corrupt ' + results.length + ' ' + broken.length);
    write(path.join(p, 'AGENTS.md'), 'Keep me\n');
    write(path.join(p, 'CLAUDE.md'), broken);
    const before = snapshot(p);
    call(bootstrap, ['--path', p], 2);
    assert.deepEqual(snapshot(p), before);
  }
});
scenario('linked-instructions-and-path-boundary', () => {
  const p = project('linked');
  write(path.join(p, 'authority.md'), 'Linked operator prose\r\n');
  fs.symlinkSync('authority.md', path.join(p, 'AGENTS.md'));
  fs.symlinkSync('authority.md', path.join(p, 'CLAUDE.md'));
  call(ui, ['install', '--project', p]);
  assert.ok(fs.lstatSync(path.join(p, 'AGENTS.md')).isSymbolicLink());
  assert.equal(fs.readFileSync(path.join(p, 'authority.md'), 'utf8').split('<!-- uiux-routing:start v1 -->').length, 2);
  const outside = project('outside'), escape = project('escape');
  write(path.join(outside, 'instructions.md'), 'Outside\n');
  fs.symlinkSync(path.join(outside, 'instructions.md'), path.join(escape, 'CLAUDE.md'));
  const before = snapshot(escape);
  call(ui, ['install', '--project', escape], 2);
  assert.deepEqual(snapshot(escape), before);
  assert.equal(fs.readFileSync(path.join(outside, 'instructions.md'), 'utf8'), 'Outside\n');
});
scenario('override-dry-run-and-injector', () => {
  const p = project('override');
  write(path.join(p, '.agents/UI_UX_PROTOCOL.md'), '# Project authority Ω\n');
  write(path.join(p, 'AGENTS.md'), 'Existing\n');
  const before = snapshot(p);
  call(ui, ['install', '--project', p, '--dry-run']);
  assert.deepEqual(snapshot(p), before);
  call(path.join(root, 'scripts/kbd-inject-agent-rules.mjs'), ['--pack', 'uiux-routing', '--path', p]);
  assert.equal(fs.readFileSync(path.join(p, '.agents/UI_UX_PROTOCOL.md'), 'utf8'), '# Project authority Ω\n');
  call(ui, ['install', '--project', p, '--check']);
});
scenario('nested-platform-and-operation-routing', () => {
  const p = project('platforms');
  write(path.join(p, 'package.json'), { dependencies: { react: '19' } });
  write(path.join(p, 'DESIGN.md'), 'Keep tokens');
  write(path.join(p, 'apps/mobile/pubspec.yaml'), 'name: mobile\ndependencies:\n  flutter:\n    sdk: flutter\n');
  write(path.join(p, 'apps/native/package.json'), { dependencies: { react: '19', 'react-native': '0.82', expo: '55' } });
  write(path.join(p, 'apps/desktop/package.json'), { dependencies: { react: '19', electron: '40' } });
  write(path.join(p, 'apps/android/build.gradle.kts'), 'plugins { id("org.jetbrains.kotlin.plugin.compose") }');
  write(path.join(p, 'apps/tauri/package.json'), { dependencies: { react: '19', '@tauri-apps/api': '2' } });
  const route = request => jsonCall(ui, 'route', { project: p, ui: true, ...request });
  const flutter = route({ affected: ['apps\\mobile\\lib\\screen.dart'], operation: 'refine' });
  assert.ok(flutter.skills.includes('flutter-build-responsive-layout'));
  assert.ok(!flutter.skills.some(s => /taste|redesign/.test(s)));
  assert.equal(flutter.proMax.generateDesignSystem, false);
  assert.ok(flutter.context.some(f => f.endsWith('DESIGN.md')));
  const gpt = route({ operation: 'new', model: 'openai/gpt-6', surface: 'marketing' });
  assert.ok(gpt.skills.includes('gpt-taste')); assert.equal(gpt.mode, 'Persuade');
  const other = route({ operation: 'new', model: 'kimi-k3:cloud', harness: 'codex' });
  assert.ok(other.skills.includes('design-taste-frontend')); assert.ok(!other.skills.includes('gpt-taste'));
  const review = route({ operation: 'review', overlay: 'minimalist-ui' });
  assert.ok(review.skills.includes('prometheus-ui-review')); assert.ok(!review.skills.some(s => /taste|minimalist/.test(s)));
  assert.deepEqual(route({ ui: false }).skills, []);
  const native = route({ affected: ['apps/native/screen.tsx'] });
  assert.ok(native.skills.includes('vercel-react-native-skills')); assert.ok(!native.skills.includes('web-design-guidelines'));
  assert.ok(native.applications[0].guidance.some(g => g.includes('55')));
  assert.ok(route({ affected: ['apps/android/screen.kt'] }).skills.includes('android-compose-adaptive'));
  assert.ok(route({ affected: ['apps/desktop/view.tsx'] }).applications[0].stacks.includes('electron'));
  assert.ok(route({ affected: ['apps/tauri/view.tsx'] }).applications[0].stacks.includes('tauri'));
  jsonCall(ui, 'route', { project: p, affected: ['../outside/page.tsx'] }, 2);
});
scenario('team-install-export-and-native-preservation', () => {
  const p = project('team');
  write(path.join(p, '.rules'), 'Zed authority\r\n');
  write(path.join(p, '.codex/agents/designer.toml'), 'name = "designer"\nsandbox_mode = "read-only"\n');
  const native = fs.readFileSync(path.join(p, '.codex/agents/designer.toml'));
  const request = { project: p, team };
  const before = snapshot(p);
  jsonCall(creator, 'install-project', { ...request, dryRun: true });
  assert.deepEqual(snapshot(p), before);
  jsonCall(creator, 'install-project', request);
  assert.deepEqual(fs.readFileSync(path.join(p, '.codex/agents/designer.toml')), native);
  const manifest = JSON.parse(fs.readFileSync(path.join(p, '.agent-team/web-team/team.json')));
  assert.ok(manifest.roles[0].skills.includes('prometheus-ui-ux'));
  assert.ok(manifest.roles[1].skills.includes('prometheus-ui-review'));
  assert.deepEqual(manifest.roles[2].skills, []);
  assert.ok(fs.readFileSync(path.join(p, '.rules'), 'utf8').includes('Default to that team'));
  const installed = snapshot(p);
  jsonCall(creator, 'install-project', request);
  assert.deepEqual(snapshot(p), installed);
  assert.equal(jsonCall(creator, 'install-project', { project: p, check: true }).clean, true);
  const out = path.join(temporary, 'proposal');
  jsonCall(creator, 'export', { team, target: 'claude', out });
  assert.deepEqual(snapshot(p), installed, 'export changed project');
});
scenario('team-sole-ambiguous-and-unavailable-delegation', () => {
  const p = project('sole');
  write(path.join(p, '.agent-team/web-team/team.json'), team);
  call(bootstrap, ['--path', p]);
  assert.equal(JSON.parse(fs.readFileSync(path.join(p, '.agent-team/project-routing.json'))).activeTeam, 'web-team');
  const ambiguous = project('ambiguous');
  write(path.join(ambiguous, '.agent-team/web-team/team.json'), team);
  write(path.join(ambiguous, '.agent-team/another/team.json'), { ...team, id: 'another' });
  jsonCall(creator, 'install-project', { project: ambiguous }, 1);
  jsonCall(creator, 'install-project', { project: ambiguous, teamId: 'another' });
  assert.equal(jsonCall(creator, 'install-project', { project: ambiguous }).activeTeam, 'another');
  const sequential = project('sequential');
  jsonCall(creator, 'install-project', { project: sequential, team: { ...team, harness: 'minimax' } });
  const record = JSON.parse(fs.readFileSync(path.join(sequential, '.agent-team/project-routing.json')));
  assert.equal(record.delegation, 'sequential-only');
  assert.ok(fs.readFileSync(path.join(sequential, 'AGENTS.md'), 'utf8').includes('not independent review'));
});
scenario('phase-boundary-evidence-honesty', () => {
  const p = project('phase');
  const out = jsonCall(ui, 'phase-boundary', { project: p, ui: true, operation: 'review' });
  assert.equal(out.executed, false);
  assert.ok(out.required.includes('independent read-only review'));
  assert.equal(out.hook.command, 'node');
});
const report = { boundary: 'complete-production-phase', platform: process.platform, node: process.version, temporary, results, nativeWindows: process.platform === 'win32' ? 'executed' : 'unverified', nativeLinux: process.platform === 'linux' ? 'executed' : 'unverified' };
const receipt = path.join(root, 'docs/research/ui-ux-routing/integration-receipt.json');
if (only && fs.existsSync(receipt)) { const previous = JSON.parse(fs.readFileSync(receipt)); report.previousRun = { results: previous.results, temporary: previous.temporary }; report.results = previous.results.filter(r => !results.some(n => n.name === r.name)).concat(results); }
write(receipt, report);
console.log(JSON.stringify(report, null, 2));
if (results.some(r => r.status === 'fail')) process.exitCode = 1;
