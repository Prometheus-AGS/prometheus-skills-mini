// The doctor's entry point. Prints ONE JSON OBJECT PER LINE, then a summary line.
//
// The format is the mini's own contract (lib/doctor/contract.md), not the-boss's: its
// DoctorCheckRegistry is closed over a fixed id union, so it cannot register these checks
// and instead spawns this script and maps these lines. That makes this output a
// cross-process interface — keep it stable.
//
// Entry points parse arguments, call lib/, print and exit. No logic lives here.

import { allChecks } from '../lib/doctor/registry.mjs';
import { outcomeConformance, fixOutcomeConformance } from '../lib/doctor/contract.mjs';

const USAGE = `Usage: node scripts/doctor.mjs [--human] [--fix <fixId>]

  (no flags)      run every check, one JSON object per line, then a summary line
  --human         render a table instead of JSON
  --fix <fixId>   apply one named fix and print its result line

Exit: 0 when nothing failed, 1 when any check failed or a fix could not be applied.`;

function parseArgs(argv) {
  const args = { human: false, fix: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--human') args.human = true;
    else if (arg === '--fix') {
      args.fix = argv[++i] ?? null;
      if (args.fix === null) throw new Error('--fix needs a fix id');
    } else throw new Error(`unrecognized argument: ${arg}`);
  }
  return args;
}

/** The context every check receives. MINI_DOCTOR_HOME lets a test drive a temp home. */
const context = () => {
  const home = process.env.MINI_DOCTOR_HOME;
  return home ? { home } : {};
};

const write = (line) => process.stdout.write(`${line}\n`);

async function runAll(ctx) {
  const results = [];
  for (const check of allChecks()) {
    let outcome;
    try {
      outcome = await check.run(ctx);
      // Pass the owner's implemented fixes: an outcome advertising a fix id nothing
      // implements would render a button in the-boss's UI that cannot work.
      const violations = outcomeConformance(outcome, check.id, Object.keys(check.fixes ?? {}));
      if (violations.length > 0) {
        // A malformed outcome is the check's bug, reported as a finding rather than
        // silently reshaped — a reshaped outcome would hide the defect.
        outcome = {
          status: 'fail',
          summary: `${check.id} returned an outcome that violates the contract`,
          detail: violations.join('\n'),
        };
      }
    } catch (error) {
      // One check throwing must not end the run: the doctor's whole job is to report.
      outcome = {
        status: 'fail',
        summary: `${check.id} threw while running`,
        detail: String(error?.message ?? error),
      };
    }
    results.push({ id: check.id, title: check.title, ...outcome });
  }
  return results;
}

const STATUS_MARK = { pass: 'ok  ', warn: 'warn', fail: 'FAIL', skip: 'skip' };

function renderHuman(results) {
  const width = Math.max(...results.map((r) => r.id.length));
  for (const r of results) {
    write(`${STATUS_MARK[r.status]}  ${r.id.padEnd(width)}  ${r.summary}`);
    if (r.detail && r.status !== 'pass') {
      for (const line of String(r.detail).split('\n')) write(`        ${line}`);
    }
  }
  const counts = tally(results);
  write('');
  write(`${counts.pass} passed, ${counts.warn} warned, ${counts.fail} failed, ${counts.skip} skipped`);
}

const tally = (results) => ({
  pass: results.filter((r) => r.status === 'pass').length,
  warn: results.filter((r) => r.status === 'warn').length,
  fail: results.filter((r) => r.status === 'fail').length,
  skip: results.filter((r) => r.status === 'skip').length,
});

async function applyFix(fixId, ctx) {
  const owner = allChecks().find((c) => (c.offers ?? []).includes(fixId));
  if (!owner) {
    const known = allChecks().flatMap((c) => c.offers ?? []);
    throw new Error(`no check offers a fix called ${JSON.stringify(fixId)}. Known: ${known.join(', ') || '(none)'}`);
  }

  const outcome = await owner.fixes[fixId](ctx);
  const violations = fixOutcomeConformance(outcome, fixId);
  if (violations.length > 0) throw new Error(violations.join('\n'));

  write(JSON.stringify({ fixId, check: owner.id, ...outcome }));
  return outcome.status === 'refused' ? 1 : 0;
}

async function main(argv) {
  const args = parseArgs(argv);
  const ctx = context();

  if (args.fix !== null) return applyFix(args.fix, ctx);

  const results = await runAll(ctx);
  if (args.human) renderHuman(results);
  else {
    for (const r of results) write(JSON.stringify(r));
    write(JSON.stringify({ summary: true, ...tally(results) }));
  }
  return tally(results).fail > 0 ? 1 : 0;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => {
    // Never a stack trace: this runs inside another application's settings UI.
    process.stderr.write(`doctor: ${error?.message ?? error}\n\n${USAGE}\n`);
    process.exit(2);
  });
