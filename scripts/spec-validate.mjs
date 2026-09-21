// Validate every OpenSpec spec and change, without a shell and without a global install.
//
// An entry point only: resolve, run, forward the exit code. All the mechanism lives in
// lib/platform/spawn.mjs, which is what makes the same command work on Windows — where
// `openspec` is a .cmd that Node cannot run without a shell.

import { spawnNodeCli } from '../lib/platform/spawn.mjs';

const result = spawnNodeCli('@fission-ai/openspec', 'openspec', ['validate', '--all', '--no-interactive'], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(`spec-validate: could not start the OpenSpec CLI: ${result.error.message}`);
  process.exit(70);
}

// A child killed by a signal has a null status; report it rather than silently exiting 0.
process.exit(result.status ?? 1);
