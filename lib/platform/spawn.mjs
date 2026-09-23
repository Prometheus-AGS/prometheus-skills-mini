// Starting a child process, identically on Windows, macOS and Linux.
//
// The problem this solves: npm installs a CLI on Windows as `<name>.cmd`, and Node cannot run a
// `.cmd` or `.bat` without a shell AT ALL — it is documented, and since the 2024 security
// releases it fails with EINVAL. So "spawn with shell:false" and "resolve the .cmd shim" cannot
// both be satisfied, which is why this project's goal was revised. Instead: find the CLI's
// JavaScript entry and run it with the Node executable already running us. No shell, no quoting,
// no PATH lookup, and the same code path on every platform.
//
// There are deliberately only two functions and no escape hatch. A third "run anything through
// cmd.exe" helper would be the first thing reached for under deadline, and it is where argument
// escaping bugs and injection live.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const SCRIPT_EXTENSIONS = new Set(['.cmd', '.bat', '.ps1']);

const refuseScript = (name, resolvedFrom) => {
  if (!SCRIPT_EXTENSIONS.has(path.extname(name).toLowerCase())) return;
  const what = resolvedFrom ? `${resolvedFrom} resolves to ${name}` : name;
  throw new Error(
    `refusing to run ${what}: Node cannot run .cmd, .bat or .ps1 files without a shell, and this ` +
      'project never enables one. If it is an npm CLI, use spawnNodeCli(packageName, binName, args) ' +
      'to run its JavaScript entry instead.',
  );
};

/**
 * What a bare name resolves to on this PATH. On Windows, PATHEXT means a name like `tsc`
 * commonly resolves to `tsc.cmd`, which Node cannot start without a shell — so the refusal has
 * to look at the RESOLVED file, not just the spelling the caller used. Returns null when the
 * name is already a path or nothing is found.
 */
function lookupOnPath(name) {
  if (name.includes(path.sep) || name.includes('/')) return null;
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : [''];
  for (const directory of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(directory, name + extension);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

// App-owned scripts resolve their bundled dependencies while keeping the user's workspace cwd.
const requireFromProject = () => createRequire(path.join(
  process.env.PROMETHEUS_PACK_ROOT || process.cwd(), 'package.json',
));

/** The directory of an installed package, even when its `exports` hides package.json. */
function packageRoot(packageName) {
  const require = requireFromProject();
  try {
    return path.dirname(require.resolve(`${packageName}/package.json`));
  } catch (error) {
    if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
  }

  // The package restricts `exports` (openspec exports only '.'), so package.json is unreachable
  // by specifier. Walk up from the main entry to the first package.json that IS this package.
  let directory = path.dirname(require.resolve(packageName));
  while (directory !== path.dirname(directory)) {
    const manifest = path.join(directory, 'package.json');
    if (fs.existsSync(manifest)) {
      const { name } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (name === packageName) return directory;
    }
    directory = path.dirname(directory);
  }
  throw new Error(`cannot locate the package root of ${packageName}`);
}

/** Absolute path to the JavaScript file a package's `bin` entry points at. */
export function resolveNodeCli(packageName, binName) {
  const root = packageRoot(packageName);
  const { bin } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const relative = typeof bin === 'string' ? (binName === packageName ? bin : undefined) : bin?.[binName];

  if (!relative) {
    const available = typeof bin === 'string' ? packageName : Object.keys(bin ?? {}).join(', ') || '(none)';
    throw new Error(`${packageName} has no bin named "${binName}"; available: ${available}`);
  }
  return path.resolve(root, relative);
}

const assertArgs = (args) => {
  if (!Array.isArray(args)) throw new TypeError('arguments must be an args array, never a command string');
};

/** Run an npm-installed CLI through this Node executable. No shell, on any platform. */
export function spawnNodeCli(packageName, binName, args = [], options = {}) {
  assertArgs(args);
  return spawnSync(process.execPath, [resolveNodeCli(packageName, binName), ...args], {
    encoding: 'utf8',
    ...options,
    shell: false,
  });
}

/** Run a real executable (git, docker) by name. Never a script that needs an interpreter. */
export function spawnExecutable(name, args = [], options = {}) {
  assertArgs(args);
  if (/[\s]/.test(name) && !fs.existsSync(name)) {
    throw new TypeError(`"${name}" looks like a command string; pass the program and an args array separately`);
  }
  refuseScript(name);

  // A bare name may still resolve to a script: refuse on what it RESOLVES to, not its spelling.
  const { lookupOnPath: lookup = lookupOnPath, ...spawnOptions } = options;
  const resolved = lookup(name);
  if (resolved) refuseScript(resolved, name);

  return spawnSync(name, args, { encoding: 'utf8', ...spawnOptions, shell: false });
}
