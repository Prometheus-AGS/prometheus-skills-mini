---
title: Artifact Refinement
sidebar_label: Overview
---

# Artifact Refinement

`skills/artifact-refiner/SKILL.md`: use this skill when creating or iteratively refining artifacts
(logos, UI components, A2UI specifications, images, or content) using structured PMPO orchestration
with explicit constraints, deterministic execution, and persistent artifact state.

PMPO here is the refine loop's own cycle — the artifact-refiner family carries its own state and
constraint-satisfaction model, backed by `lib/refiner/`.

## `lib/refiner/` modules

| Module | Replaces | What it does |
|---|---|---|
| `state.mjs` | `state-init.sh` (105), `state-checkpoint.sh` (47), `state-finalize.sh` (57) | The refiner's state lifecycle. The source scripts shelled out to `python3` for JSON/UUID and to `date -u` for timestamps; none of that survives this pack's no-Python rule, and none of it needs to — `JSON.parse`/`stringify`, `crypto.randomUUID()`, and `toISOString()` cover it. Writes go through `lib/platform/atomic-write.mjs` (a truncating in-place write was a data-loss bug this project already fixed once, and `state.json` sits beside artifacts worth more than it is). |
| `provider.mjs` | `state-resolve-provider.sh` (45 lines) | Resolves which state provider the refiner uses. The source declares six tiers; four are ported. Tiers 4–5 (`command -v mcp \| grep -q "refiner_state"`) are a latent no-op upstream too — `command -v` prints an executable's path, not its capabilities, so on any machine where `mcp` is installed the check can never actually match. Porting that would reproduce a bug with no observed problem behind it, so it is recorded as a decision rather than silently carried forward; MCP-backed state needs a real capability probe, which is a change with its own spec. |
| `session.mjs` | `workflow-dispatch.sh` (151), `post-execute-check.sh` (69), `finalize-session.sh` (31), `log-reflection.sh` (21) | Workflow dispatch and session hygiene checks. Three of the four upstream scripts only warn and exit 0 unconditionally — deliberate upstream behavior, preserved here: they are session hygiene, not gates. A missing `refinement_log.md` is worth telling the operator about, but must never block a session. |
| `validate.mjs` | `validate-manifest.sh` (101), `validate-constraints.sh` (40), two `python3` heredocs in `agents/artifact-validator.md` | The validation the KBD QA gate calls. Every one of the removed `python3` calls was `json.load`, `os.path.exists`, or list/dict logic — stdlib in either language. The "schema check" reads `schema.required` and nothing else, reproducing exactly what the upstream check did rather than pretending to full JSON Schema validation it never had. An absent manifest is not a failure — a refinement session may legitimately not have one yet. |

## The quick-start skill family

Nine `refine-*` skills front the refiner for specific artifact kinds, plus a status and a validate
skill:

| Skill | Description |
|---|---|
| `refine-ui` | Quick-start React/HTML UI component refinement. Use when the user wants to create or refine UI components, design systems, or interactive interfaces. |
| `refine-logo` | Quick-start logo and brand system refinement. Use when the user wants to create or refine a logo, brand identity, icons, wordmarks, or favicon sets. |
| `refine-image` | Quick-start image artifact refinement. Use when the user wants to create or refine image assets, thumbnails, or visual content. |
| `refine-content` | Quick-start content and Markdown refinement. Use when the user wants to refine blog posts, documentation, README files, or other written content. |
| `refine-a2ui` | Quick-start A2UI specification refinement. Use when the user wants to create or refine A2UI (Artifact-to-UI) protocol specifications. |
| `refine-mcp-ui` | Refine an MCP-UI resource — a `ui://` resource carrying an A2UI surface, delivered over MCP tool results. Use for MCP server UI, agent tool output rendering, or cross-transport UI parity with AG-UI and Flutter hosts. |
| `refine-moodboard` | Synthesize a single-file HTMX moodboard from a use-case brief. LLM-primary (the LLM produces structured JSON; a Minijinja template renders the HTML). Falls back to placeholder mode when the inference proxy is unreachable. |
| `refine-status` | Check the current status of an active artifact refinement session. Shows iteration count, constraint satisfaction, and convergence progress. |
| `refine-validate` | Run all validation checks on the current refinement state. Validates schemas, file integrity, constraint satisfaction, and completeness. |

## Related, non-`refine-*` artifact skills

| Skill | Description |
|---|---|
| `design-svg-logo` | Lightweight SVG logo creation for ideation. Mode-switching between LLM-suggested SVG (with strict parseability + XSS validation) and a deterministic Minijinja placeholder. Exports a PNG raster set when `rsvg-convert` is available. |
| `rebrand-artifact` | Swap one brand's tokens for another's inside a TSX artifact. Mechanical AST rewrite swaps matching hex literals; regenerates the brand-vars CSS via template-forge. WCAG contrast is reported, not gated. |

## See also

- [Scaffolding](/docs/scaffolding/overview) — turning a refined artifact into a buildable project.
- [Conversion](/docs/conversion/overview) — format conversion for refined artifacts.
