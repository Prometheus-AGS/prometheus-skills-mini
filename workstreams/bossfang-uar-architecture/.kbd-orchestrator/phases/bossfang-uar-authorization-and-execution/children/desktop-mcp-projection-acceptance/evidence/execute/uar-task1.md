# UAR task 1 — strict native admission source delivery

Canonical identity: bossfang-uar-authorization-and-execution::desktop-mcp-projection-acceptance / bauar-05-native-discovery-admission / backend task 1.

Status: production source implementation complete for task 1; static inspection only. Task 3 dispatcher changes, task 4 owned caller migration, and whole-delivery compiler/build/real-path acceptance are pending. This artifact does not certify A1/A2/A3 runtime behavior.

## Contract and ordering

The corrected coordinator freeze preserves all existing camelCase canonical JSON SHA256 authority keys and adds executionKind. Existing resolve and cancel paths move to v2; no approve path is introduced. ToolExecutionKind derives only from resolved ToolSource: NativeSkill/BuiltIn -> runtime_native, Mcp -> host_mcp. Invocation, preparation and receipt require the serialized executionKind without a default; unknown values cannot deserialize. Receipt metadata includes the same kind.

HostToolAdmissionPort adds required consume_native(&AdmittedToolInvocation) -> Result<HostAdmissionReceipt>. The HTTP adapter uses authenticated POST /uar/admission/v2/claim-native with {admissionId, invocation, receipt}, demands exact bound receipt equality, and makes one request with no application retry. /claim remains nonconsuming revalidation. Fixed errors cover malformed preparation/receipt/claim acknowledgment without echoing received values. Runtime context creation rejects a non-v2 binding.

The existing claim path retains envelope, cancellation, current claim revalidators, host receipt equality and Cedar checks. Its existing per-invocation lifecycle mutex now protects durable ClaimIntent persistence and native consumption/acknowledgment. MCP still consumes at its receiving host, after local intent. Native acknowledgment sets a distinct live NativeClaimed state; repeated lifecycle claims cannot pass pending-state admission again. No parallel ledger or service is added.

Failed native consumption or a mismatched acknowledgment invokes existing cancellation. Confirmed pre-consumption cancellation records invalidated; an already consumed claim or unconfirmed cancellation records OutcomeUnknown and cannot be replayed. The cancellation code consolidates its two duplicate persistence branches in the same file to accommodate this required uncertain-cancel behavior. A positively acknowledged native claim cannot become cancelled merely because a standalone/no-op host returns Cancelled. Existing durable ClaimIntent remains if writing later uncertainty fails. Local finish now creates an absent lifecycle cell as pending rather than claimed, so an unclaimed finish is refused.

Standalone uses the same UAR lifecycle as the sole one-shot/persistence owner. Its adapter validates the current envelope, exact kind/receipt identity and unmanaged local-root constraint, then acknowledges native consumption without introducing a second host ledger. Calling the adapter alone is not standalone runtime execution authority; the lifecycle remains the consuming boundary.

## Changed files and static evidence

| Path relative to UAR worktree | Lines | SHA256 |
|---|---:|---|
| src/uar/runtime/tool_admission/mod.rs | 927 | 67dca9151b12c0ecc9ffb3f44ae42ea301b9029842f070cb33b206875357f8a2 |
| src/uar/runtime/tool_admission/http.rs | 376 | d5e7c4499fa4f2afa8f4df142c6cf50cfd6b1feefe69303e8cd9c7f47692355e |
| src/uar/runtime/tool_admission/lifecycle.rs | 497 | 89cd799a49f4fae80a8acf8fc82d5eab62aa327c364ab4fd1c9718c7faeff33f |
| src/uar/runtime/tool_admission/standalone.rs | 160 | 717e1c356353aafe3da0c440e239b58a0638299c864042a759fb1efd2c48bdb0 |

- mod.rs: v2 constant, typed source mapping, required wire kind, digest construction/recomputation, preparation/receipt equality, required consuming port and MCP metadata.
- http.rs: strict v2 route binding, separate native consume request and exact acknowledgment; fixed decode errors.
- lifecycle.rs: durable intent before native consume inside the existing critical section, unknown cancellation preservation and claimed-only finish.
- standalone.rs: v2 kind propagation, exact local-root receipt checks and native port implementation.

The pre-existing oversized mod.rs was edited surgically with coordinator agreement; no new production path or unrelated partition was added. lifecycle.rs is 497 lines after the required cancellation consolidation. No user/prior changes were reverted. The only additional authored path is this evidence document.

## Scope, skills and verification limits

Read the isolated position, child contract/plan/manifest/spec/acceptance, mini instructions and pins/decisions, UAR nearest instructions/README/architecture/pins, admission sources and relevant gotcha matches. Loaded prometheus-rust-workspace, rust-best-practices, rust-async-patterns and the transport routing guidance from rust-mcp-server-generator. rust-router was absent at the inspected installed Codex skill path; no skill was installed. The child A9 prohibition overrides older local per-edit Cargo advice; no compiler, build, test, executable acceptance scenario, formatter or external publication ran.

Static commands were read-only source inspection with cat/rg/Node, followed by Node line counts and SHA256 over exactly these four owned product paths. These counts/hashes establish file identity only. No excluded D0 path was opened or hashed. No dependency, pin, service, UI, Bossfang, Git commit, KBD state or checkbox changed.

All guards added here trace to the explicitly specified v2 cutover, immutable host receipt, consuming native execution or uncertainty requirements at the real authenticated host/tool-execution boundary (A3). No speculative unrelated hardening was added. Runtime success, compiler compatibility of remaining manual ports, cancellation scheduling, durable persistence faults and actual discovery behavior remain unverified until the complete-delivery gates. The underlying historical runtime12 cause is not diagnosed by these edits.
