// Analyze-stage adversarial review: an isolated critic, then a judge from a different model family.
// Usage: LITER_LLM_API_KEY=... node dispatch.cjs <round> [criticModel] [judgeModel]
// The key is read from the environment and is never written anywhere.
const fs = require('fs');
const D = '.kbd-orchestrator/phases/karpathy-logs-node/review/analyze';
const ROUND = process.argv[2] || '1';
const CRITIC = process.argv[3] || 'MiniMax-M3';
const JUDGE = process.argv[4] || 'k3';
const KEY = process.env.LITER_LLM_API_KEY;
if (!KEY) { console.error('LITER_LLM_API_KEY is not set'); process.exit(2); }
const sfx = ROUND === '1' ? '' : `-r${ROUND}`;
const packet = fs.readFileSync(`${D}/packet${sfx}.json`, 'utf8');

const SCHEMA = '{"verdict":"PASS"|"BLOCK","findings":[{"severity":"CRITICAL"|"WARNING"|"SUGGESTION","location":"...","finding":"...","evidence":"<quote from the packet>","fix":"..."}],"sound_claims":["..."]}';
const criticSystem = `You are kbd-critic, an adversarial reviewer in ARTIFACT mode. You see ONLY the packet: the artifacts under review plus the evidence their author could reach. You cannot run tools, so judge claims against the embedded evidence.

The artifacts are an ANALYSIS (analysis.md), its machine contract (library-candidates.json) and a decision log - build-vs-adopt decisions made BEFORE any spec or code. Check:
1. Every factual claim and line citation: supported, unsupported, or contradicted by the embedded evidence? Recompute counts and re-read the cited lines.
2. Each build-vs-adopt verdict: does the stated reason follow from the evidence? Is any rejected candidate rejected for a wrong reason? Is any "adopt" resting on a single observation presented as general?
3. Corrections to the earlier assessment (section 2): is each correction actually proven by the recorder source in the packet?
4. Omissions: does the evidence show a risk, a failure mode, or a contract detail (result states, exit codes, locking, the manual --event path) that the analysis ignores and that would mislead the spec?
5. Consistency between analysis.md, library-candidates.json and decision-log.md.
6. Anti-sycophancy: are limits and unknowns stated plainly or buried?

Be adversarial and specific. Quote the evidence for each finding. Do NOT invent findings to appear thorough; list claims you checked and found sound under sound_claims.
Return ONLY a JSON object: ${SCHEMA}
BLOCK if any CRITICAL (a claim contradicted by evidence, or an omission that would mislead the spec).`;

const judgeSystem = `You are kbd-judge. A critic from a different model family reviewed the packet; its findings follow the packet. Rule on EACH critic finding against the embedded evidence: uphold it, downgrade it, or reject it as unsupported - quote the evidence. Then add any finding the critic missed. Do not defer to the critic and do not invent findings.
Return ONLY a JSON object: {"verdict":"PASS"|"BLOCK","rulings":[{"critic_finding":"...","ruling":"UPHELD"|"DOWNGRADED"|"REJECTED","severity":"CRITICAL"|"WARNING"|"SUGGESTION"|"NONE","reason":"...","evidence":"..."}],"additional_findings":[{"severity":"...","location":"...","finding":"...","evidence":"...","fix":"..."}]}
BLOCK only if a CRITICAL survives your ruling.`;

const strip = (s) => s.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
async function call(model, system, user, tag) {
  const t0 = Date.now();
  const res = await fetch('http://127.0.0.1:4000/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    signal: AbortSignal.timeout(540000),
  });
  const body = await res.text();
  let content = '', reported = null;
  try { const j = JSON.parse(body); reported = j.model; content = strip(j.choices?.[0]?.message?.content ?? ''); if (j.error) console.log(`${tag} error:`, JSON.stringify(j.error).slice(0, 300)); }
  catch { console.log(`${tag} unparseable:`, body.slice(0, 200)); }
  fs.writeFileSync(`${D}/${tag}-output${sfx}.txt`, content);
  console.log(`${tag}: http ${res.status} | ${((Date.now() - t0) / 1000).toFixed(0)}s | requested ${model} | endpoint reported ${reported} | ${content.length} chars`);
  if (res.status !== 200 || !content) process.exit(1);
  return content;
}
(async () => {
  const critic = await call(CRITIC, criticSystem, packet, 'critic');
  await call(JUDGE, judgeSystem, `${packet}\n\n===== CRITIC FINDINGS (${CRITIC}) =====\n${critic}`, 'judge');
})().catch((e) => { console.log('DISPATCH FAILED:', e.message); process.exit(1); });
