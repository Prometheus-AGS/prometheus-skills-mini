# Packaging correction — 2026-10-08

Scope: continue existing bauar-02 task 8 after the operator's instruction to continue. Correct the observed stale UAR archive selection in the isolated Boss worktree. The intended UAR source remains `ba7233875f8df3b2add68fc487d364428432c07d`.

1. Verify published immutable release records against the source authority and artifact digests. The existing macOS arm64 and Windows x64 entries select p1.17/source92620d40 while their source authority selects ba723387. Published p1.19 records select ba723387. Evidence: canonical-payload-release-records.json and the packaging specialist's history trace.
2. Update only those existing UAR package entries in build/integration-artifacts.json from matching release records: URL, checksum, archive type and complete file list. Preserve source pins, other tools and platform coverage. No release publication, new source selection, validator relaxation, manifest relabeling or platform expansion.
3. Rerun the failed unsigned macOS arm64 directory packaging gate with intact hooks. Preserve the original failure receipt. Restore temporary generated skills exactly. After success, exercise actual packaged startup with the accepted external current UAR using a disposable profile, then confirm owned process cleanup and boot mapping restoration.
4. Review the final artifact-entry diff against the source records and actual package receipt. Record Windows runtime acceptance as unrun. Parent formatting/T2 and cumulative review obligations remain separate; this correction certifies no shipping release.

Only the packaging specialist writes the product manifest and packaging outputs. Root owns phase evidence and canonical task transitions. No concurrent build shares its target.
