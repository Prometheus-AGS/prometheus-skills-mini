#!/usr/bin/env node
// Port of adversarial-review/scripts/dispatch-judge.sh (prometheus-skill-pack, 379 lines).
//
// Usage:
//   node dispatch-judge.mjs --mode diff|artifact|skill|agent|decision --packet <packet.json>
//     [--mandate <mandate.md>] [--feedback <rejection.md>] [--out <findings.json>]
//
// Exit codes:
//   0  findings written (isolation_mode=rest-gateway:<url>)
//   2  judge responded but output failed schema-shape validation
//   3  gateway unavailable — caller must fall back to a harness-native
//      fresh-context subagent and record isolation_mode=harness-native
//   4  no judge possible — caller records a cumulative pending_review receipt
//
// This file wires lib/review/model-resolution.mjs, lib/review/judge-client.mjs
// and lib/review/judge-findings.mjs to real filesystem/network I/O. python3 ->
// plain JS object construction; curl -> Node's built-in fetch.

import { existsSync, readFileSync, mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { homeDir } from '../../lib/platform/paths.mjs';
import { atomicWrite } from '../../lib/platform/atomic-write.mjs';
import {
  parseModelsToml,
  resolveRoleAssignment,
  resolveGateway,
  selectIndependentReviewer,
} from '../../lib/review/model-resolution.mjs';
import { dispatchJudge, JudgeUnavailableError } from '../../lib/review/judge-client.mjs';
import { extractJsonFromCompletion, normalizeFindings } from '../../lib/review/judge-findings.mjs';

const MODES = ['diff', 'artifact', 'skill', 'agent', 'decision'];

function parseArgs(argv) {
  const args = { mode: '', packet: '', mandate: '', feedback: '', out: '' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--mode') args.mode = argv[++i];
    else if (argv[i] === '--packet') args.packet = argv[++i];
    else if (argv[i] === '--mandate') args.mandate = argv[++i];
    else if (argv[i] === '--feedback') args.feedback = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else throw new UsageError();
  }
  if (!MODES.includes(args.mode)) throw new UsageError();
  if (!args.packet) throw new UsageError();
  return args;
}

class UsageError extends Error {
  constructor() {
    super('usage: dispatch-judge.mjs --mode diff|artifact|skill|agent|decision --packet <json> [--mandate <md>] [--feedback <md>] [--out <json>]');
  }
}
class ExitError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
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

async function readAvailableAliases(baseUrl, authToken) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      headers: { authorization: `Bearer ${authToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return new Set((Array.isArray(body?.data) ? body.data : []).map((model) => model?.id).filter(Boolean));
  } catch {
    return null;
  }
}

async function run(argv) {
  const { mode, packet: packetPath, mandate: mandateArg, feedback: feedbackArg, out } = parseArgs(argv);

  if (!existsSync(packetPath)) throw new ExitError(4, `packet not found: ${packetPath}`);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const mandatePath = mandateArg || path.join(scriptDir, '..', '..', 'skills', 'adversarial-review', 'assets', `reviewer-mandate-${mode}.md`);
  if (!existsSync(mandatePath)) throw new ExitError(4, `mandate not found: ${mandatePath}`);

  // --- judge transport -----------------------------------------------------
  const modelsTomlPath =
    process.env.PROMETHEUS_KBD_MODELS_CONFIG || path.join(homeDir(), '.prometheus', 'kbd', 'models.toml');
  const modelsToml = parseModelsToml(existsSync(modelsTomlPath) ? readFileSync(modelsTomlPath, 'utf8') : '');

  const gatewayBaseUrl = await resolveGateway({ env: process.env, modelsToml, probe: probeEndpoint });
  if (!gatewayBaseUrl) {
    process.stderr.write(
      '[judge] WARN: no OpenAI-compatible endpoint reachable (set\n' +
        '[judge]       LITER_LLM_BASE_URL, or start one) — fall back to a\n' +
        '[judge]       harness-native fresh-context subagent (prompt = mandate +\n' +
        '[judge]       packet, nothing else) and record isolation_mode=harness-native\n',
    );
    throw new ExitError(3);
  }

  // --- model resolution + collision check -----------------------------------
  const packetRaw = readFileSync(packetPath, 'utf8');
  let packetDoc;
  try {
    packetDoc = JSON.parse(packetRaw);
  } catch {
    packetDoc = {};
  }
  const producer = packetDoc.producer_model || 'unknown';
  const producerIdentity = packetDoc.producer_identity ?? null;
  const authToken = process.env.LITER_LLM_MASTER_KEY || process.env.OPENAI_API_KEY || 'sk-local';
  const availableAliases = await readAvailableAliases(gatewayBaseUrl, authToken);
  const assignments = Object.fromEntries(
    ['critic', 'judge', 'backup'].map((role) => [
      role,
      resolveRoleAssignment(role, { env: process.env, modelsToml }),
    ]),
  );
  const selection = selectIndependentReviewer({ assignments, producerIdentity, availableAliases });
  if (!selection.assignment) {
    process.stderr.write(
      `[judge] WARN: JUDGE_MODEL_COLLISION — ${selection.reason}; no distinct available backup is configured.\n` +
        '[judge]       Review remains pending until critic, judge, backup and producer resolve to canonical identities.\n',
    );
    throw new ExitError(4);
  }
  const judgeModel = selection.assignment.alias;
  const judgeIdentity = selection.assignment.identity;
  if (selection.selectedRole === 'backup') {
    process.stderr.write(
      `[judge] NOTE: judge collision, missing identity, or unavailability detected — switching to configured backup '${judgeModel}'\n`,
    );
  }
  if (selection.status === 'degraded') {
    process.stderr.write(`[judge] WARN: review independence is degraded: ${selection.reason}\n`);
  }

  if (producer === 'unknown') {
    process.stderr.write(
      '[judge] WARN: PRODUCER_UNKNOWN — packet carries no producer_model, so the\n' +
        '[judge]       judge!=producer check cannot be enforced for this review.\n',
    );
  }

  process.stderr.write(`[MODEL_ROUTING] phase=adv-review-judge class=frontier model=${judgeModel} producer=${producer}\n`);

  // --- build prompts + dispatch (fresh context: mandate + packet ONLY) ------
  let system = readFileSync(mandatePath, 'utf8');
  if (feedbackArg && existsSync(feedbackArg)) {
    system += '\n\n## Previous report rejected — address this feedback\n\n' + readFileSync(feedbackArg, 'utf8');
  }

  const timeoutMs = process.env.ADV_JUDGE_TIMEOUT ? Number(process.env.ADV_JUDGE_TIMEOUT) * 1000 : 300_000;
  const maxAttempts = process.env.ADV_JUDGE_RETRIES ? Number(process.env.ADV_JUDGE_RETRIES) : 3;

  let completion;
  try {
    completion = await dispatchJudge({
      baseUrl: gatewayBaseUrl,
      authToken,
      model: judgeModel,
      system,
      packet: packetRaw,
      maxAttempts,
      initialTimeoutMs: timeoutMs,
    });
  } catch (error) {
    if (error instanceof JudgeUnavailableError) {
      process.stderr.write(`[judge] ERROR: ${error.message}\n`);
      throw new ExitError(3);
    }
    throw error;
  }

  // --- normalize + shape-check ------------------------------------------------
  const extracted = extractJsonFromCompletion(completion);
  let normalized;
  try {
    normalized = normalizeFindings(extracted, {
      mode,
      judgeModel,
      judgeIdentity,
      producer,
      producerIdentity,
      endpoint: gatewayBaseUrl,
    });
  } catch (error) {
    process.stderr.write(`[judge] ERROR: ${error.message}\n`);
    throw new ExitError(2, 'unusable judge output');
  }

  const text = JSON.stringify(normalized, null, 2);
  if (out) {
    mkdirSync(path.dirname(out), { recursive: true });
    atomicWrite(out, text + '\n');
    process.stderr.write(`[judge] wrote ${out}\n`);
  } else {
    process.stdout.write(`${text}\n`);
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
  try {
    await run(process.argv.slice(2));
    process.exitCode = 0;
  } catch (error) {
    if (error instanceof ExitError) {
      if (error.message) process.stderr.write(`[judge] ERROR: ${error.message}\n`);
      process.exitCode = error.code;
    } else if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 4;
    } else {
      process.stderr.write(`[judge] ERROR: ${error.message}\n`);
      process.exitCode = 4;
    }
  }
}
