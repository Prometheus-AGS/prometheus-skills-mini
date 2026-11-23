import { createHash } from 'node:crypto';
import { product, products, releaseTag } from './catalog.mjs';

const prefix = '# mini-native-source-v1 ';

// The first immutable release shipped SHA256SUMS before it contained source rows.
// These inputs come from versions.toml and lib/native-release/catalog.mjs at its
// tagged commit 24f2f8f2cf08a6b36f7961f84a42a4781764ca18. Bind them to those
// published bytes so a repackaged checksum list cannot inherit their provenance.
const legacy = {
  tag: 'v1.20.0',
  sumsSha256: 'f616c6bef77b683326d2adcabb37bc7d0ace8d38d9972138e4104f93b3702024',
  inputs: {
    pk: ['Prometheus-AGS/prometheus-knowledge-rs', '4b3a6744a4211512ff88a1cb96cf1e2a7db4c3ef', 'pk-cli', '.'],
    prometheus: ['Prometheus-AGS/prometheus-skill-system', 'd0af0f66fb2eff397309330e517d7919a284ce11', 'prometheus-cli', 'tools/prometheus-cli'],
    'liter-llm': ['GQAdonis/liter-llm', 'a6047386cc9fae4258b4a8577f6a016022095586', 'liter-llm-cli', '.'],
    'surreal-memory-server': ['Prometheus-AGS/surreal-memory-server', '63eb413ebf520a4a525ffd3b8d1d07f1389d48d4', 'surreal-memory-server', '.',
      '--no-default-features', '--features', 'server-only,palace,local-embeddings'],
  },
};

function inputs(name) {
  const { repository, ref, pkg, workspace = '.', flags = [] } = product(name);
  return [repository, ref, pkg, workspace, ...flags];
}

export function sourceRows() {
  return Object.keys(products).sort().map(name => prefix + JSON.stringify([releaseTag, name, ...inputs(name)]));
}

export function matchesReleaseInputs(name, document) {
  let tagged;
  if (releaseTag === legacy.tag) {
    if (createHash('sha256').update(document).digest('hex') !== legacy.sumsSha256) {
      throw new Error('SHA-256 mismatch for immutable ' + releaseTag + ' SHA256SUMS');
    }
    tagged = legacy.inputs[name];
  } else {
    const records = document.toString('utf8').split(/\r?\n/).filter(line => line.startsWith(prefix))
      .map(line => JSON.parse(line.slice(prefix.length)));
    const matches = records.filter(row => Array.isArray(row) && row[0] === releaseTag && row[1] === name);
    if (matches.length !== 1 || matches[0].length < 6 || !matches[0].every(v => typeof v === 'string' && v)
        || !/^[a-f0-9]{40}$/.test(matches[0][3])) {
      throw new Error('Missing or malformed release source identity for ' + name);
    }
    tagged = matches[0].slice(2);
  }
  return JSON.stringify(tagged) === JSON.stringify(inputs(name));
}
