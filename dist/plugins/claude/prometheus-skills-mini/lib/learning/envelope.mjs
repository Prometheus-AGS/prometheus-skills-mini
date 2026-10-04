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

/** sha256 of the normalised text (LF line endings, trimmed): the de-duplication key. */
export const contentHashOf = (text) =>
  createHash('sha256').update(String(text ?? '').replace(/\r\n?/g, '\n').trim(), 'utf8').digest('hex');

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
