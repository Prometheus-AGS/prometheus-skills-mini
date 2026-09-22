import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outcomeConformance, checkConformance } from './contract.mjs';
import { checks } from './services.mjs';

const byId = (id) => {
  const check = checks.find((c) => c.id === id);
  assert.ok(check, `no check ${id}`);
  return check;
};

const run = async (id, ctx) => {
  const outcome = await byId(id).run(ctx);
  assert.deepEqual(outcomeConformance(outcome, id), [], JSON.stringify(outcome));
  return outcome;
};

const ok = (body = {}) => async () => ({ ok: true, status: 200, json: async () => body, text: async () => '' });
const status = (code) => async () => ({ ok: code < 400, status: code, json: async () => ({}), text: async () => '' });
const unreachable = () => async () => {
  throw Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:8000'), { code: 'ECONNREFUSED' });
};

// `lib/platform/docker.mjs` is created by change `docker-services`. Until it lands this
// check must SKIP with the reason — never pass, which would report a Docker verdict it
// never reached, and never fail, which would make a not-yet-built dependency look broken.
test('mini-docker skips when the platform module is absent', async () => {
  const outcome = await run('mini-docker', { loadDocker: async () => null });

  assert.equal(outcome.status, 'skip');
  assert.match(outcome.summary + outcome.detail, /docker-services|not.*(yet|available)|absent/i);
});

test('mini-docker warns, not fails, when Docker is simply not installed', async () => {
  const outcome = await run('mini-docker', {
    loadDocker: async () => ({ detectDocker: () => ({ state: 'absent' }) }),
  });

  assert.equal(outcome.status, 'warn');
  assert.match(outcome.summary + outcome.detail, /docker/i);
});

test('mini-docker fails when Docker is installed but its daemon is unreachable', async () => {
  const outcome = await run('mini-docker', {
    loadDocker: async () => ({
      detectDocker: () => ({ state: 'installed-not-running', detail: 'Cannot connect to the Docker daemon' }),
    }),
  });

  assert.equal(outcome.status, 'fail');
  assert.match(outcome.summary + outcome.detail, /daemon|running/i);
});

test('mini-docker passes when the daemon answers', async () => {
  const outcome = await run('mini-docker', {
    loadDocker: async () => ({ detectDocker: () => ({ state: 'running', version: '27.1.1' }) }),
  });

  assert.equal(outcome.status, 'pass');
  assert.match(outcome.summary, /27\.1\.1/);
});

for (const [id, url] of [
  ['mini-service-surreal-memory', 'http://localhost:8000'],
  ['mini-service-liter-llm', 'http://localhost:4000'],
]) {
  test(`${id} passes when its health endpoint answers 200`, async () => {
    const outcome = await run(id, { fetch: ok() });

    assert.equal(outcome.status, 'pass');
  });

  // Everything must still work with both services down: absent is a warning, not a failure.
  test(`${id} warns when nothing is listening`, async () => {
    const outcome = await run(id, { fetch: unreachable() });

    assert.equal(outcome.status, 'warn');
    assert.match(outcome.summary + outcome.detail, new RegExp(url.replace(/[.:/]/g, '\\$&')));
  });

  // Something IS listening and answering wrongly — that is a real fault, not an absence.
  test(`${id} fails when the endpoint answers non-200`, async () => {
    const outcome = await run(id, { fetch: status(500) });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.summary + outcome.detail, /500/);
  });

  test(`${id} does not hang forever on a silent socket`, async () => {
    const outcome = await run(id, {
      fetch: async (_url, { signal } = {}) => {
        // Mimic fetch's behaviour when the caller's AbortSignal fires.
        if (signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
        throw Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
      },
      timeoutMs: 1,
    });

    assert.equal(outcome.status, 'warn');
    assert.match(outcome.summary + outcome.detail, /timed out|abort/i);
  });
}

// A 401 means the gateway is up and requires a key — which is liter-llm's documented
// posture, not a fault of the service.
test('mini-service-liter-llm treats 401 as up-and-authenticated, not broken', async () => {
  const outcome = await run('mini-service-liter-llm', { fetch: status(401) });

  assert.equal(outcome.status, 'pass');
  assert.match(outcome.summary + (outcome.detail ?? ''), /401|key|auth/i);
});

test('every check in this group satisfies the contract statically', () => {
  for (const check of checks) assert.deepEqual(checkConformance(check), [], check.id);
});
