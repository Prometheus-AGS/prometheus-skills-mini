// Port of shared/scripts/lib/kbd-model-resolve.sh's role/gateway resolution
// half, as consumed by dispatch-judge.sh and preflight-models.sh
// (prometheus-skill-pack). Source shape verified against a live
// ~/.prometheus/kbd/models.toml (see references/model-configuration.md).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelsToml, resolveRole, resolveGateway, sameModel } from './model-resolution.mjs';

const SAMPLE_TOML = `
[gateway]
candidates = ["http://localhost:4000/v1", "http://localhost:8181/v1"]

[roles]
generator = "kbd-frontier"
critic = "MiniMax-M3"
judge = "gpt-5.5"
`;

test('parseModelsToml extracts the [roles] table', () => {
  const parsed = parseModelsToml(SAMPLE_TOML);
  assert.deepEqual(parsed.roles, { generator: 'kbd-frontier', critic: 'MiniMax-M3', judge: 'gpt-5.5' });
});

test('parseModelsToml extracts the [gateway] candidates array', () => {
  const parsed = parseModelsToml(SAMPLE_TOML);
  assert.deepEqual(parsed.gateway.candidates, ['http://localhost:4000/v1', 'http://localhost:8181/v1']);
});

test('parseModelsToml never throws on malformed input — returns an empty shape instead', () => {
  const parsed = parseModelsToml('this is not { valid toml [[[');
  assert.deepEqual(parsed, { roles: {}, gateway: { candidates: [] } });
});

test('parseModelsToml handles a missing/empty string gracefully', () => {
  assert.deepEqual(parseModelsToml(''), { roles: {}, gateway: { candidates: [] } });
  assert.deepEqual(parseModelsToml(undefined), { roles: {}, gateway: { candidates: [] } });
});

test('resolveRole precedence: explicit arg wins over everything', () => {
  const result = resolveRole('judge', {
    explicit: 'explicit-model',
    env: { PROMETHEUS_KBD_JUDGE_MODEL: 'env-model' },
    modelsToml: { roles: { judge: 'toml-model' } },
  });
  assert.deepEqual(result, { model: 'explicit-model', source: 'explicit' });
});

test('resolveRole precedence: env var wins over models.toml', () => {
  const result = resolveRole('judge', {
    env: { PROMETHEUS_KBD_JUDGE_MODEL: 'env-model' },
    modelsToml: { roles: { judge: 'toml-model' } },
  });
  assert.deepEqual(result, { model: 'env-model', source: 'env' });
});

test('resolveRole precedence: models.toml wins over the built-in default', () => {
  const result = resolveRole('judge', { env: {}, modelsToml: { roles: { judge: 'toml-model' } } });
  assert.deepEqual(result, { model: 'toml-model', source: 'models.toml' });
});

test('resolveRole falls back to the built-in default (kbd-<role>) when nothing else resolves', () => {
  const result = resolveRole('judge', { env: {}, modelsToml: { roles: {} } });
  assert.deepEqual(result, { model: 'kbd-judge', source: 'built-in-default' });
});

test('resolveGateway prefers LITER_LLM_BASE_URL over every candidate', () => {
  const result = resolveGateway({
    env: { LITER_LLM_BASE_URL: 'http://override:9/v1' },
    modelsToml: { gateway: { candidates: ['http://a/v1'] } },
    probe: async () => true,
  });
  return result.then((url) => assert.equal(url, 'http://override:9/v1'));
});

test('resolveGateway probes candidates in order and returns the first reachable one', async () => {
  const seen = [];
  const url = await resolveGateway({
    env: {},
    modelsToml: { gateway: { candidates: ['http://a/v1', 'http://b/v1'] } },
    probe: async (u) => {
      seen.push(u);
      return u === 'http://b/v1';
    },
  });
  assert.equal(url, 'http://b/v1');
  assert.deepEqual(seen, ['http://a/v1', 'http://b/v1']);
});

test('resolveGateway falls back to the canonical default candidates when models.toml has none', async () => {
  const url = await resolveGateway({
    env: {},
    modelsToml: { gateway: { candidates: [] } },
    probe: async (u) => u === 'http://localhost:8181/v1',
  });
  assert.equal(url, 'http://localhost:8181/v1');
});

test('resolveGateway returns null when nothing answers', async () => {
  const url = await resolveGateway({ env: {}, modelsToml: { gateway: { candidates: [] } }, probe: async () => false });
  assert.equal(url, null);
});

test('sameModel compares loosely by basename, ignoring a provider/ prefix', () => {
  assert.equal(sameModel('openai/gpt-5.5', 'gpt-5.5'), true);
  assert.equal(sameModel('gpt-5.5', 'gpt-5.4'), false);
  assert.equal(sameModel('', 'gpt-5.5'), false);
});
