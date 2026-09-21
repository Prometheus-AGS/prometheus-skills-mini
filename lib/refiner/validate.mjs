// The validation the KBD QA gate calls, replacing validate-manifest.sh (101
// lines), validate-constraints.sh (40) and both python3 heredocs in
// agents/artifact-validator.md.
//
// Every one of those python3 calls is json.load, os.path.exists or list/dict
// logic — stdlib in either language. Nothing here needs an interpreter, a child
// process or a JSON-schema library: the upstream "schema check" reads
// schema.required and nothing else, so that is what this reproduces rather than
// pretending to full JSON Schema validation it never did.
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { readText } from '../platform/text.mjs';

// Absent input is not a failure. A refinement session may legitimately have no
// manifest yet, and failing here would block the gate on work that has not
// started. Upstream exits 0 with an informational line; this returns skipped.
const SKIPPED = (file) => ({ ok: true, status: 'skipped', reason: `${file} not present`, errors: [], warnings: [] });

const readJson = (file) => {
  try {
    return { value: JSON.parse(readText(file)) };
  } catch (error) {
    return { error: `${path.basename(file)} is not valid JSON: ${error.message}` };
  }
};

const missingRequired = (schema, value) =>
  (schema?.required ?? []).filter((key) => !(key in value));

// A reference is bad if it is absent OR present-but-empty. Upstream checked only
// existence; the validator agent added the zero-byte case, and a zero-byte
// variant is a failed render rather than a finished artifact.
const referenceErrors = (root, refs) => {
  const errors = [];
  for (const { owner, ref } of refs) {
    const file = path.resolve(root, ref);
    if (!existsSync(file)) {
      errors.push(`missing referenced file: ${owner}:${ref}`);
      continue;
    }
    if (statSync(file).size === 0) errors.push(`referenced file is empty (0 bytes): ${owner}:${ref}`);
  }
  return errors;
};

const collectReferences = (manifest) => {
  const refs = [];
  for (const variant of manifest.variants ?? []) {
    const owner = variant.name ?? '<unnamed>';
    if (typeof variant.file === 'string') refs.push({ owner, ref: variant.file });
    if (Array.isArray(variant.files)) {
      for (const ref of variant.files) if (typeof ref === 'string') refs.push({ owner, ref });
    }
  }

  const preview = typeof manifest.preview === 'object' && manifest.preview ? manifest.preview : {};
  for (const run of Array.isArray(preview.runs) ? preview.runs : []) {
    const owner = `preview:${run.artifact_id ?? 'unknown'}`;
    for (const key of ['html', 'screenshot', 'report']) {
      if (run[key]) refs.push({ owner, ref: run[key] });
    }
  }
  return refs;
};

const previewErrors = (manifest) => {
  const preview = typeof manifest.preview === 'object' && manifest.preview ? manifest.preview : {};
  const runs = Array.isArray(preview.runs) ? preview.runs : [];
  // A ui or a2ui artifact needs a preview unless it says otherwise; anything else
  // needs one only if it asks.
  const required = preview.required ?? ['ui', 'a2ui'].includes(manifest.artifact_type);
  if (!required) return [];

  const errors = [];
  if (runs.length === 0) errors.push('preview is required but preview.runs is empty');
  for (const run of runs) {
    const id = run.artifact_id ?? 'unknown';
    for (const key of ['html', 'screenshot', 'report']) {
      if (!run[key]) errors.push(`preview run ${id} missing field: ${key}`);
    }
  }
  return errors;
};

export function validateManifest({ root = process.cwd(), schema = null, file = 'artifact_manifest.json' } = {}) {
  const manifestPath = path.join(root, file);
  if (!existsSync(manifestPath)) return SKIPPED(file);

  const parsed = readJson(manifestPath);
  if (parsed.error) return { ok: false, status: 'invalid', errors: [parsed.error], warnings: [] };

  const manifest = parsed.value;
  const errors = [];

  const missing = missingRequired(schema, manifest);
  if (missing.length > 0) errors.push(`missing required fields: ${missing.join(', ')}`);

  errors.push(...referenceErrors(root, collectReferences(manifest)));
  errors.push(...previewErrors(manifest));

  return { ok: errors.length === 0, status: errors.length === 0 ? 'valid' : 'invalid', errors, warnings: [] };
}

export function validateConstraints({ root = process.cwd(), schema = null, file = 'constraints.json' } = {}) {
  const constraintsPath = path.join(root, file);
  if (!existsSync(constraintsPath)) return SKIPPED(file);

  const parsed = readJson(constraintsPath);
  if (parsed.error) return { ok: false, status: 'invalid', errors: [parsed.error], warnings: [] };

  const constraints = parsed.value;
  const errors = [];
  const warnings = [];

  const missing = missingRequired(schema, constraints);
  if (missing.length > 0) errors.push(`missing required fields: ${missing.join(', ')}`);

  // Upstream accepts either key, and reports a hookless blocking constraint as a
  // WARNING that still exits 0 — it is a gap in the constraint set, not invalid input.
  const items = constraints.constraints ?? constraints.items ?? [];
  for (const constraint of Array.isArray(items) ? items : []) {
    if (constraint?.severity === 'blocking' && !constraint.validation) {
      warnings.push(`blocking constraint '${constraint.id ?? 'unknown'}' has no validation hook`);
    }
  }

  return { ok: errors.length === 0, status: errors.length === 0 ? 'valid' : 'invalid', errors, warnings };
}
