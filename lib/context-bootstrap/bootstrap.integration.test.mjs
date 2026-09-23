import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-context-bootstrap-'));
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
    assert.match(claude, /smallest integration flow/);

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
