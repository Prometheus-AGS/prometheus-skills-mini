// `versions.toml` is the version authority CLAUDE.md §0.2 names: the operator writes
// it, agents read it. This module is the reader and the comparison; the tests around
// it (rules/test/versions-toml.test.mjs) are what make a disagreement with the tree a
// failure rather than a comment.
//
// The grammar is deliberately the documented subset only (docs/versions-toml.md):
// tables, quoted or bare keys, string/boolean values, inline tables, comments. Every
// other TOML construct raises. A version authority that silently drops a pin it could
// not parse would be worse than one that refuses to load.

const ERR = (line, message) => {
  throw new Error(`versions.toml: line ${line}: ${message}`);
};

const unquote = (raw, line) => {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('"""') || value.startsWith("'''")) ERR(line, 'multi-line strings are not supported');
  if (value.startsWith('[')) ERR(line, 'arrays are not supported');
  const quoted = /^"([^"]*)"$/.exec(value) ?? /^'([^']*)'$/.exec(value);
  if (!quoted) ERR(line, `expected a quoted string or a boolean, got ${JSON.stringify(value)}`);
  return quoted[1];
};

const key = (raw, line) => {
  const text = raw.trim();
  const quoted = /^"([^"]*)"$/.exec(text) ?? /^'([^']*)'$/.exec(text);
  if (quoted) return quoted[1];
  if (!/^[A-Za-z0-9_.@/-]+$/.test(text)) ERR(line, `unsupported key ${JSON.stringify(text)}`);
  return text;
};

// Split an inline table's body on commas that are not inside quotes.
const splitPairs = (body, line) => {
  const out = [];
  let current = '';
  let quote = null;
  for (const ch of body) {
    if (quote) {
      if (ch === quote) quote = null;
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ',') {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (quote) ERR(line, 'unterminated string in an inline table');
  if (current.trim() !== '') out.push(current);
  return out;
};

const inlineTable = (raw, line) => {
  // Check the closing brace explicitly. `slice(1, -1)` on an unterminated table
  // eats a real character instead, and the corruption surfaces downstream as a
  // misleading message — `{ built_from_submodule = true` reported `got "tru"`.
  // A parser that names the wrong defect will eventually name none.
  const text = raw.trim();
  if (!text.endsWith('}')) ERR(line, 'inline table is missing its closing brace');

  const table = {};
  for (const pair of splitPairs(text.slice(1, -1), line)) {
    const at = pair.indexOf('=');
    if (at === -1) ERR(line, `inline table entry without '=': ${JSON.stringify(pair.trim())}`);
    // Same rule as the table level: a duplicate silently keeping the last value
    // is exactly the quiet drop this file exists to prevent.
    const name = key(pair.slice(0, at), line);
    if (name in table) ERR(line, `duplicate key ${JSON.stringify(name)} in an inline table`);
    table[name] = unquote(pair.slice(at + 1), line);
  }
  return table;
};

/** Parse the documented subset. Throws on anything outside it. */
export function parseVersionsToml(text) {
  const parsed = {};
  let table = null;
  let lineNumber = 0;

  for (const rawLine of String(text).split('\n')) {
    lineNumber += 1;
    const line = rawLine.replace(/\s+#.*$/, '').trim();
    if (line === '' || line.startsWith('#')) continue;

    if (line.startsWith('[[')) ERR(lineNumber, 'arrays of tables are not supported');
    if (line.startsWith('[')) {
      const name = /^\[([^\]]+)\]$/.exec(line);
      if (!name) ERR(lineNumber, `malformed table header ${JSON.stringify(line)}`);
      table = key(name[1], lineNumber);
      parsed[table] ??= {};
      continue;
    }

    const at = line.indexOf('=');
    if (at === -1) ERR(lineNumber, `expected 'key = value', got ${JSON.stringify(line)}`);
    if (table === null) ERR(lineNumber, 'a value appears before any table header');

    const name = key(line.slice(0, at), lineNumber);
    if (name in parsed[table]) ERR(lineNumber, `duplicate key ${JSON.stringify(name)} in [${table}]`);
    const value = line.slice(at + 1).trim();
    parsed[table][name] = value.startsWith('{') ? inlineTable(value, lineNumber) : unquote(value, lineNumber);
  }

  return parsed;
}

// A pin must be a plausible git object name. Prefix matching means an empty pin
// would match EVERY commit and an incomplete one would match a whole family, so
// a malformed pin is rejected rather than allowed to agree with anything — the
// same vacuous pass the absent-file `todo` exists to prevent, reached through a
// different door. Seven hex digits is git's own short-sha floor.
const PIN = /^[0-9a-f]{7,40}$/;

const samePin = (pinned, actual) =>
  typeof actual === 'string' && actual.length >= pinned.length && actual.startsWith(pinned);

/**
 * Every disagreement between the file and the tree, as human-readable lines.
 * `lsTree(path)` returns the gitlink commit at that path in HEAD, or null.
 * `listGitlinks()` returns every gitlink path in HEAD — the spec says the file names
 * EVERY submodule, so an unlisted one is a disagreement too; checking only the listed
 * pins would let an incomplete authority report itself as agreeing. Optional so the
 * unit tests that do not exercise completeness need not supply it.
 * Pure: the tree readers and the manifest are injected, so tests need no repository.
 */
export function compareToTree(parsed, { lsTree, listGitlinks, packageJson }) {
  const found = [];
  const submodules = parsed.submodules ?? {};

  // Scoped to tools/ deliberately: the spec says "every submodule under tools/",
  // and a gitlink elsewhere in the tree is not this file's business.
  if (typeof listGitlinks === 'function') {
    for (const path of listGitlinks().filter((p) => p === 'tools' || p.startsWith('tools/'))) {
      if (!(path in submodules)) {
        found.push(`${path}: HEAD has a gitlink there, but versions.toml does not name it`);
      }
    }
  }

  for (const [path, pinned] of Object.entries(submodules)) {
    if (typeof pinned !== 'string' || !PIN.test(pinned)) {
      found.push(
        `${path}: ${JSON.stringify(pinned)} is not a commit sha (7–40 hex digits); it cannot pin anything`,
      );
      continue;
    }
    const actual = lsTree(path);
    if (actual === null) {
      found.push(`${path}: versions.toml pins ${pinned}, but HEAD has no gitlink there (not a gitlink)`);
      continue;
    }
    if (!samePin(pinned, actual)) {
      found.push(`${path}: versions.toml pins ${pinned}, HEAD has ${actual}`);
    }
  }

  const declared = parsed.node?.minimum;
  const engine = packageJson?.engines?.node;
  if (declared !== engine) {
    found.push(`[node] minimum is ${declared}, package.json engines.node is ${engine} — they must be equal`);
  }

  for (const [name, entry] of Object.entries(parsed.images ?? {})) {
    if (typeof entry !== 'object' || entry === null) {
      found.push(`[images] ${name} must be an inline table`);
      continue;
    }
    if (!entry.digest && entry.built_from_submodule !== true) {
      found.push(`[images] ${name} has neither a digest nor built_from_submodule = true`);
      continue;
    }
    if (entry.built_from_submodule === true && !(entry.submodule in submodules)) {
      found.push(
        `[images] ${name} is built_from_submodule but names ${entry.submodule ?? '(nothing)'}, which [submodules] does not pin`,
      );
    }
  }

  return found;
}
