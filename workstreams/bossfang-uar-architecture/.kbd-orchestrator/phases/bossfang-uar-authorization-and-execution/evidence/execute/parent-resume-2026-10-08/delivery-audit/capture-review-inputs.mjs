import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Evidence only: explicit source allowlist; excluded F6 paths never opened or passed to Git.
const out = path.dirname(new URL(import.meta.url).pathname);
const phase = path.resolve(out, '../../../..');
const execute = path.join(phase, 'evidence/execute');
const resume = path.dirname(out);
const child = path.join(phase, 'children/desktop-mcp-projection-acceptance');
const manifestPath = path.join(child, 'evidence/execute/final-source-manifest-17.json');
const forbidden = new Set(['tests/bauar_session_owner.rs', 'src/uar/mcp_server.rs']);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = p => fs.readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const write = (p, value) => fs.writeFileSync(path.join(out, p), JSON.stringify(value, null, 2) + '\n');
const git = (root, args, allowed = [0]) => {
  const result = spawnSync('git', ['--no-pager', '-C', root, ...args], { encoding: 'utf8', maxBuffer: 12_000_000 });
  if (!allowed.includes(result.status)) throw new Error(`Git ${args[0]} failed (${result.status}): ${result.stderr}`);
  return result;
};
const manifest = json(manifestPath);
const bases = { uar: 'a7cb972992d4f83db6585449ea81af0fe4a1c990', boss: 'e2ae2ce21245030293c0bea96ed02ae853b820a7', bossfang: 'bac04cb6b2c144520e28234ad77f00d4cf0f5b23' };
const repositories = [];
for (const repository of manifest.records) {
  const files = [...repository.files];
  if (repository.name === 'boss') files.push({ file: 'build/integration-artifacts.json', sha256: null });
  const records = [];
  const patches = [];
  for (const entry of files) {
    if (forbidden.has(entry.file)) throw new Error('Forbidden path present in allowlist');
    const file = path.join(repository.root, entry.file);
    const before = fs.readFileSync(file);
    const base = git(repository.root, ['show', `${bases[repository.name]}:${entry.file}`], [0, 128]);
    let patch;
    if (base.status === 0) {
      patch = git(repository.root, ['diff', '--no-ext-diff', '--no-textconv', '--full-index', '--binary', bases[repository.name], '--', entry.file]).stdout;
    } else {
      patch = git(repository.root, ['diff', '--no-index', '--no-ext-diff', '--no-textconv', '--full-index', '--binary', '--', '/dev/null', file], [0, 1]).stdout;
    }
    const after = fs.readFileSync(file);
    records.push({ file: entry.file, path: file, bytes: before.length, sha256: sha(before), source17Sha256: entry.sha256, matchesSource17: entry.sha256 ? sha(before) === entry.sha256 : null, baseSha256: base.status === 0 ? sha(base.stdout) : null, stableDuringCapture: sha(before) === sha(after), patchBytes: Buffer.byteLength(patch), status: base.status !== 0 ? 'added' : patch ? 'modified' : 'unchanged' });
    if (patch) patches.push(patch);
  }
  const body = patches.join('\n');
  const patchFile = `${repository.name}-cumulative.patch`;
  fs.writeFileSync(path.join(out, patchFile), body);
  repositories.push({ name: repository.name, root: repository.root, acceptedBase: bases[repository.name], currentHead: git(repository.root, ['rev-parse', 'HEAD']).stdout.trim(), allowlistedFiles: records.length, patchFile, patchSha256: sha(body), patchBytes: Buffer.byteLength(body), records });
}
write('current-source-binding.json', { schemaVersion: 1, capturedAt: new Date().toISOString(), sourceManifest: manifestPath, sourceManifestSha256: sha(read(manifestPath)), scope: '239 source17 paths plus the reviewed package-inventory correction; not a whole repository or transitive dependency inventory', excluded: [...forbidden], forbiddenFilesAccessed: false, repositories });

const evidence = [
  'partial-runtime-results.json', 'final-gates/uar-identity-runtime-01.json', 'final-gates/uar-identity-runtime-02.json', 'final-gates/uar-identity-runtime-06.json',
  'final-gates/uar-grants-runtime-01.json', 'final-gates/uar-stdio-runtime-01.json', 'final-gates/uar-secret-runtime-05.json', 'final-gates/uar-receipt-runtime-02.json', 'final-gates/uar-cursor-runtime-02.json', 'final-gates/bossfang-mcp-runtime-07.json',
  'bossfang-harness-runtime-28-acceptance.json', 'bossfang-postlint-runtime-01-acceptance.json', 'boss-approval-runtime-15-acceptance.json',
  'final-gates/uar-format-check-01.json', 'uar-format-triage-01.json', 'default-removal-result.json', 'application-owned-config.md',
  'parent-resume-2026-10-08/identity-task7-acceptance.json', 'parent-resume-2026-10-08/authorization-task7-acceptance.json', 'parent-resume-2026-10-08/approval-current-finite-acceptance.json',
  'parent-resume-2026-10-08/G2-14-acceptance.json', 'parent-resume-2026-10-08/G2-14-finite-evidence.json', 'parent-resume-2026-10-08/post-gate-binding.json',
  'parent-resume-2026-10-08/bossfang-current-pair-acceptance.json', 'parent-resume-2026-10-08/bossfang-current-pair-finite-evidence.json',
  'parent-resume-2026-10-08/resource-check-disposition.md', 'parent-resume-2026-10-08/resource-applicability.json',
  'parent-resume-2026-10-08/canonical-directory-package-02-receipt.json', 'parent-resume-2026-10-08/packaged-external-uar-04-receipt.json', 'parent-resume-2026-10-08/packaged-acceptance-canonical-checkpoint.json',
  'parent-resume-2026-10-08/f6-withdrawal-receipt.json', 'parent-resume-2026-10-08/stale-mini-qa-blocker-clear.json',
  'parent-resume-2026-10-08/review-package-correction/findings.json', 'parent-resume-2026-10-08/review-package-correction/packet.json',
];
const snapshots = evidence.map(relative => {
  const file = path.join(execute, relative), content = read(file);
  return { file, sha256: sha(content), bytes: Buffer.byteLength(content), content };
});
const reviewDir = path.join(child, 'evidence/execute/review/adversarial-2026-10-08');
for (const name of ['findings.json', 'findings-r2.json', 'findings-r3.json', 'findings-r4-focused.json', 'independent-adjudication.md', 'independent-adjudication-r2.md', 'dispatch-r4-focused-receipt.json']) {
  const file = path.join(reviewDir, name), content = read(file);
  snapshots.push({ file, sha256: sha(content), bytes: Buffer.byteLength(content), content });
}
write('evidence-snapshot.json', { schemaVersion: 1, capturedAt: new Date().toISOString(), snapshots });
console.log(JSON.stringify({ captured: repositories.map(r => ({ repository: r.name, files: r.records.length, patchBytes: r.patchBytes, drift: r.records.filter(x => x.matchesSource17 === false).map(x => x.file), unstable: r.records.filter(x => !x.stableDuringCapture).map(x => x.file) })), evidenceFiles: snapshots.length }));
