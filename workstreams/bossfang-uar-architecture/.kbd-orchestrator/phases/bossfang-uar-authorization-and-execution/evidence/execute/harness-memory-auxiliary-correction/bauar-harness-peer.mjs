// Private controlled model/MCP and transparent transport faults for the HARNESS gate.
// No UAR event, admission, approval or execution receipt is synthesized here.
import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Exact proactive_memory.rs build_extraction_prompt with memory.rs default categories.
// A different system or outer request is not an accepted auxiliary request.
const MEMORY_EXTRACTION_SYSTEM = [
  "You are a memory extraction system. Your goal: help a future assistant feel like it truly knows this person — their style, preferences, expertise, and what matters to them.",
  "",
  "Extract ONLY clearly stated or strongly demonstrated facts. Do NOT infer personality traits from single messages. Prioritize what would most change how you interact with someone.",
  "",
  "## What to extract (in priority order)",
  "",
  "1. **Communication style & language**: Concise vs. detailed? Formal vs. casual? Do they write in a specific language (e.g., Chinese, English)? Do they prefer code-heavy answers or conceptual explanations?",
  "2. **Frustrations & pet peeves**: What annoys them? What mistakes should be avoided? These are the most actionable memories — they prevent you from doing things the person hates.",
  "3. **Preferences & opinions**: Tools, languages, frameworks, themes, workflows they like or dislike. Strong opinions about how things should be done.",
  "4. **Work style & autonomy**: Do they want you to just do it, or discuss first? Step-by-step or big-picture? Do they review diffs or trust you?",
  "5. **Technical background**: Expertise level, technologies they work with, role, domain. What they know well vs. what they're learning.",
  "6. **Project context**: Key projects, architectures, recurring tasks, decisions made and why.",
  "7. **Personal details**: Name, timezone, team, anything they voluntarily shared.",
  "",
  "## How to write memories",
  "",
  "Write each memory as a natural observation that captures nuance — not as a flat database entry.",
  "",
  "GOOD: \"Prefers concise, direct answers — skips caveats and gets to the point\"",
  "BAD: \"User prefers concise communication\"",
  "",
  "GOOD: \"Gets frustrated when code suggestions don't compile — always verify before suggesting\"",
  "BAD: \"User dislikes compilation errors\"",
  "",
  "GOOD: \"Communicates in Chinese; switch to Chinese unless they write in English first\"",
  "BAD: \"User language: Chinese\"",
  "",
  "GOOD: \"Highly autonomous — wants changes made, not discussed. Just do it and explain after.\"",
  "BAD: \"User prefers autonomous execution\"",
  "",
  "## Response format",
  "",
  "Respond with a JSON object containing two arrays:",
  "",
  "1. \"memories\" - Facts and preferences to remember:",
  "   - \"content\": the extracted memory (concise, one natural sentence with actionable nuance)",
  "   - \"category\": one of: communication_style, preference, expertise, work_style, project_context, personal_detail, frustration",
  "   - \"level\": \"user\" for personal/preference info, \"session\" for current task context, \"agent\" for agent-specific learnings",
  "   - \"confidence\": float in [0.0, 1.0]. How sure are you the user stated or strongly demonstrated this fact? 1.0 = explicitly stated by the user this turn; 0.7 = strongly implied; 0.4 = inferred from partial evidence. Memories scoring below the configured extraction_threshold are dropped, so be calibrated rather than uniformly confident.",
  "",
  "2. \"relations\" - Entity relationships (knowledge graph triples):",
  "   - \"subject\": entity name (e.g., \"Alice\")",
  "   - \"subject_type\": person, organization, project, concept, location, tool",
  "   - \"relation\": works_at, uses, prefers, knows_about, located_in, part_of, depends_on, dislikes, experienced_with",
  "   - \"object\": related entity name (e.g., \"Acme Corp\")",
  "   - \"object_type\": same types as subject_type",
  "",
  "Example:",
  "{",
  "  \"memories\": [",
  "    {\"content\": \"Experienced Rust developer who works on the LibreFang project — treat as expert, skip beginner explanations\", \"category\": \"communication_style\", \"level\": \"user\", \"confidence\": 0.95},",
  "    {\"content\": \"Prefers concise code reviews — skip obvious comments, focus on logic and correctness issues only\", \"category\": \"preference\", \"level\": \"user\", \"confidence\": 0.85}",
  "  ],",
  "  \"relations\": [",
  "    {\"subject\": \"User\", \"subject_type\": \"person\", \"relation\": \"experienced_with\", \"object\": \"Rust\", \"object_type\": \"tool\"}",
  "  ]",
  "}",
  "",
  "If nothing worth extracting: {\"memories\": [], \"relations\": []}",
].join('\n');

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
async function body(req) {
  const parts = [];
  for await (const part of req) parts.push(part);
  return JSON.parse(Buffer.concat(parts).toString() || '{}');
}
function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(value));
}
function close(server) {
  server.closeAllConnections();
  return new Promise(resolve => server.close(resolve));
}

export async function startPeer({ effectFile, mcpCredential, modelCredential }) {
  const effects = [], modelCalls = [], failures = [], modelInputShapes = [];
  const nativeReplies = new Map();
  const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const clockEnvelope = message => message?.role === 'user' && typeof message.content === 'string'
    && /^\[Current date\/time: [^\r\n]+\]$/.test(message.content);
  // Compare every original message, allowing only the inspected trailing clock
  // envelope to be omitted. This does not alter any actual model request.
  const nativePrefix = messages => fingerprint(clockEnvelope(messages.at(-1)) ? messages.slice(0, -1) : messages);
  const actionNudge = "[System: You described actions but didn't execute them. Please use the available tools to complete the requested actions.]";
  const modelDiagnostics = { requests: 0, authorized: 0, parsed: 0, labeled: 0, nativeLabeled: 0, clockTailSkipped: 0, nativeContinuations: 0, memoryExtractions: 0,
    failures: { model_endpoint: 0, model_auth: 0, model_body: 0, model_label: 0, model_tools: 0, model_response: 0 } };
  const server = http.createServer(async (req, res) => {
    let stage = 'routing';
    try {
      if (req.url === '/mcp' && req.method === 'POST') {
        assert.equal(req.headers.authorization, mcpCredential, 'MCP executable auth changed');
        const call = await body(req);
        if (call.id === undefined) { res.writeHead(202).end(); return; }
        let result;
        if (call.method === 'initialize') {
          res.setHeader('mcp-session-id', 'bauar-private-peer');
          result = { protocolVersion: call.params.protocolVersion, capabilities: { tools: {} },
            serverInfo: { name: 'bauar-private-effect', version: '1.0.0' } };
        } else if (call.method === 'tools/list') {
          result = { tools: [{ name: 'effect', description: 'Append one safe fixture marker.',
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
            inputSchema: { type: 'object', properties: { label: { type: 'string' } },
              required: ['label'], additionalProperties: false } }] };
        } else if (call.method === 'tools/call') {
          assert.equal(call.params.name, 'effect');
          const label = call.params.arguments.label;
          assert.match(label, /^BAUAR_[A-Z0-9_]+$/);
          // This is the real tool effect. Record before returning the tool result.
          await appendFile(effectFile, `${JSON.stringify({ label })}\n`, { mode: 0o600 });
          effects.push(label);
          result = { content: [{ type: 'text', text: `effect recorded: ${label}` }], isError: false };
        } else if (call.method === 'ping') result = {};
        else throw new Error('Unexpected MCP method');
        json(res, 200, { jsonrpc: '2.0', id: call.id, result });
        return;
      }
      if (req.url === '/mcp') { res.writeHead(req.method === 'DELETE' ? 200 : 405).end(); return; }
      if (req.url === '/v1/models') {
        json(res, 200, { object: 'list', data: [{ id: 'gpt-5.4-mini', object: 'model', owned_by: 'fixture' }] });
        return;
      }
      stage = 'model_endpoint'; modelDiagnostics.requests++;
      assert.equal(req.url, '/v1/chat/completions', 'Unexpected model endpoint');
      stage = 'model_auth';
      assert.equal(req.headers.authorization, `Bearer ${modelCredential}`, 'Model auth changed');
      modelDiagnostics.authorized++; stage = 'model_body';
      const request = await body(req);
      modelDiagnostics.parsed++; stage = 'model_label';
      let lastUser = request.messages.findLastIndex(message => message.role === 'user');
      // Native prepare_llm_messages appends this exact clock envelope after
      // the task. Skip only that envelope, never search history for a label.
      const tail = request.messages[lastUser]?.content;
      if (typeof tail === 'string' && /^\[Current date\/time: [^\r\n]+\]$/.test(tail)) {
        lastUser = request.messages.slice(0, lastUser).findLastIndex(message => message.role === 'user');
        modelDiagnostics.clockTailSkipped++;
      }
      const memoryEnvelope = typeof request.messages.at(-1)?.content === 'string'
        && request.messages.at(-1).content.startsWith('Extract memories from this conversation:\n\n');
      const memorySystem = request.messages[0]?.role === 'system'
        && request.messages[0]?.content === MEMORY_EXTRACTION_SYSTEM;
      let memoryExtraction = false;
      if (memoryEnvelope || memorySystem) {
        assert.equal(request.messages.length, 2, 'Memory extraction outer message count changed');
        assert.ok(memorySystem && memoryEnvelope, 'Memory extraction system or envelope changed');
        assert.equal(request.messages[1].role, 'user', 'Memory extraction user role changed');
        const conversation = request.messages[1].content.slice('Extract memories from this conversation:\n\n'.length);
        assert.ok(conversation.trim().length > 0 && conversation.endsWith('\n'), 'Memory extraction conversation envelope changed');
        assert.ok(request.response_format?.type === 'json_object' && Object.keys(request.response_format).length === 1, 'Memory extraction response format changed');
        assert.ok(request.tools === undefined || (Array.isArray(request.tools) && request.tools.length === 0), 'Memory extraction unexpectedly advertises tools');
        memoryExtraction = true;
      }
      const input = JSON.stringify(request.messages[lastUser]?.content ?? '');
      const label = input.match(/BAUAR_[A-Z0-9_]+/)?.[0];
      // Only fixed fixture-marker membership from this actual selected input;
      // never retain prompt bytes or use old history to choose an answer.
      const markers = new Set(input.match(/BAUAR_[A-Z0-9_]+/g) ?? []);
      const actionIntentNudge = request.messages[lastUser]?.content === actionNudge;
      const priorReply = nativeReplies.get(nativePrefix(request.messages.slice(0, -2)));
      const emittedAssistantMatch = Boolean(priorReply && request.messages.at(-2)?.role === 'assistant'
        && fingerprint(request.messages.at(-2)?.content) === priorReply);
      const nativeContinuation = actionIntentNudge && lastUser === request.messages.length - 1
        && emittedAssistantMatch;
      modelInputShapes.push({ markerCount: markers.size,
        actionIntentNudge, nativeContinuation, memoryExtraction,
        exactOriginalNativePrefix: Boolean(priorReply),
        emittedAssistantMatch,
        titleSystemMatch: request.messages.some(message => message.role === 'system'
          && message.content === 'You generate short, descriptive session titles. Reply with the title text only.'),
        memoryExtractionEnvelope: typeof request.messages[lastUser]?.content === 'string'
          && request.messages[lastUser].content.startsWith('Extract memories from this conversation:\n\n'),
        nativeRacePresent: markers.has('BAUAR_NATIVE_RACE'),
        nativePendingPresent: markers.has('BAUAR_NATIVE_PENDING'),
        selectedRacePresent: markers.has('BAUAR_SELECTED_RACE'),
        chosenNativeRace: label === 'BAUAR_NATIVE_RACE',
        chosenNativePending: label === 'BAUAR_NATIVE_PENDING' });
      assert.ok(label || nativeContinuation || memoryExtraction, 'Model request must retain actual task input, exact continuation, or validated extraction contract');
      if (label) modelDiagnostics.labeled++;
      if (nativeContinuation) modelDiagnostics.nativeContinuations++;
      if (memoryExtraction) modelDiagnostics.memoryExtractions++;
      const native = !memoryExtraction && (nativeContinuation || label.startsWith('BAUAR_NATIVE') || label.startsWith('BAUAR_LEGACY'));
      if (native && label) modelDiagnostics.nativeLabeled++;
      const hasResult = request.messages.slice(lastUser + 1).some(message => message.role === 'tool');
      const tool = request.tools?.find(item => item.function?.name === 'fixture__effect');
      // One entry per physical request, including all current-input markers
      // when the native runtime supplies multiple already-claimed rows.
      modelCalls.push({ label: label ?? null, markers: [...markers], hasResult, native,
        requestClass: memoryExtraction ? 'memory_extraction' : nativeContinuation ? 'native_action_nudge' : 'task_input', toolsPresent: Boolean(tool) });
      const invoke = !memoryExtraction && !native && !hasResult;
      stage = 'model_tools';
      if (invoke) assert.ok(tool, 'Real provider did not advertise the bound MCP tool');
      stage = 'model_response';
      const id = `chatcmpl-${randomUUID()}`, callId = `call-${randomUUID()}`;
      const message = invoke
        ? { role: 'assistant', content: null, tool_calls: [{ id: callId, type: 'function',
          function: { name: tool.function.name, arguments: JSON.stringify({ label }) } }] }
        : { role: 'assistant', content: memoryExtraction ? JSON.stringify({ memories: [], relations: [] })
          : nativeContinuation ? 'No additional actions were performed.' : `${label} done` };
      const reason = invoke ? 'tool_calls' : 'stop';
      if (native && !nativeContinuation) nativeReplies.set(nativePrefix(request.messages), fingerprint(message.content));
      const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };
      if (!request.stream) {
        json(res, 200, { id, object: 'chat.completion', model: request.model,
          choices: [{ index: 0, message, finish_reason: reason }], usage });
      } else {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
        const delta = invoke ? { role: 'assistant', tool_calls: message.tool_calls.map(call => ({ index: 0, ...call })) } : message;
        for (const choice of [{ index: 0, delta, finish_reason: null },
          { index: 0, delta: {}, finish_reason: reason }]) {
          res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', model: request.model, choices: [choice], usage })}\n\n`);
        }
        res.end('data: [DONE]\n\n');
      }
    } catch (error) {
      if (Object.hasOwn(modelDiagnostics.failures, stage)) modelDiagnostics.failures[stage]++;
      failures.push(error.message);
      if (!res.headersSent) json(res, 500, { error: 'private_fixture_contract_failed' });
      else res.destroy();
    }
  });
  return { base: await listen(server), effects, modelCalls, failures, modelDiagnostics, modelInputShapes, close: () => close(server) };
}

export async function startFaultProxy() {
  let target, fault;
  const observations = [], streams = new Set();
  const server = http.createServer((req, res) => {
    if (!target) { res.writeHead(503).end(); return; }
    const pathname = new URL(req.url, target).pathname;
    const selected = pathname.startsWith('/api/uar/full-harness/v1/');
    const item = { method: req.method, path: pathname, forwarded: false, completed: false, dropped: false };
    if (selected) observations.push(item);
    const selectedFault = fault && fault.method === req.method && fault.path.test(pathname) ? fault : undefined;
    if (selectedFault) fault = undefined;
    const upstream = http.request(new URL(req.url, target), { method: req.method, headers: req.headers }, response => {
      item.forwarded = true;
      item.status = response.statusCode;
      if (req.method === 'POST' && pathname.endsWith('/full-harness/v1/tasks') && response.statusCode === 409) {
        // Observe the original refusal while forwarding its exact bytes. Only
        // fixed provider codes leave this private response buffer.
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.once('end', () => {
          const allowed = ['admission_digest_conflict', 'service_binding_mismatch',
            'service_instance_incompatible', 'service_migration_unsupported', 'run_binding_conflict'];
          item.refusalCode = null;
          try {
            const code = JSON.parse(Buffer.concat(chunks).toString('utf8'))?.error?.code;
            if (allowed.includes(code)) item.refusalCode = code;
          } catch { /* Unknown response shape remains unclassified. */ }
          chunks.length = 0;
        });
      }
      if (selectedFault) {
        if (selectedFault.pause) {
          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => {
            selectedFault.observed = true;
            selectedFault.release = () => {
              res.writeHead(response.statusCode, response.headers);
              res.end(Buffer.concat(chunks));
              item.completed = true;
            };
          });
          return;
        }
        // Consume the actual provider response before losing its delivery. No
        // response bytes, authority or content are substituted or persisted.
        response.resume();
        response.on('end', () => {
          item.completed = true;
          item.dropped = true;
          selectedFault.observed = true;
          if (selectedFault.hold) selectedFault.release = () => res.destroy();
          else res.destroy();
        });
      } else {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
        response.on('end', () => { item.completed = true; });
        if (pathname.endsWith('/stream')) {
          const connection = { response, res };
          streams.add(connection);
          res.on('close', () => { streams.delete(connection); response.destroy(); });
        }
      }
    });
    upstream.on('error', () => res.destroy());
    req.pipe(upstream);
  });
  return {
    base: await listen(server), observations,
    setTarget: base => { target = base; },
    get activeStreams() { return streams.size; },
    pauseNext(method, path) {
      assert.equal(fault, undefined);
      fault = { method, path, pause: true, observed: false };
      return fault;
    },
    loseNext(method, path, hold = false) {
      assert.equal(fault, undefined, 'Only one explicit transport fault at a time');
      fault = { method, path, hold, observed: false };
      return fault;
    },
    disconnectStreams() {
      assert.ok(streams.size > 0, 'Reconnect case requires a real active provider stream');
      for (const { response, res } of streams) { response.destroy(); res.destroy(); }
    },
    close: () => close(server),
  };
}
