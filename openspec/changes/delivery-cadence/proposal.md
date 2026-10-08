# Delivery Cadence

## Why
Delivery intervals currently depend on conversation memory and cannot reliably account for useful output, build overhead, or notification effects. The operator approved a portable execution profile and subsequently clarified that iteration boundaries build and run the product, never run test suites.

## What Changes
- Add a self-contained Node delivery-cadence skill to full and mini packs.
- Add durable iteration/build/run/publication receipts, JavaScript hook registration, throughput reporting and bounded optimization.
- Integrate KBD and existing harness goals without replacing canonical work ownership.
- Configure this initiative for 120-minute increments, local Mac ARM64 build and functional launch each increment, and all Mac/Windows builds through website publication every second successful delivery.

## Capabilities
### New Capabilities
- `delivery-cadence`: configurable build-and-run delivery boundaries and registered JavaScript events.
### Modified Capabilities
None. Existing hook arguments are extended compatibly.

## Impact
Shared source: full pack skills/process/delivery-cadence; identical mini copy; KBD entrypoint instructions, hook argv forwarding and distribution registration. No application feature fixes or dependency upgrades. Existing unfinished Boss inference and release work remains unfinished.
