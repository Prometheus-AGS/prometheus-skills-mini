import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const CAPABILITIES = [
  {
    title: 'KBD Process',
    body: 'The Assess → Analyze → Spec → Plan → Execute → Reflect lifecycle as a Node state machine, with stage gates, phase/child hierarchy, and a waypoint that survives context loss.',
    href: '/docs/kbd/overview',
  },
  {
    title: 'Adversarial Review',
    body: 'Cross-model judge dispatch over the liter-llm gateway, with explicit producer and judge evidence, a sycophancy anti-theater gate, and an OKF decision log.',
    href: '/docs/review/adversarial-review',
  },
  {
    title: 'Ideation Mindmap',
    body: 'Structurally-verified independent-dispatch ideation via surreal-memory, with independent-dispatch records for later assessment.',
    href: '/docs/ideation/ideation-mindmap',
  },
  {
    title: 'Karpathy Progress Memory',
    body: 'Idempotent, durable progress receipts at every task/change/phase boundary, with an optional OKF v0.2 knowledge bundle written by the vendored pk CLI.',
    href: '/docs/karpathy/progress-memory',
  },
  {
    title: 'Artifact Refinement',
    body: 'PMPO-orchestrated refinement for UI, logos, images, content, A2UI/AG-UI/MCP-UI surfaces, plus scaffolding and format conversion.',
    href: '/docs/artifact-refinement/overview',
  },
  {
    title: 'Plugin Distribution',
    body: 'Copy-mode (never symlink) Claude Code and Codex plugin packages, marketplace listings, and generated slash commands from a single skill-system.json manifest.',
    href: '/docs/distribution/plugin-marketplace',
  },
];

export default function Home() {
  return (
    <Layout
      title="Prometheus Skills Mini"
      description="Windows-native Node.js port of the Prometheus skill system: KBD lifecycle, adversarial review, and plugin distribution for Claude Code and Codex."
    >
      <header className="heroBanner">
        <div className="container">
          <h1 className={styles.heroTitle}>Prometheus Skills Mini</h1>
          <p className={styles.heroTagline}>
            Plan a change, verify it through the user’s workflow and hand it to another session.
            Mini runs its local process with Node on Windows, macOS and Linux.
          </p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/getting-started/worked-change">
              Work through an example
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/catalog">
              Browse the skills catalog
            </Link>
          </div>
        </div>
      </header>
      <main>
        <div className="container">
          <div className={styles.cardGrid}>
            {CAPABILITIES.map((c) => (
              <Link key={c.title} to={c.href} className={`${styles.capabilityCard || ''} capabilityCard`}>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </Link>
            ))}
          </div>
          <section className={styles.constraintList}>
            <h2>Installation choices</h2>
            <ul>
              <li>Use the portable workflow on Windows without WSL or Git Bash.</li>
              <li>Install Node.js 22.20 or later for the pinned OpenSpec runner.</li>
              <li>Choose OpenSpec by default or retain an existing supported spec engine.</li>
              <li>
                Run with local files, connect existing services, or select a supported native or Docker provider.
              </li>
            </ul>
          </section>
        </div>
      </main>
    </Layout>
  );
}
