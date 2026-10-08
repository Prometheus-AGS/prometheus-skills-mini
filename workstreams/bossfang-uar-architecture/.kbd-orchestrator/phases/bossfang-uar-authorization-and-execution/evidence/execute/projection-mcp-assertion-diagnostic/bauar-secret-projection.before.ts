import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { _electron as electron, expect, type ElectronApplication, type Page } from '@playwright/test'

import {
  exerciseProjectedClaims, finishMcpSinkCapture, installMcpSinkCapture,
  type ProjectionToolMode, startProjectionMcp
} from './bauar-secret-projection-mcp'
import {
  assertProjectedEvents, finishEventProjectionFixture, installEventProjectionFixture
} from './bauar-secret-projection-events'
import {
  installCapture, finishCapture, readCaptureDiagnostic, restoreCapture, type CaptureDiagnostic, type Fault
} from './bauar-secret-projection-revision'

import { historyAssertionDiagnostic } from './bauar-secret-projection-history'
import { closeProjectionHistorySession } from './bauar-secret-projection-lifecycle'

type Message = { id: string; role: string; data: { parts: unknown[]; [key: string]: unknown } }

type DiagnosticStage = 'configuration' | 'host_claim_fixture' | 'mcp_fixture' | 'provider_fixture' |
  'desktop_bootstrap' | 'desktop_relaunch' | 'model_setup' | 'agent_setup' | 'registration_run' |
  'registration_assertions' | 'history_seed' | 'history_run' | 'history_assertions' |
  'fault_run' | 'fault_assertions' | 'mcp_setup' | 'mcp_run' | 'mcp_assertions' | 'mcp_sink_assertions' |
  'approval_agent_setup' | 'event_setup' | 'event_run' | 'event_capture' | 'event_persistence' |
  'event_assertions' | 'receipt_write' | 'cleanup'
type DiagnosticScenario = 'none' | Fault | ProjectionToolMode | 'split' | 'partial' | 'reconnect' |
  'interrupted' | 'snapshot' | 'run-error' | 'approval' | 'approval-error'
let diagnostic: { stage: DiagnosticStage; scenario: DiagnosticScenario } = { stage: 'configuration', scenario: 'none' }
let failedDiagnostic: typeof diagnostic | undefined
let historyDiagnostic: ReturnType<typeof historyAssertionDiagnostic> | undefined
let registrationDiagnostic: {
  operation: 'capture_install' | 'run_turn' | 'stream_assertion' | 'capture_inspection' | 'assertions' | 'original_agent_read' | 'original_agent_assertion'
  streamErrorPresent: boolean | null; reason: string; capture: CaptureDiagnostic | null
  providerRequestCount: number; providerReached: boolean
} | undefined
function registrationReason(value: unknown): string {
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
function checkpoint(stage: DiagnosticStage, scenario: DiagnosticScenario = 'none'): void {
  diagnostic = { stage, scenario }
}

async function ipc<T>(page: Page, route: string, input: unknown): Promise<T> {
  const result = await page.evaluate(({ route, input }) => window.api.ipcApi.request(route, input), { route, input }) as {
    ok: boolean; data?: T; error?: { message?: string }
  }
  if (!result.ok) throw new Error(result.error?.message ?? `${route} failed`)
  return result.data as T
}

async function data<T>(page: Page, method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const result = await page.evaluate(({ method, path, body }) => window.api.dataApi.request({
    id: crypto.randomUUID(), method, path, ...(body === undefined ? {} : { body })
  }), { method, path, body }) as { data?: T; error?: { message?: string } }
  if (result.error) throw new Error(result.error.message ?? `${method} ${path} failed`)
  return result.data as T
}

async function launch(profile: string, sidecar: string): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'development', CS_DEV_USER_DATA_SUFFIX: profile, THE_BOSS_UAR_SIDECAR_PATH: sidecar },
    timeout: 60_000
  })
  try {
    let page: Page | undefined
    await expect.poll(() => {
      page = app.windows().find((candidate) => candidate.url().includes('/windows/main/index.html'))
      return Boolean(page)
    }, { timeout: 60_000 }).toBe(true)
    assert(page)
    await page.locator('#root').waitFor({ state: 'visible', timeout: 60_000 })
    return { app, page }
  } catch (error) {
    await app.close()
    throw error
  }
}


async function runTurn(
  page: Page, topicId: string, modelId: string,
  options: { text?: string; approve?: boolean; cancel?: boolean } = {}
): Promise<{ error: string; chunks: string }> {
  await page.evaluate(async ({ topicId, modelId, options }) => {
    const state = { done: false, error: '', cancelled: false, chunks: [] as unknown[], off: [] as Array<() => void> }
    ;(window as any).__bauarProjectionTurn = state
    state.off.push(window.api.ipcApi.on('ai.stream.chunk', (payload: any) => {
      if (payload.topicId !== topicId) return
      state.chunks.push(payload.chunk)
      if (options.approve && payload.chunk?.type === 'tool-approval-request') {
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
  } finally {
    await page.evaluate(() => {
      const state = (window as any).__bauarProjectionTurn
      for (const off of state.off) off()
      delete (window as any).__bauarProjectionTurn
    })
  }
}

async function main(): Promise<void> {
  const sidecar = process.env.THE_BOSS_UAR_SIDECAR_PATH
  if (!sidecar) throw new Error('THE_BOSS_UAR_SIDECAR_PATH is required')
  const canary = `${randomUUID()}-projection-credential`
  checkpoint('host_claim_fixture')
  const claims = await exerciseProjectedClaims(canary)
  checkpoint('mcp_fixture')
  const mcp = await startProjectionMcp(canary)
  checkpoint('provider_fixture')
  const profile = `BAUAR-Projection-${Date.now()}`
  const workspace = await mkdtemp(join(tmpdir(), 'bauar-projection-'))
  const providerRequests: Array<{ authorized: boolean; containsCanary: boolean; systemProjected: boolean; racedPrompt: boolean }> = []
  let toolMode: ProjectionToolMode | undefined
  let providerFailure = false
  const toolInputs: Array<{ mode: ProjectionToolMode; redacted: boolean }> = []
  const provider = createServer(async (request, response) => {
    if (request.url === '/v1/models') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ data: [{ id: 'projection-model' }] }))
      return
    }
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404).end()
      return
    }
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(Buffer.from(chunk))
    const body = JSON.parse(Buffer.concat(chunks).toString())
    if (providerFailure) {
      response.writeHead(400, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: { message: 'Controlled projection provider failure', type: 'invalid_request_error' } }))
      return
    }
    providerRequests.push({
      authorized: request.headers.authorization === `Bearer ${canary}`,
      containsCanary: JSON.stringify(body.messages).includes(canary),
      systemProjected: body.messages.some((message: any) => message.role === 'system' && JSON.stringify(message.content).includes('<redacted>')),
      racedPrompt: JSON.stringify(body.messages).includes('Projection catalog race marker.')
    })
    const event = (delta: object, finishReason: string | null) => `data: ${JSON.stringify({
      id: 'projection-reply', object: 'chat.completion.chunk', created: 1, model: body.model,
      choices: [{ index: 0, delta, finish_reason: finishReason }]
    })}\n\n`
    response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
    if (toolMode) {
      const toolResults = body.messages.filter((message: any) => message.role === 'tool')
      if (toolResults.length === 0) {
        const tool = body.tools?.find((entry: any) => entry.function?.name.endsWith('read_projection'))
        if (!tool) {
          response.end(event({ role: 'assistant', content: 'Projection tool missing.' }, 'stop') + 'data: [DONE]\n\n')
          return
        }
        response.end(event({ role: 'assistant', tool_calls: [{ index: 0, id: `projection-call-${toolMode}`, type: 'function',
          function: { name: tool.function.name, arguments: JSON.stringify({ echo: canary, mode: toolMode }) }
        }] }, null) + event({}, 'tool_calls') + 'data: [DONE]\n\n')
        return
      }
      const result = JSON.stringify(toolResults)
      toolInputs.push({ mode: toolMode, redacted: !result.includes(canary) && result.includes('<redacted>') })
    }
    for (const delta of [
      { role: 'assistant', reasoning_content: 'Benign reasoning ' }, { reasoning_content: 'marker.' },
      { content: 'Benign projection ' }, { content: 'gate marker.' }
    ]) {
      response.write(event(delta, null))
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    response.end(event({}, 'stop') + 'data: [DONE]\n\n')
  })
  await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve))
  const address = provider.address()
  assert(address && typeof address !== 'string')
  const baseUrl = `http://127.0.0.1:${address.port}/v1`
  let app: ElectronApplication | undefined
  try {
    checkpoint('desktop_bootstrap')
    let launched = await launch(profile, sidecar)
    app = launched.app
    await launched.page.evaluate(() => window.api.preference.setMultiple({
      'app.language': 'en-US', 'app.onboarding.provider_setup.status': 'skipped',
      'app.privacy.data_collection.enabled': false, 'app.developer_mode.enabled': true
    }))
    await app.close()
    checkpoint('desktop_relaunch')
    launched = await launch(profile, sidecar)
    app = launched.app
    const page = launched.page
    const providerId = `projection-${randomUUID()}`
    const modelId = `${providerId}::projection-model`
    checkpoint('model_setup')
    await data(page, 'POST', '/providers', {
      providerId, name: 'Projection fixture', endpointConfigs: { 'openai-chat-completions': { baseUrl } },
      defaultChatEndpoint: 'openai-chat-completions',
      apiKeys: [{ id: randomUUID(), key: canary, label: 'Synthetic fixture credential', isEnabled: true }]
    })
    await data(page, 'POST', '/models', [{
      providerId, modelId: 'projection-model', name: 'Projection model', capabilities: ['function-call'],
      endpointTypes: ['openai-chat-completions'], supportsStreaming: true, contextWindow: 128_000, maxOutputTokens: 1024
    }])
    checkpoint('agent_setup')
    const agent = await ipc<{ id: string }>(page, 'ai.agent.create', {
      type: 'uar', name: 'Projection fixture', model: modelId, mcps: [],
      instructions: `Reply briefly. Known system value: ${canary}`, configuration: { permission_mode: 'plan', uar_model_assignment: { source: 'boss' } }
    })
    const workspaceEntity = await data<{ id: string }>(page, 'POST', '/agent-workspaces', { path: workspace })
    const session = await data<{ id: string }>(page, 'POST', '/agent-sessions', {
      agentId: agent.id, name: 'Projection fixture', workspace: { type: 'user', workspaceId: workspaceEntity.id }
    })
    const topicId = `agent-session:${session.id}`
    checkpoint('registration_run')
    registrationDiagnostic = { operation: 'capture_install', streamErrorPresent: null, reason: 'none', capture: null,
      providerRequestCount: 0, providerReached: false }
    let registration: Awaited<ReturnType<typeof finishCapture>>
    try {
      await installCapture(app, canary, 'none')
      registrationDiagnostic.operation = 'run_turn'
      const turn = await runTurn(page, topicId, modelId)
      registrationDiagnostic.providerRequestCount = providerRequests.length
      registrationDiagnostic.providerReached = providerRequests.length > 0
      registrationDiagnostic.streamErrorPresent = Boolean(turn.error)
      registrationDiagnostic.reason = registrationReason(turn.error)
      registrationDiagnostic.operation = 'stream_assertion'
      assert.equal(turn.error, '')
      registrationDiagnostic.operation = 'capture_inspection'
      registration = await finishCapture(app)
      registrationDiagnostic.capture = await readCaptureDiagnostic(app)
    } catch (error) {
      registrationDiagnostic.providerRequestCount = providerRequests.length
      registrationDiagnostic.providerReached = providerRequests.length > 0
      if (registrationDiagnostic.reason === 'none') registrationDiagnostic.reason = registrationReason(error)
      registrationDiagnostic.capture = await readCaptureDiagnostic(app).catch(() => null)
      throw error
    }
    registrationDiagnostic.operation = 'assertions'
    checkpoint('registration_assertions')
    assert.equal(registration.length, 1)
    assert(registration[0].catalogWrites > 0 && registration[0].catalogWritesProjected)
    assert(registration[0].inlineArtifactOnly && registration[0].systemProjected)
    assert(registration[0].catalogSnapshotMatched && registration[0].runSnapshotMatched)
    registrationDiagnostic.operation = 'original_agent_read'
    const originalAgent = await data<{ instructions: string }>(page, 'GET', `/agents/${agent.id}`)
    registrationDiagnostic.operation = 'original_agent_assertion'
    assert.equal(originalAgent.instructions, `Reply briefly. Known system value: ${canary}`)
    checkpoint('history_seed')
    const messages = await data<{ items: Message[] }>(page, 'GET', `/agent-sessions/${session.id}/messages`)
    const seed = messages.items.find((message) => message.role === 'assistant')
    assert(seed)
    const seededData = { ...seed.data, parts: [
      { type: 'text', text: `Legacy ordinary content ${canary}` },
      {
        type: 'dynamic-tool', toolName: 'projection_history_tool', toolCallId: 'projection-history-call',
        state: 'output-available', input: { priorInput: canary }, output: { priorOutput: canary }
      }
    ] }
    await data(page, 'PATCH', `/agent-sessions/${session.id}/messages/${seed.id}`, { data: seededData })
    await closeProjectionHistorySession(app, session.id)
    checkpoint('history_run')
    await installCapture(app, canary, 'none', agent.id)
    const historyTurn = await runTurn(page, topicId, modelId, { text: `Reply briefly. Deliberate known-value echo: ${canary}` })
    const history = await finishCapture(app)
    checkpoint('history_assertions')
    historyDiagnostic = historyAssertionDiagnostic(historyTurn.error, history, providerRequests)
    assert.equal(historyTurn.error, '')
    assert.equal(history.length, 1)
    assert.deepEqual(history[0], {
      inlineArtifactOnly: true, systemProjected: true, catalogWrites: 0, catalogWritesProjected: true,
      catalogSnapshotMatched: true, runSnapshotMatched: true, catalogRaceObserved: true,
      preparedInvocations: 0, preparedRevisionsMatched: false,
      credentialsPreserved: true, historyPresent: true, historyContainsCanary: false,
      inputContainsCanary: false, inputContainsReplacement: true,
      historyContainsReplacement: true, historyToolIdentityPreserved: true
    })
    historyDiagnostic.operation = 'provider_assertions'
    assert(providerRequests.length >= 2)
    assert(providerRequests.every((request) => request.authorized && !request.containsCanary && request.systemProjected && !request.racedPrompt))
    historyDiagnostic.operation = 'stored_history_read'
    const unchanged = await data<Message>(page, 'GET', `/agent-sessions/${session.id}/messages/${seed.id}`)
    historyDiagnostic.operation = 'stored_history_assertion'
    historyDiagnostic.originalHistoryUnchanged = JSON.stringify(unchanged.data) === JSON.stringify(seededData)
    assert.equal(JSON.stringify(unchanged.data), JSON.stringify(seededData))
    const diagnostics: Array<{ fault: Fault; redacted: boolean }> = []
    for (const fault of ['http', 'throw'] as const) {
      checkpoint('fault_run', fault)
      await ipc(page, 'ai.agent.session.close_warm', { sessionId: session.id })
      await installCapture(app, canary, fault)
      const result = await runTurn(page, topicId, modelId)
      const captures = await finishCapture(app)
      checkpoint('fault_assertions', fault)
      assert.equal(captures.length, 1)
      assert(captures[0]?.credentialsPreserved)
      assert(result.error.includes('<redacted>'))
      assert.equal(result.error.includes(canary.slice(0, 10)), false)
      assert.equal(result.chunks.includes(canary.slice(0, 10)), false)
      diagnostics.push({ fault, redacted: true })
    }
    checkpoint('mcp_setup')
    const server = await data<{ id: string }>(page, 'POST', '/mcp-servers', {
      name: 'Projection external fixture', type: 'streamableHttp', baseUrl: mcp.url,
      headers: { Authorization: `Bearer ${canary}` }, isActive: true, isTrusted: true
    })
    const toolAgent = await ipc<{ id: string }>(page, 'ai.agent.create', {
      type: 'uar', name: 'Projection tool fixture', model: modelId, mcps: [server.id],
      instructions: 'Use the projection tool when requested.',
      configuration: { permission_mode: 'auto', uar_model_assignment: { source: 'boss' } }
    })
    await installMcpSinkCapture(app, canary)
    for (const mode of ['success', 'isError', 'error'] as const) {
      checkpoint('mcp_run', mode)
      toolMode = mode
      const toolSession = await data<{ id: string }>(page, 'POST', '/agent-sessions', {
        agentId: toolAgent.id, name: `Projection ${mode}`, workspace: { type: 'user', workspaceId: workspaceEntity.id }
      })
      const before = mcp.calls.length
      await installCapture(app, canary, 'none')
      const result = await runTurn(page, `agent-session:${toolSession.id}`, modelId)
      const revisions = await finishCapture(app)
      checkpoint('mcp_assertions', mode)
      assert.equal(revisions.length, 1)
      assert(revisions[0].runSnapshotMatched && revisions[0].preparedRevisionsMatched)
      assert.equal(revisions[0].preparedInvocations, 1)
      assert.equal(mcp.calls.length - before, 1)
      assert.equal(mcp.calls.at(-1)?.mode, mode)
      assert.equal(mcp.calls.at(-1)?.originalArguments, true)
      assert.equal(result.error.includes(canary), false)
      if (mode !== 'error') {
        assert.equal(result.error, '')
        assert(toolInputs.some((input) => input.mode === mode && input.redacted))
      }
      await ipc(page, 'ai.agent.session.close_warm', { sessionId: toolSession.id })
    }
    checkpoint('mcp_sink_assertions')
    const sinks = await finishMcpSinkCapture(app)
    assert(mcp.authenticatedRequests() > 0)
    assert(toolInputs.every((input) => input.redacted))
    const configured = await data<{ headers: Record<string, string> }>(page, 'GET', `/mcp-servers/${server.id}`)
    assert.equal(configured.headers.Authorization, `Bearer ${canary}`)
    checkpoint('approval_agent_setup')
    const approvalAgent = await ipc<{ id: string }>(page, 'ai.agent.create', {
      type: 'uar', name: 'Projection approval fixture', model: modelId, mcps: [server.id],
      configuration: { permission_mode: 'default', uar_model_assignment: { source: 'boss' } }
    })
    const eventReceipts: unknown[] = []
    for (const scenario of ['split', 'partial', 'reconnect', 'interrupted', 'cancel', 'snapshot', 'run-error', 'approval', 'approval-error'] as const) {
      checkpoint('event_setup', scenario)
      const approval = scenario.startsWith('approval')
      toolMode = approval ? 'success' : undefined
      providerFailure = scenario === 'run-error'
      const eventSession = await data<{ id: string }>(page, 'POST', '/agent-sessions', {
        agentId: approval ? approvalAgent.id : agent.id, name: `Projection events ${scenario}`,
        workspace: { type: 'user', workspaceId: workspaceEntity.id }
      })
      const eventTopic = `agent-session:${eventSession.id}`
      await installEventProjectionFixture(app, canary, scenario)
      let capture: Awaited<ReturnType<typeof finishEventProjectionFixture>>
      let result: Awaited<ReturnType<typeof runTurn>>
      try {
        checkpoint('event_run', scenario)
        result = await runTurn(page, eventTopic, modelId, { approve: approval, cancel: scenario === 'cancel' })
      } catch (error) {
        failedDiagnostic = { ...diagnostic }
        throw error
      } finally {
        checkpoint('event_capture', scenario)
        await ipc(page, 'ai.stream.abort', { topicId: eventTopic })
        capture = await finishEventProjectionFixture(app)
      }
      checkpoint('event_persistence', scenario)
      await ipc(page, 'ai.agent.session.close_warm', { sessionId: eventSession.id })
      const stored = await data<{ items: Message[] }>(page, 'GET', `/agent-sessions/${eventSession.id}/messages`)
      const assistant = stored.items.filter((message) => message.role === 'assistant').map((message) => message.data)
      checkpoint('event_assertions', scenario)
      assert(assistant.length > 0)
      if (scenario === 'approval-error' || scenario === 'run-error') {
        assert(result.error.includes('<redacted>'))
        assert.equal(result.error.includes(canary.slice(0, 10)), false)
      } else if (scenario !== 'interrupted' && scenario !== 'cancel') assert.equal(result.error, '')
      if (approval) assert(capture.approvals.length > 0 && capture.decisions.length > 0)
      eventReceipts.push(assertProjectedEvents(scenario, canary, result.chunks, assistant, capture))
    }
    checkpoint('receipt_write')
    const receipt = {
      gate: 'BAUAR projection', boundary: 'real Electron IPC, session store, run HTTP, provider and mounted MCP',
      history: history[0], originalHistoryUnchanged: true, providerAuthenticated: true,
      diagnostics, diagnosticFixture: 'controlled HTTP failure/throw at the real run request boundary',
      claims, sinks, externalMcpAuthenticated: true, configuredCredentialUnchanged: true,
      toolModelInputs: toolInputs, traceBoundary: 'real OTel spans observed before delegated end; no persisted-trace claim',
      eventReceipts, newModelInputProjected: true, catalogRegistration: registration[0],
      providerRevisionPairedWithActualPrepare: true,
      originalAgentInstructionsUnchanged: true, systemPromptProjected: true,
      excluded: ['shared transport logs', 'sidecar-owned credentials', 'unknown or transformed secrets', 'actual approval lifecycle/effect acceptance belongs to approval gate']
    }
    const evidencePath = process.argv[2]
    if (evidencePath) {
      await mkdir(dirname(evidencePath), { recursive: true })
      await writeFile(evidencePath, `${JSON.stringify(receipt, null, 2)}\n`)
    }
    process.stdout.write(`${JSON.stringify(receipt)}\n`)
  } catch (error) {
    failedDiagnostic ??= { ...diagnostic }
    throw error
  } finally {
    checkpoint('cleanup')
    if (app) {
      await restoreCapture(app)
      await app.close()
    }
    await mcp.close()
    provider.closeAllConnections()
    await new Promise<void>((resolve, reject) => provider.close((error) => error ? reject(error) : resolve()))
  }
}

void main().catch(() => {
  process.stderr.write(`${JSON.stringify({ projectionFailure: failedDiagnostic ?? diagnostic,
    ...((failedDiagnostic ?? diagnostic).stage.startsWith('registration_') ? { registrationDiagnostic } : {}),
    ...((failedDiagnostic ?? diagnostic).stage === 'history_assertions' ? { historyDiagnostic } : {}) })}\n`)
  process.stderr.write('BAUAR projection gate failed; inspect the isolated app evidence without exposing credentials.\n')
  process.exitCode = 1
})
