// The install-scope rule, verified at runtime.
//
// openspec/config.yaml, binding: the mini pack is NEVER installed natively on a machine
// that already has the full skill pack. Inside the-boss's own data directory is fine;
// anywhere under the user's home on such a machine is not, because the two would shadow
// each other's skills.
//
// This check offers NO fix. Removing a user's files is not an idempotent copy, and it is
// not obvious which copy is authoritative — so it names what to remove and stops.

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectFullPack as detectFullPackDefault } from '../platform/full-pack.mjs';
import { homeDir } from '../platform/paths.mjs';

const SKILL_ROOTS = ['.agents', '.claude'];

const packRootDefault = () => fileURLToPath(new URL('../../', import.meta.url));

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

      const names = listSkillNames();
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
