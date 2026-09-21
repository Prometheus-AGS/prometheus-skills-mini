PLAN: karpathy-logs-node
Project: prometheus-skills-mini
Date: 2026-09-21
Backend: **openspec** (`project.json.specBackend`) — in **two** repositories
Changes: 3 · Tasks: 57 (14 + 34 + 9) · Driver: `/kbd-apply` per task, never bare `/opsx:apply`

Task counts come from `grep -c '^- \[ \]' <change>/tasks.md`, run 2026-09-21 against each change.

## Ordering, and why

| # | Change | Repository | Tasks | Blocked on |
|---|---|---|---|---|
| 1 | `okf-v02-writer` | `prometheus-knowledge-rs` (local branch `feat/okf-v02-writer`) | 14 | nothing to start; **operator go-ahead to push** at task 6.3 |
| 2 | `karpathy-progress-recorder` | this one | 34 | nothing; task 1.2 (Python vectors) is an operator input that does not block |
| 3 | `okf-v02-via-pk` | this one | 9 | change 1 **merged upstream**; change 2 done (it creates `lib/karpathy/`) |

**This reverses the order in the spec handoff, which listed the recorder first.** The reason is the
critical path. Change 3 cannot start until change 1 is *merged upstream*, and that path contains the only
waits this phase cannot shorten: the operator's go-ahead, a push, a three-OS CI run, and a merge. Change 2
has no such wait and is the largest piece of work. Doing change 1 first lets the *waiting* overlap change
2's 34 tasks instead of following them. Only the waiting overlaps — there is one agent and the work is
serial. Concretely: change 1 runs to its task 6.2; at 6.3 it stops and asks for the go-ahead; the agent
then switches to change 2 and does **not** wait. Whenever the go-ahead, the push, CI and the merge have
all happened, change 3 becomes unblocked; it is picked up after change 2 is archived, not before.

The cost, stated: if work stops before change 2 is finished — a session limit, or the operator
redirecting — the phase's main deliverable, the recorder, is not the thing that got built. That is acceptable only because change 1 is small (14 tasks against 34) and the
phase cannot exit without it anyway (operator ruling: "Keep v0.2, fix pk first"). If change 1 turns out
larger than specced (see risk 2), **stop after its task 1.3 and re-plan** rather than sink the phase into
it.

Changes 1 and 2 touch different repositories with different toolchains and separate build directories,
so nothing in one can break the other. They are still executed one at a time: there is one agent, and
A-10's single-writer rule applies inside each.

## Prerequisites

| | Status |
|---|---|
| `pk` builds and passes on Windows | **MET** — pk PR #12 merged as `80e864b`; `windows-latest` 113 passed / 0 failed; pin moved (`05fdec2`) |
| Cross-model review gate | **MET** — liter-llm: critic `MiniMax-M3`, judge `k3`, endpoint-reported distinct. Fallback: `gpt-5.5` via `:8181` |
| OKF v0.2 spec read | **MET** — fetched 2026-09-21 (it postdates the model's knowledge); cited sections are in the spec-stage packet |
| Python hash vectors (change 2, task 1.2) | **OPEN — operator.** Not blocking: the vector test is `todo` until they exist, and the hash goal is reported PARTIAL without them |
| `versions.toml` | **ABSENT.** CLAUDE.md §0 names it; it does not exist in this repository. No dependency is added by any change, so nothing was needed from it |

## Change 1 — `okf-v02-writer` (pk repository)

`../prometheus-knowledge/openspec/changes/okf-v02-writer/`. Rust. Skill routing: `prometheus-rust-workspace`
is **absent** (§F) — named, not improvised around; `prometheus-rust-auditor` runs after implementation.

- Order inside the change: the `Source` type (§1) → frontmatter (§2) → citations (§3) → root index (§4).
  §1 is first because it changes `WikiEntry.sources`, and everything else compiles against it.
- `library:` none. No crate is added; `serde_yaml` and `serde` already do the work.
- **Task 6.3 is a hard stop.** Nothing is pushed to that repository without the operator saying so in
  that turn; a go-ahead for PR #12 does not carry over.
- Tracked here by id for the phase counter; its files and its archive live in the pk repository's own
  `openspec/`. `/kbd-apply` must be run from that repository for this change.

## Change 2 — `karpathy-progress-recorder`

`openspec/changes/karpathy-progress-recorder/`. Node. New capability `karpathy/progress-recorder`.

- Order inside the change follows data dependencies, each module test-first: fixtures (§1) → `hash` (§2)
  → `validate` (§3) → `canonical-state` (§4) → `event` (§5) → `receipt` (§6) → `session-log` (§7) →
  `transport` (§8) → `record` + entry point (§9) → skill document (§10) → evidence (§11).
- **Task 3.0 comes before any validation code: read `record-progress.py:20-31` and `:199-282` in full.**
  The spec's first draft ported one of seven secret alternatives from a grep fragment; the review caught
  it, and the task exists so the implementation does not repeat it.
- `library:` annotations from `library-candidates.json` — all are patterns, none a package:
  cand-201 (thin Node recorder) → the whole change · cand-203 (Python float token on `elapsedHours`) → §2 ·
  cand-207 (append under the existing lock) → §7 · cand-208 (receipt-driven retry) → §9.
  Rejected and **not** to be reintroduced: cand-204/205/206 (RFC 8785 and stable-stringify libraries —
  they must write `0` where Python wrote `0.0`). `package.json` keeps zero runtime dependencies.
- `build_required` 1–3 are this change: the recorder, its invocation point (a CLI plus a carried skill
  document — this repository carries **no** KBD skill to wire it into), and the ported validation.

## Change 3 — `okf-v02-via-pk`

`openspec/changes/okf-v02-via-pk/`. Documentation, one test file, and the pin.

- **Task 1.1 is a gate, not a formality.** If change 1 is not merged upstream, stop: the OKF goal is
  reported NOT MET and the phase does not claim completion.
- Task 4.1 shows the `openspec/config.yaml` diff to the operator and applies it **only on approval**
  (A-12: the binding constraints are human-gated). Amending it before the pin moves would make it claim a
  v0.2 writer the pin does not contain — the defect this change exists to remove.

## Per-task rules (binding, from the specs and A-9)

- Behaviour is added **RED commit → GREEN commit**, with the failing output pasted under the RED task.
- Tiers, Node: T0 `node --check` per edit; T1 `node --test <the one file>` per unit; T2 at change
  completion (`node --test`, `node rules/build.mjs --check`, `npx --no-install openspec validate --all
  --no-interactive`). T3 is CI only.
- Tiers, Rust (`rules/src/tech/rust.md`): T0 `cargo check -p <crate>` and `cargo clippy -p <crate>
  --no-deps -- -D warnings`; T1 `cargo test -p <crate> <test>`; T2 at change completion `cargo test
  --workspace --locked --no-fail-fast`. Never `--release`. One cargo process at a time per target dir.
- Running a higher tier earlier than its point is a rule violation, not diligence.
- **Read before porting.** Any task that ports an upstream function reads that function whole first and
  lists its checks. A pattern is printed by line range, never taken from a grep hit.
- **Self-review by mutation before every judge call** — revert the implementation and confirm the test
  fails; paste the output. For a disjunction: one value per alternative, one mutation per deletion.
- **Every count cites its command.** Twice this phase a count written by eye was wrong ("13 sites" was 8;
  "five alternatives" was 7).
- Test values that look like credentials are **assembled at run time**. No token-shaped literal is
  committed: this repository is public and push protection would be right to reject it.
- A change reaching **review round 3 stops**; this plan and `hook-entry-node-only/reflection.md` are
  re-read before continuing.
- No change edits `.kbd-orchestrator/project.json` or `constraints.md` (owned by `/kbd-init`).
- Commits are local with an `Assisted-by` trailer and no `Co-Authored-By` or `Signed-off-by` (A-15).
  Nothing is pushed — to either repository — without the operator saying so.

## QA gate per change

`node scripts/refine-validate.mjs` (the constraint gate; it takes no change id and validates the project's constraints from the working directory) → on PASS an adversarial **diff**
review, critic `MiniMax-M3`, judge `k3` → on PASS `openspec-verify-change`, then archive.

For change 1 the constraint gate is this repository's and does not run there. Its gate, in order:
(1) `cargo fmt --all -- --check`, clippy `-D warnings` and `cargo test --workspace --locked
--no-fail-fast`; (2) on PASS `prometheus-rust-auditor`, whose findings are fixed or listed before
going on; (3) on PASS the adversarial diff review, whose packet includes the auditor's report; (4) on
PASS the hard stop at task 6.3. That substitution is declared here, not made silently.

Review packets are still hand-assembled (`scripts/build-review-packet.mjs` remains unbuilt, owned by
`adversarial-review-node`). Each packet is secret-scanned with the source pack's **full** seven-alternative
pattern before dispatch, and the scan is mutation-checked whenever it changes.

## Risks

1. **The Python vectors never arrive.** Then `eventSha256` portability is verified for one value only, and
   the goal "receipt hashes are portable, or the incompatibility is declared" closes as *declared for
   non-integer values*, not as met. Hook events are unaffected: they compare the identity hash, which
   holds no float and already matches.
2. **`WikiEntry.sources` ripples further than the grep shows.** Non-test sources touching it: 4 files
   (`grep -rln 'with_sources\|\.sources'`). ~~Checked this stage and **refuted** as an external break: `pk-mcp` returns a five-field
   `entry_summary` with no `sources`.~~ **That refutation was WRONG (corrected 2026-09-21).** `handle_get`
   (`pk-mcp/src/tools.rs:273`) returns the whole `WikiEntry`, so the MCP wire shape of `sources` did change. I
   read the lines that show it and looked only at `entry_summary` beneath them; the Rust auditor caught it.
   Events do carry ids, not entries — that half holds. And the break that mattered was one neither of us
   predicted: the prompt snapshot (auditor finding 1).
   Tests were not counted. Mitigation: change 1's task 1.3 is `cargo check --workspace` immediately after
   the type change, and the re-plan trigger above is tied to it.
3. **Change 1 waits on the operator and the phase stalls.** Mitigated by the ordering; if the go-ahead
   has not come by the time change 2 is archived, the phase reports change 3 BLOCKED rather than idling.
4. **`pk ingest` succeeding from Node on Windows cannot be proven in CI.** `pk` has 0 releases, the
   submodule is not checked out in CI, and nothing there builds Rust. The transport is proven against an
   injected `spawn` and against a real executable that fails; the success path stays self-reported.
5. **Nothing fires the recorder.** This repository carries no KBD lifecycle skill, so after this phase the
   recorder exists and is invoked by hand. That is stated in the carried skill document and is the
   first thing the phase that ports the KBD skills must wire.
6. **The spec-stage fixes made after each PASS are unreviewed** — seven after analyze, two after spec
   round 2. They were verified against source, not by a judge. A wrong one surfaces as a failing test,
   because every requirement they touch has a scenario.
7. **Two event-id sources disagree.** `project.json` and the waypoint carry different `projectId`s, and
   the recorded `eventId` reproduces only from the waypoint's. A test pins this; reading the wrong file
   would silently fork every event id.
