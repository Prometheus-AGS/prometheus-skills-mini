// A stand-in for the surreal-memory REST service, for cases that declare `memory`.
//
// The agent under test runs the real packaged lookup script; this answers it on a loopback port so
// no sample ever reaches the operator's real memory service or knowledge base. Each search writes
// one marker file in the case project, so "exactly one lookup" is a file effect a deterministic
// check reads, not something the agent reports about itself.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';

const DEAD_ENDPOINT = 'http://127.0.0.1:1';

/** A pk that answers: any system program that exits 0 and prints its arguments. */
function pkProgram(mode, scratchRoot) {
  if (mode !== 'present') return path.join(scratchRoot, 'no-pk-installed');
  if (process.platform === 'win32') throw new Error('no stand-in pk executable on Windows; this case is not exercised there');
  return '/bin/echo';
}

/**
 * Environment and lifecycle for one sample's memory sources.
 * @param {{surreal?: 'seeded'|'down', pk?: 'present'|'absent', lesson?: string}} memory
 * @param {{project: string, scratchRoot: string}} where
 * @returns {Promise<{env: Record<string,string>, close: () => Promise<void>}>}
 */
export async function startMemorySources(memory = {}, { project, scratchRoot }) {
  const env = { PK_BIN: pkProgram(memory.pk ?? 'absent', scratchRoot) };
  if ((memory.surreal ?? 'down') !== 'seeded') {
    return { env: { ...env, KBD_MEMORY_MCP_URL: DEAD_ENDPOINT, UAR_MEMORY_MCP_URL: DEAD_ENDPOINT }, close: async () => {} };
  }

  let searches = 0;
  const server = http.createServer((request, response) => {
    request.resume();
    request.on('end', () => {
      const isSearch = request.method === 'POST' && request.url.endsWith('/api/v1/search');
      if (isSearch) {
        searches += 1;
        const marker = path.join(project, '.eval-markers', `memory-search-${searches}`);
        fs.mkdirSync(path.dirname(marker), { recursive: true });
        fs.writeFileSync(marker, new Date().toISOString() + '\n');
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(isSearch ? [{ content: memory.lesson ?? '', created_at: '2026-11-01T00:00:00Z' }] : { status: 'ok' }));
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  return {
    env: { ...env, KBD_MEMORY_MCP_URL: endpoint, UAR_MEMORY_MCP_URL: endpoint },
    close: async () => { server.closeAllConnections(); server.close(); await once(server, 'close'); },
  };
}
