// Port of the per-field cap block inside adversarial-review/scripts/build-review-packet.sh
// (prometheus-skill-pack, 919 lines) — "per-field cap, recorded in the packet".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFieldCap } from './truncation.mjs';

test('applyFieldCap leaves short fields untouched and records any_truncated: false', () => {
  const packet = { a: 'short', b: 'also short' };
  const result = applyFieldCap(packet, { capBytes: 1000 });
  assert.equal(result.packet.a, 'short');
  assert.equal(result.packet.truncation.any_truncated, false);
  assert.deepEqual(result.packet.truncation.fields, []);
});

test('applyFieldCap clips an oversized field on a line boundary and appends a TRUNCATED marker', () => {
  const long = Array.from({ length: 2000 }, (_, i) => `line ${i}`).join('\n');
  const packet = { big: long };
  const result = applyFieldCap(packet, { capBytes: 1000 });
  assert.ok(result.packet.big.length <= 1000 + 200); // clipped plus marker text
  assert.match(result.packet.big, /\[TRUNCATED by build-review-packet/);
  assert.equal(result.packet.truncation.any_truncated, true);
  assert.equal(result.packet.truncation.fields[0].field, 'big');
  assert.equal(result.packet.truncation.fields[0].original_bytes, long.length);
});

test('applyFieldCap enforces a floor of 1000 bytes even if a smaller cap is requested', () => {
  const packet = { x: 'y'.repeat(2000) };
  const result = applyFieldCap(packet, { capBytes: 10 });
  assert.equal(result.packet.truncation.cap_bytes_per_field, 1000);
});

test('applyFieldCap defaults to 40000 bytes when no cap is given', () => {
  const packet = { x: 'short' };
  const result = applyFieldCap(packet, {});
  assert.equal(result.packet.truncation.cap_bytes_per_field, 40000);
});

test('applyFieldCap only caps string fields, leaving non-string fields alone', () => {
  const packet = { obj: { nested: true }, arr: [1, 2, 3] };
  const result = applyFieldCap(packet, { capBytes: 1000 });
  assert.deepEqual(result.packet.obj, { nested: true });
  assert.deepEqual(result.packet.arr, [1, 2, 3]);
});
