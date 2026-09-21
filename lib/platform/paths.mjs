// The only module in this repository that is allowed to ask the operating system where
// things live. Everything else imports from here, so no other file reads a home or temp
// location from an environment variable or writes one as a literal — a blocking constraint
// checks for exactly that, and names the forbidden spellings itself.
//
// The roots are injectable so tests are pure functions of their inputs and can never
// write into a real home directory by accident.

import os from 'node:os';
import path from 'node:path';

const STATE_DIR_NAME = '.prometheus';

export function createPaths({ home, temp } = {}) {
  const homeRoot = () => home ?? os.homedir();
  const tempRoot = () => temp ?? os.tmpdir();

  return {
    homeDir: homeRoot,
    tempDir: tempRoot,
    stateDir: (...parts) => path.join(homeRoot(), STATE_DIR_NAME, ...parts),
    join: (...parts) => path.join(...parts),
  };
}

const defaultPaths = createPaths();

export const homeDir = defaultPaths.homeDir;
export const tempDir = defaultPaths.tempDir;
export const stateDir = defaultPaths.stateDir;
export const join = defaultPaths.join;
