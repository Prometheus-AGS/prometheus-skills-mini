// Builds .claude-plugin/marketplace.json and .agents/plugins/marketplace.json content.
//
// Imported packages stay adjacent to the mini rather than being flattened into its skill inventory.
// Codex entries additionally carry the `policy: {installation, authentication}` block the full
// pack's Codex marketplace does, per prometheus-skill-pack/.agents/plugins/marketplace.json.

import { adjacentMarketplaceEntries } from './adjacent-plugins.mjs';

const OWNER = { name: 'Travis James', url: 'https://travisjames.ai' };
const DESCRIPTION = 'Prometheus skills-mini marketplace';

export function claudeMarketplace(contract, adjacent = []) {
  return {
    name: contract.name,
    version: contract.releaseVersion,
    description: DESCRIPTION,
    owner: OWNER,
    plugins: [
      {
        name: contract.name,
        source: `./${contract.outputs.claudePackage}`,
        version: contract.releaseVersion,
        category: 'productivity',
        description:
          'Windows-native, scaled-down port of the Prometheus skill system: KBD process ' +
          'orchestration, adversarial review, and portable agent tooling.',
      },
      ...adjacentMarketplaceEntries(adjacent, 'claude'),
    ],
  };
}

export function codexMarketplace(contract, adjacent = []) {
  return {
    name: contract.name,
    version: contract.releaseVersion,
    description: DESCRIPTION,
    owner: OWNER,
    interface: { displayName: 'Prometheus Skills Mini' },
    plugins: [
      {
        name: contract.name,
        source: { source: 'local', path: `./${contract.outputs.codexPackage}` },
        version: contract.releaseVersion,
        category: 'productivity',
        description:
          'Windows-native, scaled-down port of the Prometheus skill system: KBD process ' +
          'orchestration, adversarial review, and portable agent tooling.',
        policy: { installation: 'INSTALLED_BY_DEFAULT', authentication: 'ON_INSTALL' },
      },
      ...adjacentMarketplaceEntries(adjacent, 'codex'),
    ],
  };
}
