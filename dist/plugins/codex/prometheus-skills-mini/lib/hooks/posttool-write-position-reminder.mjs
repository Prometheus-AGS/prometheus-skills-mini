// PostToolUse(Write|Edit): refreshes the position reminder so the next turn reads
// its position from a file rather than from a summary that compaction may drop.
//
// The write goes through lib/platform/atomic-write.mjs: temp file in the same
// directory then rename, with the bounded EPERM/EBUSY retry that Windows needs
// when antivirus or the search indexer holds the destination open. A hook that
// re-implemented that would be a defect, not a shortcut.
import path from 'node:path';
import { createAtomicWrite } from '../platform/atomic-write.mjs';
import { findProjectRoot, readProjectId, isPaused, degradeSafely, cwdOf } from './context.mjs';

const atomicWrite = createAtomicWrite({});

const render = ({ projectId, paused, at }) =>
  `POSITION REMINDER — read this as your FIRST tool call every turn
Project: ${projectId ?? 'unknown'}
Pause advisory: ${paused ? 'ACTIVE — confirm intent before advancing planned work' : 'none'}
Refreshed: ${at}

Written by the posttool-write-position-reminder hook. Do not hand-edit:
it is rewritten after every Write or Edit.
`;

export async function run(payload) {
  return degradeSafely(payload.hookId, async () => {
    const projectRoot = findProjectRoot(cwdOf(payload.input));
    if (!projectRoot) return { written: false, reason: 'no project root' };

    const target = path.join(projectRoot, '.kbd-orchestrator', 'position-reminder.txt');
    const at = new Date().toISOString();
    atomicWrite(target, render({ projectId: readProjectId(projectRoot), paused: isPaused(projectRoot), at }));

    return { written: true, target, at };
  });
}
