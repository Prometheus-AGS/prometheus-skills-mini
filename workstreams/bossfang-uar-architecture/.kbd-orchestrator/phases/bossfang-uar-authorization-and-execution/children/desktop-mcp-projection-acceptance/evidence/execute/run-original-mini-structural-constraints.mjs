import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
const root = '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini'
const phaseRoot = path.join(root, 'workstreams/bossfang-uar-architecture')
const require = createRequire(path.join(root, 'package.json'))
const YAML = require('yaml')
const text = fs.readFileSync(path.join(phaseRoot, '.kbd-orchestrator/constraints.md'), 'utf8')
const block = text.match(/## Blocking constraints[\s\S]*?```yaml\n([\s\S]*?)\n```/)?.[1]
if (!block) throw new Error('Original constraint block missing')
const constraints = YAML.parse(block).constraints
const results = []
for (const constraint of constraints.filter(c => c.check)) {
  const args = [...constraint.check.matchAll(/"([^"]*)"|([^\s"]+)/g)].map(m => m[1] ?? m[2])
  if (args.shift() !== 'git' || args[0] !== 'grep' || !args.includes('--no-index') || !args.includes('--exclude-standard')) throw new Error('Unexpected original checker')
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false, maxBuffer: 16 * 1024 * 1024 })
  fs.writeFileSync(path.join(import.meta.dirname, 'mini-structural-' + constraint.id + '-01.private.log'), result.stdout + '\n' + result.stderr, { flag: 'wx', mode: 0o600 })
  const lines = result.stdout.split('\n').filter(Boolean)
  const locations = [...new Set(lines.map(line => line.split(':')[0]))]
  results.push({ id: constraint.id, originalCommand: constraint.check, actualExecutable: 'git', argv: args, exitCode: result.status, status: result.status === 1 ? 'passed' : result.status === 0 ? 'failed' : 'blocked', matchCount: lines.length, locations, subject: 'Full isolated mini repository; unchanged baseline violations are not child-created defects', scopeNotWaived: true })
}
const receipt = { schemaVersion: 1, time: new Date().toISOString(), subject: root, results, sourceRulesUnchanged: true, productAcceptance: false }
fs.writeFileSync(path.join(import.meta.dirname, 'mini-original-structural-constraints-01.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify(results.map(r => ({ id: r.id, exitCode: r.exitCode, status: r.status, matchCount: r.matchCount, locations: r.locations.slice(0,8) }))))
process.exitCode = results.every(r => r.status === 'passed') ? 0 : 1
