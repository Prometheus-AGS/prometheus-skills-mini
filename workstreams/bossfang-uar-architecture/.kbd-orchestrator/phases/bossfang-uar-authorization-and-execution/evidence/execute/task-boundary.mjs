import cp from 'node:child_process';
const [root,change,id,edge]=process.argv.slice(2), w="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini",env={...process.env,PATH:'/opt/homebrew/opt/node@24/bin:'+process.env.PATH};
const rows=cp.execFileSync(process.execPath,[w+'/scripts/kbd-apply.mjs','list',change],{cwd:root,env,encoding:'utf8'}).trim().split('\n').map(x=>x.split('\t'));
const row=rows.find(r=>r[0]===id);if(!row)throw Error('No such task');
console.log(cp.execFileSync(process.execPath,[w+'/scripts/kbd-apply.mjs',edge+'-task',change,id,String(rows.indexOf(row)+1),String(rows.length),row.slice(2).join('\t')],{cwd:root,env,encoding:'utf8'}));

