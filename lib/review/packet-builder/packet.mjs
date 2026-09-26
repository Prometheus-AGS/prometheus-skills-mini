// Port of the top-level packet assembly inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines):
// mode dispatch and field selection, composing the pieces already ported into
// truncation.mjs, manifest-guard.mjs, decision-fields.mjs, skill-manifest.mjs,
// agent-manifest.mjs, cited-paths.mjs, diff-assembler.mjs and producer-model.mjs.
//
// Each build*Packet function takes already-read file contents (never reads a
// file itself except where a target directory must be walked for its own
// manifest — skill/agent modes) so the CLI entry point
// (scripts/adversarial-review/build-review-packet.mjs) owns all disk/git I/O
// and these stay easy to test.

import path from 'node:path';
import { applyFieldCap } from './truncation.mjs';
import { checkManifestLevel } from './manifest-guard.mjs';
import { parseDecisionFields } from './decision-fields.mjs';
import { parseFrontmatter, buildScriptInventory, buildCrossReferenceMap } from './skill-manifest.mjs';
import { buildWorkspaceMembers, buildMcpServerList } from './agent-manifest.mjs';
import { resolveCitedPaths } from './cited-paths.mjs';
import { assembleDiff } from './diff-assembler.mjs';
import { existsSync, readFileSync } from 'node:fs';

const PACKET_VERSION = 1;

function applyManifestGuard(packet) {
  const result = checkManifestLevel(packet);
  if (!result.ok) {
    throw new Error(
      `manifest-level contract violated — full source leaked into: ${result.leaks.join(', ')}. ` +
        'Creation packets record what each file IS, never its body.',
    );
  }
  return packet;
}

function base(mode, { phase, target, producer, fileTree, constraints }) {
  return {
    packet_version: PACKET_VERSION,
    mode,
    phase: phase ?? '',
    target,
    producer_model: producer.producer,
    ...(producer.identity ? { producer_identity: producer.identity } : {}),
    constraints: constraints ?? null,
    file_tree: fileTree ?? null,
  };
}

/**
 * @param {object} args
 * @param {string} args.phase
 * @param {string} args.target change id
 * @param {string[]} args.files change's recorded file list
 * @param {string} args.reviewExcludePath
 * @param {Record<string,string>} args.changeFiles tasks.md/spec.md/proposal.md/verification.md contents
 * @param {{producer:string,warning:string|null}} args.producer
 * @param {string} args.fileTree
 * @param {string|null} args.constraints
 * @param {(args:string[]) => {status:number, stdout:string}} args.git
 */
export function buildDiffPacket({ phase, target, files, reviewExcludePath, changeFiles, producer, fileTree, constraints, git, capBytes }) {
  const { diff, acceptanceCriteria } = assembleDiff({ files, reviewExcludePath, changeFiles, git });
  const packet = {
    ...base('diff', { phase, target, producer, fileTree, constraints }),
    diff,
    acceptance_criteria: acceptanceCriteria,
  };
  return applyFieldCap(packet, { capBytes }).packet;
}

/**
 * @param {object} args
 * @param {string} args.target skill directory (must contain SKILL.md)
 * @param {string|null} args.intentText
 * @param {string|null} args.validatorOutput
 * @param {{producer:string,warning:string|null}} args.producer
 * @param {string} args.fileTree
 * @param {string|null} args.constraints
 * @param {number} [args.capBytes]
 */
export function buildSkillPacket({ target, intentText, validatorOutput, producer, fileTree, constraints, capBytes }) {
  const skillMdPath = path.join(target, 'SKILL.md');
  if (!existsSync(skillMdPath)) throw new Error(`no SKILL.md in ${target}`);
  const skillMd = readFileSync(skillMdPath, 'utf8');

  const packet = {
    ...base('skill', { target, producer, fileTree, constraints }),
    skill_md: skillMd,
    frontmatter: parseFrontmatter(skillMd),
    script_inventory: buildScriptInventory(target).join('\n') || '(no scripts/ directory)',
    cross_reference_map: buildCrossReferenceMap(target).join('\n') || '(no relative links in SKILL.md)',
    validator_output: validatorOutput ?? '(validate-skill.sh not found — validator output unavailable)',
    original_intent: intentText ?? null,
  };
  delete packet.phase; // creation modes: phase is optional and omitted when absent, matching the source

  const { packet: capped } = applyFieldCap(packet, { capBytes });
  return applyManifestGuard(capped);
}

/**
 * @param {object} args
 * @param {string} args.target agent workspace directory (must contain agent.toml)
 * @param {string|null} args.intentText
 * @param {{producer:string,warning:string|null}} args.producer
 * @param {string} args.fileTree
 * @param {string|null} args.constraints
 * @param {string|null} [args.cargoCheckOutput]
 * @param {number} [args.capBytes]
 */
export function buildAgentPacket({ target, intentText, producer, fileTree, constraints, cargoCheckOutput, capBytes }) {
  const agentTomlPath = path.join(target, 'agent.toml');
  if (!existsSync(agentTomlPath)) throw new Error(`no agent.toml in ${target}`);
  const agentToml = readFileSync(agentTomlPath, 'utf8');

  const systemPromptPath = path.join(target, 'system_prompt.md');
  const systemPrompt = existsSync(systemPromptPath)
    ? readFileSync(systemPromptPath, 'utf8')
    : '(no system_prompt.md — the agent has no declared behaviour)';

  const packet = {
    ...base('agent', { target, producer, fileTree, constraints }),
    agent_toml: agentToml,
    system_prompt: systemPrompt,
    workspace_members: buildWorkspaceMembers(target).join('\n') || '(no workspace members declared)',
    mcp_servers: buildMcpServerList(agentToml).join('\n') || '(no MCP servers configured)',
    cargo_check:
      cargoCheckOutput ?? '(cargo check not run — no .cargo-check.txt recorded by the creator, and PACKET_RUN_CARGO_CHECK=1 was not set)',
    original_intent: intentText ?? null,
  };
  delete packet.phase;

  const { packet: capped } = applyFieldCap(packet, { capBytes });
  return applyManifestGuard(capped);
}

/**
 * @param {object} args
 * @param {string} args.target decision markdown FILE path
 * @param {string|null} args.intentText
 * @param {string|null} args.priorDecisionsText output of `pk search`, or the "none found" placeholder
 * @param {{producer:string,warning:string|null}} args.producer
 * @param {string} args.fileTree
 * @param {string|null} args.constraints
 * @param {number} [args.capBytes]
 */
export function buildDecisionPacket({ target, intentText, priorDecisionsText, producer, fileTree, constraints, capBytes }) {
  if (!existsSync(target)) throw new Error(`--target must be an existing FILE for --mode decision: ${target}`);
  const decisionText = readFileSync(target, 'utf8');

  const packet = {
    ...base('decision', { target, producer, fileTree, constraints }),
    decision_document: decisionText,
    decision_fields: parseDecisionFields(decisionText),
    prior_decisions: priorDecisionsText ?? '(no prior decisions found; pk unavailable or nothing matched)',
    original_intent: intentText ?? null,
  };
  delete packet.phase;

  return applyFieldCap(packet, { capBytes }).packet;
}

/**
 * @param {object} args
 * @param {string} args.phase
 * @param {string} args.target assess|analyze|plan|spec (research is handled by research-packet.mjs)
 * @param {string} args.artifactText concatenated, header-delimited artifact content
 * @param {string|null} args.goalsText
 * @param {string|null} args.handoffsText
 * @param {{producer:string,warning:string|null}} args.producer
 * @param {string} args.fileTree
 * @param {string|null} args.constraints
 * @param {string} args.repoRoot repo root for cited-path resolution
 */
export function buildArtifactPacket({ phase, target, artifactText, goalsText, handoffsText, producer, fileTree, constraints, repoRoot, capBytes }) {
  const packet = {
    ...base('artifact', { phase, target, producer, fileTree, constraints }),
    artifact: artifactText,
    goals: goalsText ?? null,
    cited_paths: resolveCitedPaths(artifactText, repoRoot).join('\n') || '(no file paths cited in this artifact)',
    prior_handoffs: handoffsText ?? null,
  };
  return applyFieldCap(packet, { capBytes }).packet;
}
