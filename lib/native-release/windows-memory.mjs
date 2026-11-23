import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { fileHash } from './receipt.mjs';

const url = 'https://api.nuget.org/v3-flatcontainer/microsoft.ml.onnxruntime/1.20.0/microsoft.ml.onnxruntime.1.20.0.nupkg';
const packageSha = '36dbafacb1bc532e92d02371bd70582a61105872561fc9982314854d1c7ebf72';
// Git Bash may put GNU tar first. Windows' inbox bsdtar reads NuGet ZIPs.
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot, 'System32', 'tar.exe') : 'tar';
const native = 'runtimes/win-arm64/native/';
const library = 'onnxruntime.lib';
const server = 'surreal-memory-server.exe';

// ort-sys rc.9's two purported ARM64 Windows static archives contain x64 COFF objects.
// Use Microsoft's package for the same runtime version, including its redistribution notices.
export const companions = [
  ['onnxruntime.dll', native + 'onnxruntime.dll', '72ba338796de548625703c77efa150c03c098c9967a643a8ba9d3249d0be91b8'],
  ['onnxruntime_providers_shared.dll', native + 'onnxruntime_providers_shared.dll', '5c903a669671cda4b7157a8e16ed2003724dad6d4bc3ed293979cd0dbde99d5b'],
  ['onnxruntime-LICENSE.txt', 'LICENSE', 'c250d6278f0b47a6439fb7592b08b58a55eb9f535aa49a1db63211c3f982b674'],
  ['onnxruntime-ThirdPartyNotices.txt', 'ThirdPartyNotices.txt', 'fac5bb85f568b38fd8f3a6aea32737985841f23a1a43e9ce952f79474f883aa9'],
];
export const needsWindowsMemoryBundle = (name, target) => name === 'surreal-memory-server' && target === 'aarch64-pc-windows-msvc';

function extractMember(archive, member, file) {
  // Stream only explicitly named members to new, caller-selected files. An archive
  // cannot create paths, symlinks, hard links or redirects outside staging.
  const fd = fs.openSync(file, 'wx');
  try { execFileSync(tar, ['-xOf', archive, member], { stdio: ['ignore', fd, 'inherit'] }); }
  finally { fs.closeSync(fd); }
}

function checkedMember(archive, member, file, digest) {
  extractMember(archive, member, file);
  if (fileHash(file) !== digest) throw new Error('Incorrect Microsoft ONNX Runtime file: ' + member);
}

export async function prepareWindowsMemory(directory) {
  const sdk = path.join(directory, 'ort');
  const lib = path.join(sdk, 'lib');
  const payload = path.join(sdk, 'payload');
  fs.mkdirSync(lib, { recursive: true });
  fs.mkdirSync(payload);
  const archive = path.join(sdk, 'runtime.nupkg');
  const response = await fetch(url, { signal: AbortSignal.timeout(600_000) });
  if (!response.ok) throw new Error('Cannot download Microsoft ONNX Runtime: HTTP ' + response.status);
  await pipeline(response.body, fs.createWriteStream(archive, { flags: 'wx' }));
  if (fileHash(archive) !== packageSha) throw new Error('Incorrect Microsoft ONNX Runtime package digest');
  checkedMember(archive, native + library, path.join(lib, library), '3395596e50a0573f791bd57c45dfe05031765973cccd4fa14be44f281b78dc24');
  for (const [name, member, sha] of companions) checkedMember(archive, member, path.join(payload, name), sha);
  // ort-sys checks for a static library at sdk/onnxruntime.lib even when dynamic
  // linking is requested. With the import library in sdk/lib it selects the DLL.
  return { payload, env: { ORT_LIB_LOCATION: sdk, ORT_PREFER_DYNAMIC_LINK: '1', LIBONNXRUNTIME_NO_PKG_CONFIG: '1' } };
}

export function bundleWindowsMemory(payload, executable, archive) {
  fs.copyFileSync(executable, path.join(payload, server));
  execFileSync(tar, ['-czf', path.resolve(archive), server, ...companions.map(([name]) => name)], { cwd: payload });
}

export function installWindowsMemoryBundle(archive, directory, stagedServer) {
  const stage = fs.mkdtempSync(path.join(directory, '.mini-memory-'));
  try {
    extractMember(archive, server, stagedServer);
    for (const [name, , sha] of companions) {
      checkedMember(archive, name, path.join(stage, name), sha);
      const destination = path.join(directory, name);
      const existing = fs.lstatSync(destination, { throwIfNoEntry: false });
      if (existing && (!existing.isFile() || fileHash(destination) !== sha)) {
        throw new Error('Refusing to replace an existing ONNX Runtime dependency: ' + destination);
      }
    }
    // All bytes and existing destinations were checked before installing anything.
    // Matching sidecars can be reused after an interrupted or repeated install.
    for (const [name] of companions) {
      const dest = path.join(directory, name);
      if (!fs.existsSync(dest)) fs.renameSync(path.join(stage, name), dest);
    }
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}
