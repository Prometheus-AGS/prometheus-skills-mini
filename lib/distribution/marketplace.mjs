// Builds .claude-plugin/marketplace.json and .agents/plugins/marketplace.json content.
//
// The mini has one plugin to list -- itself -- unlike the full pack's ten (no sibling
// react/devops/testing/etc. plugin trees exist in this repo). Codex's copy additionally carries
// the `policy: {installation, authentication}` block the full pack's Codex marketplace does,
// per prometheus-skill-pack/.agents/plugins/marketplace.json.

const OWNER = { name: 'Travis James', url: 'https://travisjames.ai' };
const DESCRIPTION = 'Prometheus skills-mini marketplace';

export function claudeMarketplace(contract) {
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
    ],
  };
}

export function codexMarketplace(contract) {
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
    ],
  };
}
