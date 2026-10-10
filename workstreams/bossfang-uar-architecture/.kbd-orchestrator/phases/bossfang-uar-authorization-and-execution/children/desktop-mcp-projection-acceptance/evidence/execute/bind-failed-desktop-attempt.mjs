import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const e=import.meta.dirname
const [attempt]=process.argv.slice(2)
if(!/^\d{2}$/.test(attempt))throw new Error('fixed attempt required')
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const read=f=>JSON.parse(fs.readFileSync(path.join(e,f),'utf8'))
const source=path.join(e,'final-source-manifest-'+attempt+'.json')
const v=read(path.basename(source))
let count=0
const mismatches=[]
for(const r of v.records)for(const f of r.files){const full=path.join(r.root,f.file);if(hash(full)!==f.sha256)mismatches.push({repository:r.name,file:f.file,mtime:fs.statSync(full).mtime.toISOString()});else count++}
const a=read('final-artifact-manifest-'+attempt+'.json')
for(const x of [a.sidecar,a.storageFixture])if(hash(x.staged)!==x.sha256)throw new Error('artifact changed')
if(hash(a.bossBundle.path)!==a.bossBundle.sha256)throw new Error('bundle changed')
const command=read('G2-'+attempt+'-command-receipt.json')
const finite=path.join(e,'G2-'+attempt+'-finite-failure.json')
const f=read(path.basename(finite))
f.commandCompletion='completed'
f.commandExitCode=command.exitCode
fs.writeFileSync(finite,JSON.stringify(f,null,2)+'\n')
const binding={time:new Date().toISOString(),source:{path:source,sha256:hash(source)},sourceVerifiedBeforeLaunch:true,gateCompletedAt:command.completedAt,postGateSourceMatches:count,postGateMismatches:mismatches,postGateVerificationLimitation:mismatches.length?'Owner correction dispatched after actual failure; current source differs, never relabel frozen attempt as current-source acceptance.':'No source mismatch observed at this hash boundary',artifactManifest:{path:path.join(e,'final-artifact-manifest-'+attempt+'.json'),sha256:hash(path.join(e,'final-artifact-manifest-'+attempt+'.json'))},artifactsUnchanged:true,exitCode:command.exitCode,finiteEvidence:{path:finite,sha256:hash(finite)},acceptance:false}
fs.writeFileSync(path.join(e,'G2-'+attempt+'-source-binding.json'),JSON.stringify(binding,null,2)+'\n')
console.log(JSON.stringify({attempt,exitCode:command.exitCode,sourceVerifiedBeforeLaunch:true,postGateSourceMatches:count,mismatches,artifactsUnchanged:true,acceptance:false}))

