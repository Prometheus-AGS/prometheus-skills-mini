// Shared helpers for the VLBV protocol evals (vlbv-r4-portability, CR-31).
// Pure Node (no dependencies) so it runs anywhere the pack's scripts run.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const EVAL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = path.resolve(EVAL_DIR, '../..');
export const REPORTS_DIR = path.join(ROOT, 'evals/reports');
export const RUNS_DIR = path.join(ROOT, 'evals/runs');
export const DEFAULT_CORPUS = 'vlbv-protocol';
export const CORPUS_FILE = path.join(EVAL_DIR, 'cases/vlbv-protocol.json');

/**
 * Mini's harnesses (config/harnesses/capabilities.json profile ids). The first four have a
 * headless CLI adapter; the rest have no headless agent CLI adapter here and are always
 * reported not run (NOT_EXERCISED with a reason), never PASS.
 */
export const INSTALLED_HARNESSES = ['claude-code', 'codex', 'opencode', 'kimi-code'];
export const NOT_RUN_HARNESSES = ['zed', 'cursor', 'gemini', 'windsurf', 'cline'];

/** @param {string|Buffer} value @returns {string} */
export const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

/** @param {string} file @returns {any} */
export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

/** @param {string} file @param {unknown} value */
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** @param {string} file @param {string} text */
export function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

/** @returns {string} ISO timestamp without milliseconds */
export const stamp = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

/**
 * Run a process synchronously. Never throws; a spawn failure is exit 127.
 * @param {string} exe @param {string[]} args
 * @param {{cwd?: string, env?: NodeJS.ProcessEnv, input?: string, timeoutMs?: number}} [options]
 */
export function run(exe, args, options = {}) {
  const started = Date.now();
  const result = spawnSync(exe, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    input: options.input,
    encoding: 'utf8',
    timeout: options.timeoutMs ?? 120_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const timedOut = result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM';
  return {
    exit: result.status ?? (result.error ? 127 : 1),
    stdout: result.stdout ?? '',
    stderr: `${result.stderr ?? ''}${result.error && !timedOut ? String(result.error) : ''}`,
    timedOut,
    durationMs: Date.now() - started,
  };
}

/**
 * Locate a native executable on PATH (no shell). On Windows only `.exe` is accepted: Node
 * cannot run a .cmd/.bat/.ps1 shim without a shell (lib/platform/spawn.mjs), and this project
 * never enables one, so a harness installed only as an npm .cmd shim is reported not run.
 * @param {string} name @returns {string|null}
 */
export function which(name) {
  const extensions = process.platform === 'win32' ? ['.exe'] : [''];
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of extensions) {
      const candidate = path.join(dir, name + ext);
      try {
        if (process.platform !== 'win32') fs.accessSync(candidate, fs.constants.X_OK);
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {
        // not here
      }
    }
  }
  return null;
}

/**
 * Minimal argv parser: `--key value`, `--flag`, repeated keys keep the last value.
 * @param {string[]} argv @param {string[]} flags names that take no value
 */
export function parseArgs(argv, flags = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { out._.push(arg); continue; }
    const key = arg.slice(2);
    if (flags.includes(key)) { out[key] = true; continue; }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`--${key} needs a value`);
    out[key] = value;
    i += 1;
  }
  return out;
}

/** @returns {{decisionRule: any, markers: Record<string,string>, cases: any[]}} */
export function loadCorpus(name = DEFAULT_CORPUS) {
  // A corpus is named, never given as a path, so an opt-in run cannot read a file outside cases/.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`--corpus ${name}: use a corpus name such as ${DEFAULT_CORPUS}`);
  const file = name === DEFAULT_CORPUS ? CORPUS_FILE : path.join(EVAL_DIR, 'cases', `${name}.json`);
  if (!fs.existsSync(file)) throw new Error(`--corpus ${name}: no such corpus (${path.relative(ROOT, file)})`);
  const corpus = readJson(file);
  if (corpus.kind !== 'vlbv.protocol-eval-corpus') throw new Error(`${file}: unexpected kind ${corpus.kind}`);
  const ids = corpus.cases.map(c => c.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${file}: duplicate case ids`);
  return corpus;
}

/** Cases split by class. */
export function casesByClass(corpus) {
  return {
    agent: corpus.cases.filter(c => c.class === 'agent'),
    machinery: corpus.cases.filter(c => c.class === 'machinery'),
  };
}

/**
 * Passes required for a case under the declared decision rule.
 * @param {any} decisionRule @param {any} testCase @returns {number}
 */
export function passesRequired(decisionRule, testCase) {
  const strict = testCase.critical === true || (testCase.capabilityFields ?? []).length > 0;
  return strict ? decisionRule.criticalOrCapabilityPassesRequired : decisionRule.defaultPassesRequired;
}

/** Git commit of the repository (or "unknown"). */
export function gitCommit() {
  const out = run('git', ['rev-parse', 'HEAD'], { cwd: ROOT, timeoutMs: 10_000 });
  return out.exit === 0 ? out.stdout.trim() : 'unknown';
}

/** Hash a file or directory tree (paths + bytes); "absent" when missing. @param {string} target */
export function hashPath(target) {
  if (!fs.existsSync(target)) return 'absent';
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) return `link:${sha256(fs.readlinkSync(target))}`;
  if (stat.isFile()) return sha256(fs.readFileSync(target));
  const hash = crypto.createHash('sha256');
  const walk = dir => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const s = fs.lstatSync(full);
      hash.update(`${path.relative(target, full)}\0`);
      if (s.isDirectory()) walk(full);
      else if (s.isFile()) hash.update(fs.readFileSync(full));
      else if (s.isSymbolicLink()) hash.update(fs.readlinkSync(full));
    }
  };
  walk(target);
  return `dir:${hash.digest('hex')}`;
}
