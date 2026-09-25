// Port of the artifact/research target inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).
//
// The one artifact target that is not a KBD stage: reviews a deep-research
// report before delivery. `report.md`, `<slug>.provenance.md` and `plan.md`
// are REQUIRED (the CLI entry point enforces their presence with exit 2
// before calling this); the three travel as separate fields so the per-field
// truncation cap applies to each individually rather than once to a combined
// blob.

import { applyFieldCap } from './truncation.mjs';

export const REVIEW_FOCUS_TEXT = `Review target: a deep-research report before delivery. Hunt for:
- A claim in the executive summary or evidence table with no label, or a
  \`verified\` label whose row cites no source (invented or orphan citation).
- A sub-question from plan.md the report never answers, without saying so.
- A contradiction the provenance or plan records as unresolved that the report
  presents as settled.
- A \`verification_status\` in the report frontmatter the provenance sidecar does
  not support (for example \`verified\` while the sidecar says BLOCKED or reports
  a skipped gate).
- Numbers, dates, or quotes in the report that the evidence table does not carry.
CRITICAL = a reader acting on the report would be misled; WARNING = a weakness
the reader should know; SUGGESTION = optional improvement.`;

/**
 * @param {object} args
 * @param {string} args.packageDir
 * @param {string} args.reportText
 * @param {string} args.provenanceText
 * @param {string} args.planText
 * @param {string} args.goalsText
 * @param {{producer:string,warning:string|null}} args.producer
 * @param {string} args.fileTree
 * @param {string|null} args.constraints
 * @param {number} [args.capBytes]
 */
export function buildResearchPacket({
  packageDir,
  reportText,
  provenanceText,
  planText,
  goalsText,
  producer,
  fileTree,
  constraints,
  capBytes,
}) {
  const packet = {
    packet_version: 1,
    mode: 'artifact',
    phase: '',
    target: 'research',
    producer_model: producer.producer,
    ...(producer.identity ? { producer_identity: producer.identity } : {}),
    constraints: constraints ?? null,
    file_tree: fileTree ?? null,
    package_dir: packageDir,
    research_report: reportText,
    research_provenance: provenanceText,
    research_plan: planText,
    goals: goalsText,
    review_focus: REVIEW_FOCUS_TEXT,
  };

  return applyFieldCap(packet, { capBytes }).packet;
}
