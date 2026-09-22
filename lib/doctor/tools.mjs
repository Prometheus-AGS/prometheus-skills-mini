// Optional tools: the Karpathy CLI and the sycophancy-correction binary.
//
// Both are optional, so absent is a WARNING with the next step. A failure means the tool
// is present and broken, or present and misconfigured in a way that would send work
// somewhere it must not go.

import { existsSync, readFileSync } from 'node:fs';
import { spawnExecutable } from '../platform/spawn.mjs';

/** The gateway the critic and judge must use. Project rule: exactly one, on :4000. */
const GATEWAY = 'http://localhost:4000/v1';

/** Is this executable on PATH? `where` on Windows; `which` elsewhere (`command -v` is a shell builtin). */
const resolveOnPath = (spawn, platform) => (name) => {
  const result = spawn(platform === 'win32' ? 'where' : 'which', [name]);
  const out = String(result?.stdout ?? '').trim();
  return result?.status === 0 && out !== '' ? out.split(/\r?\n/)[0] : null;
};

export const checks = [
  {
    id: 'mini-pk',
    title: 'Karpathy CLI (pk)',
    offers: [],
    fixes: {},
    async run(ctx = {}) {
      const spawn = ctx.spawn ?? spawnExecutable;
      const resolve = ctx.resolve ?? resolveOnPath(spawn, ctx.platform ?? process.platform);

      const result = spawn('pk', ['--version']);
      if (result?.status === 0) {
        return { status: 'pass', summary: `pk ${String(result.stdout ?? '').trim().replace(/^pk\s*/i, '')}`.trim() };
      }

      // Distinguish "not installed" from "installed and broken": only the second is a
      // fault of this machine. Resolution is a separate question from execution, and it
      // must run in BOTH cases — an earlier version only resolved when a resolver was
      // injected, so by default a present-but-crashing pk reported "pk is not installed",
      // which is both the wrong status and a false statement.
      const where = resolve('pk');
      if (where) {
        return {
          status: 'fail',
          summary: `pk is installed at ${where} but exited ${result?.status}`,
          detail: String(result?.stderr ?? '').trim() || 'No stderr.',
        };
      }
      return {
        status: 'warn',
        summary: 'pk is not installed',
        detail: 'Karpathy logging degrades without it. Build it from tools/prometheus-knowledge.',
      };
    },
  },

  {
    id: 'mini-sycophancy-correction',
    title: 'sycophancy-correction',
    offers: [],
    fixes: {},
    async run(ctx = {}) {
      const spawn = ctx.spawn ?? spawnExecutable;
      const resolve =
        ctx.resolve ??
        ((name) => process.env.SYCOPHANCY_BIN ?? resolveOnPath(spawn, ctx.platform ?? process.platform)(name));

      const binary = resolve('sycophancy');

      // A path is not a binary. SYCOPHANCY_BIN is an env var a human sets, and a stale or
      // mistyped one used to produce `pass: sycophancy-correction at <path>` for a file
      // that does not exist — an assertion about something never looked at. A path that
      // was explicitly configured and is wrong is a FAILURE, not an absence: the operator
      // believes it is set up.
      if (binary && !(ctx.exists ?? existsSync)(binary)) {
        return {
          status: 'fail',
          summary: `sycophancy-correction is configured at ${binary}, but nothing is there`,
          detail: 'Correct SYCOPHANCY_BIN, or unset it to fall back to PATH.',
        };
      }

      if (!binary) {
        return {
          status: 'warn',
          summary: 'sycophancy-correction is not installed',
          detail:
            'The anti-theater gate degrades to a warning without it (rules/review.md E-5). Change `sycophancy-correction-vendored` vendors it.',
        };
      }

      // Its configured gateway must be the one gateway this project has. Another one
      // would silently route review traffic off-box, which is a fault, not a preference.
      const tomlPath = ctx.skillToml?.() ?? null;
      if (tomlPath && existsSync(tomlPath)) {
        const text = readFileSync(tomlPath, 'utf8');
        const named = /gateway\s*=\s*["']([^"']+)["']/.exec(text)?.[1];
        if (named && named !== GATEWAY) {
          return {
            status: 'fail',
            summary: `sycophancy-correction is configured for ${named}, not ${GATEWAY}`,
            detail: `${tomlPath} must name the local gateway on port 4000.`,
          };
        }
      }
      return { status: 'pass', summary: `sycophancy-correction at ${binary}` };
    },
  },
];
