import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { jcs } from './jcs.mjs';

const INVENTORY_FILE = 'reviewed-skill-closures.json';
const SCHEMA_VERSION = 'prometheus-reviewed-skill-closures-v1';

function sha256(bytes) {
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function relativePath(root, absolute) {
  const relative = path.relative(root, absolute).split(path.sep).join('/');
  if (!relative || relative === '..' || relative.startsWith('../') || path.posix.isAbsolute(relative)) {
    throw new Error(`closure path escapes payload root: ${absolute}`);
  }
  return relative;
}

function collectFiles(root, location, entries) {
  const stat = fs.lstatSync(location);
  if (stat.isSymbolicLink()) throw new Error(`reviewed closure refuses symlink: ${relativePath(root, location)}`);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(location).sort(compare)) {
      const child = path.join(location, name);
      if (relativePath(root, child) === INVENTORY_FILE) continue;
      collectFiles(root, child, entries);
    }
    return;
  }
  if (!stat.isFile()) throw new Error(`reviewed closure refuses non-file: ${relativePath(root, location)}`);
  const relative = relativePath(root, location);
  entries.set(relative, { path: relative, sha256: sha256(fs.readFileSync(location)) });
}

function readIdentity(skillFile) {
  const bytes = fs.readFileSync(skillFile);
  const frontmatter = bytes.toString('utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const scalar = (key) => frontmatter.match(new RegExp(`^${key}:\\s*['\"]?([^'\"\\r\\n]+)['\"]?\\s*$`, 'm'))?.[1].trim() ?? null;
  const metadataVersion = frontmatter.match(/^metadata:\s*\r?\n(?:[ \t]+[^\r\n]*\r?\n)*?[ \t]+version:\s*['\"]?([^'\"\r\n]+)['\"]?\s*$/m)?.[1].trim() ?? null;
  const name = scalar('name');
  if (!name) throw new Error(`reviewed closure requires frontmatter name: ${skillFile}`);
  return { id: scalar('id'), name, version: scalar('version') ?? metadataVersion, artifactDigest: sha256(bytes) };
}

function skillDirectories(payloadRoot) {
  const skillsRoot = path.join(payloadRoot, 'skills');
  if (!fs.existsSync(skillsRoot)) throw new Error(`reviewed closure requires skills root: ${skillsRoot}`);
  const result = [];
  const visit = (directory) => {
    const stat = fs.lstatSync(directory);
    if (stat.isSymbolicLink()) throw new Error(`reviewed closure refuses skill symlink: ${relativePath(payloadRoot, directory)}`);
    if (!stat.isDirectory()) return;
    const skillFile = path.join(directory, 'SKILL.md');
    if (fs.existsSync(skillFile)) result.push({ directory, skillFile });
    for (const name of fs.readdirSync(directory).sort(compare)) visit(path.join(directory, name));
  };
  visit(skillsRoot);
  return result;
}

function writeJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644, flag: 'wx' });
  fs.renameSync(temporary, file);
}

/**
 * Emits a conservative runtime closure from bytes already staged for distribution.
 * Every selected skill owns all files under its directory plus the package's shared
 * runtime roots. The roots are recorded so a verifier can reject added files too.
 */
export function writeReviewedSkillClosures(payloadRoot, { sharedRoots = [] } = {}) {
  const absoluteRoot = path.resolve(payloadRoot);
  const roots = sharedRoots
    .map((entry) => {
      const absolute = path.resolve(absoluteRoot, entry);
      if (!fs.existsSync(absolute)) throw new Error(`reviewed closure shared root is missing: ${entry}`);
      return relativePath(absoluteRoot, absolute);
    })
    .filter((entry, index, values) => values.indexOf(entry) === index)
    .sort(compare);
  const sharedFiles = new Map();
  for (const root of roots) collectFiles(absoluteRoot, path.join(absoluteRoot, ...root.split('/')), sharedFiles);
  const files = new Map(sharedFiles);
  const skills = skillDirectories(absoluteRoot).map(({ directory, skillFile }) => {
    const ownFiles = new Map();
    collectFiles(absoluteRoot, directory, ownFiles);
    for (const [entryPath, entry] of ownFiles) files.set(entryPath, entry);
    const closurePaths = [...new Set([...sharedFiles.keys(), ...ownFiles.keys()])].sort(compare);
    const closureFiles = closurePaths.map((entryPath) => files.get(entryPath));
    const skillRoot = relativePath(absoluteRoot, directory);
    return {
      identity: readIdentity(skillFile),
      entrypoint: `${skillRoot}/SKILL.md`,
      roots: [skillRoot, ...roots],
      closure: { paths: closurePaths, digest: sha256(jcs({ files: closureFiles })) },
    };
  });
  skills.sort((left, right) => compare(left.entrypoint, right.entrypoint));
  const document = {
    schemaVersion: SCHEMA_VERSION,
    hashAlgorithm: 'sha256',
    files: [...files.values()].sort((left, right) => compare(left.path, right.path)),
    skills,
  };
  const inventory = { ...document, inventoryDigest: sha256(jcs(document)) };
  writeJson(path.join(absoluteRoot, INVENTORY_FILE), inventory);
  return inventory;
}
