# UI/UX routing and project-team adoption

Mini distributes **97 skills**, including **40 portable UI/UX entries** from the shared
41-entry full/mini catalog. The extra full-only entry is Impeccable's native engine.
Catalog inclusion records provenance and suitability; it is not a claim that a skill is
universally best. See the [catalog lock](../skills/prometheus-ui-ux/references/catalog.lock.json).

## Install project routing

Run these commands from the mini checkout with Node.js 22 or newer. Replace the quoted
project path with an existing authorized project. On a machine with the full pack installed,
use the full pack's bootstrap; mini belongs only in The Boss's internal data directory on
that machine. These project commands do not waive the [install-scope rule](../site/docs/getting-started/installation.md#the-install-scope-rule).

For layered context plus UI routing and adoption of existing teams:

```text
node scripts/prometheus-context-bootstrap.mjs --path "../My Project" --dry-run
node scripts/prometheus-context-bootstrap.mjs --path "../My Project"
node scripts/prometheus-context-bootstrap.mjs --path "../My Project" --check
```

Bootstrap merges managed context, copies portable UI skills into project
`.agents/skills` and `.claude/skills`, preserves an existing `.agents/UI_UX_PROTOCOL.md`,
and adopts a resolvable existing team. For UI routing alone, use:

```text
node skills/prometheus-ui-ux/scripts/cli.mjs install --project "../My Project" --dry-run
node skills/prometheus-ui-ux/scripts/cli.mjs install --project "../My Project"
node skills/prometheus-ui-ux/scripts/cli.mjs install --project "../My Project" --check
```

The UI-only installer does not create the active-team record or native agents. Adopt an
existing team separately:

```text
node skills/agent-team-creator/scripts/cli.mjs install-project --project "../My Project" --dry-run
node skills/agent-team-creator/scripts/cli.mjs install-project --project "../My Project"
node skills/agent-team-creator/scripts/cli.mjs install-project --project "../My Project" --check
```

An explicit selection in `.agent-team/project-routing.json` wins; otherwise a sole
`.agent-team/<id>/team.json` is adopted. When several teams remain, choose deliberately
with `--team <id>`; stale selection is an error. For a new team, follow the
[creation and installation guide](agent-teams.md#install-the-project-team).
Proposal-only `export` does not complete project adoption.

Managed instruction blocks preserve unrelated prose, CRLF, existing in-project linked
entrypoints and local recovery information. Creator preserves existing native file bytes,
including models, permissions and concurrency; it reports differences for a deliberate merge.
A routing pointer grants no native permission and does not start agents. Read the active record
and real manifest for every code task, select relevant roles, and preserve their ownership.
Backend work still uses its team without activating UI skills.

Creator also updates Zed's first effective existing instruction file, from `.rules`,
`.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`,
`AGENT.md`, `AGENTS.md`, `CLAUDE.md`, then `GEMINI.md`; otherwise it uses `AGENTS.md`.
Inspect `instructionFiles` in the record. External ACP agents retain their own native
configuration. Zed's parallel-thread UI is not a delegation API. If the harness cannot delegate,
use role instructions sequentially and disclose the limitation; builder review is not independent.

## Route the actual UI task

Read `PRODUCT.md`, `DESIGN.md`, `.impeccable.md`, the nearest surface brief, components and
tokens before changing direction. Project `.agents/UI_UX_PROTOCOL.md` overrides the
[bundled protocol](../skills/prometheus-ui-ux/references/UI_UX_PROTOCOL.md). Generated
recommendations do not replace project authority.

Save `ui-request.json` with paths relative to its `project` (the project itself resolves
against the command's working directory):

```json
{
  "project": "../My Project",
  "ui": true,
  "affected": ["apps/web/src/Settings.tsx"],
  "operation": "refine",
  "surface": "app",
  "focus": "accessibility"
}
```

```text
node skills/prometheus-ui-ux/scripts/cli.mjs route --input ui-request.json
```

Use the returned context paths first and load the selected skill IDs in order. The helper
returns a routing decision; it does not execute the selected skills. Set `ui: false` for
backend-only requests. Missing skills are explicit gaps, never an automatic download.
In an installed payload, resolve the actual skill directory instead of assuming this checkout.
Copy the complete payload and required catalog siblings, not just a CLI entry file.

| Operation | Direction and review behavior |
| --- | --- |
| `new` | Establish direction when needed. Actual GPT model IDs select `gpt-taste`; missing/non-GPT model uses `design-taste-frontend`. Set `model` to the model actually running, never the harness name. |
| `redesign` | Explicitly authorized direction change uses `redesign-existing-projects`. |
| `refine` | Preserve incumbent identity; no taste implementation or overlay; focused retrieval only. |
| `review` | Objective evidence and project scope through `prometheus-ui-review`; no taste or redesign. Reviewer/verifier/auditor roles force review routing. |

At most one taste implementation and one explicitly selected overlay apply to new/redesign
work. The supported overlays are `high-end-visual-design`, `minimalist-ui` and
`industrial-brutalist-ui`; refinement/review ignore overlays. Experimental/v1 identities remain
separate catalog entries. One craft skill follows the task: layout, typography, colors, writing,
accessibility, motion, or broad interface work. Relevant platform skills follow the nearest
application manifests; a monorepo root is not evidence of every application's stack.

Surface defaults are Persuade for marketing/landing/pricing, Operate for apps/tools, Read for
docs/articles, and Experience for portfolios/showcases. Existing tokens and explicit design
decisions override defaults. See the [request reference](../skills/prometheus-ui-ux/references/runtime-api.md)
for exact modes, fields, focus aliases and dial ranges.

## Use Pro Max selectively

The shipped TypeScript 7 implementation runs directly as Node ESM with pinned data and assets.
No Python, repository-root runtime dependencies, online catalog refresh or service is required.
For an existing React app, for example:

```text
node skills/ui-ux-pro-max/scripts/search.mjs "keyboard navigation React 19" --stack react --json
node skills/ui-ux-pro-max/scripts/search.mjs "accessible forms" --domain ux --json
```

Use the actual project framework version in the query. To establish a new design direction:

```text
node skills/ui-ux-pro-max/scripts/search.mjs "clinic appointment booking" --design-system --project-name "Clinic" --format markdown
```

Only persist when requested: `--persist --output-dir "../My Project" --page booking` writes
`design-system/<project-slug>/MASTER.md` and page overrides. Existing files are preserved unless
replacement is authorized and `--force` is supplied; forced writes retain recovery copies.
`DESIGN.md` is never overwritten. Stitch output belongs in `DESIGN.stitch.md`.
A zero-result query is an absence of advice, not a recommendation. Pinned catalog versions
never authorize application upgrades. See [Pro Max port scope](../skills/ui-ux-pro-max/PORT.md).

## Review once the production phase is complete

Finish the authorized implementation before running the completed-phase evidence contract.
Save a review request using the same fields, with `operation: "review"`, then run:

```text
node skills/prometheus-ui-ux/scripts/cli.mjs phase-boundary --input ui-review-request.json
```

This returns `status: "evidence-required"`, `executed: false`, a checklist and an exec-form
Node descriptor. It accepts no evidence fields, captures no screenshots, launches no browser
and cannot certify PASS. Exit 0 only means the request was processed. Use available platform
tools to collect applicable device/theme states, keyboard/focus and reduced-motion evidence;
obtain independent read-only review, then one batched correction and confirmation cycle.
Record evidence paths, reviewer identity, unavailable checks and unresolved findings.
Outstanding blockers remain blocking; unavailable independent review remains unverified.

Automatic review uses `prometheus-ui-review` and auto-invocable craft guidance.
`interface-review`, `break`, `variant` and `explain-interface` remain user-only.
Do not read their files to bypass `disable-model-invocation`. No per-edit hook or native
browser/detector engine is implied by this mini adaptation.

## Platform and acceptance matrix

| Surface or host | What mini supplies | What remains separate |
| --- | --- | --- |
| Web/React | Context, craft, relevant Vercel/React guidance and Pro Max stack data | Project runtime, browser captures and acceptance |
| Expo/React Native | Selected native/UI/design/router/motion guidance | Match declared Expo SDK and installed platform prerequisites |
| Flutter | Responsive layout, layout repair, routing and localization guidance | Flutter toolchain and real device/emulator execution |
| SwiftUI | SwiftUI guidance and platform units | Apple toolchain, simulator/device captures and profiling |
| Android | Adaptive Compose and edge-to-edge guidance | Declared Gradle/SDK prerequisites and native execution |
| Tauri/Electron | Shared UI routing; reuse project-specific platform workflow | Desktop packaging and native app acceptance; no invented specialist endorsement |
| Other stacks | Matching Pro Max data and current official documentation | Project-specific implementation and toolchain evidence |
| macOS / Linux | Prior macOS integration and offline Linux Node 22 container evidence | Container evidence is not all Linux desktop/toolchain certification |
| Native Windows | Node-only shipped helpers and portable assets | Native Windows UI/team execution remains unverified |
| Full Impeccable engine | Excluded; bounded `prometheus-impeccable-core` context/workflow adaptation | Native detector, browser engine and engine parity are not shipped |
| Native harnesses / The Boss | Definitions, routing records and packaged-helper evidence | Live invocation of every harness and full Electron installed-app acceptance remain open |

Local installation/routing, bundled Pro Max retrieval, team state and exports work without
surreal-memory or liter-llm. Their optional discovery/publication operations need configured
services. No additional daemon or port is added. Offline helper evidence does not certify
browser availability, platform SDKs or native harness invocation.

The [delivery record](research/ui-ux-routing/DELIVERY.md) links the prior macOS/Linux and
packaged-helper receipts and names remaining acceptance gaps. Historical platform CI and
old test totals do not certify this feature or a release.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Ambiguous teams | Inspect real manifests, choose an existing ID with creator `--team <id>`, then rerun bootstrap. Do not choose arbitrarily. |
| Stale active selection | Reconcile the routing record and existing manifest; use an intentional explicit selection. |
| Corrupt managed markers or escaping paths | Inspect the named file and recovery record, restore a valid pair/path, then repeat dry-run. Do not replace the whole instruction file. |
| Existing native definition differs | Keep its bytes and native permissions; deliberately merge after reading diagnostics. Definition presence alone does not prove invocation. |
| UI install check reports drift | UI/bootstrap `--check` exits 1 for drift, 2 for errors; creator `--check` exits 2 for drift, 1 for errors. Inspect reported paths before applying. |
| A helper/skill is missing | Resolve the installed directory and complete payload. Report the missing dependency; do not fetch or install implicitly. |
| Full pack detected on the machine | Keep mini inside The Boss's internal data directory; use the full pack for native installation. Never delete or shadow existing full-pack skills. |
| No independent reviewer/browser/device | Record the unavailable acceptance step. Sequential role use does not substitute for independent review or captures. |

See [agent teams](agent-teams.md) and the [project installation contract](../skills/agent-team-creator/references/project-installation.md)
for native artifacts, recovery and model/permission preservation.
