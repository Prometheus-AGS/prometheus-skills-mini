import {loadConfig} from '../../acceptance/lib/inputs.mjs';
import {runIntegration} from '../../acceptance/lib/stages.mjs';
import {safeError} from '../../acceptance/lib/records.mjs';
import {dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const base=dirname(fileURLToPath(import.meta.url)),phase=dirname(dirname(base));
try{const c=await loadConfig(phase+'/acceptance/candidate-inputs.json',{phase:'phase-bauar-release-acceptance',stage:'integration'});
const ids=['desktop','harness'];const selected={...c,components:c.components.filter(x=>ids.includes(x.id)),scenarios:c.scenarios.filter(x=>ids.includes(x.componentId))};
const r=await runIntegration(selected);console.log(JSON.stringify({schemaVersion:1,...r}));process.exitCode=r.exitCode;
}catch(error){const s=safeError(error);console.log(JSON.stringify({schemaVersion:1,exitCode:s.exitCode,status:'BLOCKED',category:s.category}));process.exitCode=s.exitCode;}
