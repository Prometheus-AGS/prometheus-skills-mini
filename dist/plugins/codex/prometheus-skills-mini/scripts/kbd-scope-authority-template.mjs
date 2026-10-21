#!/usr/bin/env node
// kbd-scope-authority-template.mjs — print the canonical manifest an operator signs to
// authorize a material phase-scope change (mini #66; port of the full pack's
// shared/scripts/kbd-scope-authority-template.sh, issue #192). It NEVER signs: the signature
// is the operator's act, made with their own key.
//
// Usage:
//   node scripts/kbd-scope-authority-template.mjs amend-contract --phase <id> --contract <rel-path>
//       --reason "<why>" [--approver <principal>]
//   node scripts/kbd-scope-authority-template.mjs start-successor --phase <closed-id>
//       --successor <id> --title "<title>" --reason "<why>" [--approver <principal>]
//
// Every identity field is read from canonical state, so a manifest authorizes only the exact
// change it names. Output: canonical JSON plus one newline on stdout; the signing command on
// stderr. The approver must appear in ~/.config/prometheus/kbd-scope-allowed-signers with
// namespaces="prometheus-kbd-scope-amendment".
//
// Exit codes: 0 printed; 1 usage/io; 2 canonical state does not permit it.

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { contractDigest, scenarioDigests, stableStringify } from '../lib/kbd/adopted-contract.mjs';
import { findKbdRoot, readCanonicalStatus } from '../lib/kbd/contract-adopt.mjs';
import { readDisposition } from '../lib/kbd/phase-disposition.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const NAMESPACE = 'prometheus-kbd-scope-amendment';
const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;

function fail(message, status = 1) {
  process.stderr.write(`kbd-scope-authority-template: ${message}\n`);
  process.exit(status);
}

const [action, ...rest] = process.argv.slice(2);
const opts = {};
for (let i = 0; i < rest.length; i += 2) {
  const key = rest[i]?.replace(/^--/, '');
  if (!['phase', 'contract', 'successor', 'title', 'reason', 'approver'].includes(key)) fail(`unknown argument: ${rest[i]}`);
  opts[key] = rest[i + 1] ?? '';
}
if (!['amend-contract', 'start-successor'].includes(action)) fail('action must be amend-contract or start-successor');
if (!opts.phase) fail('--phase is required');
if (!opts.reason || opts.reason.trim().length < 10) fail('--reason is required (at least 10 characters)');
const approver = opts.approver || spawnExecutable('git', ['config', 'user.email'])?.stdout?.trim();
if (!approver) fail('--approver is required');
for (const value of [opts.reason, approver, opts.title ?? '', opts.successor ?? '', opts.contract ?? '']) {
  if (!PRINTABLE_ASCII.test(value)) fail('manifest text must be printable ASCII');
}

const root = findKbdRoot(process.cwd());
if (!root) fail(`no .kbd-orchestrator above ${process.cwd()}`);
const status = readCanonicalStatus({ root });
if (status.status !== 0) fail(status.stderr);
const disposition = readDisposition({ root, phase: opts.phase });
if (disposition.status !== 0) fail(disposition.stderr);
const view = disposition.json;
const manifest = {
  schemaVersion: '1', kind: 'kbd.scope-authority', namespace: NAMESPACE, action,
  projectId: status.json.projectId, runId: status.json.runId, phaseId: opts.phase,
  reason: opts.reason, approver, timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  nonce: randomBytes(16).toString('hex'),
};

if (action === 'amend-contract') {
  if (!opts.contract) fail('--contract is required for amend-contract');
  const file = path.join(root, opts.contract);
  if (!existsSync(file)) fail(`contract not found: ${file}`);
  if (!view.binding) fail(`phase ${opts.phase} is not bound; adopt it first (no amendment needed)`, 2);
  const contract = JSON.parse(readFileSync(file, 'utf8'));
  const next = scenarioDigests(contract);
  const previous = view.binding.scenarioDigests ?? {};
  const digest = contractDigest(contract);
  if (digest === view.binding.contractDigest) fail('contract is unchanged from the bound digest; nothing to amend', 2);
  Object.assign(manifest, {
    contractPath: opts.contract,
    previousContractDigest: view.binding.contractDigest,
    newContractDigest: digest,
    scenarioChanges: {
      added: Object.keys(next).filter((id) => !(id in previous)).sort(),
      modified: Object.keys(next).filter((id) => id in previous && previous[id] !== next[id]).sort(),
      removed: Object.keys(previous).filter((id) => !(id in next)).sort(),
    },
  });
} else {
  if (!opts.successor || !opts.title) fail('--successor and --title are required for start-successor');
  if (view.disposition !== 'CLOSED') fail(`phase ${opts.phase} is not CLOSED; a successor starts only from a closed phase`, 2);
  if (view.successor?.phaseId) fail(`phase ${opts.phase} already has a successor`, 2);
  Object.assign(manifest, {
    predecessorClosureKey: view.closure.closureKey,
    successorPhaseId: opts.successor,
    successorTitle: opts.title,
  });
}
process.stdout.write(`${stableStringify(manifest)}\n`);
process.stderr.write(`Sign with: ssh-keygen -Y sign -f <operator-private-key> -n ${NAMESPACE} <manifest-file>\n`);
