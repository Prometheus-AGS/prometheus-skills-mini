import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const evidence = new URL('.', import.meta.url);
const boss = '/Users/gqadonis/.claude/worktrees/bauar-release-boss';
const require = createRequire(join(boss, 'package.json'));
const asar = require('@electron/asar');
const app = join(boss, 'dist/mac-arm64/The Boss.app');
const binaryRoot = join(app, 'Contents/Resources/app.asar.unpacked/resources/binaries/darwin-arm64');
const plan = JSON.parse(fs.readFileSync(new URL('boss-package-plan-01.json', evidence), 'utf8'));
const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
async function ref(path) { const hash = createHash('sha256'); for await (const chunk of fs.createReadStream(path)) hash.update(chunk); return {path,bytes:fs.statSync(path).size,sha256:hash.digest('hex')}; }
const stages = [];
for (const index of [0,1,2]) {
  const file = new URL('boss-stage-'+index+'-receipt-01.json', evidence);
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  if(receipt.result.exitCode!==0 || receipt.result.category!=='completed' || !receipt.result.cleanup.groupAbsent || receipt.result.cleanup.unknownDescendants) throw new Error('package_stage_incomplete');
  stages.push(await ref(file.pathname));
}
const currentSource = [];
for(const source of plan.source) currentSource.push(await ref(source.path));
const sourceUnchanged = currentSource.every((source,index)=>source.sha256===plan.source[index].sha256);
const packageFiles = {};
for(const [key,file] of Object.entries({executable:join(app,'Contents/MacOS/The Boss'),info:join(app,'Contents/Info.plist'),asar:join(app,'Contents/Resources/app.asar'),uar:join(binaryRoot,'uar-sidecar'),marker:join(binaryRoot,'.uar-local-payload.json'),manifest:join(binaryRoot,'payload-manifest.json')})) packageFiles[key]=await ref(file);
const marker=JSON.parse(fs.readFileSync(packageFiles.marker.path,'utf8'));
const pin=JSON.parse(fs.readFileSync(join(boss,'build/local-uar-source.json'),'utf8'));
const archive=await ref('/Users/gqadonis/.claude/worktrees/bauar-release-uar/dist/boss-sidecar/uar-sidecar-darwin-arm64.tar.gz');
const uarMatches=marker.source===pin.revision && marker.source==='84ca0ffff5da8fafc1e2e7f5585efc07a396b14e' && packageFiles.uar.sha256==='9f91874091f8241d97209fd21b8c0c5b79ae6cdeb82ee0e873a5ea4540a8adea' && marker.archiveSha256===archive.sha256 && archive.sha256==='47a565ce5e4f63f28eebd9183a6ed6eeeffbdad13d1c8a6ec318fb2498c34bcb';
const chunk='out/main/LoggerService-xDwPhVuw.js';
const built=fs.readFileSync(join(boss,chunk));
const packaged=asar.extractFile(packageFiles.asar.path,chunk);
const compiledRootBinding={path:chunk,buildSha256:hashBytes(built),packageSha256:hashBytes(packaged),matches:built.equals(packaged),containsPrivateRootContract:packaged.includes(Buffer.from('THE_BOSS_PROFILE_ROOT'))};
const retained=JSON.parse(fs.readFileSync(new URL('boss-retention-01.json',evidence),'utf8'));
const oldAsar=retained.selectedIdentities.find(file=>file.path==='Contents/Resources/app.asar');
const receipt={schemaVersion:1,kind:'boss-package',completedAt:new Date().toISOString(),scope:'unsigned-local-darwin-arm64-directory',status:sourceUnchanged&&uarMatches&&compiledRootBinding.matches&&compiledRootBinding.containsPrivateRootContract?'PASS':'FAIL',runtimeAcceptance:'NOT_RUN',bossHead:plan.bossHead,node:process.version,app,stages,sourcePlan:await ref(new URL('boss-package-plan-01.json',evidence).pathname),sourceUnchanged,currentSource,packageFiles,uarSource:marker.source,uarProfile:'server-full (retained source-bound payload)',archive,uarMatches,compiledRootBinding,asarChanged:oldAsar.sha256!==packageFiles.asar.sha256,retention:await ref(new URL('boss-retention-01.json',evidence).pathname),limitations:['Unsigned directory package only; signing/notarization/installed execution not certified.','Existing after-pack refusal probe is packaging validation, not successful startup evidence.','No D01-D04 runtime scenario executed.'],exception:'existing-hook-status-preflight'};
fs.writeFileSync(new URL('boss-package-01.json',evidence),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:receipt.status,receipt:new URL('boss-package-01.json',evidence).pathname,sourceUnchanged,uarMatches,compiledRootBinding,asar:packageFiles.asar,asarChanged:receipt.asarChanged}));
if(receipt.status!=='PASS')process.exitCode=2;
