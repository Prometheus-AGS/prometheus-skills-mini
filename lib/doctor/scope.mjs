// The install-scope rule, verified at runtime.
//
// openspec/config.yaml, binding: the mini pack is NEVER installed natively on a machine
// that already has the full skill pack. Inside the-boss's own data directory is fine;
// anywhere under the user's home on such a machine is not, because the two would shadow
// each other's skills.
//
// This check offers NO fix. Removing a user's files is not an idempotent copy, and it is
// not obvious which copy is authoritative — so it names what to remove and stops.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectFullPack as detectFullPackDefault } from '../platform/full-pack.mjs';
import { homeDir } from '../platform/paths.mjs';

const SKILL_ROOTS = ['.agents', '.claude'];

const packRootDefault = () => fileURLToPath(new URL('../../', import.meta.url));

/**
 * Skill names a previous mini install recorded writing, from
 * `<home>/.prometheus-mini/installed-skills.json` (`{ "skills": ["name", …] }`).
 *
 * This is the only honest way to find a copy whose name this pack no longer ships:
 * without a record of what was written, "this directory came from the mini" cannot be
 * decided from the filesystem — the home skills roots are shared, and on a developer
 * machine they hold hundreds of unrelated skills. An absent or malformed manifest yields
 * nothing rather than a guess.
 */
const readInstalledNames = (home, ctx = {}) => {
  const read = ctx.readManifest ?? ((p) => readFileSync(p, 'utf8'));
  const manifest = path.join(home, '.prometheus-mini', 'installed-skills.json');
  try {
    const parsed = JSON.parse(read(manifest));
    return Array.isArray(parsed?.skills) ? parsed.skills.filter((n) => typeof n === 'string') : [];
  } catch {
    return [];
  }
};

const listSkillNamesDefault = (packRoot) => () => {
  try {
    return readdirSync(path.join(packRoot, 'skills'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
};

export const checks = [
  {
    id: 'mini-install-scope',
    title: 'Install scope',
    offers: [],
    fixes: {},
    async run(ctx = {}) {
      const packRoot = ctx.packRoot ?? packRootDefault();
      const home = ctx.home ?? homeDir();
      const detect = ctx.detectFullPack ?? detectFullPackDefault;
      const listSkillNames = ctx.listSkillNames ?? listSkillNamesDefault(packRoot);

      const full = detect({ home });
      if (!full.present) {
        return { status: 'pass', summary: 'No full skill pack is installed here; native copies are allowed' };
      }

      // Matched BY NAME against the skills this pack ships, plus any extra names the
      // caller supplies (`alsoMine` — how an installer records what a previous mini
      // version wrote, so copies it left behind are still found).
      //
      // Deliberately NOT "every directory under the skills roots". A home skills root is
      // shared: on this machine it holds 612 directories against the 22 this pack ships,
      // almost all of them third-party. Enumerating the root would report ~590 unrelated
      // skills as mini copies — a confident, false failure, and far worse than the stale
      // copy it would catch. Without a manifest of what a previous version installed,
      // "this directory came from the mini" is not decidable from the filesystem.
      // `alsoMine` had no production source: nothing outside the tests supplied it, so
      // the stale-copy path was dead in every real run. It now defaults to the installed
      // manifest — the record a mini install leaves of what it wrote — so a skill this
      // pack has since removed or renamed is still found.
      const names = new Set([...listSkillNames(), ...(ctx.alsoMine ?? readInstalledNames(home, ctx))]);

      const offending = [];
      for (const name of names) {
        for (const root of SKILL_ROOTS) {
          const copy = path.join(home, root, 'skills', name);
          if (existsSync(copy)) offending.push(copy);
        }
      }

      if (offending.length === 0) {
        return {
          status: 'pass',
          summary: 'The full skill pack is installed here, and no mini copies sit beside it',
          detail: `Markers:\n${full.markers.join('\n')}`,
        };
      }

      return {
        status: 'fail',
        summary: `${offending.length} mini skill copy(ies) are installed natively beside the full skill pack`,
        detail:
          `The mini must never be installed natively on a machine that has the full pack ` +
          `(openspec/config.yaml); inside the-boss's own data directory is fine. The two shadow ` +
          `each other's skills.\n\nFull-pack markers:\n${full.markers.join('\n')}\n\n` +
          `Remove these directories:\n${offending.join('\n')}`,
      };
    },
  },
];
