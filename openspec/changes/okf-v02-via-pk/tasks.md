## 1. Precondition

- [x] 1.1 Confirm `pk`'s `okf-v02-writer` is merged upstream. If not, STOP: §2 onward cannot complete, and the OKF goal is reported NOT MET.
  - Merged as `abb6745` (PR #13). `git merge-base --is-ancestor abb6745 origin/main` confirms it — in
    fact `abb6745` is the current tip of `origin/main` on `prometheus-knowledge-rs`. CI run `35669093972`
    for that commit: `macos-latest`, `ubuntu-latest`, `windows-latest` all `success`. Also confirmed the
    pinned writer meets design.md's real exit criterion (not just conformance): `pk-store/src/markdown.rs`
    emits `generated: { by, at }` as a mapping and structured `sources` entries.

## 2. The pin

- [x] 2.1 Move `tools/prometheus-knowledge` to the merge commit. Verify `git merge-base --is-ancestor <okf-v02-writer merge> HEAD` inside the submodule, and that upstream CI was green on all three OSes for that commit.
  - Already done in an earlier session (commit `dc0c964`, "bump submodule pin to abb6745"). Confirmed the
    parent repo's committed gitlink (`git ls-tree HEAD tools/prometheus-knowledge`) is `abb6745`, matching
    1.1's evidence.

## 3. The scan

- [x] 3.1 Write `lib/karpathy/knowledge-bundle.test.mjs` first: no executable line under `lib/` or `scripts/` writes beneath `.prometheus/knowledge`; the same scan reports a fixture module that does; `.prometheus/index.md` has exactly one frontmatter key, `okf_version: "0.2"`. `lib/karpathy/` is created by change `karpathy-progress-recorder`, which this change follows.
  - Written and mutation-checked: a real write injected into a scratch `.mjs` under `lib/karpathy/` was
    caught, then removed. Also platform-symmetric (POSIX and Windows-backslash paths both caught) —
    caught a real bug in the Windows-path fixture itself (4 backslashes in JS source string literal = 2
    literal chars, not the 1 a real separator is), fixed before landing.

## 4. The binding constraints

- [x] 4.1 Prepare the `openspec/config.yaml` diff and show it to the operator. Apply only on approval (A-12).
  - Diff shown and approved before applying. Two clauses amended: the OKF-bundle clause now names `pk` as
    the sole writer of `.prometheus/knowledge/` and states receipts/`session-log.md` are unaffected either
    way; the `pk` clause drops the withdrawn "contract between pk and the Node implementation" framing.
    "Three tiers of log" and "team log" clauses untouched — out of scope (tier distribution, not the writer).
- [x] 4.2 Add the `config.yaml` assertions to 3.1's test file: the four withdrawn phrases are absent, matched after collapsing whitespace because `config.yaml` wraps them across lines; `pk`, OKF v0.2 and the independence of receipts are stated.
  - Both new tests mutation-checked via `git stash` (revert config.yaml, confirm both fail against the
    pre-amendment text, restore, confirm green).

## 5. Documentation

- [ ] 5.1 Rewrite `README.md` §5.3: `pk` writes the bundle; this pack writes receipts and `session-log.md`; remove the "SUPERSEDED IN PART" note.
- [ ] 5.2 Record in `.prometheus/decisions.md` the ruling, the conformant-versus-current distinction, and the pin.

## 6. Close

- [ ] 6.1 `node --test`, `node rules/build.mjs --check`, `npx --no-install openspec validate --all --no-interactive`.
- [ ] 6.2 Write the evidence entry required by the last scenario: the pinned commit, the ancestor check's output, and MET or NOT MET.
