import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const e = import.meta.dirname
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'))
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const sourcePath = path.join(e, 'final-source-manifest-15.json')
const current = read(sourcePath)
const before = read(path.join(e, 'final-source-manifest-13.json'))
if (!current.finalCandidate || current.outsideOwnedScope.length) throw new Error('Frozen candidate required')
const permitted = new Set(['scripts/gates/bauar-native-host-cases.ts', 'scripts/gates/bauar-secret-projection.ts', 'scripts/gates/bauar-secret-projection-provider.ts', 'scripts/gates/bauar-provider-negative-cases.ts'])
const differences = []
for (const record of current.records) {
  const prior = before.records.find(r => r.root === record.root)
  if (!prior || prior.head !== record.head) throw new Error('HEAD changed')
  for (const file of record.files) {
    if (hash(path.join(record.root, file.file)) !== file.sha256) throw new Error('Source changed after freeze')
    const old = prior.files.find(f => f.file === file.file)
    if (!old || old.sha256 !== file.sha256) {
      if (record.name !== 'boss' || !permitted.has(file.file)) throw new Error('Compiled product input changed')
      differences.push({ repository: record.name, file: file.file, beforeSha256: old?.sha256 ?? null, afterSha256: file.sha256 })
    }
  }
  if (prior.files.some(f => !record.files.some(x => x.file === f.file))) throw new Error('Source input removed')
}
const compilerPath = path.join(e, 'C-main-15.json')
const compiler = read(compilerPath)
if (compiler.exitCode !== 0 || !compiler.pinsUnchanged) throw new Error('Affected compiler failed')
const ordinary = read(path.join(e, 'final-artifact-manifest-13.json'))
const instrumented = read(path.join(e, 'final-instrumented-artifact-manifest-12.json'))
for (const artifact of [ordinary.sidecar, ordinary.storageFixture]) if (hash(artifact.staged) !== artifact.sha256) throw new Error('Ordinary artifact changed')
if (hash(ordinary.bossBundle.path) !== ordinary.bossBundle.sha256) throw new Error('Boss bundle changed')
if (hash(instrumented.manifest.artifactPath) !== instrumented.manifest.artifactSha256) throw new Error('Instrumented artifact changed')
const rebinding = { schemaVersion: 1, time: new Date().toISOString(), source: { path: sourcePath, sha256: hash(sourcePath) }, differences, productSourcesUnchangedFrom13: true, affectedCompiler: { path: compilerPath, sha256: hash(compilerPath), completedAt: compiler.completedAt }, artifactReuse: 'Gate-only TS authoring. Actual compiled Boss src and all UAR sources unchanged from13. Ordinary emission was source12 with explicitly cfg-excluded correction13; instrumented emission was source13. No fresh whole-source15 binary build claimed.', priorNormalRebinding: path.join(e, 'source13-cfg-excluded-correction-rebinding.json') }
const rebindingPath = path.join(e, 'source15-negative-gate-rebinding.json')
fs.writeFileSync(rebindingPath, JSON.stringify(rebinding, null, 2) + '\n', { flag: 'wx' })
ordinary.priorSourceBinding = ordinary.sourceBinding
ordinary.sourceBinding = { ...ordinary.sourceBinding, path: sourcePath, sha256: hash(sourcePath), scopedRebinding: rebindingPath }
ordinary.gateSourceRebinding = rebinding
fs.writeFileSync(path.join(e, 'final-artifact-manifest-15.json'), JSON.stringify(ordinary, null, 2) + '\n', { flag: 'wx' })
fs.copyFileSync(path.join(e, 'final-artifact-manifest-15.json'), path.join(e, 'final-artifact-manifest.json'))
instrumented.emissionManifest = instrumented.manifest
instrumented.manifest = { ...instrumented.manifest, sourceManifestPath: sourcePath, sourceManifestSha256: hash(sourcePath) }
instrumented.gateSourceRebinding = rebinding
const gateManifest = path.join(path.dirname(instrumented.manifest.artifactPath), 'gate-artifact-manifest-15.json')
fs.writeFileSync(gateManifest, JSON.stringify(instrumented.manifest, null, 2) + '\n', { flag: 'wx' })
fs.writeFileSync(path.join(e, 'final-instrumented-artifact-manifest-15.json'), JSON.stringify(instrumented, null, 2) + '\n', { flag: 'wx' })
const index = read(path.join(e, 'command-receipt-index.json'))
index['C-main'] = compilerPath
fs.writeFileSync(path.join(e, 'command-receipt-index.json'), JSON.stringify(index, null, 2) + '\n')
const request = read(path.join(e, 'G2-12-request.json'))
request.env.THE_BOSS_UAR_POST_ACK_MANIFEST_PATH = gateManifest
fs.writeFileSync(path.join(e, 'G2-12-request.json'), JSON.stringify(request, null, 2) + '\n')
console.log(JSON.stringify({ source15: true, gateOnlyDifferences: differences.map(x => x.file), artifactBytesUnchanged: true, affectedCompilerPassed: true, freshBinaryBuildClaimed: false }))
