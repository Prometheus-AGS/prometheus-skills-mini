// SessionStart: reports what this project actually is.
//
// DELIBERATE BEHAVIOUR CHANGE FROM UPSTREAM (operator decision 2026-09-21,
// .prometheus/decisions.md). The upstream script detects Kustomize overlays,
// ArgoCD Application CRs and Terraform cluster resources, then advertises four
// devops skills. README 4.3 puts devops skills out of scope here, and the
// analyze inventory dropped posttool-validate-gitops-write for the same reason —
// a hook naming capabilities the project does not ship is worse than no hook.
//
// The id, event and timeout are unchanged, so the manifest and the six-id
// scenario still hold.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { findProjectRoot, readProjectId, degradeSafely, cwdOf } from './context.mjs';

const countCapabilities = (projectRoot) => {
  const specs = path.join(projectRoot, 'openspec', 'specs');
  if (!existsSync(specs)) return 0;
  // One capability per spec.md, at either nesting depth.
  let found = 0;
  for (const entry of readdirSync(specs, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(specs, entry.name);
    if (existsSync(path.join(dir, 'spec.md'))) found += 1;
    for (const nested of readdirSync(dir, { withFileTypes: true })) {
      if (nested.isDirectory() && existsSync(path.join(dir, nested.name, 'spec.md'))) found += 1;
    }
  }
  return found;
};

export async function run(payload) {
  return degradeSafely(payload.hookId, async () => {
    const projectRoot = findProjectRoot(cwdOf(payload.input));

    const context = {
      projectId: readProjectId(projectRoot),
      projectRoot,
      node: process.version,
      specBackend: projectRoot && existsSync(path.join(projectRoot, 'openspec')) ? 'openspec' : 'none',
      capabilities: projectRoot ? countCapabilities(projectRoot) : 0,
    };

    process.stderr.write(
      `=== ${context.projectId ?? 'project'} — context ===\n` +
        `Specs: ${context.specBackend}, ${context.capabilities} capabilities\n` +
        `Node: ${context.node}\n`,
    );

    return context;
  });
}
