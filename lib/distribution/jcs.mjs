// RFC 8785 JSON Canonicalization Scheme for cross-runtime closure digests.
function normalize(value, pointer = '') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`JCS: non-finite number at ${pointer || '<root>'}`);
    return value;
  }
  if (Array.isArray(value)) return value.map((entry, index) => normalize(entry, `${pointer}/${index}`));
  if (typeof value !== 'object' || typeof value.toJSON === 'function') {
    if (value && typeof value.toJSON === 'function') return normalize(value.toJSON(), pointer);
    throw new Error(`JCS: unsupported value at ${pointer || '<root>'}`);
  }
  const result = {};
  for (const key of Object.keys(value).sort()) result[key] = normalize(value[key], `${pointer}/${key}`);
  return result;
}

/** RFC 8785 JSON text, with no insignificant whitespace or trailing newline. */
export function jcs(value) {
  return JSON.stringify(normalize(value));
}
