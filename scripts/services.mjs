import { runServiceCommand } from '../lib/services/runner.mjs';

try {
  const result = await runServiceCommand(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.code ?? 0;
} catch (error) {
  process.stdout.write(`${JSON.stringify({ code: 2, message: error.message })}\n`);
  process.exitCode = 2;
}
