// Directories that belong to a skill's source and never to an installed skill.
//
//   evals/           certification cases. They are for the people maintaining the
//                    skill; shipping them would hand every user a set of prompts
//                    and graders no harness reads at run time.
//   .claude-plugin/  a plugin manifest. Beside a SKILL.md it would make Claude Code
//                    register the installed folder as a plugin of its own and list
//                    its skills a second time.
//
// The rule applies only where the directory sits beside a SKILL.md, so a skill may
// still carry a folder called `evals` deeper in its tree as ordinary content.

import fs from 'node:fs';
import path from 'node:path';

export const SKILL_SOURCE_ONLY_DIRS = Object.freeze(['evals', '.claude-plugin']);

/** True when `name` inside `directory` is one of the source-only directories of a skill. */
export function isSkillSourceOnly(directory, name) {
  return SKILL_SOURCE_ONLY_DIRS.includes(name) && fs.existsSync(path.join(directory, 'SKILL.md'));
}
