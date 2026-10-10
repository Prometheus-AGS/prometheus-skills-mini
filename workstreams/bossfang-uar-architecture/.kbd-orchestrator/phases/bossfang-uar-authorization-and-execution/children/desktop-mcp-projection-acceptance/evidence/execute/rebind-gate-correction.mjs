import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const e=import.meta.dirname
const [attempt,prior,compiler]=process.argv.slice(2)
if(!/^\d{2}$/.test(attempt)||!/^\d{2}$/.test(prior)||!/^C-main-\d{2}\.json$/.test(compiler))throw new Error('fixed attempt identifiers required')
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const read=n=>JSON.parse(fs.readFileSync(path.join(e,n),'utf8'))
const current=read('final-source-manifest.json'),previous=read('final-source-manifest-'+prior+'.json')
const allowed=new Set(['scripts/gates/bauar-secret-projection.ts','scripts/gates/bauar-secret-projection-mcp.ts','scripts/gates/bauar-secret-projection-provider.ts','scripts/gates/bauar-secret-projection-mcp-diagnostic.ts','scripts/gates/bauar-secret-projection-turn.ts','scripts/gates/bauar-secret-projection-events.ts','scripts/gates/bauar-secret-projection-revision.ts'])
const changes=[]
for(const r of current.records){const old=previous.records.find(x=>x.root===r.root);if(!old||old.head!==r.head)throw new Error('root/HEAD changed');for(const f of r.files){const o=old.files.find(x=>x.file===f.file);if(!o||o.sha256!==f.sha256){if(r.name!=='boss'||!allowed.has(f.file))throw new Error('unexpected source change');changes.push({repository:r.name,file:f.file})}if(hash(path.join(r.root,f.file))!==f.sha256)throw new Error('source changed after capture')}}
if(!current.finalCandidate||current.outsideOwnedScope.length)throw new Error('candidate outside scope')
const artifact=read('final-artifact-manifest-'+prior+'.json')
for(const a of [artifact.sidecar,artifact.storageFixture])if(hash(a.staged)!==a.sha256)throw new Error('artifact changed')
if(hash(artifact.bossBundle.path)!==artifact.bossBundle.sha256)throw new Error('bundle changed')
const command=read(compiler);if(command.exitCode!==0||!command.pinsUnchanged)throw new Error('compiler not passed')
fs.copyFileSync(path.join(e,'final-source-manifest.json'),path.join(e,'final-source-manifest-'+attempt+'.json'))
artifact.time=new Date().toISOString();artifact.sourceBinding={...artifact.sourceBinding,path:path.join(e,'final-source-manifest-'+attempt+'.json'),sha256:hash(path.join(e,'final-source-manifest-'+attempt+'.json')),sourceHashesUnchanged:true}
artifact.commands=artifact.commands.map(c=>c.id==='C-main'?{id:c.id,path:path.join(e,compiler),sha256:hash(path.join(e,compiler)),exitCode:command.exitCode}:c)
artifact.correctionBinding={changes,productionAndBundleSourcesUnchanged:true,artifactsUnchanged:true,buildReuseReason:'Gate observer/finite diagnostic correction only; emitted production sources unchanged',G1NotRerun:'Host production and G1 gate sources unchanged'}
for(const n of ['final-artifact-manifest.json','final-artifact-manifest-'+attempt+'.json'])fs.writeFileSync(path.join(e,n),JSON.stringify(artifact,null,2)+'\n')
const index=read('command-receipt-index.json');index['C-main']=path.join(e,compiler);fs.writeFileSync(path.join(e,'command-receipt-index.json'),JSON.stringify(index,null,2)+'\n')
console.log(JSON.stringify({attempt,sourceFiles:current.records.reduce((n,r)=>n+r.files.length,0),changes,artifactsUnchanged:true,compilerPassed:true}))

