#!/usr/bin/env node
// model-routing-probe.mjs
//
// CLI that prints the per-phase routing resolution table and exits.
// Useful for verifying `model_policy` config without invoking the PMPO loop.
//
// Usage:
//   node scripts/model-routing-probe.mjs [--artifact <name>]
//
// Exit code: always 0. Unhealthy endpoints produce fallback rows; the probe
// itself never fails.

import { resolveAllPhases } from "./lib/model-routing.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

function pad(s, n) {
  const str = String(s ?? "-");
  return str.length >= n ? str : str + " ".repeat(n - str.length);
}

const argv = parseArgs(process.argv);
const decisions = resolveAllPhases();

console.log(`Routing probe — artifact: ${argv.artifact ?? "_probe"}`);
console.log("");
console.log(
  pad("PHASE", 22) +
  pad("TIER", 9) +
  pad("ENDPOINT", 16) +
  pad("MODEL", 20) +
  pad("HEALTHY", 9) +
  "REASON"
);
console.log("-".repeat(100));

if (decisions.length === 0) {
  console.log("(no model_policy.phases configured in .kbd-orchestrator/project.json)");
} else {
  for (const d of decisions) {
    console.log(
      pad(d.phase, 22) +
      pad(d.tier, 9) +
      pad(d.endpoint, 16) +
      pad(d.model ?? "-", 20) +
      pad(d.healthy ? "yes" : "no", 9) +
      d.reason
    );
  }
}

process.exit(0);
