// Port of the artifact/research target inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchPacket, REVIEW_FOCUS_TEXT } from './research-packet.mjs';

test('buildResearchPacket carries report/provenance/plan as separate fields, plus goals and review_focus', () => {
  const packet = buildResearchPacket({
    packageDir: '/pkg',
    reportText: '# Report\n',
    provenanceText: '# Provenance\n',
    planText: '# Plan\n',
    goalsText: '# Goals\n\n- Query: x\n',
    producer: { producer: 'p', warning: null },
    fileTree: '.',
    constraints: null,
  });

  assert.equal(packet.mode, 'artifact');
  assert.equal(packet.target, 'research');
  assert.equal(packet.package_dir, '/pkg');
  assert.match(packet.research_report, /# Report/);
  assert.match(packet.research_provenance, /# Provenance/);
  assert.match(packet.research_plan, /# Plan/);
  assert.match(packet.goals, /# Goals/);
  assert.equal(packet.review_focus, REVIEW_FOCUS_TEXT);
  // The artifact/cited_paths/prior_handoffs fields are dropped for research —
  // the three files above replace them so the truncation cap applies once
  // per file, not twice.
  assert.equal('artifact' in packet, false);
  assert.equal('cited_paths' in packet, false);
  assert.equal('prior_handoffs' in packet, false);
});

test('buildResearchPacket applies the per-field cap and always records packet.truncation', () => {
  const packet = buildResearchPacket({
    packageDir: '/pkg',
    reportText: 'x'.repeat(50000),
    provenanceText: 'p',
    planText: 'p',
    goalsText: 'g',
    producer: { producer: 'p', warning: null },
    fileTree: '.',
    constraints: null,
    capBytes: 1000,
  });
  assert.equal(packet.truncation.any_truncated, true);
  assert.ok(packet.research_report.includes('[TRUNCATED'));
});
