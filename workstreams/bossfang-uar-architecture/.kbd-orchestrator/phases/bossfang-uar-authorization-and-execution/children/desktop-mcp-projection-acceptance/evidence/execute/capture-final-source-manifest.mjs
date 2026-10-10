import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
const c=path.resolve(import.meta.dirname,'../..')
const manifest=JSON.parse(fs.readFileSync(path.join(c,'execution-manifest.json'),'utf8'))
const baselinePath=path.resolve(c,'../../evidence/execute/source-inventory-mcp-approval-fixture-delivery-24.json')
const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'))
const exclusions=['tests/bauar_session_owner.rs','src/uar/mcp_server.rs']
const digest=x=>crypto.createHash('sha256').update(x).digest('hex')
const forbidden=file=>exclusions.includes(file)||['bauar_session_owner.rs','mcp_server.rs'].includes(path.basename(file))
const changed=[],outsideOwnedScope=[],records=[],baselineCoverageGaps=[]
for(const before of baseline.records){
 const root=before.root
 const recordExclusions=[...new Set([...(before.diffExclusions??[]),...exclusions])]
 const outsideProduct=file=>recordExclusions.some(x=>file===x||file.startsWith(x+'/'))||forbidden(file)
 const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'})
 const head=git('rev-parse','HEAD').trim()
 if(head!==before.head)throw new Error('Source HEAD changed')
 const owned=new Set(manifest.ownership.filter(o=>o.cwd===root).flatMap(o=>o.files).filter(f=>!path.isAbsolute(f)))
 const names=new Set(git('diff','--name-only','HEAD','--','.',...recordExclusions.map(f=>':(exclude)'+f)).split('\n').filter(Boolean))
 for(const file of git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean))if(!outsideProduct(file))names.add(file)
 const known=new Set(before.files.map(f=>f.file))
 const files=[]
 for(const file of [...new Set([...known,...owned])].sort()){
  if(forbidden(file))throw new Error('Forbidden source in input manifest')
  const full=path.join(root,file)
  if(!fs.existsSync(full)){outsideOwnedScope.push({repository:before.name,file,status:'missing'});continue}
  const bytes=fs.readFileSync(full),sha256=digest(bytes)
  const prior=before.files.find(f=>f.file===file)
  if(prior&&prior.sha256!==sha256){changed.push({repository:before.name,file});if(!owned.has(file))outsideOwnedScope.push({repository:before.name,file,status:'changed'})}
  if(!prior&&names.has(file)){changed.push({repository:before.name,file,newToBaseline:true});if(!owned.has(file))outsideOwnedScope.push({repository:before.name,file,status:'unowned-new'})}
  files.push({file,sha256,bytes:bytes.length,dirty:names.has(file)})
 }
 for(const file of names)if(!known.has(file)&&!owned.has(file)){
  const full=path.join(root,file), stat=fs.statSync(full)
  if(stat.mtimeMs < Date.parse(baseline.time)){
   const bytes=fs.readFileSync(full),sha256=digest(bytes)
   baselineCoverageGaps.push({repository:before.name,file,mtime:stat.mtime.toISOString(),sha256,reason:'Already dirty before protected baseline timestamp but omitted from all prior source inventories; current identity captured, historical hash equality unproven'})
   files.push({file,sha256,bytes:bytes.length,dirty:true,baselineAbsent:true})
  }else outsideOwnedScope.push({repository:before.name,file,status:'unowned-not-hashed'})
 }
 const diff=git('diff','--binary','HEAD','--','.',...recordExclusions.map(f=>':(exclude)'+f))
 records.push({name:before.name,root,head,diffSha256:digest(diff),diffExclusions:recordExclusions,files})
}
const result={schemaVersion:1,time:new Date().toISOString(),kind:'final-child-candidate',baseline:baselinePath,records,changedFromBaseline:changed,outsideOwnedScope,baselineCoverageGaps,acceptance:'not run',finalCandidate:true,excludedDiagnosticExecuted:false,sourceSearchIncident:'source-search-scope-incident.json; one excluded line returned by earlier search, not used; no dedicated open/hash'}
if(outsideOwnedScope.length)result.finalCandidate=false
fs.writeFileSync(path.join(c,'evidence/execute/final-source-manifest.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({files:records.reduce((n,r)=>n+r.files.length,0),changed:changed.length,outsideOwnedScope,baselineCoverageGaps,finalCandidate:result.finalCandidate}))
process.exitCode=outsideOwnedScope.length?1:0
