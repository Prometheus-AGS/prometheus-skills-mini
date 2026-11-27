// Mini owns only its own per-user units. Supervisor commands never operate on
// a Boss, Full, or operator unit discovered at the requested endpoint.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { installNative } from '../../lib/native-release/install.mjs';
import { ownedExecutable, receiptFile } from '../../lib/native-release/receipt.mjs';
import { databaseRelease, sameDatabaseVersion } from './catalog.mjs';
import { product, releaseTag, root } from '../../lib/native-release/catalog.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const products = { 'liter-llm': 'liter-llm', 'surreal-memory': 'surreal-memory-server' };
const services = new Set(['surrealdb', ...Object.keys(products)]);
const domain = () => 'gui/' + process.getuid();
const xml = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const unitArg = s => '"' + s.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%').replaceAll('$', '$$') + '"';

function run(command, args, { optional = false } = {}) {
  const r = spawnSync(command, args, { encoding: 'utf8' });
  if (r.error) throw r.error;
  if (!optional && r.status !== 0) throw new Error(command + ' ' + args[0] + ' failed: ' + r.stderr.trim());
  return r;
}

function locations(id, options) {
  if (!services.has(id)) throw new Error('Unknown Mini native service ' + id);
  const home = path.resolve(options.home || os.homedir());
  const name = 'ai.prometheus.mini.' + id + '.' + digest(home).slice(0, 12);
  const dir = path.join(home, '.prometheus', 'service-providers', 'mini-native', id);
  const mac = process.platform === 'darwin';
  const unit = mac ? path.join(home, 'Library', 'LaunchAgents', name + '.plist')
    : path.join(home, '.config', 'systemd', 'user', name + '.service');
  return {id, home, name, dir, unit, config: path.join(dir, 'launch.json'), runner:path.join(dir,'start-service.mjs'), mac};
}

// The supervisor starts a private Node launcher copied into the service directory. The launcher reads
// the launch configuration beside it, so credential values stay out of the unit and out of the
// process arguments, and the job does not depend on where this pack is installed.
const launcherSource = () => fs.readFileSync(new URL('./native-run.mjs', import.meta.url), 'utf8');

// A launcher written by an earlier Mini release is recognised by the ownership digest recorded for it,
// never by its file name, so only a file this installation wrote is removed.
const MAX_LAUNCHER_BYTES = 1_000_000; // logs share this directory; a launcher is a few kilobytes
function removeSupersededLauncher(l, owned) {
  if (!owned) return;
  for (const entry of fs.readdirSync(l.dir, {withFileTypes:true})) {
    const file = path.join(l.dir, entry.name);
    if (entry.isFile() && file !== l.runner && fs.statSync(file).size < MAX_LAUNCHER_BYTES && digest(fs.readFileSync(file, 'utf8')) === owned) fs.rmSync(file, {force:true});
  }
}

function unitText(l) {
  const argv = [process.execPath, l.runner, l.config];
  if (argv.some(s => /[\x00-\x1f]/.test(s))) throw new Error('Control character in native service path');
  if (!l.mac) return '[Unit]\nDescription=Prometheus Skills Mini ' + l.id + '\nAfter=network.target\n\n[Service]\nWorkingDirectory=' + l.dir.replaceAll('%','%%') + '\nExecStart=' + argv.map(unitArg).join(' ') + '\nRestart=on-failure\nRestartSec=5\n\n[Install]\nWantedBy=default.target\n';
  return '<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0"><dict><key>Label</key><string>' + l.name +
    '</string><key>ProgramArguments</key><array>' + argv.map(v=>'<string>'+xml(v)+'</string>').join('') +
    '</array><key>WorkingDirectory</key><string>'+xml(l.dir)+'</string><key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>' +
    '<key>ThrottleInterval</key><integer>5</integer><key>StandardErrorPath</key><string>'+xml(path.join(l.dir,'stderr.log'))+
    '</string><key>StandardOutPath</key><string>'+xml(path.join(l.dir,'stdout.log'))+'</string></dict></plist>\n';
}
function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (err) { if (err.code !== 'ENOENT') throw err; return null; }
}
function write(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive:true, mode:0o700});
  const temp = file + '.' + randomUUID();
  try { fs.writeFileSync(temp, data, {mode:0o600,flag:'wx'}); fs.renameSync(temp, file); }
  finally { fs.rmSync(temp,{force:true}); }
}
function ownedUnit(l) {
  const actual = read(l.unit);
  if (actual === null) return false;
  if (fs.lstatSync(l.unit).isSymbolicLink() || read(path.join(l.dir, 'unit.sha256')) !== digest(actual)) throw new Error('Preserving externally modified unit '+l.unit);
  return true;
}
function loaded(l, requireRunning = false) {
  if (l.mac) {
    const result = run('launchctl', ['print', domain() + '/' + l.name], {optional:true});
    if (result.status !== 0) return false;
    const source = result.stdout.match(/^\s*path = (.+)$/m)?.[1]?.trim();
    if (source !== l.unit) throw new Error('Preserving launch agent registered from ' + (source || 'an unknown path'));
    return !requireRunning || /^\s*state = running$/m.test(result.stdout);
  }
  const unit = l.name + '.service';
  const source = run('systemctl', ['--user', 'show', '--property=FragmentPath', '--value', unit], {optional:true});
  if (source.stdout.trim() && source.stdout.trim() !== l.unit) {
    throw new Error('Preserving systemd unit registered from ' + source.stdout.trim());
  }
  return run('systemctl', ['--user', 'is-active', '--quiet', unit], {optional:true}).status === 0;
}
function unload(l) {
  if (l.mac) {
    const target = domain() + '/' + l.name;
    if (loaded(l)) run('launchctl',['bootout',target]);
  }
  else {
    loaded(l); // Compare the supervisor's unit path with our private ownership receipt.
    run('systemctl', ['--user','disable','--now',l.name+'.service']);
  }
}
function start(l) {
  if (l.mac) {
    const target = domain() + '/' + l.name;
    run('launchctl',['enable',target]);
    run('launchctl',['bootstrap',domain(),l.unit]);
    // Bootstrap registers the job. A user session can defer RunAtLoad.
    // An ordinary kickstart starts an idle job without restarting a running one.
    run('launchctl',['kickstart',target]);
  }
  else { run('systemctl',['--user','daemon-reload']); run('systemctl',['--user','enable','--now',l.unit]); }
}

function configPath(env, home) {
  return path.resolve(env.PROMETHEUS_SERVICE_LITER_LLM_CONFIG || env.LITER_LLM_CONFIG || path.join(home,'.config','liter-llm','liter-llm-proxy.toml'));
}
function surrealBinary(env) {
  const candidates = env.SURREAL_BIN ? [env.SURREAL_BIN] : (env.PATH || '').split(path.delimiter).filter(Boolean).map(dir=>path.join(dir,'surreal'));
  for (const p of candidates) { try { fs.accessSync(p,fs.constants.X_OK); return path.resolve(p); } catch {} }
  return null;
}
// A repeated apply may come from a fresh shell. Only use saved credentials
// from a configuration already associated with our supervisor unit.
function serviceEnvironment(l, options) {
  const prior = ownedUnit(l) ? JSON.parse(read(l.config) || '{}') : {};
  const saved = prior.environment || {};
  const env = {...saved, ...(options.env || process.env)};
  if (l.id === 'surrealdb') {
    env.SURREAL_BIN ||= prior.binary;
    env.SURREAL_ROOT_USERNAME ||= saved.SURREAL_USER;
    env.SURREAL_ROOT_PASSWORD ||= saved.SURREAL_PASS;
  }
  if (l.id === 'liter-llm' && prior.args?.includes('--config')) {
    env.LITER_LLM_CONFIG ||= prior.args[prior.args.indexOf('--config') + 1];
  }
  return env;
}
function validate(service, plan, options) {
  const l = locations(service.id, options), env = serviceEnvironment(l, options);
  const target = new URL(service.endpoint);
  if (target.protocol !== 'http:' || !['localhost','127.0.0.1'].includes(target.hostname))
    return 'Mini native services bind IPv4 loopback. Select an HTTP localhost or 127.0.0.1 endpoint.';
  if (service.id==='surrealdb') {
    const exe = surrealBinary(env);
    const pin=options.database || databaseRelease(options.root || root);
    if (!exe) return 'Install SurrealDB '+pin.version+' and set SURREAL_BIN, or choose Docker';
    const result=run(exe,['version','--json'],{optional:true});
    let version;
    if (result.status===0) {try {version=JSON.parse(result.stdout).version;} catch {}}
    if (!sameDatabaseVersion(version,pin)) return 'Mini requires native SurrealDB '+pin.version;
    const old=path.join(l.dir,'data'),target=path.join(l.dir,'data-v'+pin.major);
    if (fs.lstatSync(old,{throwIfNoEntry:false})?.isSymbolicLink() || fs.lstatSync(target,{throwIfNoEntry:false})?.isSymbolicLink()) return 'Preserving symlinked native database directory';
    const populated=dir => fs.existsSync(dir) && fs.readdirSync(dir).length>0;
    if (populated(old) && !populated(target) && env.SURREAL_START_FRESH_V4!=='1') {
      return 'Preserving the previous Mini database in '+old+'. Restore a separately upgraded copy into '+target+' or set SURREAL_START_FRESH_V4=1 to start a fresh database.';
    }
    if (!env.SURREAL_ROOT_USERNAME || !env.SURREAL_ROOT_PASSWORD) return 'Set SURREAL_ROOT_USERNAME and SURREAL_ROOT_PASSWORD for the Mini database';
  }
  if (service.id==='surreal-memory' && (!(env.MEMORY_USERNAME || env.SURREAL_USERNAME) || !(env.MEMORY_PASSWORD || env.SURREAL_PASSWORD)))
    return 'Set MEMORY_USERNAME and MEMORY_PASSWORD for the selected SurrealDB namespace';
  if (service.id==='surreal-memory' && !env.SURREAL_ENDPOINT && !plan.services.some(s=>s.id==='surrealdb' && s.provider!=='off'))
    return 'Select surrealdb or set SURREAL_ENDPOINT for the memory service';
  if (service.id==='liter-llm' && !fs.existsSync(configPath(env,l.home))) return 'Set LITER_LLM_CONFIG to your private gateway configuration';
}
async function nativeBinary(id, l, options) {
  const name = products[id], env = serviceEnvironment(l, options);
  if (!name) return surrealBinary(env);
  const binDir = options.binDir || env.MINI_NATIVE_BIN_DIR || path.join(root,'.prometheus','native','bin');
  const binary = path.join(binDir,name);
  if (ownedExecutable(binary,name)) {
    const known = JSON.parse(read(receiptFile(binary)));
    if (known.revision === product(name).ref && known.tag === releaseTag && (!options.sourceOnly || known.source === 'cargo')) return binary;
  }
  return (await installNative(name,binDir,{sourceOnly:options.sourceOnly})).path;
}
function supervisorBinary(l, source) {
  // Background launch agents do not inherit the terminal's permissions for
  // removable volumes. Preserve the selected CLI location for interactive use.
  if (!l.mac || !products[l.id] || !fs.realpathSync(source).startsWith('/Volumes/')) return source;
  const expected = JSON.parse(read(receiptFile(source))).sha256;
  const destination = path.join(l.dir,'bin',products[l.id]);
  const marker = destination + '.sha256';
  if (fs.existsSync(destination)) {
    const actual = digest(fs.readFileSync(destination));
    if (fs.lstatSync(destination).isSymbolicLink() || actual !== read(marker)) throw new Error('Preserving modified Mini runtime executable '+destination);
    if (actual === expected) return destination;
  }
  fs.mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});
  const temp = destination + '.' + randomUUID();
  try {
    fs.copyFileSync(source,temp,fs.constants.COPYFILE_EXCL | fs.constants.COPYFILE_FICLONE);
    if (digest(fs.readFileSync(temp)) !== expected) throw new Error('Native runtime executable differs from the selected release');
    fs.chmodSync(temp,0o700);
    fs.renameSync(temp,destination);
    write(marker,expected);
  } finally { fs.rmSync(temp,{force:true}); }
  return destination;
}
function launchConfig(service, plan, options, l, binary) {
  const env = {...serviceEnvironment(l, options), ...plan.env};
  const port = String(service.port || new URL(service.endpoint).port || 80);
  const environment = {HOME:l.home};
  let args = [];
  if (l.id==='surrealdb') {
    const pin=options.database || databaseRelease(options.root || root);
    args = ['start','--bind','127.0.0.1:'+port,'surrealkv:'+path.join(l.dir,'data-v'+pin.major)];
    Object.assign(environment,{SURREAL_USER:env.SURREAL_ROOT_USERNAME,SURREAL_PASS:env.SURREAL_ROOT_PASSWORD,SURREAL_EXPERIMENTAL_UPGRADE_FROM_3X:'false'});
  } else if (l.id==='surreal-memory') {
    const db = plan.services.find(s=>s.id==='surrealdb' && s.provider!=='off')?.endpoint || env.SURREAL_ENDPOINT;
    if (!db) throw new Error('Select surrealdb or set SURREAL_ENDPOINT for the memory service');
    Object.assign(environment,{API_HOST:'127.0.0.1', API_PORT:port, MCP_STDIO:'false', SURREAL_MODE:'server',
      SURREAL_ENDPOINT:db.replace(/^http/,'ws'), SURREAL_NAMESPACE:env.SURREAL_NAMESPACE || 'memory',
      SURREAL_DATABASE:env.SURREAL_DATABASE || 'main_local_384', SURREAL_AUTH_LEVEL:env.SURREAL_AUTH_LEVEL || 'namespace',
      SURREAL_USERNAME:env.MEMORY_USERNAME || env.SURREAL_USERNAME, SURREAL_PASSWORD:env.MEMORY_PASSWORD || env.SURREAL_PASSWORD,
      EMBEDDING_PROVIDER:env.EMBEDDING_PROVIDER || 'local', LOCAL_EMBEDDING_MODEL:env.LOCAL_EMBEDDING_MODEL || 'BAAI/bge-small-en-v1.5',
      MODEL_CACHE_DIR:env.MODEL_CACHE_DIR || path.join(l.dir,'model-cache')});
    const modelOptions = ['LOCAL_EMBEDDING_MODEL_REVISION', 'LOCAL_EMBEDDING_DEVICE', 'LOCAL_EMBEDDING_DIMENSIONS'];
    if (env.EMBEDDING_PROVIDER === 'openai') modelOptions.push('OPENAI_EMBEDDING_MODEL', 'OPENAI_API_KEY');
    if (env.EMBEDDING_PROVIDER === 'cohere') modelOptions.push('COHERE_EMBEDDING_MODEL', 'COHERE_API_KEY');
    for (const key of modelOptions) if (env[key]) environment[key] = env[key];
  } else {
    const config = configPath(env,l.home);
    args = ['api','--host','127.0.0.1','--port',port,'--config',config];
    // Copy only variables explicitly referenced by the user's gateway config.
    for (const [,key] of read(config).matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) if (env[key]) environment[key]=env[key];
    if (env.LITER_LLM_MASTER_KEY) environment.LITER_LLM_MASTER_KEY=env.LITER_LLM_MASTER_KEY;
  }
  const revision = products[l.id] ? JSON.parse(read(receiptFile(binary))).sha256 : fs.statSync(binary).mtimeMs;
  return JSON.stringify({binary:supervisorBinary(l,binary),revision,args,environment,directory:l.dir})+'\n';
}

export default {
  defaults: () => [],
  supports: id => services.has(id) && ['darwin','linux'].includes(process.platform),
  validate,
  async apply(service, plan, options) {
    const l = locations(service.id,options), existing = ownedUnit(l), previous = read(l.config);
    const error = validate(service,plan,options); if (error) throw new Error(error);
    const binary = await nativeBinary(service.id,l,options);
    const config = launchConfig(service,plan,options,l,binary);
    const script = launcherSource();
    const oldRunner = read(l.runner), runnerMarker = path.join(l.dir,'runner.sha256');
    if (oldRunner !== null && (fs.lstatSync(l.runner).isSymbolicLink() || digest(oldRunner) !== read(runnerMarker))) {
      throw new Error('Preserving externally modified Mini launcher '+l.runner);
    }
    const superseded = read(runnerMarker);
    const unit = unitText(l), oldUnit = read(l.unit), marker = path.join(l.dir, 'unit.sha256');
    const registered = loaded(l);
    const running = registered && loaded(l, true);
    if (!existing && registered) throw new Error('The Mini supervisor label is already registered outside this installation');
    if (existing && previous === config && oldRunner === script && oldUnit === unit && running) return;
    if (existing) unload(l);
    try {
      write(l.config, config);
      write(l.runner, script);
      write(runnerMarker, digest(script));
      write(l.unit, unit);
      write(marker, digest(unit));
      start(l);
      // Only after the new job runs: a failed start restores the earlier unit, which still needs its launcher.
      removeSupersededLauncher(l, superseded);
    } catch (error) {
      if (loaded(l)) unload(l);
      if (oldRunner !== null) { write(l.runner,oldRunner); write(runnerMarker,digest(oldRunner)); }
      else { fs.rmSync(l.runner,{force:true}); fs.rmSync(runnerMarker,{force:true}); }
      if (previous !== null) write(l.config, previous); else fs.rmSync(l.config, {force:true});
      if (oldUnit !== null) {
        write(l.unit, oldUnit);
        write(marker, digest(oldUnit));
        if (running) start(l);
      } else {
        fs.rmSync(l.unit, {force:true});
        fs.rmSync(marker, {force:true});
      }
      throw error;
    }
  },
  async status(service, _plan, options) {
    const l = locations(service.id, options);
    const healthy = ownedUnit(l) && loaded(l, true);
    return {healthy, status:healthy ? 'active' : 'inactive'};
  },
  async stop(service, _plan, options) {
    const l=locations(service.id,options); if (ownedUnit(l)) unload(l);
  },
  async uninstall(service, _plan, options) {
    const l=locations(service.id,options); if (!ownedUnit(l)) return;
    const script = read(l.runner), runnerMarker = path.join(l.dir,'runner.sha256');
    if (script !== null && (fs.lstatSync(l.runner).isSymbolicLink() || read(runnerMarker) !== digest(script))) {
      throw new Error('Preserving externally modified Mini launcher '+l.runner);
    }
    unload(l);
    removeSupersededLauncher(l, read(runnerMarker));
    fs.rmSync(l.runner,{force:true}); fs.rmSync(runnerMarker,{force:true});
    if (products[l.id]) {
      const copied = path.join(l.dir,'bin',products[l.id]), marker = copied+'.sha256';
      if (fs.existsSync(copied) && !fs.lstatSync(copied).isSymbolicLink() && digest(fs.readFileSync(copied)) === read(marker)) {
        fs.unlinkSync(copied); fs.rmSync(marker,{force:true});
      }
    }
    fs.unlinkSync(l.unit); fs.rmSync(l.config,{force:true});
    fs.rmSync(path.join(l.dir, 'unit.sha256'), {force:true});
    if (!l.mac) run('systemctl',['--user','daemon-reload']);
  },
};
