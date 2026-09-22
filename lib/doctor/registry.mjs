// The registered check set, in report order: cheapest and most fundamental first, so a
// terminal reader sees the runtime verdict before the network probes.
//
// Each group module exports `checks: []`. They are added here as task 2.1 builds them;
// the contract test binds on whatever is registered, so a check that is registered is
// conformant by the time it ships.

import { checks as runtime } from './runtime.mjs';
import { checks as skills } from './skills.mjs';

/** Every registered check, in report order. */
export function allChecks() {
  return [...runtime, ...skills];
}
