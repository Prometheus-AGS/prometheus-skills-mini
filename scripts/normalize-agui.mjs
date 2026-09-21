#!/usr/bin/env node
// Normalize and validate an AG-UI agent specification before coverage reporting.
//
// Inputs:  --input <source.ag-ui.json>  --artifact-id <id>  [--out-dir <dir>]
// Outputs: <out-dir>/normalized.ag-ui.json
//          <out-dir>/normalize-report.json
//          <out-dir>/coverage-report.json
//
// Exit codes:
//   0  success — normalized files written, no constraint violations
//   1  schema validation failure or cross-reference violation
//   2  I/O error (input not readable, etc.)
//
// This adapter has no external dependencies: the validator is a hand-rolled
// JSON Schema interpreter for the subset our schema uses. Mirrors the
// design of normalize-a2ui.mjs.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SCHEMA_PATH = join(REPO_ROOT, 'references/schemas/ag-ui-spec.schema.json');

// Derived from the schema rather than duplicated. A hand-maintained copy is how
// `TOOL_CALL_ARGS_DELTA` (a name AG-UI never used) survived here and in the
// schema simultaneously: two lists that must agree by discipline eventually
// disagree. One source of truth removes the failure mode instead of re-checking
// for it.
const VALID_EVENT_KINDS = new Set(
  JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')).definitions.agEventKind.enum,
);

const TOOL_NAME_RE = /^[a-z_][a-z0-9_]*$/;
const CUSTOM_KIND_RE = /^CUSTOM_[A-Z_]+$/;
const VERSION_RE = /^ag-ui\/v\d+(\.\d+)*$/;

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

// Minimal JSON Schema subset validator (draft-07 subset needed for ag-ui-spec.schema.json)
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

  if (schema.type === 'object') {
    if (typeof instance !== 'object' || instance === null || Array.isArray(instance)) {
      errors.push({ path, message: `Expected object, got ${Array.isArray(instance) ? 'array' : typeof instance}` });
      return errors;
    }

    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in instance)) {
          errors.push({ path: `${path}.${key}`, message: `Required field missing: ${key}` });
        }
      }
    }

    if (schema.properties) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        if (key in instance) {
          validate(subSchema, instance[key], `${path}.${key}`, root, errors);
        }
      }
    }

    if (schema.additionalProperties === false && typeof instance === 'object') {
      const known = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(instance)) {
        if (!known.has(key)) {
          errors.push({ path: `${path}.${key}`, message: 'unexpected property' });
        }
      }
    }
  }

  if (schema.type === 'array') {
    if (!Array.isArray(instance)) {
      errors.push({ path, message: `Expected array, got ${typeof instance}` });
      return errors;
    }
    if (schema.minItems !== undefined && instance.length < schema.minItems) {
      errors.push({ path, message: `Array too short: min ${schema.minItems}` });
    }
    if (schema.items) {
      instance.forEach((item, idx) => {
        validate(schema.items, item, `${path}[${idx}]`, root, errors);
      });
    }
  }

  if (schema.type === 'string') {
    if (typeof instance !== 'string') {
      errors.push({ path, message: `Expected string, got ${typeof instance}` });
      return errors;
    }
    if (schema.enum && !schema.enum.includes(instance)) {
      errors.push({ path, message: `Value '${instance}' not in enum ${JSON.stringify(schema.enum)}` });
    }
    if (schema.pattern) {
      const re = new RegExp(schema.pattern);
      if (!re.test(instance)) {
        errors.push({ path, message: `Value '${instance}' does not match pattern ${schema.pattern}` });
      }
    }
    if (schema.minLength !== undefined && instance.length < schema.minLength) {
      errors.push({ path, message: `String too short: min length ${schema.minLength}` });
    }
  }

  return errors;
}

// Cross-reference validation:
//   - each event_emission[].tool must reference a declared tool name
//   - each event_emission[].on_event must be a valid AG-UI event kind
//   - no duplicate tool names
//   - no duplicate (tool, on_event) emission rules
//   - custom event kind usage must have a matching custom_events entry
function validateCrossRefs(spec) {
  const violations = [];

  const toolNames = (spec.tools ?? []).map((t) => t.name);
  const toolSet = new Set(toolNames);

  // Duplicate tool names
  const seenTools = new Set();
  for (const name of toolNames) {
    if (seenTools.has(name)) {
      violations.push({ kind: 'duplicate_tool_name', tool: name });
    }
    seenTools.add(name);
  }

  // Tool name format
  for (const name of toolNames) {
    if (!TOOL_NAME_RE.test(name)) {
      violations.push({ kind: 'invalid_tool_name', tool: name, expected: 'snake_case ^[a-z_][a-z0-9_]*$' });
    }
  }

  const customKinds = new Set((spec.custom_events ?? []).map((e) => e.kind));

  // Custom event kind format
  for (const kind of customKinds) {
    if (!CUSTOM_KIND_RE.test(kind)) {
      violations.push({ kind: 'invalid_custom_event_kind', value: kind, expected: '^CUSTOM_[A-Z_]+$' });
    }
  }

  const emissionRules = spec.event_emission ?? [];
  const seenEmissions = new Set();

  for (let i = 0; i < emissionRules.length; i++) {
    const rule = emissionRules[i];
    const ruleKey = `${rule.tool}::${rule.on_event}`;

    // Tool reference
    if (!toolSet.has(rule.tool)) {
      violations.push({ kind: 'unresolved_tool_ref', at: `event_emission[${i}]`, tool: rule.tool });
    }

    // Event kind validity
    if (!VALID_EVENT_KINDS.has(rule.on_event)) {
      violations.push({ kind: 'invalid_event_kind', at: `event_emission[${i}]`, on_event: rule.on_event });
    }

    // If CUSTOM event kind is used, must have a matching custom_events entry
    if (rule.on_event === 'CUSTOM' && rule.fragment && !customKinds.has(rule.fragment)) {
      // fragment used as custom kind identifier — advisory only
      violations.push({
        kind: 'custom_event_fragment_not_declared',
        at: `event_emission[${i}]`,
        fragment: rule.fragment,
        note: 'Consider adding a custom_events entry for this fragment',
      });
    }

    // Duplicate emission rules
    if (seenEmissions.has(ruleKey)) {
      violations.push({ kind: 'duplicate_emission_rule', at: `event_emission[${i}]`, rule: ruleKey });
    }
    seenEmissions.add(ruleKey);
  }

  return violations;
}

// Build a binding coverage report: which tools emit which event kinds,
// which event kinds have no bindings, which tools have no emission rules.
function buildCoverageReport(spec) {
  const toolNames = (spec.tools ?? []).map((t) => t.name);
  const emissionRules = spec.event_emission ?? [];

  const toolToEvents = new Map(toolNames.map((n) => [n, []]));
  const eventKindsUsed = new Set();

  for (const rule of emissionRules) {
    if (toolToEvents.has(rule.tool)) {
      toolToEvents.get(rule.tool).push({ on_event: rule.on_event, fragment: rule.fragment ?? null });
    }
    eventKindsUsed.add(rule.on_event);
  }

  const toolsWithNoEmissions = toolNames.filter((n) => toolToEvents.get(n).length === 0);
  const eventKindsCovered = [...eventKindsUsed].sort();
  const allEventKinds = [...VALID_EVENT_KINDS].sort();
  const eventKindsUncovered = allEventKinds.filter((k) => !eventKindsUsed.has(k));

  return {
    tool_count: toolNames.length,
    emission_rule_count: emissionRules.length,
    tools_with_no_emissions: toolsWithNoEmissions,
    event_kinds_covered: eventKindsCovered,
    event_kinds_uncovered: eventKindsUncovered,
    tool_emission_map: Object.fromEntries(toolToEvents),
  };
}

function normalize(spec) {
  // Deterministic key ordering: version, metadata, agent, tools, event_emission, custom_events.
  const out = {};
  if ('version' in spec) out.version = spec.version;
  if ('metadata' in spec) out.metadata = spec.metadata;
  if ('agent' in spec) out.agent = spec.agent;

  if ('tools' in spec && Array.isArray(spec.tools)) {
    out.tools = spec.tools.map((tool) => {
      const t = {};
      if ('name' in tool) t.name = tool.name;
      if ('description' in tool) t.description = tool.description;
      if ('parameters' in tool) t.parameters = tool.parameters;
      if ('returns' in tool) t.returns = tool.returns;
      return t;
    }).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  if ('event_emission' in spec && Array.isArray(spec.event_emission)) {
    out.event_emission = spec.event_emission.map((rule) => {
      const r = {};
      if ('tool' in rule) r.tool = rule.tool;
      if ('on_event' in rule) r.on_event = rule.on_event;
      if ('fragment' in rule) r.fragment = rule.fragment;
      if ('condition' in rule) r.condition = rule.condition;
      return r;
    }).sort((a, b) => {
      const ta = a.tool ?? '';
      const tb = b.tool ?? '';
      return ta.localeCompare(tb) || (a.on_event ?? '').localeCompare(b.on_event ?? '');
    });
  }

  if ('custom_events' in spec && Array.isArray(spec.custom_events)) {
    out.custom_events = spec.custom_events.map((e) => {
      const ce = {};
      if ('kind' in e) ce.kind = e.kind;
      if ('description' in e) ce.description = e.description;
      if ('schema' in e) ce.schema = e.schema;
      return ce;
    }).sort((a, b) => (a.kind ?? '').localeCompare(b.kind ?? ''));
  }

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
  const artifactId = args['artifact-id'] ?? 'ag-ui-default';
  const outDir = args['out-dir'] ?? join('dist/previews', artifactId);

  if (!input) {
    process.stderr.write('Usage: normalize-agui.mjs --input <file> --artifact-id <id> [--out-dir <dir>]\n');
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
  const schemaErrors = validate(schema, spec);
  const crossRefViolations = validateCrossRefs(spec);

  const violations = [];
  if (schemaErrors.length) violations.push({ kind: 'schema', errors: schemaErrors });
  if (crossRefViolations.length) {
    for (const v of crossRefViolations) {
      violations.push(v);
    }
  }

  ensureDir(outDir);

  const report = {
    status: violations.length === 0 ? 'success' : 'failed',
    artifact_id: artifactId,
    input,
    schema: SCHEMA_PATH,
    violations,
    generated_at: new Date().toISOString(),
  };

  if (violations.length) {
    writeFileSync(join(outDir, 'normalize-report.json'), JSON.stringify(report, null, 2));
    process.stderr.write(JSON.stringify(report, null, 2) + '\n');
    process.exit(1);
  }

  const normalized = normalize(spec);
  const coverage = buildCoverageReport(spec);

  writeFileSync(join(outDir, 'normalized.ag-ui.json'), JSON.stringify(normalized, null, 2));
  writeFileSync(join(outDir, 'normalize-report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(outDir, 'coverage-report.json'), JSON.stringify(coverage, null, 2));
  process.stdout.write(`OK ${outDir}\n`);
}

main();
