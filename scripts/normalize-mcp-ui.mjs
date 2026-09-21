#!/usr/bin/env node
// Validate and normalize an MCP-UI resource before it reaches a render host.
//
// Inputs:  --input <resource.mcp-ui.json>  [--schema <path>]  [--out-dir <dir>]
// Outputs: <out-dir>/normalized.mcp-ui.json   (only on success, when --out-dir given)
//
// Exit codes:
//   0  valid
//   1  constraint violation (named) or schema failure
//   2  I/O error (input not readable, schema missing, etc.)
//
// TASK 2.1 DECISION — validator reuse, not reimplementation.
// The JSON Schema validator is REUSED from scripts/normalize-a2ui.mjs rather
// than written again here. That file's `validate()` is the one phase-8 repaired
// to implement real `oneOf` exclusivity (plus `anyOf` and `not`); a second
// hand-rolled validator would be a second thing to get wrong, and — worse —
// these gates would then exercise a different implementation than the one that
// ships. Phase-8's `oneOf`-as-`anyOf` defect stayed invisible for exactly that
// long because nothing tested the real operator.
//
// It is imported BY SOURCE EXTRACTION rather than by `import { validate }`,
// because normalize-a2ui.mjs neither exports `validate` nor guards its
// top-level `main()` — importing it would run the A2UI CLI as a side effect.
// Extraction is the narrowest available seam. If that file ever exports
// `validate` and guards `main()`, replace `loadSharedValidator()` with a plain
// import; the behaviour must not change.
//
// KNOWN VALIDATOR LIMITS (both verified by fixture in p9-01, not assumed):
//   - `const` is NOT implemented. Single-value `enum` is used instead; a
//     `const` in the schema would be silently inert.
//   - `oneOf` RETURNS EARLY, so sibling keywords in the same schema object are
//     never evaluated. mcp-ui-resource.schema.json therefore makes each branch
//     self-contained. Do not "simplify" it by hoisting shared constraints.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_SCHEMA = join(REPO_ROOT, 'references/schemas/mcp-ui-resource.schema.json');
const A2UI_SCHEMA = join(REPO_ROOT, 'references/schemas/a2ui-component.schema.json');
const SHARED_VALIDATOR_SRC = join(REPO_ROOT, 'scripts/normalize-a2ui.mjs');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

function loadSharedValidator() {
  const src = readFileSync(SHARED_VALIDATOR_SRC, 'utf8');
  const start = src.indexOf('function validate(');
  if (start < 0) {
    throw new Error(
      `validate() not found in ${SHARED_VALIDATOR_SRC}. If it was renamed or ` +
      `exported, update loadSharedValidator() — do not fork a second validator.`,
    );
  }
  const end = src.indexOf('\n}\n', start);
  if (end < 0) throw new Error('could not delimit validate() by its closing brace');
  const fnSrc = src.slice(start, end + 3);
  return new Function(`${fnSrc}; return validate;`)();
}

// --- violation vocabulary -----------------------------------------------
//
// PRECEDENCE (task 3.3). Several of these can be true of one document at once.
// Checks run in this order and the FIRST match is reported, so a fixture
// written to test one violation cannot report another and fail its gate for a
// non-diagnostic reason:
//
//   uri_scheme → unsupported_mime → missing_content → missing_a2ui_payload
//              → unsupported_content_shape → invalid_a2ui_payload → schema_violation
//
// `schema_violation` is deliberately last: it is the catch-all for a schema
// failure none of the named checks explains.

const OUT_OF_SCOPE_KEYS = ['script', 'framework', 'iframeUrl'];

function schemaConstraints(schema) {
  // DERIVED from the schema (task 1.3) — never restated as literals here.
  // Phase-7 had to correct exactly this in normalize-agui.mjs, where a
  // duplicated enum had drifted from the schema it was meant to mirror.
  const branches = schema?.definitions?.uiResource?.oneOf ?? [];
  const mimes = [];
  let uriPattern = null;
  for (const b of branches) {
    const m = b?.properties?.mimeType?.enum;
    if (Array.isArray(m)) mimes.push(...m);
    const p = b?.properties?.uri?.pattern;
    if (p && !uriPattern) uriPattern = p;
  }
  if (!mimes.length) {
    throw new Error(
      'Could not derive mimeTypes from the schema. Expected ' +
      'definitions.uiResource.oneOf[].properties.mimeType.enum — the schema shape changed.',
    );
  }
  if (!uriPattern) {
    throw new Error(
      'Could not derive the uri pattern from the schema. Expected ' +
      'definitions.uiResource.oneOf[].properties.uri.pattern.',
    );
  }
  return { mimes: [...new Set(mimes)], uriPattern };
}

function namedViolation(doc, schema, validate) {
  const { mimes, uriPattern } = schemaConstraints(schema);
  const res = doc?.resource;

  if (!res || typeof res !== 'object') {
    return { violation: 'schema_violation', detail: 'missing `resource` object' };
  }

  // 3.1 uri_scheme
  const uri = res.uri;
  if (typeof uri !== 'string' || !new RegExp(uriPattern).test(uri)) {
    return {
      violation: 'uri_scheme',
      detail: `uri must match ${uriPattern}; got ${JSON.stringify(uri ?? null)}`,
    };
  }

  // 3.2 unsupported_mime
  const mime = res.mimeType;
  if (typeof mime !== 'string' || !mimes.includes(mime)) {
    return {
      violation: 'unsupported_mime',
      detail: `mimeType must be one of ${mimes.map((m) => JSON.stringify(m)).join(', ')}; got ${JSON.stringify(mime ?? null)}`,
    };
  }

  // 3.4 missing_content
  if (typeof res.text !== 'string' || res.text.length === 0) {
    return {
      violation: 'missing_content',
      detail: `text is required and must be non-empty; got ${JSON.stringify(res.text ?? null)}`,
    };
  }

  // missing_a2ui_payload — the whole point of this content type.
  // A resource without A2UI messages renders UI that no other transport can
  // reproduce, which is the inconsistency this type exists to prevent.
  if (!Array.isArray(res.a2ui) || res.a2ui.length === 0) {
    return {
      violation: 'missing_a2ui_payload',
      detail:
        'resource.a2ui must be a non-empty array of A2UI messages. MCP-UI is an ENVELOPE for ' +
        'A2UI, not an alternative to it — see the architecture note in the schema $comment.',
    };
  }

  // 3.5 unsupported_content_shape — remoteDom / externalUrl carriers.
  // These have no mimeType of their own upstream; they are distinct content
  // shapes, so they are caught structurally by their carrier keys.
  for (const key of OUT_OF_SCOPE_KEYS) {
    if (key in res) {
      return {
        violation: 'unsupported_content_shape',
        detail: `out-of-scope key \`${key}\` present (value: ${JSON.stringify(res[key])}). remoteDom and externalUrl are not supported by direct:mcp-ui.`,
      };
    }
  }

  // invalid_a2ui_payload — validate the embedded messages against the REAL A2UI
  // schema, not a local approximation. This is what makes "the same UI over any
  // transport" an enforced property rather than a stated intention.
  {
    let a2uiSchema;
    try {
      a2uiSchema = JSON.parse(readFileSync(A2UI_SCHEMA, 'utf8'));
    } catch (err) {
      return { violation: 'schema_violation', detail: `cannot load A2UI schema: ${String(err)}` };
    }
    for (let i = 0; i < res.a2ui.length; i += 1) {
      const errs = validate(a2uiSchema, res.a2ui[i]);
      if (errs.length) {
        return {
          violation: 'invalid_a2ui_payload',
          detail: `a2ui[${i}]: ` + errs.map((e) => `${e.path}: ${e.message}`).join('; '),
        };
      }
    }
  }

  // 3.4b schema_violation — residual.
  const errors = validate(schema, doc);
  if (errors.length) {
    return {
      violation: 'schema_violation',
      detail: errors.map((e) => `${e.path}: ${e.message}`).join('; '),
    };
  }

  return null;
}

function normalize(doc) {
  // Key order is stabilised so a re-run is byte-identical. Nothing is dropped
  // or rewritten: an MCP-UI resource is already minimal, and silently altering
  // a payload the host will execute would be the wrong kind of helpful.
  const r = doc.resource;
  return {
    type: 'resource',
    resource: { uri: r.uri, mimeType: r.mimeType, text: r.text, a2ui: r.a2ui },
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input;
  const schemaPath = args.schema ?? process.env.MCP_UI_SCHEMA ?? DEFAULT_SCHEMA;
  const outDir = args['out-dir'];

  if (!input) {
    process.stderr.write(
      'Usage: normalize-mcp-ui.mjs --input <file> [--schema <path>] [--out-dir <dir>]\n',
    );
    process.exit(2);
  }

  let doc;
  let schema;
  let validate;
  try {
    doc = JSON.parse(readFileSync(input, 'utf8'));
  } catch (err) {
    process.stderr.write(JSON.stringify({ status: 'failed', stage: 'read', message: `Cannot read or parse ${input}`, details: String(err) }, null, 2) + '\n');
    process.exit(2);
  }
  try {
    schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    validate = loadSharedValidator();
  } catch (err) {
    process.stderr.write(JSON.stringify({ status: 'failed', stage: 'schema', message: `Cannot load schema or shared validator`, details: String(err) }, null, 2) + '\n');
    process.exit(2);
  }

  const found = namedViolation(doc, schema, validate);
  if (found) {
    process.stderr.write(JSON.stringify({ status: 'failed', stage: 'validate', ...found }, null, 2) + '\n');
    process.stdout.write(`VIOLATION ${found.violation}\n`);
    process.exit(1);
  }

  if (outDir) {
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'normalized.mcp-ui.json'), JSON.stringify(normalize(doc), null, 2));
  }
  process.stdout.write('OK\n');
  process.exit(0);
}

main();
