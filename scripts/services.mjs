import { runServiceCommand } from '../lib/services/runner.mjs';

const controller = new AbortController();
process.once('SIGTERM', () => controller.abort());
process.once('SIGINT', () => controller.abort());
try {
  const result = await runServiceCommand(process.argv.slice(2), {
    signal: controller.signal,
    onOutput: (text) => process.stderr.write(text),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.code ?? 0;
} catch (error) {
  process.stdout.write(`${JSON.stringify({ code: 2, message: error.message })}\n`);
  process.exitCode = 2;
}
