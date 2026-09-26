# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: uarExperienceGate.test.ts >> Gate V: a configured catalog agent runs through Boss with A2UI, approval reconnect and knowledge
- Location: tests/e2e/gates/uarExperienceGate.test.ts:104:5

# Error details

```
Error: UAR sidecar exited before readiness (1): Server error: Address already in use (os error 48)
```

# Test source

```ts
  1   | import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
  2   | import { createServer, type Server } from 'node:http'
  3   | import { tmpdir } from 'node:os'
  4   | import { dirname, join } from 'node:path'
  5   | 
  6   | import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
  7   | 
  8   | import { sendGateVCompletion } from './support/uarExperienceProvider'
  9   | 
  10  | const sidecarPath = process.env.THE_BOSS_UAR_SIDECAR_PATH
  11  | const evidencePath = process.env.GATE_V_EVIDENCE_PATH
  12  | const screenshotDirectory = process.env.GATE_V_SCREENSHOT_DIRECTORY
  13  | 
  14  | type Catalog = {
  15  |   agents: Array<{ id: string; revision: string; definition: Record<string, any> }>
  16  |   skills: Array<{ id: string; enabled: boolean }>
  17  | }
  18  | type PresentationSnapshot = {
  19  |   presentations: Array<{ id: string; revision: number; title: string }>
  20  | }
  21  | type OperationSnapshot = {
  22  |   runs: Array<{ runId: string; ownerSessionId: string; status: string; agentRevision?: string }>
  23  |   knowledgeBases: Array<{
  24  |     id: string
  25  |     name: string
  26  |     documents: Array<{ id: string; filename: string; status: string; chunkCount: number }>
  27  |   }>
  28  |   protocols: { a2a: string; acp: string }
  29  |   failures: Array<{ surface: string; message: string }>
  30  | }
  31  | type AdministrationSnapshot = {
  32  |   uarVersion: string
  33  |   surfaces: Array<{
  34  |     id: string
  35  |     group: string
  36  |     availability: string
  37  |     methods: Array<{ id: string; adapter: 'available' | 'unavailable' }>
  38  |   }>
  39  | }
  40  | 
  41  | function required(name: string, value: string | undefined): string {
  42  |   if (!value?.trim()) throw new Error(`${name} is required`)
  43  |   return value.trim()
  44  | }
  45  | 
  46  | async function mainWindow(app: ElectronApplication): Promise<Page> {
  47  |   const deadline = Date.now() + 60_000
  48  |   while (Date.now() < deadline) {
  49  |     const page = app.windows().find((candidate) => {
  50  |       try {
  51  |         return new URL(candidate.url()).pathname.endsWith('/windows/main/index.html')
  52  |       } catch {
  53  |         return false
  54  |       }
  55  |     })
  56  |     if (page) {
  57  |       await page.locator('#root').waitFor({ state: 'visible', timeout: 60_000 })
  58  |       return page
  59  |     }
  60  |     await new Promise((resolve) => setTimeout(resolve, 250))
  61  |   }
  62  |   throw new Error('The Boss main window did not become ready')
  63  | }
  64  | 
  65  | async function launch(profile: string): Promise<{ app: ElectronApplication; page: Page }> {
  66  |   const app = await electron.launch({
  67  |     args: ['.'],
  68  |     env: {
  69  |       ...process.env,
  70  |       NODE_ENV: 'development',
  71  |       CS_DEV_USER_DATA_SUFFIX: profile,
  72  |       THE_BOSS_UAR_SIDECAR_PATH: required('THE_BOSS_UAR_SIDECAR_PATH', sidecarPath)
  73  |     },
  74  |     timeout: 60_000
  75  |   })
  76  |   return { app, page: await mainWindow(app) }
  77  | }
  78  | 
  79  | async function closeApp(app: ElectronApplication): Promise<void> {
  80  |   const child = app.process()
  81  |   await Promise.race([app.close(), new Promise<void>((resolve) => setTimeout(resolve, 10_000))]).catch(() => undefined)
  82  |   if (child?.exitCode === null) child.kill('SIGTERM')
  83  | }
  84  | 
  85  | async function ipc<T>(page: Page, route: string, input: unknown): Promise<T> {
  86  |   const result = (await page.evaluate(({ route, input }) => window.api.ipcApi.request(route, input), {
  87  |     route,
  88  |     input
  89  |   })) as { ok: boolean; data?: T; error?: { message?: string } }
> 90  |   if (!result.ok) throw new Error(result.error?.message ?? `${route} failed`)
      |                         ^ Error: UAR sidecar exited before readiness (1): Server error: Address already in use (os error 48)
  91  |   return result.data as T
  92  | }
  93  | 
  94  | async function data<T>(page: Page, method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  95  |   const result = (await page.evaluate(
  96  |     ({ method, path, body }) =>
  97  |       window.api.dataApi.request({ id: crypto.randomUUID(), method, path, ...(body === undefined ? {} : { body }) }),
  98  |     { method, path, body }
  99  |   )) as { data?: T; error?: { message?: string } }
  100 |   if (result.error) throw new Error(result.error.message ?? `${method} ${path} failed`)
  101 |   return result.data as T
  102 | }
  103 | 
  104 | test('Gate V: a configured catalog agent runs through Boss with A2UI, approval reconnect and knowledge', async () => {
  105 |   const profile = `Gate-V-${Date.now()}`
  106 |   const workspace = mkdtempSync(join(tmpdir(), 'the-boss-gate-v-'))
  107 |   const documentPath = join(workspace, 'gate-v-knowledge.txt')
  108 |   writeFileSync(documentPath, 'The Gate V acceptance phrase is sapphire integration.\n')
  109 |   const providerRequests: Array<{ hasTools: boolean; afterTool: boolean; bodyKeys: string[]; toolNames: string[] }> = []
  110 |   const provider: Server = createServer(async (request, response) => {
  111 |     if (request.method === 'GET' && request.url === '/v1/models') {
  112 |       response.writeHead(200, { 'content-type': 'application/json' })
  113 |       response.end(JSON.stringify({ data: [{ id: 'gate-v-model' }] }))
  114 |       return
  115 |     }
  116 |     if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
  117 |       response.writeHead(404).end()
  118 |       return
  119 |     }
  120 |     const chunks: Buffer[] = []
  121 |     for await (const chunk of request) chunks.push(Buffer.from(chunk))
  122 |     const body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, any>
  123 |     const tools = Array.isArray(body.tools) ? body.tools : []
  124 |     providerRequests.push({
  125 |       hasTools: tools.length > 0,
  126 |       afterTool: Array.isArray(body.messages) && body.messages.some((message: any) => message?.role === 'tool'),
  127 |       bodyKeys: Object.keys(body).sort(),
  128 |       toolNames: tools
  129 |         .map((tool: any) => tool?.function?.name ?? tool?.name)
  130 |         .filter((name: unknown): name is string => typeof name === 'string')
  131 |     })
  132 |     sendGateVCompletion(response, String(body.model ?? 'gate-v-model'), body, workspace)
  133 |   })
  134 |   await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve))
  135 |   const address = provider.address()
  136 |   if (!address || typeof address === 'string') throw new Error('Gate V provider fixture did not bind')
  137 |   const providerBaseUrl = `http://127.0.0.1:${address.port}/v1`
  138 | 
  139 |   let app: ElectronApplication | undefined
  140 |   try {
  141 |     let launched = await launch(profile)
  142 |     app = launched.app
  143 |     await launched.page.evaluate(async () => {
  144 |       await window.api.preference.setMultiple({
  145 |         'app.language': 'en-US',
  146 |         'app.onboarding.provider_setup.status': 'skipped',
  147 |         'app.privacy.data_collection.enabled': false
  148 |       })
  149 |     })
  150 |     await closeApp(app)
  151 | 
  152 |     launched = await launch(profile)
  153 |     app = launched.app
  154 |     const page = launched.page
  155 |     const bossProviderId = `gate-v-boss-${Date.now()}`
  156 |     const bossModelId = `${bossProviderId}::gate-v-model`
  157 |     await data(page, 'POST', '/providers', {
  158 |       providerId: bossProviderId,
  159 |       name: 'Gate V Boss fallback',
  160 |       endpointConfigs: { 'openai-chat-completions': { baseUrl: providerBaseUrl } },
  161 |       defaultChatEndpoint: 'openai-chat-completions',
  162 |       apiKeys: [{ id: crypto.randomUUID(), key: 'gate-v-boss-key', label: 'Gate V', isEnabled: true }]
  163 |     })
  164 |     await data(page, 'POST', '/models', [
  165 |       {
  166 |         providerId: bossProviderId,
  167 |         modelId: 'gate-v-model',
  168 |         name: 'Gate V model',
  169 |         capabilities: ['function-call'],
  170 |         endpointTypes: ['openai-chat-completions'],
  171 |         supportsStreaming: true,
  172 |         contextWindow: 128_000,
  173 |         maxOutputTokens: 8_192
  174 |       }
  175 |     ])
  176 |     await ipc(page, 'prometheus.uar.providers.save', {
  177 |       mode: 'create',
  178 |       id: 'gate-v-uar',
  179 |       displayName: 'Gate V UAR provider',
  180 |       baseUrl: providerBaseUrl,
  181 |       protocol: 'chat',
  182 |       defaultModel: 'gate-v-model',
  183 |       models: [
  184 |         {
  185 |           id: 'gate-v-model',
  186 |           displayName: 'Gate V model',
  187 |           contextWindow: 128_000,
  188 |           maxOutputTokens: 8_192,
  189 |           enabled: true,
  190 |           supportsTools: true
```