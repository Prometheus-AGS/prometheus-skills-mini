---
title: A small change from request to handoff
sidebar_label: Work one change
---

# A small change from request to handoff

Imagine a support coordinator who downloads a weekly CSV and manually sorts it before calling customers. They want the newest request first. The decision to reverse a sort belongs to the implementation. The user's need is to open the export and immediately see whom to call next.

| Stage | What to do in your project | What the next person can inspect |
| --- | --- | --- |
| Assess and analyze | Ask who reads the CSV, what they do today, and whether anything depends on the current order. Agree that the existing fields and filters are still required. | The user's starting point and their desired outcome, with an example. |
| Specify and plan | Use a tiny dataset with two different timestamps and an empty selection. Agree how ties are handled. Adopt the scenarios, evidence, ownership and budget before execution. | A finite contract with a reachable end. Each check names the actual export entry point and an observable result. |
| Execute | Change the real export path. At the agreed verification boundary, produce a CSV from the application and read it as the coordinator would. Also run the empty-selection case. | The result for each case, the observed row order and field headings, and the revision exercised. |
| Reflect and close | Compare the CSV with the adopted examples. If a required check is missing, carry that fact into the result. If scope changes, use the signed operator route. | A closure disposition, the accepted lessons and any explicit follow-up owner. |

In your harness, ask: “Use KBD to plan this export change. Record who needs it, how they work today, what they should see afterward, and how we will observe that through the real export.” Have the operator adopt the concrete contract before executing it. The completed CSV is the evidence for row ordering. A passing syntax check or a task counter answers a different question.

## Continue in another session

Run the installed KBD status skill in the same project to recover the active phase and evidence references. To move to another supported harness, use the KBD handoff skill to produce a read-only packet with the repository state, open prerequisites and the next authorized action. A recipient should verify the project and revision before continuing. This file-based example works with optional memory and gateway services down. Its scope is Mini's local handoff. The Full/Companion live-peer exchange has its own implementation and evidence.

## When a change needs another skill

For a new export screen, use [UI routing](/docs/ui-ux/overview) to preserve the project's interface conventions. A team choosing between several designs can use [ideation](/docs/ideation/ideation-mindmap) to compare alternatives, then [artifact refinement](/docs/artifact-refinement/overview) to iterate on the chosen one. Convert an approved design with the [conversion guides](/docs/conversion/overview); generate a new project shell through [scaffolding](/docs/scaffolding/overview) only when the deliverable calls for one.

For a Rust exporter, route changes to the [Rust workspace skill](/docs/rust/prometheus-rust-workspace). A team can assign the data path and the presentation separately using [task model assignments](/docs/kbd/task-model-assignments). At the verification boundary, use [adversarial review](/docs/review/adversarial-review) to challenge whether the recorded CSV really supports the user's claim. If the second reviewer or its model is unavailable, record the limitation in the evidence.

## Choose the next guide

| If you need to… | Open |
| --- | --- |
| Adopt Mini in a repository your team already maintains | [Audit and preview project instructions](/docs/context/prometheus-context-bootstrap) |
| Keep an existing task format | [Spec engine selection](/docs/specs/openspec-integration) |
| Assign parts of the change to different roles | [Teams and handoffs](/docs/agent-teams/overview) |
| Keep the effort bounded or withdraw an outstanding case | [Phase completion and signed exits](/docs/kbd/completion-contract) |
| Recover context after a restart | [Progress memory and receipts](/docs/karpathy/progress-memory) |
| Decide whether to run a background service | [Service ownership and recovery](/docs/services/docker-services) |
