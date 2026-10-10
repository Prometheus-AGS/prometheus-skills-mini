# Boss task 9 — G2-07 bounded independent event collection

Observed G2-07: split had two actual text events, zero reasoning events, exact text true, persistence/secret absence/control correlation true. Only splitEventCounts and splitReasoning false. No completed event receipt; native cases unrun. Read uar-task9-split-events.md fully: compatible Liter driver has no reasoning_content to ReasoningDelta mapping; no supported fixture padding/timer correction follows. Pending driver/catalog/oracle amendments remain untouched.

Owned collection correction:
- Existing assertProjectedEvents is retained verbatim. New collectProjectedEventAssertions calculates the fixed diagnostic before its try, executes original main event preconditions and original helper assertions, and returns passed receipt or failed status plus finite diagnostic. Only Node AssertionError is collected. No assertion message/raw content is retained. Other errors propagate.
- Main invokes the collector only after normal event stream completion, abort/capture finalization, warm-session close and stored assistant read. Setup/runTurn throw/capture/persistence/cleanup remain outside the collector and abort normally. A completed runTurn returned error is evaluated by the existing stream-error assertion; an assertion failure is a failed event outcome, never a pass.
- Each outcome is preserved in eventOutcomes. Only passed outcomes append to eventReceipts. The enumerated remaining independent scenarios then run, followed by existing native/restart/storage sequence.
- All original deferred sink/authentication/model-input/configured-credential assertions remain. An additional all-event-outcomes-passed assertion precedes receipt_write. Either any retained sink failure or any event failure prevents acceptance receipt. No skip, threshold relaxation, fabricated event or success path added.
- Returned native case/restart/storage finite receipts survive later failure; existing nativeCaseProgress preserves partial-function statuses if an operational/native assertion failure prevents a return. No replay/agent IDs are copied to the failure packet. Native observation fields were read to confirm counts/states/booleans only; no native helper edited.

Static readback/hash only. No tests/builds/compiler/gates/formatter/services/defaults/config/dependency/product/instrumentation changes. No D0/private raw logs or fixtures accessed. Runtime continued collection remains unverified. Root owns C-main/source rebinding and G2. Native acceptance is not claimed.

Bindings:
[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-events.ts",
    "sha256": "bf1ebe8951094e1e927163b14f3f642a9797845d885b192078746bf8c91a9cec",
    "lines": 255
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection.ts",
    "sha256": "a115d87dae95435e168205d2e10092edd48c64653aecb248fe8f99437ee12934",
    "lines": 484
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/G2-07-finite-failure.json",
    "sha256": "5ced474c44c6929c721c5b11ff4a340d8393a76f4c7f8229ad5527308c981c74",
    "lines": 374
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/uar-task9-split-events.md",
    "sha256": "0b4eb6c36fb68923122aaa6a6c00d9aa29b1be48d5558cc79793ddbbb98db06c",
    "lines": 62
  }
]
