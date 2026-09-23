// Builds the Claude and Codex plugin.json content, to the exact schemas captured from
// prometheus-skill-pack's dist/plugins/{claude,codex}/prometheus-skill-pack/.*-plugin/plugin.json.
//
// Claude: name, version, description, author, homepage, repository, license, keywords,
// skills: "./skills", mcpServers: "./.mcp.json". No `hooks` field -- Claude Code auto-discovers
// hooks via a sibling hooks/hooks.json when present. No `agents` field.
//
// Codex: the same core fields plus `interface` (capabilities, category, defaultPrompt,
// developerName, displayName, longDescription, shortDescription, websiteURL). Explicitly no
// `hooks` field -- Codex rejects the manifest if one is present.

const DESCRIPTION =
  'Windows-native, scaled-down port of the Prometheus skill system: KBD process orchestration, ' +
  'adversarial review, and portable agent tooling.';
const HOMEPAGE = 'https://github.com/Prometheus-AGS/prometheus-skills-mini';
const AUTHOR = { name: 'Travis James', url: 'https://travisjames.ai' };
const KEYWORDS = ['agent-skills', 'process-orchestration', 'kbd', 'windows', 'openspec'];

function baseManifest(contract) {
  return {
    name: contract.name,
    version: contract.releaseVersion,
    description: DESCRIPTION,
    author: AUTHOR,
    homepage: HOMEPAGE,
    repository: HOMEPAGE,
    license: 'MIT',
    keywords: KEYWORDS,
    skills: './skills',
    mcpServers: './.mcp.json',
  };
}

export function claudePluginManifest(contract) {
  return baseManifest(contract);
}

export function codexPluginManifest(contract) {
  return {
    ...baseManifest(contract),
    interface: {
      capabilities: ['skills'],
      category: 'productivity',
      defaultPrompt:
        'Use the Prometheus skills-mini pack to select and apply the most relevant installed skill for this task.',
      developerName: AUTHOR.name,
      displayName: 'Prometheus Skills Mini',
      longDescription:
        'A self-contained, Windows-native distribution of the Prometheus KBD process, adversarial ' +
        'review, and supporting agent skills -- no symlinks, no shell scripts, no Python.',
      shortDescription: 'Portable Prometheus KBD skills for agentic software work.',
      websiteURL: HOMEPAGE,
    },
  };
}
