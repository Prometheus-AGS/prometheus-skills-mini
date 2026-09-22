// The registered check set, in report order: the cheapest and most fundamental first, so
// a terminal reader sees the runtime verdict before the network probes, and the binding
// install-scope rule last where it cannot be missed.
//
// Each group module exports `checks: []`. The contract test binds on whatever is
// registered here, so a check that ships is a check that conforms.

import { checks as runtime } from './runtime.mjs';
import { checks as tools } from './tools.mjs';
import { checks as services } from './services.mjs';
import { checks as skills } from './skills.mjs';
import { checks as kbd } from './kbd.mjs';
import { checks as scope } from './scope.mjs';

/** Every registered check, in report order. */
export function allChecks() {
  return [...runtime, ...tools, ...services, ...skills, ...kbd, ...scope];
}
