---
title: Why Mini works this way
sidebar_label: Release history and product boundaries
---

# Why Mini works this way

Mini exists for teams that want the KBD process from a Windows-native checkout. The same Node entry points work on macOS and Linux. Copy-mode skill delivery avoids requiring symlink privileges on Windows. Optional services add capabilities while leaving the local workflow usable offline.

| Change | What became possible | Primary record |
| --- | --- | --- |
| Platform foundation | Run portable Node scripts with consistent paths and line endings. Atomic writes and file locks support predictable local recovery. | [Portable text and paths](https://github.com/Prometheus-AGS/prometheus-skills-mini/commit/9a98b66b), [atomic writes](https://github.com/Prometheus-AGS/prometheus-skills-mini/commit/27c09ea6) |
| Closure and admission | Bind task authority to a project, phase and operator decision. Resume the same work without silently adopting a new contract. | [Canonical phase close](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/67), [admission parity](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/82) |
| Spec backends and VLBV | Keep an existing spec engine while defining the outcome, evidence and permitted execution boundary before delivery. | [Spec backend and verification work](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/89), [focused exits](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/90) |
| Mini 1.20 | Audit existing project instructions, preview a diff and apply the accepted digest. Run installed reflection/completion actions and record a signed terminal exit when scope changes. | [Mini 1.20 changes](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/91) |
| Native releases and Mini 1.20.1 | Fetch a version-matched binary on six OS/CPU combinations. Choose native, Docker or an existing endpoint per service. Mini pairs the 4.x memory client with SurrealDB 4.0.1. | [Native release installation](https://github.com/Prometheus-AGS/prometheus-skills-mini/commit/7ae893bc), [service provider and database selection](https://github.com/Prometheus-AGS/prometheus-skills-mini/commit/0201af74) |
| Mini 1.21 | Find the existing-project bootstrap verification and decision records on the release line. | [Evidence archive](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/94), [version change](https://github.com/Prometheus-AGS/prometheus-skills-mini/pull/95) |

## Pick a product

- **Mini** fits a portable, file-backed process. Add its optional searchable memory or model gateway when a project needs those capabilities. A binary listed for a host does not establish clean-machine installation or live harness registration there.
- **Full** supplies a broader skill catalog and native tools. Use its installer and documentation on a Full-owned machine. Installing both packs into the same harness home can shadow skills. [Full README](https://github.com/Prometheus-AGS/prometheus-skill-system/blob/main/README.md)
- **Companion** is a separate application and service for the control plane and peer features. Installing Mini or starting its optional database does not start Companion. [Companion README](https://github.com/Prometheus-AGS/prometheus-companion/blob/main/README.md)

Use [the comparison](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/COMPARE.md) for individual parity decisions, and the [changelog](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/CHANGELOG.md) for the pack's version declarations. An older certification or release note describes the candidate, platform and checks named in that record.
