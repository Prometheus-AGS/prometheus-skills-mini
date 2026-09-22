# Plan handoff — the-boss-shipping-and-settings

**7 changes, 2 repositories.** Order: (1) `the-boss-release-infrastructure` → (2)
`prometheus-001-skills-bundling` ∥ (3) `mini-vendor-submodules` → (4) `prometheus-002-binary-shipping`
→ (5) `prometheus-005-mcp-server-presets` → (6) `prometheus-003-settings-and-doctor` →
(7) `prometheus-004-docker-services`.

**First change to apply: `the-boss-release-infrastructure`.** Nothing else can start — four
repositories have 0 releases between them. Within it, run compass first: it is the most mature
pipeline and both Windows arches, so a failure there predicts the others.

## Ordering rationale

Forced, not preferred. `prometheus-002` cannot write a `sha256` for an artifact that does not
exist. `prometheus-001 §3` installs the app-data pack that 003, 004 and 005 all spawn or resolve
against — the spec review caught that nothing created it. A preset for an unbundled binary is a
catalog entry that fails on click.

## Added during planning

`prometheus-005-mcp-server-presets` — the operator's requirement that **every binary and vendored
project with an MCP server is listed as a system MCP server and configured there**. Four
registrations: compass, rust-mcp-filesystem, sycophancy-correction (all stdio, bundled) and
surreal-memory (HTTP, containerised). `pk` and `openspec` are CLIs and deliberately out of scope.
`goals.md` gained goal 14 so the plan and the goals do not drift.

## WARNINGS carried forward

- **sycophancy-correction is the long pole** — no CI at all. Sequenced last in change 1 and
  explicitly deferrable in change 5; do not let it block the other three registrations.
- **Its repository target is an operator decision made INSIDE change 1 §4.1**, before §4.2 acts.
  Goal says `Prometheus-AGS`; it exists as `Know-Me-Tools`. Anything but the goal is a goal change.
- **Every irreversible act in change 1 is operator-authorized** (A-11): creating or transferring a
  repository, merging, tagging, running a publish workflow. Agents prepare branches and PRs only.
- **Windows is unverified everywhere.** Every change's last task is a Windows run and says so.
- **The QA diff packet must use the cumulative range**, not `git diff HEAD` — the builder defaults
  to the working tree and reviewed almost nothing for two rounds in an earlier phase.
- Change 3 overlaps three existing unstarted mini changes; reconcile at execute rather than
  running both.

## Undecided, carried to execute

Which of the eleven mini doctor checks the-boss surfaces (each needs an id in a closed union plus
a catalog `detail.variant`) — a product call. And `versions.toml` is still unauthored; agents may
not write it, and five mini changes gate on it.
