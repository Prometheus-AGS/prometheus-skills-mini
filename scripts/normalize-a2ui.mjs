#!/usr/bin/env node
// Normalize and validate an A2UI component spec before browser preview.
//
// Inputs:  --input <source.a2ui.json>  --artifact-id <id>  [--out-dir <dir>]
// Outputs: <out-dir>/normalized.a2ui.json
//          <out-dir>/normalize-report.json
//
// HTML preview generation is owned by the existing render pipeline
// (assets/templates/a2ui-preview-template.html + Template Injection in
// prompts/execute.md). This script does not emit HTML — it produces
// the validated, normalized spec JSON that the template injection
// step consumes via the {{A2UI_JSON}} placeholder.
//
// Exit codes:
//   0  success — normalized files written, no constraint violations
//   1  schema validation failure or cycle detected
//   2  I/O error (input not readable, etc.)
//
// This adapter intentionally has no external dependencies: the validator
// is hand-rolled JSON Schema interpretation for the small subset our
// schema uses (required, enum, pattern, oneOf, $ref-to-#/definitions).
// That keeps the refiner's `npm` surface clean.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SCHEMA_PATH = join(REPO_ROOT, 'references/schemas/a2ui-component.schema.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

function fail(stage, message, details) {
  const report = {
    status: 'failed',
    stage,
    message,
    details: details ?? null,
  };
  process.stderr.write(JSON.stringify(report, null, 2) + '\n');
  return report;
}

// Minimal subset of JSON Schema needed for our A2UI schema:
//   - type, required, enum, pattern, additionalProperties (object only)
//   - properties / patternProperties
//   - items
//   - oneOf (no full draft semantics — first match wins)
//   - $ref pointing into #/definitions/<name>
//   - allOf with simple if/then required-chain (skipped here; codified separately)
function validate(schema, instance, path = '$', root = schema, errors = []) {
  if (schema.$ref) {
    const ref = schema.$ref;
    if (!ref.startsWith('#/definitions/')) {
      errors.push({ path, message: `Unsupported $ref: ${ref}` });
      return errors;
    }
    const name = ref.slice('#/definitions/'.length);
    const target = root.definitions?.[name];
    if (!target) {
      errors.push({ path, message: `Missing definition: ${name}` });
      return errors;
    }
    return validate(target, instance, path, root, errors);
  }

  // oneOf: EXACTLY one branch must match. The previous implementation stopped at
  // the first match, which is anyOf semantics — a message carrying two envelope
  // operations validated cleanly because `createSurface` matched and the walk
  // stopped. Envelope exclusivity depends on real oneOf.
  if (schema.oneOf) {
    let matches = 0;
    for (const sub of schema.oneOf) {
      const subErrors = [];
      validate(sub, instance, path, root, subErrors);
      if (subErrors.length === 0) matches += 1;
    }
    if (matches === 0) {
      errors.push({ path, message: `No oneOf branch matched` });
    } else if (matches > 1) {
      errors.push({
        path,
        message: `Matched ${matches} oneOf branches; exactly one is permitted`,
      });
    }
    return errors;
  }

  // anyOf: at least one branch matches.
  if (schema.anyOf) {
    const matched = schema.anyOf.some((sub) => {
      const subErrors = [];
      validate(sub, instance, path, root, subErrors);
      return subErrors.length === 0;
    });
    if (!matched) {
      errors.push({ path, message: `No anyOf branch matched` });
    }
    return errors;
  }

  // not: the subschema must NOT match. Carries the dialect guards (`type`,
  // `bindings`) and the expression-leaf guard, so omitting it would silently
  // disable every rejection this change exists to enforce.
  if (schema.not) {
    const subErrors = [];
    validate(schema.not, instance, path, root, subErrors);
    if (subErrors.length === 0) {
      errors.push({
        path,
        message: schema.description
          ? `Rejected by guard: ${schema.description}`
          : `Value matched a forbidden schema`,
      });
    }
    // fall through: sibling keywords still apply
  }

  if (schema.type) {
    const actual = Array.isArray(instance)
      ? 'array'
      : instance === null
        ? 'null'
        : typeof instance;
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.includes(actual)) {
      errors.push({ path, message: `expected ${expected.join('|')}, got ${actual}` });
      return errors;
    }
  }

  if (schema.enum && !schema.enum.includes(instance)) {
    errors.push({ path, message: `value not in enum: ${JSON.stringify(schema.enum)}` });
  }

  if (typeof instance === 'string' && schema.pattern) {
    const re = new RegExp(schema.pattern);
    if (!re.test(instance)) {
      errors.push({ path, message: `does not match pattern ${schema.pattern}` });
    }
  }

  if (schema.required && instance && typeof instance === 'object' && !Array.isArray(instance)) {
    for (const key of schema.required) {
      if (!(key in instance)) {
        errors.push({ path, message: `missing required field "${key}"` });
      }
    }
  }

  if (schema.properties && instance && typeof instance === 'object' && !Array.isArray(instance)) {
    for (const [key, subschema] of Object.entries(schema.properties)) {
      if (key in instance) {
        validate(subschema, instance[key], `${path}.${key}`, root, errors);
      }
    }
  }

  if (
    schema.patternProperties &&
    instance &&
    typeof instance === 'object' &&
    !Array.isArray(instance)
  ) {
    for (const [pat, subschema] of Object.entries(schema.patternProperties)) {
      const re = new RegExp(pat);
      for (const key of Object.keys(instance)) {
        if (re.test(key)) {
          validate(subschema, instance[key], `${path}["${key}"]`, root, errors);
        }
      }
    }
  }

  if (
    schema.additionalProperties === false &&
    instance &&
    typeof instance === 'object' &&
    !Array.isArray(instance)
  ) {
    const known = new Set([
      ...Object.keys(schema.properties ?? {}),
      ...Object.keys(schema.patternProperties ?? {}),
    ]);
    const patterns = Object.keys(schema.patternProperties ?? {}).map((p) => new RegExp(p));
    for (const key of Object.keys(instance)) {
      if (!known.has(key) && !patterns.some((re) => re.test(key))) {
        errors.push({ path: `${path}.${key}`, message: 'unexpected property' });
      }
    }
  }

  if (schema.items && Array.isArray(instance)) {
    instance.forEach((item, idx) => {
      validate(schema.items, item, `${path}[${idx}]`, root, errors);
    });
  }

  return errors;
}

// Walk component tree and collect (binding-id -> ref-target) edges plus
// referenced ids per component. Returns { graph, refsFromComponents }.
// ---------------------------------------------------------------------------
// A2UI v1.0 structural analysis
//
// The pre-alignment format nested components inside one another and carried a
// `bindings` map; cycles were possible in the BINDINGS graph. The real protocol
// uses a FLAT component array whose parent-child structure is expressed by id
// reference — so cycles are still possible, just in a different graph, and JSON
// Schema still cannot express acyclicity. Losing this check while changing
// models would be a silent regression, so it moved rather than disappeared.
// ---------------------------------------------------------------------------

const OPERATION_KEYS = [
  'createSurface',
  'updateComponents',
  'updateDataModel',
  'deleteSurface',
  'callFunction',
  'actionResponse',
];

/** True when the document is the pre-alignment dialect, not a protocol message. */
function looksLikeLegacyDialect(spec) {
  if (!spec || typeof spec !== 'object') return false;
  const hasOperation = OPERATION_KEYS.some((k) => k in spec);
  if (hasOperation) return false;
  return 'root' in spec || 'bindings' in spec || 'metadata' in spec;
}

/** The single operation key present, or null. */
function operationOf(spec) {
  const present = OPERATION_KEYS.filter((k) => k in spec);
  return present.length === 1 ? present[0] : null;
}

/** Components carried by whichever operation this message performs. */
function componentsOf(spec) {
  const op = operationOf(spec);
  if (!op) return [];
  return spec[op]?.components ?? [];
}

/** Index by id. Duplicate ids are a hard error: later entries would shadow. */
function indexComponents(components) {
  const byId = new Map();
  const duplicates = [];
  for (const c of components) {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string') continue;
    if (byId.has(c.id)) duplicates.push(c.id);
    else byId.set(c.id, c);
  }
  return { byId, duplicates };
}

/** id -> [child ids], from `child` and `children`. */
function buildReferenceGraph(byId) {
  const graph = new Map();
  for (const [id, c] of byId) {
    const kids = [];
    if (typeof c.child === 'string') kids.push(c.child);
    if (Array.isArray(c.children)) {
      for (const k of c.children) if (typeof k === 'string') kids.push(k);
    }
    graph.set(id, kids);
  }
  return graph;
}

/** Referenced ids with no declared component. */
function findDanglingRefs(byId, graph) {
  const dangling = [];
  for (const [id, kids] of graph) {
    for (const k of kids) {
      if (!byId.has(k)) dangling.push({ from: id, missing: k });
    }
  }
  return dangling;
}

/**
 * First cycle in the id-reference graph, as the participating ids.
 * Iterative DFS with an explicit stack — a recursive walk would blow the stack
 * on a deep surface, and a malformed surface is exactly when that happens.
 */
function detectReferenceCycle(graph) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...graph.keys()].map((id) => [id, WHITE]));

  for (const origin of graph.keys()) {
    if (color.get(origin) !== WHITE) continue;
    const stack = [{ id: origin, path: [origin], i: 0 }];
    color.set(origin, GRAY);

    while (stack.length) {
      const frame = stack[stack.length - 1];
      const kids = graph.get(frame.id) ?? [];
      if (frame.i >= kids.length) {
        color.set(frame.id, BLACK);
        stack.pop();
        continue;
      }
      const next = kids[frame.i++];
      if (!graph.has(next)) continue;           // dangling: reported separately
      if (color.get(next) === GRAY) {
        const at = frame.path.indexOf(next);
        return at >= 0 ? [...frame.path.slice(at), next] : [...frame.path, next];
      }
      if (color.get(next) === WHITE) {
        color.set(next, GRAY);
        stack.push({ id: next, path: [...frame.path, next], i: 0 });
      }
    }
  }
  return null;
}

/**
 * Ids not reachable from a root. Orphans indicate a generation bug and would
 * otherwise pass unnoticed — they simply never render.
 */
function findUnreachable(byId, graph) {
  if (byId.size === 0) return [];
  const referenced = new Set();
  for (const kids of graph.values()) for (const k of kids) referenced.add(k);
  const roots = [...byId.keys()].filter((id) => !referenced.has(id));
  if (roots.length === 0) return [];            // every node referenced: a cycle, reported separately

  // A surface has ONE root. Treating every unreferenced node as a root would
  // make an orphan its own root and therefore trivially reachable — which is
  // exactly the bug this check exists to catch. Walk from the first root only;
  // any further unreferenced node is an orphan by definition.
  const seen = new Set();
  const stack = [roots[0]];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const k of graph.get(id) ?? []) if (byId.has(k)) stack.push(k);
  }
  return [...byId.keys()].filter((id) => !seen.has(id));
}

/** Resolve a JSON Pointer (subset: /a/b) against the data model. */
function resolvePointer(dataModel, pointer) {
  if (pointer === '/') return dataModel;
  const parts = pointer.slice(1).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur = dataModel;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object' || !(part in cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

/**
 * Walk leaf values for {"path": …} pointers and expression-like objects.
 *
 * The expression check closes assess Q3: the pre-alignment dialect allowed
 * `{"kind":"expression","expression":"config.api.url + '/login'"}` — arbitrary
 * JavaScript requiring an evaluator. The protocol has no expression language;
 * computed behaviour goes through catalog-declared functions. Rejecting here
 * means an unreviewed evaluator cannot reach a scaffolded app by omission.
 */
function checkLeaves(components, dataModel) {
  const deadPointers = [];
  const expressions = [];

  const walk = (value, componentId, keyPath) => {
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, componentId, `${keyPath}[${i}]`));
      return;
    }
    if (value == null || typeof value !== 'object') return;

    if ('expression' in value || 'kind' in value) {
      expressions.push({ component: componentId, at: keyPath, value });
      return;
    }
    if ('path' in value && typeof value.path === 'string') {
      if (resolvePointer(dataModel ?? {}, value.path) === undefined) {
        deadPointers.push({ component: componentId, at: keyPath, path: value.path });
      }
      return;
    }
    for (const [k, v] of Object.entries(value)) walk(v, componentId, `${keyPath}.${k}`);
  };

  for (const c of components) {
    if (!c || typeof c !== 'object') continue;
    for (const [k, v] of Object.entries(c)) {
      if (k === 'id' || k === 'component' || k === 'child' || k === 'children') continue;
      walk(v, c.id, k);
    }
  }
  return { deadPointers, expressions };
}

/**
 * Component names accepted by the schema.
 *
 * Derived from the schema at runtime, never duplicated here. A hand-maintained
 * second copy is how `TOOL_CALL_ARGS_DELTA` lived in two places at once through
 * an entire phase. When the schema declares only a shape pattern rather than an
 * explicit catalog, that pattern is the check — recorded in the report so a
 * reader can tell how strict the validation actually was.
 */
function componentNameCheck(schema) {
  const def = schema.definitions?.componentName;
  if (Array.isArray(def?.enum)) {
    return { mode: 'catalog-enum', accepts: (n) => def.enum.includes(n), source: def.enum };
  }
  if (typeof def?.pattern === 'string') {
    const re = new RegExp(def.pattern);
    return { mode: 'shape-pattern', accepts: (n) => re.test(n), source: def.pattern };
  }
  return { mode: 'none', accepts: () => true, source: null };
}

function findInvalidComponentNames(components, check) {
  return components
    .filter((c) => c && typeof c.component === 'string' && !check.accepts(c.component))
    .map((c) => ({ id: c.id, component: c.component }));
}

/** Stable key order; the flat array keeps its authored order. */
function normalize(spec) {
  const out = {};
  if ('version' in spec) out.version = spec.version;
  for (const key of OPERATION_KEYS) {
    if (!(key in spec)) continue;
    const op = spec[key];
    const norm = {};
    for (const k of ['surfaceId', 'catalogId', 'call', 'args']) {
      if (k in op) norm[k] = op[k];
    }
    if (Array.isArray(op.components)) norm.components = op.components.map(normalizeComponent);
    for (const k of ['dataModel', 'surfaceParams']) {
      if (k in op) norm[k] = op[k];
    }
    for (const [k, v] of Object.entries(op)) if (!(k in norm)) norm[k] = v;
    out[key] = norm;
  }
  return out;
}

function normalizeComponent(component) {
  if (!component || typeof component !== 'object') return component;
  const out = {};
  if ('id' in component) out.id = component.id;
  if ('component' in component) out.component = component.component;
  if ('child' in component) out.child = component.child;
  if ('children' in component) out.children = component.children;
  for (const [k, v] of Object.entries(component)) if (!(k in out)) out[k] = v;
  return out;
}


function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input;
  const artifactId = args['artifact-id'] ?? 'a2ui-default';
  const outDir = args['out-dir'] ?? join('dist/previews', artifactId);

  if (!input) {
    process.stderr.write('Usage: normalize-a2ui.mjs --input <file> --artifact-id <id> [--out-dir <dir>]\n');
    process.exit(2);
  }

  let spec;
  try {
    spec = loadJson(input);
  } catch (err) {
    fail('read', `Cannot read or parse ${input}`, String(err));
    process.exit(2);
  }

  const schema = loadJson(SCHEMA_PATH);
  const violations = [];

  // Named ahead of schema validation. A pre-alignment document fails the schema
  // with a pile of generic errors that never say WHY; anyone holding an old spec
  // should learn it is the wrong format, not just that something is invalid.
  if (looksLikeLegacyDialect(spec)) {
    violations.push({
      kind: 'legacy_dialect',
      message:
        'This is the pre-alignment a2ui format ({version, metadata, bindings, root} ' +
        'with a `type` discriminator). It is not an A2UI v1.0 protocol message. ' +
        'See openspec/changes/archive/2026-08-29-p8-01-align-a2ui-schema and ' +
        'references/domain/a2ui.md for the current message model.',
    });
  }

  const schemaErrors = validate(schema, spec);
  if (schemaErrors.length) violations.push({ kind: 'schema', errors: schemaErrors });

  const operation = operationOf(spec);
  const components = componentsOf(spec);
  const dataModel = operation ? spec[operation]?.dataModel : undefined;

  const { byId, duplicates } = indexComponents(components);
  if (duplicates.length) {
    violations.push({ kind: 'duplicate_component_id', ids: duplicates });
  }

  const graph = buildReferenceGraph(byId);

  const dangling = findDanglingRefs(byId, graph);
  if (dangling.length) {
    violations.push({ kind: 'dangling_reference', refs: dangling });
  }

  const cycle = detectReferenceCycle(graph);
  if (cycle) {
    violations.push({ kind: 'reference_cycle', cycle });
  }

  // Only meaningful once the graph is sound: with a cycle present every node is
  // referenced, so "unreachable" would report nothing and mask the real fault.
  if (!cycle) {
    const unreachable = findUnreachable(byId, graph);
    if (unreachable.length) {
      violations.push({ kind: 'unreachable_component', ids: unreachable });
    }
  }

  const { deadPointers, expressions } = checkLeaves(components, dataModel);
  if (deadPointers.length) {
    violations.push({ kind: 'dead_data_pointer', refs: deadPointers });
  }
  if (expressions.length) {
    violations.push({
      kind: 'expression_leaf',
      message:
        'Expression-like leaf rejected: A2UI has no expression language. ' +
        'Arbitrary expression evaluation is a code-execution hazard; use ' +
        'catalog-declared functions instead.',
      leaves: expressions,
    });
  }

  const nameCheck = componentNameCheck(schema);
  const badNames = findInvalidComponentNames(components, nameCheck);
  if (badNames.length) {
    violations.push({
      kind: 'unknown_component',
      message: `Unknown component name (check mode: ${nameCheck.mode}). Unknown components are a hard error, never a fallback render.`,
      components: badNames,
    });
  }

  ensureDir(outDir);

  const report = {
    status: violations.length === 0 ? 'success' : 'failed',
    artifact_id: artifactId,
    input,
    schema: SCHEMA_PATH,
    operation,
    component_count: components.length,
    component_name_check: nameCheck.mode,
    violations,
    generated_at: new Date().toISOString(),
  };

  if (violations.length) {
    writeFileSync(join(outDir, 'normalize-report.json'), JSON.stringify(report, null, 2));
    process.stderr.write(JSON.stringify(report, null, 2) + '\n');
    process.exit(1);
  }

  const normalized = normalize(spec);
  writeFileSync(join(outDir, 'normalized.a2ui.json'), JSON.stringify(normalized, null, 2));
  writeFileSync(join(outDir, 'normalize-report.json'), JSON.stringify(report, null, 2));
  process.stdout.write(`OK ${outDir}\n`);
}

main();
