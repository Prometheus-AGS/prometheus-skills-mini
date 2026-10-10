import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
const e=import.meta.dirname,c=path.resolve(e,'../..')
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'))
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const config=read(path.join(c,'execution-manifest.json'))
const source=read(config.payload.sourceManifest)
if(!source.finalCandidate||source.outsideOwnedScope.length)throw new Error('Frozen candidate required')
for(const r of source.records){
 if(execFileSync('git',['-C',r.root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==r.head)throw new Error('Source HEAD changed')
 for(const f of r.files)if(hash(path.join(r.root,f.file))!==f.sha256)throw new Error('Frozen source input changed')
}
const commands=['C-main','C-e2e','C-rust-callers','B-main','B-sidecar']
const receiptIndex=read(path.join(e,'command-receipt-index.json'))
const receipts=commands.map(id=>{const file=receiptIndex[id],r=read(file);if(r.exitCode!==0||!r.pinsUnchanged)throw new Error('Required compiler/build failed: '+id);return{id,path:file,sha256:hash(file),...r}})
const build=receipts.find(r=>r.id==='B-sidecar')
const emitted=build.artifacts.filter(a=>a.target==='uar-sidecar')
if(emitted.length!==1)throw new Error('Exactly one emitted sidecar required')
const sidecar=emitted[0]
const required=read(config.payload.requiredBuildProfile).artifacts.find(a=>a.target==='uar-sidecar').features
if(JSON.stringify([...required].sort())!==JSON.stringify([...sidecar.features].sort()))throw new Error('Production feature set changed')
const utility=receipts.find(r=>r.id==='C-rust-callers').artifacts.filter(a=>a.target==='bauar_native_admission_storage_fixture')
if(utility.length!==1)throw new Error('Exactly one emitted storage fixture required')
const root=build.cwd,output=config.payload.outputDirectory
if(fs.existsSync(output))throw new Error('Preserve prior payload; new destination required')
const inputs=[{path:'uar-sidecar',source:sidecar.executable}]
function models(dir,relative=''){
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const name=relative?relative+'/'+ent.name:ent.name,from=path.join(dir,ent.name)
  if(ent.isDirectory())models(from,name)
  else if(ent.isFile())inputs.push({path:'uar-models/'+name,source:from})
  else throw new Error('Nonregular model resource')
 }
}
models(path.join(root,'src/uar/runtime/matching/models'))
for(const name of ['default.cedar','skill-mutation.cedar','tool-approval.cedar'])inputs.push({path:'policies/'+name,source:path.join(root,'policies',name)})
inputs.push({path:'LICENSE',source:path.join(root,'LICENSE')})
const libraries=execFileSync('/usr/bin/otool',['-L',sidecar.executable],{encoding:'utf8'}).split('\n').slice(1).map(x=>x.trim().split(' (')[0]).filter(Boolean)
if(libraries.some(x=>!x.startsWith('/usr/lib/')&&!x.startsWith('/System/Library/')))throw new Error('Unexpected non-system runtime library')
const files=inputs.map(v=>({path:v.path,size:fs.statSync(v.source).size,sha256:hash(v.source)})).sort((a,b)=>a.path.localeCompare(b.path))
const version=fs.readFileSync(path.join(root,'Cargo.toml'),'utf8').match(/\[package\][\s\S]*?\nversion\s*=\s*"([^"]+)"/)?.[1]
if(!version)throw new Error('Package version missing')
fs.mkdirSync(output)
for(const i of [...inputs,{path:'bauar-native-admission-storage-fixture',source:utility[0].executable}]){
 const to=path.join(output,i.path);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(i.source,to,fs.constants.COPYFILE_EXCL)
 if(hash(to)!==hash(i.source))throw new Error('Staged input changed')
}
const payload={schema:1,name:'uar-sidecar',version,platform:'darwin-arm64',source:source.records.find(r=>r.root===root).head,features:sidecar.features,developmentOnly:true,acceptanceScope:'private-current-source-development-gates; excluded from packaged and release acceptance',files}
fs.writeFileSync(path.join(output,'payload-manifest.json'),JSON.stringify(payload,null,2)+'\n',{flag:'wx'})
const boss='/Users/gqadonis/.claude/worktrees/bauar-boss'
const bundle=path.resolve(boss,read(path.join(boss,'package.json')).main)
const artifact={schemaVersion:1,time:new Date().toISOString(),developmentOnly:true,releaseCertified:false,sourceBinding:{path:config.payload.sourceManifest,sha256:hash(config.payload.sourceManifest),sourceHashesUnchanged:true,baselineCoverageGaps:source.baselineCoverageGaps},commands:receipts.map(r=>({id:r.id,path:r.path,sha256:r.sha256,exitCode:r.exitCode})),sidecar:{emitted:sidecar.executable,staged:path.join(output,'uar-sidecar'),sha256:hash(sidecar.executable),features:sidecar.features,libraries},storageFixture:{emitted:utility[0].executable,staged:path.join(output,'bauar-native-admission-storage-fixture'),sha256:hash(utility[0].executable),gateOnly:true},bossBundle:{path:bundle,sha256:hash(bundle)},resources:files,payloadManifestSha256:hash(path.join(output,'payload-manifest.json')),scope:'Child development only; no installed-platform or parent certification'}
fs.writeFileSync(config.payload.artifactManifest,JSON.stringify(artifact,null,2)+'\n',{flag:'wx'})
fs.writeFileSync(path.join(output,'development-provenance.json'),JSON.stringify(artifact,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({staged:output,sidecarSha256:artifact.sidecar.sha256,fixtureSha256:artifact.storageFixture.sha256,bossBundleSha256:artifact.bossBundle.sha256,features:sidecar.features,resources:files.length}))
