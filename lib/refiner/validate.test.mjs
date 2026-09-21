import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { validateManifest, validateConstraints } from './validate.mjs';

const withRoot = (run) => {
  const root = mkdtempSync(path.join(tempDir(), 'validate-'));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const write = (root, rel, contents) => {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof contents === 'string' ? contents : JSON.stringify(contents));
  return file;
};

const manifestSchema = { required: ['artifact_name', 'artifact_type'] };

// ── Manifest ────────────────────────────────────────────────────────────────

test('a missing manifest is skipped, not failed — there may be nothing to validate yet', () => {
  const result = withRoot((root) => validateManifest({ root }));

  assert.equal(result.status, 'skipped');
  assert.equal(result.ok, true);
});

test('a manifest that is not valid JSON fails', () => {
  const result = withRoot((root) => {
    write(root, 'artifact_manifest.json', '{ not json');
    return validateManifest({ root });
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /not valid JSON/i);
});

test('a manifest missing a schema-required field fails and names every missing field', () => {
  const result = withRoot((root) => {
    write(root, 'artifact_manifest.json', { variants: [] });
    return validateManifest({ root, schema: manifestSchema });
  });

  assert.equal(result.ok, false);
  const joined = result.errors.join(' ');
  assert.match(joined, /artifact_name/);
  assert.match(joined, /artifact_type/);
});

test('a manifest naming a file that does not exist fails and names it', () => {
  const result = withRoot((root) => {
    write(root, 'artifact_manifest.json', {
      artifact_name: 'a',
      artifact_type: 'content',
      variants: [{ name: 'main', file: 'dist/missing.svg' }],
    });
    return validateManifest({ root, schema: manifestSchema });
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /dist\/missing\.svg/);
});

test('a referenced file that exists but is empty fails', () => {
  const result = withRoot((root) => {
    write(root, 'dist/empty.svg', '');
    write(root, 'artifact_manifest.json', {
      artifact_name: 'a',
      artifact_type: 'content',
      variants: [{ name: 'main', file: 'dist/empty.svg' }],
    });
    return validateManifest({ root, schema: manifestSchema });
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /empty|0 bytes/i);
});

test('the variants[].files array is checked, not only variants[].file', () => {
  const result = withRoot((root) => {
    write(root, 'dist/present.svg', 'content');
    write(root, 'artifact_manifest.json', {
      artifact_name: 'a',
      artifact_type: 'content',
      variants: [{ name: 'main', files: ['dist/present.svg', 'dist/absent.svg'] }],
    });
    return validateManifest({ root, schema: manifestSchema });
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /dist\/absent\.svg/);
});

test('preview run references are checked', () => {
  const result = withRoot((root) => {
    write(root, 'artifact_manifest.json', {
      artifact_name: 'a',
      artifact_type: 'content',
      preview: { runs: [{ artifact_id: 'r1', html: 'dist/gone.html' }] },
    });
    return validateManifest({ root, schema: manifestSchema });
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /gone\.html/);
});

test('a ui artifact requires a preview run', () => {
  const result = withRoot((root) => {
    write(root, 'artifact_manifest.json', { artifact_name: 'a', artifact_type: 'ui' });
    return validateManifest({ root, schema: manifestSchema });
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /preview/i);
});

test('an explicit preview.required false overrides the artifact-type default', () => {
  const result = withRoot((root) => {
    write(root, 'artifact_manifest.json', {
      artifact_name: 'a',
      artifact_type: 'ui',
      preview: { required: false },
    });
    return validateManifest({ root, schema: manifestSchema });
  });

  assert.equal(result.ok, true);
});

test('a valid manifest passes', () => {
  const result = withRoot((root) => {
    write(root, 'dist/logo.svg', '<svg/>');
    write(root, 'artifact_manifest.json', {
      artifact_name: 'acme',
      artifact_type: 'content',
      variants: [{ name: 'main', file: 'dist/logo.svg' }],
    });
    return validateManifest({ root, schema: manifestSchema });
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('a CRLF manifest parses identically to an LF one', () => {
  const result = withRoot((root) => {
    write(root, 'artifact_manifest.json', '{\r\n  "artifact_name": "a",\r\n  "artifact_type": "content"\r\n}\r\n');
    return validateManifest({ root, schema: manifestSchema });
  });

  assert.equal(result.ok, true);
});

// ── Constraints ─────────────────────────────────────────────────────────────

test('a missing constraints file is skipped, not failed', () => {
  const result = withRoot((root) => validateConstraints({ root }));

  assert.equal(result.status, 'skipped');
  assert.equal(result.ok, true);
});

test('constraints that are not valid JSON fail', () => {
  const result = withRoot((root) => {
    write(root, 'constraints.json', 'nope{');
    return validateConstraints({ root });
  });

  assert.equal(result.ok, false);
});

test('a blocking constraint with no validation hook is a WARNING, not an error', () => {
  const result = withRoot((root) => {
    write(root, 'constraints.json', {
      constraints: [{ id: 'no-any', severity: 'blocking' }],
    });
    return validateConstraints({ root, schema: { required: [] } });
  });

  // Upstream prints this to stderr and still exits 0 — it must not block.
  assert.equal(result.ok, true);
  assert.match(result.warnings.join(' '), /no-any/);
});

test('constraints under an items key are read as well as under constraints', () => {
  const result = withRoot((root) => {
    write(root, 'constraints.json', { items: [{ id: 'from-items', severity: 'blocking' }] });
    return validateConstraints({ root, schema: { required: [] } });
  });

  assert.match(result.warnings.join(' '), /from-items/);
});

test('validate.mjs shells out to nothing', () => {
  const source = readFileSync(new URL('./validate.mjs', import.meta.url), 'utf8');

  // This replaces two python3 heredocs; neither python3 nor a child process survives.
  assert.doesNotMatch(source, /child_process|execSync|spawnSync/);
});
