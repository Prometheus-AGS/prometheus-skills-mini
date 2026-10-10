# Integrated runtime source overrides

Operator-approved release reconciliation on 2026-10-10. Operator-owned `versions.toml` remains unchanged. These exact release selections supersede its earlier source baseline for this delivery only; no database or framework upgrade is authorized.

- `tools/liter-llm`: `a6047386cc9fae4258b4a8577f6a016022095586` — preserve three approved release repair commits ahead of origin/main.
- `tools/surreal-memory-server`: `63eb413ebf520a4a525ffd3b8d1d07f1389d48d4` — latest fork default branch.

Previously published binaries retain their original provenance until replaced by source-matched artifacts. Source selection is not runtime qualification.
