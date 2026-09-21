// The two hashes a progress receipt carries, computed so they equal what the
// source pack's Python recorder computes for the same event.
//
// Python's recorder hashes json.dumps(event, ensure_ascii=False,
// separators=(",", ":"), sort_keys=True). JSON.stringify agrees with that on
// everything except one thing: a float. Python writes 0.0 where JavaScript
// writes 0, and after JSON.parse the two are the same number. Exactly one event
// field can be a float — elapsedHours — so it is serialised from a TOKEN:
//
//   - an event that arrived as text (--input, or the snapshot inside a stored
//     receipt) carries the token as it was written, because Python hashes the
//     integer 1 as "1" and the float 1.0 as "1.0";
//   - an event built here uses Python's float form, because the source pack
//     always calls float() on that path.
//
// Pure functions: data in, data out.
import { createHash } from 'node:crypto';

const FLOAT_FIELD = 'elapsedHours';
const IDENTITY_FIELDS = Object.freeze([
  'schemaVersion',
  'eventId',
  'runId',
  'boundary',
  'status',
  'phaseId',
  'changeId',
  'taskId',
]);
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
// After validation the only unescaped `"elapsedHours":` in an event's text is
// the top-level key: a string value would have its quotes escaped.
const FLOAT_FIELD_IN_TEXT = /"elapsedHours"\s*:\s*(-?[0-9][0-9.eE+-]*)/;

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

const serialise = (value, tokens, path) => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => serialise(item, tokens, null)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const members = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serialise(value[key], tokens, path === '' ? key : null)}`);
    return `{${members.join(',')}}`;
  }
  if (path !== null && Object.hasOwn(tokens, path)) return tokens[path];
  return JSON.stringify(value);
};

/** Sorted keys, compact separators, non-ASCII left as it is. */
export function canonicalJson(value, { tokens = {} } = {}) {
  return serialise(value, tokens, '');
}

/** How Python writes a float: an integer value gains `.0`. */
export function pythonFloatToken(value) {
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

/** Parse an event from text, keeping the elapsedHours token as it was written. */
export function eventFromText(text) {
  const event = JSON.parse(text);
  const match = FLOAT_FIELD_IN_TEXT.exec(text);
  return { event, elapsedHoursToken: match ? match[1] : null };
}

const checkedToken = (event, token) => {
  if (!JSON_NUMBER.test(token) || Number(token) !== event[FLOAT_FIELD]) {
    throw new TypeError(`${FLOAT_FIELD} token ${JSON.stringify(token)} is not the number in the event`);
  }
  return token;
};

/** SHA-256 of the event without observedAt, as the source pack's event_sha256. */
export function eventSha256(event, { elapsedHoursToken } = {}) {
  const { observedAt: _ignored, ...semantic } = event;
  const tokens =
    typeof semantic[FLOAT_FIELD] === 'number'
      ? { [FLOAT_FIELD]: checkedToken(semantic, elapsedHoursToken ?? pythonFloatToken(semantic[FLOAT_FIELD])) }
      : {};
  return sha256(canonicalJson(semantic, { tokens }));
}

/** SHA-256 over the eight identity fields, an absent one as null. */
export function eventIdentitySha256(event) {
  const identity = Object.fromEntries(IDENTITY_FIELDS.map((key) => [key, event[key] ?? null]));
  return sha256(canonicalJson(identity));
}
