// The scanner behind the no-hardcoded-secrets constraint (scripts/check-hardcoded-secrets.mjs).
//
// It replaces the old one-line `git grep` content check while preserving its exact scan boundary:
// the same `git grep --no-index --exclude-standard` invocation enumerates the candidate files
// (the "docker/*" pathspec has always included docker/ Markdown), then each file's bytes are
// scanned here in Node. Two detector patterns are applied — the inline-credential option spelling
// and the provider-token shape — to every line, and for JSON files additionally to every parsed
// property name and string value, so a hit is classified as "key", "value" or "text".
//
// Every hit is recorded only as { file, line, JSON pointer, sha256 of the exact match substring,
// kind }. The pointer is a TEMPLATE: any segment that itself contains a detector match (a
// secret-shaped property name) is replaced by the stable placeholder "<key>", so a raw key can
// never reach the result, the store, the report, or any log. A hit is accepted only when it
// exactly matches one entry of the finite disposition store on ALL of file + kind + digest +
// location (line number, and pointer for parsed key/value hits); anything else is a violation,
// and a disposition no longer observed in the tree is stale. Both fail the check.
//
// A .json candidate that does not parse is ALWAYS fully text-scanned (identical detection to the
// replaced gate) and ALWAYS recorded and printed as an explicit PARSE-NOTE — never silent. The
// note alone does not fail the run: a parse-errored file with zero hits that no disposition
// references loses nothing by being read as text. The run fails on a parse problem only when
// structure loss could matter — the file produced a pattern hit or is named in the disposition
// store (both surface through the violation/stale channels and additionally force exit 2). The
// parser's own error message is deliberately NOT recorded — V8 embeds a snippet of the offending
// input in it, which could itself carry matched content. Unreadable candidates are recorded as
// { file, code } only — fs error codes and paths, never file content — and are printed as ERROR
// lines; they always fail the run.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnExecutable } from '../platform/spawn.mjs';

const DETECTORS = [
  /--(user|pass)=/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
];

// The replaced check's pathspecs, verbatim. "docker/*" covers every file under docker/,
// including Markdown — that is the original effective scope, not a widening.
const PATHSPECS = ['docker/*', '*.mjs', '*.json', '*.toml', '*.yaml', '*.yml'];

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

function matchDigests(text) {
  const digests = [];
  for (const detector of DETECTORS) {
    detector.lastIndex = 0;
    let match;
    while ((match = detector.exec(text)) !== null) digests.push(sha256(match[0]));
  }
  return digests;
}

const escapePointerSegment = (segment) => segment.replace(/~/g, '~0').replace(/\//g, '~1');

// A pointer segment that itself contains a detector match is a secret-shaped property name;
// it is replaced by a stable placeholder so the raw key is never stored or reported.
const templateSegment = (segment) => (
  matchDigests(segment).length > 0 ? '<key>' : escapePointerSegment(segment)
);

function walkJson(node, visit, pointer) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => walkJson(item, visit, `${pointer}/${index}`));
    return;
  }
  if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      const child = `${pointer}/${templateSegment(key)}`;
      visit(key, 'key', child);
      walkJson(value, visit, child);
    }
    return;
  }
  if (typeof node === 'string') visit(node, 'value', pointer);
}

/** List the candidate files, relative to cwd, using the replaced check's exact git boundary. */
export function enumerateFiles({ cwd }) {
  const result = spawnExecutable('git', [
    'grep', '--no-index', '--exclude-standard', '-l', '-e', '', '--', ...PATHSPECS,
  ], { cwd });
  if (result.error) throw new Error(`could not start git: ${result.error.message}`);
  if (result.status === 1 && result.stdout.trim() === '') return [];
  if (result.status !== 0) {
    throw new Error(`git grep enumeration exited ${result.status}: ${result.stderr.trim()}`);
  }
  // Paths are taken VERBATIM, one per line: a valid filename may begin or end with a space, so
  // no trimming — only the empty fragment after the final newline is dropped.
  const lines = result.stdout.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Scan one file's text. Returns { hits, parseError }. Hits are { kind, line, pointer, digest } —
 * never the matched value, and the pointer is always the placeholder-templated form. In a
 * parseable JSON file a hit inside a property name is kind "key" and inside a string value kind
 * "value"; those parsed hits consume the corresponding raw-line candidates (FIFO per digest),
 * which also gives them their line number. Whatever remains unconsumed — all hits in non-JSON
 * text, and hits in JSON that does not parse — is kind "text" with a null pointer. parseError is
 * true when a .json file could not be parsed; the caller records it as a PARSE-NOTE.
 */
export function scanText(text, { isJson }) {
  const candidates = [];
  text.split(/\r?\n/).forEach((line, index) => {
    for (const digest of matchDigests(line)) {
      candidates.push({ line: index + 1, digest, used: false });
    }
  });

  const hits = [];
  let parseError = false;
  if (isJson) {
    let document;
    try {
      document = JSON.parse(text);
    } catch {
      parseError = true;
    }
    if (!parseError) {
      walkJson(document, (subject, kind, pointer) => {
        for (const digest of matchDigests(subject)) {
          const candidate = candidates.find((entry) => !entry.used && entry.digest === digest);
          if (candidate) candidate.used = true;
          hits.push({ kind, line: candidate ? candidate.line : null, pointer, digest });
        }
      }, '');
    }
  }

  for (const candidate of candidates) {
    if (!candidate.used) {
      hits.push({ kind: 'text', line: candidate.line, pointer: null, digest: candidate.digest });
    }
  }
  return { hits, parseError };
}

/** Load and sanity-check the finite disposition store. */
export function loadDispositions(filePath) {
  const document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(document.dispositions)) {
    throw new Error(`${filePath}: missing "dispositions" array`);
  }
  return document.dispositions.map((entry, index) => {
    for (const field of ['file', 'kind', 'line', 'pointer', 'sha256', 'class', 'source']) {
      if (entry[field] === undefined) {
        throw new Error(`${filePath}: dispositions[${index}] is missing "${field}"`);
      }
    }
    if (!Array.isArray(entry.source) || entry.source.length === 0) {
      throw new Error(`${filePath}: dispositions[${index}] has an empty "source" provenance list`);
    }
    return {
      file: entry.file,
      kind: entry.kind,
      line: entry.line,
      pointer: entry.pointer,
      sha256: entry.sha256,
      class: entry.class,
      source: entry.source,
    };
  });
}

/**
 * Match hits against the store. Each disposition accepts at most one hit, and only on an exact
 * match of ALL of file + kind + digest + location — the line number, and for parsed key/value
 * hits the (placeholder-templated) JSON pointer; text hits carry a null pointer. Moving an
 * accepted occurrence to a different line or field therefore fails. Unmatched hits are
 * violations; unused dispositions are stale — both fail the check.
 */
export function adjudicate(hits, dispositions) {
  const remaining = dispositions.map((entry) => ({ ...entry, used: false }));
  const accepted = [];
  const violations = [];
  for (const hit of hits) {
    const disposition = remaining.find(
      (entry) => !entry.used
        && entry.file === hit.file
        && entry.kind === hit.kind
        && entry.sha256 === hit.digest
        && entry.line === hit.line
        && entry.pointer === (hit.pointer ?? null),
    );
    if (disposition) {
      disposition.used = true;
      accepted.push({ hit, disposition });
    } else {
      violations.push(hit);
    }
  }
  return { accepted, violations, staleDispositions: remaining.filter((entry) => !entry.used) };
}

/**
 * Scan every candidate file under cwd and adjudicate the hits against the disposition store.
 * `enumerate` is injectable so controls can drive the scan over a stubbed candidate list.
 */
export function scanRepository({ cwd, dispositions, enumerate = enumerateFiles }) {
  const storeFiles = new Set(dispositions.map((entry) => entry.file));
  const files = enumerate({ cwd });
  const hits = [];
  const errors = [];
  const parseNotes = [];
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(path.join(cwd, file), 'utf8');
    } catch (error) {
      errors.push({ file, code: error.code });
      continue;
    }
    const { hits: fileHits, parseError } = scanText(text, { isJson: file.endsWith('.json') });
    if (parseError) {
      parseNotes.push({
        file,
        hits: fileHits.length,
        referencedByStore: storeFiles.has(file),
      });
    }
    for (const hit of fileHits) {
      hits.push({ file, ...hit });
    }
  }
  const { accepted, violations, staleDispositions } = adjudicate(hits, dispositions);
  return { filesScanned: files.length, accepted, violations, staleDispositions, errors, parseNotes };
}

/**
 * The entry point's exit code, as a pure function of the scan result so the decision is
 * testable without spawning. 2 = the scan itself failed (unreadable files) OR a parse-errored
 * file could have hidden structure-relevant findings (it produced a pattern hit, or the
 * disposition store references it). 1 = undispositioned or stale hits on fully inspected files.
 * 0 = clean. A PARSE-NOTE alone never fails the run.
 */
export function decideExitCode(result) {
  if (result.errors.length > 0) return 2;
  if (result.parseNotes.some((note) => note.hits > 0 || note.referencedByStore)) return 2;
  return result.violations.length > 0 || result.staleDispositions.length > 0 ? 1 : 0;
}

const digestPrefix = (digest) => digest.slice(0, 12);

/**
 * Render the result for the entry point. Contains only file paths, line numbers, JSON pointers,
 * digest prefixes, fs error codes and disposition classes — never a matched value, a raw
 * identifier key, file content or a parser message. PARSE-NOTE lines are printed in both the
 * passing and the failing report: never silent. The PASS header never prints when any file was
 * unreadable.
 */
export function formatReport(result) {
  const errors = result.errors.map(({ file, code }) => `ERROR ${file} (unreadable: ${code})`);
  const notes = result.parseNotes.map(
    ({ file }) => `PARSE-NOTE ${file} (not JSON; scanned as text only)`,
  );
  const findings = [
    ...result.violations.map((hit) => {
      const pointer = hit.pointer ? ` pointer=${hit.pointer}` : '';
      return `VIOLATION ${hit.file}:${hit.line ?? '-'} ${digestPrefix(hit.digest)} kind=${hit.kind}${pointer}`;
    }),
    ...result.staleDispositions.map((entry) => {
      const pointer = entry.pointer ? ` pointer=${entry.pointer}` : '';
      return `STALE-DISPOSITION ${entry.file}:${entry.line} ${digestPrefix(entry.sha256)} kind=${entry.kind} class=${entry.class}${pointer}`;
    }),
  ];
  if (errors.length === 0 && findings.length === 0) {
    return [
      `no-hardcoded-secrets: PASS (${result.filesScanned} files scanned, `
        + `${result.accepted.length} known non-credential occurrences accepted by disposition, `
        + `${notes.length} parse notes)`,
      ...notes,
    ].join('\n');
  }
  return [
    `no-hardcoded-secrets: FAIL (${result.violations.length} undispositioned hits, `
      + `${result.staleDispositions.length} stale dispositions, ${notes.length} parse notes, `
      + `${errors.length} unreadable files)`,
    ...errors,
    ...notes,
    ...findings,
  ].join('\n');
}
