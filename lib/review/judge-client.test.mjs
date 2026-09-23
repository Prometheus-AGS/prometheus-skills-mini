// Port of the dispatch (request-build + curl-retry-escalation) half of
// adversarial-review/scripts/dispatch-judge.sh (prometheus-skill-pack, 379 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequestBody, dispatchJudge, JudgeUnavailableError } from './judge-client.mjs';

test('buildRequestBody sends temperature=0 by default for a deterministic judge', () => {
  const body = buildRequestBody({ model: 'claude-opus-5', system: 'mandate text', packet: '{"a":1}' });
  assert.equal(body.temperature, 0);
  assert.equal(body.model, 'claude-opus-5');
  assert.deepEqual(body.messages, [
    { role: 'system', content: 'mandate text' },
    { role: 'user', content: '{"a":1}' },
  ]);
});

test('buildRequestBody omits temperature for a model that rejects any value but 1', () => {
  const body = buildRequestBody({ model: 'k3', system: 's', packet: 'p' });
  assert.equal('temperature' in body, false);
});

test('buildRequestBody checks fixed-temperature models by prefix', () => {
  for (const model of ['kimi-for-coding/k3', 'o1-preview', 'o3-mini', 'gpt-5-thinking']) {
    const body = buildRequestBody({ model, system: 's', packet: 'p' });
    assert.equal('temperature' in body, false, `expected ${model} to omit temperature`);
  }
});

test('buildRequestBody appends rejection feedback to the system prompt when supplied', () => {
  const body = buildRequestBody({ model: 'gpt-5.5', system: 'mandate', packet: 'p', feedback: 'try harder' });
  assert.match(body.messages[0].content, /Previous report rejected/);
  assert.match(body.messages[0].content, /try harder/);
});

test('dispatchJudge posts to <base>/chat/completions with a Bearer token and returns the completion text', async () => {
  let seenUrl, seenAuth, seenBody;
  const fetchImpl = async (url, opts) => {
    seenUrl = url;
    seenAuth = opts.headers.authorization;
    seenBody = JSON.parse(opts.body);
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'the completion' } }] }) };
  };

  const result = await dispatchJudge({
    baseUrl: 'http://localhost:8181/v1',
    authToken: 'sk-local',
    model: 'gpt-5.5',
    system: 'mandate',
    packet: '{}',
    fetchImpl,
  });

  assert.equal(seenUrl, 'http://localhost:8181/v1/chat/completions');
  assert.equal(seenAuth, 'Bearer sk-local');
  assert.equal(seenBody.model, 'gpt-5.5');
  assert.equal(result, 'the completion');
});

test('dispatchJudge throws JudgeUnavailableError on a 401/403 without retrying', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: false, status: 401, text: async () => '{"error":"bad credential"}' };
  };

  await assert.rejects(
    dispatchJudge({ baseUrl: 'http://x/v1', authToken: 't', model: 'm', system: 's', packet: 'p', fetchImpl }),
    JudgeUnavailableError,
  );
  assert.equal(calls, 1);
});

test('dispatchJudge escalates the timeout and retries on a network-shaped failure (fetch throws)', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls < 3) throw new Error('network timeout');
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
  };

  const result = await dispatchJudge({
    baseUrl: 'http://x/v1',
    authToken: 't',
    model: 'm',
    system: 's',
    packet: 'p',
    fetchImpl,
    maxAttempts: 3,
    initialTimeoutMs: 10,
    sleepImpl: async () => {},
  });

  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('dispatchJudge gives up after maxAttempts network-shaped failures', async () => {
  const fetchImpl = async () => {
    throw new Error('ECONNRESET');
  };

  await assert.rejects(
    dispatchJudge({
      baseUrl: 'http://x/v1',
      authToken: 't',
      model: 'm',
      system: 's',
      packet: 'p',
      fetchImpl,
      maxAttempts: 2,
      initialTimeoutMs: 5,
      sleepImpl: async () => {},
    }),
    JudgeUnavailableError,
  );
});

test('dispatchJudge treats a 502/503/504 with a network/timeout body as retryable', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return { ok: false, status: 502, text: async () => 'upstream Network timeout' };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
  };

  const result = await dispatchJudge({
    baseUrl: 'http://x/v1',
    authToken: 't',
    model: 'm',
    system: 's',
    packet: 'p',
    fetchImpl,
    maxAttempts: 3,
    initialTimeoutMs: 5,
    sleepImpl: async () => {},
  });
  assert.equal(result, 'ok');
});

test('dispatchJudge treats a non-timeout-shaped 5xx as a hard error, not retryable', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: false, status: 500, text: async () => 'internal server error, no keyword' };
  };

  await assert.rejects(
    dispatchJudge({ baseUrl: 'http://x/v1', authToken: 't', model: 'm', system: 's', packet: 'p', fetchImpl }),
    JudgeUnavailableError,
  );
  assert.equal(calls, 1);
});

test('dispatchJudge throws JudgeUnavailableError when the endpoint returns an error payload', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ error: { message: 'model not found' } }) });

  await assert.rejects(
    dispatchJudge({ baseUrl: 'http://x/v1', authToken: 't', model: 'm', system: 's', packet: 'p', fetchImpl }),
    /model not found/,
  );
});

test('dispatchJudge throws JudgeUnavailableError on an empty completion', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ choices: [] }) });

  await assert.rejects(
    dispatchJudge({ baseUrl: 'http://x/v1', authToken: 't', model: 'm', system: 's', packet: 'p', fetchImpl }),
    JudgeUnavailableError,
  );
});
