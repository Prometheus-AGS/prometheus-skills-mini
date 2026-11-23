import fs from 'node:fs';
import path from 'node:path';
import { assetName, currentHost, product } from '../lib/native-release/catalog.mjs';
import { buildBinary } from '../lib/native-release/source.mjs';
import { planRelease, publishRelease } from '../lib/native-release/publish.mjs';

try {
  const [command, first, second, third] = process.argv.slice(2);
  if (command === 'plan') {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const result = planRelease({ eventName: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF,
      sha: process.env.GITHUB_SHA, before: event.before });
    const lines = Object.entries(result).map(([key, value]) => key + '=' + (typeof value === 'object' ? JSON.stringify(value) : value));
    fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n');
  } else if (command === 'build') {
    const host = currentHost();
    if (!host || host.target !== second) throw new Error('Release build requires the declared native host: ' + second);
    product(first);
    fs.mkdirSync(third, { recursive: true });
    buildBinary(first, path.join(third, assetName(first, host)), host.target);
  } else if (command === 'publish') {
    publishRelease(first, second);
  } else { throw new Error('Expected plan, build <tool> <target> <directory>, or publish <directory> <commit>'); }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
