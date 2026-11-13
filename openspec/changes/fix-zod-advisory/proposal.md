# Proposal

## Why
npm audit reports high-severity GHSA-mrhx-c7xc-m3w5 in transitive development dependency Zod 4.6.5. The advisory identifies 4.6.6 as the first fixed version.

## What Changes
Refresh only Zod's lockfile entry to the compatible current patch 4.6.7. OpenSpec 1.16.0 already allows ^4.4.3.

## Capabilities
No requirement changes; skip_specs applies to this tooling dependency repair.

## Impact
Only package-lock.json and this change's records. No package.json, versions.toml, runtime code, global configuration, generated distribution, or service changes.
