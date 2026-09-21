const fs=require('fs');
const P='.kbd-orchestrator/phases/karpathy-logs-node';
const packet=fs.readFileSync(`${P}/review/assess/packet-r2.json`,'utf8');
const MODEL=process.argv[2]||'gpt-5.5';
const system=`You are kbd-judge, an adversarial reviewer in ARTIFACT mode. You see ONLY the packet: the artifact under review plus evidence its author could read but you cannot fetch. You have no conversation history and must not assume any.

This is ROUND 2. The packet's round_1 block lists every round-1 finding and the producer's disposition; raw_command_output and evidence were expanded in response. VERIFY EACH CLAIMED FIX against the evidence -- do not take the dispositions on trust -- then look for anything new, including errors introduced by the rewrite.

The artifact is an ASSESSMENT — a gap report written before any code. Judge whether its claims are SUPPORTED BY THE EVIDENCE IN THE PACKET. Specifically:
1. Every factual claim: is it supported, unsupported, or contradicted by the embedded evidence? Recompute what you can (counts, which architectures are covered, whether two schemas differ, whether a hash claim follows from the code shown).
2. Overclaiming: does it assert more certainty than the evidence gives? Does it generalise from one sample?
3. Omissions: does the embedded evidence show a material gap or risk the assessment fails to mention?
4. Part 2 (integration with a desktop app): are the six gaps real per the evidence? Is any gap misdiagnosed? Is the scope recommendation honest or self-serving?
5. Internal contradictions.
6. Anti-sycophancy: does it lead with what is missing and unknown, or bury it?

Be adversarial and specific. Quote the evidence that proves each finding. Do NOT invent findings to appear thorough; if a claim is sound, say so.

Return ONLY a JSON object:
{"verdict":"PASS"|"BLOCK","findings":[{"severity":"CRITICAL"|"WARNING"|"SUGGESTION","location":"...","finding":"...","evidence":"...","fix":"..."}],"verified_fixes":["<round-1 finding> -- CONFIRMED FIXED | NOT FIXED, with the evidence you checked"],"confirmed_sound":["..."],"notes":"..."}
BLOCK if any CRITICAL (a claim contradicted by evidence, or a material omission that would mislead planning).`;
(async()=>{
  const t0=Date.now();
  const res=await fetch('http://127.0.0.1:8181/v1/chat/completions',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:MODEL,messages:[{role:'system',content:system},{role:'user',content:packet}]}),
    signal:AbortSignal.timeout(540000)});
  const body=await res.text();
  fs.writeFileSync(`${P}/review/assess/raw-response-r2.json`,body);
  console.log('http:',res.status,'| seconds:',((Date.now()-t0)/1000).toFixed(0));
  try{const j=JSON.parse(body);
    console.log('model reported by the endpoint:',j.model);
    const c=j.choices?.[0]?.message?.content??'';
    fs.writeFileSync(`${P}/review/assess/judge-output-r2.txt`,c);
    console.log('output chars:',c.length);
    if(j.error)console.log('error:',JSON.stringify(j.error).slice(0,300));
  }catch(e){console.log('unparseable:',body.slice(0,300));}
})().catch(e=>{console.log('DISPATCH FAILED:',e.message);process.exit(1);});
