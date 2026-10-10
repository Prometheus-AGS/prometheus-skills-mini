import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const e = import.meta.dirname
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const read = file => JSON.parse(fs.readFileSync(path.join(e, file), 'utf8'))
const prior = read('final-instrumented-artifact-manifest-15.json')
const oldRoot = path.dirname(prior.manifest.artifactPath)
if (fs.existsSync(path.join(oldRoot, 'payload-manifest.json'))) throw new Error('Observed missing-manifest condition changed')
const compiler = read('C-main-17.json')
if (compiler.exitCode !== 0 || !compiler.pinsUnchanged) throw new Error('Affected compiler required')
const sourcePath = path.join(e, 'final-source-manifest-17.json')
const source = read(path.basename(sourcePath))
if (!source.finalCandidate || source.outsideOwnedScope.length) throw new Error('Owned final candidate required')
for (const r of source.records) for (const f of r.files) if (hash(path.join(r.root, f.file)) !== f.sha256) throw new Error('Source changed after freeze')
const output = path.join(e, 'development-uar-gate-payload-13')
if (fs.existsSync(output)) throw new Error('Preserve previous corrected output')
fs.mkdirSync(output)
for (const f of prior.files) {
  const from = path.join(oldRoot, f.path), to = path.join(output, f.path)
  if (hash(from) !== f.sha256) throw new Error('Prior payload changed')
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL)
  if (hash(to) !== f.sha256) throw new Error('Payload copy differs')
}
const ordinaryPayload = read('development-uar-payload-12/payload-manifest.json')
const payload = { ...ordinaryPayload, features: prior.manifest.features, files: prior.files,
  instrumented: true, releaseCertified: false,
  acceptanceScope: 'private instrumented postack calibration and cancellation only; not normal production or packaged release' }
const payloadPath = path.join(output, 'payload-manifest.json')
fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2) + '\n', { flag: 'wx' })
const manifest = { ...prior.manifest, artifactPath: path.join(output, 'uar-sidecar'),
  sourceManifestPath: sourcePath, sourceManifestSha256: hash(sourcePath) }
if (hash(manifest.artifactPath) !== prior.manifest.artifactSha256) throw new Error('Instrumented binary changed')
const corrected = { ...prior, manifest,
  files: [...prior.files, { path: 'payload-manifest.json', size: fs.statSync(payloadPath).size, sha256: hash(payloadPath) }],
  payloadCorrection: { time: new Date().toISOString(), source: 'Boss uarPayload.ts readManifest/payloadAt/requireUarPayload',
    observed: 'Prior instrumented staging omitted adjacent application payload-manifest.json; ordinary payload has one.',
    previousPath: oldRoot, correctedPath: output, productCodeChanged: false, binaryBytesUnchanged: true,
    priorRuntimeErrorExactMessage: 'not retained; historical failure consistent with required manifest absence, not separately classified' } }
fs.writeFileSync(path.join(e, 'instrumented-payload-correction-01.json'), JSON.stringify(corrected, null, 2) + '\n', { flag: 'wx' })
fs.writeFileSync(path.join(output, 'development-provenance.json'), JSON.stringify(corrected, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ output, applicationPayloadManifestAdded: true, binaryBytesUnchanged: true,
  source17: true, productCodeChanged: false, resources: corrected.files.length }))
