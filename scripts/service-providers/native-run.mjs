// Launcher for a Mini supervisor job. native.mjs copies this file into the service directory and the
// unit runs it with the launch configuration as its argument. Older jobs run it from the pack.
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const { binary, args, environment, directory } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const child = spawn(binary, args, { stdio: 'inherit', cwd: directory, env: { ...process.env, ...environment } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGTERM' ? 0 : 1); });
