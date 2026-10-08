# Proposal: UAR identity policy

## Why

API-key issuance currently copies requested roles and loses tenant context, while remote JWT issuer/audience and JWKS freshness policy are optional or unbounded. These actual authorization boundaries need a deployment-specific contract before Bossfang delegation is enabled.

## What Changes

- Reuse pinned jsonwebtoken 11.0.0; no cryptography replacement or dependency upgrade.
- Preserve verified subject/tenant and enforce owner/admin key revocation.
- **BREAKING**: remote mode refuses incomplete identity policy and mintable host roles cannot establish host provenance.
- Separate explicit trusted-local launch from remote multi-user admission.

## Capabilities

### New Capabilities

- `uar-principal-authority`: Attenuated keys, typed host provenance, remote claim policy and bounded JWKS freshness.

### Modified Capabilities

None in this isolated specification home. Existing product specs remain authoritative in their repositories; Plan must map these coordinating requirements to repository-local deltas before any product apply. This is not a claim that all described mechanisms are new.

## Impact

UAR src/uar/security/{api_keys,claims,verifier}, src/uar/api/auth.rs, src/uar/runtime/turn/host/, src/config.rs and related real-path integration scenarios. Existing jwt-hardening requirements are reconciled through a future repository delta, not silently overwritten. F2/F3/G7-A; cand-002/cand-009.

Only planning artifacts are written here. This local OpenSpec root does not authorize edits in sibling product repositories. Plan must bind repository-owned child changes to isolated source worktrees and resolve overlapping active work; no `kbd-apply` from this root may reach outside its allowed edit root. All implementation tasks remain unchecked. Source baseline, cross-change ordering, prerequisites and validation boundaries are recorded in the phase specification index.

