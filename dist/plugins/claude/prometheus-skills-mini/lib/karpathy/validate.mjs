// Validates a progress event exactly as the source pack's validate_event does
// (record-progress.py:199-282), so an event one pack accepts the other accepts.
//
// This is a trust boundary (A-3). The event comes from hook environment
// variables or an --input file and ends up in an append-only session log and a
// receipt that nothing un-writes. Every check here is a port of an upstream
// check; the two departures are stated where they occur.
//
// Pure: data in, a list of reasons out. An empty list means the event is valid.
// No reason ever contains a value from the event — a refusal ends up in a hook
// log, and field checks run before the pattern scan, so an echoed value could
// carry exactly what the scan exists to keep out.
import path from 'node:path';
import { canonicalJson, pythonFloatToken, PYTHON_DEFAULT_SEPARATORS } from './hash.mjs';

/** Upstream's message says "256 KiB"; its check is 256_000, and that is the contract. */
export const MAX_EVENT_BYTES = 256_000;
/** Below this, Python writes 1e-05 where JavaScript writes 0.00001: the hash would not port. */
const SMALLEST_PORTABLE_ELAPSED = 0.0001;

export const ALLOWED_FIELDS = Object.freeze([
  'schemaVersion', 'eventId', 'observedAt', 'runId', 'boundary', 'status', 'phaseId',
  'changeId', 'taskId', 'taskClass', 'elapsedHours', 'touchedFiles',
  'verification', 'commitSha', 'blocker', 'exactNextWork',
]);
const BOUNDARIES = Object.freeze(['task', 'change', 'phase']);
const STATUSES = Object.freeze(['in_progress', 'complete', 'blocked', 'cancelled']);
const TASK_CLASSES = Object.freeze(['product', 'research', 'evidence', 'integration', 'release']);
const VERIFICATION_KEYS = Object.freeze(['command', 'exitCode', 'summary']);

const EVENT_ID = /^[A-Za-z0-9._:-]{8,128}$/;
const COMMIT = /^[0-9a-fA-F]{7,64}$/;
const SHOWABLE_KEY = /^[A-Za-z0-9_.-]{1,40}$/;
// Narrower than upstream's datetime.fromisoformat on purpose: every timestamp
// either pack WRITES has this shape, and Date.parse alone is wider than upstream
// (it reads "Sep 21 2026", and rolls 2026-02-30 over to March 2).
const OBSERVED_AT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-](\d{2}):(\d{2}))$/;

const MAX_TOUCHED_FILES = 500;
const MAX_TOUCHED_FILE_LENGTH = 1000;
const MAX_VERIFICATION_RECORDS = 100;
const MAX_COMMAND_LENGTH = 2000;
const MAX_TEXT_LENGTH = 4000;

/**
 * The source pack's pattern (record-progress.py:22-27), one entry per top-level
 * alternative. It is a list so a test can remove each in turn and prove that
 * exactly its value gets through. Upstream opens with (?i): all seven ignore case.
 */
export const SECRET_ALTERNATIVES = Object.freeze([
  { name: 'credential assignment', source: '(?:api[_-]?key|access[_-]?token|password|secret)\\s*[:=]\\s*\\S+' },
  { name: 'bearer token', source: 'bearer\\s+[A-Za-z0-9._~+/=-]{12,}' },
  { name: 'PEM private key', source: '-----BEGIN [A-Z ]*PRIVATE KEY-----' },
  { name: 'GitHub token', source: 'gh[pousr]_[A-Za-z0-9]{20,}' },
  { name: 'Slack token', source: 'xox[baprs]-[A-Za-z0-9-]{10,}' },
  { name: 'AWS key id', source: 'AKIA[0-9A-Z]{16}' },
  { name: 'sk- key', source: 'sk-(?:proj-)?[A-Za-z0-9_-]{16,}' },
]);

export function secretPattern(alternatives = SECRET_ALTERNATIVES) {
  return new RegExp(alternatives.map((alternative) => alternative.source).join('|'), 'i');
}

// Python's len() counts code points; String.length counts UTF-16 units.
const codePoints = (text) => [...text].length;
const isString = (value) => typeof value === 'string';
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const requiredString = (event, key, limit) =>
  isString(event[key]) && event[key] !== '' && codePoints(event[key]) <= limit
    ? []
    : [`${key} must be a non-empty string no longer than ${limit} characters`];

const nullableRequiredString = (event, key, limit) =>
  event[key] === null || event[key] === undefined ? [] : requiredString(event, key, limit);

const nullableText = (event, key) =>
  event[key] === null || event[key] === undefined || (isString(event[key]) && codePoints(event[key]) <= MAX_TEXT_LENGTH)
    ? []
    : [`${key} must be null or a string no longer than ${MAX_TEXT_LENGTH} characters`];

const unknownFields = (event) => {
  const unknown = Object.keys(event).filter((key) => !ALLOWED_FIELDS.includes(key)).sort();
  if (unknown.length === 0) return [];
  const showable = unknown.filter((key) => SHOWABLE_KEY.test(key));
  const hidden = unknown.length - showable.length;
  const named = [...showable, ...(hidden > 0 ? [`${hidden} that cannot be shown`] : [])].join(', ');
  return [`unknown progress event fields: ${named}`];
};

const daysIn = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const observedAt = (event) => {
  const bad = ['observedAt must be an ISO 8601 timestamp with a time and an offset, no longer than 64 characters'];
  if (!isString(event.observedAt) || codePoints(event.observedAt) > 64) return bad;
  const match = OBSERVED_AT.exec(event.observedAt);
  if (!match) return bad;
  // For "Z" the offset groups are undefined, and Number(undefined) is NaN.
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = match
    .slice(1)
    .map((group) => (group === undefined ? 0 : Number(group)));
  // The calendar fields are checked directly. Comparing a UTC round trip would
  // wrongly refuse 23:30-05:00, whose UTC date is the next day.
  const real =
    month >= 1 && month <= 12 && day >= 1 && day <= daysIn(year, month) &&
    hour <= 23 && minute <= 59 && second <= 59 && offsetHour <= 23 && offsetMinute <= 59;
  return real ? [] : bad;
};

const elapsedHours = (event) => {
  const value = event.elapsedHours;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000) {
    return ['elapsedHours must be a number between 0 and 1000'];
  }
  // This pack's one addition to upstream's checks.
  return value > 0 && value < SMALLEST_PORTABLE_ELAPSED
    ? [`elapsedHours between 0 and ${SMALLEST_PORTABLE_ELAPSED} cannot be hashed portably`]
    : [];
};

// Upstream tests both conventions on every OS (Path and PureWindowsPath), and so
// does this. One departure: Node's win32.isAbsolute also calls a rooted "\foo"
// absolute where Python does not; refusing it is the safe side.
const isUnsafePath = (entry) =>
  path.posix.isAbsolute(entry) || path.win32.isAbsolute(entry) || entry.split(/[\\/]/).includes('..');

const touchedFiles = (event) => {
  const files = event.touchedFiles;
  if (!Array.isArray(files) || files.length > MAX_TOUCHED_FILES || new Set(files).size !== files.length) {
    return [`touchedFiles must be a unique array of at most ${MAX_TOUCHED_FILES} paths`];
  }
  return files.flatMap((entry, index) =>
    isString(entry) && entry !== '' && codePoints(entry) <= MAX_TOUCHED_FILE_LENGTH && !isUnsafePath(entry)
      ? []
      : [`touchedFiles[${index}] is not a safe relative path`],
  );
};

const verificationRecord = (record, index) => {
  const where = `verification[${index}]`;
  const keys = isPlainObject(record) ? Object.keys(record).sort() : [];
  if (keys.length !== VERIFICATION_KEYS.length || !VERIFICATION_KEYS.every((key) => keys.includes(key))) {
    return [`${where} requires exactly command, exitCode and summary`];
  }
  const { command, exitCode, summary } = record;
  return [
    ...(isString(command) && command !== '' && codePoints(command) <= MAX_COMMAND_LENGTH ? [] : [`${where} command is invalid`]),
    ...(Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= 255 ? [] : [`${where} exitCode is invalid`]),
    ...(isString(summary) && codePoints(summary) <= MAX_TEXT_LENGTH ? [] : [`${where} summary is invalid`]),
  ];
};

const verification = (event) =>
  Array.isArray(event.verification) && event.verification.length <= MAX_VERIFICATION_RECORDS
    ? event.verification.flatMap(verificationRecord)
    : [`verification must be an array of at most ${MAX_VERIFICATION_RECORDS} records`];

const subjects = (event) => [
  ...(['task', 'change'].includes(event.boundary) && !event.changeId ? [`${event.boundary} boundary requires changeId`] : []),
  ...(event.boundary === 'task' && !event.taskId ? ['task boundary requires taskId'] : []),
];

// Measured and scanned on the serialisation upstream uses for both: sorted keys,
// json.dumps' default separators, and the elapsedHours token Python would write.
const asUpstreamSerialises = (event, elapsedHoursToken) =>
  canonicalJson(event, {
    separators: PYTHON_DEFAULT_SEPARATORS,
    tokens: typeof event.elapsedHours === 'number'
      ? { elapsedHours: elapsedHoursToken ?? pythonFloatToken(event.elapsedHours) }
      : {},
  });

const wholeEvent = (event, elapsedHoursToken) => {
  const text = asUpstreamSerialises(event, elapsedHoursToken);
  return [
    ...(Buffer.byteLength(text, 'utf8') > MAX_EVENT_BYTES ? [`progress event exceeds ${MAX_EVENT_BYTES} bytes`] : []),
    ...(secretPattern().test(text) ? ['progress event appears to contain a secret'] : []),
  ];
};

/** Every reason the event is refused, or an empty list. */
export function validateEvent(event, { elapsedHoursToken } = {}) {
  if (!isPlainObject(event)) return ['progress event must be a JSON object'];
  return [
    ...unknownFields(event),
    ...(event.schemaVersion === 1 ? [] : ['schemaVersion must be 1']),
    ...requiredString(event, 'eventId', 128),
    ...(isString(event.eventId) && !EVENT_ID.test(event.eventId) ? ['eventId has an invalid format'] : []),
    ...observedAt(event),
    ...requiredString(event, 'runId', 200),
    ...(BOUNDARIES.includes(event.boundary) ? [] : ['boundary must be task, change, or phase']),
    ...(STATUSES.includes(event.status) ? [] : ['status is invalid']),
    ...requiredString(event, 'phaseId', 160),
    ...nullableRequiredString(event, 'changeId', 200),
    ...nullableRequiredString(event, 'taskId', 200),
    ...subjects(event),
    ...(TASK_CLASSES.includes(event.taskClass) ? [] : ['taskClass is invalid']),
    ...elapsedHours(event),
    ...touchedFiles(event),
    ...verification(event),
    ...(event.commitSha === null || event.commitSha === undefined || (isString(event.commitSha) && COMMIT.test(event.commitSha))
      ? []
      : ['commitSha must be null or a 7-64 character hexadecimal Git object ID']),
    ...nullableText(event, 'blocker'),
    ...nullableText(event, 'exactNextWork'),
    ...wholeEvent(event, elapsedHoursToken),
  ];
}
