import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const cwd = '/Users/gqadonis/.claude/worktrees/bauar-boss';
const evidence = path.dirname(fileURLToPath(import.meta.url));
const scratch = path.join(cwd, '.context/packaged-acceptance-2026-10-08-02');
fs.mkdirSync(scratch,{recursive:true});
const skills = path.join(cwd, 'resources/skills');
const backup = path.join(scratch, 'skills-before');
const require = createRequire(path.join(cwd, 'package.json'));
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function directories(root, relative = '') {
  return fs.readdirSync(path.join(root, relative), { withFileTypes:true }).filter(e=>e.isDirectory())
    .flatMap(e=>{const name=path.join(relative,e.name);return [name,...directories(root,name)];});
}
function inventory(root, relative = '') {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) return inventory(root, name);
    const full = path.join(root, name), stat = fs.lstatSync(full);
    return [{ name, mode: stat.mode, kind: stat.isSymbolicLink() ? 'symlink' : 'file',
      identity: stat.isSymbolicLink() ? fs.readlinkSync(full) : hash(full) }];
  });
}
const pins = ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','electron-builder.yml',
  'build/integration-sources.json','build/integration-artifacts.json','build/local-uar-source.json',
  'scripts/before-pack.js','scripts/after-pack.js','scripts/package-prometheus.js'];
const pinBefore = pins.map(file => ({ file, sha256: hash(path.join(cwd, file)) }));
const before = inventory(skills);
const beforeDirs = directories(skills);
if (before.some(f=>f.kind==='symlink')) throw new Error('Skill snapshot contains symlinks; exact restore needs separate disposition');
fs.cpSync(skills, backup, { recursive: true, preserveTimestamps: true, errorOnExist: true, force: false });
fs.writeFileSync(path.join(scratch, 'skills-before.json'), JSON.stringify(before, null, 2));
const builder = require.resolve('electron-builder/cli.js');
const args = [builder,'--mac','--arm64','--dir','--publish','never','--config.mac.identity=null'];
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}`,
  THE_BOSS_UAR_ENABLED:'1', THE_BOSS_UAR_LOCAL:'0', CSC_IDENTITY_AUTO_DISCOVERY:'false' };
delete env.THE_BOSS_LOCAL_UAR_SOURCE_DIR;
delete env.THE_BOSS_UAR_SIDECAR_PATH;
const receipt = { schemaVersion:1, startedAt:new Date().toISOString(), cwd,
  command:process.execPath,args, node:process.version,
  builder:require('electron-builder/package.json').version,
  electronPackage:require('electron/package.json').version,
  electronDist:fs.readFileSync(path.join(cwd,'node_modules/electron/dist/version'),'utf8').trim(),
  profile:{THE_BOSS_UAR_ENABLED:'1',THE_BOSS_UAR_LOCAL:'0'},
  sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'}).trim(),
  log:path.join(scratch,'package.log'), restorationAuthorization:'root message 2026-10-08; exact preexisting skills restored after intact hooks',
  limits:['unsigned local directory only','canonical bundled UAR remains pinned','external current UAR launch is a separate check','no signed installer or Windows claim'] };
fs.writeFileSync(path.join(evidence,'canonical-directory-package-02-receipt.json'),JSON.stringify(receipt,null,2));
const log = fs.openSync(receipt.log,'w',0o600);
const child = spawn(process.execPath,args,{cwd,env,stdio:['ignore',log,log]});
const result = await new Promise(resolve => child.on('exit',(exitCode,signal)=>resolve({exitCode,signal})));
Object.assign(receipt,result,{finishedAt:new Date().toISOString()});
const after = inventory(skills), beforeMap = new Map(before.map(f=>[f.name,f])), afterMap = new Map(after.map(f=>[f.name,f]));
const changed = [...new Set([...beforeMap.keys(),...afterMap.keys()])].filter(name=>JSON.stringify(beforeMap.get(name))!==JSON.stringify(afterMap.get(name)));
receipt.generatedSkillPaths = changed;
fs.writeFileSync(path.join(scratch,'skills-after.json'),JSON.stringify(after,null,2));
receipt.restoreConflicts = [];
for (const name of changed) {
  const dest = path.join(skills,name), original = beforeMap.get(name), generated = afterMap.get(name);
  const current = fs.existsSync(dest) ? {identity:hash(dest),mode:fs.lstatSync(dest).mode} : undefined;
  if (current && generated && (current.identity!==generated.identity || current.mode!==generated.mode)) {receipt.restoreConflicts.push(name);continue;}
  if (!original) fs.rmSync(dest);
  else {fs.copyFileSync(path.join(backup,name),dest);fs.chmodSync(dest,original.mode);}
}
for(const name of directories(skills).filter(name=>!beforeDirs.includes(name)).sort((a,b)=>b.length-a.length)) {
  const full=path.join(skills,name);if(fs.readdirSync(full).length===0)fs.rmdirSync(full);
}
receipt.skillsRestored = JSON.stringify(inventory(skills))===JSON.stringify(before);
receipt.pinChecks = pinBefore.map(entry=>({...entry,matches:hash(path.join(cwd,entry.file))===entry.sha256}));
fs.writeFileSync(path.join(evidence,'canonical-directory-package-02-receipt.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify({exitCode:receipt.exitCode,signal:receipt.signal,skillsRestored:receipt.skillsRestored,generatedSkillPaths:changed.length,pinsMatch:receipt.pinChecks.every(x=>x.matches),log:receipt.log}));
process.exitCode = receipt.exitCode ?? 1;
