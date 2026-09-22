Test-first where code changes. The submodule adds are mechanical but each is gated on a release.

## 1. Gate

- [ ] 1.1 Assert a release exists for each of the four. `gh release list -R <repo>` must be non-empty. **Do not proceed per-tool until its release exists** — a pin to an unreleased commit is the defect this change exists to avoid.

## 2. Vendor

- [ ] 2.1 `git submodule add https://github.com/GQAdonis/compass tools/compass`, then `git -C tools/compass checkout <release tag>` and stage the gitlink.
- [ ] 2.2 Same for `rust-mcp-filesystem` (note: its Windows-ARM target landed in GQAdonis/rust-mcp-filesystem#1 — pin a release built AFTER that merge, or the arm64 artifact will not exist).
- [ ] 2.3 Same for `openspec` (Prometheus-AGS/openspec).
- [ ] 2.4 Same for `sycophancy-correction`, at whatever URL `the-boss-release-infrastructure` task 4.1 settled. **Long pole** — that repo has no release workflow at all; it cannot be pinned until change `the-boss-release-infrastructure` gives it one.
- [ ] 2.5 Verify every URL in `.gitmodules` is `https://`, not `git@`.

## 3. Verify

- [ ] 3.1 Fresh-clone test: clone to a temp dir, `git submodule update --init --recursive`, assert every pin resolves. Paste the output.
- [ ] 3.2 Run `node --test rules/test/versions-toml.test.mjs`. While `versions.toml` is unauthored it reports `todo`; once authored, the completeness check must name any submodule the file omits.
- [ ] 3.3 Full battery; record in `.prometheus/decisions.md` why the mini vendors source while the-boss downloads artifacts.
