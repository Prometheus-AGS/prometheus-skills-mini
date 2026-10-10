import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
const [specFile] = process.argv.slice(2)
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'))
const allowed = ['/Users/gqadonis/.claude/worktrees/bauar-boss', '/Users/gqadonis/.claude/worktrees/bauar-uar']
if (!allowed.includes(spec.cwd)) throw new Error('Isolated cwd required')
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const pins = (spec.pinFiles ?? []).map(file => ({ file, sha256: hash(path.join(spec.cwd,file)) }))
const startedAt = new Date().toISOString()
const rawPath = spec.receipt.replace(/\.json$/, '.private.log')
const raw = fs.createWriteStream(rawPath, { mode: 0o600 })
const events = {}, codes = new Set(), diagnostics = [], artifacts = []
let pending = '', lines = 0
function parse(chunk) {
 raw.write(chunk); pending += chunk
 let index
 while ((index=pending.indexOf('\n')) >= 0) {
  const line=pending.slice(0,index); pending=pending.slice(index+1); lines++
  for (const code of line.match(/\b(?:ERR_[A-Z0-9_]{1,80}|TS\d{4,5}|E\d{4})\b/g) ?? []) codes.add(code)
  try {
   const value=JSON.parse(line)
   const name=value.reason ?? value.name ?? value.operation ?? 'json'
   if(typeof name === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(name)) events[name]=(events[name]??0)+1
   if(value.reason==='compiler-message' && value.message?.level==='error') diagnostics.push({ code:value.message.code?.code??null, message:value.message.message, spans:(value.message.spans??[]).filter(s=>s.is_primary).map(s=>({file:s.file_name,line:s.line_start,column:s.column_start})) })
   if(value.reason==='compiler-artifact' && value.executable) artifacts.push({target:value.target?.name,features:value.features,executable:value.executable,fresh:value.fresh})
  } catch {}
 }
}
const child=spawn(spec.executable,spec.argv,{cwd:spec.cwd,env:{...process.env,...spec.env,PATH:(spec.pathPrefix??path.dirname(spec.executable))+path.delimiter+process.env.PATH},stdio:['ignore','pipe','pipe'],shell:false})
console.log(JSON.stringify({operation:spec.id,startedAt,pid:child.pid}))
child.stdout.on('data',x=>parse(x.toString())); child.stderr.on('data',x=>parse(x.toString()))
child.on('error',e=>codes.add(e.code??'SPAWN_FAILED'))
child.on('close',(exitCode,signal)=>{
 if(pending) parse('\n')
 raw.end()
 const after=pins.map(p=>({file:p.file,sha256:hash(path.join(spec.cwd,p.file))}))
 const receipt={schemaVersion:1,id:spec.id,startedAt,completedAt:new Date().toISOString(),cwd:spec.cwd,executable:spec.executable,argv:spec.argv,envNames:Object.keys(spec.env??{}),exitCode,signal,pinsUnchanged:JSON.stringify(pins)===JSON.stringify(after),pinsBefore:pins,pinsAfter:after,codes:[...codes],events,diagnostics,artifacts,outputLines:lines,rawLog:rawPath,rawLogPolicy:'Local-only; never stage or print',acceptance:false}
 fs.writeFileSync(spec.receipt,JSON.stringify(receipt,null,2)+'\n')
 console.log(JSON.stringify({operation:spec.id,exitCode,pinsUnchanged:receipt.pinsUnchanged,codes:receipt.codes,events,diagnostics}))
 process.exitCode=receipt.pinsUnchanged?(exitCode??1):1
})
