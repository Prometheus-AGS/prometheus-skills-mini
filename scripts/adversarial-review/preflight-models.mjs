#!/usr/bin/env node
// Port of adversarial-review/scripts/preflight-models.sh (prometheus-skill-pack, 286 lines).
//
// Usage: node preflight-models.mjs [--force]
// Always exits 0 — the status field carries the verdict; preflight must
// never block the pipeline. Prints the preflight JSON on stdout.
//
// This file wires lib/review/preflight.mjs and lib/review/model-resolution.mjs
// to real filesystem/network I/O.

import { existsSync, readFileSync, statSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { homeDir } from '../../lib/platform/paths.mjs';
import { atomicWrite } from '../../lib/platform/atomic-write.mjs';
import { detectProviders, detectConfigDefects, computeStatus, isCacheFresh } from '../../lib/review/preflight.mjs';
import {
  parseModelsToml,
  resolveRoleAssignment,
  resolveGateway,
  resolvedModelIdentityKey,
} from '../../lib/review/model-resolution.mjs';

function findKbdRoot(start = process.cwd()) {
  let cursor = path.resolve(start);
  const top = path.parse(cursor).root;
  for (;;) {
    if (existsSync(path.join(cursor, '.kbd-orchestrator'))) return path.join(cursor, '.kbd-orchestrator');
    if (cursor === top) return null;
    cursor = path.dirname(cursor);
  }
}

async function probeEndpoint(url) {
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/models`, { signal: AbortSignal.timeout(5000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

function hints(status) {
  const table = {
    unavailable: 'liter-llm binary not found — run /liter-llm-bridge install (cross-model judging degrades to harness-native fallback until then)',
    no_gateway:
      'no OpenAI-compatible endpoint answered. Start the local proxy (openai-proxy on :8181) or `liter-llm api --config ~/.config/liter-llm/liter-llm-proxy.toml`, or set LITER_LLM_BASE_URL.',
    config_broken: 'the liter-llm config exists but cannot serve a request — see config_defects. Repair with /liter-llm-bridge configure',
    needs_configure: 'no judge role resolves — run /liter-llm-bridge configure to seed ~/.prometheus/kbd/models.toml',
    degraded: 'only one distinct dispatchable model — judge may equal producer (JUDGE_MODEL_COLLISION expected); configure a second provider/model',
  };
  return table[status];
}

async function run(argv) {
  const force = argv.includes('--force');
  const kbdRoot = findKbdRoot();
  const cache = kbdRoot ? path.join(kbdRoot, 'model-preflight.json') : null;
  const configPath = process.env.LITER_LLM_CONFIG || path.join(homeDir(), '.config', 'liter-llm', 'liter-llm-proxy.toml');
  const modelsTomlPath =
    process.env.PROMETHEUS_KBD_MODELS_CONFIG || path.join(homeDir(), '.prometheus', 'kbd', 'models.toml');

  if (!force && cache && existsSync(cache)) {
    try {
      const cacheStat = statSync(cache);
      const configMtime = existsSync(configPath) ? statSync(configPath).mtimeMs : null;
      const modelsMtime = existsSync(modelsTomlPath) ? statSync(modelsTomlPath).mtimeMs : null;
      if (
        isCacheFresh({
          cacheMtimeMs: cacheStat.mtimeMs,
          configMtimeMs: configMtime,
          modelsMtimeMs: modelsMtime,
          nowMs: Date.now(),
        })
      ) {
        process.stdout.write(readFileSync(cache, 'utf8'));
        return;
      }
    } catch {
      // fall through to recompute
    }
  }

  const modelsToml = parseModelsToml(existsSync(modelsTomlPath) ? readFileSync(modelsTomlPath, 'utf8') : '');
  const configText = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';

  const { providers, coverage } = detectProviders(process.env);
  const configDefects = detectConfigDefects(configText);
  const gateway = await resolveGateway({ env: process.env, modelsToml, probe: probeEndpoint });
  const judge = resolveRoleAssignment('judge', { env: process.env, modelsToml });
  const critic = resolveRoleAssignment('critic', { env: process.env, modelsToml });
  const backup = resolveRoleAssignment('backup', { env: process.env, modelsToml });
  const generator = resolveRoleAssignment('generator', { env: process.env, modelsToml });

  const dispatchable = new Set(
    [judge, critic, backup].map((assignment) => resolvedModelIdentityKey(assignment.identity)).filter(Boolean),
  );
  const status = computeStatus({
    binaryPresent: true, // JUDGMENT CALL: the mini has no `liter-llm` binary concept (Node speaks REST
    // directly via fetch), so "binary present" is always true here — the real
    // unavailability signal is no_gateway, which subsumes it. See report.
    gateway: gateway ?? '',
    configDefects,
    judgeModel: judge.alias,
    distinctModels: dispatchable.size,
  });

  const report = {
    status,
    gateway: gateway ?? '',
    roles: {
      judge: { alias: judge.alias, identity: judge.identity, source: judge.source },
      critic: { alias: critic.alias, identity: critic.identity, source: critic.source },
      backup: { alias: backup.alias, identity: backup.identity, source: backup.source },
      generator: { alias: generator.alias, identity: generator.identity, source: generator.source },
    },
    providers_detected: Object.entries(providers)
      .filter(([, v]) => v.present)
      .map(([id]) => id),
    classes_available: ['small', 'medium', 'frontier'].filter((c) => coverage[c].length),
    distinct_models: dispatchable.size,
    config_path: configPath,
    config_exists: existsSync(configPath),
    config_defects: configDefects,
    checked_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  };

  const hint = hints(status);
  if (hint) process.stderr.write(`[preflight] WARN ${status}: ${hint}\n`);

  const text = JSON.stringify(report, null, 2);
  process.stdout.write(`${text}\n`);
  if (cache) {
    try {
      atomicWrite(cache, text);
    } catch {
      // caching is advisory; never fail the run over it
    }
  }
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  await run(process.argv.slice(2));
  process.exitCode = 0; // preflight is advisory by contract — always exits 0
}
