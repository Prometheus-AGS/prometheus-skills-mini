import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import cp from 'node:child_process';
const p="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture",s="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance",e="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/evidence/execute/parent-resume-2026-10-08",old=s+'/evidence/execute',phase='bossfang-uar-authorization-and-execution';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,j)=>fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const excluded=new Set(['tests/bauar_session_owner.rs','src/uar/mcp_server.rs']),manifest=read(old+'/final-source-manifest-17.json');
const checks=[];for(const repo of manifest.records)for(const f of repo.files){if(repo.name==='uar'&&excluded.has(f.file))throw Error('Excluded path in inventory; no read performed');checks.push({repository:repo.name,file:f.file,matches:hash(path.join(repo.root,f.file))===f.sha256});}
const normal=read(old+'/final-artifact-manifest-17.json'),gate=read(old+'/final-instrumented-artifact-manifest-17.json'),request=read(old+'/G2-postack-02-request.json');
const artifacts=[{file:normal.sidecar.staged,sha256:normal.sidecar.sha256},{file:normal.storageFixture.staged,sha256:normal.storageFixture.sha256},{file:normal.bossBundle.path,sha256:normal.bossBundle.sha256}];
for(const f of normal.resources)artifacts.push({file:path.join(path.dirname(normal.sidecar.staged),f.path),sha256:f.sha256});
artifacts.push({file:path.join(path.dirname(normal.sidecar.staged),'payload-manifest.json'),sha256:normal.payloadManifestSha256});
for(const f of gate.files)artifacts.push({file:path.join(path.dirname(request.env.THE_BOSS_UAR_POST_ACK_SIDECAR_PATH),f.path),sha256:f.sha256});
const bm=read(old+'/G2-postack-02-prelaunch-binding.json');artifacts.push({file:bm.gateArtifactManifest.path,sha256:bm.gateArtifactManifest.sha256});
const artifactChecks=artifacts.map(f=>({...f,matches:hash(f.file)===f.sha256}));
const result={time:new Date().toISOString(),sourceManifestSha256:hash(old+'/final-source-manifest-17.json'),sourceChecks:checks,artifactChecks,sourceCount:checks.length,sourceDrift:checks.filter(x=>!x.matches),artifactDrift:artifactChecks.filter(x=>!x.matches),exclusions:[...excluded],emission:{ordinary:'source12',instrumented:'source13',applicability:'source17 scoped rebinding'},freshBuildClaimed:false};
write(e+'/current-pair-after.json',result);if(result.sourceDrift.length||result.artifactDrift.length)throw Error('Source/artifact drift');

console.log(JSON.stringify({sourceCount:checks.length,artifactCount:artifactChecks.length,sourceDrift:result.sourceDrift.length,artifactDrift:result.artifactDrift.length}));
