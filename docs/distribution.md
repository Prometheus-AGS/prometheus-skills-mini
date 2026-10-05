# Distribution permissions

`scripts/generate-skill-system-distribution.mjs` builds the Claude and Codex
packages and marketplace files declared in `skill-system.json`. All payload
entries are real copies. Generation and reconciliation belong to the final
integration boundary of `phase-learning-deploy-and-debt`; this document records
the source contract, not acceptance results.

The package builder preserves a source file's ordinary permission bits and
executable intent while dropping special bits and world write. Owner read is
retained. Directory copies retain safe source permissions and owner read, write
and traversal so that staging, cleanup and later regeneration remain possible
even when a source directory is read-only. New package structure uses `0755`
directories. Canonical JSON and its atomic temporary files use `0644`, with no
executable bits. Explicit permission restoration prevents a caller's umask from
silently removing executable intent or directory access.

The same copy behavior covers skill helpers, hook targets, lifecycle and cadence
dependencies, and the final staging-to-output copy. A source helper carrying
`0755` must therefore carry `0755` in a POSIX payload. Permission preservation is
additional POSIX behavior; portable Node entry points continue to be invoked
with Node on Windows.

The source and destination path checks reject traversal outside their owning
roots and symlink ancestors. Payload traversal rejects links rather than copying
or following them. This applies to hook/runtime dependencies and declared output
paths before publication. `--check` inspects entry kinds without following an
unexpected payload link.

`--check` materializes expected outputs into disposable staging and compares
bytes, entry kinds and, when available, full permission modes for files and
directories, including package roots and empty directories. A byte-identical
helper that has lost its executable bit is mode drift on a filesystem supporting
POSIX permissions.

Permission capability is measured only inside staging, with file execute-bit
set/clear and directory-mode changes. Staging is preferably created on the source
volume; a read-only source checkout falls back to the system temporary directory.
Each output's existing path or nearest existing parent must be on that same
volume before the probe can justify mode comparisons. Staging and probe files
are cleaned up after both success and failure. Generated outputs are never
rewritten by `--check`.

Node on Windows cannot express POSIX executable modes. A volume mismatch,
unsupported permission changes or an unavailable probe likewise makes the mode
comparison unavailable. The CLI explicitly reports that limitation and continues
comparing bytes and entry kinds; it does not claim POSIX verification in that
case.

Final acceptance must generate the real package through the production CLI,
launch its packaged refresh helper directly on POSIX, and reject an executable-bit
removal in a disposable output. The helper is
`skills/delivery-cadence/scripts/refresh-skill-pack.sh` within the package. Its
safe read-only mode is `--mode verify --deploy <scratch-git-worktree>`; it has no
`--dry-run` option. Use an isolated scratch HOME, scratch PATH and an explicitly
scratch or unreachable `REFRESH_HEALTH_URL`, omit `--receipt`, and never select
`full` or `auto`. Verify mode reads status and emits JSON; it does not fetch,
install, refresh a cache, update submodules or restart services. This existing
portable skill helper requires its own interpreters and tools; this permissions
change does not port it to a Windows-native implementation.

The final owner records the exact mini source revision, production entry points
and failure/blocker identities in a new version-bound integration baseline.
Historical `mini-baseline-failures.txt` remains historical evidence. The earlier
19-name versus 11-failure discrepancy remains unverified until mapped at that
boundary.
