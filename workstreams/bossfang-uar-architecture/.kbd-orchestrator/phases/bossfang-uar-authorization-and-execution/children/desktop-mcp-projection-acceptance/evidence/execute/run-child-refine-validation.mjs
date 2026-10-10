import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const c = path.resolve(import.meta.dirname, '../..')
const e = import.meta.dirname
const w = "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini"
const p = "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture"
const require = createRequire(path.join(w, 'package.json'))
const Ajv = require('ajv')
const addFormats = require('ajv-formats')
const YAML = require('yaml')
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const input = read(path.join(e, 'acceptance-disposition.json'))
const q = path.join(e, 'qa')
fs.mkdirSync(path.join(q, 'dist'), { recursive: true })
const constraintsText = fs.readFileSync(path.join(p, '.kbd-orchestrator/constraints.md'), 'utf8')
const block = constraintsText.match(/## Blocking constraints[\s\S]*?```yaml\n([\s\S]*?)\n```/)?.[1]
if (!block) throw new Error('Blocking constraints missing')
const originals = YAML.parse(block).constraints
const constraints = { artifact_type: 'content', constraints: originals.map(x => ({
  id: x.id, description: x.description, severity: x.severity, type: 'technical',
  validation: { requires_code_execution: true, validation_method: 'Scoped evidence evaluation in validation-result.json; no source gate rewritten' }
})), global_rules: ['Original constraints remain authoritative; content schema validation is not code/runtime certification.'],
termination_conditions: ['Any unresolved blocking constraint or required acceptance case keeps certification blocked.'] }
const candidates = [
 'acceptance-disposition.json', 'final-source-manifest.json', 'final-artifact-manifest.json',
 'G1-01-bound-receipt.json', ...input.evidenceFiles,
 'command-receipt-index.json', 'post-ack-cancellation-scope-proposal.md'
]
const files = [...new Set(candidates)]
const formats = []
for (const f of files) {
 if (f.includes('private') || f.includes('.full.') || path.basename(f) !== f) throw new Error('Unsafe evidence reference')
 const source = path.join(e, f), bytes = fs.readFileSync(source)
 if (!bytes.length) throw new Error('Empty evidence')
 if (f.endsWith('.json')) JSON.parse(bytes.toString('utf8'))
 else if (!f.endsWith('.md')) throw new Error('Unexpected evidence format')
 fs.writeFileSync(path.join(q, 'dist', f), bytes)
 formats.push({file:f,sha256:hash(source),format:f.endsWith('.json')?'json':'markdown'})
}
const manifest = { artifact_type: 'content', variants: [{
 name: 'completed-child-evidence-and-disposition', files: files.map(f=>'dist/'+f),
 format: 'mixed-json-markdown', description: 'Evidence packet only; actual deployment acceptance is separately blocked.'
}], preview: {required:false,runs:[]}, generated_at: new Date().toISOString() }
fs.writeFileSync(path.join(q, 'artifact_manifest.json'), JSON.stringify(manifest,null,2))
fs.writeFileSync(path.join(q, 'constraints.json'), JSON.stringify(constraints,null,2))
const ajv = new Ajv({allErrors:true,strict:false})
addFormats(ajv)
const schemas = ['artifact-manifest','constraints'].map(n=>read(path.join(w,'references/schemas',n+'.schema.json')))
const validations = [manifest,constraints].map((value,i)=>{
 const validate=ajv.compile(schemas[i]); const valid=validate(value)
 return {schema:i===0?'artifact-manifest':'constraints',valid,errors:validate.errors??[]}
})
const {validateManifest,validateConstraints}=await import(pathToFileURL(path.join(w,'lib/refiner/validate.mjs')))
const port=[validateManifest({root:q,schema:schemas[0]}),validateConstraints({root:q,schema:schemas[1]})]
const evaluations=originals.map(x=>({id:x.id,severity:x.severity,...(input.constraintResults[x.id]??{
 status:'unverified',evidence:[],reason:'No applicable passing receipt; not replaced with a schema pass.'
})}))
const unresolved=evaluations.filter(x=>x.severity==='blocking'&&x.status!=='passed')
const result={schemaVersion:1,time:new Date().toISOString(),artifactScope:'content evidence packet; not product-runtime certification',
 schemaValidation:validations,fileIntegrity:{passed:true,files:formats},miniPortResults:port,
 constraintSource:{path:path.join(p,'.kbd-orchestrator/constraints.md'),sha256:hash(path.join(p,'.kbd-orchestrator/constraints.md'))},
 constraintEvaluations:evaluations,requiredAcceptanceStatus:input.status,unresolvedBlocking:unresolved.map(x=>x.id),
 overall:validations.every(x=>x.valid)&&port.every(x=>x.ok)&&!unresolved.length&&input.status==='passed'?'passed':'blocked',
 tooling:{node:process.version,ajvPath:require.resolve('ajv'),ajvVersion:require('ajv/package.json').version,
 yamlPath:require.resolve('yaml'),yamlVersion:require('yaml/package.json').version},
 limitation:'Existing ancestor Node modules are verification tooling only; no product dependency adoption or pin change.'
}
fs.writeFileSync(path.join(q,'validation-result.json'),JSON.stringify(result,null,2))
fs.writeFileSync(path.join(q,'refinement_log.md'),'# Refinement validation\n\nIteration 1: evaluated the complete child candidate and actual gate disposition. Overall '+result.overall+'. No acceptance waiver or code certification. See validation-result.json.\n')
fs.writeFileSync(path.join(q,'decisions.md'),'# Validation decisions\n\nIteration 1: retain all unresolved criteria. No convergence to passing product acceptance is claimed.\n')
console.log(JSON.stringify({schemas:validations.map(x=>x.valid),files:formats.length,overall:result.overall,unresolvedBlocking:result.unresolvedBlocking}))
process.exitCode=result.overall==='passed'?0:1

