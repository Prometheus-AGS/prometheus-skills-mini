// Verification adapter: reuse an existing exact pinned native payload.
// No installation, package-loader replacement, dependency or source mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [tool, ...args] = process.argv.slice(2);
assert.equal(tool, 'tsdown');
assert.equal(process.versions.node, '24.14.1');
const request = createRequire(path.join(process.cwd(), 'package.json'));
const entry = request.resolve('tsdown');
const tsdown = JSON.parse(fs.readFileSync(path.resolve(path.dirname(entry), '../package.json')));
assert.equal(tsdown.version, '0.22.14');
const scoped = createRequire(entry);
const rolldown = scoped.resolve('rolldown');
const manifest = JSON.parse(fs.readFileSync(path.resolve(path.dirname(rolldown), '../package.json')));
assert.equal(manifest.version, '1.2.6');
const native = '/Users/gqadonis/Projects/prometheus/the-boss/node_modules/.pnpm/@rolldown+binding-darwin-arm64@1.2.6/node_modules/@rolldown/binding-darwin-arm64/rolldown-binding.darwin-arm64.node';
assert.equal(createHash('sha256').update(fs.readFileSync(native)).digest('hex'),
  '976ee53424608db5e470eb46b141088b80d95295d69210e1ebd8ba6056296377');
assert.equal(process.env.NAPI_RS_NATIVE_LIBRARY_PATH, undefined,
  'Do not replace an existing native override');
// Load only Rolldown using its own supported override. Clear the global name
// before tsdown/config/plugins can load unrelated NAPI packages.
process.env.NAPI_RS_NATIVE_LIBRARY_PATH = native;
try { await import(pathToFileURL(rolldown).href); }
finally { delete process.env.NAPI_RS_NATIVE_LIBRARY_PATH; }
// This adapter selects public build options; it does not reinterpret CLI flags.
assert.deepEqual(args, [], 'This exact build adapter accepts no tsdown CLI flags');
const nativeTsc = '/Users/gqadonis/Projects/prometheus/the-boss/node_modules/.pnpm/@typescript+typescript-darwin-arm64@7.0.2/node_modules/@typescript/typescript-darwin-arm64/lib/tsc';
const nativeTsManifest = JSON.parse(fs.readFileSync(path.resolve(path.dirname(nativeTsc), '../package.json')));
assert.equal(nativeTsManifest.version, '7.0.2');
assert.equal(createHash('sha256').update(fs.readFileSync(nativeTsc)).digest('hex'),
  'a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2');
const { build } = await import(pathToFileURL(entry).href);
// Load the current isolated config, including its runtime-entry map and plugins.
// Node24 handles the type-only syntax in this project's tsdown.config.ts.
const { default: exported } = await import(pathToFileURL(path.join(process.cwd(), 'tsdown.config.ts')).href);
const configs = Array.isArray(exported) ? exported : [exported];
for (const config of configs) {
  const dts = config.dts;
  const enabled = dts === true || (dts && typeof dts === 'object' && dts.enabled !== false);
  const compilerSelection = enabled ? {
    dts: {
      ...(dts === true ? {} : dts),
      tsgo: { ...(typeof dts.tsgo === 'object' ? dts.tsgo : {}), path: nativeTsc }
    }
  } : {};
  // Public build() with config:false uses exactly these original options.
  // In particular the runtime member retains dts:false and both original plugins.
  await build({ ...config, ...compilerSelection, config: false, cwd: process.cwd() });
}
