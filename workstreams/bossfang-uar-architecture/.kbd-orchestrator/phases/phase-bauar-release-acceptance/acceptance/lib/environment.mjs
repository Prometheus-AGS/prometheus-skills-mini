import { randomBytes } from 'node:crypto';
import { mkdir, realpath } from 'node:fs/promises';
import { join, delimiter, isAbsolute } from 'node:path';
import { requireValue, within } from './records.mjs';

const runtimeKeys = new Set(['PATH', 'LANG', 'LC_ALL', 'TZ', 'NODE_ENV', 'RUST_LOG', 'RUST_BACKTRACE', 'RUST_MIN_STACK',
  'THE_BOSS_E2E_GATE', 'THE_BOSS_ACCEPTANCE_CONFIG', 'THE_BOSS_UAR_STORAGE_FIXTURE_PATH',
  'THE_BOSS_UAR_POST_ACK_SIDECAR_PATH', 'THE_BOSS_UAR_POST_ACK_MANIFEST_PATH']);
const buildKeys = new Set(['CARGO_HOME', 'RUSTUP_HOME', 'CARGO_TARGET_DIR', 'CARGO_BUILD_JOBS',
  'RUSTC', 'RUSTDOC', 'CC', 'CXX', 'AR', 'SDKROOT', 'MACOSX_DEPLOYMENT_TARGET']);

export async function privateEnvironment(config, component, attemptRoot, bindingPath, receiptPath) {
  requireValue(within(config.privateRoot, attemptRoot), 'attempt_not_private');
  await mkdir(attemptRoot, { recursive: false, mode: 0o700 });
  requireValue(await realpath(attemptRoot) === attemptRoot, 'private_root_redirected');
  const roots = Object.fromEntries(['home', 'codex', 'config', 'data', 'cache', 'tmp', 'queue', 'plugins', 'store', 'app']
    .map(name => [name, join(attemptRoot, name)]));
  for (const path of Object.values(roots)) await mkdir(path, { mode: 0o700 });
  const env = {};
  for (const [key, value] of Object.entries(component.environment)) {
    requireValue(runtimeKeys.has(key) || component.environmentClass === 'supporting-build-private' && buildKeys.has(key),
      'environment_key_not_allowed');
    requireValue(!/[\r\n\0]/.test(value), 'environment_value_invalid');
    if (key === 'PATH') requireValue(value.split(delimiter).every(path => isAbsolute(path)), 'explicit_tool_paths_required');
    if (['THE_BOSS_UAR_STORAGE_FIXTURE_PATH', 'THE_BOSS_UAR_POST_ACK_SIDECAR_PATH',
      'THE_BOSS_UAR_POST_ACK_MANIFEST_PATH'].includes(key)) {
      requireValue(isAbsolute(value) && [...component.sourcePaths, ...component.packagePaths].includes(value),
        'supporting_fixture_not_bound');
    }
    if (['CARGO_HOME', 'RUSTUP_HOME', 'CARGO_TARGET_DIR', 'RUSTC', 'RUSTDOC', 'CC', 'CXX', 'AR', 'SDKROOT'].includes(key)) {
      requireValue(isAbsolute(value), 'explicit_build_tool_path_required');
    }
    env[key] = value;
  }
  requireValue(typeof env.PATH === 'string' && env.PATH.length > 0, 'explicit_path_required');
  Object.assign(env, { HOME: roots.home, CODEX_HOME: roots.codex, XDG_CONFIG_HOME: roots.config,
    XDG_DATA_HOME: roots.data, XDG_CACHE_HOME: roots.cache, TMPDIR: roots.tmp, TMP: roots.tmp, TEMP: roots.tmp,
    BAUAR_PRIVATE_ROOT: attemptRoot, BAUAR_QUEUE_ROOT: roots.queue, BAUAR_PLUGIN_ROOT: roots.plugins,
    BAUAR_STORE_ROOT: roots.store, BAUAR_COMPONENT_BINDING_PATH: bindingPath, BAUAR_COMPONENT_RECEIPT_PATH: receiptPath,
    THE_BOSS_ACCEPTANCE_ROOT: roots.app, THE_BOSS_PROFILE_ROOT: roots.app });
  for (const key of component.fixtureEnvKeys) {
    requireValue(/^BAUAR_FIXTURE_[A-Z0-9_]+$/.test(key) && !Object.hasOwn(env, key), 'fixture_key_invalid');
    env[key] = randomBytes(32).toString('hex');
  }
  // No value is copied from process.env, and the coordinator's environment never changes.
  return { env, roots };
}
