#!/usr/bin/env node
// Port of adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).
//
// Usage:
//   node build-review-packet.mjs --mode diff     --phase <phase> --target <change-id>       [--out <path>]
//   node build-review-packet.mjs --mode artifact --phase <phase> --target assess|analyze|spec|plan [--out <path>]
//   node build-review-packet.mjs --mode artifact --target research --package <package-dir> [--phase <phase>] [--out <path>]
//   node build-review-packet.mjs --mode skill    --target <skill-dir>     [--intent <file>] [--out <path>]
//   node build-review-packet.mjs --mode agent    --target <workspace-dir> [--intent <file>] [--out <path>]
//   node build-review-packet.mjs --mode decision --target <decision.md>    [--intent <file>] [--out <path>]
//
// Exit codes: 0 ok · 1 usage · 2 missing inputs.
//
// This file owns all disk/git/pk I/O; the pure assembly logic lives in
// lib/review/packet-builder/*.mjs.

import { existsSync, readFileSync, readdirSync, mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { atomicWrite } from '../../lib/platform/atomic-write.mjs';
import { spawnExecutable } from '../../lib/platform/spawn.mjs';
import { resolveProducerModel } from '../../lib/review/packet-builder/producer-model.mjs';
import { buildFileTree } from '../../lib/review/packet-builder/file-tree.mjs';
import {
  buildDiffPacket,
  buildSkillPacket,
  buildAgentPacket,
  buildDecisionPacket,
  buildArtifactPacket,
} from '../../lib/review/packet-builder/packet.mjs';
import { buildResearchPacket } from '../../lib/review/packet-builder/research-packet.mjs';

const MODES = ['diff', 'artifact', 'skill', 'agent', 'decision'];

class UsageError extends Error {}
class MissingInputError extends Error {}

function parseArgs(argv) {
  const args = { mode: '', phase: '', target: '', out: '', intent: '', package: '' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--mode') args.mode = argv[++i];
    else if (argv[i] === '--phase') args.phase = argv[++i];
    else if (argv[i] === '--target') args.target = argv[++i];
    else if (argv[i] === '--intent') args.intent = argv[++i];
    else if (argv[i] === '--package') args.package = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else throw new UsageError(`unknown argument: ${argv[i]}`);
  }
  if (!MODES.includes(args.mode)) throw new UsageError('--mode must be diff, artifact, skill, agent, or decision');
  if (!args.target) throw new UsageError('--target is required');
  return args;
}

function findKbdRoot(start = process.cwd()) {
  let cursor = path.resolve(start);
  const top = path.parse(cursor).root;
  for (;;) {
    if (existsSync(path.join(cursor, '.kbd-orchestrator'))) return path.join(cursor, '.kbd-orchestrator');
    if (cursor === top) return null;
    cursor = path.dirname(cursor);
  }
}

function gitRunner(cwd) {
  return (gitArgs) => {
    const result = spawnExecutable('git', gitArgs, { cwd });
    return { status: result.status ?? 1, stdout: result.stdout ?? '' };
  };
}

function readIntent(intentArg, target) {
  if (intentArg && existsSync(intentArg)) return readFileSync(intentArg, 'utf8');
  const local = path.join(target, '.intent.md');
  if (existsSync(local)) return readFileSync(local, 'utf8');
  process.stderr.write(
    '[packet] WARN: no --intent supplied; the judge cannot check the artifact\n' +
      '[packet]       against what was requested, only against itself.\n',
  );
  return null;
}

function readChangeFiles(changeDir) {
  if (!changeDir) return {};
  const out = {};
  for (const name of ['tasks.md', 'spec.md', 'proposal.md', 'verification.md']) {
    const p = path.join(changeDir, name);
    if (existsSync(p)) out[name] = readFileSync(p, 'utf8');
  }
  return out;
}

function readChangeFilesList(changeDir) {
  const p = path.join(changeDir ?? '', 'files.txt');
  if (changeDir && existsSync(p)) {
    return readFileSync(p, 'utf8').split('\n').filter(Boolean);
  }
  return [];
}

function findPriorDecisions(target) {
  const q = path
    .basename(target)
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ');
  const result = spawnSync('pk', ['search', q], { encoding: 'utf8' });
  if (result.status === 0 && result.stdout) {
    return result.stdout.split('\n').slice(0, 40).join('\n');
  }
  return null;
}

function writePacket(packet, out) {
  const text = JSON.stringify(packet, null, 2);
  if (out) {
    mkdirSync(path.dirname(out), { recursive: true });
    atomicWrite(out, text + '\n');
    process.stderr.write(`[packet] wrote ${out}\n`);
  } else {
    process.stdout.write(`${text}\n`);
  }
}

function run(argv) {
  const { mode, phase, target, out, intent, package: packageDir } = parseArgs(argv);
  const researchTarget = mode === 'artifact' && target === 'research';

  if (researchTarget) {
    if (!packageDir) throw new UsageError('--package <dir> is required for --target research');
    if (!existsSync(packageDir)) throw new MissingInputError(`research package not found: ${packageDir}`);
  } else if (['diff', 'artifact'].includes(mode) && !phase) {
    throw new UsageError(`--phase is required for --mode ${mode}`);
  }

  const kbdRoot = findKbdRoot();
  const repoRoot = kbdRoot ? path.dirname(kbdRoot) : process.cwd();
  const phaseDir = kbdRoot && phase && existsSync(path.join(kbdRoot, 'phases', phase)) ? path.join(kbdRoot, 'phases', phase) : null;

  if (['diff', 'artifact'].includes(mode) && !researchTarget) {
    if (!kbdRoot) throw new MissingInputError(`.kbd-orchestrator not found above ${process.cwd()}`);
    if (!phaseDir) throw new MissingInputError(`phase dir not found: ${path.join(kbdRoot ?? '', 'phases', phase)}`);
  }
  if (['skill', 'agent'].includes(mode) && !existsSync(target)) {
    throw new MissingInputError(`--target must be an existing directory for --mode ${mode}: ${target}`);
  }
  if (mode === 'decision' && !existsSync(target)) {
    throw new MissingInputError(`--target must be an existing FILE for --mode decision: ${target}`);
  }

  process.stderr.write('[MODEL_ROUTING] phase=adv-review-packet class=small\n');

  let producer;
  if (phaseDir) {
    let progress = null;
    const progressPath = path.join(phaseDir, 'progress.json');
    if (existsSync(progressPath)) {
      try {
        progress = JSON.parse(readFileSync(progressPath, 'utf8'));
      } catch {
        progress = null;
      }
    }
    producer = resolveProducerModel({ progressJson: progress, env: process.env });
  } else {
    producer = resolveProducerModel({ progressJson: null, env: process.env });
  }
  if (producer.warning) process.stderr.write(`[packet] WARN: ${producer.warning}\n`);

  const constraints = kbdRoot && existsSync(path.join(kbdRoot, 'constraints.md')) ? readFileSync(path.join(kbdRoot, 'constraints.md'), 'utf8') : null;

  let treeRoot = repoRoot;
  if (mode === 'skill' || mode === 'agent') treeRoot = target;
  else if (mode === 'decision') treeRoot = path.dirname(path.resolve(target));
  if (researchTarget) treeRoot = packageDir;
  const fileTree = buildFileTree(treeRoot);

  let packet;

  if (researchTarget) {
    const reportPath = path.join(packageDir, 'report.md');
    if (!existsSync(reportPath)) throw new MissingInputError(`no report.md in ${packageDir}`);
    const provenanceCandidate = readdirSync(packageDir).find((f) => f.endsWith('.provenance.md'));
    if (!provenanceCandidate) throw new MissingInputError(`no <slug>.provenance.md in ${packageDir}`);
    const planPath = path.join(packageDir, 'plan.md');
    if (!existsSync(planPath)) throw new MissingInputError(`no plan.md in ${packageDir}`);

    let checkpoint = {};
    const checkpointPath = path.join(packageDir, 'checkpoint.json');
    if (existsSync(checkpointPath)) {
      try {
        checkpoint = JSON.parse(readFileSync(checkpointPath, 'utf8'));
      } catch {
        checkpoint = {};
      }
    }
    const planText = readFileSync(planPath, 'utf8');
    const subMatch = /^## Sub-questions\s*$\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(planText);
    const subs = subMatch
      ? subMatch[1]
          .split('\n')
          .filter((l) => l.trim().startsWith('- '))
          .map((l) => l.trim().slice(2))
      : [];

    const goalsLines = ['# Goals of this research run', ''];
    goalsLines.push(`- **Query:** ${checkpoint.query || '(not recorded in checkpoint.json)'}`);
    for (const k of ['depth', 'scale', 'citation_style']) {
      if (checkpoint[k] !== undefined) goalsLines.push(`- **${k}:** ${checkpoint[k]}`);
    }
    if (checkpoint.kb_ids) goalsLines.push(`- **Knowledge bases:** ${checkpoint.kb_ids.join(', ')}`);
    if (checkpoint.stages_completed) goalsLines.push(`- **Stages completed:** ${checkpoint.stages_completed.join(' ')}`);
    goalsLines.push('', '## Sub-questions the report must answer', '');
    goalsLines.push(subs.length ? subs.map((s) => `- ${s}`).join('\n') : '- (plan.md has no sub-question bullets)');

    packet = buildResearchPacket({
      packageDir,
      reportText: readFileSync(reportPath, 'utf8'),
      provenanceText: readFileSync(path.join(packageDir, provenanceCandidate), 'utf8'),
      planText,
      goalsText: goalsLines.join('\n'),
      producer,
      fileTree,
      constraints,
    });
  } else if (mode === 'diff') {
    let changeDir = null;
    for (const cand of [path.join(kbdRoot, 'changes', target), path.join(repoRoot, 'openspec', 'changes', target)]) {
      if (existsSync(cand)) {
        changeDir = cand;
        break;
      }
    }
    const files = readChangeFilesList(changeDir);
    const reviewExcludePath = `.kbd-orchestrator/phases/${phase}/review/${target}`;
    try {
      packet = buildDiffPacket({
        phase,
        target,
        files,
        reviewExcludePath,
        changeFiles: readChangeFiles(changeDir),
        producer,
        fileTree,
        constraints,
        git: gitRunner(repoRoot),
      });
    } catch (error) {
      throw new MissingInputError(error.message);
    }
  } else if (mode === 'skill') {
    try {
      packet = buildSkillPacket({
        target,
        intentText: readIntent(intent, target),
        validatorOutput: null,
        producer,
        fileTree,
        constraints,
      });
    } catch (error) {
      throw new MissingInputError(error.message);
    }
  } else if (mode === 'agent') {
    try {
      packet = buildAgentPacket({
        target,
        intentText: readIntent(intent, target),
        producer,
        fileTree,
        constraints,
        cargoCheckOutput: existsSync(path.join(target, '.cargo-check.txt')) ? readFileSync(path.join(target, '.cargo-check.txt'), 'utf8') : null,
      });
    } catch (error) {
      throw new MissingInputError(error.message);
    }
  } else if (mode === 'decision') {
    packet = buildDecisionPacket({
      target,
      intentText: intent && existsSync(intent) ? readFileSync(intent, 'utf8') : null,
      priorDecisionsText: findPriorDecisions(target),
      producer,
      fileTree,
      constraints,
    });
  } else {
    // artifact mode, non-research
    const artsByTarget = {
      assess: ['assessment.md'],
      analyze: ['analysis.md', 'library-candidates.json'],
      plan: ['plan.md'],
      spec: [],
    };
    if (!(target in artsByTarget)) {
      throw new UsageError('artifact --target must be assess|analyze|spec|plan|research (research needs --package)');
    }

    const parts = [];
    if (target === 'spec') {
      const changesRoot = path.join(kbdRoot, 'changes');
      const handoffPath = path.join(phaseDir, 'handoffs', 'spec.handoff.json');
      const handoffText = existsSync(handoffPath) ? readFileSync(handoffPath, 'utf8') : null;
      if (existsSync(changesRoot)) {
        for (const changeName of readdirSync(changesRoot).sort()) {
          if (handoffText && !handoffText.includes(changeName)) continue;
          for (const f of ['spec.md', 'tasks.json', 'verification.md']) {
            const p = path.join(changesRoot, changeName, f);
            if (existsSync(p)) parts.push(`===== ${changeName}/${f} =====\n${readFileSync(p, 'utf8')}\n`);
          }
        }
      }
    }
    for (const a of artsByTarget[target]) {
      const p = path.join(phaseDir, a);
      if (existsSync(p)) parts.push(`===== ${a} =====\n${readFileSync(p, 'utf8')}\n`);
    }
    if (!parts.length) throw new MissingInputError(`no artifacts found for stage ${target} in ${phaseDir}`);

    const goalsPath = path.join(phaseDir, 'goals.md');
    const goalsText = existsSync(goalsPath) ? readFileSync(goalsPath, 'utf8') : null;

    let handoffsText = null;
    const handoffsDir = path.join(phaseDir, 'handoffs');
    if (existsSync(handoffsDir)) {
      const handoffParts = readdirSync(handoffsDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => `===== ${f} =====\n${readFileSync(path.join(handoffsDir, f), 'utf8')}\n`);
      if (handoffParts.length) handoffsText = handoffParts.join('\n');
    }

    packet = buildArtifactPacket({
      phase,
      target,
      artifactText: parts.join('\n'),
      goalsText,
      handoffsText,
      producer,
      fileTree,
      constraints,
      repoRoot,
    });
  }

  writePacket(packet, out);
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
    run(process.argv.slice(2));
    process.exitCode = 0;
  } catch (error) {
    process.stderr.write(`[packet] ERROR: ${error.message}\n`);
    process.exitCode = error instanceof UsageError ? 1 : 2;
  }
}
