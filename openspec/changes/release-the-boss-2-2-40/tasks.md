# Tasks

## 1. Source freeze and mini

- [x] 1.1 Freeze fetched mini, liter-llm, UAR candidate, and Cherry Studio revisions; verify recorded SHAs match their fetched refs.
- [x] 1.2 Fast-forward the local mini checkout without changing its knowledge files; verify the frozen mini revision and pre-existing dirty-file inventory are preserved.

## 2. UAR 1.1.1 unqualified distribution

- [ ] 2.1 Create an isolated branch from the committed 1.1.1 candidate and transfer only release-blocking changes supported by qualification reports; verify its diff excludes unrelated dirty-checkout files.
- [ ] 2.2 Advance UAR's liter-llm gitlink and authorized version policy to the frozen 2.3.0 commit, update Cargo.lock and required catalog/provenance outputs, and verify all source/version assertions agree.
- [ ] 2.3 Record the unresolved acceptance and embedding-space mismatch proof, and disclose the operator's explicit unqualified-distribution exception without claiming passed UAR behavior.
- [ ] 2.4 Commit and publish the scoped UAR source, then publish Mac ARM64 and Windows x64 sidecar records after their approved native builds; verify both records name that exact unqualified source and pass checksum validation.

## 3. The Boss integration

- [ ] 3.1 Merge the frozen Cherry Studio upstream into an isolated Boss branch; verify a conflict and behavior review preserves custom branding, UAR integration, and release semantics.
- [ ] 3.2 Set version 2.2.40 and update the Boss mini gitlink, UAR source pins, liter-llm pin, and immutable sidecar records; verify all live manifests agree and historical records are unchanged.
- [ ] 3.3 Generate the complete integration payload through the existing workflow; verify its immutable records and public service images match the frozen source revisions.

## 4. Release and public acceptance

- [ ] 4.1 Run the completed-change Boss integration gate and native Mac ARM64 and Windows x64 release builds; verify packaged UAR payloads, installer metadata, and actual signing/notarization state.
- [ ] 4.2 Publish both installers through the serialized 2.2.40 release workflow; verify the public assets' sizes and SHA-256 values against the release manifest.
- [ ] 4.3 Verify the landing receiver published both platform records and the live site shows resolving 2.2.40 download links; record the observed outcome without claiming unrun installed-device acceptance.
