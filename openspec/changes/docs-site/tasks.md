Each code task is test-first. Depends on `versions.toml` for the Docusaurus pin; content work may start before it.

## 0. Gate — versions.toml (operator-authored)

- [ ] 0.1 Before any task below: `node --test rules/test/versions-toml.test.mjs` reports the test **passing**, not `todo` — i.e. the operator has authored `versions.toml` and it agrees with the tree. If it is `todo`, stop and hand the phase back to the operator; do not proceed with a pin this file does not name.

## 1. Site skeleton

- [ ] 1.1 Write `site/site.test.mjs` first: config org/repo/baseUrl; `onBrokenLinks: 'throw'`; catalog page per skill; workflow SHAs equal the full pack's (read from `../prometheus-skill-pack/.github/workflows/docs-pages.yml` at spec time and pinned as literals in the test); no `.sh`/`.py` under `site/`.
- [ ] 1.2 `site/package.json` + lockfile (Docusaurus 3.10.2), `docusaurus.config.js`, `sidebars.js`, `src/css/custom.css`, `static/`; `npm run build` passes with a placeholder guide.
- [ ] 1.3 `site/scripts/generate-skills-catalog.mjs`; add `site/scripts` to `scripts/carried-mjs.test.mjs`'s walk.

## 2. Content

- [ ] 2.1 `docs/guide/`: index, install, services, doctor, hooks-and-kbd, recorder-and-pk, tools (openspec, compass, sycophancy-correction), constraints, and one page per `openspec/specs/*` capability. Every page links only to pages that exist (the build enforces it).

## 3. Deployment

- [ ] 3.1 `.github/workflows/docs-pages.yml` from the full pack's with paths adjusted; `README.md` link + badge in the first fifteen lines.
- [ ] 3.2 Operator: enable Pages (workflow source) on the repository. After the first green deploy, record the URL in `.prometheus/decisions.md`.

## 4. Close

- [ ] 4.1 Full battery; `node --test` includes `site/site.test.mjs`.
