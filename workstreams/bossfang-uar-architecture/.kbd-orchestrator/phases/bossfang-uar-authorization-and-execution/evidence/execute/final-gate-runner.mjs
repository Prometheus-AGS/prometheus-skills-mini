import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const [label,cwd,command,...args]=process.argv.slice(2);
if(!/^[a-z0-9-]+$/.test(label)||!cwd||!command)throw Error('Expected label cwd command arguments');
const dir=path.join(import.meta.dirname,'final-gates');fs.mkdirSync(dir,{recursive:true});
const log=fs.createWriteStream(path.join(dir,label+'.log'),{flags:'wx'});
const startedAt=new Date().toISOString();
const child=spawn(command,args,{cwd,env:process.env,stdio:['ignore','pipe','pipe']});
const redact=s=>s.replace(/Bearer\s+[^\s"',;]+/gi,'Bearer <redacted>').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'<redacted-jwt>');
for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>log.write(redact(bytes.toString())));
child.on('error',error=>log.write('Spawn error: '+error.code+'\n'));
child.on('close',(code,signal)=>log.end(()=>{
const receipt={schemaVersion:1,label,cwd,command,args,startedAt,finishedAt:new Date().toISOString(),exitCode:code,signal,log:path.join(dir,label+'.log'),result:code===0?'command-completed-not-yet-case-certified':'failed',buildEnvironment:Object.fromEntries(['CARGO_TARGET_DIR','SKIP_DASHBOARD_BUILD','LIBREFANG_ALLOW_NO_AUTH','NODE_ENV','RUST_MIN_STACK'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]))};
fs.writeFileSync(path.join(dir,label+'.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));process.exitCode=code===0?0:1;
}));
