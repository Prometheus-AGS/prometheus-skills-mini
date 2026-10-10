import fs from 'node:fs';import crypto from 'node:crypto';
const e="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/evidence/execute/parent-resume-2026-10-08",hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const supplemental=read(e+'/current-pair-inputs.json');
for(const x of supplemental.records)if(hash(x.path)!==x.sha256)throw Error('Prospective input changed: '+x.file);
const artifacts=[];
for(const [id,name,kind]of [['uar-current-pair-standalone-01','universal-agent-runtime','bin'],['bossfang-current-pair-host-01','bauar_harness_host','test']]){
 const receipt=read(e+'/'+id+'-receipt.json');if(receipt.exitCode!==0||!receipt.pinsUnchanged)throw Error('Build did not pass');
 const rows=[];for(const line of fs.readFileSync(receipt.rawLog,'utf8').split('\n')){try{const r=JSON.parse(line);if(r.reason==='compiler-artifact'&&r.target?.name===name&&r.target.kind.includes(kind)&&r.executable)rows.push(r)}catch{}}
 if(rows.length!==1)throw Error('Expected one emitted artifact for '+name);
 const row=rows[0];if(name==='universal-agent-runtime'&&(!row.features.includes('server-full')||row.features.includes('bauar-native-admission-gate')||row.features.includes('test-probes')))throw Error('Provider profile mismatch');if(name==='bauar_harness_host'&&!row.features.includes('uar-driver'))throw Error('Host profile mismatch');
 artifacts.push({id,commandReceipt:id+'-receipt.json',sourceBinding:['current-pair-before.json','current-pair-inputs.json'],manifestPath:row.manifest_path,target:row.target.name,kind:row.target.kind,features:row.features,fresh:row.fresh,executable:row.executable,sha256:hash(row.executable),compiled:true,runtimeAccepted:false});
}
fs.writeFileSync(e+'/current-pair-build-artifacts.json',JSON.stringify({time:new Date().toISOString(),artifacts,knownInputScopeOnly:true},null,2)+'\n');
const spec={id:'bossfang-current-pair-runtime-01',cwd:'/Users/gqadonis/.claude/worktrees/bauar-bossfang',executable:'/Users/gqadonis/.local/share/fnm/node-versions/v24.14.1/installation/bin/node',argv:['scripts/integration/bauar-postlint-gate.mjs',artifacts[1].executable,artifacts[0].executable,'/Users/gqadonis/.claude/worktrees/bauar-uar'],env:{},pinFiles:['Cargo.toml','Cargo.lock'],receipt:e+'/bossfang-current-pair-runtime-01-receipt.json'};
fs.writeFileSync(e+'/bossfang-current-pair-runtime-01-request.json',JSON.stringify(spec,null,2)+'\n');
console.log(JSON.stringify({artifacts:artifacts.map(a=>({target:a.target,sha256:a.sha256,fresh:a.fresh})),additionalInputsUnchanged:supplemental.records.length,runtimeRequest:spec.id}));
