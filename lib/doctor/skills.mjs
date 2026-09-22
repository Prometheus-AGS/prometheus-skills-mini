// The home-directory skill copies: the pack's skills must also live under
// <home>/.agents/skills/<name> and <home>/.claude/skills/<name>, so tools that are not
// the-boss can find them.
//
// A-3, the one real trust boundary in this change: `copy-skills` WRITES UNDER THE USER'S
// HOME. It therefore writes only to those two roots, only for names the pack actually
// has, refuses any name that is not a single plain directory component, never deletes,
// and refuses outright on a machine that already has the full pack (openspec/config.yaml
// — the two must never shadow each other's skills).

import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from '../platform/atomic-write.mjs';
import { detectFullPack as detectFullPackDefault } from '../platform/full-pack.mjs';
import { homeDir } from '../platform/paths.mjs';

const SKILL_ROOTS = ['.agents', '.claude'];

const packRootDefault = () => fileURLToPath(new URL('../../', import.meta.url));

/**
 * A skill name must be ONE plain directory component: no separator, no `..`, no drive,
 * no absolute path. Anything else could place a write outside the two roots, which is
 * the whole point of the boundary.
 */
const isSafeName = (name) =>
  typeof name === 'string' &&
  name !== '' &&
  name !== '.' &&
  name !== '..' &&
  !name.includes('/') &&
  !name.includes('\\') &&
  !path.isAbsolute(name) &&
  path.basename(name) === name;

/**
 * Does `target` really live inside `root`, following every symlink on the way?
 *
 * `realpathSync` on the deepest existing ancestor: the target itself often does not exist
 * yet (that is the normal case — we are about to create it), so resolving what IS there
 * and re-appending the rest is what catches a symlinked PARENT as well as a symlinked
 * leaf. A path that cannot be resolved at all is treated as escaping: refusing to write
 * somewhere unverifiable is the safe direction.
 */
const resolveThroughMissing = (target, realpath) => {
  let existing = target;
  const rest = [];
  for (;;) {
    try {
      // `.slice()` first: `.reverse()` mutates, and `rest` is reused if this repeats.
      return path.resolve(realpath(existing), ...rest.slice().reverse());
    } catch {
      const parent = path.dirname(existing);
      if (parent === existing) return null;
      rest.push(path.basename(existing));
      existing = parent;
    }
  }
};

const containedRealPath = (root, target, ctx = {}) => {
  const realpath = ctx.realpath ?? realpathSync;
  // BOTH sides resolve through missing components. On a clean machine neither the skills
  // root nor the skill directory exists yet — that is the ordinary first install — and an
  // earlier version resolved only the target, so `realpath(root)` threw and every
  // legitimate write was refused.
  const realRoot = resolveThroughMissing(root, realpath);
  const realTarget = resolveThroughMissing(target, realpath);
  if (realRoot === null || realTarget === null) return false;

  return realTarget === realRoot || realTarget.startsWith(realRoot + path.sep);
};

const listSkillNamesDefault = (packRoot) => () => {
  const dir = path.join(packRoot, 'skills');
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
};

/** Every file in a skill, as paths relative to the skill directory. */
const filesUnder = (dir, prefix = '') => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) out.push(...filesUnder(path.join(dir, entry.name), rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
};

/**
 * Byte-for-byte, not size or mtime: a one-byte edit keeping the length must be caught.
 *
 * `lstatSync`, not `statSync`: a symlink pointing at identical bytes would otherwise read
 * as a match, and the requirement is "copy — never symlink". A symlinked skill breaks the
 * moment its target moves, and the whole point of copying is that the home directories do
 * not depend on this checkout still being there.
 */
const differs = (a, b) => {
  try {
    const stat = lstatSync(b);
    if (stat.isSymbolicLink() || !stat.isFile()) return true;
  } catch {
    return true;
  }
  return !readFileSync(a).equals(readFileSync(b));
};

/**
 * Every (skill, root, file) that is missing, different, or EXTRA.
 *
 * Both sides are enumerated. Walking only the source would let an unexpected file sit in
 * a home skill directory and still report "match" — and these directories are what other
 * tools read, so a stray file there is a real integrity gap, not cosmetic. Extras are
 * reported (`kind: 'extra'`) but never deleted: removing a file under the user's home is
 * not this fix's business (A-11).
 */
const drift = ({ packRoot, home, names }) => {
  const found = [];
  for (const name of names) {
    const source = path.join(packRoot, 'skills', name);
    let files;
    try {
      files = filesUnder(source);
    } catch {
      continue;
    }
    for (const root of SKILL_ROOTS) {
      const skillsRoot = path.join(home, root, 'skills');
      const destination = path.join(skillsRoot, name);

      // The DIRECTORY, not just the leaf file. Round 5 replaced statSync with lstatSync
      // for each file, but every path still ran through `destination` — so a symlinked
      // skill DIRECTORY pointing into the pack resolved to real files with identical
      // bytes and reported "match". `run` then said pass while the fix said refused:
      // two contradictory verdicts about one state. A symlinked directory is exactly
      // what "copy — never symlink" forbids.
      if (!containedRealPath(skillsRoot, destination)) {
        found.push({ kind: 'drift', name, root, rel: '.', from: source, to: destination, escaping: true });
        continue;
      }

      for (const rel of files) {
        const from = path.join(source, ...rel.split('/'));
        const to = path.join(destination, ...rel.split('/'));
        if (differs(from, to)) found.push({ kind: 'drift', name, root, rel, from, to });
      }

      let present = [];
      try {
        present = filesUnder(destination);
      } catch {
        present = []; // absent entirely — the missing files above already say so
      }
      for (const rel of present) {
        if (!files.includes(rel)) {
          found.push({ kind: 'extra', name, root, rel, to: path.join(destination, ...rel.split('/')) });
        }
      }
    }
  }
  return found;
};

const resolve = (ctx = {}) => {
  const packRoot = ctx.packRoot ?? packRootDefault();
  return {
    packRoot,
    home: ctx.home ?? homeDir(),
    detect: ctx.detectFullPack ?? detectFullPackDefault,
    listSkillNames: ctx.listSkillNames ?? listSkillNamesDefault(packRoot),
  };
};

export const checks = [
  {
    id: 'mini-skill-copies',
    title: 'Skill copies in the home directory',
    offers: ['copy-skills'],

    async run(ctx = {}) {
      const { packRoot, home, detect, listSkillNames } = resolve(ctx);

      const full = detect({ home });
      if (full.present) {
        // Not a failure of this machine: on a full-pack box the copies are forbidden,
        // so their absence is correct. mini-install-scope is what fails if they exist.
        return {
          status: 'skip',
          summary: 'The full skill pack is installed here, so the mini never copies into the home directory',
          detail: `Markers:\n${full.markers.join('\n')}`,
        };
      }

      const names = listSkillNames();
      if (names.length === 0) {
        return { status: 'skip', summary: `No skills found under ${path.join(packRoot, 'skills')}` };
      }

      const found = drift({ packRoot, home, names });
      const missing = found.filter((f) => f.kind === 'drift');
      const extra = found.filter((f) => f.kind === 'extra');

      if (missing.length > 0 || extra.length > 0) {
        const lines = [];
        if (missing.length > 0) {
          const where = [...new Set(missing.map((m) => `${m.name} → ${path.join(home, m.root, 'skills', m.name)}`))];
          lines.push(`Missing or different:\n${where.join('\n')}`);
        }
        if (extra.length > 0) {
          // Named, never removed: deleting under the user's home is not this fix's business.
          lines.push(`Present in the home copy but not in the pack (remove by hand if unwanted):\n${extra.map((e) => e.to).join('\n')}`);
        }
        return {
          status: 'fail',
          summary:
            missing.length > 0
              ? `${missing.length} file(s) are missing or differ${extra.length > 0 ? `, and ${extra.length} unexpected file(s) are present` : ''}`
              : `${extra.length} unexpected file(s) are present in the home skill directories`,
          detail: lines.join('\n\n'),
          ...(missing.length > 0 ? { actions: [{ kind: 'fix', fixId: 'copy-skills' }] } : {}),
        };
      }
      return { status: 'pass', summary: `${names.length} skill(s) match in both home directories` };
    },

    fixes: {
      async 'copy-skills'(ctx = {}) {
        const { packRoot, home, detect, listSkillNames } = resolve(ctx);

        const full = detect({ home });
        if (full.present) {
          return {
            status: 'refused',
            summary: 'Refused: the full skill pack is installed here, and the mini never installs natively beside it',
          };
        }

        const names = listSkillNames();
        // Validate EVERY name before writing anything, so a hostile name cannot be
        // preceded by partial writes from the safe ones.
        const unsafe = names.filter((n) => !isSafeName(n));
        if (unsafe.length > 0) {
          return {
            status: 'refused',
            summary: `Refused: ${unsafe.map((n) => JSON.stringify(n)).join(', ')} is not a plain skill name`,
          };
        }

        // A safe NAME is not a safe PATH. `refine-ui` is a perfectly valid name, but if
        // `<home>/.agents/skills/refine-ui` is a symlink to somewhere else, writing
        // "into" it writes there — which defeats the boundary this fix exists to hold.
        // Verified: before this check the fix wrote a file outside the home skills root
        // entirely. Every destination directory is resolved and must still be inside its
        // root, with no symlink anywhere on the way.
        const escaping = [];
        for (const name of names) {
          for (const root of SKILL_ROOTS) {
            const skillsRoot = path.join(home, root, 'skills');
            const destination = path.join(skillsRoot, name);
            if (!containedRealPath(skillsRoot, destination, ctx)) escaping.push(destination);
          }
        }
        if (escaping.length > 0) {
          return {
            status: 'refused',
            summary: `Refused: ${escaping[0]} does not resolve inside the home skills directory (symlink or junction)`,
          };
        }

        const pending = drift({ packRoot, home, names }).filter((d) => d.kind === 'drift');
        if (pending.length === 0) {
          return { status: 'fixed', summary: 'Already up to date; 0 files written' };
        }

        for (const { from, to } of pending) {
          if (!existsSync(from)) continue;
          atomicWrite(to, readFileSync(from));
        }
        return { status: 'fixed', summary: `Copied ${pending.length} file(s) into the home skill directories` };
      },
    },
  },
];
