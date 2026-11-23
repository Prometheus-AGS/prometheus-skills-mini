import path from 'node:path';
import { parseArgs } from 'node:util';
import { root } from '../lib/native-release/catalog.mjs';
import { installNative } from '../lib/native-release/install.mjs';

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true, options: { 'bin-dir': { type: 'string' }, 'source-only': { type: 'boolean' } },
  });
  const directory = path.resolve(values['bin-dir'] ?? path.join(root, '.prometheus', 'native', 'bin'));
  for (const name of positionals.length ? positionals : ['prometheus', 'pk']) {
    console.log(JSON.stringify(await installNative(name, directory, { sourceOnly: values['source-only'] })));
  }
  process.stderr.write(`Use ${directory} on the PATH of the harness or application that runs Mini.\n`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
