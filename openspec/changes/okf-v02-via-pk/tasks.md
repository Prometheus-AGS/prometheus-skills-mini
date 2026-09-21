## 1. Precondition

- [ ] 1.1 Confirm `pk`'s `okf-v02-writer` is merged upstream. If not, STOP: §2 onward cannot complete, and the OKF goal is reported NOT MET.

## 2. The pin

- [ ] 2.1 Move `tools/prometheus-knowledge` to the merge commit. Verify `git merge-base --is-ancestor <okf-v02-writer merge> HEAD` inside the submodule, and that upstream CI was green on all three OSes for that commit.

## 3. The scan

- [ ] 3.1 Write `lib/karpathy/knowledge-bundle.test.mjs` first: no executable line under `lib/` or `scripts/` writes beneath `.prometheus/knowledge`; the same scan reports a fixture module that does; `.prometheus/index.md` has exactly one frontmatter key, `okf_version: "0.2"`. `lib/karpathy/` is created by change `karpathy-progress-recorder`, which this change follows.

## 4. The binding constraints

- [ ] 4.1 Prepare the `openspec/config.yaml` diff and show it to the operator. Apply only on approval (A-12).
- [ ] 4.2 Add the `config.yaml` assertions to 3.1's test file: the four withdrawn phrases are absent, matched after collapsing whitespace because `config.yaml` wraps them across lines; `pk`, OKF v0.2 and the independence of receipts are stated.

## 5. Documentation

- [ ] 5.1 Rewrite `README.md` §5.3: `pk` writes the bundle; this pack writes receipts and `session-log.md`; remove the "SUPERSEDED IN PART" note.
- [ ] 5.2 Record in `.prometheus/decisions.md` the ruling, the conformant-versus-current distinction, and the pin.

## 6. Close

- [ ] 6.1 `node --test`, `node rules/build.mjs --check`, `npx --no-install openspec validate --all --no-interactive`.
- [ ] 6.2 Write the evidence entry required by the last scenario: the pinned commit, the ancestor check's output, and MET or NOT MET.
