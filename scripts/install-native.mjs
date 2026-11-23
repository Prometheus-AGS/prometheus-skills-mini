import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { root } from '../lib/native-release/catalog.mjs';
import { installNative } from '../lib/native-release/install.mjs';
import { planServices, applyServices, readServiceState } from './service-providers/index.mjs';
import native from './service-providers/native.mjs';

const toolsByService = { 'liter-llm': 'liter-llm', 'surreal-memory': 'surreal-memory-server' };
function assignments(values = []) {
  return Object.fromEntries(values.map(value => {
    const equals = value.indexOf('=');
    if (equals < 1 || equals === value.length - 1) throw new Error('Expected a service assignment, received ' + value);
    return [value.slice(0, equals), value.slice(equals + 1)];
  }));
}
try {
  const repeated = {type:'string', multiple:true};
  const { values, positionals } = parseArgs({allowPositionals:true, options:{
    'bin-dir':{type:'string'}, 'source-only':{type:'boolean'}, 'dry-run':{type:'boolean'},
    'non-interactive':{type:'boolean'}, home:{type:'string'}, service:repeated, endpoint:repeated, port:repeated,
  }});
  const directory = path.resolve(values['bin-dir'] ?? path.join(root,'.prometheus','native','bin'));
  const selections = assignments(values.service);
  const options = {
    home:path.resolve(values.home || os.homedir()), env:process.env, selections,
    endpoints:assignments(values.endpoint),
    ports:Object.fromEntries(Object.entries(assignments(values.port)).map(([id, raw]) => {
      if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 65535) throw new Error('Invalid port for ' + id);
      return [id, Number(raw)];
    })),
    interactive:!!process.stdin.isTTY && !values['non-interactive'], binDir:directory, sourceOnly:!!values['source-only'],
  };
  let services = [];
  const saved = (await readServiceState({home:options.home})).services;
  const serviceIds = ['liter-llm','surreal-memory','surrealdb'];
  const explicitInput = id => {
    const key = 'PROMETHEUS_SERVICE_' + id.toUpperCase().replaceAll('-', '_');
    return Object.hasOwn(selections, id) || Object.hasOwn(options.endpoints,id) || Object.hasOwn(options.ports,id)
      || ['MODE','PORT','ENDPOINT'].some(suffix => !!process.env[key + '_' + suffix]);
  };
  const restoreSaved = positionals.length === 0 && Object.keys(saved).length > 0;
  const serviceSelection = Object.keys(selections).length || values.endpoint || values.port || serviceIds.some(explicitInput)
    || restoreSaved || (positionals.length === 0 && !!process.env.PROMETHEUS_SERVICE_MODE);
  const interactiveSetup = options.interactive && positionals.length === 0;
  if (serviceSelection || interactiveSetup || values['dry-run']) {
    const result = values['dry-run'] ? await planServices(options,{native}) : await applyServices(options,{native});
    console.log(JSON.stringify(result));
    if (result.conflicts?.length) throw new Error('Resolve the reported service conflicts before installing');
    services = result.services;
  }
  const managed = new Set(services.filter(s => s.provider !== 'off' || explicitInput(s.id)).map(s => toolsByService[s.id]).filter(Boolean));
  const tools = (positionals.length ? positionals : ['prometheus','pk']).filter(name=>!managed.has(name));
  if (values['dry-run']) console.log(JSON.stringify({nativeTools:tools,directory}));
  else {
    for (const name of tools) console.log(JSON.stringify(await installNative(name,directory,{sourceOnly:options.sourceOnly})));
    process.stderr.write(`Use ${directory} on the PATH of the harness or application that runs Mini.\n`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode=1;
}
