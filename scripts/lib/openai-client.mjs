#!/usr/bin/env node
// openai-client.mjs
//
// Minimal OpenAI Chat Completions client over fetch. Consumes model-routing.mjs
// for endpoint resolution; logs every call to .refiner/<artifact>/model-routing.log.
//
// Exports:
//   chat(phaseKey, messages, opts?) → string (assistant message content)
//   chatRaw(phaseKey, messages, opts?) → full JSON response
//
// opts: { artifactName?, maxTokens?, temperature?, timeoutMs? }
//
// Behavior on endpoint=host_harness: throws HostHarnessRoutingError. The caller
// decides whether to surface it or fall back to a non-LLM path.
//
// Retries: once on 5xx after 1s. On 4xx → throw with the proxy's error body.

import { mkdirSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePhase } from "./model-routing.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");

export class HostHarnessRoutingError extends Error {
  constructor(phaseKey, reason) {
    super(`Routing for phase '${phaseKey}' resolved to host_harness (${reason}); chat() cannot proxy host inference.`);
    this.name = "HostHarnessRoutingError";
    this.phaseKey = phaseKey;
    this.reason = reason;
  }
}

function logLine(artifactName, fields) {
  const name = artifactName ?? "unknown";
  const dir = resolve(REPO_ROOT, ".refiner", name);
  mkdirSync(dir, { recursive: true });
  const logPath = resolve(dir, "model-routing.log");
  const ts = new Date().toISOString();
  const parts = [ts, ...Object.entries(fields).map(([k, v]) => `${k}=${v ?? "-"}`)];
  appendFileSync(logPath, parts.join(" ") + "\n");
}

async function postChat(decision, messages, opts) {
  const url = decision.endpointConfig.base_url.replace(/\/$/, "") + "/chat/completions";
  const body = {
    model: decision.model,
    messages,
    ...(opts.maxTokens !== undefined ? { max_tokens: opts.maxTokens } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
  };
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function chatRaw(phaseKey, messages, opts = {}) {
  const decision = resolvePhase(phaseKey);
  const artifactName = opts.artifactName ?? process.env.REFINER_ARTIFACT_NAME ?? "unknown";
  const t0 = Date.now();

  if (decision.endpoint === "host_harness") {
    logLine(artifactName, {
      phase: phaseKey,
      tier: decision.tier,
      endpoint: "host_harness",
      model: "-",
      status: "skip",
      reason: decision.reason,
      duration_ms: 0,
    });
    throw new HostHarnessRoutingError(phaseKey, decision.reason);
  }

  if (!decision.endpointConfig?.base_url) {
    logLine(artifactName, {
      phase: phaseKey,
      tier: decision.tier,
      endpoint: decision.endpoint,
      model: decision.model ?? "-",
      status: "error",
      reason: "no_base_url",
      duration_ms: Date.now() - t0,
    });
    throw new Error(`Endpoint '${decision.endpoint}' has no base_url`);
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const json = await postChat(decision, messages, opts);
      logLine(artifactName, {
        phase: phaseKey,
        tier: decision.tier,
        endpoint: decision.endpoint,
        model: decision.model ?? "-",
        status: "ok",
        reason: decision.reason,
        tokens_in: json.usage?.prompt_tokens,
        tokens_out: json.usage?.completion_tokens,
        duration_ms: Date.now() - t0,
        attempt,
      });
      return json;
    } catch (err) {
      lastError = err;
      // Retry once on 5xx or network errors
      if (attempt === 0 && (err.status >= 500 || !err.status)) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      logLine(artifactName, {
        phase: phaseKey,
        tier: decision.tier,
        endpoint: decision.endpoint,
        model: decision.model ?? "-",
        status: "error",
        reason: `http_${err.status ?? "network"}`,
        duration_ms: Date.now() - t0,
      });
      throw err;
    }
  }
  throw lastError;
}

export async function chat(phaseKey, messages, opts = {}) {
  const json = await chatRaw(phaseKey, messages, opts);
  return json.choices?.[0]?.message?.content ?? "";
}

// --- Self-test ---
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("--- openai-client.mjs self-test ---");
  try {
    const reply = await chat(
      "refiner-iterate",
      [{ role: "user", content: "Reply with exactly the word 'pong' and nothing else." }],
      { maxTokens: 10, artifactName: "_self_test" },
    );
    console.log(`  reply: ${JSON.stringify(reply)}`);
    console.log(`  log:   .refiner/_self_test/model-routing.log`);
    process.exit(0);
  } catch (err) {
    console.error(`  ERROR: ${err.name}: ${err.message}`);
    if (err instanceof HostHarnessRoutingError) {
      console.error("  (this is expected when proxy is down — host_harness is the no-op for chat())");
    }
    process.exit(1);
  }
}
