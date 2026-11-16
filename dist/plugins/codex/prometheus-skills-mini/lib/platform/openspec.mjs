// Compose the managed OpenSpec CLI into KBD without shell shims or a global install.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./openspec/cli.mjs', import.meta.url));

export function refreshOpenSpec(project, { timeoutMs = 120000 } = {}) {
  const result = spawnSync(process.execPath, [cli, 'refresh', '--project', project, '--timeout-ms', String(timeoutMs)], {
    encoding: 'utf8', shell: false, timeout: timeoutMs + 1000,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.stdout) process.stderr.write(result.stdout);
  if (result.error || result.status !== 0) {
    throw new Error(`OpenSpec refresh incomplete; retry before OpenSpec work: ${result.error?.message ?? `exit ${result.status}`}`);
  }
  return result;
}

// Read-only session check (never installs or writes project files). Returns the
// runner receipt, or { status: 'incomplete', reason } when the check could not
// finish. Never throws, so a SessionStart hook can call it inside its budget.
export function verifyOpenSpec(project, { timeoutMs = 5000 } = {}) {
  const result = spawnSync(process.execPath, [cli, 'verify', '--project', project], {
    encoding: 'utf8', shell: false, timeout: timeoutMs,
  });
  if (result.error) return { status: 'incomplete', reason: result.error.message };
  // The runner writes its JSON receipt as the last stderr line.
  const line = (result.stderr || '').trim().split('\n').pop() || '';
  try {
    const receipt = JSON.parse(line);
    return receipt && typeof receipt.status === 'string' ? receipt : { status: 'incomplete', reason: 'runner receipt has no status' };
  } catch {
    return { status: 'incomplete', reason: line || `exit ${result.status}` };
  }
}

export function spawnOpenSpec(_name, args, options = {}) {
  return spawnSync(process.execPath, [cli, 'run', '--project', options.cwd ?? process.cwd(), '--', ...args], {
    encoding: 'utf8', ...options, shell: false,
  });
}
