# Skill routing

Layer 2 reference. The compact `trigger → skill` view in `CLAUDE.md` §F is generated from the tables below;
this file adds install commands and notes. **Route by name.** A skill invoked explicitly fires
deterministically; a skill left to self-activate is a coin flip, and a large installed set exceeds the
session-start description budget so later descriptions are silently dropped.

Rules for the library: one skill per role per platform; curate, don't accumulate; read a third-party
`SKILL.md` before it lands in a repo; **never install without the owner's confirmation** — an install
downloads and runs third-party code. If a skill named here is absent, say so, give the install command
from this file, and fall back to the Layer 1 rules. Never narrate what it "would have done" (F-2).

"Status" is `present`, `**absent**` or `check` for the machine this was last built on (2026-09-22); rows
marked absent are flagged in `CLAUDE.md`. Re-check with a directory listing of `.agents/skills` and
`~/.agents/skills` before trusting it elsewhere. Rows for stacks this repo does not contain — design/UI,
React, Flutter, Tauri — are deliberately omitted; restore them from the Prometheus pack's v4 routing source
if such code ever lands here.

## Process
| When | Invoke | Status | Install / notes |
|---|---|---|---|
| planning or subagent-driven work | `superpowers` | present | `npx skills add obra/superpowers` |
| before a PR: interrogate the change | `grill-me` | present | `npx skills add mattpocock/skills@grill-me` |
| phase lifecycle or position | `kbd-status`, `kbd-assess`, `kbd-analyze`, `kbd-plan`, `kbd-execute`, `kbd-reflect` | present | Prometheus skill pack — the installed copies are the bash originals; this repo is porting them |
| phase completion, before delivery, before a lesson becomes a rule | `adversarial-review` | present | Prometheus skill pack; needs the liter-llm gateway for a cross-model judge — say which judge ran |
| any reflection or self-assessment | `sycophancy-correction` | present | Prometheus skill pack; no external equivalent |

## Specs
| When | Invoke | Status | Install / notes |
|---|---|---|---|
| any new change, and any plan under A-17 | `openspec-propose` | present | installed by `openspec init`; `/opsx:propose` in Claude Code |
| implement a change's tasks | `openspec-apply-change` | present | per task — never "implement everything" |
| check the work against the change before archiving | `openspec-verify-change` | present | then `openspec-archive-change` |

## Rust
| When | Invoke | Status | Install / notes |
|---|---|---|---|
| any crate work | `prometheus-rust-workspace` | present | house router; phase-gated Cargo policy plus on-demand routing to installed Rust skills |
| general Rust implementation and review | `rust-best-practices` | present | `npx skills add https://github.com/apollographql/skills --skill rust-best-practices` |
| Tokio, async I/O, concurrency, cancellation | `rust-async-patterns` | present | `npx skills add https://github.com/wshobson/agents --skill rust-async-patterns` |
| Rust MCP servers and transports | `rust-mcp-server-generator` | present | `npx skills add https://github.com/github/awesome-copilot --skill rust-mcp-server-generator` |
| post-implementation review of Rust | `prometheus-rust-auditor` | present | Prometheus skill pack |

## Building tools
| When | Invoke | Status | Install / notes |
|---|---|---|---|
| writing or fixing a skill | `skill-creator` | present | `npx skills add anthropics/skills@skill-creator` |
| installing layered project context | `prometheus-context-bootstrap` | present | Node-only mini port; copy-mode and Windows-safe |
| building an MCP server | `mcp-builder` | present | `npx skills add anthropics/skills@mcp-builder`; this repo scaffolds **stdio-only** servers — `rust.md` overrides any HTTP guidance |
| library documentation | `context7-mcp` | present | installed under this name, not `context7`; `npx skills add intellectronica/agent-skills@context7` for the other |
| no row matches | `find-skills` | check | listed by the harness at session start but only a backup copy was found on disk; `npx skills add vercel-labs/skills@find-skills` |

## Discovery protocol — when no row matches and the task is non-trivial
1. Invoke `find-skills` with the platform and the function as keywords.
2. Report the top result, its install base and its audit status.
3. Propose the install command. Do not install without confirmation.
4. If nothing credible exists, proceed on the Layer 1 rules and log the gap to `.prometheus/gotchas.md` as a
   candidate house skill.

Search order: skills.sh (install telemetry is a real usage signal) → agentskills.io (the standard;
vendor-official repos link from here) → agenticskills.io (curated, audit notes) → GitHub.
