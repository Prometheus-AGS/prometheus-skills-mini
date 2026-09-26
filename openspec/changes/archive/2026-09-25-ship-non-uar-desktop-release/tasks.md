## 1. Freeze the release source and disable UAR reachability

- [x] 1.1 Create a clean `2.2.1` release worktree from the committed integration head, reconcile current `origin/main` release metadata without importing unrelated working-tree changes, implement the shared `THE_BOSS_UAR_ENABLED=0` capability across all Electron bundles, and statically inspect every UI, runtime, agent-creation, administration, provisioning, IPC/service, operation-history, and process-start path to confirm UAR is unreachable while stored UAR records remain readable.
- [x] 1.2 Remove the first-run **Connect CherryIN** action, rename the remaining action to **Set up LLM Providers**, update every supported locale, and statically inspect the rendered source path and locale inventory before the phase gate.

## 2. Make native payload and release metadata profile-aware

- [x] 2.1 Make integration artifact selection, binary management, before/after-pack hooks, and the final package validator consume the same disabled-UAR profile; derive the full platform UAR inventory from the pinned manifest, exclude and assert absence of every declared file, retain the five supported native tools, and remove the unsupported native liter-llm executable assumption. Verify through static manifest-to-call-path inspection before the phase gate.
- [x] 2.2 Set version `2.2.1`, declare exactly `win32-x64`, `win32-arm64`, `darwin-arm64`, and `darwin-x64`, attach feature profile and frozen-source identity to every artifact manifest, reject mismatched aggregation, and update release notes and workflow configuration. Verify the four target definitions map to their native runners and installer commands before the phase gate.

## 3. Complete the public download contract

- [x] 3.1 Update `Know-Me-Tools/boss-landing-spot` synchronization and generated release data so the current release consumes the verified GitHub Release manifest, advertises exactly the four supported Windows/macOS targets, rejects missing current assets, and does not inherit Linux or IPFS URLs. Verify the source-to-generated-data mapping by inspection before the phase gate.

## 4. Run the single native release gate and publish

- [x] 4.1 After tasks 1.1–3.1 production code is committed, freeze the release commit and run `pnpm build:mac:arm64` locally in the clean worktree; mount or unpack and validate the actual application image, retained integrations, simplified provider setup, and absence of the declared UAR payload. Then dispatch the four native installer jobs from the same commit, fix only observed build/package failures, rerun only affected platform gates, and verify every final installer's version, architecture, size, SHA-256, profile, source commit, signing state, and installed-image payload.
- [x] 4.2 Publish the four verified installers directly to the `Prometheus-AGS/the-boss` GitHub Release, commit and push aggregate `RELEASES.md` and `release-manifest.json`, synchronize and push the landing repository, deploy `the-boss.know-me.tools`, and verify the live `2.2.1` page and all four download responses match the published bytes.

## 5. Record evidence and resume UAR work

- [x] 5.1 Write the structured release receipt with the frozen Boss commit, tag, disabled-UAR profile, local Apple Silicon result, four asset URLs/sizes/checksums/signing states, workflow run, Boss release-metadata commit, landing-site commit/deployment URL, and live-link results; complete the child reflection and handoff, then use typed KBD transitions to restore `integration-administration` at task `4.5`. Verify canonical KBD position and the receipt agree before beginning the UAR repair child.
