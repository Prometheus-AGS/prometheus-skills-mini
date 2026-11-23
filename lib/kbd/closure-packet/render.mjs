// Pure Markdown rendering of the derived closure view (closure-packet.md). Port of the render
// half of the full pack's shared/scripts/kbd-closure-packet.mjs (1.15.0).

const list = (items, empty = 'none') => (items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${empty}`);

function scanSection(scan) {
  if (scan.status === 'no-globs') return '- no runnerOutputGlobs declared in the contract; scan not possible';
  if (scan.status === 'no-authorization') {
    return '- no B4 authorization event recorded (boundary-authorization.json); scan not possible';
  }
  if (scan.status === 'none') {
    return `- none found (${scan.scanned} runner artifact(s) under ${scan.globs.join(', ')}, all modified at or after the B4 authorization at ${scan.authorizedAt})`;
  }
  return scan.artifacts
    .map((a) => `- ${a.path} (modified ${a.mtime}, before the B4 authorization at ${scan.authorizedAt})`)
    .join('\n');
}

function methodLine(method) {
  const d = method.deviation;
  const deviation = d
    ? ` — **deviation** to ${d.method}: cadence "${d.cadence}", reason "${d.reason}" (decision ${d.decisionId})`
    : '';
  return `Method: ${method.name}${deviation}.`;
}

function executedByLine(executedBy) {
  if (!executedBy) return 'Executed by: not recorded in boundary-results.json.';
  return `Executed by: ${executedBy.harness ?? '?'} ${executedBy.version ?? ''} (${executedBy.model ?? 'model unknown'}).`;
}

/** closure-packet.md for a closure object and the contract's release claim. */
export function renderClosurePacket(closure, releaseClaim = {}) {
  if (closure.operatorExit) {
    const { operatorDecision, exercised, withdrawn, limits, budgetAccounting } = closure.operatorExit;
    return [
      '# Closure packet — ' + closure.phaseId, 'Disposition: ' + closure.disposition,
      'Bound contract: ' + closure.contractDigest, '## Operator decision',
      operatorDecision.reference, operatorDecision.text, '## Exercised',
      list(exercised.map((row) => row.id + ' — ' + row.verdict + '\n' +
        row.evidence.map((file) => '  - ' + file.path + ' sha256:' + file.sha256).join('\n'))),
      '## Withdrawn', list(withdrawn.map((row) => row.kind + ' ' + row.id + ' → ' + row.destination)),
      '## Budget accounting', JSON.stringify(budgetAccounting), '## Limits', list(limits),
      'Withdrawn scenarios have no certification under this closure.', '',
    ].join('\n\n');
  }
  const rows = closure.scenarios;
  const works = rows.filter((r) => r.verdict === 'PASS');
  const remains = rows.filter((r) => r.verdict !== 'PASS');
  const conditions = [
    ...(releaseClaim.supportedEnvironments ?? []).map((e) => `environment: ${e}`),
    ...rows.flatMap((r) => r.realCollaborators.map((c) => `${r.id} real collaborator: ${c}`)),
    ...rows.flatMap((r) => r.substitutedBoundaries.map((b) => `${r.id} SUBSTITUTED boundary (not a real claim): ${b}`)),
  ];
  const limits = [
    ...rows.flatMap((r) => r.limitations.map((l) => `${r.id}: ${l}`)),
    ...(releaseClaim.explicitUnknowns ?? []).map((u) => `unknown: ${u}`),
  ];
  const digest = closure.contractDigest ? `sha256:${closure.contractDigest}` : 'digest unknown';
  const evidence = closure.evidenceDigest ? ` (sha256:${closure.evidenceDigest})` : '';
  return `# Closure packet — ${closure.phaseId ?? 'phase'}

Disposition: **${closure.disposition}**${closure.reason ? ` (${closure.reason})` : ''}. This packet is a derived view of
the bound contract (${digest}) and
\`boundary-results.json\`${evidence}; the canonical KBD disposition is authoritative.

## What works, and for whom

${list(works.map((r) => `${r.id} — ${r.usefulOutcome ?? r.name}${r.actor ? ` (for ${r.actor})` : ''}`), 'no scenario passed')}

## Under which conditions

${list(conditions)}

## Limits

${list(limits)}

## What remains

${list(remains.map((r) => `${r.id} — ${r.verdict}${r.mandatory === false ? ' (not mandatory)' : ''}`), 'nothing: every scenario passed')}

## Pre-authorization runner artifacts

${scanSection(closure.preAuthorizationArtifacts)}

This scan is passive evidence (VLBV 04, 10): it reports and never blocks.

## Closure states

| State | Value |
|---|---|
| Implementation complete | ${closure.states.implementationComplete} |
| Behavior accepted | ${closure.states.behaviorAccepted} |
| Release eligible | ${closure.states.releaseEligible} |
| Release authorized | ${closure.states.releaseAuthorized} (a separate owner decision) |

${methodLine(closure.method)}
${executedByLine(closure.executedBy)}
`;
}
