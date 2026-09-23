#!/usr/bin/env node
// Port of adversarial-review/scripts/check-findings-sycophancy.sh (prometheus-skill-pack, 277 lines).
//
// Usage: node check-findings-sycophancy.mjs --findings <json> [--strictness <s>] [--counter-key <k>]
// Exit: 0 accepted/gate unavailable/soft cap · 1 invalid PROMETHEUS_ADV_REJECT_CAP · 2 rejected.
//
// This file wires the pure decision logic (lib/review/sycophancy-gate.mjs)
// to the stdio JSON-RPC dispatch (lib/review/sycophancy-binary.mjs) and does
// the file I/O + process spawn the pure modules deliberately do not.

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeDir } from '../../lib/platform/paths.mjs';
import { atomicWrite } from '../../lib/platform/atomic-write.mjs';
import {
  resolveRejectCap,
  hasEmptyFindingsTrail,
  renderReportText,
  extractScore,
  extractCritical,
  dropS03WhenFindingsPresent,
  shouldReject,
} from '../../lib/review/sycophancy-gate.mjs';
import { mapStrictness, buildJsonRpcRequests, findSycophancyBinary } from '../../lib/review/sycophancy-binary.mjs';

function parseArgs(argv) {
  const args = { findings: '', strictness: process.env.PROMETHEUS_REFLECT_STRICTNESS || 'strict', counterKey: 'adv-review' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--findings') args.findings = argv[++i];
    else if (argv[i] === '--strictness') args.strictness = argv[++i];
    else if (argv[i] === '--counter-key') args.counterKey = argv[++i];
  }
  return args;
}

function counterPath(key) {
  return path.join(homeDir(), '.prometheus', 'reflect-rejections', `${key}.txt`);
}

function readCounter(key) {
  const file = counterPath(key);
  if (!existsSync(file)) return 0;
  const raw = readFileSync(file, 'utf8').trim();
  return /^[0-9]+$/.test(raw) ? Number(raw) : 0;
}

function writeCounter(key, value) {
  const file = counterPath(key);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, String(value));
}

function clearCounter(key) {
  const file = counterPath(key);
  try {
    rmSync(file, { force: true });
  } catch {
    // best-effort
  }
}

function recordCap(findingsPath, doc, cap, overridden) {
  const next = { ...doc, sycophancy_screen: { reject_cap: cap, cap_overridden: overridden, cap_default: 2 } };
  atomicWrite(findingsPath, JSON.stringify(next, null, 2));
}

/** Run the sycophancy-correction binary over stdio MCP and return its raw response text. */
function analyzeViaBinary(bin, content, mcpStrictness) {
  return new Promise((resolve) => {
    const requests = buildJsonRpcRequests(content, mcpStrictness);
    const child = spawn(bin, [], { stdio: ['pipe', 'pipe', 'ignore'] });
    let out = '';
    child.stdout.on('data', (chunk) => (out += chunk.toString('utf8')));
    child.on('error', () => resolve(''));
    child.on('close', () => resolve(out));

    child.stdin.write(requests[0] + '\n');
    setTimeout(() => {
      child.stdin.write(requests[1] + '\n');
      setTimeout(() => {
        child.stdin.write(requests[2] + '\n');
        setTimeout(() => child.kill(), 3000);
      }, 100);
    }, 200);
  });
}

async function run(argv) {
  const { findings: findingsPath, strictness, counterKey } = parseArgs(argv);
  if (!existsSync(findingsPath)) {
    process.stderr.write('[adv-gate] WARN: findings file missing — gate skipped\n');
    return 0;
  }

  let doc;
  try {
    doc = JSON.parse(readFileSync(findingsPath, 'utf8'));
  } catch {
    process.stderr.write('[adv-gate] WARN: findings file unreadable — gate skipped\n');
    return 0;
  }

  const bin = findSycophancyBinary({});
  if (!bin) {
    process.stderr.write('[adv-gate] WARN: sycophancy-correction binary absent — gate skipped\n');
    return 0;
  }

  let cap, overridden;
  try {
    ({ cap, overridden } = resolveRejectCap(process.env));
  } catch (error) {
    process.stderr.write(`[adv-gate] ERROR: ${error.message}\n`);
    return 1;
  }

  const count = readCounter(counterKey);
  if (count >= cap) {
    process.stderr.write(`[adv-gate] WARN: soft cap reached (${count} consecutive rejections, cap ${cap}) — accepting report; review it manually\n`);
    clearCounter(counterKey);
    recordCap(findingsPath, doc, cap, overridden);
    return 0;
  }

  if (hasEmptyFindingsTrail(doc)) {
    const next = count + 1;
    writeCounter(counterKey, next);
    process.stderr.write(`[adv-gate] REJECTED (zero findings with no checked_classes trail, rejection ${next}/${cap})\n`);
    process.stdout.write(
      'Your previous findings report was rejected: it reported zero findings without\n' +
        'a due-diligence trail. A zero-finding report MUST include a non-empty\n' +
        'top-level "checked_classes" array enumerating each failure class you checked\n' +
        'and why it does not apply to this packet. Re-examine the packet; if you still\n' +
        'find nothing, prove the work.\n',
    );
    recordCap(findingsPath, doc, cap, overridden);
    return 2;
  }

  const reportText = renderReportText(doc);
  const mcpStrictness = mapStrictness(strictness);
  const rawResponse = await analyzeViaBinary(bin, reportText, mcpStrictness);
  if (!rawResponse) {
    process.stderr.write('[adv-gate] WARN: sycophancy analysis produced no response — gate skipped\n');
    return 0;
  }

  const score = extractScore(rawResponse);
  let critical = extractCritical(rawResponse);
  const nFindings = (doc.findings ?? []).length;
  if (nFindings >= 1) critical = dropS03WhenFindingsPresent(critical, nFindings);

  const { reject, reason } = shouldReject({ score, critical, nFindings });

  if (reject) {
    const next = count + 1;
    writeCounter(counterKey, next);
    process.stderr.write(`[adv-gate] REJECTED (${reason}, strictness=${strictness}, rejection ${next}/${cap})\n`);
    process.stdout.write(
      `Your previous findings report was rejected as insufficiently critical\n(${reason}). Re-examine the packet with these requirements:\n` +
        '- Every claim of correctness must cite specific evidence from the diff or artifact.\n' +
        '- If you report zero findings, you must enumerate the specific failure classes\n' +
        '  you checked for and why each does not apply — generic reassurance is not\n' +
        '  acceptable.\n' +
        '- Remove hedged praise; report problems plainly with severity, file, and evidence.\n',
    );
    recordCap(findingsPath, doc, cap, overridden);
    return 2;
  }

  clearCounter(counterKey);
  recordCap(findingsPath, doc, cap, overridden);
  process.stderr.write(`[adv-gate] PASS (score=${score ?? 'unknown'}, strictness=${strictness})\n`);
  return 0;
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
    process.exitCode = await run(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`[adv-gate] ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}
