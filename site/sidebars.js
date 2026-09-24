// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/installation', 'getting-started/npm-scripts'],
    },
    {
      type: 'category',
      label: 'KBD Process',
      items: ['kbd/overview', 'kbd/skills'],
    },
    {
      type: 'category',
      label: 'Review & Ideation',
      items: ['review/adversarial-review', 'ideation/ideation-mindmap'],
    },
    {
      type: 'category',
      label: 'Agent Teams',
      items: ['agent-teams/overview'],
    },
    {
      type: 'category',
      label: 'Karpathy Logging',
      items: ['karpathy/progress-memory'],
    },
    {
      type: 'category',
      label: 'Artifact Refinement',
      items: ['artifact-refinement/overview'],
    },
    {
      type: 'category',
      label: 'Scaffolding',
      items: ['scaffolding/overview'],
    },
    {
      type: 'category',
      label: 'Conversion',
      items: ['conversion/overview'],
    },
    {
      type: 'category',
      label: 'Context & Rust',
      items: ['context/prometheus-context-bootstrap', 'rust/prometheus-rust-workspace'],
    },
    {
      type: 'category',
      label: 'Distribution',
      items: ['distribution/plugin-marketplace'],
    },
    {
      type: 'category',
      label: 'Platform',
      items: ['platform/doctor', 'platform/windows-constraints'],
    },
    {
      type: 'category',
      label: 'Services',
      items: ['services/docker-services'],
    },
    {
      type: 'category',
      label: 'Specs',
      items: ['specs/openspec-integration'],
    },
    {
      type: 'category',
      label: 'Reference',
      items: ['reference/comparison-with-full-pack'],
    },
  ],
};

module.exports = sidebars;
