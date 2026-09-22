# The doctor's check and fix contract

This is **the mini's own contract**. It is not a mirror of `the-boss`'s, and this document says exactly
where the two differ and why, so the adapter that bridges them is written from a specification rather
than guessed at.

`lib/doctor/contract.mjs` implements the conformance function; `lib/doctor/contract.test.mjs` asserts every
registered check satisfies it.

## The mini's contract

A **check** is an object:

```js
{
  id: 'mini-node-version',        // stable, prefixed `mini-`, hyphens only
  title: 'Node.js version',       // short, human, no trailing period
  async run(ctx) { … },           // → an outcome (below)
  fixes: { … },                   // optional; one entry per fixId the check offers
}
```

An **outcome** is:

```js
{
  status: 'pass' | 'warn' | 'fail' | 'skip',
  summary: 'Node 24.16.0',        // REQUIRED, human-readable, one line
  detail: '…',                    // optional, free text, may be multi-line
  actions: [{ kind: 'fix', fixId: 'copy-skills' }],   // optional
}
```

A **fix** is `fixes[fixId](ctx)` resolving to:

```js
{ status: 'fixed' | 'requires_relaunch' | 'refused', summary: '…' }
```

Rules the conformance function enforces:

- `id` is a non-empty string starting `mini-`, containing only lowercase letters, digits and hyphens.
- `title` is a non-empty string; `summary` is a non-empty string on every outcome.
- `status` is one of the four; anything else is a conformance failure, not a coerced default.
- Every `actions[]` entry of `kind: 'fix'` names a `fixId` that `fixes` implements. A declared fix with
  no implementation, or an implementation no check offers, is a failure.
- Every external effect — spawning, fetching, reading the home directory — arrives through `ctx`, so
  checks are testable with nothing installed.

### Why `summary` is required here and absent there

The mini's doctor runs in a terminal and its output is read by humans and agents directly. A line with no
human-readable text would be unusable. The-boss instead renders localized strings from a typed key, so it
has no use for our English text and no field to put it in. See the mapping below.

## The-boss's contract, and why the mini cannot emit it

Verified against the local checkout at commit `10aa57f76c`. Every claim below cites a file and line that
was read, not inferred.

| # | The-boss's shape | Where | What it means for the mini |
|---|---|---|---|
| 1 | `DOCTOR_CHECK_IDS` is a hardcoded `as const` array of 31 ids; `DoctorCheckId = (typeof DOCTOR_CHECK_IDS)[number]` | `src/shared/types/doctor.ts:80`, `:113` | A `mini-*` id is not a member of that union. It cannot be added from outside the-boss's source. |
| 2 | `DoctorCheckRegistry = { readonly [Id in DoctorCheckId]: DoctorCheckDefinition<Id> }` — exhaustive and closed; its own comment says "a catalog entry without an implementation (or vice versa) is a compile error" | `src/main/services/diagnostics/doctor/types.ts:77` | The registry cannot be extended at runtime. There is no plugin, dynamic or external registration anywhere in `registry.ts`. |
| 3 | `DoctorDomain` is a closed union of ten domains (`install`, `permission`, `storage`, `config`, `provider`, `network`, `mcp`, `runtime`, `health`, `logs`); `DomainOfId` enforces at compile time that a check's `domain` equals its id prefix | `src/shared/types/doctor.ts:13`, `:116`, `:119` | There is no `mini` domain, and ids are `domain-thing`. This is why mini ids use a hyphen: `mini.node-version` would be wrong on the separator as well as the domain. |
| 4 | `DoctorDetail = { variant: DoctorCheckCatalog[Id]['details'][number], params? }` — `variant` is a typed key declared per check inside the-boss's own catalog, for i18n | `src/shared/types/doctor.ts:429`, `:395` | The mini cannot produce a legal `detail` value. Ours is free text and the adapter must supply the variant. |
| 5 | Outcomes are `pass` (optional `detail`), `skip` (required `detail`), `warn`/`fail` (required `attribution` + `detail` + `actions`). **There is no `summary` field.** | `src/shared/types/doctor.ts:442` | Our required `summary` has no home there; the adapter routes it (below). `attribution` is `'user-fixable' \| 'app-bug' \| 'transient'`, a judgement the host makes. |
| 6 | `DoctorFixOutcome = { status: 'fixed' \| 'requires_relaunch' } \| { status: 'failed', message }`. **There is no `refused`.** | `src/main/services/diagnostics/doctor/types.ts:37` | `copy-skills` must refuse on a full-pack machine (the binding rule in `openspec/config.yaml`). We keep `refused`; the adapter maps it. |

**Conclusion.** A mini check cannot be registered in `DoctorCheckRegistry`, and the mini cannot emit
`DoctorCheckOutcome`. The mechanism is the one `the-boss-handoff` already specifies: the-boss **spawns
`scripts/doctor.mjs` from the app-data copy and maps its JSON lines** onto its own check results. The
adapter lives on the-boss side because that is where the closed union lives.

## The adapter contract

What the-boss implements when it hosts these checks. Written here so the handoff inherits a mapping
instead of inventing one.

| Mini | The-boss | Note |
|---|---|---|
| `status: 'pass'` | `{ status: 'pass' }` | `detail` optional; omit or map from our `detail`. |
| `status: 'skip'` | `{ status: 'skip', detail }` | `detail` is required there. The variant comes from the-boss's catalog entry for the hosting check. |
| `status: 'warn' \| 'fail'` | `{ status, attribution, detail, actions }` | The host supplies `attribution` and `detail.variant`; only it can. Our `actions` map across unchanged in shape. |
| `summary` (required, English) | `devMessage`, or a `DoctorEvidenceItem` | `devMessage` is "English, developer-facing; travels only inside diagnostic bundles" (`src/shared/types/doctor.ts:458`) — exactly our text's nature. Evidence items need a `dataClass`; paths are `local_only`. |
| `detail` (free text) | `detail.params`, or evidence | Never `detail.variant`: that is a catalog key, not our text. |
| `actions: [{ kind: 'fix', fixId }]` | `DoctorFixAction` | Same shape (`{ kind: 'fix', fixId }`, `src/shared/types/doctor.ts:393`). The host's catalog must declare the fix id for the hosting check. |
| fix `'fixed'` / `'requires_relaunch'` | same | Identical. |
| fix `'refused'` | `{ status: 'failed', message }` | `message` is our `summary`. A refusal is not an error, but `failed` is the only non-success the host has; the message must say it was refused and why. |

A check the mini reports and the-boss has no catalog entry for cannot be displayed. Which mini checks the
host exposes, and under which of its ids, is the handoff's decision, not this change's.

## Stability

The ids, the four statuses, the three fix statuses and the JSON line shape are the stable surface. Adding
a check, or adding an optional field to an outcome, is a compatible change. Renaming or removing an id,
or changing what a status means, is not — `scripts/doctor.mjs`'s output is consumed by another
application across a process boundary.
