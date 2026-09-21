EXECUTION: karpathy-logs-node
Project: prometheus-skills-mini
Date: 2026-09-21
Backend: **openspec**, in two repositories · Driver: `/kbd-apply` per task, never bare `/opsx:apply`
Changes: 3 · Tasks: 57 (14 + 34 + 9), counted with `grep -c '^- \[ \]'` on each `tasks.md` and
registered canonically from those files, not retyped.

## Owner decisions carried into execution

| Decision | Source |
|---|---|
| The knowledge layer is the Rust `pk` CLI, vendored as a submodule; no Node OKF writer | operator, 2026-09-21 |
| OKF stays **v0.2**; `pk` is brought up to it first ("Keep v0.2, fix pk first") | operator, 2026-09-21 |
| Commits carry `Assisted-by` only — no `Co-Authored-By`, no `Signed-off-by` (A-15) | operator |
| Review: critic `MiniMax-M3`, judge `k3` via liter-llm; fallback `gpt-5.5` via `:8181` | operator |
| Nothing is pushed to **either** repository without the operator saying so in that turn | `goals.md`; the PR #12 go-ahead does not carry over |
| `openspec/config.yaml` is edited only after the operator approves the shown diff | A-12 |

## Dispatch contract

| # | Change | Where `/kbd-apply` runs | Tasks | Starts when | Gate |
|---|---|---|---|---|---|
| 1 | `okf-v02-writer` | `../prometheus-knowledge`, branch `feat/okf-v02-writer` | 14 | now | fmt · clippy `-D warnings` · workspace tests → `prometheus-rust-auditor` → diff review → **stop at 6.3** |
| 2 | `karpathy-progress-recorder` | here | 34 | change 1 reaches its task 6.3 stop (it does **not** wait for the go-ahead) | `node scripts/refine-validate.mjs` → diff review → `openspec-verify-change` → archive |
| 3 | `okf-v02-via-pk` | here | 9 | change 2 archived **and** change 1 merged upstream | same as change 2 |

Change 1's OpenSpec files and archive live in the pk repository's own `openspec/`. It is registered here
by id so the phase counter is honest about the work the phase contains. Canonical task ids are scoped to
their change, so its `1.1` and change 2's `1.1` do not collide.

Only the *waiting* in change 1 overlaps change 2. There is one agent and the work is serial.

## QA gate — as contracted, and what differs

For changes 2 and 3 the contracted gate runs in full: `node scripts/refine-validate.mjs` (no change id;
it validates the project's constraints from the working directory) → adversarial diff review → verify →
archive.

For change 1 the constraint gate is this repository's and cannot run there. The substitute, in order:
`cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets --locked -- -D warnings`,
`cargo test --workspace --locked --no-fail-fast` → `prometheus-rust-auditor`, findings fixed or listed →
diff review with the auditor's report in the packet → the stop at 6.3. Declared here, in advance.

Review packets are hand-assembled (`scripts/build-review-packet.mjs` is still unbuilt). Every packet is
secret-scanned with the source pack's full seven-alternative pattern, and the scan is mutation-checked
whenever it changes.

## Per-task rules (binding)

- **RED commit → GREEN commit**, with the failing output pasted under the RED task.
- Node tiers: T0 `node --check`; T1 `node --test <the one file>`; T2 at change completion. Rust tiers
  (`rules/src/tech/rust.md`): T0 `cargo check -p <crate>` + `cargo clippy -p <crate> --no-deps -- -D
  warnings`; T1 `cargo test -p <crate> <test>`; T2 at change completion. Never `--release`. One cargo
  process per target directory. A higher tier run early is a rule violation, not diligence.
- **Read an upstream function whole before porting it**, and print a pattern by line range, never from a
  grep hit. Change 2's task 3.0 is this rule made a task.
- **Mutation before every judge call**, output pasted. For a disjunction: one value per alternative, one
  mutation per deletion.
- **Every count cites its command.** Three counts written by eye were wrong this phase ("13 sites" was 8;
  "five alternatives" was 7; a limits list dropped `observedAt`'s 64).
- Credential-shaped test values are **assembled at run time**; this repository is public.
- A change reaching **review round 3 stops** and this file and the plan are re-read.
- No change edits `.kbd-orchestrator/project.json` or `constraints.md`.

## The first task, and the first stop

Change 1, task 1.1: add `Source` tests to `pk-core/tests/types_tests.rs` and watch them fail.

**Re-plan trigger:** change 1's task 1.3 is `cargo check --workspace` straight after `WikiEntry.sources`
changes type. Non-test sources touching the field today: 4 files (`grep -rln 'with_sources\|\.sources'`).
If the fallout is materially wider than that, stop there and re-plan rather than sink the phase into it.

## Known weakening of the gate, stated up front

- Nine fixes across analyze, spec and plan were applied **after** a PASS and were never seen by a judge.
  Each was verified against source; every requirement they touch has a scenario, so a wrong one fails a test.
- `pk ingest` succeeding from Node on Windows **cannot be proven in CI**: `pk` has 0 releases, CI does not
  check out the submodule, and nothing there builds Rust. That path stays self-reported.
- **Corrected 2026-09-21:** the plan claimed changing `sources` does not break MCP consumers. It does:
  `handle_get` returns the whole `WikiEntry`. The Rust auditor found that, and a CRITICAL the author's
  evidence could not see — 1.9.0 rejects every non-empty 1.8.0 prompt snapshot, reproduced on the real one.
  Change 1 gained a section 7 of fixes; it does **not** reach its task 6.3 stop until they are done.
- The Python hash vectors (change 2, task 1.2) are an operator input. Without them the portability goal
  closes as *declared for non-integer values*, not as met.

## What completion means for this run

Implementation is complete when all three changes' tasks are done. It is **not** complete — and must not
be reported so — while change 1 is unmerged upstream: change 3's task 1.1 then stops, and the OKF goal is
NOT MET. After this phase the recorder exists and is invoked by hand; nothing fires it, because this
repository carries no KBD lifecycle skill yet.
