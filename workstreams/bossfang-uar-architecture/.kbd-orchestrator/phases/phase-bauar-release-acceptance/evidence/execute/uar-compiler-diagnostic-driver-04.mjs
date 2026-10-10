import {mkdir,readFile,realpath} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOwned} from '../../acceptance/lib/processes.mjs';
import {writeNew,hashFile} from '../../acceptance/lib/records.mjs';
import {privateEnvironment} from '../../acceptance/lib/environment.mjs';
const base=dirname(fileURLToPath(import.meta.url)),phase=dirname(dirname(base));
const c=JSON.parse(await readFile(phase+'/acceptance/candidate-inputs.json','utf8')),component=c.components.find(x=>x.id==='uar-regression');
const root=base+'/private/uar-compiler-diagnostic-04',started=base+'/uar-compiler-diagnostic-started-04.json',out=base+'/uar-compiler-diagnostic-04.json';
const {env}=await privateEnvironment(c,component,root,root+'/binding-unavailable.json',root+'/receipt-unavailable.json');
env.PATH=env.PATH.replace(':/usr/bin',':/opt/homebrew/bin:/usr/bin');
const args=component.command.args.slice(0,component.command.args.indexOf('--')).concat(['--no-run','--message-format=json']);
const command={...component.command,args};const diagnostics=[];let compilerMessages=0;
const sourceInputs=[];for(const path of [component.command.program,phase+'/acceptance/candidate-inputs.json',fileURLToPath(import.meta.url)])sourceInputs.push({path,sha256:await hashFile(await realpath(path)),realPath:await realpath(path)});
const result=await runOwned({...command,env,budgetMs:10800000,outputPolicy:{
 async onStarted(value){await writeNew(started,{schemaVersion:1,...value,supervisorPid:process.pid,command,sourceInputs})},
 observeLine(stream,line){let x;try{x=JSON.parse(line)}catch{}
 if(x?.reason==='compiler-message'){compilerMessages++;if(x.message?.level==='error'){
 const m=x.message,spans=(m.spans||[]).filter(s=>s.is_primary&&!/(?:bauar_session_owner|mcp_server)\.rs$/.test(s.file_name)).map(s=>({file:s.file_name,line:s.line_start,column:s.column_start}));
 diagnostics.push({kind:'compiler',code:m.code?.code??null,message:m.message.slice(0,600),spans});}}
 else if(stream==='stderr'){if(line.trim().startsWith('sccache: error:')){const title=line.trim().split(/[\x22\x27\x60]/)[0].slice(0,160);diagnostics.push({kind:'cache-error-title',title})}const patterns=[[/Compiler not supported/,'compiler_not_supported'],[/failed to spawn/,'failed_to_spawn'],[/No such file or directory/,'missing_file_or_tool'],[/Permission denied/,'permission_denied'],[/failed to execute compile/,'cache_compile_failed'],[/Too many open files/,'descriptor_exhausted'],[/Connection refused/,'cache_connection_refused'],[/failed to send/,'cache_send_failed'],[/could not compile \x60([^\x60]+)\x60/,'could_not_compile'],[/failed to run custom build command for \x60([^\x60]+)\x60/,'custom_build_failed'],[/No space left on device/,'disk_full'],[/sccache: error/,'compiler_cache_error'],[/signal: 9/,'signal_9'],[/linking with \x60([^\x60]+)\x60 failed/,'linker_failed'],[/error:.*os error (\d+)/,'os_error']];for(const [re,category]of patterns){const m=re.exec(line);if(m)diagnostics.push({kind:'stderr-classification',category,subject:m[1]?.slice(0,100)??null})}}},
 result(){return{compilerMessages,compilerErrors:diagnostics.filter(x=>x.kind==='compiler').length,classifiedErrors:diagnostics.filter(x=>x.kind!=='compiler').length}}
}});
const receipt=await writeNew(out,{schemaVersion:1,kind:'observed-compiler-blocker-diagnostic',command,sourceInputs,result,diagnostics,runtimeTestsExecuted:false,rawOutputRetained:false});
console.log(JSON.stringify({receipt,result,diagnostics}));process.exitCode=result.exitCode??2;
