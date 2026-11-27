import { runRulesAudit } from './rules-audit.mjs';

process.exitCode = runRulesAudit(process.argv.slice(2));
