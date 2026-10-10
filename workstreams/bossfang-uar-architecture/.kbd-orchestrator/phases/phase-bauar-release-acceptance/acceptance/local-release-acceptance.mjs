import { loadConfig } from './lib/inputs.mjs';
import { runIntegration, finalize } from './lib/stages.mjs';
import { requireValue, safeError } from './lib/records.mjs';

try {
  const args = process.argv.slice(2);
  requireValue(args.length === 4 && args[0] === '--config' && args[2] === '--stage'
    && ['integration', 'finalize'].includes(args[3]), 'arguments_invalid');
  const stage = args[3];
  const config = await loadConfig(args[1], { phase: 'phase-bauar-release-acceptance', stage });
  const result = await (stage === 'integration' ? runIntegration(config) : finalize(config));
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, ...result })}\n`);
  process.exitCode = result.exitCode;
} catch (error) {
  const { category, exitCode } = safeError(error);
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, exitCode,
    status: exitCode === 1 ? 'FAIL' : 'BLOCKED', category })}\n`);
  process.exitCode = exitCode;
}
