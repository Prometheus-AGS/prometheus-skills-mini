import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { runOwned } from '../../acceptance/lib/processes.mjs';
const root = new URL('.', import.meta.url);
const plan = JSON.parse(fs.readFileSync(new URL('boss-package-plan-02.json', root), 'utf8'));
const indexes = process.argv.slice(2).map(Number);
for (const index of indexes) {
  const command = plan.commands[index];
  const counters = { lines: 0, errorLines: 0, warningLines: 0 };
  const hash = createHash('sha256');
  const progress = setInterval(() => console.log(JSON.stringify({stage:index,...counters})), 30000);
  console.log(JSON.stringify({stage:index,status:'starting'}));
  let result;
  try {
    result = await runOwned({...command,env:plan.environment,budgetMs:1800000,outputPolicy:{
      observeLine(stream,line){hash.update(stream+'\n'+line+'\n');counters.lines++;if(/error|failed/i.test(line))counters.errorLines++;if(/warn/i.test(line))counters.warningLines++;},
      result(){return counters;},
      onStarted(info){fs.writeFileSync(new URL('boss-stage-'+index+'-owned-02.json',root),JSON.stringify({schemaVersion:1,...info,command},null,2)+'\n',{flag:'wx'});}
    }});
  } finally {clearInterval(progress);}
  const receipt={schemaVersion:1,kind:'boss-build-stage',stage:index,command,result,outputSha256:hash.digest('hex'),rawOutputRetained:false};
  fs.writeFileSync(new URL('boss-stage-'+index+'-receipt-02.json',root),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(receipt));
  if(result.exitCode!==0||result.category!=='completed'||!result.cleanup.groupAbsent||result.cleanup.unknownDescendants){process.exitCode=2;break;}
}
