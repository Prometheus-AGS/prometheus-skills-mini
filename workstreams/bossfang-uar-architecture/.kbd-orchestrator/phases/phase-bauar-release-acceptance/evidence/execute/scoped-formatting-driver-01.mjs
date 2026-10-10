// Dormant finite formatting gate. Run only after the coordinator releases delivery.
import { mkdir, realpath, lstat } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runOwned } from '../../acceptance/lib/processes.mjs';
import { readJson, verifyRef, hashFile, digest, writeNew, requireValue, eligiblePath, safeError } from '../../acceptance/lib/records.mjs';
import { writeReceipt, statusExit } from '../../acceptance/lib/receipts.mjs';

const phaseRoot = "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance";
const bossRoot = '/Users/gqadonis/.claude/worktrees/bauar-release-boss';
const cursor = '/Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_full_harness_cursor.rs';
const bossProduction = ['src/main/core/paths/constants.ts', 'src/main/core/preboot/userDataLocation.ts',
  'src/main/core/preboot/README.md'].map(path => join(bossRoot, path));
const installedTools = [
  {
    "path": "/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node",
    "realPath": "/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node",
    "sha256": "4255a388254ca4319e2f95f1da375d5deaddf25baf9c7c85070b67f9543b15d0",
    "bytes": 117591472
  },
  {
    "path": "/Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs",
    "realPath": "/Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs",
    "sha256": "b6e13402c88a275f5b1ec4fb420df8763179bbe9f2b87a10911be44a3622d68d",
    "bytes": 5897
  },
  {
    "path": "/Users/gqadonis/.rustup/toolchains/stable-aarch64-apple-darwin/bin/rustfmt",
    "realPath": "/Users/gqadonis/.rustup/toolchains/stable-aarch64-apple-darwin/bin/rustfmt",
    "sha256": "5f552ee4d89172baa898b816c56dd5448f4060436d979ba8690d6007833996dd",
    "bytes": 4473176
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/node_modules/oxfmt/bin/oxfmt",
    "realPath": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/node_modules/.pnpm/oxfmt@0.61.0/node_modules/oxfmt/bin/oxfmt",
    "sha256": "ecab4e2f1bebaab1a3306620bee562ec16e8cb83dd5fb739b94a5aae3c9e34bd",
    "bytes": 46
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/node_modules/oxfmt/dist/cli.js",
    "realPath": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/node_modules/.pnpm/oxfmt@0.61.0/node_modules/oxfmt/dist/cli.js",
    "sha256": "3e57f44585e10d46065d93cf9540759dd1cdfccc4d552ffac476a110f28a0970",
    "bytes": 7178
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/node_modules/.pnpm/oxfmt@0.61.0/node_modules/@oxfmt/binding-darwin-arm64/oxfmt.darwin-arm64.node",
    "realPath": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/node_modules/.pnpm/@oxfmt+binding-darwin-arm64@0.61.0/node_modules/@oxfmt/binding-darwin-arm64/oxfmt.darwin-arm64.node",
    "sha256": "4285763a9f1caf6454f71f787bf38f2967d625384062e4846af14cf5753a9d05",
    "bytes": 6666464
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/.oxfmtrc.json",
    "realPath": "/Users/gqadonis/.claude/worktrees/bauar-release-boss/.oxfmtrc.json",
    "sha256": "7575f600c687ee38800fb7e60ae8d072c6cbeb38e4abff7a60845ef1b2ecf0e8",
    "bytes": 2353
  }
];
const [node24, pnpm, rustfmt, oxfmtLauncher, oxfmtCli, oxfmtNative, oxfmtConfig] = installedTools;

function argumentsFor(argv) {
  requireValue(argv.includes('--run'), 'format_gate_not_released');
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const name = argv[index];
    if (name === '--run') continue;
    requireValue(['--config', '--config-sha256', '--additions', '--additions-sha256', '--receipt'].includes(name),
      'format_argument_invalid');
    requireValue(!Object.hasOwn(options, name) && typeof argv[index + 1] === 'string', 'format_argument_invalid');
    options[name] = argv[++index];
  }
  for (const name of ['--config', '--config-sha256', '--additions', '--additions-sha256'])
    requireValue(typeof options[name] === 'string', 'format_argument_missing');
  return options;
}
function paths(items) {
  requireValue(Array.isArray(items), 'format_scope_missing');
  return items.map(item => eligiblePath(typeof item === 'string' ? item : item.path));
}
async function toolBindings() {
  for (const tool of installedTools) {
    requireValue(await realpath(tool.path) === tool.realPath, 'format_tool_resolution_changed');
    await verifyRef({ path: tool.realPath, sha256: tool.sha256 });
  }
  // Ignoring a requested file may never become a clean formatting result.
  try { await lstat(join(bossRoot, '.prettierignore')); throw new Error('ignore_changed'); }
  catch (error) { requireValue(error.code === 'ENOENT', 'format_ignore_configuration_changed'); }
}
async function setup(options) {
  const configRef = { path: options['--config'], sha256: options['--config-sha256'] };
  const additionsRef = { path: options['--additions'], sha256: options['--additions-sha256'] };
  await verifyRef(configRef); await verifyRef(additionsRef);
  const config = await readJson(configRef.path), additions = await readJson(additionsRef.path);
  requireValue(config.phase === 'phase-bauar-release-acceptance' && additions.schemaVersion === 1,
    'format_phase_mismatch');
  requireValue(additions.candidateConfig.path === configRef.path && additions.candidateConfig.sha256 === configRef.sha256,
    'format_additions_binding_mismatch');
  const sealPath = eligiblePath(config.runtimeSealPath);
  const sealRef = { path: sealPath, sha256: await hashFile(sealPath) };
  const seal = await readJson(sealPath);
  const selected = [...config.sourceFiles, ...config.gateFiles, ...config.manifests,
    config.profile, config.approvedPlan, config.commandContract];
  const sourceSha256 = digest(selected);
  requireValue(seal.configSha256 === configRef.sha256 && seal.executionKey === config.executionKey
    && seal.sourceSha256 === sourceSha256 && seal.profileSha256 === config.profile.sha256,
    'format_seal_binding_mismatch');
  const available = [...selected, ...seal.scenarioSources, ...(additions.recordedScenarioSources ?? []),
    ...(additions.recordedPreparationSources ?? []), ...(additions.recordedDiagnosticInputs ?? []),
    ...(additions.recordedHarnessSources ?? [])];
  const scope = additions.formatScope;
  const desktop = paths(scope.desktopPaths), harness = paths(scope.harnessPaths), rust = paths(scope.rustPaths);
  requireValue(desktop.length === 7 && harness.length === 4 && rust.length === 1 && rust[0] === cursor,
    'format_exact_product_scope_invalid');
  requireValue(desktop.every(path => path.startsWith(bossRoot + '/')), 'format_desktop_scope_invalid');
  requireValue(harness.every(path => path.startsWith('/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-')),
    'format_harness_scope_invalid');
  const preparation = [...paths(scope.phasePreparationPaths), ...paths(scope.phaseDiagnosticRecordPaths),
    ...selected.filter(ref => ref.path.startsWith(phaseRoot + '/') && ['.mjs', '.json'].includes(extname(ref.path))).map(ref => ref.path)];
  requireValue(preparation.every(path => path.startsWith(phaseRoot + '/')), 'format_preparation_scope_invalid');
  const names = [...new Set([...bossProduction, ...desktop, ...harness, ...rust,
    ...preparation.filter(path => ['.mjs', '.json'].includes(extname(path)))])];
  // Enumerate all literal selected names before accessing any selected product bytes.
  const inventory = names.map(path => {
    eligiblePath(path);
    const matches = available.filter(ref => ref.path === path);
    requireValue(matches.length > 0 && new Set(matches.map(ref => ref.sha256)).size === 1,
      'format_source_unbound_or_ambiguous');
    return { path, sha256: matches[0].sha256, checker: path === cursor ? 'rustfmt' : 'oxfmt' };
  });
  const receiptPath = options['--receipt'] ?? config.finalization.formatReceiptPath;
  requireValue(receiptPath.startsWith(phaseRoot + '/evidence/execute/'), 'format_output_scope_invalid');
  eligiblePath(receiptPath);
  const attemptRoot = join(phaseRoot, 'evidence/execute', 'format-private-' + randomUUID());
  await mkdir(attemptRoot, { recursive: true, mode: 0o700 });
  await writeNew(join(attemptRoot, 'literal-inventory.json'), { schemaVersion: 1, configRef, additionsRef, inventory });
  for (const ref of inventory) await verifyRef(ref);
  return { config, configRef, additionsRef, sealRef, sourceSha256, inventory, receiptPath, attemptRoot,
    packageSha256: digest(seal.packageFiles) };
}
async function checkFile(item, context, index) {
  const beforeSha256 = await hashFile(item.path);
  requireValue(beforeSha256 === item.sha256, 'format_input_changed');
  const isRust = item.checker === 'rustfmt';
  const program = isRust ? rustfmt.realPath : node24.realPath;
  const args = isRust ? ['--check', '--edition', '2024', '--config', 'skip_children=true', item.path]
    : [pnpm.realPath, 'exec', 'oxfmt', '--check', item.path];
  let matchedFiles = 0, summaryLines = 0, issues = 0, cleanSummary = false, rustDiff = false;
  const diagnosticPaths = new Set();
  const result = await runOwned({ program, args, cwd: bossRoot, budgetMs: 120000,
    env: { HOME: context.attemptRoot, TMPDIR: context.attemptRoot, XDG_CACHE_HOME: context.attemptRoot,
      PATH: dirname(node24.realPath) + ':' + join(bossRoot, 'node_modules/.bin') + ':/usr/bin:/bin',
      COREPACK_ENABLE_NETWORK: '0', npm_config_offline: 'true', NO_COLOR: '1', CLICOLOR: '0' },
    outputPolicy: {
      async onStarted({ pid, startedAt }) {
        await writeNew(join(context.attemptRoot, 'owned-' + index + '.json'),
          { schemaVersion: 1, pid, processGroupId: pid, startedAt, checker: item.checker, path: item.path });
      },
      observeLine(stream, line) {
        if (isRust) {
          if (line.startsWith('Diff in ' + item.path + ':')) { rustDiff = true; diagnosticPaths.add(item.path); }
          return;
        }
        const summary = /^Finished in .+ on (\d+) files? using \d+ threads?\.$/.exec(line);
        if (summary) { matchedFiles += Number(summary[1]); summaryLines++; }
        const problem = /^Format issues found in above (\d+) files?\./.exec(line);
        if (problem) { issues += Number(problem[1]); if (Number(problem[1]) === 1) diagnosticPaths.add(item.path); }
        cleanSummary ||= line === 'All matched files use the correct format.';
        // All raw diagnostics and diff content are discarded.
      },
      result: () => ({ matchedFiles, summaryLines, issues, cleanSummary, rustDiff })
    } });
  const afterSha256 = await hashFile(item.path);
  const unchanged = beforeSha256 === afterSha256;
  const observed = result.category === 'completed' && result.cleanup.groupAbsent
    && !result.cleanup.unknownDescendants && !result.observations.outputPolicyFailed;
  const positive = observed && result.exitCode === 0 && unchanged
    && (isRust || matchedFiles === 1 && summaryLines === 1 && cleanSummary);
  const difference = observed && unchanged && result.exitCode !== 0 && (isRust ? rustDiff : issues === 1 && matchedFiles === 1);
  return { path: item.path, expectedSha256: item.sha256, beforeSha256, afterSha256, unchanged,
    checker: item.checker, status: positive ? 'PASS' : difference ? 'FAIL' : 'BLOCKED',
    classification: positive ? 'checked_clean' : difference ? 'format_difference' : 'unavailable_or_incomplete',
    command: { program, args, cwd: bossRoot }, checkerFiles: isRust ? [rustfmt] : [node24, pnpm, oxfmtLauncher, oxfmtCli, oxfmtNative, oxfmtConfig],
    diagnosticPaths: [...diagnosticPaths], process: result };
}
async function execute(options) {
  const context = await setup(options);
  await toolBindings();
  const files = [];
  for (const [index, item] of context.inventory.entries()) {
    const result = await checkFile(item, context, index);
    files.push(result);
    if (!result.unchanged || !result.process.cleanup.groupAbsent || result.process.cleanup.unknownDescendants) break;
  }
  await toolBindings();
  await verifyRef(context.configRef); await verifyRef(context.additionsRef); await verifyRef(context.sealRef);
  const allFilesPreserved = files.every(item => item.unchanged)
    && (await Promise.all(context.inventory.map(async item => await hashFile(item.path) === item.sha256))).every(Boolean);
  const status = files.some(item => item.status === 'FAIL') ? 'FAIL'
    : files.length === context.inventory.length && files.every(item => item.status === 'PASS') && allFilesPreserved ? 'PASS' : 'BLOCKED';
  const detailRef = await writeNew(context.receiptPath.replace(/\.json$/, '-detail.json'), {
    schemaVersion: 1, kind: 'scoped-formatting-detail', status,
    configRef: context.configRef, additionsRef: context.additionsRef, sealRef: context.sealRef,
    inventory: context.inventory, files, allFilesPreserved,
    limitations: ['Only literal selected files checked; no global formatter, fixes, dependency installation or broad Rust traversal.',
      'Stable installed rustfmt is a formatting checker only; it does not change the runtime compilation toolchain.',
      'Oxfmt launcher/CLI/native binding and configuration identities are retained; this is not a transitive dependency certification.']
  });
  const receiptRef = await writeReceipt(context.receiptPath, { schemaVersion: 1, kind: 'format',
    executionKey: context.config.executionKey, sourceSha256: context.sourceSha256,
    packageSha256: context.packageSha256, profileSha256: context.config.profile.sha256, status,
    executedCount: files.filter(item => item.process.category === 'completed').length,
    observations: { selectedFiles: context.inventory.length, observedFiles: files.length,
      checkedClean: files.filter(item => item.status === 'PASS').length,
      formattingDifferences: files.filter(item => item.status === 'FAIL').length,
      unavailableOrIncomplete: files.filter(item => item.status === 'BLOCKED').length,
      allFilesPreserved, noProductWritesRequested: true, literalScopeOnly: true } });
  console.log(JSON.stringify({ status, receipt: receiptRef, detail: detailRef }));
  process.exitCode = statusExit(status);
}
try { await execute(argumentsFor(process.argv.slice(2))); }
catch (error) { const safe = safeError(error); console.log(JSON.stringify({ status: 'BLOCKED', category: safe.category })); process.exitCode = 2; }
