import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const out = path.dirname(new URL(import.meta.url).pathname);
const previous = '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/evidence/execute/parent-resume-2026-10-08/delivery-audit';
const input = JSON.parse(fs.readFileSync(path.join(previous, 'current-source-binding.json'), 'utf8'));
const adjunct = JSON.parse(fs.readFileSync(path.join(previous, 't2-source-adjunct.json'), 'utf8'));
const targets = { uar: '/Users/gqadonis/Projects/prometheus/universal-agent-runtime', boss: '/Users/gqadonis/Projects/prometheus/the-boss', bossfang: '/Users/gqadonis/Projects/references/librefang' };
const forbidden = new Set(['tests/bauar_session_owner.rs', 'src/uar/mcp_server.rs']);
const sha = b => b === null ? null : crypto.createHash('sha256').update(b).digest('hex');
function git(root, args, missing = false) {
  const r = spawnSync('git', ['--no-pager', '-C', root, ...args], { maxBuffer: 12_000_000 });
  if (r.status === 0) return r.stdout;
  if (missing && r.status === 128) return null;
  throw new Error('Git metadata/blob read failed: ' + args[0] + ' status ' + r.status);
}
function working(root, file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return null;
  if (!fs.lstatSync(full).isFile()) throw new Error('Allowlisted path is not a regular file');
  return fs.readFileSync(full);
}
const repositories = [];
for (const repository of input.repositories) {
  const sourceRoot = repository.root, targetRoot = targets[repository.name];
  const sourceHead = git(sourceRoot, ['rev-parse', 'HEAD']).toString().trim();
  const targetHead = git(targetRoot, ['rev-parse', 'HEAD']).toString().trim();
  const records = [...repository.records];
  if (repository.name === 'uar' && !records.some(r => r.file === adjunct.file)) records.push({ file: adjunct.file, sha256: adjunct.currentSha256, baseSha256: adjunct.beforeSha256, role: 'separate-test-only-adjunct' });
  const rows = [];
  for (const record of records) {
    const file = record.file;
    if (forbidden.has(file) || file.startsWith('/') || file.split('/').includes('..')) throw new Error('Excluded or invalid path in input');
    const source = working(sourceRoot, file), target = working(targetRoot, file);
    const sourceSha256 = sha(source), targetSha256 = sha(target);
    const sourceHeadSha256 = sha(git(sourceRoot, ['show', sourceHead + ':' + file], true));
    const sourceIndexSha256 = sha(git(sourceRoot, ['show', ':' + file], true));
    const targetHeadSha256 = sha(git(targetRoot, ['show', targetHead + ':' + file], true));
    const targetIndexSha256 = sha(git(targetRoot, ['show', ':' + file], true));
    const baseSha256 = record.baseSha256;
    const sourcePhaseChanged = sourceSha256 !== baseSha256;
    const classification = sourceSha256 === targetSha256 ? 'same-bytes' : !sourcePhaseChanged ? 'no-source-phase-delta-preserve-target' : targetSha256 === baseSha256 ? 'phase-delta-target-at-base' : 'divergent-candidate-requires-reconciliation';
    rows.push({ file, role: record.role ?? 'phase-allowlist', baseSha256, sourceSha256, sourceHeadSha256, sourceIndexSha256, targetSha256, targetHeadSha256, targetIndexSha256, sourceMatchesPriorBinding: sourceSha256 === record.sha256, sourcePhaseChanged, sourceCommittedChanged: sourceHeadSha256 !== baseSha256, sourceUncommitted: sourceSha256 !== sourceHeadSha256, sourceStaged: sourceIndexSha256 !== sourceHeadSha256, targetChangedSinceAcceptedBase: targetSha256 !== baseSha256, targetUncommitted: targetSha256 !== targetHeadSha256, targetStaged: targetIndexSha256 !== targetHeadSha256, stableDuringCapture: sourceSha256 === sha(working(sourceRoot, file)) && targetSha256 === sha(working(targetRoot, file)), classification });
  }
  const classifications = Object.fromEntries([...new Set(rows.map(r => r.classification))].map(c => [c, rows.filter(r => r.classification === c).length]));
  repositories.push({ name: repository.name, sourceRoot, targetRoot, acceptedBase: repository.acceptedBase, sourceHead, targetHead, sourceBranch: git(sourceRoot, ['branch', '--show-current']).toString().trim(), targetBranch: git(targetRoot, ['branch', '--show-current']).toString().trim(), targetOnlySourceOnlyCommits: git(sourceRoot, ['rev-list', '--left-right', '--count', targetHead + '...' + sourceHead]).toString().trim(), summary: { paths: rows.length, sourcePhaseChanged: rows.filter(r => r.sourcePhaseChanged).length, sourceCommittedChanged: rows.filter(r => r.sourceCommittedChanged).length, sourceUncommitted: rows.filter(r => r.sourceUncommitted).length, sourceStaged: rows.filter(r => r.sourceStaged).length, targetChangedSinceAcceptedBase: rows.filter(r => r.targetChangedSinceAcceptedBase).length, targetUncommitted: rows.filter(r => r.targetUncommitted).length, targetStaged: rows.filter(r => r.targetStaged).length, sourceBindingDrift: rows.filter(r => !r.sourceMatchesPriorBinding).length, unstable: rows.filter(r => !r.stableDuringCapture).length, classifications }, rows });
}
const result = { schemaVersion: 1, at: new Date().toISOString(), purpose: 'Read-only candidate release intake; hashes are not a mergeability or runtime test', sourceBinding: path.join(previous, 'current-source-binding.json'), testAdjunct: path.join(previous, 't2-source-adjunct.json'), targetsApprovedAsReleaseRefs: false, wholeRepositoryInspected: false, excludedPaths: [...forbidden], excludedPathsAccessed: false, productMutation: false, buildsTestsServicesOrVetting: false, repositories };
fs.writeFileSync(path.join(out, 'intake-comparison.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(repositories.map(r => ({ name: r.name, sourceHead: r.sourceHead, targetHead: r.targetHead, targetBranch: r.targetBranch, divergence: r.targetOnlySourceOnlyCommits, summary: r.summary }))));
