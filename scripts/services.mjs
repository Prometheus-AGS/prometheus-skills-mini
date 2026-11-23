import { runServiceCommand } from '../lib/services/runner.mjs';

// The Boss invokes the legacy Compose contract with its own directory and project.
if (process.argv[2] === 'providers' || ['plan', 'apply', 'uninstall'].includes(process.argv[2])) {
  if (process.argv[2] === 'providers') process.argv.splice(2, 1);
  await import('./service-providers/cli.mjs');
} else {
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
}
