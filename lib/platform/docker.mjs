import { spawnExecutable } from './spawn.mjs';

export function composeAvailable() {
  const result = spawnExecutable('docker', ['compose', 'version', '--short'], {
    timeout: 5000, windowsHide: true,
  });
  return { available: result.status === 0, version: result.stdout?.trim() || null };
}

export function detectDocker() {
  const result = spawnExecutable('docker', ['version', '--format', '{{json .}}'], {
    timeout: 8000, windowsHide: true,
  });
  if (result.error?.code === 'ENOENT') {
    return { state: 'absent', client: null, server: null, compose: false };
  }
  let version = {};
  try { version = JSON.parse(result.stdout || '{}'); } catch { /* Docker may emit only an error. */ }
  const compose = composeAvailable();
  return {
    state: result.status === 0 && version.Server ? 'running' : 'daemon-down',
    client: version.Client?.Version ?? null,
    server: version.Server?.Version ?? null,
    version: version.Server?.Version ?? version.Client?.Version ?? null,
    compose: compose.available,
    composeVersion: compose.version,
    detail: result.status === 0 ? undefined : (result.error?.message || result.stderr?.trim()),
  };
}

export function dockerState() {
  const found = detectDocker();
  return { ...found, state: found.state === 'running' ? 'ready' : found.state };
}
