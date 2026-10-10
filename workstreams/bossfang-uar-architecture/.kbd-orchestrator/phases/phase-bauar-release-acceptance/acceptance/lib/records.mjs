import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile, realpath, mkdir, open, rename } from 'node:fs/promises';
import { isAbsolute, normalize, relative, dirname, join } from 'node:path';

export class AcceptanceError extends Error {
  constructor(category, exitCode = 2) { super(category); this.category = category; this.exitCode = exitCode; }
}
export function requireValue(value, category, exitCode = 2) {
  if (!value) throw new AcceptanceError(category, exitCode);
}
export function safeError(error) {
  return error instanceof AcceptanceError ? { category: error.category, exitCode: error.exitCode }
    : { category: 'unavailable_or_invalid_input', exitCode: 2 };
}
export function eligiblePath(path) {
  requireValue(typeof path === 'string' && isAbsolute(path) && normalize(path) === path, 'absolute_path_required');
  requireValue(!/(?:^|[/\\])(?:bauar_session_owner\.rs|mcp_server\.rs)(?:$|[/\\])/.test(path), 'excluded_path');
  return path;
}
export function within(root, path) {
  eligiblePath(root); eligiblePath(path);
  const child = relative(root, path);
  return child !== '' && child !== '..' && !child.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(child);
}
export async function regularFile(path) {
  eligiblePath(path);
  const stat = await lstat(path);
  requireValue(stat.isFile() && !stat.isSymbolicLink(), 'regular_file_required');
  // Installed executable symlink resolution is recorded separately; evidence files cannot redirect.
  requireValue(await realpath(path) === path, 'evidence_symlink_refused');
  return stat;
}
export async function hashFile(path) {
  await regularFile(path);
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return hash.digest('hex');
}
export function digest(value) {
  function ordered(item) {
    if (Array.isArray(item)) return item.map(ordered);
    if (item && typeof item === 'object') return Object.fromEntries(Object.keys(item).sort().map(key => [key, ordered(item[key])]));
    return item;
  }
  return createHash('sha256').update(JSON.stringify(ordered(value))).digest('hex');
}
export async function readJson(path) {
  const stat = await regularFile(path);
  requireValue(stat.size <= 4 * 1024 * 1024, 'record_size_exceeded');
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch { throw new AcceptanceError('record_json_invalid'); }
}
export async function verifyRef(ref) {
  requireValue(ref && /^[a-f0-9]{64}$/.test(ref.sha256), 'file_binding_invalid');
  requireValue(await hashFile(ref.path) === ref.sha256, 'file_binding_changed');
  return ref;
}
export async function writeNew(path, value) {
  eligiblePath(path);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  requireValue(await realpath(dirname(path)) === dirname(path), 'output_parent_redirected');
  // The exclusive reservation prevents overwriting a prior receipt, even on retry.
  const reservation = await open(`${path}.reservation`, 'wx', 0o600);
  await reservation.close();
  try { await lstat(path); throw new AcceptanceError('immutable_record_exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const pending = join(dirname(path), `.${randomUUID()}.pending`);
  const handle = await open(pending, 'wx', 0o600);
  try { await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`); await handle.sync(); }
  finally { await handle.close(); }
  await rename(pending, path);
  return { path, sha256: await hashFile(path) };
}

/** Deliberately limited to the vocabulary used by our two draft-2020-12 schemas. */
export function validate(value, schema, document = schema) {
  if (schema.$ref) {
    requireValue(schema.$ref.startsWith('#/$defs/'), 'schema_reference_invalid');
    return validate(value, document.$defs[schema.$ref.slice(8)], document);
  }
  requireValue(schema && typeof schema === 'object', 'schema_invalid');
  if (schema.anyOf) {
    requireValue(schema.anyOf.some(branch => { try { validate(value, branch, document); return true; } catch { return false; } }), 'schema_union_invalid');
  }
  if (schema.const !== undefined) requireValue(JSON.stringify(value) === JSON.stringify(schema.const), 'schema_constant_invalid');
  if (schema.enum) requireValue(schema.enum.includes(value), 'schema_enum_invalid');
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  const matches = type => type === 'null' ? value === null : type === 'array' ? Array.isArray(value)
    : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : type === 'integer' ? Number.isSafeInteger(value) : typeof value === type;
  if (types.length) requireValue(types.some(matches), 'schema_type_invalid');
  if (typeof value === 'string') {
    if (schema.minLength !== undefined) requireValue(value.length >= schema.minLength, 'schema_string_invalid');
    if (schema.maxLength !== undefined) requireValue(value.length <= schema.maxLength, 'schema_string_invalid');
    if (schema.pattern) requireValue(new RegExp(schema.pattern).test(value), 'schema_string_invalid');
  }
  if (typeof value === 'number') {
    requireValue(Number.isFinite(value), 'schema_number_invalid');
    if (schema.minimum !== undefined) requireValue(value >= schema.minimum, 'schema_number_invalid');
    if (schema.maximum !== undefined) requireValue(value <= schema.maximum, 'schema_number_invalid');
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined) requireValue(value.length >= schema.minItems, 'schema_array_invalid');
    if (schema.maxItems !== undefined) requireValue(value.length <= schema.maxItems, 'schema_array_invalid');
    if (schema.uniqueItems) requireValue(new Set(value.map(item => JSON.stringify(item))).size === value.length, 'schema_duplicate');
    if (schema.items) for (const item of value) validate(item, schema.items, document);
  } else if (value !== null && typeof value === 'object') {
    if (schema.minProperties !== undefined) requireValue(Object.keys(value).length >= schema.minProperties, 'schema_object_invalid');
    for (const key of schema.required ?? []) requireValue(Object.hasOwn(value, key), 'schema_field_missing');
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) validate(item, schema.properties[key], document);
      else if (schema.additionalProperties === false) throw new AcceptanceError('schema_unknown_field');
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') validate(item, schema.additionalProperties, document);
    }
  }
  return value;
}
