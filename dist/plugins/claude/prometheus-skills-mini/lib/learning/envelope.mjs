// The learning envelope (learning-envelope.schema.json, carried byte-identical
// from the skill-pack) built from a resolved identity. Design §2: every lesson
// carries schemaVersion, projectId, visibility, kind, author, contentHash and ts,
// plus teamId/roleId whenever the author resolves to a team role.
import { createHash } from 'node:crypto';
import { SOLO_TEAM, UNRESOLVED } from './identity.mjs';

export const ENVELOPE_SCHEMA_VERSION = 1;
const KINDS = new Set(['lesson', 'gotcha', 'decision', 'progress', 'candidate']);
const STAGES = new Set(['assess', 'analyze', 'spec', 'plan', 'execute', 'reflect', 'session']);
const HARNESSES = new Set(['claude-code', 'codex', 'opencode', 'kimi', 'other']);
// The schema's teamId/roleId pattern; an id outside it cannot be attributed.
const SCOPE_ID = /^[a-z][a-z0-9-]{0,62}$/;

// Python's str.split() whitespace (str.isspace), which JS \s differs from: JS adds
// U+FEFF and omits U+001C-U+001F and U+0085.
const PY_WHITESPACE = /[\t\n\v\f\r\x1c-\x20\x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/;

/** NFC, trimmed, internal whitespace collapsed: learning_write.py normalise_text, exactly. */
export const normaliseText = (text) =>
  String(text ?? '').normalize('NFC').split(PY_WHITESPACE).filter(Boolean).join(' ');

/** sha256 of the normalised text: the de-duplication key shared with learning_write.py. */
export const contentHashOf = (text) => createHash('sha256').update(normaliseText(text), 'utf8').digest('hex');

/** The prefix every writer shares (learning_write.py TRAILER, agent-team memory.mts). */
export const ENVELOPE_TRAILER = '<!-- prometheus-envelope ';

const sortedDeep = (value) =>
  Array.isArray(value)
    ? value.map(sortedDeep)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortedDeep(value[key])]))
      : value;

// json.dumps(..., sort_keys=True, separators=(',', ':')) with ensure_ascii on:
// non-ASCII becomes \uXXXX (lower-case hex, surrogate pairs for astral).
const asciiJson = (value) =>
  JSON.stringify(sortedDeep(value)).replace(/[\u0080-\uffff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);

/**
 * The stored form of one lesson: text, a blank line, the trailer line. Byte-for-byte
 * learning_write.py's `f"{text}\n\n{TRAILER}{json} -->"`, with one deliberate
 * difference: a `-->` inside a value is written `--\u003e` (same JSON value) so a
 * file name or agent type cannot close the comment early.
 */
export const storedContent = (text, envelope) =>
  `${String(text ?? '').trim()}\n\n${ENVELOPE_TRAILER}${asciiJson(envelope).replaceAll('-->', '--\\u003e')} -->`;

const isoOrNow = (ts) => {
  const parsed = typeof ts === 'string' ? new Date(ts) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
};

const authorOf = (identity) => ({
  harness: HARNESSES.has(identity.harness) ? identity.harness : 'other',
  ...(identity.agentId ? { agentId: identity.agentId } : {}),
  ...(identity.agentType ? { agentType: identity.agentType } : {}),
  ...(identity.sessionId ? { sessionId: identity.sessionId } : {}),
});

/** True when the identity names a team role the envelope can attribute. */
export const roleResolved = (identity) =>
  identity.teamId !== SOLO_TEAM &&
  identity.roleId !== UNRESOLVED &&
  SCOPE_ID.test(identity.teamId) &&
  SCOPE_ID.test(identity.roleId);

/**
 * `visibility` is `agent` (private to the author's role) when a role resolves,
 * `project` otherwise — design §3's default, with the project scope as the
 * fallback for an author no team claims.
 */
export function buildEnvelope({ identity, kind, text, paths = [], stage, ts }) {
  if (!KINDS.has(kind)) throw new TypeError(`envelope kind must be one of ${[...KINDS].join(', ')}`);
  const attributed = roleResolved(identity);
  const repoPaths = paths.filter((entry) => typeof entry === 'string' && entry);
  return {
    schemaVersion: ENVELOPE_SCHEMA_VERSION,
    projectId: identity.projectId,
    ...(attributed ? { teamId: identity.teamId, roleId: identity.roleId } : {}),
    visibility: attributed ? 'agent' : 'project',
    kind,
    ...(STAGES.has(stage) ? { stage } : {}),
    ...(repoPaths.length ? { paths: repoPaths } : {}),
    author: authorOf(identity),
    contentHash: contentHashOf(text),
    ts: isoOrNow(ts),
  };
}
