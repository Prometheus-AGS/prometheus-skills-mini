import path from 'node:path';
import { readFileSync } from 'node:fs';
import { acquireLock } from '../platform/lock.mjs';
import { fileURLToPath } from 'node:url';
import { spawnExecutable } from '../platform/spawn.mjs';
import { atomicWrite } from '../platform/atomic-write.mjs';
import { assertProjectionWritable } from './runtime-authority.mjs';
import { readBackendTasks, readJson, complete, cancelled } from './reconcile-artifacts.mjs';

const driver = fileURLToPath(new URL('../../scripts/kbd-apply.mjs', import.meta.url));

export function repairAdapters(readCanonical) {
  return {
    readCanonical,
    async repairCheckbox(root, phase, task) {
      const directory = path.join(root, 'openspec', 'changes', task.change);
      const file = path.join(directory, 'tasks.md');
      const unlock = acquireLock(file + '.kbd-lock');
      try {
        const state = await readCanonical(root);
        const canonical = state.phases?.[phase]?.changes?.[task.change]?.tasks?.[task.runtimeId];
        if (state.activePath.phaseId !== phase || !complete(canonical?.status) || canonical.title?.trim() !== task.title) {
          throw new Error('canonical task changed before checkbox repair');
        }
        const current = readBackendTasks(root, task.change, 'openspec');
        if (current.directory !== directory || current.archived) throw new Error('only active OpenSpec files are repairable');
        const original = readFileSync(file, 'utf8');
        let matches = 0;
        const updated = original.replace(/^(\s*[-*]\s*\[)([ xX])(\]\s*)([^\r\n]*)/gm, (line, before, box, after, title) => {
          if (title.trim() !== task.title) return line;
          matches++;
          return before + 'x' + after + title;
        });
        if (matches !== 1 || readFileSync(file, 'utf8') !== original) throw new Error('OpenSpec task identity changed before repair');
        if (updated !== original) atomicWrite(file, updated);
      } finally { unlock(); }
    },
    async repairTask(root, phase, task) {
      // Check again at every write boundary: another tool may have moved the active phase.
      const check = async () => {
        const state = await readCanonical(root);
        if (state.activePath?.phaseId !== phase) throw new Error('active phase changed before repair');
        const change = state.phases?.[phase]?.changes?.[task.change];
        const status = change?.tasks?.[task.runtimeId]?.status;
        if (cancelled(status) || cancelled(change?.status) || cancelled(state.phases?.[phase]?.status)) {
          throw new Error('task or phase was cancelled before repair');
        }
        return status;
      };
      let status = await check();
      if (complete(status)) return;
      const invoke = (operation) => {
        const result = spawnExecutable(process.execPath, [driver, operation, task.change, task.id,
          String(task.sequence), String(task.total), task.title], {
          cwd: root, env: { ...process.env, KBD_RECONCILE_PHASE: phase },
        });
        if (result.stdout) process.stderr.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
        if (result.status !== 0) throw new Error(`${operation} failed for ${task.change}/${task.id} (exit ${result.status ?? 'unavailable'})`);
      };
      if (status !== 'in_progress' && status !== 'in-progress') invoke('begin-task');
      status = await check();
      if (!complete(status)) invoke('end-task');
    },
    async repairCounts(context, counts) {
      assertProjectionWritable(context.root, context.progressFile);
      const waypoint = readJson(path.join(context.root, '.kbd-orchestrator', 'current-waypoint.json'));
      const active = waypoint.activePhaseId || (waypoint.path?.join('::')) ||
        [waypoint.phase, waypoint.childPointer].filter(Boolean).join('::');
      if (active !== context.phase) throw new Error('active phase changed before count repair');
      const current = readJson(context.progressFile);
      const changes = current.changes.map((change) => {
        if (!counts.some((row) => row.change === change.id)) return change;
        const tasks = context.artifacts[change.id].tasks;
        return { ...change, tasks_done: tasks.filter((task) => task.done).length, tasks_total: tasks.length };
      });
      const next = { ...current, changes };
      if (counts.some((row) => row.kind === 'phase-count')) {
        for (const [done, total] of [['changes_completed', 'changes_total'], ['implementation_completed', 'implementation_total']]) {
          if (current[done] !== undefined || current[total] !== undefined) {
            next[done] = context.phaseCounts.completed; next[total] = context.phaseCounts.total;
          }
        }
        if (current.completion?.implementation) next.completion = { ...current.completion,
          implementation: { ...current.completion.implementation, ...context.phaseCounts } };
      }
      atomicWrite(context.progressFile, JSON.stringify(next, null, 2));
    },
  };
}
