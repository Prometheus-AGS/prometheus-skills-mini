# Maintenance, upgrades and recovery

This contract covers the portable mini skill pack, its copied payloads, local
team/KBD helpers, file-tier learning and optional service clients. The current
learning/deploy/debt candidate is source work. Generated artifacts, compilation,
local integration, approved publication, installed payloads and real user-path
acceptance remain separate. This draft does not certify a release or authorize a
machine update.

The full pack and optional Prometheus Companion have their own installers,
services and contracts. An absent optional service is normal. Mini must not be
installed into a native home already owned by the full pack; an application-owned
internal data directory is the separate supported scope in that situation.

## Bounded support matrix

`skill-system.json` declares `darwin`, `linux` and `win32` for portable skills.
Node 22+ is the script runtime. Exact OS releases, architectures and installed
harness versions must be frozen in the accepted release matrix; they remain
pending for this candidate. A source portability claim or Windows-like path on
macOS cannot certify native Windows operation.

| Platform | Portable source contract | Optional service boundary | Acceptance |
|---|---|---|---|
| macOS | Node 22+, copied payloads | Compatible external services or separately selected Docker stack | Pending release-bound native harness and real operation receipts |
| Linux | Node 22+, copied payloads | Compatible external services or separately selected Docker stack | Pending exact host, harness and service receipts |
| Windows `cmd.exe`/PowerShell | Node 22+, shell-free portable helpers; no WSL/Git Bash/Python requirement for these helpers | Existing Docker Desktop/Engine and Compose when selected; mini does not install them | Pending native Windows receipts |

The nine finite target IDs are `claude`, `codex`, `opencode`, `agents`, `cursor`,
`gemini`, `windsurf`, `zed` and `cline`. Their manifest paths are respectively
`.claude/skills`, `.codex/skills`, `.opencode/skills`, `.agents/skills`,
`.cursor/skills`, `.gemini/skills`, `.windsurf/skills`, `.zed/skills` and
`.cline/skills`. All use copies. Claude and Codex have generated plugin packages;
the other declared skill directories do not imply native hook or plugin support.
Codex's generated hooks differ from Claude's lifecycle events. Each advertised
binding requires discovery and invocation from the installed harness.

Portable helper support does not port every imported skill's external tools or
full-pack shell helpers to Windows. Such helpers retain their explicit runtime
requirements. POSIX package permission preservation and Windows byte/kind
verification also have different capabilities; see
[distribution permissions](distribution.md). Do not advertise a missing mode
check as a successful POSIX check.

## Compatible releases and reproducible installation

Freeze exact mini source, dependency gitlinks, lockfiles, generated package and
marketplace hashes, service image digests, configuration/schema identities and
harness versions together. The candidate baseline is merged mini main
`ce893fb89bb20c250ff222a6d12c2e0f4820eef0`, containing the earlier hook fixes;
pending phase edits still require their own final source identity. The observed
manifest/package version is `1.11.2`, with manifest minimum `0.2.0`. Neither
declaration approves a new release tag or guarantees current features in all
older accepted versions. Exact release versions, protected-edit approvals and
the compatible full/memory graph are owned by change 03.

Acquire the approved immutable artifact from its recorded origin and compare its
hash/revision with the release manifest. Preserve the prior accepted payload,
registration and data before updating. Use a durable release checkout or the
approved packaged installation; registering an ephemeral feature worktree as a
directory marketplace makes the plugin depend on that directory continuing to
exist. Generation is a maintainer operation at the final boundary, not evidence
that a harness has installed or invoked the payload.

The generator's production source entry points are:

```text
node scripts/generate-skill-system-distribution.mjs
node scripts/generate-skill-system-distribution.mjs --check
```

They materialize the Claude/Codex packages and marketplace files from
`skill-system.json`. Run them only after complete production implementation at
the applicable final local boundary. `--check` leaves generated outputs unchanged
but uses temporary staging and may inspect permission capabilities; it is not a
zero-write inventory command. Source changes in `runtime/src/*.mts` do not update
the installed `runtime/*.mjs` until the owned compilation/distribution work occurs.

Install/register the approved package using the selected harness's own plugin
interface and record its actual registration and discovered root. Skill copying
is a distinct surface: `node scripts/doctor.mjs --fix copy-skills` only applies
the named copy repair and refuses a full-pack native home. It preserves user-owned
or edited files and does not automatically delete extras. Inspect the reported
outcome; `fixed`, `requires_relaunch` and `refused` are different results. This
repair does not establish plugin hook activation.

The mini doctor source (`scripts/doctor.mjs`) emits JSON lines and a summary.
Its stable check IDs/statuses/fix outcomes are a process contract consumed by
other applications; a breaking rename or changed meaning requires coordinated
consumer migration. The plugin-source check currently examines Claude directory
registrations only. It cannot prove Codex registration health. Reload/restart
the harness after repairing a source path or switching payloads.

## Update and rollback

1. Record the accepted source/payload graph, installed paths and registrations,
   selected application/native install scope, service ownership and current data
   roots. Preserve private configuration without copying credentials to evidence.
2. Pause writers and back up project/team state, file-tier learning, outboxes,
   publication receipts and any owned service database consistently.
3. Complete coherent source changes, compile required runtime outputs, reconcile
   generated packages/sites and run the local final integration and independent
   review boundary in scratch homes/data. Hosted tests and existing unit results
   are not this phase's acceptance evidence.
4. After protected-version/tag, publication/merge and rollout approvals, replace
   only owned payloads using the normal package/harness installer. Preserve user
   collisions. Restart affected harness sessions and owned services.
5. Record the installed revision/hashes and invoke the real advertised path:
   team discovery/adoption, local KBD, hook behavior and scoped write/recall when
   optional memory is part of the accepted matrix.

Mini has no full-pack immutable-generation `--rollback` API. Restore the previous
approved payload through its owning installer and restore its documented
registration; keep both payloads and receipts. Do not treat a full-pack command
as a mini rollback command. User-modified skill copies need an explicit
disposition before replacement. Keep project state, queues and accepted remote
writes when rolling back executable files. If the old payload cannot read the
current schema, restore a private snapshot in an isolated destination or use its
documented migration; retain the newer state for reconciliation.

There is no blanket mini uninstall/data-delete command in this contract. Remove
only an explicitly identified, owned installation through its harness/host
installer after preserving receipts and data. Preserve unrelated directories and
the durable source used by any remaining registration.

## Optional service maintenance

Read [Docker service operations](../site/docs/services/docker-services.md) before
managing the Compose project. `scripts/services.mjs` owns only the selected mini
Compose project, with `surrealdb`, `surreal-memory` and `liter-llm` as its finite
service IDs. Discovery of a full/external endpoint does not authorize lifecycle
management, credential import or service takeover. The stack is optional for
local skills/team/KBD work.

After approved image/configuration selection, these are the bounded operator
entry points:

```text
node scripts/services.mjs discover --json
node scripts/services.mjs status --external --json
node scripts/services.mjs pull
node scripts/services.mjs up
node scripts/services.mjs status --json
node scripts/services.mjs logs surreal-memory
node scripts/services.mjs stop surreal-memory
node scripts/services.mjs restart surreal-memory
node scripts/services.mjs down
```

`--directory <path>` selects the Compose configuration root. `up` uses the
prebuilt image path without building. `stop`, `restart` and `down` retain named
volumes; no volume-delete command is supplied. Record the previous image IDs,
resolved Compose project, configuration and volume backups before a pull/update.
Rollback selects the previous approved immutable images and compatible config,
then recreates only that owned stack. Preserve newer database state if an image
is downgraded. A maintainer build overlay is not the normal prebuilt installer or
an installed-harness acceptance receipt.

The shipped source stack binds loopback ports 28000, 23001 and 4000. Memory uses
namespace `memory`, database `main_local_384`, and local 384-dimensional
`bge-small-en-v1.5` embeddings. Full native `memory/mcp` is a different store;
the same port does not merge them. Surreal data and embedding cache are distinct
named volumes. Record the resolved image digests and model/database settings;
cache restoration does not convert stored vectors.

Credentials are supplied privately through the ignored environment/configuration
surface. Scoped memory fields are not network authentication. A `/health`
response or liter-llm `401` proves a listener at most; accepted scoped write/recall
or a real configured-model request must establish the useful operation. Endpoint
discovery alone proves neither identity, trust, authorization nor compatibility.

## Learning state, backups and uncertain publication

Mini keeps its local file tier and outbox. It does not acquire the full pack's
Python worker/Cortex pipeline merely by pointing at a service. The candidate
team-creator memory source maps publication to canonical `POST /api/v1/memory`
without a trailing slash, with an explicitly resolved local project as `user_id`
and the learning scope as `agent_id`. It retains a durable `missing_project_id`
result when identity is absent. It must not borrow an ambient home project's
tenant identity. These source safeguards still need compiled packaged-entry
acceptance.

Retain original envelopes, target/mapping/body identity, attempted publication
keys and receipts. A timeout or crash after remote commit but before the local
receipt leaves an uncertain outcome. Reconcile the recorded request at the
recorded destination before an explicit retry; do not rewrite an old attempted
body into the new envelope or claim exactly-once remote delivery. Local queued
work must survive service outage and executable rollback. A successful HTTP
response still does not establish tenant authorization or cross-scope isolation.

Back up the project's `.agent-team` selection/definitions, authored KBD/OpenSpec
state, receipts/history, learning files and durable queues, plus the selected
application configuration and installation receipts. Record original task IDs
and source/revision identities. If the project also uses full native KBD, its
canonical signed authority, registry and credential-store key recovery belong
to the full runtime; a mini file copy is not its authority backup.

For owned Compose data, stop writers for a consistent database snapshot. Preserve
namespace/database/user and embedding configuration with the private backup.
Restore to an isolated destination first and retain original volumes; establish
schema compatibility and actual write/recall behavior before promoting the
restore. An embedding-cache snapshot is not a database snapshot. External/full
services must be backed up/restored by their owner, not by mini lifecycle commands.

The full runtime's new `migrate --projections --dry-run`/`--projections` path is
not a mini migration API. It inventories or adopts/archives derived `progress.json`
without journal import, events or invented phases; unknown phases are archived
without a replacement. The full contract is `docs/maintenance.md` in the exact
compatible `prometheus-skill-system` release. Its publication-bound crosslink is
pending this phase's release freeze/publication; no live release URL is assumed
here. Preserve historical task flags and missing
boundary receipts until the owning final reconciliation supplies evidence.

## Optional Companion boundary

Companion's selected source now supplies separate `docs/installation.md`,
`docs/control-api.md` and `docs/maintenance.md` contracts. Consult those source
documents for its own installers, signed control protocol and recovery. Its
initial origin remains a private local mirror; change 14's publication owner
supplies real remote/download links after the approved freeze. Mini does not
install or require this extension, manage its host, or acquire full native KBD
authority by copying files. Pack contract `1.0.0` and signed push schema `1.7`
are independent source contracts, not acceptance of this candidate.

Choose one socket-owning headless, Tauri or standalone daemon host. Companion
MCP mode is a stdio bridge to that existing Unix host and has no TCP fallback;
server mode disables P2P. The selected data root is `PROMETHEUS_DATA_DIR` or the
platform data-local root. Socket resolution is standalone `--socket`, then
`SOVEREIGN_SYNC_SOCKET`, then
`<data-local-dir>/prometheus/run/sovereign-sync.sock`. A data-root override does
not move the socket, signing key or P2P identity.

Configuration resolves from standalone `--config`, `SOVEREIGN_SYNC_CONFIG`,
`XDG_CONFIG_HOME/sovereign-sync/config.toml`, then
`~/.config/sovereign-sync/config.toml`. Signing uses
`PROMETHEUS_DEVICE_KEY_FILE` or the managed XDG-style
`sovereign-sync/device-key.json`; interactive credential-store access is not
headless signing authorization. P2P uses selected `node.p2p_identity_file`.
Keep the same endpoint/runtime scope on host and MCP client. Invalid explicit
config/key selection fails rather than silently borrowing another identity.

The macOS installer owns `ai.prometheus.companion`, with prior-plist backup.
Claude registration uses its user-scope MCP CLI, explicit installed binary and
private receipt; it preserves unrelated or unowned entries. A registration does
not start a host. Linux Unix headless has source support but no supplied service
installer or accepted platform artifact. Native Windows, other-harness
installers and a mobile app are outside this packaging contract. Mini's Windows
portability does not extend Companion's Unix contract. Tauri supplies a
five-state service-health tray observation and starter window, not an accepted
dashboard or pairing UI. Headless shutdown has bounded source handling;
desktop cancellation alone does not establish a joined clean exit.

The MCP signed-push client privately fsyncs exact request/endpoint intent beneath
`<data-root>/prometheus/companion/mcp-push-outbox/<request-id>.json` before
submission. Back it up with its original ID/body and host receipts. Intent is
not remote acceptance or peer delivery. Failed recording sends nothing;
response loss requires original-host receipt lookup before exact authorized
replay. Do not silently change operation IDs, signatures or frontier to obtain
success. A local broadcast receipt does not establish peer application. Host
binary rollback preserves newer signed history, identity and successful
receipts. Optional network pairing is separate from project signing authority,
and local-only surreal-memory payloads must not be synced.

## Security, regression triage and limits

Mini maintainers own portable scripts, copied payloads, package/marketplace
generation and their source/public docs. Memory, liter-llm and SurrealDB owners
own their services/images; the application/harness owner owns registration and
its doctor adapter. Companion owns its optional contract and independent
installer; its source publication and final compatibility remain pending.
No unrelated desktop/mobile product behavior or automatic updater is promised.

Review dependency/image pins, known vulnerabilities, licenses and compatibility
before each release and on a relevant security report. Reject source/output
path escapes and unexpected payload links. Retain POSIX executable intent where
supported while dropping special bits/world write; use Node entry points for
portable helpers. Back up before a fix that writes. A crash-left exclusive lock
needs owner/liveness investigation; do not remove another writer's lock or
automatically take over its data.

Report regressions with exact source/payload/image IDs, OS/architecture, Node and
harness versions, installation scope, entry point, expected/observed result,
queue/receipt identity and uncertainty. Redact keys, tokens and lesson bodies.
Route portable payload/copy failures to mini, registration/invocation failures
to the host, and remote store/provider failures to the service owner. Preserve
the original canonical blocker/task ID and unedited source/evidence.

Known limits include pending native Windows/harness acceptance, narrower hook
bindings than the nine skill targets, Claude-only directory-source diagnosis,
uncompiled candidate runtime fixes, no guaranteed remote idempotency and
unapproved release identities/publication-bound Companion links. Companion
operational source reconciliation is complete; installed compatibility and
useful operations are not yet accepted. Source convergence, a generated
package, a doctor result or an old hosted run cannot establish maintenance
readiness. Change 12 owns the consolidated local acceptance/review and approved
rollout. The release owner supplies exact compatible platform/harness/source/
artifact bounds and approved publication links; final readiness stays false
until the required change 12 evidence and owner decisions exist.
