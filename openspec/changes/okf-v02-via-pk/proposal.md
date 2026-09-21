## Why

`openspec/config.yaml` — the binding constraints — still describes a **Node** OKF implementation: "write 0.2, read 0.1 and 0.2", `events.jsonl` as the append-only truth, `log.md` rendered from it, and "the contract between pk and the Node implementation". The operator replaced that writer with the Rust `pk` CLI, then ruled that the OKF version stays **0.2** and `pk` is brought up to it. The constraints and the decisions now contradict each other, and an agent that reads `config.yaml` first — as every change must — would build the writer that was withdrawn.

## What Changes

- Amend `openspec/config.yaml`: `pk` is the only writer of the knowledge bundle; the bundle is OKF v0.2; the Node writer, the Node-rendered `log.md` and "`events.jsonl` is the append-only truth" clauses are withdrawn, not silently deleted — the amendment says what replaced them. `pk` stays optional: with it absent, no knowledge bundle is written, and receipts and the session log still are.
- Move the `tools/prometheus-knowledge` pin to the `pk` commit that lands `pk`'s own change `okf-v02-writer`. **Blocked until that change is merged upstream**, which needs the operator's go-ahead.
- Rewrite `README.md` §5.3 to describe what is built, replacing the "SUPERSEDED IN PART" note.
- `.prometheus/index.md` keeps `okf_version: "0.2"`. It is true once the pin moves; until then it is ahead of its writer, and the evidence file says so.

## Capabilities

### New Capabilities
- `karpathy/knowledge-bundle`: who writes the bundle, in which OKF version, and what holds when the writer is absent.

### Modified Capabilities
<!-- none -->

## Impact

- `openspec/config.yaml`, `README.md` §5.3, `.prometheus/decisions.md`, the submodule pin. No code in `lib/`.
- `config.yaml` is a human-gated document (A-12). This change's diff to it is shown to the operator and applied only on approval.

## Non-goals

- Any Node code that reads or writes OKF.
- Migrating `.prometheus/decisions.md` and `gotchas.md` to one concept per file. They are non-conformant today (no `type`), CLAUDE.md §0 reads them at bootstrap, and moving them changes the rules source; that is its own change.
- `pk` releases or distribution (`the-boss-integration`).

## Source

KBD phase `karpathy-logs-node` — operator ruling 2026-09-21 ("Keep v0.2, fix pk first"), `analysis.md` G6, and OKF `SPEC.md` v0.2 §11–§13.
