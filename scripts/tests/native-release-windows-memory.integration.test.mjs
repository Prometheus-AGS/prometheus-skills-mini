// Local COFF linker gate. It exercises the two Windows CRT targets and the real
// ARM64 NuGet import library, DLL, release archive, and installed sidecars.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assetName, hosts } from '../../lib/native-release/catalog.mjs';
import { nativeBuildEnvironment } from '../../lib/native-release/source.mjs';
import { fileHash } from '../../lib/native-release/receipt.mjs';
import { bundleWindowsMemory, companions, installWindowsMemoryBundle, prepareWindowsMemory } from '../../lib/native-release/windows-memory.mjs';

test('MSVC CRT and the pinned Windows ARM64 ONNX runtime link and install together', {
  skip: process.env.MINI_NATIVE_WINDOWS_LINK_GATE !== '1' && 'local gate needs clang-cl, lld-link, llvm-readobj and bsdtar',
}, async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-native-msvc-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true, maxRetries: 3 }));
  const run = (program, args) => execFileSync(program, args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const crt = '#ifdef _DLL\n#pragma detect_mismatch("RuntimeLibrary","MD_DynamicRelease")\n#else\n#pragma detect_mismatch("RuntimeLibrary","MT_StaticRelease")\n#endif\n';
  fs.writeFileSync(path.join(directory, 'entry.cpp'), crt + 'extern "C" void api(); extern "C" void entry(){api();}');
  fs.writeFileSync(path.join(directory, 'api.cpp'), crt + 'extern "C" void api(){}');
  const realOrt = await prepareWindowsMemory(directory);
  for (const host of hosts.filter(h => h.platform === 'win32')) {
    const name = 'surreal-memory-server';
    const compilerFlags = nativeBuildEnvironment(name, host.target)['CXXFLAGS_' + host.target].split(/\s+/);
    const compile = (file, flags) => run('clang-cl', ['--target=' + host.target, '/nologo', '/c', ...flags, file + '.cpp', '/Fo' + file + '.obj']);
    const link = ['/entry:entry', '/subsystem:console', '/nodefaultlib', '/out:memory.exe', 'entry.obj', 'api.obj'];
    compile('api', ['/MD']);
    compile('entry', ['/MT']);
    assert.match(spawnSync('lld-link', link, { cwd: directory, encoding: 'utf8' }).stderr, /mismatch detected for 'RuntimeLibrary'/);
    compile('entry', ['/MT', ...compilerFlags]);
    run('lld-link', link);
    if (host.arch !== 'arm64') continue;
    fs.writeFileSync(path.join(directory, 'api.cpp'), crt + 'extern "C" __declspec(dllimport) void* OrtGetApiBase(); extern "C" void api(){OrtGetApiBase();}');
    compile('api', ['/MD']);
    run('lld-link', [...link, path.join(realOrt.env.ORT_LIB_LOCATION, 'lib', 'onnxruntime.lib')]);
    const imports = run('llvm-readobj', ['--file-headers', '--coff-imports', 'memory.exe']);
    assert.match(imports, /IMAGE_FILE_MACHINE_ARM64/);
    // Microsoft's import library binds OrtGetApiBase by ordinal 1.
    assert.match(imports, /Name: onnxruntime\.dll[^}]*Symbol:\s+\(1\)/);
    const archive = path.join(directory, assetName(name, host));
    bundleWindowsMemory(realOrt.payload, path.join(directory, 'memory.exe'), archive);
    const output = path.join(directory, 'install');
    fs.mkdirSync(output);
    const exe = path.join(output, 'surreal-memory-server.exe');
    installWindowsMemoryBundle(archive, output, exe);
    assert.equal(fileHash(exe), fileHash(path.join(directory, 'memory.exe')));
    for (const [file, , expected] of companions) assert.equal(fileHash(path.join(output, file)), expected);
    const dll = path.join(output, 'onnxruntime.dll');
    assert.match(run('llvm-readobj', ['--coff-exports', dll]), /Ordinal: 1\s+Name: OrtGetApiBase/);
    fs.writeFileSync(dll, 'existing application library');
    assert.throws(() => installWindowsMemoryBundle(archive, output, path.join(directory, 'new.exe')), /Refusing to replace/);
    assert.equal(fs.readFileSync(dll, 'utf8'), 'existing application library');
  }
});
