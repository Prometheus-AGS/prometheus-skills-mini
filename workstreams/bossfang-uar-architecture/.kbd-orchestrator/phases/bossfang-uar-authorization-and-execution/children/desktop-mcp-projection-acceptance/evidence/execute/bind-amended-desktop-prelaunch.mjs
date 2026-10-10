import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
const e = import.meta.dirname
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'))
const sourcePath = path.join(e, 'final-source-manifest-15.json')
const source = read(sourcePath)
if (!source.finalCandidate || source.outsideOwnedScope.length) throw new Error('Final source scope mismatch')
let count = 0
for (const record of source.records) {
  if (execFileSync('git', ['-C', record.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== record.head) throw new Error('HEAD mismatch')
  for (const file of record.files) {
    if (hash(path.join(record.root, file.file)) !== file.sha256) throw new Error('Source changed')
    count++
  }
}
const normalPath = path.join(e, 'final-artifact-manifest-15.json')
const normal = read(normalPath)
if (normal.sourceBinding.sha256 !== hash(sourcePath)) throw new Error('Ordinary source binding mismatch')
for (const a of [normal.sidecar, normal.storageFixture]) if (hash(a.staged) !== a.sha256) throw new Error('Staged artifact mismatch')
if (hash(normal.bossBundle.path) !== normal.bossBundle.sha256) throw new Error('Boss bundle mismatch')
for (const r of normal.resources) if (hash(path.join(path.dirname(normal.sidecar.staged), r.path)) !== r.sha256) throw new Error('Ordinary resource mismatch')
const instrumentedPath = path.join(e, 'final-instrumented-artifact-manifest-15.json')
const instrumented = read(instrumentedPath)
const gate = instrumented.manifest
if (gate.sourceManifestPath !== sourcePath || gate.sourceManifestSha256 !== hash(sourcePath)) throw new Error('Gate source binding mismatch')
if (hash(gate.artifactPath) !== gate.artifactSha256) throw new Error('Gate artifact mismatch')
if (JSON.stringify([...gate.features].sort()) !== JSON.stringify([...normal.sidecar.features, 'bauar-native-admission-gate'].sort())) throw new Error('Feature mismatch')
for (const r of instrumented.files) if (hash(path.join(path.dirname(gate.artifactPath), r.path)) !== r.sha256) throw new Error('Instrumented resource mismatch')
const index = read(path.join(e, 'command-receipt-index.json'))
const commands = Object.entries(index).map(([id, file]) => {
  const receipt = read(file)
  if (receipt.exitCode !== 0 || !receipt.pinsUnchanged) throw new Error('Compiler/build prerequisite failed')
  return { id, path: file, sha256: hash(file), completedAt: receipt.completedAt, exitCode: receipt.exitCode }
})
const gateReceiptPath = path.join(e, 'B-sidecar-gate-02.json')
const gateReceipt = read(gateReceiptPath)
if (gateReceipt.exitCode !== 0 || !gateReceipt.pinsUnchanged) throw new Error('Instrumented compiler/build failed')
const hostBindingPath = path.join(e, 'G1-02-bound-receipt.json')
const hostBinding = read(hostBindingPath)
if (hostBinding.exitCode !== 0 || !hostBinding.pinsUnchanged || !hostBinding.nativeCasesAllPassed || !hostBinding.changedOwnerPassed) throw new Error('Changed host gate failed')
if (hostBinding.sourceManifest.path !== sourcePath || hostBinding.sourceManifest.sha256 !== hash(sourcePath)) throw new Error('Host gate source mismatch')
const result = { schemaVersion: 1, time: new Date().toISOString(), source: { path: sourcePath, sha256: hash(sourcePath), checkedFiles: count }, ordinaryArtifacts: { path: normalPath, sha256: hash(normalPath) }, instrumentedArtifacts: { path: instrumentedPath, sha256: hash(instrumentedPath) }, commands, instrumentedBuild: { path: gateReceiptPath, sha256: hash(gateReceiptPath), completedAt: gateReceipt.completedAt }, allPrerequisitesCompleted: true, G1: { path: hostBindingPath, sha256: hash(hostBindingPath), completedAt: hostBinding.completedAt, retainedOriginalReceipt: 'G1-01-bound-receipt.json', limitation: 'Fresh actual host HTTP/MCP probe includes changed-owner refusal. Synthetic native caller remains distinct from genuine G2 execution.' }, acceptance: false }
fs.writeFileSync(path.join(e, 'G2-12-prelaunch-binding.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ checkedFiles: count, allPrerequisitesCompleted: true, freshHostGatePassed: true, acceptance: false }))
