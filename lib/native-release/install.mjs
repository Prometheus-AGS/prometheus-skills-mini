import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { createAtomicWrite, atomicWrite } from '../platform/atomic-write.mjs';
import { assetName, currentHost, executable, product, releaseTag, repository } from './catalog.mjs';
import { buildBinary } from './source.mjs';
import { fileHash, ownedExecutable, receiptFile } from './receipt.mjs';

async function download(name, host, out, base) {
  const asset = assetName(name, host);
  const url = new URL(base.endsWith('/') ? base : base + '/');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('The release mirror must use HTTPS or loopback HTTP');
  }
  const resolveAsset = (file) => new URL(releaseTag + '/' + file, url);
  const binary = await fetch(resolveAsset(asset), { signal: AbortSignal.timeout(600_000) });
  if (binary.status === 404 || binary.status === 410) { await binary.body?.cancel(); return null; }
  if (!binary.ok) throw new Error(`Cannot download ${asset}: HTTP ${binary.status}`);
  const sums = await fetch(resolveAsset('SHA256SUMS'), { signal: AbortSignal.timeout(30_000) });
  if (!sums.ok) { await binary.body?.cancel(); throw new Error(`Cannot verify ${asset}: SHA256SUMS HTTP ${sums.status}`); }
  const entries = (await sums.text()).split(/\r?\n/).map(line => /^([a-f0-9]{64})  (\S+)$/.exec(line))
    .filter(match => match?.[2] === asset);
  if (entries.length !== 1) { await binary.body?.cancel(); throw new Error(`Missing or ambiguous SHA256SUMS entry for ${asset}`); }
  const hash = createHash('sha256');
  await pipeline(binary.body, new Transform({ transform(chunk, encoding, done) { hash.update(chunk); done(null, chunk); } }),
    fs.createWriteStream(out, { flags: 'wx', mode: 0o700 }));
  const digest = hash.digest('hex');
  if (entries[0][1] !== digest) throw new Error(`SHA-256 mismatch for ${asset}`);
  return digest;
}

export async function installNative(name, directory, { sourceOnly = false } = {}) {
  const spec = product(name);
  const host = currentHost();
  const dest = path.join(directory, executable(name));
  fs.mkdirSync(directory, { recursive: true });
  const lock = dest + '.install.lock';
  const fd = fs.openSync(lock, 'wx');
  const temporary = path.join(directory, '.mini-native-' + randomUUID());
  try {
    if (fs.lstatSync(dest, { throwIfNoEntry: false }) && !ownedExecutable(dest, name)) {
      throw new Error(`Refusing to replace unowned or edited executable ${dest}; select a dedicated --bin-dir`);
    }
    const base = process.env.MINI_NATIVE_RELEASE_BASE_URL ?? `https://github.com/${repository}/releases/download/`;
    let digest = !sourceOnly && host ? await download(name, host, temporary, base) : null;
    const source = digest ? 'release' : 'cargo';
    if (!digest) {
      process.stderr.write(`Building ${name} from pinned source ${spec.ref}\n`);
      buildBinary(name, temporary);
      digest = fileHash(temporary);
    }
    const receipt = { owner: 'prometheus-skills-mini', name, tag: releaseTag, target: host?.target ?? `${process.platform}-${process.arch}`,
      revision: spec.ref, source, sha256: digest };
    if (process.platform !== 'win32') fs.chmodSync(temporary, 0o755);
    const replace = createAtomicWrite({ writeFile: (file) => fs.renameSync(temporary, file) });
    replace(dest);
    atomicWrite(receiptFile(dest), JSON.stringify(receipt) + '\n');
    return { ...receipt, path: dest };
  } finally {
    fs.rmSync(temporary, { force: true });
    fs.closeSync(fd);
    fs.rmSync(lock, { force: true });
  }
}
