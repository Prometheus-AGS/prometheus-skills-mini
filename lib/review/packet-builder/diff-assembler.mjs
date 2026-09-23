// Port of the diff-mode assembly inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).
//
// Diff mode reviews a completed change's diff against its acceptance
// criteria. The diff is scoped to the change's recorded file list when
// available, else the full cumulative uncommitted diff. Review receipts
// under this change's own review directory are excluded: including them
// would make re-review recursive — a corrected packet could refuse solely
// because it has not yet produced its own later PASS.

const ACCEPTANCE_FILES = ['tasks.md', 'spec.md', 'proposal.md', 'verification.md'];

/**
 * @param {object} args
 * @param {string[]} args.files the change's recorded file list (files.txt), possibly empty
 * @param {string} args.reviewExcludePath repo-relative path to exclude from the diff (this
 *   change's own review directory), e.g. `.kbd-orchestrator/phases/<phase>/review/<change>`
 * @param {(args: string[]) => { status: number, stdout: string }} args.git injected git runner
 * @param {Record<string,string>} [args.changeFiles] contents of tasks.md/spec.md/proposal.md/verification.md, keyed by filename
 * @returns {{ diff: string, acceptanceCriteria: string|null, warnings: string[] }}
 */
export function assembleDiff({ files, reviewExcludePath, git, changeFiles = {} }) {
  const warnings = [];
  const excludePathspec = `:(exclude)${reviewExcludePath}/**`;

  const diffArgs = files.length
    ? ['diff', 'HEAD', '--', ...files, excludePathspec]
    : ['diff', 'HEAD', '--', '.', excludePathspec];
  let diff = git(diffArgs).stdout ?? '';

  if (!diff.trim()) {
    const showArgs = ['show', '--patch', 'HEAD', '--', '.', excludePathspec];
    diff = git(showArgs).stdout ?? '';
  }

  if (!diff.trim()) {
    throw new Error('no diff content resolvable for this change');
  }

  if (diff.includes(`diff --git a/${reviewExcludePath}/`)) {
    throw new Error('recursive review receipt leaked into diff packet');
  }

  const acceptanceParts = [];
  for (const name of ACCEPTANCE_FILES) {
    if (changeFiles[name]) acceptanceParts.push(changeFiles[name]);
  }
  const acceptanceCriteria = acceptanceParts.length ? acceptanceParts.join('\n') : null;
  if (!acceptanceCriteria) {
    warnings.push('no acceptance criteria found for change');
  }

  return { diff, acceptanceCriteria, warnings };
}
