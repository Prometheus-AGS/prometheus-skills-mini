import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'

const root = '/Users/gqadonis/.claude/worktrees/bauar-boss'
const node = '/Users/gqadonis/.local/share/fnm/node-versions/v24.14.1/installation/bin/node'
const launcher = '/usr/local/lib/node_modules/corepack/dist/pnpm.js'
if (process.versions.node !== '24.14.1') throw new Error('Pinned Boss Node required')
const args = [launcher, 'install', '--frozen-lockfile', '--ignore-scripts', '--reporter', 'ndjson']
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')
const before = { package: hash('package.json'), lock: hash('pnpm-lock.yaml') }
const eventNameCounts = {}
const errorCodes = new Set()
const nonJsonLineHashes = []
let pending = '', outputLines = 0
function parse(text) {
  pending += text
  let index
  while ((index = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, index)
    pending = pending.slice(index + 1)
    outputLines++
    for (const code of line.match(/\bERR_[A-Z0-9_]{1,80}\b/g) ?? []) errorCodes.add(code)
    try {
      const value = JSON.parse(line)
      const name = typeof value.name === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(value.name) ? value.name : 'other-json'
      eventNameCounts[name] = (eventNameCounts[name] ?? 0) + 1
    } catch {
      nonJsonLineHashes.push(crypto.createHash('sha256').update(line).digest('hex'))
    }
  }
}
const startedAt = new Date().toISOString()
const child = spawn(node, args, {
  cwd: root, env: { ...process.env, PATH: path.dirname(node) + path.delimiter + process.env.PATH },
  stdio: ['ignore', 'pipe', 'pipe']
})
console.log(JSON.stringify({ operation: 'locked-network-restore-after-missing-offline-tarball', pid: child.pid }))
child.stdout.on('data', (bytes) => parse(bytes.toString()))
child.stderr.on('data', (bytes) => parse(bytes.toString()))
child.on('error', (error) => errorCodes.add(error.code ?? 'SPAWN_FAILED'))
child.on('close', (exitCode, signal) => {
  if (pending) parse('\n')
  const after = { package: hash('package.json'), lock: hash('pnpm-lock.yaml') }
  const pinsUnchanged = JSON.stringify(before) === JSON.stringify(after)
  const receipt = { schemaVersion: 1, startedAt, completedAt: new Date().toISOString(), cwd: root,
    executable: node, args, exitCode, signal, pinsUnchanged, before, after,
    errorCodes: [...errorCodes], eventNameCounts, nonJsonLineHashes, outputLines,
    scriptsExecuted: false, acceptance: false }
  fs.writeFileSync(path.join(import.meta.dirname, 'dependency-restore-network.json'), JSON.stringify(receipt, null, 2) + '\n')
  console.log(JSON.stringify({ exitCode, pinsUnchanged, errorCodes: receipt.errorCodes, eventNameCounts }))
  process.exitCode = pinsUnchanged ? exitCode ?? 1 : 1
})
