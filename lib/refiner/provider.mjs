// Resolves which state provider the refiner uses, replacing
// state-resolve-provider.sh (45 lines).
//
// Upstream declares SIX tiers; four are ported. Tiers 4 and 5 read
// `command -v mcp | grep -q "refiner_state"`, but `command -v` prints an
// executable's PATH, not the tools it offers — on a machine where mcp is
// installed it prints something like `/usr/local/bin/mcp`, which contains
// neither "refiner_state" nor "memory", so neither tier can fire whatever MCP
// servers are configured. Porting them would reproduce a latent bug and add code
// with no observed problem (A-2). MCP-backed state needs a real capability
// probe, which is a change with its own spec. Recorded in
// .prometheus/decisions.md.
//
// Two other upstream details do not survive: `grep` (absent on stock Windows and
// forbidden here) and `$HOME` read directly (paths.mjs is the only module
// allowed to ask the OS where things live).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { homeDir } from '../platform/paths.mjs';
import { readText } from '../platform/text.mjs';

// The filesystem provider is what actually runs today and is the documented
// default, so it is the floor of the waterfall rather than an error case.
const FILESYSTEM_DEFAULT = Object.freeze({
  provider_type: 'filesystem',
  config: { state_directory: '.refiner', scope: 'project' },
});

// A config that is absent, unreadable or malformed falls through to the next
// tier. Upstream `cat` would have emitted garbage downstream; failing over is
// the behaviour the tiers imply.
const readConfig = (file) => {
  if (!file || !existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readText(file));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export function resolveProvider({ cwd = process.cwd(), home, env = process.env } = {}) {
  const tiers = [
    // 1. Explicit override.
    env.REFINER_PROVIDER_CONFIG,
    // 2. Project-local.
    path.join(cwd, '.refiner-provider.json'),
    // 3. Global, via the platform helper so a test can inject a home root.
    path.join(home ?? homeDir(), '.refiner', 'provider.json'),
  ];

  for (const file of tiers) {
    const config = readConfig(file);
    if (config) return config;
  }

  // 4. Filesystem default.
  return FILESYSTEM_DEFAULT;
}
