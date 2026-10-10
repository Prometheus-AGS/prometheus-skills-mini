import fs from 'node:fs';
const e="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/evidence/execute/parent-resume-2026-10-08",s="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance";
let runner=fs.readFileSync(s+'/evidence/execute/run-isolated-command.mjs','utf8');
runner=runner.replace("'/Users/gqadonis/.claude/worktrees/bauar-uar']","'/Users/gqadonis/.claude/worktrees/bauar-uar', '/Users/gqadonis/.claude/worktrees/bauar-bossfang']");
fs.writeFileSync(e+'/run-current-pair.mjs',runner);
for(const [id,cwd,argv,target,env]of[
 ['uar-current-pair-standalone-01','/Users/gqadonis/.claude/worktrees/bauar-uar',['build','--offline','--locked','-p','universal-agent-runtime','--no-default-features','--features','server-full','--bin','universal-agent-runtime','--message-format=json'],'/Users/gqadonis/.claude/worktrees/bauar-uar/target',{}],
 ['bossfang-current-pair-host-01','/Users/gqadonis/.claude/worktrees/bauar-bossfang',['test','--offline','--locked','-p','librefang-kernel','-p','librefang-api','--features','librefang-kernel/uar-driver,librefang-api/uar-driver','--test','bauar_harness_host','--no-run','--message-format=json'],'/Users/gqadonis/.cargo-build/ac/bc2af224a6da42',{SKIP_DASHBOARD_BUILD:'1'}]
])fs.writeFileSync(e+'/'+id+'-request.json',JSON.stringify({id,cwd,executable:'/Users/gqadonis/.cargo/bin/cargo',argv,env:{CARGO_TARGET_DIR:target,...env},pinFiles:['Cargo.toml','Cargo.lock'],receipt:e+'/'+id+'-receipt.json'},null,2)+'\n');
fs.writeFileSync(e+'/verify-current-pair-before.mjs',fs.readFileSync(e+'/verify-after-restore.mjs','utf8').replace('prelaunch-after-restore.json','current-pair-before.json'));
