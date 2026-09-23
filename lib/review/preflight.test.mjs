// Port of adversarial-review/scripts/preflight-models.sh (prometheus-skill-pack, 286 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectProviders, detectConfigDefects, computeStatus, isCacheFresh } from './preflight.mjs';

test('detectProviders reports presence from canonical env vars', () => {
  const result = detectProviders({ ANTHROPIC_API_KEY: 'x', OPENAI_API_KEY: 'y' });
  assert.equal(result.providers.anthropic.present, true);
  assert.equal(result.providers.openai.present, true);
  assert.equal(result.providers.groq.present, false);
});

test('detectProviders computes coverage per class from present providers', () => {
  const result = detectProviders({ GROQ_API_KEY: 'x' });
  assert.ok(result.coverage.small.includes('groq'));
  assert.ok(!result.coverage.frontier.includes('groq'));
});

test('detectConfigDefects flags a missing [general] master_key', () => {
  const toml = '[general]\n# no master_key here\n';
  const defects = detectConfigDefects(toml);
  assert.ok(defects.some((d) => d.includes('master_key')));
});

test('detectConfigDefects accepts a master_key OR a [[keys]] table', () => {
  assert.deepEqual(detectConfigDefects('[general]\nmaster_key = "${X}"\n'), []);
  assert.deepEqual(detectConfigDefects('[[keys]]\nname="a"\n'), []);
});

test('detectConfigDefects flags a localhost base_url with no outbound_policy', () => {
  const toml = '[general]\nmaster_key = "${X}"\n\n[[models]]\nbase_url = "http://localhost:8181/v1"\n';
  const defects = detectConfigDefects(toml);
  assert.ok(defects.some((d) => d.includes('outbound_policy')));
});

test('detectConfigDefects is clean when outbound_policy is present alongside a localhost base_url', () => {
  const toml =
    '[general]\nmaster_key = "${X}"\n\n[security]\noutbound_policy = "off"\n\n[[models]]\nbase_url = "http://localhost:8181/v1"\n';
  assert.deepEqual(detectConfigDefects(toml), []);
});

test('computeStatus: unavailable when the liter-llm binary is missing', () => {
  const status = computeStatus({ binaryPresent: false, gateway: '', configDefects: [], judgeModel: '', distinctModels: 0 });
  assert.equal(status, 'unavailable');
});

test('computeStatus: no_gateway when nothing answered the probe', () => {
  const status = computeStatus({ binaryPresent: true, gateway: '', configDefects: [], judgeModel: 'x', distinctModels: 2 });
  assert.equal(status, 'no_gateway');
});

test('computeStatus: config_broken when config defects are present', () => {
  const status = computeStatus({
    binaryPresent: true,
    gateway: 'http://x/v1',
    configDefects: ['missing master_key'],
    judgeModel: 'x',
    distinctModels: 2,
  });
  assert.equal(status, 'config_broken');
});

test('computeStatus: needs_configure when no judge role resolves', () => {
  const status = computeStatus({ binaryPresent: true, gateway: 'http://x/v1', configDefects: [], judgeModel: '', distinctModels: 0 });
  assert.equal(status, 'needs_configure');
});

test('computeStatus: degraded when fewer than 2 distinct dispatchable models exist', () => {
  const status = computeStatus({ binaryPresent: true, gateway: 'http://x/v1', configDefects: [], judgeModel: 'x', distinctModels: 1 });
  assert.equal(status, 'degraded');
});

test('computeStatus: ok when everything resolves', () => {
  const status = computeStatus({ binaryPresent: true, gateway: 'http://x/v1', configDefects: [], judgeModel: 'x', distinctModels: 2 });
  assert.equal(status, 'ok');
});

test('isCacheFresh is false when the cache is older than 24h', () => {
  const now = Date.now();
  const cacheMtime = now - 25 * 60 * 60 * 1000;
  assert.equal(isCacheFresh({ cacheMtimeMs: cacheMtime, configMtimeMs: null, nowMs: now }), false);
});

test('isCacheFresh is false when the config file is newer than the cache', () => {
  const now = Date.now();
  assert.equal(isCacheFresh({ cacheMtimeMs: now - 1000, configMtimeMs: now, nowMs: now }), false);
});

test('isCacheFresh is true within 24h and with no newer config', () => {
  const now = Date.now();
  assert.equal(isCacheFresh({ cacheMtimeMs: now - 1000, configMtimeMs: now - 5000, nowMs: now }), true);
});
