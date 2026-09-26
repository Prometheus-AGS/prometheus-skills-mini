---
title: Windows Constraints
sidebar_label: Windows Constraints
---

# Windows Constraints

Pulled directly from `openspec/config.yaml`'s binding constraints and this repo's own
constitution. Every change to this repository must satisfy all of these.

## Runtime

- Runs on Windows from `cmd.exe` / PowerShell with **no WSL and no Git Bash**.
- Node.js LTS (>=22) is the only script runtime. All hooks and scripts are ESM `.mjs` files invoked
  as `node <file>`; hooks use exec form (`"command": "node", "args": [...]`), never a shell string.
- No `.sh` files. A `.ps1` is allowed only alongside an equivalent for the other platforms, and only
  when Node genuinely cannot do the job — the goal is zero of either.
- No Python, anywhere, including in rendered templates.
- No `jq`, `sed`, `grep`, `awk`, `curl`, `mktemp`, or `chmod` — in scripts *or* in `SKILL.md`
  instructions the agent is told to run.
- No symlinks. Installers copy. No reliance on the executable bit.

## Paths and processes

- Paths via `path.join`, `os.homedir()`, `os.tmpdir()` — never `~`, `$HOME`, or `/tmp`.
- Child processes via `spawn` with `shell: false` and an args array — never a command string.

`lib/platform/spawn.mjs` documents the sharpest edge here: npm installs a CLI on Windows as
`<name>.cmd`, and Node cannot run a `.cmd`/`.bat` at all without a shell — since the 2024 security
releases it fails with `EINVAL`. So "spawn with `shell: false`" and "resolve the `.cmd` shim" cannot
both be satisfied by spawning the shim; instead, this module finds the CLI's actual JavaScript
entry point and runs it with the already-running Node executable (`process.execPath`). No shell, no
quoting, no PATH lookup, and the identical code path on every platform. `scripts/spec-validate.mjs`
is the concrete example: it runs the OpenSpec CLI's JS entry directly rather than the `openspec.cmd`
shim.

## Atomic writes and locking

- **Atomic writes:** write to a temp file in the *same* directory, then `fs.rename`. Retry on
  `EPERM`/`EBUSY` — antivirus and search indexers hold files open on Windows briefly after
  creation. `lib/platform/atomic-write.mjs` implements this: the retry is deliberately narrow (only
  `win32`, only those specific codes, only a fixed number of attempts) — every other error is
  rethrown immediately, since retrying `ENOSPC` or `EROFS` would just delay a real problem.
- **Locking:** `lib/platform/lock.mjs` uses `fs.open(path, 'wx')` (exclusive create) as a
  single-writer lock — no dependency, no daemon, no polling. It deliberately does not wait, retry,
  or detect a stale lock; a lock left behind by a crashed process stays until a human removes it,
  because automatic takeover needs liveness detection, a different problem with its own failure
  modes.

## Text and line endings

- `.gitattributes`: `* text=auto eol=lf`; every parser must tolerate CRLF anyway.
  `lib/platform/text.mjs` is the only module in the repository allowed to read a text file directly
  — normalizing CRLF once here means no downstream parser has to think about it. Lone CR and mixed
  endings are deliberately unhandled: neither has been observed, and inventing behavior for them
  would be guesswork.
- Case-insensitive filesystem: no two files differing only by case.
- Keep state paths short — the deeply nested `.kbd-orchestrator/phases/.../children/...` trees
  approach the 260-character path limit.

## Docker

- Docker is reached over loopback TCP only. Never `docker exec` into a container from a hook, never
  bind-mount a host path built from `HOME`, never assume the Docker CLI is on `PATH` — probe and
  degrade.

## Testing

- `node:test`, run in CI on `windows-latest`, `ubuntu-latest`, `macos-latest`. The full pack's
  `bats` tests do not come across.

## What's independently verified vs. self-reported

The `platform-foundation` phase's Windows claims (atomic write, locking, CRLF handling, shell-free
CLI spawning, a `core.autocrlf=true` checkout surviving) are backed by real CI runs on
`windows-latest` — not reasoned from macOS behavior. The later KBD/adversarial-review/ideation-
mindmap/distribution port (1,000+ tests) ran on macOS only as of that commit; Windows verification
for that batch is still owed, and this documentation states that plainly rather than implying
otherwise.

The newer UI/team work has separate
[macOS and offline Linux-container evidence](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/research/ui-ux-routing/DELIVERY.md).
Native Windows execution remains unverified, as do live invocation of every harness and
full Electron installed-app acceptance. A Windows-like path tested on macOS is not native
Windows evidence. [The platform matrix](/docs/ui-ux/overview#platform-and-acceptance-matrix)
separates portable helpers from SDK, browser and harness prerequisites.

The project installers create copies, while preserving supported existing in-project linked
instruction entrypoints. Preservation of an existing link does not make symlink creation a
mini runtime requirement.

## See also

- [Docker Services](/docs/services/docker-services)
- [Comparison with the full pack](/docs/reference/comparison-with-full-pack)
