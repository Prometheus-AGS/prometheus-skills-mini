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
 * A service check. `okStatuses` are the codes that mean "up": liter-llm's /health answers
 * 200, and a 401 from a gateway means it is up and wants a key — verified against the
 * running services, not assumed.
 */
const service = ({ id, title, url, start, okStatuses = [200] }) => ({
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
    if (!okStatuses.includes(result.status)) {
      return {
        status: 'fail',
        summary: `${url} answered ${result.status}`,
        detail: `Something is listening but not healthy. Expected ${okStatuses.join(' or ')}.`,
      };
    }
    return {
      status: 'pass',
      summary:
        result.status === 401
          ? `Up at ${url} (401: the gateway is running and requires a key)`
          : `Up at ${url}`,
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
    url: 'http://localhost:8000/health',
    start: 'node scripts/services.mjs up surreal-memory',
  }),

  service({
    id: 'mini-service-liter-llm',
    title: 'liter-llm gateway',
    url: 'http://localhost:4000/health',
    start: 'node scripts/services.mjs up liter-llm',
    // 401 means up-and-requires-a-key, which is this gateway's documented posture;
    // verified against the running service (/health → 200, /v1/models → 401).
    okStatuses: [200, 401],
  }),
];
