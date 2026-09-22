## ADDED Requirements

### Requirement: The documentation site is built from docs/guide and a generated catalog, and deployed to GitHub Pages by workflow
`site/` SHALL be a Docusaurus project at the version `versions.toml` names, reading `docs/guide/` in place and a catalog generated from `skills/**/SKILL.md` by a `.mjs` script, with `onBrokenLinks: 'throw'`. `.github/workflows/docs-pages.yml` SHALL build on push to `main` for changes under `site/`, `docs/`, `skills/**/SKILL.md` or the workflow itself, with SHA-pinned actions, and deploy with workflow-type Pages. `site/` SHALL contain no `.sh` or `.py` file.

#### Scenario: Every skill has exactly one catalog page
- **WHEN** the catalog generator runs
- **THEN** for each `skills/<name>/SKILL.md` there is exactly one `site/docs-catalog/<name>.md` whose title is the frontmatter `name`

#### Scenario: A broken link fails the build
- **WHEN** a guide page links to a page that does not exist
- **THEN** `npm run build` in `site/` exits non-zero

#### Scenario: The workflow is the full pack's, pinned
- **WHEN** `docs-pages.yml` is compared with the full pack's
- **THEN** every `uses:` SHA matches, `permissions` are `contents: read` at the top and `pages: write` + `id-token: write` only on the deploy job, and the build runs `npm ci` then `npm run build` in `site/`

### Requirement: The README links the site and shows the build badge
`README.md` SHALL carry, within its first fifteen lines, a link to `https://prometheus-ags.github.io/prometheus-skills-mini/` and the `docs-pages.yml` status badge.

#### Scenario: The link and badge are present
- **WHEN** the first fifteen lines of `README.md` are read
- **THEN** both the site URL and the badge image URL for `docs-pages.yml` appear
