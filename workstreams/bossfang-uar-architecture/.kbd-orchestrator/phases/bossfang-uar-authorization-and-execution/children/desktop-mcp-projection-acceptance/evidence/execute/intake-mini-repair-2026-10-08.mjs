import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
const w="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini",p="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture",s="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance",n="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/mini-pack-qa-remediation";
const e=path.join(s,'evidence/execute'),q=path.join(e,'qa-resume-2026-10-08');
const hashBytes=x=>crypto.createHash('sha256').update(x).digest('hex'),hash=f=>hashBytes(fs.readFileSync(f));
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,j)=>fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');
fs.mkdirSync(q,{recursive:true});
const pkt=read(path.join(n,'evidence/execute/mini-qa-repair-packet.json'));
const checks=pkt.receipts.map(x=>({...x,path:path.join(n,x.file),actualSha256:hash(path.join(n,x.file)),matched:hash(path.join(n,x.file))===x.sha256}));
if(checks.some(x=>!x.matched))throw Error('Receipt drift');
const transferred=path.join(e,'mini-pack-qa-remediation-repair-packet-2026-10-08.json');
if(hash(transferred)!==hash(path.join(n,'evidence/execute/mini-qa-repair-packet.json')))throw Error('Transfer mismatch');
const source=read(path.join(e,'final-source-manifest-17.json'));
const bindings=source.changedFromBaseline.map(x=>{
 if(/bauar_session_owner|mcp_server\.rs/.test(x.file)||!['uar','boss'].includes(x.repository))throw Error('Excluded scope');
 const r=source.records.find(r=>r.name===x.repository),entry=r.files.find(f=>f.file===x.file),f=path.join(r.root,x.file);
 return {...x,expectedSha256:entry.sha256,actualSha256:hash(f),matched:hash(f)===entry.sha256};
});
if(bindings.some(x=>!x.matched))throw Error('Product source drift');
const provenance=[pkt.adaptationRecord,pkt.historicalManifest,pkt.checkerEvidence.dispositions].map(x=>{
 const baseline=cp.execFileSync('git',['show','3d5fa6c:'+x.file],{cwd:w});
 const current=hash(path.join(w,x.file)),committed=hashBytes(cp.execFileSync('git',['show','HEAD:'+x.file],{cwd:w}));
 return {...x,repairCommitMatches:hashBytes(baseline)===x.sha256,currentSha256:current,currentMatches:current===x.sha256,currentMatchesHead:current===committed};
});
const rootConstraint=path.join(w,'.kbd-orchestrator/constraints.md'),mirror=path.join(p,'.kbd-orchestrator/constraints.md');
const before=fs.readFileSync(mirror,'utf8'),rootText=fs.readFileSync(rootConstraint,'utf8');
const re=/  - id: no-hardcoded-secrets\n[\s\S]*?(?=\n  - id:)/;
const old=before.match(re)?.[0],current=rootText.match(re)?.[0];if(!old||!current)throw Error('Constraint block missing');
const after=before.replace(re,current);fs.writeFileSync(mirror,after);
const ci=JSON.parse(cp.execFileSync('gh',['pr','view','49','--repo','Prometheus-AGS/prometheus-skills-mini','--json','number,state,mergeCommit,headRefOid,url,statusCheckRollup'],{cwd:w,encoding:'utf8'}));
write(path.join(q,'publication-status.json'),{checkedAt:new Date().toISOString(),...ci});
const aliases=[['6-4-gate-receipts.json','mini-repair-gate-receipts.json'],['post-merge-final-link-inventory.json','mini-repair-final-link-inventory.json'],['6-3-real-operation.json','mini-repair-real-operation.json']];
for(const [from,to]of aliases)fs.copyFileSync(path.join(n,'evidence/execute',from),path.join(q,to));
const intake={schemaVersion:1,time:new Date().toISOString(),status:'mini-dependency-cleared-for-local-desktop-review',
 roots:{mini:w,planning:p,desktop:s,repair:n},head:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:w,encoding:'utf8'}).trim(),
 transferredPacketSha256:hash(transferred),receipts:checks,sourceBindings:bindings,provenance,
 mirrorUpdate:{path:mirror,beforeSha256:hashBytes(before),afterSha256:hashBytes(after),scope:'Only no-hardcoded-secrets block copied from repaired root constraint',authority:path.join(n,'approval-policy.json')+' narrowSecretCheckerException'},
 supersedes:'Historical seven failing mini checks and incomplete link inventory only; original receipts remain unchanged.',
 corrections:['The transferred packet predates later commits: prepared-not-committed, six-controls and no-publication prose is historical; later separate checker commit, fourteen controls and PR49 merge are recorded in the repair decision log.',
 'Historical source manifest and dispositions match repair commit 3d5fa6c, but differ after main merge e83fafa and parity repair ebb96e2. Current hashes recorded; earlier gates are not relabeled as later-commit tests.',
 'PR49 current macOS/Linux CI results supplement earlier macOS receipts; Windows remains an independent unresolved follow-up.'],
 boundaries:['No product code, dependency, service, release or installed change by this intake.','34 child-owned product hashes match source17; no excluded diagnostic read, searched or hashed.','G2-12 exit1 and unreached aggregate assertion retained; finite scoped acceptance only.','No formal review, backend archive, Execute, Reflect, child exit or parent certification implied.'],
 verification:'Receipt integrity and current owned-source hashes checked now; execution results consumed from Kimi receipts, not rerun.'
};
write(path.join(q,'repair-intake.json'),intake);
const input=read(path.join(e,'acceptance-disposition.json')),gates=read(path.join(q,'mini-repair-gate-receipts.json'));
for(const [id,c]of Object.entries(input.constraintResults)){
 const gate=gates.commandGates.find(g=>g.gate===id)??gates.manualReviewReceipts.find(g=>g.constraint===id);
 if(gate?.result==='PASS')input.constraintResults[id]={status:'passed',evidence:[id==='no-symlinks'?'mini-repair-final-link-inventory.json':'mini-repair-gate-receipts.json','repair-intake.json','publication-status.json'],reason:'Consumed completed-repair evidence at its recorded boundary; current product/source and post-merge limitations in repair-intake.json. '+gate.detail};
}
input.reconciliation={source:path.join(e,'acceptance-disposition.json'),sourceSha256:hash(path.join(e,'acceptance-disposition.json')),intake:'repair-intake.json',historicalRuntimeDispositionUnchanged:true};
input.evidenceFiles=[...input.evidenceFiles,'mini-repair-gate-receipts.json','mini-repair-final-link-inventory.json','mini-repair-real-operation.json','repair-intake.json','publication-status.json'];
write(path.join(q,'acceptance-disposition.json'),input);
let runner=fs.readFileSync(path.join(e,'run-child-refine-validation.mjs'),'utf8')
.replace("const c = path.resolve(import.meta.dirname, '../..')", "const c = "+JSON.stringify(s))
.replace('const e = import.meta.dirname','const e = '+JSON.stringify(e))
.replace("const input = read(path.join(e, 'acceptance-disposition.json'))","const input = read(path.join(import.meta.dirname, 'acceptance-disposition.json'))")
.replace("const q = path.join(e, 'qa')","const q = import.meta.dirname")
.replace("const source = path.join(e, f), bytes = fs.readFileSync(source)","const source = fs.existsSync(path.join(q, f)) ? path.join(q, f) : path.join(e, f), bytes = fs.readFileSync(source)")
.replace('No acceptance waiver or code certification.','Intake consumes completed repair receipts at their recorded boundaries. No acceptance waiver or code certification.')
.replace('Iteration 1: retain all unresolved criteria. No convergence to passing product acceptance is claimed.','Iteration 1: inherited runtime acceptance unchanged; mini blockers reconciled using hash-verified repair receipts. Historical QA and independent parent blockers retained.');
fs.writeFileSync(path.join(q,'validate-reconciled.mjs'),runner);
console.log(JSON.stringify({intake:path.join(q,'repair-intake.json'),receipts:checks.length,sourceBindings:bindings.length,provenance,mirrorUpdated:before!==after}));

