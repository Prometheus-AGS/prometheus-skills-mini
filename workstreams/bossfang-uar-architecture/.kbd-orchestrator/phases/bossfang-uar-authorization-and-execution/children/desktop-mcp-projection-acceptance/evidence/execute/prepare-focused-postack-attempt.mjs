import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const e = import.meta.dirname
const [candidate, attempt, correctedPayload] = process.argv.slice(2)
if (!/^\d{2}$/.test(candidate) || !/^\d{2}$/.test(attempt)) throw new Error('Explicit numeric identities required')
const read = name => JSON.parse(fs.readFileSync(path.join(e, name), 'utf8'))
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const write = (name, value) => fs.writeFileSync(path.join(e, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })
const sourcePath = path.join(e, `final-source-manifest-${candidate}.json`)
const source = read(path.basename(sourcePath))
const prior = read('final-source-manifest-15.json')
if (!source.finalCandidate || source.outsideOwnedScope.length) throw new Error('Frozen owned candidate required')
const allowed = new Set(['scripts/gates/bauar-post-ack-cases.ts', 'scripts/gates/bauar-post-ack-gate.ts'])
const differences = []
let count = 0
for (const record of source.records) {
  const previous = prior.records.find(r => r.root === record.root)
  if (!previous || previous.head !== record.head) throw new Error('Repository identity changed')
  const actualHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: record.root, encoding: 'utf8' }).trim()
  if (actualHead !== record.head) throw new Error('HEAD changed since freeze')
  for (const file of record.files) {
    if (hash(path.join(record.root, file.file)) !== file.sha256) throw new Error('Source changed since freeze')
    count++
    const old = previous.files.find(f => f.file === file.file)
    if (!old || old.sha256 !== file.sha256) {
      if (record.name !== 'boss' || !allowed.has(file.file)) throw new Error('Compiled product or previously passed case input changed')
      differences.push({ repository: record.name, file: file.file, beforeSha256: old?.sha256 ?? null, afterSha256: file.sha256 })
    }
  }
  if (previous.files.some(f => !record.files.some(x => x.file === f.file))) throw new Error('Input removed')
}
const compilerPath = path.join(e, `C-main-${candidate}.json`)
const compiler = read(path.basename(compilerPath))
if (compiler.exitCode !== 0 || !compiler.pinsUnchanged) throw new Error('Affected compiler has not passed')
const ordinary = read('final-artifact-manifest-15.json')
if (correctedPayload && correctedPayload !== 'instrumented-payload-correction-01.json') throw new Error('Explicit corrected payload required')
const gate = read(correctedPayload ?? 'final-instrumented-artifact-manifest-15.json')
for (const artifact of [ordinary.sidecar, ordinary.storageFixture]) if (hash(artifact.staged) !== artifact.sha256) throw new Error('Ordinary artifact changed')
if (hash(ordinary.bossBundle.path) !== ordinary.bossBundle.sha256) throw new Error('Boss bundle changed')
if (hash(gate.manifest.artifactPath) !== gate.manifest.artifactSha256) throw new Error('Instrumented artifact changed')
for (const file of gate.files) if (hash(path.join(path.dirname(gate.manifest.artifactPath), file.path)) !== file.sha256) throw new Error('Gate payload resource changed')
const rebinding = { schemaVersion: 1, time: new Date().toISOString(), source: { path: sourcePath, sha256: hash(sourcePath) }, differences,
  affectedCompiler: { path: compilerPath, sha256: hash(compilerPath), completedAt: compiler.completedAt },
  compiledProductInputsUnchangedFrom15: true, freshBinaryBuildClaimed: false,
  provenance: 'Ordinary binaries emitted at source12 with documented cfg-excluded correction13; instrumented binary emitted at source13. Source15 rebinding preserved. Only focused postack scenario files differ.',
  retainedPassingEvidence: ['G1-02-bound-receipt.json', 'G2-12-finite-failure.json', 'G2-12-source-binding.json'] }
const rebindName = `source${candidate}-focused-postack-rebinding.json`
write(rebindName, rebinding)
ordinary.priorSourceBinding = ordinary.sourceBinding
ordinary.sourceBinding = { ...ordinary.sourceBinding, path: sourcePath, sha256: hash(sourcePath), scopedRebinding: path.join(e, rebindName) }
ordinary.gateSourceRebinding = rebinding
write(`final-artifact-manifest-${candidate}.json`, ordinary)
fs.copyFileSync(path.join(e, `final-artifact-manifest-${candidate}.json`), path.join(e, 'final-artifact-manifest.json'))
gate.priorGateBinding = gate.manifest
gate.manifest = { ...gate.manifest, sourceManifestPath: sourcePath, sourceManifestSha256: hash(sourcePath) }
gate.gateSourceRebinding = rebinding
const gateManifest = path.join(path.dirname(gate.manifest.artifactPath), `gate-artifact-manifest-${candidate}.json`)
fs.writeFileSync(gateManifest, JSON.stringify(gate.manifest, null, 2) + '\n', { flag: 'wx' })
write(`final-instrumented-artifact-manifest-${candidate}.json`, gate)
const request = read('G2-12-request.json')
request.id = 'G2-postack'
request.argv[2] = 'scripts/gates/bauar-post-ack-gate.ts'
request.argv[3] = path.join(e, `G2-postack-${attempt}-finite-evidence.json`)
request.env.THE_BOSS_UAR_POST_ACK_SIDECAR_PATH = gate.manifest.artifactPath
request.env.THE_BOSS_UAR_POST_ACK_MANIFEST_PATH = gateManifest
request.when = 'Focused rerun of only two failed/unrun postack cases after actual passing compiler and source/artifact prebinding; prior passing cases retained at source15'
request.receipt = path.join(e, `G2-postack-${attempt}-command-receipt.json`)
write(`G2-postack-${attempt}-request.json`, request)
write(`G2-postack-${attempt}-prelaunch-binding.json`, { ...rebinding, sourceMatches: count, artifactsVerified: true,
  gateArtifactManifest: { path: gateManifest, sha256: hash(gateManifest) }, request: path.join(e, `G2-postack-${attempt}-request.json`), status: 'passed' })
const index = read('command-receipt-index.json')
index['C-main'] = compilerPath
fs.writeFileSync(path.join(e, 'command-receipt-index.json'), JSON.stringify(index, null, 2) + '\n')
console.log(JSON.stringify({ candidate, attempt, sourceMatches: count, differences: differences.map(x => x.file), artifactsUnchanged: true, freshBinaryBuildClaimed: false, prelaunchBinding: 'passed' }))
