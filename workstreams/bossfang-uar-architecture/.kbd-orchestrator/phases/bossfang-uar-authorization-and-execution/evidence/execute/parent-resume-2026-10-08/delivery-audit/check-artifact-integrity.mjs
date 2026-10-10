import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const out = path.dirname(new URL(import.meta.url).pathname);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const load = n => JSON.parse(fs.readFileSync(path.join(out, n), 'utf8'));
const index = load('independent-review-packet.json');
const audit = load('requirement-scenario-audit.json');
const missingEvidence = [...new Set(audit.scenarios.flatMap(s => s.evidence))].filter(f => !fs.existsSync(f));
const patchChecks = index.diff.map(p => {
  const data = fs.readFileSync(path.join(out, p.file));
  return { file: p.file, matches: sha(data) === p.sha256 && data.length === p.bytes };
});
const partitionChecks = index.partitions.map(p => {
  const data = fs.readFileSync(path.join(out, p.file));
  const packet = JSON.parse(data.toString('utf8'));
  return { file: p.file, matches: sha(data) === p.sha256 && data.length === p.bytes, declaredTruncation: packet.truncation.any_truncated, mappedScenarios: packet.acceptance_criteria.scenarios.length };
});
const adjunct = load('t2-source-adjunct.json');
const adjunctData = fs.readFileSync(path.join(out, adjunct.patchFile));
const combinedBytes = fs.readFileSync(path.join(out, 'combined-review-packet.json'));
const combined = JSON.parse(combinedBytes.toString('utf8'));
const rowsMatchExactContract = audit.scenarios.every(s => {
  const document = combined.contracts.find(d => d.file === s.file);
  return document && document.content.split('\n')[s.line - 1] === `#### Scenario: ${s.title}`;
});
const waiver = combined.finite_evidence.find(e => e.file.endsWith('/global-format-operator-waiver.json'));
const waiverValue = waiver ? JSON.parse(waiver.content) : null;
const explicitChecks = {
  exact31Requirements57Scenarios: audit.requirements.length === 31 && audit.scenarios.length === 57,
  scenarioHeadingsMatchContractSnapshot: rowsMatchExactContract,
  allScenarioEvidenceLinksExist: missingEvidence.length === 0,
  original239Source17HashesMatchedAtCapture: combined.source_binding.repositories.flatMap(r => r.records).filter(r => r.matchesSource17 === true).length === 239,
  allCapturedFilesStable: combined.source_binding.repositories.every(r => r.records.every(f => f.stableDuringCapture)),
  testAdjunctMatchesOwnerHandoff: adjunct.matchesOwnerHandoff && sha(adjunctData) === adjunct.patchSha256,
  noExcludedDiffHeaders: combined.diff.split('\n').filter(l => l.startsWith('diff --git ')).every(l => !combined.excluded_paths.some(p => l.includes(p))),
  excludedAccessDeclaredFalse: combined.source_binding.forbiddenFilesAccessed === false && adjunct.forbiddenFilesAccessed === false,
  actualFormattingFailedPreserved: combined.gates.globalFormatting.actualResult === 'FAILED',
  phaseOnlyOperatorWaiverBound: waiverValue?.gateDisposition === 'WAIVED_BY_OPERATOR_FOR_THIS_PHASE' && waiverValue?.notAGlobalPass === true && waiverValue?.notAReleaseCertification === true,
  platformLimitsExplicit: combined.platformDisposition.length === 6 && combined.platformDisposition.every(p => p.excluded.length > 0),
  allRepositoryDiffsIncluded: combined.source_binding.repositories.every(r => combined.diff.includes(fs.readFileSync(path.join(out, r.patchFile), 'utf8'))),
  childContractIncluded: combined.contracts.filter(d => d.role === 'completed-desktop-child-contract-extension').length === 4,
  noTruncation: combined.truncation.any_truncated === false,
  unknownProducerPreserved: combined.producer_model === 'unknown',
  independentParentReviewNotClaimed: combined.gates.independentParentReview.status === 'NOT RUN',
  phasePassNotClaimed: combined.gates.phasePass === false,
};
const qa = { schemaVersion: 1, at: new Date().toISOString(), boundary: 'complete candidate review artifact, pending T2 finite result', status: Object.values(explicitChecks).every(Boolean) ? 'PASS_ARTIFACT_CHECKS' : 'FAIL', deliveryGatePass: false, dispatchReady: false, blockedOn: ['finite broad T2 owner result/disposition', 'root final deterministic QA decision'], checks: explicitChecks, combinedPacket: { file: 'combined-review-packet.json', bytes: combinedBytes.length, sha256: sha(combinedBytes) }, execution: 'Node22 read-only evidence checks; no product test/build/source mutation or independent review' };
fs.writeFileSync(path.join(out, 'deterministic-qa.json'), JSON.stringify(qa, null, 2) + '\n');
const report = { schemaVersion: 1, capturedAt: new Date().toISOString(), kind: 'evidence-artifact-integrity-only', productQa: false, independentReview: false, status: missingEvidence.length || patchChecks.some(p => !p.matches) || partitionChecks.some(p => !p.matches) ? 'FAIL' : 'PASS', missingEvidence, patchChecks, partitionChecks, adjunctPatchMatches: sha(adjunctData) === adjunct.patchSha256, counts: audit.counts, candidatePendingT2: true, sourceSnapshotRechecked: false, note: 'No product source, test, build, service or canonical state access in this check.' };
fs.writeFileSync(path.join(out, 'artifact-integrity.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
