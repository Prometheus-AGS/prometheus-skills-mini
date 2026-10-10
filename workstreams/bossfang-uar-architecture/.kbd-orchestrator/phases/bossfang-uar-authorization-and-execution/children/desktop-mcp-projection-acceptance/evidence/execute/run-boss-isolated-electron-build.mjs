// Build adapter for existing pinned payloads; no installs or loader replacement.
// Run from the isolated app root, after the separately owned TypeScript gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [target, ...extra] = process.argv.slice(2);
assert.equal(process.versions.node, '24.14.1');
assert.equal(process.cwd(), '/Users/gqadonis/.claude/worktrees/bauar-boss');
assert.deepEqual(extra, []);
assert.ok(target === 'app' || target === 'utility');
const request = createRequire(path.join(process.cwd(), 'package.json'));
const electronEntry = request.resolve('electron-vite');
const electronManifest = JSON.parse(fs.readFileSync(request.resolve('electron-vite/package.json')));
assert.equal(electronManifest.version, '6.0.0-beta.1');
const scoped = createRequire(electronEntry);
const viteEntry = scoped.resolve('vite');
const viteManifest = JSON.parse(fs.readFileSync(scoped.resolve('vite/package.json')));
assert.equal(viteManifest.version, '8.2.0');
const rolldown = createRequire(viteEntry).resolve('rolldown');
const rolldownManifest = JSON.parse(fs.readFileSync(path.resolve(path.dirname(rolldown), '../package.json')));
assert.equal(rolldownManifest.version, '1.2.6');
const native = '/Users/gqadonis/.claude/worktrees/bauar-boss/node_modules/.pnpm/@rolldown+binding-darwin-arm64@1.2.6/node_modules/@rolldown/binding-darwin-arm64/rolldown-binding.darwin-arm64.node';
assert.equal(createHash('sha256').update(fs.readFileSync(native)).digest('hex'),
  '976ee53424608db5e470eb46b141088b80d95295d69210e1ebd8ba6056296377');
assert.equal(process.env.NAPI_RS_NATIVE_LIBRARY_PATH, undefined,
  'Do not replace an existing native override');
process.env.NAPI_RS_NATIVE_LIBRARY_PATH = native;
try { await import(pathToFileURL(rolldown).href); }
finally { delete process.env.NAPI_RS_NATIVE_LIBRARY_PATH; }
// Use electron-vite's real config loader and plugins. It sets production mode
// and builds main -> preload -> renderer. Preserve CHERRY_EDITION and profile env.
const { build } = await import(pathToFileURL(electronEntry).href);
await build({ configFile: path.resolve(target === 'app'
  ? 'electron.vite.config.ts' : 'electron.vite.entries.config.ts') });
