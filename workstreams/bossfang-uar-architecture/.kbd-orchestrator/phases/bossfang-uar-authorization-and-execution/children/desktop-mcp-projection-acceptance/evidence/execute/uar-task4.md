# UAR portion of task 4 — owned caller migration

Canonical identity: bossfang-uar-authorization-and-execution::desktop-mcp-projection-acceptance / bauar-05-native-discovery-admission / backend task 4. This completes only the UAR writer portion; root owns the cross-repository task disposition.

Status: existing manual protocol author migration complete; static inspection only. No new executable acceptance scenarios, compiler, build, test or formatter ran. No KBD/checklist/commit/publication action occurred.

## Exact changed files

| UAR-relative path | Lines | SHA256 |
|---|---:|---|
| tests/tool_admission_integration.rs | 311 | eacc995ced51b22f979c9c11252c778edc4268fff76bf252b11e898127171f96 |
| tests/bauar_inline_revision.rs | 227 | 77d298fa456b2ece0ad6bdabee71545f2a045cfebce3553c21d70354c48ef84e |

RecordingManagedHost carries required executionKind from preparation to receipt, validates the current prepared envelope, restricts its existing scenarios to host_mcp and checks receipt kind/version/authority digest before returning a revalidation receipt. Its required consume_native implementation explicitly refuses native execution authority. It does not invent an unused native success path or claim to be the actual host's durable consuming owner.

The inline revision fixture now binds /uar/admission/v2 and passes TOOL_ADMISSION_PROTOCOL_VERSION. Its JSON prepare handler decodes PreparedToolInvocation and calls the existing canonical authority validator, thereby rejecting missing/unknown kind, version mismatch and inconsistent executionKind-bound digest without creating another digest algorithm. The existing fixture permits host_mcp only. Its emitted preparation/receipt carry executionKind; /claim demands the exact stored receipt and exact frozen invocation identity. /claim-native explicitly refuses because this fixture has only an MCP receiver. Existing scenario bodies/assertions are retained; no test scenario is added.

## Finite caller inventory

Read-only rg covered src/tests initially, then the ordinary repository tree with both explicit exclusions on every inventory scan: -g '!tests/bauar_session_owner.rs' -g '!src/uar/mcp_server.rs'. Neither excluded file was opened, hashed, retried or used as a diagnostic route. Cargo.lock was excluded from the repository-wide identifier scan. This is a scoped source inventory, not proof about excluded or external downstream callers.

| Path | Role and disposition |
|---|---|
| src/uar/runtime/tool_admission/mod.rs | Sole PreparedToolInvocation producer and canonical authority digest construction/recomputation; v2 migrated in task 1 |
| src/uar/runtime/tool_admission/http.rs | Production HTTP port and RunToolAdmissionInput; v2 paths plus consume_native migrated in task 1 |
| src/uar/runtime/tool_admission/standalone.rs | Production standalone preparation/receipt/port author; migrated in task 1 |
| tests/tool_admission_integration.rs | Only additional HostToolAdmissionPort implementation found by ordinary-tree scan; migrated here |
| tests/bauar_inline_revision.rs | Only additional live literal private-admission URL/run-input JSON author found; migrated here |
| tests/common/embedded_authority.rs | Constructs existing StandaloneToolAdmissionPort and passes trait object; no manual wire fields or override |
| src/embedded.rs | Trait-object storage/injection; no manual protocol author |
| src/uar/runtime/manager.rs | Trait-object storage/injection; no manual protocol author |
| src/uar/runtime/turn/request.rs | Trait-object request seam; no manual protocol author |
| src/uar/api/routes.rs | Delegates to HttpHostToolAdmissionPort::from_input; no independent wire version author |
| sdks/rust/src/runtime.rs | Imports/stores/passes host port trait object; no additional implementation or wire construction |
| src/uar/runtime/tool_admission/lifecycle.rs | Uses the production port, not a separate wire producer |
| openspec/changes/archive/2026-09-27-afc-c02-governed-action-boundary/design.md | Historical archived v1 description, preserved as history; not executable authority |

Post-edit inventory found no remaining live /uar/admission/v1 literal in the included ordinary source tree. The archived design remains the sole matched v1 route reference and was not edited. The two fixture authors reuse the production-prepared authority digest; neither owns a distinct manual SHA256 digest envelope.

## Verification limits and uncomfortable fact

Node line counts and SHA256 bind exactly the two changed test sources. Read-only source inspection establishes the migration text only; compiler compatibility and actual behavior have not been run. Existing fixture hosts are simplified collaborators for their original scenarios, not substitutes for the genuine native admission path or host durability acceptance. A native success through either MCP-only fixture is intentionally unsupported. Real native positive/negative acceptance remains task 7/8's G1/G2 work, after all production and caller migration completes. Excluded D0 and external downstream consumers are not certified by this inventory.

No source outside the two assigned test files was changed in task 4. Added guards trace to the specified strict-v2 caller contract and exact invocation/receipt boundary; no unrelated validation or speculative fallback was added. No user/prior changes were reverted.
