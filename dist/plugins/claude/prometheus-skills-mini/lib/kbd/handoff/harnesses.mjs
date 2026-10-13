// The harnesses a KBD phase can be handed to, and where each one keeps its native role
// definitions and its installed skills. Pure data plus a resolver; no I/O.
//
// Agent directories match the native exports of skills/agent-team-creator (see its
// references/native-harnesses.md). Skill roots are the skill-system.json copy targets for each
// harness, plus `.agents/skills` for Codex and `.kimi-code/skills` for Kimi Code, which are the
// locations those harnesses read. Each root is checked under the user home and the project.

const HARNESSES = Object.freeze({
  'claude-code': Object.freeze({
    id: 'claude-code',
    label: 'Claude Code',
    agentsDir: '.claude/agents',
    agentExtension: '.md',
    agentNameStyle: 'kebab',
    skillRoots: Object.freeze(['.claude/skills']),
  }),
  codex: Object.freeze({
    id: 'codex',
    label: 'Codex',
    agentsDir: '.codex/agents',
    agentExtension: '.toml',
    agentNameStyle: 'snake',
    skillRoots: Object.freeze(['.codex/skills', '.agents/skills']),
  }),
  opencode: Object.freeze({
    id: 'opencode',
    label: 'OpenCode',
    agentsDir: '.opencode/agents',
    agentExtension: '.md',
    agentNameStyle: 'kebab',
    skillRoots: Object.freeze(['.opencode/skills']),
  }),
  'kimi-code': Object.freeze({
    id: 'kimi-code',
    label: 'Kimi Code',
    agentsDir: '.kimi-code/agents',
    agentExtension: '.md',
    agentNameStyle: 'kebab',
    skillRoots: Object.freeze(['.kimi-code/skills']),
  }),
});

const ALIASES = Object.freeze({ claude: 'claude-code', kimi: 'kimi-code' });

export const SUPPORTED_HARNESSES = Object.freeze(Object.keys(HARNESSES));

/** The harness record for an id or alias, or null when it is not supported. */
export function resolveHarness(name) {
  if (typeof name !== 'string') return null;
  const key = name.trim().toLowerCase();
  return HARNESSES[ALIASES[key] ?? key] ?? null;
}

/** The native definition file name a harness uses for a team role id. */
export function agentFileName(harness, roleId) {
  const base = harness.agentNameStyle === 'snake' ? roleId.replace(/-/g, '_') : roleId;
  return `${base}${harness.agentExtension}`;
}
