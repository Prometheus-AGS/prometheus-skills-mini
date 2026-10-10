import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const out = path.dirname(new URL(import.meta.url).pathname);
const phase = path.resolve(out, '../../../..');
const workstream = path.resolve(phase, '../../..');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const read = p => fs.readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n');
const source = json(path.join(out, 'current-source-binding.json'));
const adjunctPath = path.join(out, 't2-source-adjunct.json');
const adjunct = fs.existsSync(adjunctPath) ? json(adjunctPath) : null;
const snapshots = json(path.join(out, 'evidence-snapshot.json'));
const execute = path.join(phase, 'evidence/execute');
const resume = path.join(execute, 'parent-resume-2026-10-08');
for (const relative of ['global-format-operator-waiver.json', 'operator-deferred-verification.json', 'remaining-t2/operator-deferred-final.json', 'remaining-t2/fixture-correction.json', 'parent-review-routing-disposition.json', 'final-ledger-reconciliation.json']) {
  const file = path.join(resume, relative), content = read(file);
  snapshots.snapshots.push({ file, sha256: sha(content), bytes: Buffer.byteLength(content), content });
}
const at = (...files) => files.map(f => path.join(execute, f));
const ids = {
  identity: at('parent-resume-2026-10-08/identity-task7-acceptance.json', 'partial-runtime-results.json'),
  identity06: at('final-gates/uar-identity-runtime-06.json'),
  jwks: at('final-gates/uar-identity-runtime-02.json', 'final-gates/uar-identity-runtime-06.json'),
  approval: at('parent-resume-2026-10-08/authorization-task7-acceptance.json', 'parent-resume-2026-10-08/approval-current-finite-acceptance.json', 'boss-approval-runtime-15-acceptance.json'),
  g2: at('parent-resume-2026-10-08/G2-14-acceptance.json', 'parent-resume-2026-10-08/G2-14-finite-evidence.json'),
  harness: at('bossfang-harness-runtime-28-acceptance.json', 'parent-resume-2026-10-08/bossfang-current-pair-acceptance.json'),
  cursor: at('final-gates/uar-cursor-runtime-02.json'),
  grants: at('final-gates/uar-grants-runtime-01.json', 'parent-resume-2026-10-08/resource-check-disposition.md'),
  inbound: at('final-gates/bossfang-mcp-runtime-07.json', 'parent-resume-2026-10-08/resource-check-disposition.md'),
  stdio: at('final-gates/uar-stdio-runtime-01.json'),
  secret: at('final-gates/uar-secret-runtime-05.json', 'final-gates/uar-receipt-runtime-02.json', 'parent-resume-2026-10-08/G2-14-finite-evidence.json'),
  external: [path.join(phase, 'execute-scope-amendment.md'), ...at('application-owned-config.md')],
  config: at('default-removal-result.json', 'final-gates/uar-grants-runtime-01.json', 'parent-resume-2026-10-08/resource-applicability.json'),
  package: at('parent-resume-2026-10-08/canonical-directory-package-02-receipt.json', 'parent-resume-2026-10-08/packaged-external-uar-04-receipt.json'),
};
const external = new Set(['Receiver is unspecified', 'Resource-specific acquisition', 'Wrong audience or expired resource token', 'Forged tenant argument', 'Canonical verified principal', 'Storage choice is unresolved', 'Rotation and deletion']);
function disposition(change, requirement, scenario) {
  if (change.startsWith('bauar-01')) {
    const e = scenario === 'Remote policy is incomplete' ? at('final-gates/uar-identity-runtime-01.json') : /Bounded signing/.test(requirement) ? ids.jwks : ids.identity06;
    return { status: 'retained-scoped-runtime-evidence', evidence: [...ids.identity, ...e], basis: 'Eight primary AUTH/KEY cases across three target executions; startup and rotation passed inside otherwise failed earlier targets, then six remaining cases passed runtime06. Operator approved task7 acceptance.', limitation: 'Synthetic issuer/keys/private receiver; existing JWT validity ends at its bounded expiry, not guaranteed immediate revocation. Global formatting waiver and broad T2 remain separate.' };
  }
  if (change.startsWith('bauar-02')) return { status: 'retained-scoped-runtime-evidence', evidence: [...ids.approval, ...ids.g2], basis: 'Current reconnect produces one original effect; edited input produces zero. Retained strict caller prefix/approval cases plus child native/MCP consumption, replay, lost acknowledgement and cancellation evidence.', limitation: 'F6 withdrawn, never passed or disproved. Ordinary emission source12 and instrumented source13 with source17 applicability; no single whole-source17 build.' };
  if (change.startsWith('bauar-03')) {
    const e = /Observation/.test(requirement) ? [...ids.harness, ...ids.cursor] : ids.harness;
    return { status: 'retained-scoped-runtime-evidence', evidence: e, basis: 'H28: 13 named harness/host scenarios plus five native/legacy/ephemeral cases (18 primary), including both dispatch paths, stable attempts, original cursor/approval, loss/reconcile, three cancel surfaces, pending/stale sweep and epoch restart. Later current-pair four-case gate binds actual current provider/consumer artifacts.', limitation: 'H28 is historical evidence at its own boundary, not rerun against current pair. Manual selected UAR admission and native automatic wake only; cron/deferred producers without JobAttemptRef stay native. Durable UAR restart/steer and disabled-feature runtime are unsupported or untested.' };
  }
  if (external.has(scenario)) return { status: 'external-deployment-excluded-by-operator', evidence: ids.external, basis: 'No external receiver, IdP or new custodian selected. These contracts constrain a future deployment and are not certified by the selected common-boundary phase.', limitation: 'Wrong-audience/expiry/scope/tenant ResourcePrincipal and token acquisition/refresh/rotation/deletion are not claimed from label-token fixtures. Receiver/custody certification remains unavailable.' };
  if (/Bossfang/.test(requirement)) return { status: 'selected-modes-supported-delegated-mode-unsupported', evidence: ids.inbound, basis: 'Actual private router/effect/RBAC/attribution case passed, including wrong audience/signature/reserved override/malformed agent denials and preserved context.', limitation: 'No positive verified OIDC issuer/tenant/delegation implementation certified; delegated mapping is unsupported/fail-closed. Do not claim all hypothetical modes from this one runtime case.' };
  if (/Stdio/.test(requirement)) return { status: 'retained-scoped-runtime-evidence', evidence: ids.stdio, basis: 'One primary actual process scenario plus helper: captured allowlist, approval/cancel/kill-reap, configured startup, no heartbeat after cleanup, required sandbox refusal before spawn.', limitation: 'Helper is not another primary case. Direct-child supervision does not prove descendant containment or available OS sandbox.' };
  if (/Credential data/.test(requirement)) return { status: 'retained-scoped-runtime-evidence', evidence: ids.secret, basis: 'Finite captured-secret runtime/canonical persistence plus complete G2-14: six eager/deferred profiles, nine event cases, five provider negatives, nine native cases; ten logs and18 spans canary-free.', limitation: 'Finite known credential corpus only. Opaque/constructor-owned credentials, unknown transformations, dependency-internal logs and general DLP are excluded; non-dispatch tool-error warning persists, without a reproduced secret-bearing failure.' };
  if (/Deployment claims/.test(requirement)) return { status: 'separate-deployment-disposition', evidence: [...ids.g2, ...ids.package, ...ids.external], basis: 'Separate local desktop/private remote-facing common-boundary and unsigned macOS arm64 packaged-startup receipts retained.', limitation: 'No external receiver deployment, Windows, signed installer, installed release or bundled-current-UAR certification.' };
  if (/Application owns/.test(requirement)) return { status: 'retained-scoped-runtime-evidence', evidence: ids.config, basis: 'Shipped mcp.json zero-preset hash matches source17/current; real configured grant/runtime and stdio startup preserve explicit application configuration.', limitation: 'No separate no-explicit-config zero-launch gate inferred; external application credential custody remains application owned.' };
  return { status: 'retained-scoped-runtime-evidence', evidence: ids.grants, basis: 'Real grants scenario: same/different owner/run sessions, immutable credentials, destination/scope/lease denial, changed-revision renewal and owner revoke before pending effect.', limitation: 'Run-grant expiry/revoke/renewal is not unselected external OAuth/token custody implementation; no implicit forwarding of login bearer is claimed as a supported feature.' };
}
const documents = [];
for (const name of ['plan.md', 'specification.md', 'execute-scope-amendment.md', 'execution-bindings.json', 'progress.json']) {
  const file = path.join(phase, name), content = read(file);
  documents.push({ file, sha256: sha(content), content });
}
const childArchive = path.join(workstream, 'openspec/changes/archive/2026-10-08-bauar-05-native-discovery-admission');
for (const name of ['proposal.md', 'design.md', 'tasks.md', 'specs/native-tool-admission/spec.md']) {
  const file = path.join(childArchive, name), content = read(file);
  documents.push({ file, sha256: sha(content), content, role: 'completed-desktop-child-contract-extension' });
}
const requirements = [], scenarios = [], tasks = [];
const changeDirectory = path.join(workstream, 'openspec/changes');
const changeRoots = new Map();
for (const name of fs.readdirSync(path.join(changeDirectory, 'archive')).filter(x => /^[0-9]{4}-[0-9]{2}-[0-9]{2}-bauar-0[1-4]-/.test(x)).sort()) changeRoots.set(name.slice(11), path.join(changeDirectory, 'archive', name));
for (const name of fs.readdirSync(changeDirectory).filter(x => /^bauar-0[1-4]-/.test(x))) changeRoots.set(name, path.join(changeDirectory, name));
for (const [change, root] of [...changeRoots].sort(([a], [b]) => a.localeCompare(b))) {
  for (const name of ['proposal.md', 'design.md', 'tasks.md']) {
    const file = path.join(root, name), content = read(file);
    documents.push({ file, sha256: sha(content), content });
    if (name === 'tasks.md') {
      let id = 0;
      for (const line of content.split('\n')) if (/^- \[[ x]\] /.test(line)) tasks.push({ change, backendId: ++id, checked: line.startsWith('- [x]'), cancelled: line.includes('CANCELLED'), title: line.slice(6) });
    }
  }
  const specs = path.join(root, 'specs');
  for (const capability of fs.readdirSync(specs)) {
    const file = path.join(specs, capability, 'spec.md'), content = read(file);
    documents.push({ file, sha256: sha(content), content });
    let requirement;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('### Requirement: ')) {
        requirement = lines[i].slice(17);
        requirements.push({ id: `R${requirements.length + 1}`, change, capability, title: requirement, file, line: i + 1 });
      }
      if (lines[i].startsWith('#### Scenario: ')) {
        const title = lines[i].slice(15);
        scenarios.push({ id: `S${scenarios.length + 1}`, requirementId: requirements.at(-1).id, change, capability, requirement, title, file, line: i + 1, ...disposition(change, requirement, title) });
      }
    }
  }
}
const statuses = Object.fromEntries([...new Set(scenarios.map(x => x.status))].map(s => [s, scenarios.filter(x => x.status === s).length]));
const coverage = { schemaVersion: 1, capturedAt: new Date().toISOString(), method: 'Exact current heading/task inventory mapped to finite retained receipts and explicit scope amendments; producer evidence reconciliation, not independent verification', counts: { requirements: requirements.length, scenarios: scenarios.length, tasks: tasks.length, checked: tasks.filter(t => t.checked).length, cancelledWithinChecked: tasks.filter(t => t.cancelled).length, unchecked: tasks.filter(t => !t.checked).length }, historicalCounts: { requirements: 32, scenarios: 59, note: 'Historical reviewed count; not the current amended delta heading count' }, statuses, requirements, scenarios, tasks };
write('requirement-scenario-audit.json', coverage);
write('contract-snapshot.json', { schemaVersion: 1, documents });
const format = { actualResult: 'FAILED', phaseDisposition: 'operator-approved-phase-only-waiver', authorization: path.join(resume, 'global-format-operator-waiver.json'), canonicalRevision: 318, waiverDoesNotChangeResult: true, originalShippingOrReleaseWaived: false, receipt: path.join(execute, 'final-gates/uar-format-check-01.json') };
const gates = { globalFormatting: format, broadT2: { status: 'OPERATOR_DEFERRED', actualResult: 'INTERRUPTED_BY_OPERATOR_DEFERRED_VERIFICATION', receipt: path.join(resume, 'remaining-t2/operator-deferred-final.json'), testResultCount: 0, ownedWriterStopped: true, wrapperExitIsTestPass: false, examplesAndDoctests: 'NOT RUN' }, independentParentReview: { status: 'OPERATOR_DEFERRED', actualResult: 'NOT RUN', candidateOnly: true }, phasePass: false, implementation: 'COMPLETE', certification: 'DEFERRED_BY_OPERATOR', dispatchReady: false, authorization: path.join(resume, 'operator-deferred-verification.json') };
const platformDisposition = [
  { profile: 'macOS arm64 development desktop', evidence: ids.g2, supported: 'actual G2/approval gates at recorded source12/13 emissions and source17 applicability', excluded: ['whole-source17 rebuild', 'all executor bodies'] },
  { profile: 'macOS arm64 unsigned directory package', evidence: ids.package, supported: 'intact package hooks plus packaged startup/authenticated uar-check with external current UAR override', excluded: ['bundled current UAR', 'signed installer', 'installed release', 'packaged approval matrix'] },
  { profile: 'Windows', evidence: ids.package, supported: 'published package inventory metadata only', excluded: ['Windows runtime acceptance', 'Windows installation acceptance'] },
  { profile: 'external receiver deployment', evidence: ids.external, supported: 'explicitly unselected', excluded: ['production receiver/IdP/custody certification'] },
  { profile: 'Bossfang selected harness', evidence: ids.harness, supported: 'H28 retained and later current-pair gate', excluded: ['durable UAR restart/steer', 'disabled-feature runtime', 'automatic UAR cron/deferred selection'] },
  { profile: 'PostgreSQL', evidence: at('final-gates/uar-postgres-preview-profile-check-01.json'), supported: 'preview compiler profile only', excluded: ['runtime backend acceptance'] },
];
const reviewInventory = [];
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
for (const file of walk(phase).filter(f => /findings[^/]*\.json$/.test(f))) {
  const value = json(file);
  reviewInventory.push({ file, sha256: sha(read(file)), mode: value.mode ?? null, verdict: value.verdict ?? value.certificationVerdict ?? null, judge: value.judge_model ?? value.servedModelIdentity ?? null, producer: value.producer_model ?? null, findings: value.findings?.length ?? null });
}
const packageReview = json(path.join(resume, 'review-package-correction/packet.json'));
const packageRecord = source.repositories.find(r => r.name === 'boss').records.find(r => r.file === 'build/integration-artifacts.json');
write('review-inventory.json', { schemaVersion: 1, currentSource17Match: source.repositories.every(r => r.records.every(f => f.matchesSource17 !== false)), parentCumulativeReviewFound: false, childChain: 'Desktop child cumulative34-file rounds1–3 plus focused round4 PASS with one warning; scoped child evidence, not parent cumulative delivery', narrowPackageReview: 'PASS for two platform entries in build/integration-artifacts.json, not whole product', packageReviewStillMatches: packageRecord.sha256 === packageReview.artifacts.qa.manifestSha256, inheritedWarning: 'Non-dispatch tool error.to_string event emissions lack explicit scrub in reviewed branch; no secret-bearing failure reproduced; not fixed or waived here', inventory: reviewInventory });
const packetBase = { packet_version: 1, mode: 'diff', phase: 'bossfang-uar-authorization-and-execution', target: 'selected-complete-delivery-candidate', producer_model: 'unknown', producer_provenance: 'Historic contributing exact served producer identities unavailable; assignment labels are not verified served identity. This evidence assembler was assigned gpt-6-astra/high.', status: 'implementation-handoff-review-operator-deferred', gates, platformDisposition, acceptance_criteria: coverage, contracts: documents, finite_evidence: snapshots.snapshots, source_binding: source, test_correction_adjunct: adjunct, constraints: ['No phase PASS, gate waiver, archive or canonical mutation by this packet.', 'Never read/search/hash/execute the excluded F6 source files. F6 cancelled, not passed/disproved.', 'Review selected complete cumulative diff; do not infer installed/remote/all-platform claims.', 'Do not replay passing runtime gates merely to fill review metadata.', 'Operator phase-only global formatting waiver preserves actual FAILED result.', 'No blanket whole-repository/transitive dependency certification from the explicit source allowlist.'], truncation: { any_truncated: false, fields: [], fileBackedPartitions: true }, excluded_paths: source.excluded, inherited_review_inventory: json(path.join(out, 'review-inventory.json')) };
const partitions = [];
for (const repository of source.repositories) {
  const name = `review-packet-${repository.name}.json`;
  const adjunctDiff = repository.name === 'uar' && adjunct ? read(path.join(out, adjunct.patchFile)) : '';
  const packet = { ...packetBase, target: `selected-delivery-${repository.name}-partition`, crossRepositoryContext: 'All contracts/evidence/source digests included. Diff is this repository only; cumulative parent verdict requires all three partitions and cross-repository contract reconciliation.', diff: read(path.join(out, repository.patchFile)) + adjunctDiff, file_tree: [...repository.records.map(x => x.file), ...(adjunctDiff ? [adjunct.file] : [])] };
  write(name, packet);
  const content = read(path.join(out, name));
  partitions.push({ file: name, sha256: sha(content), bytes: Buffer.byteLength(content), repository: repository.name, diffBytes: repository.patchBytes });
}
write('independent-review-packet.json', { ...packetBase, diff: source.repositories.map(r => ({ repository: r.name, file: r.patchFile, sha256: r.patchSha256, bytes: r.patchBytes })), partitions, hydration: 'Load all three self-contained repository packets in full without silent truncation, then reconcile cross-repository contracts before issuing a cumulative finding. Each packet embeds complete criteria, contract docs, finite evidence and source binding. No reviewer dispatched by assembler.' });
const combinedDiff = source.repositories.map(r => `Repository: ${r.name}\nAccepted base: ${r.acceptedBase}\n${read(path.join(out, r.patchFile))}`).join('\n') + (adjunct ? `\nTest-only correction adjunct\n${read(path.join(out, adjunct.patchFile))}` : '');
write('combined-review-packet.json', { ...packetBase, target: 'selected-complete-delivery-all-repositories', diff: combinedDiff, file_tree: source.repositories.flatMap(r => r.records.map(f => `${r.name}/${f.file}`)).concat(adjunct ? [`uar/${adjunct.file}`] : []), review_focus: ['Cross-repository authority/ownership and interface compatibility across UAR, Bossfang and The Boss', 'Every current parent requirement and approved completed desktop child extension', 'Evidence source boundaries, actual limitations and phase-only waiver without release overclaim', 'No F6 source access or acceptance and no inferred broad T2 result'], interfaceReviewRequired: true, modelContextLimit: { status: 'not-verified-from-current-receipts', bytesAreNotTokens: true, noTruncationPermitted: true } });
console.log(JSON.stringify({ counts: coverage.counts, statuses, partitions: partitions.map(p => ({ file: p.file, bytes: p.bytes })) }));
