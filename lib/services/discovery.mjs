import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const MAX_METADATA_BYTES = 1024 * 1024;
const GENERATION_POINTER = /^generations\/[a-f0-9]{64}$/;

async function readableFile(filename) {
  try {
    return (await fs.stat(filename)).isFile();
  } catch {
    return false;
  }
}

async function readJson(filename) {
  const stat = await fs.stat(filename);
  if (!stat.isFile() || stat.size > MAX_METADATA_BYTES) throw new Error(`Service metadata is not a bounded file: ${filename}`);
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}

async function activeGeneration(pluginRoot) {
  const pointer = path.join(pluginRoot, 'pointers', 'current');
  if (await readableFile(pointer)) {
    const relative = (await fs.readFile(pointer, 'utf8')).trim().replaceAll('\\', '/');
    if (!GENERATION_POINTER.test(relative)) throw new Error(`Invalid Prometheus generation pointer: ${pointer}`);
    return path.join(pluginRoot, ...relative.split('/'));
  }
  try {
    const resolved = await fs.realpath(path.join(pluginRoot, 'current'));
    const relative = path.relative(path.join(pluginRoot, 'generations'), resolved);
    if (!/^[a-f0-9]{64}$/.test(relative)) throw new Error('Current generation escapes the Prometheus store');
    return resolved;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function platformMarkers(home, platform) {
  if (platform === 'darwin') {
    const root = path.join(home, 'Library', 'LaunchAgents');
    return {
      surrealdb: path.join(root, 'ai.prometheus.surrealdb-native.plist'),
      memory: path.join(root, 'ai.prometheus.surreal-memory-native.plist'),
      liter: path.join(root, 'ai.prometheus.liter-llm-api.plist')
    };
  }
  if (platform === 'linux') {
    const root = path.join(home, '.config', 'systemd', 'user');
    return {
      surrealdb: path.join(root, 'ai.prometheus.surrealdb-native.service'),
      memory: path.join(root, 'ai.prometheus.surreal-memory-native.service'),
      liter: path.join(root, 'ai.prometheus.liter-llm-api.service')
    };
  }
  return {};
}

function candidate(service, endpoint, markers, extra = {}) {
  return {
    id: `${service}:${new URL(endpoint).href}`,
    service,
    endpoint: new URL(endpoint).href,
    provenance: [{
      source: 'full-pack',
      ownership: 'external',
      label: 'Prometheus full pack',
      markers,
      ...extra
    }]
  };
}

/**
 * Discover only documented full-pack locations and endpoints. This never scans
 * the network, reads service environments, imports credentials, or changes a
 * service owned by another installation.
 */
export async function discoverFullPackServices({
  home = os.homedir(),
  platform = process.platform,
  env = process.env
} = {}) {
  const rootMarkers = [];
  const serviceMarkers = { surrealdb: [], memory: [], liter: [] };
  const setupStatePath = path.join(home, '.prometheus', 'setup-state.json');
  let setupState = null;
  if (await readableFile(setupStatePath)) {
    setupState = await readJson(setupStatePath);
    rootMarkers.push(setupStatePath);
  }

  const pluginRoot = path.join(home, '.prometheus', 'plugins', 'prometheus-skill-pack');
  const generation = await activeGeneration(pluginRoot);
  let sourceVersion;
  if (generation) {
    const manifestPath = path.join(generation, 'manifest.json');
    const servicesPath = path.join(generation, 'shared', 'services.manifest.json');
    if (await readableFile(manifestPath)) {
      const manifest = await readJson(manifestPath);
      sourceVersion = typeof manifest.sourceVersion === 'string' ? manifest.sourceVersion : undefined;
      rootMarkers.push(manifestPath);
    }
    if (await readableFile(servicesPath)) {
      const manifest = await readJson(servicesPath);
      const labels = new Set(Array.isArray(manifest.services) ? manifest.services.map((service) => service?.label) : []);
      if (labels.has('ai.prometheus.surrealdb-native')) serviceMarkers.surrealdb.push(servicesPath);
      if (labels.has('ai.prometheus.surreal-memory-native')) serviceMarkers.memory.push(servicesPath);
      if (labels.has('ai.prometheus.liter-llm-api')) serviceMarkers.liter.push(servicesPath);
    }
  }

  for (const [service, filename] of Object.entries(platformMarkers(home, platform))) {
    if (await readableFile(filename)) serviceMarkers[service].push(filename);
  }

  const literConfigs = [
    path.join(home, '.config', 'liter-llm', 'liter-llm-proxy.toml'),
    ...(env.APPDATA ? [path.join(env.APPDATA, 'liter-llm', 'liter-llm-proxy.toml')] : [])
  ];
  const literConfig = (await Promise.all(literConfigs.map(async (filename) => await readableFile(filename) ? filename : null)))
    .find(Boolean);
  if (literConfig) serviceMarkers.liter.push(literConfig);

  const components = setupState?.components && typeof setupState.components === 'object' ? setupState.components : {};
  if (components['surreal-memory-server']) {
    serviceMarkers.surrealdb.push(setupStatePath);
    serviceMarkers.memory.push(setupStatePath);
  }
  if (components['liter-llm']) serviceMarkers.liter.push(setupStatePath);

  const candidates = [];
  if (serviceMarkers.surrealdb.length) {
    candidates.push(candidate('surrealdb', 'http://127.0.0.1:28000', [...new Set(serviceMarkers.surrealdb)], { sourceVersion }));
  }
  if (serviceMarkers.memory.length) {
    candidates.push(candidate('memory', 'http://127.0.0.1:23001/mcp/sse', [...new Set(serviceMarkers.memory)], { sourceVersion }));
  }
  if (serviceMarkers.liter.length) {
    candidates.push(candidate('liter', 'http://127.0.0.1:4000', [...new Set(serviceMarkers.liter)], {
      sourceVersion,
      ...(literConfig ? { configPath: literConfig } : {})
    }));
  }
  return { fullPack: { present: rootMarkers.length > 0, markers: rootMarkers }, candidates };
}
