# Plan — UAR inference and liter-llm model routing

## Outcome

A newly created or existing UAR agent can select an actual liter-llm served model, or an enabled UAR provider/model, and complete inference. The ordinary Boss model remains separate from the model UAR executes. OAuth-only Codex cannot be mistaken for an API-key-backed UAR route. Keep the in-flight 2.2.7 release source frozen; deliver this fix in its next cadence increment.

## Ordered change: `uar-executable-model-assignment`

1. **Source contract and selection** (Boss desktop/renderer owner). Reuse `UarModelSourceAdapter` rather than add an API. Expose a shared UAR assignment selector to Boss-owned agent creation and editing. Source and model choices come from the live gateway/UAR catalogs and from only executable Boss API-key routes. Show operational, credential, and unavailable states with actions to the relevant settings. Default to an operational liter gateway alias when available; otherwise an operational direct UAR model; never silently use the ordinary Boss model for new agents. Preserve existing explicit assignments. Catalog-owned agents show their catalog route and link to its authoritative UAR policy editor rather than offering an ineffective Boss-side edit. `library: cand-001, cand-002`.
2. **Persistence and execution truth** (Boss runtime owner). Carry the selected `uar_model_assignment` through the shared create command and edit autosave for Boss-owned agents. Existing no-assignment agents may continue only when their actual Boss route satisfies the API-key credential contract; prompt those with OAuth-only or unusable routes to choose a source, without silently rewriting storage. Validate the chosen gateway alias against its current gateway and a UAR-source provider/model against the exact session-bound UAR instance before dispatch. The conversation header and diagnostics display the effective UAR model, not the unrelated generic Boss compatibility field. No secret leaves the main process.
3. **Localization and UX** (Boss renderer owner). Add every new label, description, status, and error to all existing locales. Follow the existing settings/wizard design system and keyboard/accessibility patterns. Keep the source/model controls usable at the dialog's current responsive sizes.
4. **Completed boundary and delivery** (lead/release owner). Finish all production code first. Build the actual local Apple Silicon installer with `pnpm build:mac:arm64`, launch the packaged application, create/edit a UAR agent bound to a real liter-llm served alias, and obtain a completed reply. Record separately the built DMG, installed launch, gateway catalog, UAR run, and model identity. If the gateway is unavailable, report that as an external blocker and prove only the bounded available path; do not claim liter inference. Run one cumulative review at this boundary, then commit and push the focused changes. Full Mac/Windows website publication follows cadence policy after the previous 2.2.7 publication is reconciled.

## Non-goals

No UAR protocol change, OAuth credential forwarding, database migration, new gateway, generic provider redesign, or extra unit-test loop. A Codex OAuth model can remain available for the ordinary Boss/Claude/Codex paths; this fix concerns UAR execution only.

## Acceptance

- Creating a UAR agent offers a liter served alias only when the selected gateway is usable and persists `source: gateway` with that alias.
- Editing `UAR Test` can replace its missing assignment without recreation.
- Its first run resolves the selected alias through the configured liter endpoint and yields an actual response, or an actionable gateway/upstream error; it never reports a missing OpenAI Codex API key for a gateway assignment.
- The visible effective model, stored assignment, and UAR run model agree.
- A catalog-owned agent's route remains governed by the UAR catalog and cannot be overridden by a misleading Boss edit control.
- A legacy working API-key-backed UAR agent still executes, and a session bound to a nondefault UAR instance validates direct-provider choices against that bound instance.
- All added UI strings exist in every existing locale; no secret is returned in the model-source snapshot.
