# Proposed mini QA prerequisite documentation correction

Status: proposed, not applied. The current approved product scope remains the three Boss/UAR amendments.

Actual npm test after locked prerequisite restoration: 1096 tests, 1093 passed, 1 failed, 2 skipped. The remaining failed carried-payload check reports two missing upstream script references in the delivery-cadence profile. No test predicate or acceptance requirement is proposed to change.

Proposed correction: replace only the unavailable upstream refresh instructions and their routing sentence with an explicit availability statement. Preserve the working Node cadence CLI and all other skill guidance. No implementation of a new refresh mechanism, dependency or service change, installed refresh, publication, or runtime code change.

## Exact replacement routing sentence

The upstream installed-pack refresh procedure is unavailable in this Node-only mini project because its installation prerequisites are absent; see [refresh availability](references/profile.md#skill-pack-refresh-procedure).

## Exact replacement final profile section

## Skill-pack refresh procedure

The carried upstream Bash refresh procedure depends on update and binary-install scripts that are absent from this project. It is unavailable as a mini delivery checkpoint. The mini has no Node equivalent. Adding one requires a separate approved OpenSpec change; the Node cadence CLI and other procedures above remain available.

## Reviewable replacement bytes

mini-cadence-doc-proposed-changes.json stores complete replacement bytes and before hashes for both files. Root will refuse application if reviewed inputs changed. The replacement removes the unusable command examples instead of marking the entire functional skill unavailable.

The skill-creator instruction states: “Approval to complete a task does not expand its scope or execution permissions.” This separate carried-skill change needs operator scope approval before application. The completed product builds and failed G2 rerun continue independently.
