import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const runner = path.join(root, 'dist', 'plugins', 'codex', 'prometheus-skills-mini', 'skills', 'agent-team-creator', 'tests', 'c03-final.integration.mjs');
const result = spawnSync(process.execPath, [runner, ...process.argv.slice(2)], { cwd: root, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
