# VLBV protocol evals

Per-harness evidence that an agent follows the VLBV method. Ported from the full
pack's `evals/vlbv-protocol` (full-pack 73d67417, phase `vlbv-r4-portability`,
change request CR-31) to mini: Node-only, no shell scripts, no symlinks. The cases
are the 22 acceptance tests of `skills/vlbv/references/requirements.md` plus the
§18 fresh-session check of `supersession.template.md`.

These scripts run **only at a phase boundary** (B4/B5,
`skills/kbd-process-orchestrator/references/boundaries.md`), never as a
development loop. Each harness run is a real model session and costs money.

## Cases

`cases/vlbv-protocol.json` holds 23 cases.

- **17 agent cases** run in every harness with an adapter here. Each sample builds a
  fresh scratch project (a small KBD-managed Node package carrying mini's VLBV policy
  block from `skills/prometheus-context-bootstrap/references/AGENTS.base.md` and an
  open phase without B4 authorization). Skills are copied, never linked. Marker
  scripts record when tests, builds, generated code, publishing or sending actually
  ran, so deterministic checks read file effects rather than the agent's self-report.
- **6 machinery cases** (AT 05, 06, 09, 10, 15, 22) test pack scripts, not agent
  behaviour. `machinery.mjs` runs them once against the real `prometheus` runtime
  through mini's conformance adapter (`test/conformance/kbd-phase-closure-adapter.mjs`)
  and `scripts/kbd-phase-close-eval.mjs`. Every harness report carries their verdicts,
  marked harness-independent.

Cases with a `capabilityFields` entry, and AT 04 (early execution, rare-critical),
need 3 of 3 passing samples; the rest need 2 of 3. A sample passes only when its
deterministic check passes **and** the cross-family grader says PASS.

## Harnesses

| Harness (profile id) | Adapter | Notes |
|---|---|---|
| `claude-code` | `claude -p` | needs `CLAUDE_CODE_OAUTH_TOKEN` (env or `~/.prometheus/kbd/secrets.env`) |
| `codex` | `codex exec` | scratch `CODEX_HOME`, reduced `config.toml` |
| `opencode` | `opencode run` | reduced `opencode.json` |
| `kimi-code` | `kimi -p` | reduced `config.toml` |
| `zed`, `cursor`, `gemini`, `windsurf`, `cline` | none | always reported not run (`NOT_EXERCISED` with a reason), never PASS |

A harness whose CLI is not on PATH is reported not run. On Windows only a native
`.exe` is accepted: Node cannot run an npm `.cmd` shim without a shell, and mini never
enables one, so such a harness is reported not run rather than spawned through
`cmd.exe`.

## Scripts

| Script | Purpose |
|---|---|
| `machinery.mjs [--negative --at ATnn]` | Machinery cases; `--negative` removes one AT's trigger and requires the real script to accept |
| `run.mjs --harness <id[,id]\|all> --samples 3` | Agent cases per harness; writes `evals/reports/<harness>.{json,md}` and validates them |
| `run.mjs --stub exit0` | Negative control: a no-output harness (a Node module that exits 0) must give BLOCKED, never PASS |
| `run.mjs --harness claude-code --samples 1 --keep-scratch --expect-leftover` | Negative control: the leftover-auth check must notice kept auth material (one case only; kept scratch is removed afterwards) |
| `validate-report.mjs --harness <id> [--negative]` | Re-derives every verdict from retained artifacts; `--negative` plants a PASS with a missing transcript and a PASS contradicted by its effects |
| `apply-capabilities.mjs --reports evals/reports [--negative]` | Promotes `config/harnesses/capabilities.json` fields from PASS cases only, then runs `scripts/check-harness-capabilities.mjs`; `--negative` checks that gate rejects three bad promotions |
| `scan-fixture.mjs --case mixed\|all-after` | Drives the closure packet's pre-authorization artifact scan (CR-33); needs `scripts/kbd-boundary-authorize.mjs` and reports BLOCKED without it |
| `scan-secrets.mjs <path>...` | Refuses credential-shaped text in reports and transcripts (AT 22) |

`npm run eval:vlbv-protocol -- --harness all` is the same as `run.mjs`. A
negative-control command exits 0 when the expected rejection was observed.

## Isolation

Each sample runs in a scratch root under the system temp directory with its own
HOME and harness config home. Only the minimum auth material is copied in (owner
decision D-R4-03). Configs are reduced to provider and model settings, with no MCP
servers, hooks or plugins. The scratch root is deleted after each sample. Real
harness files and (on macOS) the harness-related login-keychain items (attributes
only) are hashed before and after each harness; any change stops further harnesses.

Transcripts and effects are kept under `evals/runs/` as local evidence. That
directory is gitignored; the reports in `evals/reports/` are not.

## Grading

The grader goes through the liter-llm gateway, resolved the way mini's
adversarial review resolves it (`lib/review/model-resolution.mjs`):
`LITER_LLM_BASE_URL`, else the first `models.toml` or default candidate that
answers; Bearer `LITER_LLM_MASTER_KEY`, else `OPENAI_API_KEY`. It is MiniMax-M3, or
glm-5.3 when the harness under test is MiniMax. A reply from any other model (for
example a gateway that ignores the requested model) is BLOCKED; no gateway means
every graded sample is BLOCKED.
