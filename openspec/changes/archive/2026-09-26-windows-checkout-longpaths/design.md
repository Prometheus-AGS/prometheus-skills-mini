## Context

The Windows matrix intentionally configures hostile CRLF conversion before checkout. That pre-checkout step is also the only point where Git long-path support can be enabled before tracked evidence files are created.

## Goals / Non-Goals

**Goals:**

- Enable Windows checkout of the repository's tracked long evidence paths.
- Preserve the existing CRLF checkout condition and matrix behavior.

**Non-Goals:**

- Rename or remove historical evidence.
- Change post-checkout tests or other operating-system jobs.

## Decisions

- Set `core.longpaths=true` in the existing Windows-only pre-checkout step. Moving it after `actions/checkout` was rejected because checkout is the observed failure boundary.
- Preserve `core.autocrlf=true` in the same step so the existing line-ending contract remains active.

## Risks / Trade-offs

- The repository keeps deeply nested evidence paths. → Git long-path support addresses the observed Windows checkout boundary without rewriting historical evidence.
