import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cwd='/Users/gqadonis/.claude/worktrees/bauar-boss';
const evidence=path.dirname(fileURLToPath(import.meta.url));
const phase=path.resolve(evidence,'../../..');
const sidecar=path.join(phase,'children/desktop-mcp-projection-acceptance/evidence/execute/development-uar-payload-12/uar-sidecar');
const executable=path.join(cwd,'dist/mac-arm64/The Boss.app/Contents/MacOS/The Boss');
const resources=path.join(cwd,'dist/mac-arm64/The Boss.app/Contents/Resources');
const scratch=path.join(cwd,'.context/packaged-acceptance-2026-10-08-04');
fs.mkdirSync(scratch,{recursive:true});
const profile=fs.mkdtempSync(path.join(scratch,'profile-'));
const require=createRequire(path.join(cwd,'package.json'));
const { _electron:electron, expect }=require('@playwright/test');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const fileHash=file=>hash(fs.readFileSync(file));
const alive=pid=>{if(!pid)return false;try{process.kill(pid,0);return true}catch{return false}};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const freeBytes=()=>{const s=fs.statfsSync(cwd);return s.bavail*s.bsize};
const receipt={schemaVersion:1,startedAt:new Date().toISOString(),cwd,executable,
  environmentRetry:{priorReceipt:'packaged-external-uar-03-receipt.json',category:'changed-environment-after-observed-ENOSPC',productionChanged:false,packageRebuilt:false,freeBytesBefore:freeBytes()},
  profile,sidecar,node:process.version,playwright:require('@playwright/test/package.json').version,
  adapterCorrection:{priorReceipt:'packaged-external-uar-02-receipt.json',failure:'Oracle expected legacy done; production returned succeeded',productionContract:'src/shared/types/integrationOperation.ts:23 IntegrationOperationStatus; src/main/services/prometheus/integrationOperationRunner.ts:148,204'},
  scope:'Unsigned canonical macOS arm64 directory app with accepted external current UAR; startup plus authenticated uar-check only',
  command:{executable:process.execPath,argv:[fileURLToPath(import.meta.url)]},
  claimsExcluded:['bundled current UAR','signed installer','installed release','Windows acceptance','approval matrix rerun']};
const requiredCapabilities=['approval_lifecycle_v1','host_history','reasoning_effort','run_scoped_credentials','run_scoped_mcp_servers','session_principal','working_directory'];
const bootFile=path.join(os.homedir(),'.the-boss','boot-config.json');
const original=fs.existsSync(bootFile)?fs.readFileSync(bootFile):undefined;
const config=original?JSON.parse(original.toString()):{};
const mapping=config['app.user_data_path']??{};
const hadMapping=Object.hasOwn(mapping,executable), oldMapping=mapping[executable];
const hadMap=Object.hasOwn(config,'app.user_data_path');
config['app.user_data_path']={...mapping,[executable]:profile};
const mapped=Buffer.from(JSON.stringify(config,null,2));
let app,appPid,sidecarPid,mappingWritten=false,raw;
try {
  assert.equal(JSON.parse(fs.readFileSync(path.join(evidence,'canonical-directory-package-02-receipt.json'))).exitCode,0);
  assert(fs.existsSync(executable));
  receipt.externalPayloadSha256=fileHash(sidecar);
  assert.equal(receipt.externalPayloadSha256,'bfd2194f5942474082d71ede227e01fda356afd9e1d93257bdf847dfae2d5f4f');
  receipt.packageAsarSha256=fileHash(path.join(resources,'app.asar'));
  receipt.bundledManifest=JSON.parse(fs.readFileSync(path.join(resources,'app.asar.unpacked/resources/binaries/darwin-arm64/payload-manifest.json')));
  receipt.bundledManifest={source:receipt.bundledManifest.source,version:receipt.bundledManifest.version,platform:receipt.bundledManifest.platform};
  if(original)fs.writeFileSync(path.join(scratch,'boot-config-original.private'),original,{mode:0o600});
  fs.mkdirSync(path.dirname(bootFile),{recursive:true});
  fs.writeFileSync(bootFile,mapped);mappingWritten=true;
  receipt.bootMapping={originalExisted:Boolean(original),beforeSha256:original?hash(original):null,temporarySha256:hash(mapped)};
  const env={...process.env,NODE_ENV:'production',THE_BOSS_UAR_ENABLED:'1',THE_BOSS_UAR_LOCAL:'0',THE_BOSS_UAR_SIDECAR_PATH:sidecar};
  delete env.ELECTRON_RUN_AS_NODE;delete env.CS_DEV_USER_DATA_SUFFIX;delete env.THE_BOSS_LOCAL_UAR_SOURCE_DIR;
  app=await electron.launch({executablePath:executable,args:[],cwd,env,timeout:60000});
  appPid=app.process().pid;
  raw=fs.createWriteStream(path.join(scratch,'packaged-launch.private.log'),{mode:0o600});
  app.process().stdout?.pipe(raw,{end:false});app.process().stderr?.pipe(raw,{end:false});
  const identity=await app.evaluate(({app})=>({isPackaged:app.isPackaged,appPath:app.getAppPath(),executable:app.getPath('exe'),userData:app.getPath('userData'),electron:process.versions.electron,pid:process.pid}));
  receipt.identity=identity;assert(identity.isPackaged);assert.equal(identity.executable,executable);assert.equal(identity.userData,profile);
  let page;
  await expect.poll(()=>{page=app.windows().find(p=>p.url().includes('/windows/main/index.html'));return Boolean(page)},{timeout:60000}).toBe(true);
  await page.locator('#root').waitFor({state:'visible',timeout:60000});
  receipt.renderer={ready:true,url:page.url()};
  const ipc=async(route,input)=>{
    const result=await page.evaluate(({route,input})=>window.api.ipcApi.request(route,input),{route,input});
    if(!result.ok){const errorJson=JSON.stringify(result.error??{});fs.writeFileSync(path.join(scratch,'ipc-error.private.json'),errorJson,{mode:0o600});receipt.ipcFailure={route,errorSha256:hash(errorJson),errorLength:errorJson.length};}
    assert.equal(result.ok,true,`${route} failed`);return result.data;
  };
  let snapshot=await ipc('prometheus.integration.snapshot',{});
  sidecarPid=snapshot.uar.processId;
  assert.equal(snapshot.uar.binarySource,'override');assert.equal(snapshot.uar.binary,sidecar);
  const operation=await ipc('prometheus.integration.start',{action:'uar-check'});
  let complete;
  await expect.poll(async()=>{snapshot=await ipc('prometheus.integration.snapshot',{});sidecarPid=snapshot.uar.processId??sidecarPid;complete=snapshot.operations.find(x=>x.id===operation.id);return complete?.status},{timeout:90000}).toMatch(/^(succeeded|failed|cancelled|interrupted)$/);
  assert.equal(complete?.status,'succeeded','Packaged uar-check did not finish successfully');
  sidecarPid=snapshot.uar.processId;assert(sidecarPid);assert(alive(sidecarPid));
  assert.equal(snapshot.uar.state,'running');assert.equal(snapshot.uar.binarySource,'override');assert.equal(snapshot.uar.binary,sidecar);
  for(const cap of requiredCapabilities)assert(snapshot.uar.capabilities.includes(cap));
  receipt.uar={binarySource:snapshot.uar.binarySource,binary:snapshot.uar.binary,processId:sidecarPid,
    state:snapshot.uar.state,runtimeVersion:snapshot.uar.runtimeVersion,requiredCapabilities:requiredCapabilities,
    requiredCapabilitiesConfirmed:true,
    effectiveBackend:snapshot.uar.effectiveBackend,effectivePort:snapshot.uar.effectivePort};
  const diagnosticIds=['uar.binary','uar.process','uar.authentication','uar.port','uar.capabilities','uar.storage'];
  const diagnosticStates=['operational','listening','authenticated'];
  receipt.operation={action:'uar-check',status:complete.status,diagnostics:complete.diagnostics
    .filter(d=>diagnosticIds.includes(d.id)).map(d=>({id:d.id,state:diagnosticStates.includes(d.state)?d.state:'unexpected'}))};
  receipt.acceptance='passed';
} catch(error) {
  const message=error instanceof Error?error.message:String(error);
  fs.writeFileSync(path.join(scratch,'launch-error.private.log'),message,{mode:0o600});
  receipt.acceptance='failed';receipt.error={category:error instanceof assert.AssertionError?'assertion':app?'runtime-check':'launch-or-prerequisite',sha256:hash(message),length:message.length};process.exitCode=1;
} finally {
  const ownedHelpers=[];
  if(appPid&&alive(appPid)){
    const children=spawnSync('pgrep',['-P',String(appPid)],{encoding:'utf8'}).stdout.trim().split(/\s+/).filter(Boolean).map(Number);
    for(const pid of children){const comm=spawnSync('ps',['-o','comm=','-p',String(pid)],{encoding:'utf8'}).stdout.trim();if(comm.startsWith(path.join(cwd,'dist/mac-arm64/The Boss.app/Contents/Frameworks/')))ownedHelpers.push(pid);else if(comm===sidecar)sidecarPid=pid;}
  }
  if(app){await Promise.race([app.close(),sleep(15000)]).catch(()=>{});if(alive(appPid))process.kill(appPid,'SIGTERM');}
  for(let i=0;i<20&&(alive(appPid)||alive(sidecarPid));i++)await sleep(250);
  receipt.cleanup={appPid,sidecarPid,appStopped:!alive(appPid),sidecarStopped:sidecarPid?!alive(sidecarPid):null};
  if(alive(sidecarPid)){process.kill(sidecarPid,'SIGTERM');for(let i=0;i<20&&alive(sidecarPid);i++)await sleep(250);receipt.cleanup.sidecarStopped=!alive(sidecarPid);receipt.cleanup.sidecarExplicitTerm=true;}
  const forcedPids=[];
  for(const pid of [appPid,sidecarPid,...ownedHelpers].filter(Boolean)){if(alive(pid)){process.kill(pid,'SIGKILL');forcedPids.push(pid);}}
  if(forcedPids.length)for(let i=0;i<20&&forcedPids.some(alive);i++)await sleep(250);
  receipt.cleanup={...receipt.cleanup,appStopped:!alive(appPid),sidecarStopped:sidecarPid?!alive(sidecarPid):null,ownedHelperPids:ownedHelpers,helpersStopped:ownedHelpers.every(pid=>!alive(pid)),forcedPids};
  if(alive(appPid)||alive(sidecarPid)){receipt.acceptance='failed';receipt.cleanup.incomplete=true;process.exitCode=1;}
  if(mappingWritten&&!receipt.cleanup.incomplete){
    const current=fs.readFileSync(bootFile);
    if(current.equals(mapped)){if(original)fs.writeFileSync(bootFile,original);else fs.rmSync(bootFile);receipt.bootMapping.restoration='exact-original';}
    else {
      const latest=JSON.parse(current.toString());
      if(latest['app.user_data_path']?.[executable]===profile){
        if(hadMapping)latest['app.user_data_path'][executable]=oldMapping;else delete latest['app.user_data_path'][executable];
        if(!hadMap&&Object.keys(latest['app.user_data_path']).length===0)delete latest['app.user_data_path'];
        fs.writeFileSync(bootFile,JSON.stringify(latest,null,2));receipt.bootMapping.restoration='scoped-property-preserving-concurrent-edits';
      } else receipt.bootMapping.restoration='mapping-changed-externally-preserved';
    }
    receipt.bootMapping.afterSha256=fs.existsSync(bootFile)?fileHash(bootFile):null;
  }
  if(receipt.acceptance==='passed'&&(receipt.cleanup.sidecarStopped!==true||!receipt.cleanup.helpersStopped||!['exact-original','scoped-property-preserving-concurrent-edits'].includes(receipt.bootMapping?.restoration))){receipt.acceptance='failed';process.exitCode=1;}
  raw?.end();
  receipt.environmentRetry.freeBytesAfter=freeBytes();
  receipt.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(evidence,'packaged-external-uar-04-receipt.json'),JSON.stringify(receipt,null,2));
  console.log(JSON.stringify({acceptance:receipt.acceptance,error:receipt.error,cleanup:receipt.cleanup,bootRestoration:receipt.bootMapping?.restoration}));
}
