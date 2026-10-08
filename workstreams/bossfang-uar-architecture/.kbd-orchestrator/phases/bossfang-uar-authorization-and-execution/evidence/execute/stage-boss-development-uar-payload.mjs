import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Private current-source development payload; never an archive or release input.
const evidence = path.dirname(fileURLToPath(import.meta.url))
const root = '/Users/gqadonis/.claude/worktrees/bauar-uar'
const output = path.join(evidence, 'development-uar-payload')
const receiptFile = path.join(evidence, 'final-gates/boss-uar-sidecar-profile-build-01.json')
const compilerManifest = path.join(evidence, 'boss-uar-sidecar-profile-build-01-manifest.json')
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const hash = (filename) => digest(fs.readFileSync(filename))
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'))
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' })
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('Expected darwin-arm64')
if (process.argv.length !== 2) throw new Error('This helper takes no arguments')
if (fs.existsSync(output)) throw new Error('Development payload already exists; preserve it and choose a new receipt')
const receipt = readJson(receiptFile)
const expectedArgs = ['build', '--offline', '--locked', '-p', 'universal-agent-runtime', '--no-default-features',
  '--features', 'server-full', '--bin', 'uar-sidecar', '--message-format=json']
if (receipt.exitCode !== 0 || receipt.cwd !== root || JSON.stringify(receipt.args) !== JSON.stringify(expectedArgs)) {
  throw new Error('Sidecar build receipt does not identify the approved production-feature debug build')
}
const artifacts = readJson(compilerManifest).artifacts
const artifact = artifacts.filter((entry) => entry.target === 'uar-sidecar')
if (artifact.length !== 1) throw new Error('Expected exactly one emitted sidecar executable')
const built = artifact[0]
if (!Array.isArray(built.features) || !built.features.includes('server-full') || built.features.includes('test-probes')) {
  throw new Error('Sidecar features do not match the approved profile')
}
if (path.basename(built.executable) !== 'uar-sidecar' || !/^[a-f0-9]{64}$/.test(built.sha256 ?? '') ||
    hash(built.executable) !== built.sha256) throw new Error('Emitted sidecar checksum does not match compiler manifest')
const dynamicLibraries = execFileSync('/usr/bin/otool', ['-L', built.executable], { encoding: 'utf8' })
  .split('\n').slice(1).map((line) => line.trim().split(' (')[0]).filter(Boolean)
if (dynamicLibraries.some((library) => !library.startsWith('/usr/lib/') && !library.startsWith('/System/Library/'))) {
  throw new Error('Sidecar has non-system runtime libraries; extend the explicit payload inventory before staging')
}
const version = fs.readFileSync(path.join(root, 'Cargo.toml'), 'utf8')
  .match(/\[package\][\s\S]*?\nversion\s*=\s*"([^"]+)"/)?.[1]
if (!version) throw new Error('UAR package version is missing')
const sourceHead = git('rev-parse', 'HEAD').trim()
const sourceDiffSha256 = digest(git('diff', '--binary', 'HEAD', '--', 'Cargo.toml', 'Cargo.lock', 'src', 'policies'))
const inputs = [{ path: 'uar-sidecar', source: built.executable }]
function modelFiles(directory, relative = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = relative ? relative + '/' + entry.name : entry.name
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) modelFiles(filename, name)
    else if (entry.isFile()) inputs.push({ path: 'uar-models/' + name, source: filename })
    else throw new Error('Model resources must be regular files')
  }
}
modelFiles(path.join(root, 'src/uar/runtime/matching/models'))
for (const name of ['default.cedar', 'skill-mutation.cedar', 'tool-approval.cedar']) {
  inputs.push({ path: 'policies/' + name, source: path.join(root, 'policies', name) })
}
inputs.push({ path: 'LICENSE', source: path.join(root, 'LICENSE') })
const files = inputs.map((entry) => ({ path: entry.path, size: fs.statSync(entry.source).size, sha256: hash(entry.source) }))
  .sort((left, right) => left.path.localeCompare(right.path))
const manifest = {
  schema: 1, name: 'uar-sidecar', version, platform: 'darwin-arm64', source: sourceHead,
  features: built.features, developmentOnly: true,
  acceptanceScope: 'private-current-source-development-gates; excluded from packaged and release acceptance', files
}
const provenance = {
  schemaVersion: 1, developmentOnly: true, releaseCertified: false, buildProfile: 'debug',
  buildReceipt: { path: receiptFile, sha256: hash(receiptFile) },
  compilerManifest: { path: compilerManifest, sha256: hash(compilerManifest) },
  emittedExecutable: { path: built.executable, sha256: built.sha256 },
  sourceHead, sourceDiffSha256,
  sourceIdentityNote: 'HEAD plus dirty diff is provenance only; emitted executable is bound by successful compiler receipt and checksum',
  features: built.features, systemLibraries: dynamicLibraries, files
}
fs.mkdirSync(output)
for (const entry of inputs) {
  const destination = path.join(output, entry.path)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(entry.source, destination, fs.constants.COPYFILE_EXCL)
  if (hash(destination) !== files.find((file) => file.path === entry.path).sha256) {
    throw new Error('Payload input changed during staging; preserve failed directory for inspection')
  }
}
fs.writeFileSync(path.join(output, 'development-provenance.json'), JSON.stringify(provenance, null, 2) + '\n', { flag: 'wx' })
fs.writeFileSync(path.join(output, 'payload-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' })
process.stdout.write(JSON.stringify({ executable: path.join(output, 'uar-sidecar'), developmentOnly: true,
  manifestSha256: hash(path.join(output, 'payload-manifest.json')), files: files.length }) + '\n')
