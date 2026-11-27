// regrade.mjs — grade again the samples a grader failure left BLOCKED, without new agent sessions.
//
// Only a sample whose agent session ran and whose grade is BLOCKED is touched. Its retained
// transcript must still match the digest recorded in the report; a missing or changed transcript is
// left BLOCKED and reported. PASS and FAIL samples, and samples blocked for any other reason, are
// never graded again, so a second attempt cannot be used to replace a verdict that was reached.
//
// Usage:
//   node evals/vlbv-protocol/regrade.mjs --corpus <name> --harness <id> [--no-helper]
// Exit: 0 report rewritten and valid; 1 usage, a missing report, or an invalid report.
import fs from 'node:fs';
import path from 'node:path';
import { adapterFor } from './adapters/index.mjs';
import { gradeSample } from './lib/grade.mjs';
import { caseVerdict, renderMarkdown, tally, validateReport } from './lib/report.mjs';
import { DEFAULT_CORPUS, REPORTS_DIR, ROOT, loadCorpus, parseArgs, readJson, sha256, stamp, writeJson, writeText } from './lib/common.mjs';

/** The agent's answer as the grader first saw it: the adapter's reading of the retained stdout. */
function gradedText(adapter, transcript) {
  const stdout = transcript.split('\n## stdout\n')[1]?.split('\n## stderr\n')[0] ?? '';
  return adapter.text(stdout);
}

async function main() {
  const args = parseArgs(process.argv.slice(2), ['no-helper']);
  const corpusName = String(args.corpus ?? DEFAULT_CORPUS);
  if (!args.harness) throw new Error('--harness <id> is required');
  const corpus = loadCorpus(corpusName);
  const directory = corpusName === DEFAULT_CORPUS ? REPORTS_DIR : path.join(REPORTS_DIR, corpusName);
  const name = args.harness + (args['no-helper'] ? '-no-helper' : '');
  const file = path.join(directory, `${name}.json`);
  if (!fs.existsSync(file)) throw new Error(`no report at ${path.relative(ROOT, file)}`);
  const report = readJson(file);
  const adapter = adapterFor(args.harness, {});
  const family = adapter.family();

  const regraded = [];
  const skipped = [];
  for (const entry of report.cases.filter(c => c.class === 'agent')) {
    const def = corpus.cases.find(c => c.id === entry.id);
    for (const sample of entry.samples ?? []) {
      if (sample.verdict !== 'BLOCKED' || sample.grade?.verdict !== 'BLOCKED') continue;
      const label = `${entry.id} s${sample.n}`;
      const transcriptFile = path.join(ROOT, sample.transcript?.path ?? '');
      if (!sample.transcript?.path || !fs.existsSync(transcriptFile)) { skipped.push(`${label}: transcript not retained`); continue; }
      const transcript = fs.readFileSync(transcriptFile, 'utf8');
      if (sha256(transcript) !== sample.transcript.sha256) { skipped.push(`${label}: transcript changed since the run`); continue; }
      const previous = sample.grade;
      const grade = await gradeSample({ testCase: def, transcript: gradedText(adapter, transcript), harnessFamily: family });
      Object.assign(sample, { verdict: grade.verdict, reason: grade.reason, grade: { ...grade, regradedAt: stamp(), previous } });
      regraded.push(`${label}: ${grade.verdict}`);
    }
    Object.assign(entry, caseVerdict(entry.samples ?? [], entry.passesRequired, report.samplesDeclared));
  }
  report.counts = tally(report.cases);
  report.regrade = [...(Array.isArray(report.regrade) ? report.regrade : report.regrade ? [report.regrade] : []), { at: stamp(), regraded, skipped }];

  writeJson(file, report);
  writeText(path.join(directory, `${name}.md`), renderMarkdown(report));
  const machineryFile = path.join(REPORTS_DIR, 'machinery.json');
  const problems = validateReport(report, { corpus, machineryReport: fs.existsSync(machineryFile) ? readJson(machineryFile) : null });
  for (const line of regraded) process.stdout.write(`  regraded ${line}\n`);
  for (const line of skipped) process.stdout.write(`  skipped ${line}\n`);
  for (const entry of report.cases) process.stdout.write(`  ${entry.id}: ${entry.verdict} (${entry.reason})\n`);
  process.stdout.write(`${name}: pass ${report.counts.pass}, fail ${report.counts.fail}, blocked ${report.counts.blocked}; report ${problems.length ? 'INVALID' : 'valid'}\n`);
  for (const problem of problems) process.stdout.write(`  invalid: ${problem}\n`);
  process.exitCode = problems.length ? 1 : 0;
}

main().catch((error) => {
  process.stderr.write(`regrade: ${error.message}\n`);
  process.exitCode = 1;
});
