# Reconcile KBD task state

## Why

The mini driver rejects the reconcile command needed before reflection. The full
pack's existing command can hide unavailable backend task lists and repair the
wrong active phase. The operator approved parity and explicit failure reporting.

## What Changes

- Add read-only task reconciliation with active and archived artifact support.
- Add constrained explicit repair through existing canonical task boundaries.
- Document exit codes, incomplete scans, and reflection usage.
- Refresh distribution and patch release metadata without committing or publishing.

## Capabilities

### New Capabilities

- `kbd-task-reconciliation`: compare backend completion, canonical identity, and phase counts.

### Modified Capabilities

None.

## Impact

KBD driver and capability modules, apply/reflect guidance, generated distribution.
No dependency changes, services, BAUAR source edits, or certification state changes.
