import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import crypto from 'node:crypto';
import {applyFieldCap} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/review/packet-builder/truncation.mjs';
const w="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini",p="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture",s="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance",e=path.join(s,'evidence/execute'),q=path.join(e,'qa-resume-2026-10-08'),out=path.join(e,'review/adversarial-2026-10-08');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),txt=f=>fs.readFileSync(f,'utf8');
if(read(path.join(q,'validation-result.json')).overall!=='passed')throw Error('Refine not passed');
const m=read(path.join(e,'final-source-manifest-17.json')),parts=[],files=[];
for(const c of m.changedFromBaseline){
 if(!['uar','boss'].includes(c.repository)||/bauar_session_owner|mcp_server\.rs/.test(c.file))throw Error('Out of scope');
 const r=m.records.find(r=>r.name===c.repository),loc=path.join(r.root,c.file),bytes=fs.readFileSync(loc),hash=crypto.createHash('sha256').update(bytes).digest('hex');
 if(hash!==r.files.find(x=>x.file===c.file).sha256)throw Error('Source drift');
 const tracked=cp.spawnSync('git',['ls-files','--error-unmatch','--',c.file],{cwd:r.root,encoding:'utf8'}).status===0;
 const diff=tracked?cp.execFileSync('git',['diff','--no-ext-diff','HEAD','--',c.file],{cwd:r.root,encoding:'utf8'}):'--- /dev/null\n+++ '+c.repository+'/'+c.file+'\n'+bytes.toString('utf8').split('\n').map(l=>'+'+l).join('\n');
 parts.push('Repository '+c.repository+'; HEAD '+r.head+'; '+c.file+'\n'+diff);files.push(c.repository+'/'+c.file);
}
const change=path.join(p,'openspec/changes/bauar-05-native-discovery-admission');
const evidenceNames=['G1-02-bound-receipt.json','G2-12-command-receipt.json','G2-12-finite-predicate-disposition.json','G2-postack-02-finite-evidence.json','G2-postack-02-bound-receipt.json','scope-amendments.json','bauar05-postack-control-scope-approval-resolution.json','bauar05-catalog-trace-scope-approval-resolution.json','bauar05-reasoning-event-scope-approval-resolution.json'];
const pkt={packet_version:1,mode:'diff',phase:'bossfang-uar-authorization-and-execution::desktop-mcp-projection-acceptance',target:'bauar-05-native-discovery-admission',
 producer_model:'unknown',producer_identity:null,producer_provenance:'Codex GPT-6 family, exact served producer identity unavailable; prior worker route gpt-6-astra/high; never infer canonical identity from an alias.',
 diff:parts.join('\n\n'),acceptance_criteria:['proposal.md','design.md','tasks.md','verification.md','specs/native-tool-admission/spec.md'].map(f=>'FILE '+f+'\n'+txt(path.join(change,f))).join('\n\n'),
 constraints:txt(path.join(p,'.kbd-orchestrator/constraints.md')),file_tree:files.join('\n'),
 scope:'Completed local macOS development child only. Parent D0/session ownership/global formatting/installed release/remote OAuth/Windows remain outside scope. No Bossfang changes. Excluded diagnostic files were not accessed.',
 diff_attribution:'Cumulative HEAD differences on 34 owned paths, including pre-existing parent implementation on those paths; protected baseline has hashes but not exact historical before bytes. Untracked files supplied whole. Do not attribute every HEAD hunk solely to this child. Earlier independent review accepted scoped behavior but retained mini QA blockers; formal review has not passed.',
 acceptance_disposition:read(path.join(q,'acceptance-disposition.json')),
 finite_evidence:Object.fromEntries(evidenceNames.map(f=>[f,read(path.join(e,f))])),
 prior_team_review:txt(path.join(e,'review/team-acceptance/review.md')),
 repair_intake:read(path.join(q,'repair-intake.json')),refinement:read(path.join(q,'validation-result.json')),
 mini_repair_gates:read(path.join(q,'mini-repair-gate-receipts.json')),post_merge_link_inventory:read(path.join(q,'mini-repair-final-link-inventory.json')),
 publication:read(path.join(q,'publication-status.json')),
 interpretation_limits:['G2-12 EXIT1 remains a failed aggregate command, even though finite individual cases support scoped criteria. Final aggregate sink assertion was unreached; retained source-computed predicate disposition is narrower.',
 'Ordinary emission source12 and instrumented source13 were scoped-rebound to source17, never relabeled fresh builds. Postack02 EXIT0 covers search_tools positive body1/cancelbody0, dropped while held, not later guard execution.',
 'Mini original constraints are evaluated at recorded completed-repair boundary; later current CI supplements and does not relabel those tests. Supporting source/disposition hashes changed legitimately after main merge; intake records exact before/current.',
 'Whole-repository link scan is a dated snapshot, not permanent certification. No builds or product gates rerun in this intake. Review may discover gaps; do not invent missing-file defects solely from narrowed scope.'],
 review_focus:'Find concrete remaining defects or unsupported acceptance claims. Distinguish old blockers discharged by actual repair from independent parent work. No release certification requested.'
};
const final=applyFieldCap(pkt,{capBytes:700000}).packet;
fs.mkdirSync(out,{recursive:true});const raw=JSON.stringify(final,null,2)+'\n';fs.writeFileSync(path.join(out,'packet.json'),raw);
console.log(JSON.stringify({path:path.join(out,'packet.json'),bytes:Buffer.byteLength(raw),diffBytes:Buffer.byteLength(pkt.diff),files:files.length,truncation:final.truncation}));

