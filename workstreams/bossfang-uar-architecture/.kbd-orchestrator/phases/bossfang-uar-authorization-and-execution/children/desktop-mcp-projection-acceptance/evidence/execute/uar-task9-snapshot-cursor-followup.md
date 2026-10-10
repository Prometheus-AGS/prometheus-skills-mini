# Task 9: snapshot cursor condition correction

Read-only author followup, 2026-10-07, position revision 249. Only this document was written. No source/gate edits or runtime checks.

## Observation versus diagnosis

G2-10's finite snapshot outcome has `streams=0`, `snapshotFrames=0`, `snapshot=0`, `changed=0`, `chunks=1`, `streamErrorPresent=true`, and `snapshotCursorSelected=false`. These counters are after the fixture's drain/cursor-selection branch, so they do not establish no source stream or source frames. The record does not yet identify which fixed refusal or parsing operation failed. Boss's separately authored source counters will distinguish that; this report does not replace them with a guessed observed cause.

## Correction to the previous recommendation

My earlier blanket requirement that the drained prefix contain a completed step and have no active step was **overstrict**. It was a sufficient replay boundary in one sequence, not a necessary property of this actual stream contract. The current fixture encodes both requirements and can refuse a valid snapshot cursor because of them. This corrects the earlier proposal; it does not weaken the actual snapshot projection, secret absence, persistence, terminal, or correlation acceptance requirements.

Concrete source basis (UAR root `/Users/gqadonis/.claude/worktrees/bauar-uar`):

- `src/llm/orchestrator.rs:2322–2327` receives provider `Done`, yields it, and returns immediately when there are no tool calls. It does not reach the later `RuntimeStep::Finished` yield at `2356–2360`. Thus a genuine successful text-only path can leave its source STEP_STARTED unmatched by a source STEP_FINISHED. This is source behavior, not yet a measured G2-10 frame count.
- `src/uar/runtime/manager.rs:6169–6178` maps actual runtime step events to the domain; `src/uar/api/adapters.rs:282–295` maps them to STEP_STARTED/STEP_FINISHED. These mappings do not create the missing finish on the early Done path.
- `src/uar/api/sse.rs:122–167` collects state patches and assistant text through the selected cursor. `replay_snapshot_events` at `267–318` emits STATE_SNAPSHOT (or presentation snapshot) and MESSAGES_SNAPSHOT only. It does **not** restore step state through STEP_STARTED.
- The SSE projector (`170–264`) tracks tool-call projection, not active steps. Per-source events are encoded with the actual numeric source ID (`360–376`); frames from one source share that ID. Snapshot frames share the cursor ID. Duplicate IDs within a source are normal; strict increase per frame would be wrong.

Boss root `/Users/gqadonis/.claude/worktrees/bauar-boss`:

- `src/main/ai/runtime/uar/UarAguiAdapter.ts:56,65` starts with no active step and nonterminal state.
- MESSAGES_SNAPSHOT handling (`208–214`) feeds the real assistant text through normal text handling; it does not restore a step. STATE_SNAPSHOT has no active-step-restoration handler in the event switch (`130–176`).
- STEP_FINISHED (`226–233`) requires the matching active step and can reject an unmatched suffix finish.
- RUN_FINISHED calls `finish()` (`169–172,281–288`), which closes text/reasoning, calls `closeStep`, and emits turn completion. `closeStep` (`372–375`) is a no-op if no step is active. Consequently a fresh adapter receiving a real messages snapshot followed by the real RUN_FINISHED is supported without a preceding STEP_STARTED or STEP_FINISHED in the replay.

The relevant condition is the validity of the **replayed suffix for the fresh adapter**, not whether the discarded prefix's source step has an explicit finish.

## Current fixture/parser/header inspection

The Boss owner added finite diagnostics during this investigation; the latest inspected snapshot is hash `57669a68d5443fbe05e7efc76a5ec668ddad30b16e7ed63fd3090916e9ace3c1` for `scripts/gates/bauar-secret-projection-events.ts`.

At `54–67`, the fixture fully drains the real response, normalizes CRLF, splits frames, reads actual SSE `id:` and concatenates `data:` lines. This matches the exact UAR source encoder's numeric IDs and JSON data framing. At `70–74` it records numeric-ID validity and nondecreasing order. No alternative colon-suffixed payload eventId should be used as the source cursor. At `93`, however, it sets the candidate only if text was observed **and completedSteps > 0 and activeSteps.size === 0**; otherwise it clears the candidate. That is the overstrict prefix condition discussed above.

Header handling at `101–104` correctly clones the original headers, changes only `last-event-id`, and invokes the same original request/init with those headers. The source routes (`src/uar/api/routes.rs:794–822`) accept that cursor, snapshot events <= it, and replay events > it. No changed API, extra endpoint, or production configuration is needed.

## Minimum source-backed cursor approach, subject to root assignment

Use the latest **actually observed distinct nonterminal source ID** before the actual RUN_FINISHED source, after actual nonempty assistant text has been seen. Preserve that exact source string; do not derive terminal-minus-one, pad values, use a timer, or create synthetic events. Retain the numeric validity, observed order, and strict cursor-before-terminal checks. Do not require a completed step in the discarded prefix or clear the candidate merely because that prefix has an active step.

Because the candidate is the last real emitted source before terminal, there should be no separately emitted step event between it and RUN_FINISHED. Confirm that property from the drained finite sequence: the replay suffix must contain the real terminal and no unmatched STEP_FINISHED. The terminal's UAR source mapping (`adapters.rs:235–240` and the RunDoneWithUsage mapping) is independent of runtime-step mapping; no hidden step reconstruction is promised by the snapshot. If observed framing instead supplies a suffix requiring unavailable step context, refuse that cursor and report the fixed condition. Do not delete or rewrite step events to manufacture validity.

The selected cursor must include real text in the snapshot and leave the original terminal strictly after it. Removing the header or selecting the terminal/latest cursor remains unsuitable because it excludes the terminal from replay. The existing fixture may alter only the real assistant snapshot's human content. Preserve every source ID, event ID, type, sequence, run correlation, authority, and existing sink predicate.

No new acceptance predicate is proposed. The source counters already being authored by Boss can show frame/step counts, source validity/order, selected-before-terminal, and the fixed refusal category without exposing raw IDs or content. The G2-10 cause remains unclassified until that actual diagnostic is observed.

## Scope, hashes, and limits

Proposed future correction remains confined to Boss's owned `scripts/gates/bauar-secret-projection-events.ts`. No UAR product change is necessary for this cursor issue. Pending reasoning and cancellation scope amendments are unchanged. No file was edited except this evidence artifact.

| Source | SHA-256 |
| --- | --- |
| Boss `scripts/gates/bauar-secret-projection-events.ts` | `57669a68d5443fbe05e7efc76a5ec668ddad30b16e7ed63fd3090916e9ace3c1` |
| Boss `src/main/ai/runtime/uar/UarAguiAdapter.ts` | `d233bc2074337d8d84142c45232d4c41bf8d0a10c7a25a197832fc81ce0f178b` |
| UAR `src/uar/api/sse.rs` | `0eefc7542b68262e359697b2f10147f8de29e7a789a830d06f0dbbdc4af762d4` |
| UAR `src/uar/api/routes.rs` | `239904c15f76e335e656a653a8ba0274f4cf9b9aa6ddb705ee3c163b318d0df4` |
| UAR `src/uar/api/adapters.rs` | `a10638164fa4c62e2d1334d2088b49f0d32cf92bd5cc468cf72db24698a642df` |
| UAR `src/llm/orchestrator.rs` | `c0e6186b949ad587f4c17f55bde95f8c85e4f0d17abbacee62c8fa526921d8a7` |
| UAR `src/uar/runtime/manager.rs` | `a786f4830611f92b0c718c474ae392efda8eb89ccf1fb4ca59e0947a1db40d17` |

Explicit allowed source only. Neither excluded D0 file was opened/hashed; no rejected diagnostic was retried or rerouted. No private provider/log values, endpoint requests, tests, compiler, gate, or service/config operations. The earlier Task 7 accidental partial source exposure remains disclosed separately. This is source investigation, not runtime acceptance or independent certification.
