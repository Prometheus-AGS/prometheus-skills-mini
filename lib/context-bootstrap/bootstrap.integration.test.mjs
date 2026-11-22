import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../platform/paths.mjs';

const PACK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = path.join(PACK_ROOT, 'scripts', 'prometheus-context-bootstrap.mjs');

function run(root, ...args) {
  return spawnSync(process.execPath, [SCRIPT, '--path', root, '--stacks', 'typescript,rust', ...args], {
    cwd: PACK_ROOT,
    encoding: 'utf8',
    shell: false,
  });
}

test('the CLI bootstraps and verifies a Windows-style the-boss checkout end to end', () => {
  const root = fs.mkdtempSync(path.join(tempDir(), 'mini-context-bootstrap-'));
  try {
    fs.writeFileSync(path.join(root, 'AGENTS.md'), 'CLAUDE.md\r\n');
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# Operator rules\r\n\r\nKeep this prose.\r\n');
    fs.writeFileSync(path.join(root, 'package.json'), '{"private":true}\n');
    fs.writeFileSync(path.join(root, 'Cargo.toml'), '[workspace]\nmembers = []\n');

    const applied = run(root);
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);
    assert.match(applied.stdout, /Completed prometheus-context-bootstrap/);
    assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), 'CLAUDE.md\r\n');

    const claude = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    assert.match(claude, /Keep this prose/);
    assert.equal((claude.match(/prometheus-mini-context:start v1/g) ?? []).length, 1);
    // Policy wording since ed01fd2 (defer verification to phase completion).
    assert.match(claude, /one integration flow through the real production\s+entry point/);

    const rust = fs.readFileSync(path.join(root, '.claude', 'rules', 'rust.md'), 'utf8');
    assert.match(rust, /paths:/);
    assert.match(rust, /rust-best-practices/);
    assert.match(rust, /rust-async-patterns/);
    assert.match(rust, /rust-mcp-server-generator/);
    assert.doesNotMatch(rust, /T0 every edit|T1 unit complete|just-written unit/);

    for (const harness of ['.agents', '.claude']) {
      for (const skill of ['prometheus-context-bootstrap', 'prometheus-rust-workspace']) {
        const file = path.join(root, harness, 'skills', skill, 'SKILL.md');
        assert.equal(fs.lstatSync(file).isSymbolicLink(), false);
        assert.equal(fs.existsSync(file), true);
      }
    }

    const checked = run(root, '--check');
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
    assert.match(checked.stdout, /Verified prometheus-context-bootstrap/);

    const reapplied = run(root);
    assert.equal(reapplied.status, 0, reapplied.stderr || reapplied.stdout);
    assert.match(reapplied.stdout, /\(typescript, rust; 0 change\(s\)\)/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an existing project receives focused VLBV guidance without rewriting local hooks', () => {
  const root = fs.mkdtempSync(path.join(tempDir(), 'focused-exit-project-'));
  try {
    const ownerRules = '# Project owner\n\nKeep the established release command.\n';
    const hookPolicy = JSON.stringify({ hooks: { Stop: [{ matcher: '*', hooks: [
      { type: 'command', command: 'node project-owned-stop.mjs' },
    ] }] } });
    fs.mkdirSync(path.join(root, '.claude'));
    fs.writeFileSync(path.join(root, 'AGENTS.md'), ownerRules);
    fs.writeFileSync(path.join(root, '.claude', 'settings.json'), hookPolicy);
    fs.writeFileSync(path.join(root, 'package.json'), '{"private":true}');

    const result = run(root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const rules = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    assert.ok(rules.startsWith(ownerRules));
    assert.match(rules, /Origin\/Before/);
    assert.match(rules, /Preflight runner, fixtures, step mapping, prerequisites and oracles\s+statically/);
    assert.match(rules, /Executable feedback\s+needs exact method, cadence and authority/);
    assert.match(rules, /A harness defect is BLOCKED, not product FAIL/);
    assert.match(rules, /Preserve original and unaffected evidence/);
    assert.equal(fs.readFileSync(path.join(root, '.claude', 'settings.json'), 'utf8'), hookPolicy);

    const checked = run(root, '--check');
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
