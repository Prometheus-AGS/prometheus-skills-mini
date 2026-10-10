import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const evidence = path.dirname(fileURLToPath(import.meta.url))
const root = '/Users/gqadonis/.claude/worktrees/bauar-release-uar'
const node = '/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node'
const expectedBuildReceipt = '938bcb3996a6dd9549beeb79e52f2831d507615cfd55f734099bb3af04c5b15f'
const expectedBinary = '9f91874091f8241d97209fd21b8c0c5b79ae6cdeb82ee0e873a5ea4540a8adea'
const receiptPath = path.join(evidence, 'uar-package.json')
const startedAt = new Date().toISOString()
const logPath = path.join(evidence, `uar-package-${startedAt.replaceAll(':', '-').replace('.', '-')}.log`)
const command = {
  program: node,
  args: ['scripts/package-boss-sidecar.mjs', 'darwin-arm64', 'aarch64-apple-darwin'],
  cwd: root,
  shell: false,
  environmentOverrides: { UAR_SIDECAR_FEATURES: 'server-full' },
  omittedEnvironmentNames: ['GITHUB_SHA', 'GITHUB_REF_TYPE', 'GITHUB_REF_NAME']
}

async function digest(filename) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filename)) hash.update(chunk)
  const info = await stat(filename)
  return { path: filename, sha256: hash.digest('hex'), bytes: info.size, mode: (info.mode & 0o777).toString(8) }
}

async function input(name) {
  const filename = path.join(evidence, name)
  return { identity: await digest(filename), value: JSON.parse(await readFile(filename, 'utf8')) }
}

function head() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, shell: false, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`Candidate HEAD read failed: exit ${result.status}; ${result.stderr.trim()}`)
  return result.stdout.trim()
}

const build = await input('uar-build.json')
const inputs = await input('build-inputs.json')
const intake = await input('source-intake.json')
const uarIntake = await input('intake/uar.json')
const contract = await digest(path.join(evidence, '../plan/command-contract.json'))
const receipt = {
  schemaVersion: 1,
  kind: 'bauar-local-uar-package',
  phase: 'phase-bauar-release-integration-2026-10-09',
  change: 'bauar-int-02-local-current-uar-payload',
  task: '4',
  status: 'preparing',
  startedAt,
  command,
  receipts: { build: build.identity, buildInputs: inputs.identity, sourceIntake: intake.identity, uarIntake: uarIntake.identity, commandContract: contract },
  tools: { node: { program: node, version: process.version, platform: process.platform, arch: process.arch } },
  source: { root, commit: head(), intakeCommit: uarIntake.value.candidateCommit, bossCommit: build.value.source.bossCommit },
  build: { exitCode: build.value.exitCode, completedAt: build.value.completedAt, profile: build.value.profile, target: build.value.target, features: build.value.features },
  boundaries: { packaging: 'pending', runtimeAcceptance: 'operator-deferred', tests: 'not run', review: 'operator-deferred', certification: 'operator-deferred', publication: 'not authorized', securityHardening: 'none', f6: 'excluded source paths not accessed directly', canonicalState: 'root owned; not mutated' },
  bootstrapLimitations: ['PATH openspec list failed because its configured mini-runner.cjs is missing; no launcher repair or tooling refresh attempted; canonical backend remains root owned.']
}

try {
  if (build.identity.sha256 !== expectedBuildReceipt || build.value.status !== 'built' || build.value.exitCode !== 0) throw new Error('Actual completed build receipt does not match task4 handoff')
  if (inputs.identity.sha256 !== build.value.inputs.sha256 || intake.identity.sha256 !== inputs.value.sourceIntake.sha256) throw new Error('Recorded build input/intake links changed')
  if (receipt.source.commit !== build.value.source.commit || receipt.source.commit !== uarIntake.value.candidateCommit) throw new Error('Candidate HEAD differs from completed build/intake identity')
  receipt.binaryBefore = await digest(build.value.output.path)
  if (receipt.binaryBefore.sha256 !== expectedBinary || receipt.binaryBefore.bytes !== build.value.output.bytes) throw new Error('Actual build binary differs from task4 handoff')
  receipt.authoritiesBefore = []
  for (const authority of build.value.authoritiesAfter) {
    const actual = await digest(authority.path)
    receipt.authoritiesBefore.push(actual)
    if (actual.sha256 !== authority.sha256) throw new Error(`Build authority changed: ${authority.path}`)
  }
  receipt.tools.node.identity = await digest(node)
  const childEnvironment = { ...process.env, UAR_SIDECAR_FEATURES: 'server-full' }
  for (const name of command.omittedEnvironmentNames) delete childEnvironment[name]
  const log = createWriteStream(logPath, { flags: 'wx' })
  log.write(`${JSON.stringify({ startedAt, command })}\n`)
  receipt.status = 'running'
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
  const child = spawn(node, command.args, { cwd: root, shell: false, env: childEnvironment, stdio: ['ignore', 'pipe', 'pipe'] })
  receipt.pid = child.pid
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk.toString(); log.write(chunk) })
  child.stderr.on('data', chunk => { stderr += chunk.toString(); log.write(chunk) })
  const outcome = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (exitCode, signal) => resolve({ exitCode, signal })) })
  Object.assign(receipt, outcome, { finishedAt: new Date().toISOString(), stdout, stderr })
  await new Promise(resolve => log.end(resolve))
  receipt.log = await digest(logPath)
  if (outcome.exitCode !== 0) throw new Error(`Existing packager failed: exit ${outcome.exitCode}; diagnostics retained in ${logPath}`)

  const output = path.join(root, 'dist/boss-sidecar')
  const packageRoot = path.join(output, 'uar-sidecar-darwin-arm64')
  const recordPath = path.join(output, 'uar-sidecar-darwin-arm64.json')
  const record = JSON.parse(await readFile(recordPath, 'utf8'))
  const manifestPath = path.join(packageRoot, 'payload-manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const archivePath = path.join(output, record.asset)
  receipt.output = { directory: output, packageRoot, archive: await digest(archivePath), record: await digest(recordPath), payloadManifest: await digest(manifestPath), recordContents: record, fileManifest: manifest }
  if (record.source !== receipt.source.commit || manifest.source !== receipt.source.commit || record.sha256 !== receipt.output.archive.sha256) throw new Error('Existing packager output source/archive digest disagrees with actual inputs')
  if (record.releaseTag || JSON.stringify(record.features) !== '["server-full"]' || JSON.stringify(manifest.features) !== '["server-full"]') throw new Error('Existing packager output is not the required local server-full payload')
  receipt.packagedFiles = []
  async function inventory(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name)
      if (entry.isDirectory()) await inventory(filename)
      else receipt.packagedFiles.push({ ...await digest(filename), relativePath: path.relative(packageRoot, filename).split(path.sep).join('/') })
    }
  }
  await inventory(packageRoot)
  receipt.packagedFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  receipt.packagedFilesDigest = createHash('sha256').update(JSON.stringify(receipt.packagedFiles)).digest('hex')
  const archivedHash = createHash('sha256')
  const tarArgs = ['-xOzf', archivePath, 'uar-sidecar-darwin-arm64/uar-sidecar']
  const tar = spawn('tar', tarArgs, { cwd: root, shell: false, stdio: ['ignore', 'pipe', 'pipe'] })
  let archivedBytes = 0
  let tarStderr = ''
  tar.stdout.on('data', chunk => { archivedBytes += chunk.length; archivedHash.update(chunk) })
  tar.stderr.on('data', chunk => { tarStderr += chunk.toString() })
  const tarExit = await new Promise((resolve, reject) => { tar.once('error', reject); tar.once('close', exitCode => resolve(exitCode)) })
  receipt.archivedBinary = { program: 'tar', args: tarArgs, cwd: root, shell: false, exitCode: tarExit, stderr: tarStderr, archiveEntry: 'uar-sidecar-darwin-arm64/uar-sidecar', bytes: archivedBytes, sha256: archivedHash.digest('hex') }
  if (tarExit !== 0 || receipt.archivedBinary.sha256 !== expectedBinary || archivedBytes !== receipt.binaryBefore.bytes) throw new Error('Actual archived binary differs from completed build')
  receipt.archivedBinary.matchesBuild = true
  receipt.binaryAfter = await digest(build.value.output.path)
  receipt.source.commitAfter = head()
  receipt.authoritiesAfter = []
  for (const authority of receipt.authoritiesBefore) receipt.authoritiesAfter.push(await digest(authority.path))
  receipt.authoritiesPreserved = receipt.authoritiesBefore.every((before, i) => before.sha256 === receipt.authoritiesAfter[i].sha256)
  if (!receipt.authoritiesPreserved || receipt.binaryAfter.sha256 !== expectedBinary || receipt.source.commitAfter !== receipt.source.commit) throw new Error('Build source/authority/binary identity changed during packaging')
  receipt.status = 'packaged'
  receipt.boundaries.packaging = 'packaged'
  receipt.ownership = 'released; candidate dist/boss-sidecar available for task5 handoff; target only read'
} catch (error) {
  receipt.status = 'failed'
  receipt.boundaries.packaging = 'failed'
  receipt.failure = String(error.message)
  receipt.ownership = 'released after bounded failure; no source repair or validator bypass attempted'
  process.exitCode = 1
}
receipt.runner = await digest(fileURLToPath(import.meta.url))
receipt.completedAt = new Date().toISOString()
receipt.selfCheck = { sourceEdited: false, targetWritten: false, testsOrBuildsRun: false, canonicalStateMutated: false, unrequestedProductCodeAdded: false, securityHardeningAdded: false, scope: 'Existing packager outputs and owned phase package receipt/log/helper only' }
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify({ status: receipt.status, exitCode: receipt.exitCode, failure: receipt.failure, archive: receipt.output?.archive, archivedBinary: receipt.archivedBinary, receipt: await digest(receiptPath), log: receipt.log, ownership: receipt.ownership }, null, 2))
