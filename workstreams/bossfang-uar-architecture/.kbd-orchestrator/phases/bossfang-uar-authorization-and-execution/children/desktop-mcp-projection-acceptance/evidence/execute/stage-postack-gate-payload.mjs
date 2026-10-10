import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const e = import.meta.dirname
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'))
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const sourcePath = path.join(e, 'final-source-manifest-13.json')
const source = read(sourcePath)
if (!source.finalCandidate || source.outsideOwnedScope.length) throw new Error('Frozen candidate required')
for (const record of source.records) {
  if (execFileSync('git', ['-C', record.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== record.head) throw new Error('Source HEAD changed')
  for (const file of record.files) if (hash(path.join(record.root, file.file)) !== file.sha256) throw new Error('Frozen source changed')
}
const ordinary = read(path.join(e, 'final-artifact-manifest-13.json'))
if (ordinary.sidecar.features.includes('bauar-native-admission-gate')) throw new Error('Ordinary artifact instrumented')
if (hash(ordinary.sidecar.staged) !== ordinary.sidecar.sha256) throw new Error('Ordinary artifact changed')
const receiptPath = path.join(e, 'B-sidecar-gate-02.json')
const receipt = read(receiptPath)
if (receipt.exitCode !== 0 || !receipt.pinsUnchanged) throw new Error('Instrumented build failed')
const emitted = receipt.artifacts.filter(a => a.target === 'uar-sidecar')
if (emitted.length !== 1) throw new Error('One emitted instrumented artifact required')
const artifact = emitted[0]
const expected = [...ordinary.sidecar.features, 'bauar-native-admission-gate'].sort()
if (JSON.stringify([...artifact.features].sort()) !== JSON.stringify(expected)) throw new Error('Instrumented feature set mismatch')
const libraries = execFileSync('/usr/bin/otool', ['-L', artifact.executable], { encoding: 'utf8' }).split('\n').slice(1).map(x => x.trim().split(' (')[0]).filter(Boolean)
if (libraries.some(x => !x.startsWith('/usr/lib/') && !x.startsWith('/System/Library/'))) throw new Error('Unexpected runtime library')
const output = path.join(e, 'development-uar-gate-payload-12')
if (fs.existsSync(output)) throw new Error('Preserve prior payload')
fs.mkdirSync(output)
const files = []
for (const resource of ordinary.resources) {
  const from = resource.path === 'uar-sidecar' ? artifact.executable : path.join(path.dirname(ordinary.sidecar.staged), resource.path)
  if (resource.path !== 'uar-sidecar' && hash(from) !== resource.sha256) throw new Error('Resource changed')
  const to = path.join(output, resource.path)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL)
  if (hash(to) !== hash(from)) throw new Error('Copy mismatch')
  files.push({ path: resource.path, size: fs.statSync(to).size, sha256: hash(to) })
}
const manifest = { schemaVersion: 1, artifactPath: path.join(output, 'uar-sidecar'), artifactSha256: hash(artifact.executable), sourceManifestPath: sourcePath, sourceManifestSha256: hash(sourcePath), features: artifact.features }
fs.writeFileSync(path.join(output, 'gate-artifact-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' })
const provenance = { schemaVersion: 1, developmentOnly: true, instrumented: true, releaseCertified: false, manifest, emitted: artifact.executable, buildReceipt: { path: receiptPath, sha256: hash(receiptPath) }, libraries, files, ordinaryArtifactPreserved: { path: ordinary.sidecar.staged, sha256: hash(ordinary.sidecar.staged) } }
fs.writeFileSync(path.join(output, 'development-provenance.json'), JSON.stringify(provenance, null, 2) + '\n', { flag: 'wx' })
fs.writeFileSync(path.join(e, 'final-instrumented-artifact-manifest-12.json'), JSON.stringify(provenance, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ output, artifactSha256: manifest.artifactSha256, features: manifest.features, resources: files.length, ordinaryArtifactPreserved: true }))
