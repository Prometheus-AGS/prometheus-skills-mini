## Why

Windows CI jobs currently fail during `actions/checkout` because tracked evidence paths exceed the platform's legacy path limit. The workflow must enable Git long-path support before checkout while retaining the intentional hostile line-ending configuration.

## What Changes

- Configure `core.longpaths=true` in the existing Windows pre-checkout step.
- Preserve `core.autocrlf=true` and update the step comment and name to describe both checkout conditions.
- Leave the job matrix and all post-checkout commands unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: require Windows checkout to accept the repository's tracked long evidence paths while continuing to exercise CRLF conversion.

## Impact

Only `.github/workflows/ci.yml` and this OpenSpec change are affected. Application code, dependencies, tests, permissions, and secrets are unchanged.
