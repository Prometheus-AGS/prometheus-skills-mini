# Design

## Context
The only dependency advisory is Zod's oversized-collection validation resource consumption. It enters through OpenSpec's development dependency tree.

## Decisions
Use npm's targeted lockfile update within the existing supported version range. Keep all other locked package entries unchanged. No override or new direct dependency is necessary. Revert the lockfile commit for rollback.

## Verification
After the full update, run npm ci, npm audit, npm ls zod, and the pinned OpenSpec validation CLI directly. Require independent diff review and all existing hosted CI checks before merge. Avoid the managed OpenSpec wrapper for local validation because it can select a global cache rather than the dependency under test.

## Risks
A patch dependency update can affect validation behavior; direct OpenSpec validation and three-platform CI are the compatibility gates. Audit status is a point-in-time result.
