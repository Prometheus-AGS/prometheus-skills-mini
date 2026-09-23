// Port of emit-ui-intent.sh (prometheus-skill-pack, 90 lines) — the ideation
// flow's presentation path.
//
// JUDGMENT CALL (diverging from a literal 1:1 translation, named explicitly
// per this repo's convention):
//
// The source shells out to a SIBLING SKILL, `ui-surface`
// (`skills/learn/ui-surface/scripts/detect-surface-tier.sh` and `render.sh`),
// which resolves the harness's UI tier and performs a Tier-1 file-pair
// handshake with the harness to collect a structured response. `ui-surface`
// has not been ported to this mini repo (README.md's port table names only
// ideation-mindmap's 3 scripts and its surreal-memory dependency; ui-surface
// is not listed as a Phase C target). Porting an entire second skill as a side
// effect of this one would be scope creep this task was not asked to do.
//
// So this module keeps everything that IS self-contained — building the
// UiIntent payload (`buildIntent`, matching the source's jq pipeline byte for
// byte in shape), resolving a tier from environment (`resolveTier`), and
// recognising a timeout response (`isTimeoutResponse`, the same
// `.error == "timeout"` shape the source's jq checks) — and stops at the
// point where the source would call into ui-surface's renderer. The CLI entry
// point (scripts/emit-ui-intent.mjs) documents this explicitly and degrades
// straight to Tier 0 text instead of shelling out to a script that does not
// exist here, rather than leaving a dangling reference `carried-payload.test.mjs`
// would rightly flag.
//
// Pure functions: data in, data out. No I/O in this module.

const DEFAULT_TYPE = 'question';
const DEFAULT_TIER = 'tier0_text';

/** The UiIntent payload shape, matching the source's jq: split/select(length>0)/map. */
export function buildIntent({ title, body = '', type = DEFAULT_TYPE, options = [] }) {
  if (!title) throw new Error('--title is required');
  return {
    intent_type: type,
    title,
    body,
    options: options.map((o) => o.trim()).filter((o) => o.length > 0),
  };
}

/**
 * Resolve the surface tier from environment only — the source's fallback path (shelling out to
 * `detect-surface-tier.sh`) is unavailable here (see module header), so absent an explicit
 * `SURFACE_TIER` override this always resolves to the Tier 0 floor.
 */
export function resolveTier({ env = process.env } = {}) {
  return env.SURFACE_TIER || DEFAULT_TIER;
}

/** Whether a render response is the source's `{error: "timeout"}` shape — not a real response. */
export function isTimeoutResponse(response) {
  return Boolean(response) && typeof response === 'object' && response.error === 'timeout';
}
