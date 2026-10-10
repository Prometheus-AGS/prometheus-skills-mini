import { join, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadConfig, componentBinding, executableHash, recheck } from '../../acceptance/lib/inputs.mjs';
import { privateEnvironment } from '../../acceptance/lib/environment.mjs';
import { outputAdapter } from '../../acceptance/lib/adapters.mjs';
import { runOwned } from '../../acceptance/lib/processes.mjs';
import { writeNew, verifyRef, requireValue, digest, safeError } from '../../acceptance/lib/records.mjs';

const evidence = new URL('.', import.meta.url).pathname;
const configPath = new URL('../../acceptance/candidate-inputs.json', import.meta.url).pathname;
let diagnosticRoot;
try {
  await verifyRef({ path: configPath, sha256: '43d5a37b59743f7afc9b39ddbe8ced25b9553e77ad1c6efe479cd02fb5338e33' });
  const config = await loadConfig(configPath, { phase: 'phase-bauar-release-acceptance', stage: 'integration' });
  await verifyRef({ path: config.runtimeSealPath, sha256: '3698f8414d12e38afad2b5868968f1d094d928775d31deaf47775b01b6322bc4' });
  const component = config.components.find(item => item.id === 'desktop');
  requireValue(component?.adapter.kind === 'component', 'desktop_component_unavailable');
  const command = config.seal.commands.find(item => item.componentId === component.id);
  const binding = componentBinding(config, component);
  await recheck(config);
  requireValue(await executableHash(command.program) === command.programSha256, 'component_program_changed');
  diagnosticRoot = join(config.privateRoot, randomUUID());
  const bindingPath = join(diagnosticRoot, 'binding.json');
  const childReceiptPath = join(diagnosticRoot, 'component.json');
  const { env } = await privateEnvironment(config, component, diagnosticRoot, bindingPath, childReceiptPath);
  await writeNew(bindingPath, binding);
  const adapter = outputAdapter(component, diagnosticRoot, undefined, binding);
  const codes = new Set();
  const locations = [];
  const moduleSpecifiers = new Set();
  const eligibleSources = new Set(component.sourcePaths.filter(path => path.startsWith(command.cwd + '/')));
  const markers = { syntaxError: false, importMetaOutsideModule: false, cannotFindModule: false,
    cannotFindPackage: false, moduleNotFound: false, esmRequire: false, invalidFileUrl: false,
    missingBrowser: false, permissionDenied: false, typeError: false, assertionError: false };
  let lines = 0;
  const result = await runOwned({ program: command.program, args: command.args, cwd: command.cwd, env,
    budgetMs: component.budgetMs, outputPolicy: {
      observeLine(stream, line) {
        adapter.policy.observeLine(stream, line);
        lines++;
        for (const match of line.matchAll(/\b(?:ERR_[A-Z_]+|TS[0-9]{4,5})\b/g)) codes.add(match[0]);
        markers.syntaxError ||= /SyntaxError:/.test(line);
        markers.importMetaOutsideModule ||= line.includes("Cannot use 'import.meta' outside a module") || line.includes('Cannot use "import.meta" outside a module');
        markers.cannotFindModule ||= /Cannot find module/.test(line);
        markers.cannotFindPackage ||= /Cannot find package/.test(line);
        markers.moduleNotFound ||= /MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND/.test(line);
        markers.esmRequire ||= /ERR_REQUIRE_ESM|require\(\) of ES Module/.test(line);
        markers.invalidFileUrl ||= /ERR_INVALID_ARG_(?:TYPE|VALUE)/.test(line) && /filename|fileURL|path/.test(line);
        markers.missingBrowser ||= /Executable doesn't exist|Browser executable is not found/.test(line);
        markers.permissionDenied ||= /EACCES|permission denied/.test(line);
        markers.typeError ||= /TypeError:/.test(line);
        markers.assertionError ||= /AssertionError/.test(line);
        for (const match of line.matchAll(/['"](@(?:main|shared|modelcontextprotocol|playwright)\/[A-Za-z0-9_./-]+)['"]/g)) moduleSpecifiers.add(match[1]);
        for (const match of line.matchAll(/(?:file:\/\/)?([A-Za-z0-9_./-]+\.(?:ts|tsx|js|mjs))(?::|\()([0-9]+)(?::|,)([0-9]+)/g)) {
          const path = isAbsolute(match[1]) ? match[1] : join(command.cwd, match[1]);
          if (eligibleSources.has(path) && locations.length < 64) locations.push({ path, line: Number(match[2]), column: Number(match[3]) });
        }
      },
      result() { return { ...adapter.policy.result(), diagnosticLines: lines }; },
      onStarted(info) { return writeNew(join(diagnosticRoot, 'owned-process.json'), { schemaVersion: 1, kind: 'desktop-diagnostic-owned',
        ...info, processGroupId: info.pid, binding, command: { programSha256: command.programSha256, argvSha256: digest(command.args), argumentCount: command.args.length, cwd: command.cwd } }); }
    } });
  await recheck(config);
  const record = { schemaVersion: 1, kind: 'desktop-command-diagnostic', binding, attemptRoot: diagnosticRoot,
    result, diagnostic: { codes: [...codes], locations, moduleSpecifiers: [...moduleSpecifiers], markers },
    rawOutputRetained: false, runtimeEnvironmentRetained: false, acceptanceClaim: false };
  const ref = await writeNew(join(diagnosticRoot, 'diagnostic.json'), record);
  console.log(JSON.stringify({ ...ref, result, diagnostic: record.diagnostic, acceptanceClaim: false }));
} catch (error) {
  const safe = safeError(error);
  const ref = await writeNew(join(evidence, 'desktop-command-diagnostic-observer-failure-' + randomUUID() + '.json'),
    { schemaVersion: 1, kind: 'desktop-diagnostic-observer-failure', ...safe, attemptRoot: diagnosticRoot ?? null, rawDiagnosticRetained: false });
  console.log(JSON.stringify({ ...ref, ...safe }));
  process.exitCode = safe.exitCode;
}
