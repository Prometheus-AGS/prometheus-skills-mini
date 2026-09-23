// Port of emit-ui-intent.sh (prometheus-skill-pack, 90 lines).
//
// JUDGMENT CALL (named explicitly, per lib/ideation/ui-intent.mjs's header):
// the source resolves a tier and, for anything above Tier 0, hands off to
// `ui-surface`'s renderer for a real round trip with the harness. `ui-surface`
// is not ported into this repo. This entry point resolves the tier (honoring
// a `SURFACE_TIER` override so a caller that HAS its own tier-1 mechanism can
// still drive this script), but only ever renders Tier 0: print the question
// to stdout and exit 0. There is no timeout path here — Tier 0 is synchronous
// text, not a poll — so this never reaches the source's exit-3 "no response"
// case. If Tier 1 delivery is needed later, port ui-surface first and wire it
// in here; do not fake a round trip.
//
// Entry point only: parse argv, build the intent via lib/ideation/ui-intent.mjs,
// print it. No logic here.
//
// Usage:
//   node scripts/emit-ui-intent.mjs --title <t> --body <b> [--option <o>]... [--type <t>]
//   node scripts/emit-ui-intent.mjs --intent-json '<json>'
//
// Exit: 0 the intent was rendered (Tier 0 text) · 1 usage error

import { buildIntent, resolveTier } from '../lib/ideation/ui-intent.mjs';

function parseArgs(argv) {
  const opts = { title: '', body: '', type: 'question', options: [], intentJson: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    switch (flag) {
      case '--title': opts.title = argv[++i] ?? ''; break;
      case '--body': opts.body = argv[++i] ?? ''; break;
      case '--type': opts.type = argv[++i] ?? 'question'; break;
      case '--option': opts.options.push(argv[++i] ?? ''); break;
      case '--intent-json': opts.intentJson = argv[++i] ?? ''; break;
      default:
        throw new Error(usage());
    }
  }
  return opts;
}

function usage() {
  return 'usage: node scripts/emit-ui-intent.mjs --title <t> --body <b> [--option <o>]... ' +
    '| --intent-json <json>';
}

function die(message, code = 1) {
  process.stderr.write(`[emit-ui-intent] ERROR: ${message}\n`);
  process.exit(code);
}

function renderTier0(intent) {
  const lines = [intent.title];
  if (intent.body) lines.push(intent.body);
  for (const option of intent.options) lines.push(`  - ${option}`);
  return `${lines.join('\n')}\n`;
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch {
    die(usage());
    return;
  }

  let intent;
  if (opts.intentJson) {
    try {
      intent = JSON.parse(opts.intentJson);
    } catch {
      die('--intent-json is not valid JSON');
      return;
    }
  } else {
    if (!opts.title) {
      die('--title or --intent-json required');
      return;
    }
    try {
      intent = buildIntent({ title: opts.title, body: opts.body, type: opts.type, options: opts.options });
    } catch (error) {
      die(error.message);
      return;
    }
  }

  const tier = resolveTier({});
  process.stderr.write(`[emit-ui-intent] tier=${tier} harness=${process.env.SURFACE_HARNESS ?? 'unknown'}\n`);
  if (tier !== 'tier0_text') {
    process.stderr.write(
      '[emit-ui-intent] WARNING: ui-surface is not ported in this repo; degrading to Tier 0 text ' +
        'regardless of the resolved tier.\n',
    );
  }

  process.stdout.write(renderTier0(intent));
  process.exit(0);
}

main(process.argv.slice(2));
