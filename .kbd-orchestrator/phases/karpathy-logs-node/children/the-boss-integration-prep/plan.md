# Plan — the-boss-integration-prep (child of karpathy-logs-node)

Date: 2026-09-22. Backend: OpenSpec (`project.json` `specBackend: openspec`). Nine changes, 82 tasks (two added at plan for the full-pack constraint), all
written at spec and validating (`node scripts/spec-validate.mjs`: 21/21 — the Windows-portable wrapper; never the raw `openspec` CLI). This plan orders them, states every
dependency edge, places the one gate that is not a change, names the agent per change, and registers
each change and task canonically. It does not add scope; the two ports open as sibling phases per the
operator's decision (decision-log, 2026-09-22T11:05Z).

## Ordering, and why

| # | Change | Tasks | Library (analyze) | Blocked on |
|---|---|---|---|---|
| 1 | `review-housekeeping` | 7 | — (build: `rules/lib/versions-toml.mjs`) | nothing; the test ends `todo` until the operator authors `versions.toml` |
| 2 | `pack-doctor` | 9 | `cand-310` (adopt: the-boss's check/fix contract) | nothing; dependent checks are `skip` until 5–9 land; it does not touch `scripts/install.mjs` — change 5 adds `--doctor` when it creates that file |
| 3 | `the-boss-handoff` | 4 | `cand-310`, `cand-302` (reject → the-boss consent action), `cand-327` | nothing; cites the-boss at `10aa57f76c` only |
| 4 | `open-port-phases` | 4 | — | nothing; creates, does not activate |
| — | **GATE: `versions.toml` authored by the operator** | — | — | task 0.1 of every change below asserts `rules/test/versions-toml.test.mjs` **passes** |
| 5 | `openspec-fork-submodule` | 15 | `cand-306` (adapt), `cand-325` (reject cross-spawn) | the gate |
| 6 | `docs-site` | 8 | `cand-304` (adopt Docusaurus 3.10.2), `cand-313` (adopt the full pack's shape) | the gate for tasks 1.2/3.x only (the Docusaurus pin and the deploy); tasks 1.1, 1.3, 2.1 (test, catalog generator, guide content) proceed before it; **operator: Pages enabled** for the first deploy only |
| 7 | `docker-services` | 14 | `cand-311` (build compose), `cand-312` (adopt SurrealDB image), `cand-320`, `cand-321` (adapt submodules), `cand-301` (build detection), `cand-322` (reject dockerode) | the gate; change 5 (`scripts/install.mjs` exists) |
| 8 | `sycophancy-correction-vendored` | 11 | `cand-309a` (adapt), `cand-309` (adapt release model), `cand-323` (reject sdk) | the gate; **operator: fork created and four-fix PR merged**; change 2 (the check it wires into) |
| 9 | `compass-vendored` | 10 | `cand-326` (adapt), `cand-327` (adopt release), `cand-328` (reject http/watch) | the gate; **operator: clean commit tagged and `compass-release.yml` run**; change 2 (registry) |

Why this order:

- **1–4 need nothing the operator has not already given.** They also front-load the two things every
  later change reads: the `versions.toml` comparison module (1) and the doctor registry (2). The handoff
  (3) and the phase creation (4) are documentation and process; putting them before the gate means the
  next phase's inputs exist even if the gate waits days.
- **The gate is not a change.** `CLAUDE.md` §0.2 forbids agents editing `versions.toml`, so no task can
  satisfy it; it is an operator action, and the plan makes it visible as a row rather than hiding it in
  prose. Changes 5–9 each carry task 0.1 — "the real-tree test passes, or stop" — so `/kbd-apply` cannot
  drift past it. The plan-time path check: task 0.1 names `rules/test/versions-toml.test.mjs`, created by
  change 1 task 2.2b.
- **5 before 7:** `docker-services` extends `scripts/install.mjs`, which `openspec-fork-submodule` creates
  (its task 3.2). **2 before 8 and 9:** both wire into `lib/doctor/registry.mjs` and
  `lib/doctor/tools.mjs`, created by `pack-doctor` tasks 1.3 and 2.1; `compass-vendored` task 4.2 extends
  `contract.test.mjs`'s expected id list, created by `pack-doctor` task 1.2.
- **6 is independent** of 7–9 and may run in parallel with them on a second worktree (A-10: separate
  target directories, no shared build output — `site/` has its own `node_modules`).
- **8 before the review-port phase, 9 whenever its prerequisites land.** `sycophancy-correction-vendored`
  is the first link of the chain `config.yaml:88-90` binds (`sycophancy-correction` → `adversarial-review`
  → `deep-research`); `compass-vendored` is on no chain and is last only because its operator
  prerequisite (tag + release run) is the heaviest.

Dependency edges, explicitly (a task naming a file names the task that creates it):

- `pack-doctor` 2.1 `mini.versions-toml` → `review-housekeeping` 2.2 (`rules/lib/versions-toml.mjs`).
- `pack-doctor` 2.1 `mini.docker`, `mini.service.*` → `docker-services` 2.2 (`lib/platform/docker.mjs`);
  until it lands the checks are `skip` with reason (proposal, "runnable before its dependencies land").
- `pack-doctor` 2.1 `mini.submodules` → `openspec-fork-submodule` 4.2 (`resolveNodeCli` tools path);
  `skip` until then.
- `docker-services` 4.3 → `openspec-fork-submodule` 3.2 (`scripts/install.mjs`).
- `openspec-fork-submodule` 3.2 (`--home` refusal) → `pack-doctor` 2.0 (`lib/platform/full-pack.mjs`) — the operator's constraint added at plan: the mini never installs natively beside the full pack.
- `openspec-fork-submodule` 3.2 (`--doctor`) → `pack-doctor` 3.2 (`scripts/doctor.mjs`) — the reverse edge is why `pack-doctor` is #2 and the installer #5; round 1 of the plan review caught the original direction (a `pack-doctor` task extending a file change 5 creates).
- `sycophancy-correction-vendored` 3.3 → `pack-doctor` 2.1 (`lib/doctor/tools.mjs`).
- `compass-vendored` 4.2 → `pack-doctor` 1.2, 1.3 (`contract.test.mjs`, `registry.mjs`);
  `compass-vendored` 5.1 → `the-boss-handoff` 1.2 (the document whose item 10 it *verifies*; the compass
  items are written by change 3 from `analysis.md` Q11, so change 3's acceptance is final when it lands —
  round 2 of the plan review caught the earlier "appends" wording) — 3 before 9's 5.1, satisfied.
- `docs-site` 1.3 → `scripts/carried-mjs.test.mjs` (exists; `site/scripts` added to its walk).
- `open-port-phases` 1.2 → `analysis.md` Q6a/Q6b and `assessment-evidence.md` (exist).

## Prerequisites

| | Status |
|---|---|
| Cross-model review gate | **MET** — `kbd-judge` over `:8181`, `verified-distinct` on every stage of this child so far; `:4000` is the *port's* rule, the host's judge may stay where it is |
| `versions.toml` | **OPEN — operator.** Blocks changes 5–9 by construction (task 0.1). Proposed pins are in `docs/versions-toml.md` (change 1) and `analysis.md` Q1 |
| `Prometheus-AGS/sycophancy-correction` fork + merged four-fix PR | **OPEN — operator.** Blocks change 8 §2 onward; §1.2 (the PR) can be prepared first |
| Compass: clean tagged commit on `GQAdonis/compass` `main` + `compass-release.yml` run | **OPEN — operator.** Blocks change 9 §2 onward; the-boss shipping blocks on the release |
| GitHub Pages enabled (workflow source) | **OPEN — operator.** Blocks only change 6's first deploy (task 3.2), not its build |
| "Built on Cherry Studio" positioning | **OPEN — operator.** Blocks nothing; the handoff records it as undecided |
| Docker on this macOS host | **MET** (used for `docker-services` 5.1) — Windows bring-up stays self-reported |
| Container images published by the forks | **NOT MET, not blocking** — `docker-services` builds from submodules; image publishing is an operator follow-up recorded in `analysis.md` Q1a |

## Change 1 — `review-housekeeping`

Agent: general implementer (`tdd-guide` discipline). Tracks the review inputs, archives the completed
analysis change, creates `rules/lib/versions-toml.mjs` and the real-tree test that stays `todo` until the
operator authors the file. Done when the OpenSpec CLI, run through `spawnNodeCli` (`list`), shows only the nine open changes, `git ls-files`
holds `COMPARE.md` and `TOOL_ANALYSIS.md`, and `node --test` reports the versions test as `todo` (or
passing, if the operator has already authored the file).

## Change 2 — `pack-doctor`

Agent: general implementer. `lib/doctor/` on the-boss's contract, `scripts/doctor.mjs` with JSON lines,
`copy-skills` as the only fix, `skills/doctor/SKILL.md`. Done when the doctor runs on this host with every
dependency absent and exits 0 with only `skip`/`warn`, and the mutation on the `..` refusal is pasted.

## Change 3 — `the-boss-handoff`

Agent: general implementer for the handoff; **`impeccable` and `ui-ux-pro-max` skills invoked** for the
design brief (task 2.1). Done when every the-boss citation resolves at `10aa57f76c`, the ten items (compass included) each
have acceptance criteria, and the brief covers the three degraded states.

## Change 4 — `open-port-phases`

Agent: general implementer (process work through `prometheus kbd phase create`; the gotcha check —
canonical state vs files — is task 1.3). Done when both phases are `pending` in `status --json`, the
active path is unchanged, and `project.json` is untouched.

## Change 5 — `openspec-fork-submodule`

Agent: general implementer. After the gate. Done when a clean clone with submodules runs
`install.mjs --openspec-only` then `spec-validate.mjs` with the same totals, the root has zero
dependencies, `node_modules` has no symlink, and the CRLF scenario is observed on `windows-latest`.

## Change 6 — `docs-site`

Agent: general implementer; may run on a second worktree in parallel with 7–9. Done when `npm run build`
in `site/` passes with `onBrokenLinks: 'throw'`, every skill has one catalog page, the workflow's SHAs
match the full pack's, and — once Pages is enabled — the first deploy is green.

## Change 7 — `docker-services`

Agent: general implementer. After the gate and change 5. Done when `docker compose config` validates on
three OSes, `up`/`status`/`down` run green on `ubuntu-latest` as three separate steps and on this host
with memory per container recorded, and the secret scan over `docker/` is clean.

## Change 8 — `sycophancy-correction-vendored`

Agent: general implementer; `prometheus-rust-auditor` for the fork PR review. §1.2 (the PR) may be prepared
before the operator's fork exists, as a patch. Done when the four-fixes test passes over the submodule,
`sycophancy-certify` is green on three OSes, and the resolver is wired into the doctor.

## Change 9 — `compass-vendored`

Agent: general implementer; `prometheus-rust-auditor` for the certification job. Done when the pin is a
tag on `main`, `compass-certify` is green on three OSes, `mcpServerConfig()` has no port, and the doctor
fails an HTTP registration.

## Per-task rules (binding, from the specs and A-9)

- **Never install the mini natively on a machine that has the full pack** (`config.yaml`, added 2026-09-22). No task copies anything under `~/.agents` or `~/.claude` without first checking `detectFullPack()`; on this development host — which HAS the full pack — every `--home` path is exercised only against an injected temp home, never the real one.

- Test first; cheap checks only while implementing (`node --check`, the one test file); the full battery
  at each change's close task.
- Every Windows claim is self-reported until a `windows-latest` run with a named asserting test is
  recorded in this child's `evidence/windows.md`; changes 5, 7, 8, 9 each have such a task.
- Every count cites its command. Every mutation pastes its output into the task.
- No `.sh`/`.py` anywhere the gate covers; `spawn` with `shell: false` only; npm by its JavaScript entry;
  copies, never symlinks; no `&&`/`||`/`;` in any CI step.
- A task that the operator must perform is written as "Operator:" and is never performed by the agent;
  the change stops there and says so (A-11, A-12).
- `versions.toml` is read, never written, by any task.

## QA gate per change

`refine-validate` (deterministic checklist against `constraints.md`) → `/adversarial-review --mode diff`
(cross-model; the packet must carry a `depends_on` manifest for files the change relies on but does not
touch — the gotcha of 2026-09-21) → archive on PASS; CRITICAL → fix, re-run both. Changes 3 and 4 are
documentation and process; they still go through diff review (E-3 allows skipping only trivial mechanical
changes, and neither is).

## Review

Judge `kbd-judge` over `rest-gateway:http://localhost:8181/v1`, producer `claude-fable-5-1`, `verified-distinct`. Round 1 BLOCK (1 CRITICAL — `pack-doctor` extended a file change 5 creates; fixed by moving `--doctor` to the file's creator; 1 WARNING — raw `openspec` references; fixed). Round 2 **PASS** with 2 WARNINGs, both fixed rather than carried: the docs-site gate now covers only its pin-dependent tasks, and the handoff carries the compass item from the start so its acceptance is final. Artifacts in `review/plan/`.

## Risks

- **The gate waits on the operator; five of nine changes sit behind it.** Mitigation: changes 1–4 are
  real work that does not wait, and change 6's content work does not either.
- **Build-on-install of the OpenSpec fork on `windows-latest`** is the one mechanism here with no prior
  evidence in this repository. Fallback is recorded (`cand-307`, the npm git-dependency form).
- **`docker-services` first bring-up builds two Rust services inside Docker** — minutes and gigabytes;
  measured in task 5.1, not estimated. If the 16 GB budget is exceeded, the operator follow-up (published
  images) becomes urgent rather than deferred.
- **Compass certification is heavy** (452k LOC, bundled SQLite, tree-sitter pack, NASM on Windows);
  `target/` caching per OS is in the task, and a timeout guards the job.
- **Two sibling phases inherit decisions made here.** If either finds Q6a/Q6b wrong at its own assess,
  it says so in its assessment rather than silently re-deciding.
