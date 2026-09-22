// The two resident services, and Docker underneath them.
//
// CLAUDE.md §P: everything must still work with both services down. So "not running" is a
// WARNING with the command to start it, never a failure. A failure here means something IS
// listening and answering wrongly — a fault, as distinct from an absence.

const DEFAULT_TIMEOUT_MS = 2000;

/** Probes a health endpoint, distinguishing "nothing listening" from "answered badly". */
async function probe({ url, fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    return { reached: true, status: response.status };
  } catch (error) {
    // An abort and a refused connection are both "not reachable", but they are different
    // stories for the operator, so the reason travels with the result.
    const aborted = error?.name === 'AbortError';
    return {
      reached: false,
      aborted,
      reason: aborted ? `timed out after ${timeoutMs}ms` : String(error?.message ?? error),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A service check. Only 200 is healthy. `authOk` marks a service that answers 401 without
 * a key — liter-llm does, verified against the running service — which is up-but-unverified
 * and so a warning, never a pass: we never saw a healthy body.
 */
const service = ({ id, title, url, start, authOk = false }) => ({
  id,
  title,
  offers: [],
  fixes: {},
  async run(ctx = {}) {
    const result = await probe({
      url,
      fetchImpl: ctx.fetch ?? globalThis.fetch,
      timeoutMs: ctx.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });

    if (!result.reached) {
      return {
        status: 'warn',
        summary: `Not reachable at ${url}`,
        detail: `${result.reason}\n\nThe pack works with this service down. To start it: ${start}`,
      };
    }
    if (result.status === 200) return { status: 'pass', summary: `Up at ${url}` };

    // A 401 means the service is listening and demanding a key: it is up, but its health
    // is unverified — this probe never saw a healthy body. The spec says a non-200 health
    // response is not a pass, and it is right: reporting "healthy" from an auth challenge
    // would be a verdict we never established. It is also not a fault of the service, so
    // it is a warning naming the missing key rather than a failure.
    if (authOk && result.status === 401) {
      return {
        status: 'warn',
        summary: `Listening at ${url}, but it answered 401 and health is unverified`,
        detail: `The gateway is running and requires a key. Export the gateway key and re-run to verify health.`,
      };
    }

    return {
      status: 'fail',
      summary: `${url} answered ${result.status}`,
      detail: 'Something is listening but not healthy. Expected 200.',
    };
  },
});

export const checks = [
  {
    id: 'mini-docker',
    title: 'Docker',
    offers: [],
    fixes: {},
    async run(ctx = {}) {
      // lib/platform/docker.mjs is created by change `docker-services`. Until then this
      // must skip: passing would report a verdict it never reached, and failing would
      // make an unbuilt dependency look like a broken machine.
      const load =
        ctx.loadDocker ??
        (async () => {
          try {
            return await import('../platform/docker.mjs');
          } catch {
            return null;
          }
        });

      const docker = await load();
      if (!docker || typeof docker.detectDocker !== 'function') {
        return {
          status: 'skip',
          summary: 'Docker detection is not available yet',
          detail: 'lib/platform/docker.mjs is created by change `docker-services`; this check runs once it lands.',
        };
      }

      const found = docker.detectDocker();
      if (found.state === 'running') {
        return { status: 'pass', summary: `Docker ${found.version ?? ''}`.trim() };
      }
      if (found.state === 'absent') {
        return {
          status: 'warn',
          summary: 'Docker is not installed',
          detail: 'The two services need it. Install Docker Desktop (Windows/macOS) or the engine (Linux).',
        };
      }
      return {
        status: 'fail',
        summary: 'Docker is installed but its daemon is not running',
        detail: found.detail ?? 'Start Docker and re-run.',
      };
    },
  },

  service({
    id: 'mini-service-surreal-memory',
    title: 'surreal-memory',
    // The endpoint the project rules fix for every platform (.claude/rules/docker-services.md):
    // the MCP SSE path on 23001, NOT :8000. An earlier draft probed :8000/health and reported
    // this service unreachable while it was running the whole time — a false negative from an
    // invented endpoint. Verified against the running service: 23001 → 200, 28000 (SurrealDB) → 200.
    url: 'http://localhost:23001/mcp/sse',
    start: 'node scripts/services.mjs up surreal-memory',
  }),

  service({
    id: 'mini-service-liter-llm',
    title: 'liter-llm gateway',
    url: 'http://localhost:4000/health',
    start: 'node scripts/services.mjs up liter-llm',
    // This gateway answers 401 when no key is present; verified against the running
    // service (/health → 200, /v1/models → 401). That is up-but-unverified, not healthy.
    authOk: true,
  }),
];
