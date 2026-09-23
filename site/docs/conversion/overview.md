---
title: Conversion
sidebar_label: Overview
---

# Conversion

Three skills that convert artifacts between formats, each a deterministic Node pipeline.

| Skill | Description |
|---|---|
| `convert-md-to-htmx` | Convert a Markdown document into a self-contained branded HTMX artifact via the deterministic `markdown-it` pipeline, with frontmatter support, semantic HTML wrapping, and brand-CSS injection. |
| `convert-htmx-react` | Convert an HTMX + Alpine.js HTML artifact into a React TSX component ready for the `scaffold-react-vite` pipeline. Mechanical transforms run via a Node script; HTMX/Alpine constructs requiring judgment are surfaced as a sidecar markdown file for review. |
| `convert-htmx-pdf` | Convert a branded HTML/HTMX artifact into a paginated, print-correct PDF via headless Chromium — with embedded fonts, a running header and page numbers, pagination discipline that prevents orphaned pages and split components, and a verification loop that proves the output before it ships. |

## Pipeline order

The natural chain through these three skills plus artifact refinement is:

```
Markdown --(convert-md-to-htmx)--> HTMX artifact --(refine-ui / convert-htmx-react)--> React TSX
                                          |
                                          +--(convert-htmx-pdf)--> paginated PDF
```

## See also

- [Artifact Refinement](/docs/artifact-refinement/overview)
- [Scaffolding](/docs/scaffolding/overview) — where a converted React TSX component goes next.
