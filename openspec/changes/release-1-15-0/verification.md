# Release preparation verification

- All package, lockfile-root, distribution-source, marketplace and plugin declarations equal 1.15.0.
- Generator: 104 skills; distribution check reports no byte or POSIX-mode drift.
- npm audit: zero vulnerabilities; dependency entries unchanged from main.
- Pinned OpenSpec CLI: 50 items passed, zero failed.
- Independent artifact review: no actionable findings; release notes preserve installed-harness limits. Same-family GPT-6 fallback; reviewer did not execute tests or generators.
- Hosted CI, merge, annotated tag and published release identities will be recorded in the PR conversation and release publication.
