import type { ElectronApplication } from '@playwright/test'

type Capture = {
  inlineArtifactOnly: boolean
  systemProjected: boolean
  catalogWrites: number
  catalogWritesProjected: boolean
  catalogSnapshotMatched: boolean
  runSnapshotMatched: boolean
  preparedInvocations: number
  preparedRevisionsMatched: boolean
  catalogRaceObserved: boolean
  credentialsPreserved: boolean
  inputContainsCanary: boolean
  inputContainsReplacement: boolean
  historyPresent: boolean
  historyContainsCanary: boolean
  historyContainsReplacement: boolean
  historyToolIdentityPreserved: boolean
}
export type Fault = 'none' | 'http' | 'throw'
type HttpCategory = 'not_observed' | 'success' | 'not_found' | 'unauthorized' | 'forbidden' |
  'conflict' | 'request_timeout' | 'server_error' | 'other_http'
export type CaptureDiagnostic = {
  catalogStatus: HttpCategory; catalogWriteStatus: HttpCategory; runStatus: HttpCategory; inspectionStatus: HttpCategory
  captureCount: number; catalogWrites: number; inspectionsCompleted: number
  catalogRevisionMatches: boolean[]; runRevisionMatches: boolean[]
}

export async function installCapture(app: ElectronApplication, canary: string, fault: Fault, raceAgentId?: string): Promise<void> {
  await app.evaluate(async (_, input) => {
    const { IncomingMessage } = await import('node:http')
    const state = globalThis as typeof globalThis & {
      __bauarProjection?: { captures: Capture[]; inspect(): Promise<void>; restore(): void; diagnostic(): CaptureDiagnostic }
    }
    if (state.__bauarProjection) throw new Error('Projection fixture is already installed')
    const original = globalThis.fetch
    const originalEmit = IncomingMessage.prototype.emit
    const prepareUrls = new Set<string>()
    const bodies = new WeakMap<object, { chunks: Buffer[]; size: number }>()
    const prepared: Array<{ runId: string; revision: string }> = []
    let observationFailed = false
    IncomingMessage.prototype.emit = function (event: string | symbol, ...args: any[]) {
      try {
        const url = `http://127.0.0.1:${this.socket?.localPort}${this.url}`
        if (this.method === 'POST' && prepareUrls.has(url)) {
          if (event === 'data') {
            const body = bodies.get(this) ?? { chunks: [], size: 0 }
            const chunk = Buffer.from(args[0])
            body.size += chunk.length
            if (body.size <= 8 * 1024 * 1024) body.chunks.push(chunk)
            else observationFailed = true
            bodies.set(this, body)
          } else if (event === 'end') {
            const body = bodies.get(this)
            bodies.delete(this)
            if (body && body.size <= 8 * 1024 * 1024) {
              const { invocation } = JSON.parse(Buffer.concat(body.chunks).toString('utf8'))
              prepared.push({ runId: invocation.executingRunId, revision: invocation.catalogRevision })
            } else observationFailed = true
          }
        }
      } catch { observationFailed = true }
      return Reflect.apply(originalEmit, this, [event, ...args])
    }
    const captures: Capture[] = []
    const ordered = (value: any): any => Array.isArray(value) ? value.map(ordered)
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, ordered(v)]))
        : value
    let catalog: any
    let catalogWrites = 0
    let catalogWritesProjected = true
    const inspections: Array<() => Promise<void>> = []
    const statuses: Pick<CaptureDiagnostic, 'catalogStatus' | 'catalogWriteStatus' | 'runStatus' | 'inspectionStatus'> = {
      catalogStatus: 'not_observed', catalogWriteStatus: 'not_observed', runStatus: 'not_observed', inspectionStatus: 'not_observed'
    }
    let inspectionsCompleted = 0
    const statusCategory = (status: number): HttpCategory => {
      if (status >= 200 && status < 300) return 'success'
      if (status === 401) return 'unauthorized'
      if (status === 403) return 'forbidden'
      if (status === 404) return 'not_found'
      if (status === 408) return 'request_timeout'
      if (status === 409) return 'conflict'
      return status >= 500 ? 'server_error' : 'other_http'
    }
    state.__bauarProjection = {
      captures, inspect: async () => { for (const inspect of inspections) await inspect() },
      diagnostic: () => ({ ...statuses, captureCount: captures.length, catalogWrites, inspectionsCompleted,
        catalogRevisionMatches: captures.map((capture) => capture.catalogSnapshotMatched),
        runRevisionMatches: captures.map((capture) => capture.runSnapshotMatched) }),
      restore: () => {
        globalThis.fetch = original
        IncomingMessage.prototype.emit = originalEmit
      }
    }
    globalThis.fetch = async (request, init) => {
      const url = new URL(request instanceof Request ? request.url : String(request))
      const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      if (local && /^\/api\/agents(?:\/|$)/.test(url.pathname)) {
        if (init?.method === 'POST' || init?.method === 'PUT') {
          const artifact = JSON.parse(String(init.body))
          catalogWrites += 1
          catalogWritesProjected &&= !JSON.stringify(artifact.prompt).includes(input.canary)
            && artifact.prompt.system.includes('<redacted>')
        }
        const response = await original(request, init)
        statuses.catalogStatus = statusCategory(response.status)
        if (init?.method === 'POST' || init?.method === 'PUT') statuses.catalogWriteStatus = statuses.catalogStatus
        if (response.ok) catalog = await response.clone().json()
        return response
      }
      if (local && url.pathname === '/api/uar/runs' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        const history = body.history?.messages ?? []
        prepareUrls.add(`${body.tool_admission.url}/prepare`)
        const capturedCatalogRevision = catalog?.extensions['uar.catalog'].revision
        const capture: Capture = {
          inlineArtifactOnly: Boolean(body.artifact) && !Object.hasOwn(body, 'agent_id'),
          systemProjected: !JSON.stringify(body.artifact?.prompt).includes(input.canary)
            && body.artifact?.prompt.system.includes('<redacted>'),
          catalogWrites, catalogWritesProjected,
          catalogSnapshotMatched: Boolean(catalog) && JSON.stringify(ordered(body.artifact)) === JSON.stringify(ordered(catalog)),
          runSnapshotMatched: false, catalogRaceObserved: false,
          preparedInvocations: 0, preparedRevisionsMatched: false,
          credentialsPreserved: body.run_credentials?.some((entry: { api_key: string }) => entry.api_key === input.canary) === true,
          inputContainsCanary: String(body.input).includes(input.canary),
          inputContainsReplacement: String(body.input).includes('<redacted>'),
          historyPresent: history.length > 0,
          historyContainsCanary: JSON.stringify(history).includes(input.canary),
          historyContainsReplacement: JSON.stringify(history).includes('<redacted>'),
          historyToolIdentityPreserved: history.some((entry: any) => entry.tool_calls?.some((call: any) =>
            call.id === 'projection-history-call' && call.function.name === 'projection_history_tool'
          )) && history.some((entry: any) => entry.tool_call_id === 'projection-history-call')
        }
        captures.push(capture)
        if (input.fault === 'http') {
          return new Response(`${'x'.repeat(990)}${input.canary} diagnostic tail`, { status: 502 })
        }
        if (input.fault === 'throw') throw new Error(`Run request fixture failure: ${input.canary}`)
        if (input.raceAgentId) {
          const metadata = catalog.extensions['uar.catalog']
          if (metadata.source.kind !== 'the_boss' || metadata.source.id !== input.raceAgentId) {
            throw new Error('Catalog race fixture refused an entry it does not own')
          }
          const changed = structuredClone(catalog)
          changed.prompt.system += ' Projection catalog race marker.'
          const headers = new Headers(init.headers)
          headers.set('if-match', `"${metadata.revision}"`)
          const replaced = await original(new URL(`/api/agents/${encodeURIComponent(catalog.id)}`, url), {
            method: 'PUT', headers, body: JSON.stringify(changed)
          })
          if (!replaced.ok) throw new Error('Controlled catalog race update failed')
          const updated = await replaced.json()
          capture.catalogRaceObserved = updated.extensions['uar.catalog'].revision !== metadata.revision
            && updated.prompt.system.endsWith('Projection catalog race marker.')
        }
        const response = await original(request, init)
        statuses.runStatus = statusCategory(response.status)
        if (response.ok) {
          const created = await response.clone().json()
          inspections.push(async () => {
            const inspected = await original(new URL(`/api/uar/runs/${created.run_id}`, url), { headers: init.headers })
            statuses.inspectionStatus = statusCategory(inspected.status)
            if (!inspected.ok) throw new Error('Actual run inspection failed')
            const run = await inspected.json()
            const actual = prepared.filter((entry) => entry.runId === created.run_id)
            capture.runSnapshotMatched = run.agent_id === body.artifact.id
              && typeof run.agent_revision === 'string' && run.agent_revision.startsWith('sha256:')
              && (!capture.catalogSnapshotMatched || run.agent_revision === capturedCatalogRevision)
            capture.preparedInvocations = actual.length
            capture.preparedRevisionsMatched = !observationFailed && actual.length > 0
              && actual.every((entry) => entry.revision === run.agent_revision)
            inspectionsCompleted += 1
          })
        }
        return response
      }
      return original(request, init)
    }
  }, { canary, fault, raceAgentId })
}

export async function finishCapture(app: ElectronApplication): Promise<Capture[]> {
  return app.evaluate(async () => {
    const state = globalThis as any
    const capture = state.__bauarProjection
    try {
      await capture.inspect()
      return capture.captures as Capture[]
    } finally {
      state.__bauarProjectionDiagnostic = capture.diagnostic()
      capture.restore()
      delete state.__bauarProjection
    }
  })
}

export async function readCaptureDiagnostic(app: ElectronApplication): Promise<CaptureDiagnostic | null> {
  return app.evaluate(() => {
    const state = globalThis as any
    return state.__bauarProjection?.diagnostic() ?? state.__bauarProjectionDiagnostic ?? null
  })
}

export async function restoreCapture(app: ElectronApplication): Promise<void> {
  await app.evaluate(() => {
    const state = globalThis as any
    state.__bauarProjection?.restore()
    delete state.__bauarProjection
    delete state.__bauarProjectionDiagnostic
  })
}
