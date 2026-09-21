// Spec-stage adversarial review: an isolated critic, then a judge from a different model family.
// Usage: LITER_LLM_API_KEY=... node dispatch.cjs <round> [criticModel] [judgeModel]
// The key is read from the environment and is never written anywhere.
const fs = require('fs');
const D = '.kbd-orchestrator/phases/karpathy-logs-node/review/spec';
const ROUND = process.argv[2] || '1';
const CRITIC = process.argv[3] || 'MiniMax-M3';
const JUDGE = process.argv[4] || 'k3';
const KEY = process.env.LITER_LLM_API_KEY;
if (!KEY) { console.error('LITER_LLM_API_KEY is not set'); process.exit(2); }
const sfx = ROUND === '1' ? '' : `-r${ROUND}`;
const packet = fs.readFileSync(`${D}/packet${sfx}.json`, 'utf8');

const SCHEMA = '{"verdict":"PASS"|"BLOCK","findings":[{"severity":"CRITICAL"|"WARNING"|"SUGGESTION","location":"...","finding":"...","evidence":"<quote from the packet>","fix":"..."}],"sound_claims":["..."]}';
const criticSystem = `You are kbd-critic, an adversarial reviewer in ARTIFACT mode. You see ONLY the packet: the artifacts under review plus the evidence their author could reach. You cannot run tools, so judge claims against the embedded evidence.

The packet holds a CHANGE SET written before any code: three OpenSpec changes (proposal.md, design.md, tasks.md, specs/**/spec.md each). Two are in one repository ("mini:"), one is in a second repository ("pk-repo:"). A spec is only coherent against its siblings, so judge the SET. Check:
1. Every factual claim, line citation, constant and hash in the changes against the embedded evidence (the Python recorder source, the OKF v0.2 spec text, the pk Rust source, this pack's files). Recompute what you can.
2. Each requirement and scenario: is it testable as written? Could any scenario pass without the behaviour existing (vacuous)? Does any scenario contradict the upstream contract it claims to port?
3. Within a change: does tasks.md implement every requirement? Does any task name a file that no earlier task creates? Does verification contradict the spec?
4. ACROSS changes: ordering and dependencies (one change creates lib/karpathy/, another adds a test there); a claim in one change that another change makes false; the operator ruling ("Keep v0.2, fix pk first") honoured or quietly narrowed.
5. The pk-repo change against the OKF v0.2 spec text: is any requirement stricter, looser or different from what the spec says? Is any "MAY" treated as "MUST" or the reverse?
6. Omissions that would mislead implementation: result states, exit codes, locking, crash recovery, Windows behaviour, security boundary.
7. Scope creep: anything specified that no goal, ruling or observed problem asks for.

Be adversarial and specific. Quote the evidence for each finding. Do NOT invent findings to appear thorough; list claims you checked and found sound under sound_claims.
Return ONLY a JSON object: ${SCHEMA}
BLOCK if any CRITICAL (a claim contradicted by evidence, or an omission that would mislead the spec).

If the packet has a round_1 block, this is ROUND 2: for each round-1 finding, verify the producer's disposition against the REVISED changes in this packet - say whether it is actually fixed, partially fixed, or not fixed - before looking for new defects. A fix that introduced a new contradiction is a finding.`;

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
