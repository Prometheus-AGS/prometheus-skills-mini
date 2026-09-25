import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { detectDocker } from '../platform/docker.mjs';
import { discoverFullPackServices } from './discovery.mjs';

const DEFAULT_DIRECTORY = fileURLToPath(new URL('../../docker/', import.meta.url));
const SERVICES = new Set(['surrealdb', 'surreal-memory', 'liter-llm']);
const ACTIONS = new Set(['pull', 'up', 'stop', 'restart', 'down', 'status', 'logs']);
const OUTPUT_LIMIT = 256 * 1024;

export function composeArguments(action, service, directory = DEFAULT_DIRECTORY) {
  if (!ACTIONS.has(action)) throw new Error(`Unknown service action: ${action}`);
  if (service && !SERVICES.has(service)) throw new Error(`Unknown service: ${service}`);
  if (action === 'down' && service) throw new Error('down applies to the managed stack; use stop for one service');
  const args = ['compose', '--project-name', 'the-boss-prometheus', '--project-directory', path.resolve(directory),
    '--env-file', path.join(path.resolve(directory), '.env'), '-f', path.join(path.resolve(directory), 'compose.yaml')];
  if (action === 'status') args.push('ps', '--all', '--format', 'json');
  else if (action === 'up') args.push('up', '-d', '--no-build');
  else if (action === 'logs') args.push('logs', '--no-color', '--tail', 'all');
  else args.push(action);
  if (service) args.push(service);
  return args;
}

export function runCompose(action, { service, directory = DEFAULT_DIRECTORY, signal, onOutput, env } = {}) {
  const args = composeArguments(action, service, directory);
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { shell: false, windowsHide: true,
      env: { ...process.env, ...env }, signal, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const append = (chunk) => {
      const text = chunk.toString();
      output = (output + text).slice(-OUTPUT_LIMIT);
      onOutput?.(text);
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.once('error', reject);
    child.once('close', (code) => resolve({ action, service: service ?? null, code, output }));
  });
}

async function endpointStatus(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    await response.body?.cancel();
    return { url, reached: true, status: response.status, operational: false };
  } catch (error) {
    return { url, reached: false, detail: error.message, operational: false };
  }
}

export async function serviceStatus({ directory = DEFAULT_DIRECTORY, endpoints, external = false } = {}) {
  const docker = detectDocker();
  const urls = endpoints ?? {
    surrealdb: 'http://127.0.0.1:28000/health',
    memory: 'http://127.0.0.1:23001/health',
    gateway: 'http://127.0.0.1:4000/health',
  };
  const checks = await Promise.all(Object.entries(urls).map(async ([name, url]) => [name, await endpointStatus(url)]));
  const containers = !external && docker.state === 'running' && docker.compose
    ? await runCompose('status', { directory }) : null;
  return { docker, endpoints: Object.fromEntries(checks), containers };
}

export async function runServiceCommand(argv, { signal, onOutput } = {}) {
  const [action = 'status', ...rest] = argv;
  if (action === 'discover') {
    if (rest.some((value) => value !== '--json')) throw new Error('discover accepts only --json');
    return { code: 0, ...await discoverFullPackServices() };
  }
  let directory = DEFAULT_DIRECTORY;
  let service;
  let endpoints;
  let external = false;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--directory') {
      if (!rest[i + 1]) throw new Error('--directory requires a path');
      directory = rest[++i];
    } else if (rest[i] === '--endpoints') {
      endpoints = JSON.parse(rest[++i]);
    } else if (rest[i] === '--external') {
      external = true;
    } else if (rest[i] !== '--json') {
      if (service) throw new Error('Only one service may be selected');
      service = rest[i];
    }
  }
  composeArguments(action, service, directory);
  if (action === 'status') return serviceStatus({ directory, endpoints, external });
  if (external) throw new Error('External services are not managed by The Boss');
  const docker = detectDocker();
  if (docker.state !== 'running' || !docker.compose) {
    return { code: 2, docker, message: docker.state === 'absent'
      ? 'Install Docker Desktop or Docker Engine with Compose.'
      : 'Start Docker and enable Compose before managing services.' };
  }
  return runCompose(action, { service, directory, signal, onOutput });
}
