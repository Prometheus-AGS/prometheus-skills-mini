// Port of the dispatch half of adversarial-review/scripts/dispatch-judge.sh
// (prometheus-skill-pack, 379 lines): request-body construction and the
// timeout-escalation retry loop against an OpenAI-compatible
// /v1/chat/completions endpoint.
//
// python3 -> plain JS object construction; curl -> fetch (Node >=22 ships
// it natively — the mini's own "no curl" rule). This is a hand-rolled fetch
// client rather than a reuse of scripts/lib/openai-client.mjs: that module is
// built around resolvePhase()'s phase-TIER routing against
// .kbd-orchestrator/project.json, which has no equivalent of the judge's
// producer!=judge collision check or the fixed-temperature-model allowlist.
// The timeout/retry MECHANICS below borrow its AbortController pattern; the
// escalation policy is new, matching the source bash's own retry loop.

const FIXED_TEMPERATURE_PREFIXES = ['k3', 'kimi-for-coding', 'o1', 'o3', 'gpt-5'];

function isFixedTemperatureModel(model) {
  return FIXED_TEMPERATURE_PREFIXES.some((prefix) => model.startsWith(prefix));
}

/**
 * Build the OpenAI-compatible chat/completions request body.
 *
 * temperature=0 is the right default for a judge — a review should be
 * reproducible. Some reasoning models REFUSE any other value and reject the
 * whole request (HTTP 400 "invalid temperature: only 1 is allowed for this
 * model") — Kimi k3 does exactly this. Omitting the field lets such a model
 * apply its own required default, while every other model still gets an
 * explicit 0. Do not "fix" this by sending 1 unconditionally.
 */
export function buildRequestBody({ model, system, packet, feedback }) {
  let systemContent = system;
  if (feedback) {
    systemContent += '\n\n## Previous report rejected — address this feedback\n\n' + feedback;
  }

  const body = {
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: packet },
    ],
  };
  if (!isFixedTemperatureModel(model)) {
    body.temperature = 0;
  }
  return body;
}

export class JudgeUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JudgeUnavailableError';
  }
}

function looksLikeTimeout(status, bodyText) {
  if (status === 0) return true; // fetch threw locally — treated as "needs more time"
  if ([502, 503, 504].includes(status)) {
    return /Network|timeout|timed out/i.test(bodyText ?? '');
  }
  return false;
}

/**
 * Dispatch one judge request, retrying on timeout-shaped failures with an
 * escalating timeout (double each retry), matching the source's
 * ADV_JUDGE_TIMEOUT / ADV_JUDGE_RETRIES escalation loop. A 401/403 or a
 * non-timeout-shaped error status is NOT retried — retrying a wrong
 * credential just delays an actionable error.
 *
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string} opts.authToken
 * @param {string} opts.model
 * @param {string} opts.system mandate text
 * @param {string} opts.packet review packet JSON, as a string
 * @param {string} [opts.feedback] prior rejection feedback to append to the mandate
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {number} [opts.maxAttempts] default 3, matches ADV_JUDGE_RETRIES default
 * @param {number} [opts.initialTimeoutMs] default 300_000, matches ADV_JUDGE_TIMEOUT default
 * @param {(ms:number)=>Promise<void>} [opts.sleepImpl] injectable so tests never actually wait
 * @returns {Promise<string>} the completion text
 */
export async function dispatchJudge({
  baseUrl,
  authToken,
  model,
  system,
  packet,
  feedback,
  fetchImpl = fetch,
  maxAttempts = 3,
  initialTimeoutMs = 300_000,
  sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const body = buildRequestBody({ model, system, packet, feedback });
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  let timeoutMs = initialTimeoutMs;
  let lastStatus = 0;
  let lastBodyText = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential retry, not parallel dispatch
      response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      lastStatus = 0;
      lastBodyText = '';
      if (attempt >= maxAttempts) {
        throw new JudgeUnavailableError(
          `judge request to ${baseUrl} did not complete after ${attempt} attempt(s), final timeout ${timeoutMs}ms`,
        );
      }
      timeoutMs *= 2;
      // eslint-disable-next-line no-await-in-loop
      await sleepImpl(0);
      continue;
    }

    if (response.ok) {
      // eslint-disable-next-line no-await-in-loop
      const json = await response.json();
      if (json && typeof json === 'object' && json.error) {
        const msg = typeof json.error === 'object' ? json.error.message : String(json.error);
        throw new JudgeUnavailableError(`judge endpoint error: ${msg}`);
      }
      const content = json?.choices?.[0]?.message?.content;
      if (!content) {
        throw new JudgeUnavailableError('judge returned no usable completion');
      }
      return content;
    }

    lastStatus = response.status;
    // eslint-disable-next-line no-await-in-loop
    lastBodyText = await response.text().catch(() => '');

    if (lastStatus === 401 || lastStatus === 403) {
      throw new JudgeUnavailableError(
        `gateway rejected the credential (HTTP ${lastStatus}) at ${baseUrl}. ` +
          `body: ${lastBodyText.slice(0, 200)}`,
      );
    }

    if (!looksLikeTimeout(lastStatus, lastBodyText)) {
      throw new JudgeUnavailableError(`gateway returned HTTP ${lastStatus} at ${baseUrl}. body: ${lastBodyText.slice(0, 200)}`);
    }

    if (attempt >= maxAttempts) {
      throw new JudgeUnavailableError(
        `judge request to ${baseUrl} did not complete after ${attempt} attempt(s), final timeout ${timeoutMs}ms (HTTP ${lastStatus})`,
      );
    }
    timeoutMs *= 2;
    // eslint-disable-next-line no-await-in-loop
    await sleepImpl(0);
  }

  throw new JudgeUnavailableError(`judge request to ${baseUrl} exhausted retries (HTTP ${lastStatus})`);
}
