// The no-hardcoded-secrets content check, replacing the old one-line `git grep` expression in
// .kbd-orchestrator/constraints.md. An entry point only: load the finite disposition store, run
// the repository scan from the current directory, print the report, exit.
//
// Exit codes (decided by decideExitCode in lib/secret-scan/scanner.mjs):
//   0 = clean — every hit matched a disposition. PARSE-NOTE lines may still be printed: a .json
//       file that does not parse is always fully text-scanned and always reported, but the note
//       alone never fails the run.
//   1 = undispositioned or stale hits on fully inspected files.
//   2 = the scan itself failed (git enumeration could not run, or a candidate was unreadable —
//       printed as an ERROR line), OR a parse-errored file could have hidden structure-relevant
//       findings: it produced a pattern hit, or the disposition store references it. Those
//       cases also surface through the violation/stale channels; exit 2 marks that the scan was
//       not fully faithful there.
// The report never contains a matched value, file content or a parser message.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decideExitCode,
  formatReport,
  loadDispositions,
  scanRepository,
} from '../lib/secret-scan/scanner.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dispositions = loadDispositions(path.join(here, '..', 'lib', 'secret-scan', 'dispositions.json'));

let result;
try {
  result = scanRepository({ cwd: process.cwd(), dispositions });
} catch (error) {
  console.error(`check-hardcoded-secrets: scan error: ${error.message}`);
  process.exit(2);
}

console.log(formatReport(result));
process.exit(decideExitCode(result));
