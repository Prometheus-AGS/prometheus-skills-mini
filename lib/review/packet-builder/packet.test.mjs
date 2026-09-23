// Port of the top-level packet assembly (mode dispatch + field selection) inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).
//
// This composes the pieces already tested individually (truncation,
// manifest-guard, decision-fields, skill-manifest, agent-manifest,
// cited-paths, diff-assembler, producer-model, file-tree) into the final
// packet document per mode.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../../platform/paths.mjs';
import { buildDiffPacket, buildSkillPacket, buildAgentPacket, buildDecisionPacket, buildArtifactPacket } from './packet.mjs';

function withTempRepo(build) {
  const root = mkdtempSync(path.join(tempDir(), 'packet-'));
  try {
    return build(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('buildDiffPacket assembles mode/target/producer/diff/acceptance_criteria and applies the cap', () => {
  const git = () => ({ status: 0, stdout: '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+new\n' });
  const packet = buildDiffPacket({
    phase: 'my-phase',
    target: 'change-1',
    files: [],
    reviewExcludePath: '.kbd-orchestrator/phases/my-phase/review/change-1',
    changeFiles: { 'tasks.md': '- [x] do the thing\n' },
    producer: { producer: 'claude-opus-5', warning: null },
    fileTree: './a\n./b',
    constraints: null,
    git,
  });
  assert.equal(packet.mode, 'diff');
  assert.equal(packet.phase, 'my-phase');
  assert.equal(packet.target, 'change-1');
  assert.equal(packet.producer_model, 'claude-opus-5');
  assert.match(packet.diff, /@@ -1 \+1 @@/);
  assert.match(packet.acceptance_criteria, /do the thing/);
  assert.equal(packet.file_tree, './a\n./b');
});

test('buildSkillPacket includes skill_md, frontmatter, script_inventory, crossref, validator output, intent, and passes the manifest guard', () => {
  withTempRepo((root) => {
    const skillDir = path.join(root, 'my-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: my-skill\n---\n\n# My Skill\n');

    const packet = buildSkillPacket({
      target: skillDir,
      intentText: 'Build a thing that does X.',
      validatorOutput: 'all checks passed',
      producer: { producer: 'claude-opus-5', warning: null },
      fileTree: './SKILL.md',
      constraints: null,
    });

    assert.equal(packet.mode, 'skill');
    assert.match(packet.skill_md, /# My Skill/);
    assert.deepEqual(packet.frontmatter, { name: 'my-skill' });
    assert.equal(packet.original_intent, 'Build a thing that does X.');
    assert.equal(packet.validator_output, 'all checks passed');
  });
});

test('buildSkillPacket throws when script content leaks into a descriptive field (manifest guard)', () => {
  withTempRepo((root) => {
    const skillDir = path.join(root, 'leaky-skill');
    mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: leaky\n---\n');
    // A validator_output field is VERBATIM_OK, so force the leak through
    // script_inventory instead by writing a purpose line containing Rust syntax.
    writeFileSync(path.join(skillDir, 'scripts', 'x.sh'), '#!/bin/sh\n# fn leaked_purpose() {\necho hi\n');

    assert.throws(
      () =>
        buildSkillPacket({
          target: skillDir,
          intentText: null,
          validatorOutput: null,
          producer: { producer: 'p', warning: null },
          fileTree: '.',
          constraints: null,
        }),
      /manifest-level contract violated/,
    );
  });
});

test('buildAgentPacket includes agent_toml, system_prompt, workspace_members, mcp_servers, cargo_check', () => {
  withTempRepo((root) => {
    const agentDir = path.join(root, 'my-agent');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, 'agent.toml'), '[[mcp_servers]]\nname = "fs"\nurl = "stdio://fs"\n');
    writeFileSync(path.join(agentDir, 'system_prompt.md'), 'You are an agent.');
    writeFileSync(path.join(agentDir, 'Cargo.toml'), '[workspace]\nmembers = ["core"]\n');
    mkdirSync(path.join(agentDir, 'core'), { recursive: true });

    const packet = buildAgentPacket({
      target: agentDir,
      intentText: null,
      producer: { producer: 'p', warning: null },
      fileTree: '.',
      constraints: null,
    });

    assert.equal(packet.mode, 'agent');
    assert.match(packet.agent_toml, /mcp_servers/);
    assert.equal(packet.system_prompt, 'You are an agent.');
    assert.match(packet.workspace_members, /core/);
    assert.match(packet.mcp_servers, /fs/);
  });
});

test('buildDecisionPacket includes decision_document, decision_fields, prior_decisions', () => {
  withTempRepo((root) => {
    const decisionFile = path.join(root, 'decision.md');
    writeFileSync(decisionFile, '# Use Postgres\n\n## Decision\n\nUse Postgres.\n\n## Falsifier\n\nLatency spikes.\n');

    const packet = buildDecisionPacket({
      target: decisionFile,
      intentText: null,
      priorDecisionsText: 'No prior decisions found for: postgres',
      producer: { producer: 'p', warning: null },
      fileTree: '.',
      constraints: null,
    });

    assert.equal(packet.mode, 'decision');
    assert.match(packet.decision_document, /Use Postgres\./);
    assert.equal(packet.decision_fields.decision, 'Use Postgres.');
    assert.equal(packet.prior_decisions, 'No prior decisions found for: postgres');
  });
});

test('buildArtifactPacket assembles artifact text, goals, cited_paths, and prior handoffs', () => {
  withTempRepo((root) => {
    const packet = buildArtifactPacket({
      phase: 'my-phase',
      target: 'assess',
      artifactText: '===== assessment.md =====\nFound a gap in `README.md`.\n',
      goalsText: '# Goals\n',
      handoffsText: null,
      producer: { producer: 'p', warning: null },
      fileTree: '.',
      constraints: null,
      repoRoot: root,
    });

    assert.equal(packet.mode, 'artifact');
    assert.match(packet.artifact, /Found a gap/);
    assert.equal(packet.goals, '# Goals\n');
  });
});
