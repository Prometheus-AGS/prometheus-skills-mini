# Proposal

## Why
Issue #81 lacks selected-installed evidence: the existing 23-case receipts cover only source and generated packages. The user approved completing the isolated installed verification and closing the issue when all four acceptance criteria pass.

## What Changes
- Extend the existing conformance runner with explicit installed-root and case-ID selection inputs.
- Register the generated Claude package using the real marketplace installer in a disposable configuration; qualify cases 18–23 through all four surfaces against the repaired runtime from upstream PR #223.
- Preserve historical receipts and add current identities/results in the same #81 receipt directory for reuse by #62.
- Update assessment and post the verified acceptance mapping before closing #81.

## Capabilities
No production behavior changes. This is qualification tooling and evidence only; specs are skipped.

## Impact
Existing conformance runner and #81 evidence only. No production APIs, dependency pins, services, global installations, release, push or merge. Windows/Linux and harness hook activation remain unverified.
