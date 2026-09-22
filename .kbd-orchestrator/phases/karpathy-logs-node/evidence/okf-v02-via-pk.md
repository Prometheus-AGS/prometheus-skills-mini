# OKF goal evidence — `okf-v02-via-pk`

Task 6.2. Required by `openspec/changes/okf-v02-via-pk/specs/karpathy/knowledge-bundle/spec.md`,
Requirement "The declared OKF version is the version the pinned writer emits" → Scenario "A pin that
predates the writer change blocks completion": this file records the pinned commit, whether `pk`'s
`okf-v02-writer` is an ancestor of it, and marks the OKF goal MET or NOT MET.

## Pinned commit

`tools/prometheus-knowledge` submodule pin: `abb6745e31da7577611d7c32005af26a72254484` (short `abb6745`),
committed into the parent repository at `dc0c964` ("chore(pk): bump submodule pin to abb6745 (OKF v0.2
writer merged)"). Confirmed via `git ls-tree HEAD tools/prometheus-knowledge` in this session, not assumed
from a prior session's memory of having moved it.

## `pk`'s `okf-v02-writer` ancestor check

The pinned commit **is** the `okf-v02-writer` merge commit itself — `abb6745` is `Merge pull request #13
from Prometheus-AGS/feat/okf-v02-writer` (`git log --oneline -1 abb6745` inside the submodule). So the
ancestor check is trivially true by identity: `git merge-base --is-ancestor abb6745 abb6745` exits 0. The
stronger, non-trivial check — that this commit is genuinely on `prometheus-knowledge-rs`'s upstream history,
not a local-only merge — also passes: `git merge-base --is-ancestor abb6745 origin/main` exits 0 inside the
submodule, and `abb6745` is in fact the current tip of `origin/main` on that repository (`git log --oneline
origin/main -1` returns the same commit).

Upstream CI for that exact commit, run `35669093972` on `prometheus-knowledge-rs`: `macos-latest`,
`ubuntu-latest`, `windows-latest` all `success` (`gh run view 35669093972 --json jobs`).

## The real exit criterion, not just conformance

Per `design.md`'s "Conformant versus current" section: OKF v0.2 §11 conformance (parseable frontmatter, a
`type` field) was already true of `pk` 1.8.0, so "the bundle passes conformance" would prove nothing about
whether the operator's ruling — being *current* with v0.2 §13.1's renames — actually took effect. Checked
directly against the pinned commit's source, not its changelog or PR description:
`tools/prometheus-knowledge/pk-store/src/markdown.rs` at `abb6745` serialises `generated` as a mapping
(`{ by, at }`) and `sources` as structured entries, matching v0.2 §13's field shapes — not the 0.1-era
`timestamp` field and body `# Citations` list that 1.8.0 wrote.

## Verdict

**MET.** The pinned commit is an ancestor of (in fact, is) `pk`'s `okf-v02-writer` merge, that merge is
genuinely upstream (not local-only), upstream CI was green on all three OSes for that exact commit, and the
pinned writer's source confirms it emits the v0.2-current field shapes the ruling required — not merely OKF
v0.2 conformance, which would have been true before the ruling and would have proven nothing.
