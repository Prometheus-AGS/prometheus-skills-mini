## Why

The full pack publishes a Docusaurus site to GitHub Pages and links it, with a build badge, at the top of its README. The mini has `docs/skill-routing.md` (generated) and a README that is a port analysis; a reader has nowhere to learn how the mini's skills, tools, hooks, services and doctor fit together. The operator wants parity with the full pack's home page. The full pack's mechanism is already shell-free and its shape is known exactly (`site/` on Docusaurus 3.10.2 reading `../docs/guide` in place, a catalog generated from `skills/**/SKILL.md`, `docs-pages.yml` with SHA-pinned actions and workflow-type Pages).

## What Changes

- Add `site/`: `package.json` (own `package-lock.json`; `@docusaurus/core` and `@docusaurus/preset-classic` `3.10.2`, the version `versions.toml` names), `docusaurus.config.js` (`url`/`baseUrl` for `prometheus-ags.github.io/prometheus-skills-mini/`, `onBrokenLinks: 'throw'`, `docs` plugin `path: '../docs/guide'`, a second instance `path: 'docs-catalog'` generated at prebuild), `sidebars.js`, `src/css/custom.css`, `static/`.
- Add `site/scripts/generate-skills-catalog.mjs`: one page per `skills/*/SKILL.md` from its frontmatter (`name`, `description`, `compatibility`) plus the routing table from `docs/skill-routing.md`; `.mjs`, no shell; joins `scripts/carried-mjs.test.mjs`'s scan.
- Add `docs/guide/`: written for the mini — index, install (`scripts/install.mjs`), services (`docker/`), the doctor, hooks and the KBD flow, the recorder and `pk`, tools (`openspec` fork, `compass`, `sycophancy-correction`), constraints (what the pack never does), and a page per capability that has a spec under `openspec/specs/`.
- Add `.github/workflows/docs-pages.yml`: the full pack's, with paths adjusted, actions SHA-pinned at the same SHAs, Node 24, `npm ci` and `npm run build` in `site/`, `upload-pages-artifact` → `deploy-pages`, `permissions` minimal, `concurrency` group.
- `README.md`: a link line and the workflow badge at the top, as the full pack has at lines 3 and 13.
- Tests: `site/site.test.mjs` — the config points at the mini's org/repo, `onBrokenLinks` is `throw`, every `skills/*/SKILL.md` yields exactly one catalog page, the workflow's action SHAs equal the full pack's, and `site/` contains no `.sh`/`.py`.

## Capabilities

### New Capabilities
- `docs/site`: the site's inputs, generation, build and deployment, and the README link.

### Modified Capabilities
<!-- none -->

## Impact

- New: `site/**` (its own dependency tree, isolated), `docs/guide/**`, `site/scripts/generate-skills-catalog.mjs`, `.github/workflows/docs-pages.yml`, tests; `README.md` top lines; `scripts/carried-mjs.test.mjs` walks `site/scripts`.
- The root `package.json` is untouched; the "no root dependencies" test is unaffected; the constraint gate's greps do not target `site/`, which is correct — the carried-mjs scan is the guard there.
- **Operator action:** enable Pages on the repository (workflow source) — `gh api -X POST repos/Prometheus-AGS/prometheus-skills-mini/pages -f build_type=workflow` needs admin. The workflow's own comment says so.
- Depends on `versions.toml` for the Docusaurus pin.

## Non-goals

- Copying the full pack's 24 guide pages — the mini's guide is its own.
- The full pack's seven prebuild check scripts — only the catalog generator and Docusaurus's broken-link check are kept.
