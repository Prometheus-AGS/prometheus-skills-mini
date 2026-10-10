import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
const root = '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini'
const node = '/opt/homebrew/opt/node@24/bin/node'
const npm = '/opt/homebrew/opt/node@24/lib/node_modules/npm/bin/npm-cli.js'
const e = import.meta.dirname
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const pins = ['package.json', 'package-lock.json', 'versions.toml'].filter(p => fs.existsSync(path.join(root, p)))
const before = pins.map(file => ({ file, sha256: hash(path.join(root, file)) }))
const [mode = 'initial', attempt = '01'] = process.argv.slice(2)
if (!['initial', 'restore', 'remaining', 'spec'].includes(mode) || !/^\d{2}$/.test(attempt)) throw new Error('Fixed completion constraint mode required')
const commands = mode === 'restore' ? [['locked-prerequisites', ['ci', '--ignore-scripts', '--no-audit', '--no-fund']]]
  : mode === 'spec' ? [['specs-valid', ['run', 'spec:validate']]]
  : mode === 'remaining' ? [['tests-pass', ['test']], ['specs-valid', ['run', 'spec:validate']]]
  : [['build-passes', ['run', 'check']], ['tests-pass', ['test']], ['specs-valid', ['run', 'spec:validate']]]
for (const [id, args] of commands) {
  const startedAt = new Date().toISOString()
  const privateLog = path.join(e, 'mini-' + id + '-' + attempt + '.private.log')
  const log = fs.createWriteStream(privateLog, { flags: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ id, startedAt, status: 'running', scope: 'Existing mini completion constraint; not product integration evidence' }))
  const result = await new Promise(resolve => {
    const child = spawn(node, [npm, ...args], { cwd: root, env: { ...process.env, PATH: path.dirname(node) + path.delimiter + process.env.PATH }, shell: false, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout.on('data', x => log.write(x))
    child.stderr.on('data', x => log.write(x))
    child.on('error', error => resolve({ exitCode: 1, signal: null, spawnCode: error.code ?? 'SPAWN_FAILED' }))
    child.on('close', (exitCode, signal) => resolve({ exitCode, signal }))
  })
  await new Promise(resolve => log.end(resolve))
  const after = pins.map(file => ({ file, sha256: hash(path.join(root, file)) }))
  const receipt = { schemaVersion: 1, id, cwd: root, executable: node, argv: [npm, ...args], startedAt, completedAt: new Date().toISOString(), ...result, pinsBefore: before, pinsAfter: after, pinsUnchanged: JSON.stringify(before) === JSON.stringify(after), rawLog: privateLog, rawLogPolicy: 'Local-only; never stage or print', productAcceptance: false }
  fs.writeFileSync(path.join(e, 'mini-' + id + '-' + attempt + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ id, exitCode: receipt.exitCode, pinsUnchanged: receipt.pinsUnchanged, productAcceptance: false }))
  if (receipt.exitCode !== 0 || !receipt.pinsUnchanged) { process.exitCode = 1; break }
}
