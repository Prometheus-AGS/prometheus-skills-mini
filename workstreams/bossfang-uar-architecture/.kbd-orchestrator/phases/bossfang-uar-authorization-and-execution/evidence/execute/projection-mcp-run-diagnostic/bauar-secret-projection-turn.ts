import { expect, type Page } from '@playwright/test'

type FailedTurn = { available: boolean; done: boolean; cancelled: boolean; streamErrorPresent: boolean;
  streamCategory: string; chunkCount: number; approvalRequests: number; approvalDecisionsSent: number }
let failedTurn: FailedTurn | null = null
export function readFailedTurnDiagnostic(): FailedTurn | null { return failedTurn }

export function registrationReason(value: unknown): string {
  const message = typeof value === 'string' ? value : value instanceof Error ? value.message : ''
  for (const [prefix, category] of [
    ['UAR catalog lookup failed (HTTP ', 'catalog_lookup_http'],
    ['UAR catalog registration failed (HTTP ', 'catalog_registration_http'],
    ['UAR catalog update failed (HTTP ', 'catalog_update_http'],
    ['UAR rejected the run (HTTP ', 'run_admission_http'],
    ['UAR stream failed (HTTP ', 'stream_http']
  ] as const) if (message.startsWith(prefix)) return category
  if (message === 'A dynamic import callback was not specified.' ||
    message === 'electronApplication.evaluate: TypeError: A dynamic import callback was not specified.') return 'serialized_dynamic_import_unavailable'
  if (message === '__name is not defined' ||
    message === 'electronApplication.evaluate: ReferenceError: __name is not defined') return 'serialized_name_helper_missing'
  for (const [literal, category] of [
    ['Protected admission content cannot be published', 'protected_admission_refused'],
    ['Failed to create the run orchestrator', 'orchestrator_start_failed'],
    ['Skill selection could not be reconciled; read selection state before retrying', 'skill_selection_unavailable'],
    ['UAR stream returned no body', 'stream_body_missing'],
    ['UAR emitted an AG-UI event without an SSE event ID', 'stream_sse_id_missing'],
    ['UAR emitted invalid AG-UI JSON', 'stream_json_invalid'],
    ['UAR emitted an invalid AG-UI event', 'stream_event_invalid'],
    ['UAR emitted an event for the wrong run', 'stream_run_mismatch'],
    ['UAR emitted an unsupported AG-UI profile', 'stream_profile_unsupported'],
    ['UAR emitted an AG-UI event without stable ordering metadata', 'stream_ordering_missing'],
    ['UAR started a step before the active step finished', 'stream_step_overlap'],
    ['UAR finished an unexpected step', 'stream_step_mismatch']
  ] as const) if (message === literal) return category
  if (message === 'UAR returned an invalid run response') return 'invalid_run_response'
  if (message === 'UAR stream ended before a terminal event') return 'stream_ended_before_terminal'
  if (message === 'Projection gate stream did not open') return 'stream_open_rejected'
  if (message === 'Actual run inspection failed') return 'run_inspection_http'
  return message ? 'unclassified' : 'none'
}
export async function runTurn(
  page: Page, topicId: string, modelId: string,
  options: { text?: string; approve?: boolean; cancel?: boolean } = {}
): Promise<{ error: string; chunks: string }> {
  failedTurn = null
  await page.evaluate(async ({ topicId, modelId, options }) => {
    const state = { done: false, error: '', cancelled: false, approvalDecisionsSent: 0, chunks: [] as unknown[], off: [] as Array<() => void> }
    ;(window as any).__bauarProjectionTurn = state
    state.off.push(window.api.ipcApi.on('ai.stream.chunk', (payload: any) => {
      if (payload.topicId !== topicId) return
      state.chunks.push(payload.chunk)
      if (options.approve && payload.chunk?.type === 'tool-approval-request') {
        state.approvalDecisionsSent += 1
        void window.api.ipcApi.request('ai.tool.respond_approval', {
          topicId, approvalId: payload.chunk.approvalId, approved: true
        }).then((result: any) => {
          if (!result.ok || result.data?.ok === false) state.error = 'Actual projection approval was rejected'
        }).catch(() => { state.error = 'Projection approval request failed' })
      }
      if (options.cancel && !state.cancelled && payload.chunk?.type === 'text-delta') {
        state.cancelled = true
        void window.api.ipcApi.request('ai.stream.abort', { topicId }).then((result: any) => {
          if (result.ok) state.done = true
          else state.error = 'Projection cancellation was rejected'
        }).catch(() => { state.error = 'Projection cancellation failed' })
      }
    }))
    state.off.push(window.api.ipcApi.on('ai.stream.done', (payload: any) => {
      if (payload.topicId === topicId && payload.isTopicDone) state.done = true
    }))
    state.off.push(window.api.ipcApi.on('ai.stream.error', (payload: any) => {
      if (payload.topicId === topicId) state.error = payload.error?.message ?? 'Unknown stream error'
    }))
    const result = await window.api.ipcApi.request('ai.stream.open', {
      trigger: 'submit-message', topicId, mentionedModelIds: [modelId],
      userMessageParts: [{ type: 'text', text: options.text ?? 'Reply with the benign projection gate marker.' }]
    }) as { ok: boolean }
    if (!result.ok) throw new Error('Projection gate stream did not open')
  }, { topicId, modelId, options })
  try {
    await expect.poll(() => page.evaluate(() => {
      const state = (window as any).__bauarProjectionTurn
      return Boolean(state.done || state.error)
    }), { timeout: 180_000 }).toBe(true)
    return page.evaluate(() => {
      const state = (window as any).__bauarProjectionTurn
      return { error: state.error as string, chunks: JSON.stringify(state.chunks) }
    })
  } catch (error) {
    const snapshot = await page.evaluate(() => {
      const state = (window as any).__bauarProjectionTurn
      return state ? { done: Boolean(state.done), cancelled: Boolean(state.cancelled), error: String(state.error ?? ''),
        chunkCount: state.chunks.length,
        approvalRequests: state.chunks.filter((chunk: any) => chunk?.type === 'tool-approval-request').length,
        approvalDecisionsSent: state.approvalDecisionsSent } : null
    }).catch(() => null)
    failedTurn = snapshot ? { available: true, done: snapshot.done, cancelled: snapshot.cancelled,
      streamErrorPresent: Boolean(snapshot.error), streamCategory: registrationReason(snapshot.error),
      chunkCount: snapshot.chunkCount, approvalRequests: snapshot.approvalRequests,
      approvalDecisionsSent: snapshot.approvalDecisionsSent } : null
    throw error
  } finally {
    await page.evaluate(() => {
      const state = (window as any).__bauarProjectionTurn
      for (const off of state.off) off()
      delete (window as any).__bauarProjectionTurn
    })
  }
}

