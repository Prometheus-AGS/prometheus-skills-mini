import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { assetName, hosts, products, releaseTag, releaseVersion } from './catalog.mjs';
import { sourceRows } from './provenance.mjs';
import { fileHash } from './receipt.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const refCommit = (ref) => git('rev-parse', ref + '^{commit}');
const hasTag = () => spawnSync('git', ['show-ref', '--verify', '--quiet', 'refs/tags/' + releaseTag]).status === 0;
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();

export function planRelease({ eventName, ref, sha, before }) {
  if (eventName === 'workflow_dispatch' && ref !== 'refs/heads/main') throw new Error('Select main for a manual release');
  if (!['refs/heads/main', 'refs/tags/' + releaseTag].includes(ref)) throw new Error('Tag must equal the package version');
  const commit = refCommit(sha);
  if (git('merge-base', 'origin/main', commit) !== commit) throw new Error('Release commit must be on main');
  if (eventName === 'push' && ref === 'refs/heads/main' && before && !/^0+$/.test(before)) {
    if (JSON.parse(git('show', before + ':package.json')).version === releaseVersion) return { enabled: false };
  }
  if (hasTag() && refCommit('refs/tags/' + releaseTag) !== commit) throw new Error('Existing version tag identifies a different commit');
  return { enabled: true, tag: releaseTag, commit, matrix: { include: hosts.flatMap(host =>
    Object.keys(products).map(tool => ({ tool, ...host }))) } };
}

export function checksumAssets(directory) {
  const assets = hosts.flatMap(host => Object.keys(products).map(name => assetName(name, host))).sort();
  for (const asset of assets) {
    const stat = fs.lstatSync(path.join(directory, asset));
    if (!stat.isFile() || stat.size === 0) throw new Error(`Missing native executable: ${asset}`);
  }
  const hashes = assets.map(asset => fileHash(path.join(directory, asset)) + '  ' + asset);
  const sums = [...sourceRows(), ...hashes].join('\n') + '\n';
  fs.writeFileSync(path.join(directory, 'SHA256SUMS'), sums);
  return [...assets, 'SHA256SUMS'].map(name => path.join(directory, name));
}

export function publishRelease(directory, sha) {
  const assets = checksumAssets(directory);
  const commit = refCommit(sha);
  if (git('merge-base', 'origin/main', commit) !== commit) throw new Error('Release commit must be on main');
  if (hasTag()) {
    if (refCommit('refs/tags/' + releaseTag) !== commit) throw new Error('Refusing to move existing tag');
  } else {
    gh('api', '--method', 'POST', 'repos/{owner}/{repo}/git/refs', '-f', 'ref=refs/tags/' + releaseTag, '-f', 'sha=' + commit);
  }
  // Query via API so auth/network errors are not confused with a missing release.
  const existing = spawnSync('gh', ['release', 'view', releaseTag, '--json', 'isDraft,assets'], { encoding: 'utf8' });
  if (existing.status === 0) {
    const release = JSON.parse(existing.stdout);
    if (!release.isDraft) {
      for (const asset of assets) {
        const identity = release.assets.find(row => row.name === path.basename(asset));
        if (!identity?.digest || identity.digest !== 'sha256:' + fileHash(asset)) throw new Error('Published release is immutable: ' + asset);
      }
      return;
    }
  } else {
    if (!/release not found|HTTP 404/i.test(existing.stderr ?? '')) throw new Error(existing.stderr || 'Could not inspect existing release');
    gh('release', 'create', releaseTag, '--draft', '--verify-tag', '--target', commit, '--title', 'Prometheus Skills Mini ' + releaseVersion, '--generate-notes');
  }
  gh('release', 'upload', releaseTag, '--clobber', ...assets);
  gh('release', 'edit', releaseTag, '--draft=false');
}
