# External-source evidence for assessment.md

Generated 2026-09-22 by reading the cited files at the commits below (read-only). Secret-bearing values are redacted at capture. A citation whose line range no longer holds the quoted content is a defect in the assessment, not in this file.

## Repositories and commits

- **P** git@github.com:Prometheus-AGS/prometheus-skill-system.git @ `fcccc9d` (/Users/gqadonis/Projects/prometheus/prometheus-skill-pack)
- **B** git@github.com:Prometheus-AGS/the-boss.git @ `10aa57f76c` (/Users/gqadonis/Projects/prometheus/the-boss)
- **F** git@github.com:GQAdonis/rust-mcp-filesystem.git @ `d977fbd` (/Users/gqadonis/Projects/references/rust-mcp-filesystem)
- **O** git@github.com:Prometheus-AGS/OpenSpec.git @ `d39ca5a` (/Users/gqadonis/Projects/references/OpenSpec)
- **SY** https://github.com/Know-Me-Tools/sycophancy-correction-skill.git @ `bc348ff` (/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/skills/imported/sycophancy-correction)

## Excerpts

### E1 — P:tools/liter-llm/docker/Dockerfile:18-31 — liter-llm image: distroless runtime, EXPOSE 4000, entrypoint

```
  18| FROM cgr.dev/chainguard/glibc-dynamic@sha256:7ff79e2caef2b8a137ddaf9940fb790e91148482092363760d6661e4591fd54c
  19| 
  20| COPY --from=builder /usr/local/bin/liter-llm /usr/bin/liter-llm
  21| 
  22| ENV RUST_LOG=info
  23| 
  24| EXPOSE 4000
  25| 
  26| LABEL org.opencontainers.image.source="https://github.com/xberg-io/liter-llm"
  27| LABEL org.opencontainers.image.description="LiterLLM — OpenAI-compatible LLM proxy and MCP server with 165 providers"
  28| LABEL org.opencontainers.image.licenses="MIT"
  29| 
  30| ENTRYPOINT ["liter-llm"]
  31| CMD ["api", "--host", "0.0.0.0", "--port", "4000"]
```

### E2 — P:tools/liter-llm/docker-compose.yml:1-7 — liter-llm upstream compose defines only Redis on 6379

```
   1| services:
   2|   redis:
   3|     image: redis:7-alpine
   4|     ports:
   5|       - "6379:6379"
   6|     healthcheck:
   7|       test: ["CMD", "redis-cli", "ping"]
```

### E3 — P:tools/surreal-memory-server/Dockerfile:50-69 — surreal-memory image: non-root user, EXPOSE 3001, healthcheck

```
  50| RUN useradd -m -u 1001 smserver
  51| USER smserver
  52| 
  53| WORKDIR /data
  54| 
  55| ENV RUST_LOG=info \
  56|     API_PORT=3001 \
  57|     SURREAL_MODE=server \
  58|     SURREAL_ENDPOINT=ws://surrealdb:8000 \
  59|     SURREAL_USERNAME=root \
  60|     SURREAL_PASSWORD=root \
  61|     SURREAL_NAMESPACE=memory \
  62|     SURREAL_DATABASE=main
  63| 
  64| EXPOSE 3001
  65| 
  66| HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  67|     CMD curl -f http://localhost:${API_PORT}/health || exit 1
  68| 
  69| CMD ["surreal-memory-server"]
```

### E4 — P:tools/surreal-memory-server/docker-compose.yaml:1-60 — surreal compose: surrealdb v3.0.5, 28000:8000, 23001:3001, HOME bind-mount of the HF cache

```
   1| # Docker Compose configuration for SurrealDB
   2| # Use with surreal-memory-server in server mode:
   3| #   SURREAL_MODE=server SURREAL_ENDPOINT=ws://localhost:8000 ./target/release/surreal-memory-server
   4| 
   5| services:
   6|   surrealdb:
   7|     image: surrealdb/surrealdb:v3.0.5
   8|     container_name: surrealdb
   9|     restart: unless-stopped
  10|     user: root
  11|     command:
  12|       - start
  13|       - --log=info
  14|       - --user=root
  15|       - --pass=root
  16|       - --bind=0.0.0.0:8000
  17|       - rocksdb:/data/database.db
  18|     ports:
  19|       - "28000:8000"
  20|     volumes:
  21|       - surrealdb_data:/data
  22|     healthcheck:
  23|       test: ["CMD", "/surreal", "isready", "--endpoint", "http://localhost:8000"]
  24|       interval: 5s
  25|       timeout: 5s
  26|       retries: 10
  27|       start_period: 10s
  28| 
  29|   surreal-memory-server:
  30|     build:
  31|       context: .
  32|       dockerfile: Dockerfile
  33|       args:
  34|         CARGO_BUILD_FLAGS: --no-default-features --features server-only,palace,local-embeddings
  35|     container_name: surreal-memory-server
  36|     restart: unless-stopped
  37|     ports:
  38|       - "23001:3001"
  39|     volumes:
  40|       - ${HOME}/.cache/huggingface/hub:/home/smserver/.cache/huggingface/hub:rw
  41|     environment:
  42|       - SURREAL_MODE=server
  43|       - SURREAL_ENDPOINT=ws://surrealdb:8000
  44|       - SURREAL_USERNAME=root
  45|       - SURREAL_PASSWORD=root
  46|       - SURREAL_NAMESPACE=memory
  47|       - SURREAL_DATABASE=main_local_384
  48|       - EMBEDDING_PROVIDER=local
  49|       - LOCAL_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
  50|       - MODEL_CACHE_DIR=/home/smserver/.cache/huggingface
  51|       - MCP_STDIO=false
  52|       # Retry/Reconnection Configuration (defaults shown)
  53|       - SURREAL_MAX_CONNECT_RETRIES=10       # Initial connection attempts
  54|       - SURREAL_MAX_OPERATION_RETRIES=3      # Per-operation retry attempts
  55|       - SURREAL_BASE_RETRY_DELAY_MS=100      # Starting backoff delay
  56|       - SURREAL_MAX_RETRY_DELAY_MS=5000      # Maximum backoff delay
  57|       - SURREAL_RETRY_JITTER_FACTOR=0.25     # Jitter as decimal (0.25 = ±25%)
  58|       - RUST_LOG=debug                       # Enable debug logging
  59|     depends_on:
  60|       surrealdb:
```

### E5 — P:shared/config/liter-llm-proxy.toml:14-26 — live proxy config structure (values redacted below)

```
  14| # no --config silently starts with ZERO models.
  15| 
  16| [general]
  17| # REQUIRED. Every /v1/* route is behind an unconditional Bearer check, so a config
  18| # with no master_key (and no [[keys]]) makes the proxy answer 401 to *everything* —
  19| # including /v1/models. Verified 2026-07-30 against the previous template, which
  20| # omitted this and could not serve a single request.
  21| master_key = "<redacted>"
  22| default_timeout_secs = 120
  23| max_retries = 3
  24| enable_cost_tracking = false
  25| enable_tracing = false
  26| 
```

### E6 — P:scripts/check-prerequisites.sh:309-314 — bash precedent: docker compose detection

```
 309|         echo "  ✅ Docker $(docker --version 2>/dev/null | awk '{print $3}' | tr -d ',')"
 310|         # Compose v2 plugin
 311|         if docker compose version >/dev/null 2>&1; then
 312|             echo "  ✅ Docker Compose v2 ($(docker compose version --short 2>/dev/null))"
 313|         else
 314|             echo "  ⚠️  Docker Compose v2 plugin not found (needed for native-agent stacks)"
```

### E7 — P:scripts/check-prerequisites.sh:574-580 — bash precedent: docker compose up -d

```
 574|             fi
 575|             if $INSTALL; then
 576|                 if (cd "$REPO_ROOT/tools/surreal-memory-server" && docker compose up -d); then
 577|                     echo "    ✅ surreal-memory-server started via Docker"
 578|                 else
 579|                     echo "    ❌ docker compose up failed for surreal-memory-server"
 580|                     TOOL_FAILURES+=("surreal-memory-server: docker compose failed")
```

### E8 — SY:crates/sycophancy-mcp/Cargo.toml:12-17 — single binary sycophancy-correction

```
  12| categories.workspace = true
  13| 
  14| [[bin]]
  15| name = "sycophancy-correction"
  16| path = "src/main.rs"
  17| 
```

### E9 — SY:Cargo.toml:20-26 — reqwest rustls-tls, default-features=false; rmcp stdio

```
  20| tokio          = { version = "1", features = ["full"] }
  21| # MCP SDK  (modelcontextprotocol/rust-sdk)
  22| rmcp           = { version = "0.1", features = ["server", "transport-io"] }
  23| # HTTP client for the LLM provider (OpenAI-compatible /chat/completions)
  24| reqwest        = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
  25| # Serialization
  26| serde          = { version = "1", features = ["derive"] }
```

### E10 — SY:crates/sycophancy-mcp/src/main.rs:5-9 — doc claims a --port HTTP mode

```
   5| //!
   6| //! Defaults to `skill.toml` in the current directory.
   7| //! Transport: stdio (Claude Code default) or streamable HTTP (--port N).
   8| 
   9| use anyhow::Result;
```

### E11 — SY:crates/sycophancy-mcp/src/main.rs:24-48 — stderr-only tracing; --config only; skill.toml default

```
  24| async fn main() -> Result<()> {
  25|     // ── Logging ───────────────────────────────────────────────────────────────
  26|     fmt()
  27|         .with_env_filter(
  28|             EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
  29|         )
  30|         .with_writer(std::io::stderr) // MCP servers must keep stdout clean for JSON-RPC
  31|         .json()
  32|         .init();
  33| 
  34|     // ── Config ────────────────────────────────────────────────────────────────
  35|     let config_path = std::env::args()
  36|         .collect::<Vec<_>>()
  37|         .windows(2)
  38|         .find(|w| w[0] == "--config")
  39|         .map(|w| std::path::PathBuf::from(&w[1]))
  40|         .unwrap_or_else(|| std::path::PathBuf::from("skill.toml"));
  41| 
  42|     let config = if config_path.exists() {
  43|         SkillConfig::from_file(&config_path)?
  44|     } else {
  45|         tracing::warn!("skill.toml not found, using defaults");
  46|         SkillConfig::default()
  47|     };
  48| 
```

### E12 — SY:crates/sycophancy-core/src/config.rs:163-170 — Rust default gateway :8181

```
 163| impl Default for LlmConfig {
 164|     fn default() -> Self {
 165|         Self {
 166|             base_url: "http://localhost:8181/v1".into(),
 167|             critic_model: "gpt-5.4-mini".into(),
 168|             rewrite_model: "gpt-5.5".into(),
 169|             critic_max_tokens: 2048,
 170|         }
```

### E13 — SY:skill.toml:71-76 — skill.toml default gateway :8181

```
  71| 
  72| [llm]
  73| base_url          = "http://localhost:8181/v1"
  74| critic_model      = "gpt-5.4-mini"
  75| rewrite_model     = "gpt-5.5"
  76| critic_max_tokens = 2048
```

### E14 — SY:crates/sycophancy-mcp/src/server.rs:103-107 — SYCOPHANCY_LLM_API_KEY read

```
 103|         });
 104| 
 105|         if let Ok(key) = std::env::var("SYCOPHANCY_LLM_API_KEY") {
 106|             req = req.bearer_auth(key);
 107|         }
```

### E15 — SY:crates/sycophancy-mcp/src/server.rs:212-230 — four tools dispatched

```
 212| 
 213|             match request.name.as_ref() {
 214|                 "detect_sycophancy" => {
 215|                     let input: DetectSycophancyInput = serde_json::from_value(args)
 216|                         .map_err(|e| rmcp::Error::invalid_params(e.to_string(), None))?;
 217|                     self.handle_detect(input).await
 218|                 }
 219|                 "correct_sycophancy" => {
 220|                     let input: CorrectSycophancyInput = serde_json::from_value(args)
 221|                         .map_err(|e| rmcp::Error::invalid_params(e.to_string(), None))?;
 222|                     self.handle_correct(input).await
 223|                 }
 224|                 "analyze_reflect_phase" => {
 225|                     let input: AnalyzeReflectPhaseInput = serde_json::from_value(args)
 226|                         .map_err(|e| rmcp::Error::invalid_params(e.to_string(), None))?;
 227|                     self.handle_reflect(input).await
 228|                 }
 229|                 "skill_info" => self.handle_info().await,
 230|                 _ => Err(rmcp::Error::invalid_params("tool not found", None)),
```

### E16 — SY:crates/sycophancy-mcp/src/server.rs:385-394 — stdio transport, EOF shutdown

```
 385| // ── Serve ─────────────────────────────────────────────────────────────────────
 386| 
 387| pub async fn serve(executor: PmpoExecutor, config: SkillConfig) -> Result<()> {
 388|     use rmcp::transport::io::stdio;
 389| 
 390|     let server = SycophancyServer::new(executor, config);
 391| 
 392|     tracing::info!("sycophancy-correction MCP server starting on stdio");
 393|     server.serve(stdio()).await?.waiting().await?;
 394|     Ok(())
```

### E17 — SY:crates/sycophancy-core/src/hooks/builtin/audit_hook.rs:58-75 — audit backends: stdout routed to stderr, File is a stub

```
  58|         let payload = serde_json::to_string(&record).unwrap_or_default();
  59|         match &self.backend {
  60|             // NOTE: emits via `tracing` -> stderr. Writing to real stdout here
  61|             // would corrupt the MCP JSON-RPC stream (see sycophancy-mcp/src/main.rs).
  62|             AuditBackend::Stdout => {
  63|                 tracing::info!(
  64|                     target: "sycophancy.audit",
  65|                     audit = %payload,
  66|                     "skill.complete"
  67|                 );
  68|             }
  69|             AuditBackend::File => {
  70|                 // In production: append to a rotation-aware log file.
  71|                 // For now, route to stderr with a distinct prefix so it never
  72|                 // lands on the JSON-RPC stdout channel.
  73|                 eprintln!("[AUDIT] {payload}");
  74|             }
  75|             AuditBackend::SurrealDb => {
```

### E18 — SY:scripts/smoke-test.sh:12-16 — binary path without .exe

```
  12| if command -v sycophancy-correction >/dev/null 2>&1; then
  13|     BIN="sycophancy-correction"
  14| elif [ -x "target/release/sycophancy-correction" ]; then
  15|     BIN="target/release/sycophancy-correction"
  16| else
```

### E19 — SY:scripts/smoke-test.sh:22-26 — ANTHROPIC_API_KEY warning (unused by Rust)

```
  22| echo "🔍 Smoke test: $BIN"
  23| 
  24| if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  25|     echo "⚠️  ANTHROPIC_API_KEY not set. Detection works; correction will return stubbed output."
  26| fi
```

### E20 — SY:scripts/smoke-test.sh:28-32 — hardcoded /opt/homebrew, /usr/local

```
  28| # Resolve timeout command (macOS Homebrew installs to /opt/homebrew/bin)
  29| TIMEOUT_CMD=""
  30| for t in timeout gtimeout /opt/homebrew/bin/timeout /usr/local/bin/timeout; do
  31|     if command -v "$t" >/dev/null 2>&1; then
  32|         TIMEOUT_CMD="$t"
```

### E21 — SY:scripts/smoke-test.sh:38-44 — mkfifo + mktemp -u /tmp

```
  38| # The MCP server processes messages asynchronously; sending all at once causes
  39| # the tools/list request to arrive before the initialized notification is handled.
  40| FIFO=$(mktemp -u /tmp/mcp_smoke_XXXXX)
  41| mkfifo "$FIFO"
  42| trap "rm -f $FIFO" EXIT
  43| 
  44| (
```

### E22 — F:Cargo.toml:1-8 — rust-mcp-filesystem package, version, edition

```
   1| [workspace]
   2| 
   3| [package]
   4| name = "rust-mcp-filesystem"
   5| version = "0.4.5"
   6| edition = "2024"
   7| repository = "https://github.com/rust-mcp-stack/rust-mcp-filesystem"
   8| authors = ["Ali Hashemi"]
```

### E23 — F:Cargo.toml:29-36 — rust-mcp-sdk stdio-only features

```
  29| rust-mcp-sdk = {version="1.0", default-features = false, features = [
  30|     "server",
  31|     "macros",
  32|     "stdio"
  33| ] }
  34| 
  35| thiserror = { version = "2.0" }
  36| dirs = "6.0"
```

### E24 — F:src/cli.rs:9-20 — --allow-write off by default

```
   9| long_about = None)]
  10| pub struct CommandArguments {
  11|     #[arg(
  12|         short = 'w',
  13|         long,
  14|         action = clap::ArgAction::SetTrue,
  15|         value_parser = clap::value_parser!(bool),
  16|         help = "Enables write mode for the app, allowing both reading and writing. Defaults to disabled.",
  17|         env = "ALLOW_WRITE"
  18|     )]
  19|     pub allow_write: bool,
  20| 
```

### E25 — F:src/server.rs:39-43 — StdioTransport only

```
  39| }
  40| 
  41| pub async fn start_server(args: CommandArguments) -> ServiceResult<()> {
  42|     let transport = StdioTransport::new(TransportOptions::default())?;
  43| 
```

### E26 — F:src/fs_service/core.rs:20-38 — AllowedDir: cap-std confined handle

```
  20| 
  21| /// A confined, capability-based handle to one of the allowed directories.
  22| ///
  23| /// All filesystem access is performed relative to [`AllowedDir::dir`], so that
  24| /// symlink escapes (existing, dangling, or raced) are rejected by the OS layer
  25| /// rather than by path arithmetic. For UNC roots, path-based operations use the
  26| /// `unc_root` fallback (see [`Resolved`]).
  27| pub struct AllowedDir {
  28|     /// De-verbatimized canonical absolute path, used for prefix matching and
  29|     /// display (e.g. `\\server\share\Movies`, never `\\?\UNC\...`).
  30|     pub path: PathBuf,
  31|     /// Verbatim canonical root (`\\?\UNC\server\share`) used only by the
  32|     /// `std::fs` fallback operations for Windows UNC shares, preserving
  33|     /// long-path support. `None` for local roots.
  34|     pub unc_root: Option<PathBuf>,
  35|     /// The `cap-std` directory handle that confines access to this subtree.
  36|     pub dir: Dir,
  37| }
  38| 
```

### E27 — F:src/fs_service/core.rs:214-229 — verify_unc_path re-check

```
 214|     /// Post-operation containment check for the ambient `std::fs` fallbacks:
 215|     /// canonicalize `abs` and reject it if it falls outside the UNC root.
 216|     fn verify_unc_path(&self, abs: &Path, message: &str) -> ServiceResult<()> {
 217|         let Some(root) = self.unc_root_clean() else {
 218|             return Ok(());
 219|         };
 220|         if let Ok(canonical) = std::fs::canonicalize(abs) {
 221|             let canonical_clean = strip_verbatim_prefix(&canonical);
 222|             if strip_prefix_platform(&canonical_clean, &root).is_none() {
 223|                 return Err(ServiceError::FromString(message.into()));
 224|             }
 225|         }
 226|         Ok(())
 227|     }
 228| }
 229| 
```

### E28 — F:src/fs_service/core.rs:277-305 — try_new: canonicalize, strip verbatim prefix, UNC flag

```
 277| 
 278| impl FileSystemService {
 279|     pub fn try_new(allowed_directories: &[String]) -> ServiceResult<Self> {
 280|         let normalized_dirs: ServiceResult<Vec<AllowedDir>> = allowed_directories
 281|             .iter()
 282|             .map(fix_dockerhub_mcp_registry_gateway)
 283|             .map(|dir| {
 284|                 let expand_result = expand_home(normalize_windows_drive_path(Path::new(dir)));
 285|                 if !expand_result.is_dir() {
 286|                     return Err(ServiceError::InvalidConfig(format!(
 287|                         "Error: The path `{dir}` is not a valid directory. Please double-check your server configuration to ensure the directory exists and is accessible."
 288|                     )));
 289|                 }
 290|                 let canonical = expand_result.canonicalize().map_err(ServiceError::from)?;
 291|                 let path = trim_trailing_separator(strip_verbatim_prefix(&canonical));
 292|                 let unc_root = is_unc_path(&canonical).then(|| canonical.clone());
 293|                 let dir = Dir::open_ambient_dir(&canonical, ambient_authority())
 294|                     .map_err(ServiceError::from)?;
 295|                 Ok(AllowedDir {
 296|                     path,
 297|                     unc_root,
 298|                     dir,
 299|                 })
 300|             })
 301|             .collect();
 302| 
 303|         Ok(Self {
 304|             allowed_dirs: RwLock::new(Arc::new(normalized_dirs?)),
 305|         })
```

### E29 — F:.github/workflows/ci.yml:9-13 — CI runs-on ubuntu-latest only

```
   9|   rust_check:
  10|     name: Rust check
  11|     runs-on: ubuntu-latest
  12|     steps:
  13|       - name: Checkout
```

### E30 — F:dist-workspace.toml:1-40 — cargo-dist targets incl. x86_64-pc-windows-msvc, installers msi/npm/powershell

```
   1| [workspace]
   2| members = ["cargo:."]
   3| 
   4| # Config for 'dist'
   5| [dist]
   6| # Path that installers should place binaries in
   7| install-path = "~/.rust-mcp-stack/bin"
   8| # The preferred dist version to use in CI (Cargo.toml SemVer syntax)
   9| cargo-dist-version = "0.32.0"
  10| # CI backends to support
  11| ci = "github"
  12| # The installers to generate for each app
  13| installers = ["shell", "powershell", "npm", "homebrew", "msi"]
  14| # Target platforms to build apps for (Rust target-triple syntax)
  15| targets = ["aarch64-apple-darwin", "aarch64-unknown-linux-gnu", "x86_64-apple-darwin", "x86_64-unknown-linux-gnu", "x86_64-pc-windows-msvc"]
  16| # The archive format to use for non-windows builds (defaults .tar.xz)
  17| unix-archive = ".tar.gz"
  18| # Whether to install an updater program
  19| install-updater = false
  20| # Whether dist should create a Github Release or use an existing draft
  21| create-release = false
  22| # A GitHub repo to push Homebrew formulas to
  23| tap = "rust-mcp-stack/homebrew-tap"
  24| # Publish jobs to run in CI
  25| publish-jobs = ["homebrew", "npm"]
  26| # A namespace to use when publishing this package to the npm registry
  27| npm-scope = "@rustmcp"
  28| 
  29| [dist.github-custom-runners]
  30| global = "ubuntu-22.04"
  31| 
  32| [dist.github-custom-runners.x86_64-unknown-linux-gnu]
  33| global = "ubuntu-22.04"
  34| runner = "ubuntu-22.04"
  35| 
  36| [dist.github-custom-runners.aarch64-unknown-linux-gnu]
  37| runner = "ubuntu-22.04"
  38| container = { image = "quay.io/pypa/manylinux_2_28_x86_64", host = "x86_64-unknown-linux-musl" }
  39| 
  40| # allow-dirty = ["ci"]
```

### E31 — O:package.json:1-12 — fork package name/version 1.13.1

```
   1| {
   2|   "name": "@fission-ai/openspec",
   3|   "version": "1.13.1",
   4|   "description": "AI-native system for spec-driven development",
   5|   "keywords": [
   6|     "openspec",
   7|     "specs",
   8|     "cli",
   9|     "ai",
  10|     "development"
  11|   ],
  12|   "homepage": "https://github.com/Fission-AI/OpenSpec",
```

### E32 — O:.github/workflows/ci.yml:50-70 — fork CI matrix includes windows-latest

```
  50|   test_matrix:
  51|     name: Test (${{ matrix.label }})
  52|     runs-on: ${{ matrix.os }}
  53|     timeout-minutes: 15
  54|     if: github.event_name == 'pull_request' || github.event_name == 'merge_group' || github.event_name == 'push' || github.event_name == 'workflow_dispatch'
  55|     strategy:
  56|       fail-fast: false
  57|       matrix:
  58|         include:
  59|           - os: ubuntu-latest
  60|             shell: bash
  61|             label: linux-bash
  62|             vitest_workers: 4
  63|           - os: macos-latest
  64|             shell: bash
  65|             label: macos-bash
  66|             vitest_workers: 4
  67|           - os: windows-latest
  68|             shell: pwsh
  69|             label: windows-pwsh
  70|             vitest_workers: 2
```

### E33 — B:package.json:1-8 — TheBoss 2.1.1 electron main

```
   1| {
   2|   "name": "TheBoss",
   3|   "version": "2.1.1",
   4|   "private": true,
   5|   "description": "The Boss — an agent studio for people who ship.",
   6|   "homepage": "https://github.com/CherryHQ/cherry-studio",
   7|   "author": "support@cherry-ai.com",
   8|   "main": "./out/main/main.js",
```

### E34 — B:src/main/core/paths/pathRegistry.ts:183-192 — skills path keys: builtin, library, claude mirror

```
 183|     // Agents
 184|     'feature.code_cli.skills.builtin': path.join(appRootResources, 'code-cli-skills'), // conditional Code Mate skill templates (read-only)
 185|     'feature.agents.skills.builtin': path.join(appRootResources, 'skills'), // bundled skill templates (read-only)
 186|     'feature.agents.skills': path.join(appUserDataData, 'Skills'), // installed skills storage
 187|     'feature.agents.skills.install.temp': path.join(appTemp, 'skill-install'),
 188|     'feature.agents.claude.root': path.join(appUserDataData, 'Agents', '.claude'), // v1 userData/.claude is copied here during v2 migration
 189|     'feature.agents.claude.skills': path.join(appUserDataData, 'Agents', '.claude', 'skills'), // symlinks → feature.agents.skills
 190|     // Claude Code's own session transcripts under Cherry's config dir. A registry key
 191|     // (not a joined path) so the orphan sweep can never be pointed at the user's ~/.claude.
 192|     'feature.agents.claude.projects': path.join(appUserDataData, 'Agents', '.claude', 'projects'),
```

### E35 — B:src/main/utils/builtinSkills.ts:25-60 — installBuiltinSkills copies resources/skills with .version

```
  25|  * Each installed skill gets a `.version` file recording the app version that
  26|  * installed it. On subsequent launches the bundled version is compared with
  27|  * the installed version — the skill files are overwritten only when the app
  28|  * ships a newer version.
  29|  */
  30| // TODO: v2-backup
  31| export async function installBuiltinSkills(): Promise<void> {
  32|   const resourceSkillsPath = toAsarUnpackedPath(application.getPath('feature.agents.skills.builtin'))
  33|   const appVersion = app.getVersion()
  34| 
  35|   try {
  36|     await fs.access(resourceSkillsPath)
  37|   } catch {
  38|     return
  39|   }
  40| 
  41|   const entries = await fs.readdir(resourceSkillsPath, { withFileTypes: true })
  42|   const dirs = entries.filter((e) => {
  43|     if (!e.isDirectory()) return false
  44|     const sourcePath = path.join(resourceSkillsPath, e.name)
  45|     return sourcePath.startsWith(resourceSkillsPath + path.sep)
  46|   })
  47| 
  48|   let installed = 0
  49|   // Process sequentially to avoid interleaved delete+insert on the skills
  50|   // table when multiple builtins require a metadata refresh.
  51|   for (const entry of dirs) {
  52|     try {
  53|       const filesUpdated = await skillService.syncBuiltinSkill(
  54|         entry.name,
  55|         path.join(resourceSkillsPath, entry.name),
  56|         appVersion
  57|       )
  58|       if (filesUpdated) installed++
  59|     } catch (error) {
  60|       logger.warn('Failed to sync built-in skill to DB', {
```

### E36 — B:src/main/ai/AiService.ts:394-419 — onInit chains installBuiltinSkills then reconcileSkills

```
 394|   private readonly requests = new Map<string, AbortController>()
 395| 
 396|   protected async onInit(): Promise<void> {
 397|     registerBuiltinTools()
 398|     // Restore provider custom `User-Agent` headers that Chromium's net.fetch stack
 399|     // would otherwise overwrite (see installProviderUserAgentInterceptor).
 400|     this.registerDisposable(installProviderUserAgentInterceptor())
 401|     application.get('JobManager').registerHandler('image-generation.generate', imageGenerationJobHandler)
 402|     // Install built-in skills, then heal the CLAUDE_CONFIG_DIR/skills mirror once at
 403|     // startup — chained (not two independent fire-and-forgets) so the mirror reconcile
 404|     // always runs after builtin skills have synced to agent_global_skill this boot,
 405|     // regardless of whether the install succeeded. Fire-and-forget as a pair so
 406|     // neither blocks init.
 407|     void installBuiltinSkills()
 408|       .catch((error) => {
 409|         logger.error('Failed to install built-in skills', error as Error)
 410|       })
 411|       .then(() =>
 412|         skillService.reconcileSkills().catch((error) => {
 413|           logger.error('Failed to reconcile skills', error)
 414|         })
 415|       )
 416|     logger.info('AiService initialized')
 417|   }
 418| 
 419|   /**
```

### E37 — B:src/main/ai/skills/SkillService.ts:770-806 — reconcileSkills steps

```
 770|    * builds only read these directories.
 771|    */
 772|   async reconcileSkills(): Promise<void> {
 773|     // Single-flight: reconcile-on-open can fire from several UI entry points at once — dedupe
 774|     // them onto one run instead of stampeding the filesystem and DB.
 775|     if (this.reconcileInFlight) return this.reconcileInFlight
 776|     // Under the mutation lock so reconcile can't interleave with install / uninstall / builtin
 777|     // sync (which would let it read a stale snapshot and prune a just-installed row).
 778|     this.reconcileInFlight = this.mutationLock
 779|       .runExclusive(async () => {
 780|         const storageRoot = application.getPath('feature.agents.skills')
 781|         await this.installer.recoverInterruptedInstalls(storageRoot)
 782|         try {
 783|           await this.ensureSkillPluginManifest()
 784|         } catch (error) {
 785|           logger.warn('Failed to prepare external CLI skill plugin bridge', { error })
 786|         }
 787|         await this.reconcileLibraryToDb()
 788|         await this.reconcileMirror()
 789|       })
 790|       .finally(() => {
 791|         this.reconcileInFlight = null
 792|       })
 793|     return this.reconcileInFlight
 794|   }
 795| 
 796|   /**
 797|    * Reconcile the managed library (Data/Skills) with the `agent_global_skill`
 798|    * catalog: adopt skills present on disk but missing a row, refresh non-builtin rows
 799|    * whose SKILL.md changed, and prune non-builtin rows whose files are gone. Builtins
 800|    * are owned by `installBuiltinSkills`; direct changes are not adopted and fail mirror
 801|    * integrity checks. Presence and authored-skill change detection read SKILL.md directly.
 802|    */
 803|   private async reconcileLibraryToDb(): Promise<void> {
 804|     const storageRoot = application.getPath('feature.agents.skills')
 805|     let entries: fs.Dirent[]
 806|     try {
```

### E38 — B:src/main/ai/skills/systemSkillSources.ts:20-30 — ~/.agents/skills and ~/.claude/skills as discovery sources

```
  20| export function buildSystemSkillSources(home: string, env: Record<string, string>): SystemSkillSource[] {
  21|   const configHome = resolveHomePath(home, env.XDG_CONFIG_HOME, ['.config'])
  22|   const claudeHome = resolveHomePath(home, env.CLAUDE_CONFIG_DIR, ['.claude'])
  23|   const codexHome = resolveHomePath(home, env.CODEX_HOME, ['.codex'])
  24| 
  25|   return [
  26|     { id: 'agents', name: 'Agent Skills', directoryPath: path.join(home, '.agents', 'skills') },
  27|     { id: 'agents-xdg', name: 'Agent Skills', directoryPath: path.join(configHome, 'agents', 'skills') },
  28|     { id: 'claude-code', name: 'Claude Code', directoryPath: path.join(claudeHome, 'skills') },
  29|     { id: 'codex', name: 'Codex', directoryPath: path.join(codexHome, 'skills') },
  30|     { id: 'cursor', name: 'Cursor', directoryPath: path.join(home, '.cursor', 'skills') },
```

### E39 — B:src/main/ai/skills/SkillService.ts:348-356 — discoverSystem

```
 348| 
 349|   /** Discover skills in known system-level CLI directories without copying them. */
 350|   async discoverSystem(): Promise<SystemSkillCandidate[]> {
 351|     const env = await getShellEnv()
 352|     const sources = buildSystemSkillSources(application.getPath('sys.home'), env)
 353|     const installed = agentGlobalSkillService.list()
 354|     const installedByPath = new Map(
 355|       installed.flatMap((skill) => {
 356|         if (skill.source !== 'system' || !skill.sourceUrl?.startsWith('file:')) return []
```

### E40 — B:src/main/ai/skills/SkillService.ts:422-430 — importSystem (import only)

```
 422| 
 423|   /** Import a discovered system skill into the managed library. Agent enablement is a separate data mutation. */
 424|   async importSystem(options: SkillImportSystemOptions): Promise<InstalledSkill> {
 425|     const canonicalPath = await fs.promises.realpath(options.directoryPath)
 426|     const candidates = await this.discoverSystem()
 427|     const candidate = candidates.find((item) => item.directoryPath === canonicalPath)
 428|     if (!candidate) {
 429|       throw new Error(`Directory is not a discovered system skill: ${options.directoryPath}`)
 430|     }
```

### E41 — B:src/main/services/diagnostics/doctor/registry.ts:1-40 — doctor registry (31 checks)

```
   1| import { bootConfigValid, hardwareAcceleration } from './checks/config'
   2| import { modelEndpoint, modelList, modelConversation } from './checks/connectivity'
   3| import {
   4|   installArchitectureMatch,
   5|   installNativeModules,
   6|   installUpdateAvailable,
   7|   installVersionChannel
   8| } from './checks/install'
   9| import { recentLogFindings } from './checks/logs'
  10| import { mcpLaunchCommands, mcpServersConnected } from './checks/mcp'
  11| import {
  12|   dnsResolution,
  13|   endpointCloud,
  14|   endpointDiagnostics,
  15|   endpointRegistry,
  16|   endpointUpdate,
  17|   online,
  18|   providerEndpoint,
  19|   proxyApplied,
  20|   tlsHandshake
  21| } from './checks/network'
  22| import { accessibilityPermission, screenCapturePermission } from './checks/permission'
  23| import { cherryAccount, providerApiKey, providerModel } from './checks/provider'
  24| import { claudeLogin, managedTools } from './checks/runtime'
  25| import { diagnosticDataSize, diskSpace, userDataLocation } from './checks/storage'
  26| import type { DoctorCheckRegistry } from './types'
  27| 
  28| /** One entry per catalog id; the type makes a missing or extra entry a compile error. */
  29| export const doctorCheckRegistry: DoctorCheckRegistry = {
  30|   'network-model-endpoint': modelEndpoint,
  31|   'provider-model-list': modelList,
  32|   'provider-model-conversation': modelConversation,
  33|   'install-architecture-match': installArchitectureMatch,
  34|   'install-version-channel': installVersionChannel,
  35|   'install-update-available': installUpdateAvailable,
  36|   'install-native-modules': installNativeModules,
  37|   'permission-screen-capture': screenCapturePermission,
  38|   'permission-accessibility': accessibilityPermission,
  39|   'storage-userdata-location': userDataLocation,
  40|   'storage-disk-space': diskSpace,
```

### E42 — B:src/main/core/application/serviceRegistry.ts:44-52 — DoctorService registered

```
  44| import { CodeCliService } from '@main/services/codeCli'
  45| import { CommandService } from '@main/services/CommandService'
  46| import { ConversationNavigationService } from '@main/services/ConversationNavigationService'
  47| import { DeepSeekHarnessService } from '@main/services/deepSeekHarness'
  48| import { DoctorService } from '@main/services/diagnostics'
  49| import { DirectoryTreeManager, FileManager } from '@main/services/file'
  50| import { HermesDashboardService } from '@main/services/HermesDashboardService'
  51| import { LanTransferService } from '@main/services/lanTransfer'
  52| import { LogRetentionService } from '@main/services/LogRetentionService'
```

### E43 — B:src/renderer/components/settingsMenu.ts:50-70 — settings menu registry incl. /settings/skills

```
  50|   /** Group title key (`settings.menuGroups.*`); omitted for the ungrouped head section */
  51|   groupKey?: string
  52| }
  53| 
  54| /**
  55|  * Single source of truth for the settings sidebar menu.
  56|  * Array order = menu render order = search tie-break order.
  57|  * Adding a settings section requires registering it here, which also makes its
  58|  * title searchable — the settings search baseline is structural, not manual.
  59|  */
  60| export const settingsMenu: readonly SettingsMenuEntry[] = [
  61|   { route: '/settings/provider', titleKey: 'settings.provider.title', icon: createElement(Cloud) },
  62|   { route: '/settings/model', titleKey: 'settings.model', icon: createElement(Package) },
  63|   {
  64|     route: '/settings/local-models',
  65|     titleKey: 'settings.dependencies.localModels.title',
  66|     icon: createElement(FileBox)
  67|   },
  68|   { route: '/settings/api-gateway', titleKey: 'apiGateway.title', icon: createElement(GatewayIcon) },
  69|   {
  70|     route: '/settings/mcp',
```

### E44 — B:src/renderer/pages/settings/SkillsSettings.tsx:1-50 — existing Skills settings page

```
   1| import { useNavigate, useSearch } from '@tanstack/react-router'
   2| import { useState } from 'react'
   3| import { useCallback } from 'react'
   4| import { useTranslation } from 'react-i18next'
   5| 
   6| import { Tabs, TabsContent, TabsList, TabsTrigger } from '@cherrystudio/ui'
   7| import { ResourceCatalogView } from '@renderer/components/resourceCatalog/catalog'
   8| import { SettingsContentBody } from '@renderer/components/SettingsPrimitives'
   9| import type { ResourceItem } from '@renderer/types/resourceCatalog'
  10| 
  11| export function SkillsSettings() {
  12|   const { t } = useTranslation()
  13|   const { id } = useSearch({ from: '/settings/skills' })
  14|   const navigate = useNavigate({ from: '/settings/skills' })
  15|   const [scope, setScope] = useState('all')
  16|   const filterResource = (resource: ResourceItem) =>
  17|     scope === 'all' || (resource.type === 'skill' && resource.raw.scope === scope)
  18|   const handleSelectedSkillIdChange = useCallback(
  19|     (selectedSkillId: string | undefined) => {
  20|       void navigate({ search: (previous) => ({ ...previous, id: selectedSkillId }), replace: true })
  21|     },
  22|     [navigate]
  23|   )
  24| 
  25|   return (
  26|     <SettingsContentBody className="min-h-0 flex-1 overflow-hidden pt-4" innerClassName="flex min-h-0 flex-1 flex-col">
  27|       <Tabs value={scope} onValueChange={setScope} variant="underline" className="min-h-0 flex-1">
  28|         <TabsContent value={scope} className="mt-0 flex min-h-0 flex-1 flex-col">
  29|           <ResourceCatalogView
  30|             resourceType="skill"
  31|             variant="settings"
  32|             title={t('settings.skills.title')}
  33|             className="min-h-0 flex-1"
  34|             selectedSkillId={id}
  35|             onSelectedSkillIdChange={handleSelectedSkillIdChange}
  36|             filterResource={filterResource}
  37|             allowColumnToggle
  38|             toolbarFooter={
  39|               <TabsList className="shrink-0" aria-label={t('settings.skills.title')}>
  40|                 <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
  41|                 <TabsTrigger value="system">{t('settings.skills.tabs.system')}</TabsTrigger>
  42|                 <TabsTrigger value="builtin">{t('settings.skills.tabs.builtin')}</TabsTrigger>
  43|               </TabsList>
  44|             }
  45|           />
  46|         </TabsContent>
  47|       </Tabs>
  48|     </SettingsContentBody>
  49|   )
  50| }
```

### E45 — B:src/shared/data/preference/preferenceSchemas.ts:590-600 — preference schema, skill-adjacent key

```
 590| }
 591| 
 592| /* eslint sort-keys: ["error", "asc", {"caseSensitive": true, "natural": false}] */
 593| export const DefaultPreferences: PreferenceSchemas = {
 594|   default: {
 595|     'agent.commit_attribution.enabled': true,
 596|     'agent.icon_type': 'emoji',
 597|     'agent.input.toolbar.pinned_tools': ['composer:new-session', 'skills', 'permission-mode'],
 598|     'agent.language': null,
 599|     'agent.session.display_mode': 'agent',
 600|     'agent.session.position': 'left',
```

### E46 — B:src/main/ai/mcp/mcpStdioLaunch.ts:1-30 — stdio MCP launch

```
   1| import { application } from '@application'
   2| import type { LoggerService } from '@logger'
   3| import { getShellEnv } from '@main/utils/shellEnv'
   4| import type { McpServer } from '@shared/data/types/mcpServer'
   5| 
   6| import {
   7|   buildStdioEnvironment,
   8|   type LaunchCommand,
   9|   type LaunchResolutionCache,
  10|   resolveLaunchCommand
  11| } from './mcpLaunch'
  12| 
  13| export interface ResolvedStdioLaunch {
  14|   readonly launch: LaunchCommand
  15|   readonly loginShellEnv: Record<string, string>
  16|   readonly serverEnv: Record<string, string>
  17| }
  18| 
  19| /** Resolves the exact command inputs shared by dry-runs and real stdio transports. */
  20| export async function resolveStdioLaunch({
  21|   server,
  22|   args,
  23|   logger,
  24|   signal,
  25|   resolutionCache
  26| }: {
  27|   server: McpServer
  28|   args: string[]
  29|   logger: LoggerService
  30|   signal?: AbortSignal
```

### E47 — B:electron-builder.yml:80-84 — asarUnpack resources/**

```
  80|   - "resources/**/*" # include all files in resources, and unpack them from asar for runtime access
  81|   - "!resources/devtools/**" # dev-only extensions are loaded from source in development
  82| asarUnpack:
  83|   - resources/**
  84|   - "!resources/devtools/**"
```

### E48 — B:electron-builder.yml:109-125 — win targets nsis + portable

```
 109|   - from: "packages/provider-registry/data"
 110|     to: "provider-registry"
 111| win:
 112|   executableName: The Boss
 113|   artifactName: ${productName}-${version}-${arch}-setup.${ext}
 114|   extraResources:
 115|     - from: "node_modules/@aiany/sqlite-vec-windows-${arch}/vec0.dll"
 116|       to: "app.asar.unpacked/node_modules/@aiany/sqlite-vec-windows-${arch}/vec0.dll"
 117|   target:
 118|     - target: nsis
 119|     - target: portable
 120|   signtoolOptions:
 121|     sign: scripts/win-sign.js
 122|   verifyUpdateCodeSignature: false
 123| nsis:
 124|   # Preserve the existing global installer identity so either edition replaces the same Windows installation.
 125|   guid: 41a4ccd8-bcc0-5710-9eee-0e164da68057
```

### E49 — B:src/main/main.ts:1-12 — main.ts forbids adding code there

```
   1| /**
   2|  * Electron main-process entry — preboot → bootstrap → running.
   3|  *
   4|  * DO NOT add new code here. If you feel the need to, you almost certainly
   5|  * misunderstand the startup timing or service architecture. New services
   6|  * belong in the lifecycle system (see core/lifecycle/); non-removable
   7|  * preboot steps belong in core/preboot/; removable capabilities that must
   8|  * execute at preboot time belong in their nature-home (e.g. services/)
   9|  * and are invoked from here. This file is glue — it should only shrink.
  10|  */
  11| 
  12| // BootConfig must load before any other import (configures userData path)
```

### E50 — P:skills/research/deep-research/scripts/run-research.sh:15-26 — checkpoint mode definition; bash 3.2 note

```
  15| #
  16| # Execution modes (references/stage-contracts.md):
  17| #   RESEARCH_STAGE_RUNNER=<command>   runner mode: <command> <stage> <package_dir> runs each stage
  18| #   (unset)                           checkpoint mode: validate, stop at the first incomplete stage,
  19| #                                     print the stage skill to run plus one JSON line
  20| #                                     {"next_stage":..,"skill":..,"package_dir":..}, exit 3
  21| #
  22| # Exit codes: 0 complete, 1 blocked or invalid usage, 3 awaiting a stage (checkpoint mode).
  23| # Env passthrough: RESEARCH_OUTPUT_DIR (root), RESEARCH_HOOK_LOG (a file the driver appends
  24| # one line per hook firing to; used by the contract test), RESEARCH_AUTO_ESCALATE, etc.
  25| #
  26| # bash 3.2 compatible (constraint C-05): no mapfile, no declare -A, no ${var,,}.
```

### E51 — P:skills/research/deep-research/scripts/run-research.sh:42-46 — $HOME/.prometheus/research default

```
  42| RESUME=""; CHECK_TOOLS=0
  43| OUTPUT_ROOT="${RESEARCH_OUTPUT_DIR:-$HOME/.prometheus/research}"
  44| while [ $# -gt 0 ]; do
  45|   case "$1" in
  46|     --query) shift; QUERY="${1:-}" ;;
```

### E52 — P:skills/research/deep-research/scripts/run-research.sh:68-82 — TAVILY/FIRECRAWL gates; surreal probe; jq required

```
  68|   [ -n "${FIRECRAWL_API_KEY:-}" ] && report search:firecrawl present || report search:firecrawl absent
  69|   if [ -z "${TAVILY_API_KEY:-}${FIRECRAWL_API_KEY:-}" ]; then report search "NONE (stage 02 will be blocked)"; fi
  70|   command -v python3 >/dev/null 2>&1 && report python3 present || { report python3 absent; }
  71|   command -v jq >/dev/null 2>&1 && report jq present || { report jq "absent (required)"; rc=1; }
  72|   GW=""; if [ -f "$REPO_ROOT/shared/scripts/lib/kbd-model-resolve.sh" ]; then . "$REPO_ROOT/shared/scripts/lib/kbd-model-resolve.sh" 2>/dev/null || true; GW="$(kbd_resolve_gateway 2>/dev/null || true)"; fi
  73|   [ -n "$GW" ] && report gateway "$GW" || report gateway "unreachable (judge and semantic stages degrade to blocked)"
  74|   SM="${SURREAL_MEMORY_URL:-http://127.0.0.1:8090}"; if curl -s --max-time 3 --noproxy '*' "$SM/health" >/dev/null 2>&1; then report surreal-memory "$SM"; else report surreal-memory "absent (stages 04 and 07 degrade to on-disk only)"; fi
  75|   [ -n "${RESEARCH_STAGE_RUNNER:-}" ] && report runner "$RESEARCH_STAGE_RUNNER" || report runner "none (checkpoint mode)"
  76|   report output-root "$OUTPUT_ROOT"
  77|   exit "$rc"
  78| fi
  79| 
  80| command -v jq >/dev/null 2>&1 || { log "jq is required"; exit 1; }
  81| 
  82| # ---------------------------------------------------------------- package resolution
```

### E53 — P:skills/research/deep-research/scripts/run-research.sh:97-102 — od /dev/urandom

```
  97|     SLUG="$(printf '%s' "$QUERY" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//' | cut -d- -f1-5)"; PACKAGE_ID="$SLUG-$(date -u +%Y%m%d)-$(od -An -N2 -tx1 /dev/urandom | tr -d ' \n')"; fi
  98|   [ -n "$JOB_ID" ] || JOB_ID="job-$(date +%s)-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
  99|   PKG="$OUTPUT_ROOT/$PACKAGE_ID"
 100|   mkdir -p "$PKG/sources"
 101|   log "Package $PACKAGE_ID at $PKG (job $JOB_ID, depth $DEPTH, scale $SCALE)"
 102| fi
```

### E54 — P:skills/research/deep-research/scripts/run-research.sh:311-316 — ADV_DIR resolution

```
 311| #                                 at a copy whose dispatch-judge.sh is a CLI-faithful stub).
 312| ADV_DIR=""
 313| for _cand in "${RESEARCH_ADV_DIR:-}" "$REPO_ROOT/skills/process/adversarial-review" "${CLAUDE_PLUGIN_ROOT:-}/skills/process/adversarial-review"; do
 314|   [ -n "$_cand" ] && [ -f "$_cand/scripts/build-review-packet.sh" ] && { ADV_DIR="$_cand"; break; }
 315| done
 316| # The producer identity travels with the run so the judge!=producer check is
```

### E55 — P:skills/research/deep-research/scripts/run-research.sh:355-380 — adversarial review invocation and review_blocked

```
 355|     review_blocked "review refused, stage 05 verification missing or invalid"; return 0
 356|   fi
 357|   [ -n "$ADV_DIR" ] || { review_blocked "judge unavailable (adversarial-review skill not installed)"; return 0; }
 358|   command -v python3 >/dev/null 2>&1 || { review_blocked "judge unavailable (python3 is required to build the review packet)"; return 0; }
 359|   mkdir -p "$PKG/review"
 360|   # What the judge sees must be honest at packet time: the frontmatter is set to
 361|   # the PRE-review derivation (a full run derives at most `partial` here, because
 362|   # the review has not run) and the sidecar is the interim one, which says the
 363|   # review is pending. The post-review sync below raises the value if it passes.
 364|   sync_report_status
 365|   bash "$SCRIPT_DIR/write-provenance.sh" "$PKG" --interim >/dev/null 2>"$PKG/review/packet.log" || { review_blocked "judge unavailable (interim sidecar could not be written)"; return 0; }
 366|   set +e
 367|   KBD_PRODUCER_MODEL="$PRODUCER_MODEL" bash "$ADV_DIR/scripts/build-review-packet.sh" --mode artifact --target research --package "$PKG" --out "$PKG/review/packet.json" >/dev/null 2>"$PKG/review/packet.log"; prc=$?
 368|   set -e
 369|   [ "$prc" -eq 0 ] || { review_blocked "judge unavailable (packet build exited $prc: $(tail -1 "$PKG/review/packet.log"))"; return 0; }
 370|   ledger_append "## Verification log" "review packet built (report.md, sidecar, plan.md; producer $PRODUCER_MODEL)"
 371|   set +e
 372|   if [ -n "${RESEARCH_JUDGE_CMD:-}" ]; then
 373|     $RESEARCH_JUDGE_CMD "$PKG/review/packet.json" "$PKG/review/findings.json" >/dev/null 2>"$PKG/review/judge.log"; jrc=$?
 374|   else
 375|     KBD_PRODUCER_MODEL="$PRODUCER_MODEL" bash "$ADV_DIR/scripts/dispatch-judge.sh" --mode artifact --packet "$PKG/review/packet.json" --out "$PKG/review/findings.json" >/dev/null 2>"$PKG/review/judge.log"; jrc=$?
 376|   fi
 377|   set -e
 378|   # dispatch-judge.sh exit codes: 3 no gateway / no usable completion, 2 unusable
 379|   # output, 4 usage or environment. Each is a different blocked reason so the
 380|   # sidecar distinguishes "no judge" from "the judge refused".
```

### E56 — P:skills/research/deep-research/scripts/run-research.sh:412-418 — exit code mapping

```
 412|   trap - EXIT
 413|   [ -f "$CP" ] || exit "$rc"
 414|   # A run that did not reach "complete" or "awaiting_stage" can never exit 0.
 415|   if [ "$rc" -eq 0 ]; then
 416|     st="$(cp_get '.status')"
 417|     case "$st" in complete) ;; awaiting_stage) rc=3 ;; *) rc=1 ;; esac
 418|   fi
```

### E57 — P:skills/research/deep-research/scripts/run-research.sh:515-528 — awaiting_stage exit 3

```
 515|     fi
 516|   elif ! validate_stage "$STAGE" >/dev/null 2>&1; then
 517|     if [ -n "${RESEARCH_STAGE_RUNNER:-}" ]; then
 518|       log "stage $STAGE ($NAME): running $RESEARCH_STAGE_RUNNER"
 519|       set +e; $RESEARCH_STAGE_RUNNER "$STAGE" "$PKG" >&2; rrc=$?; set -e
 520|       [ "$rrc" -eq 0 ] || block "$STAGE" "stage runner exited $rrc"
 521|     else
 522|       cp_set '.status = "awaiting_stage"'
 523|       log "stage $STAGE ($NAME) is next. Run the stage skill against the package, then re-invoke with --resume:"
 524|       log "  /stage-$STAGE-$NAME  (package: $PKG)"
 525|       log "  bash $SCRIPT_DIR/run-research.sh --resume \"$PKG\""
 526|       jq -nc --arg s "$STAGE" --arg n "$NAME" --arg p "$PKG" '{next_stage:$s, skill:("stage-" + $s + "-" + $n), package_dir:$p}'
 527|       exit 3
 528|     fi
```

### E58 — P:skills/research/deep-research/references/stage-contracts.md:88-92 — checkpoint mode definition (prose)

```
  88| 
  89| `status` is `running`, `complete`, `blocked`, or `awaiting_stage`. `blocked`
  90| carries `{stage, reason}` when set. `awaiting_stage` is checkpoint mode: the
  91| driver has validated everything so far and is waiting for the harness to run
  92| `current_stage`.
```

### E59 — P:skills/research/deep-research/references/headless-execution.md:1-24 — the Rust server calls the driver; harness spawn with bypass flags

```
   1| # Headless execution: how the daemon runs a job
   2| 
   3| `prometheus-research start <query>` (REST `POST /api/v1/jobs`, MCP
   4| `research_start`) writes a job checkpoint and re-executes the binary as
   5| `prometheus-research --daemon-job <job_id>`. That process is the **daemon
   6| job**. It does not run stages itself: it spawns a headless coding harness and
   7| asks it to run the stage-contract driver (`scripts/run-research.sh`,
   8| change-rah-003) for the job's query. This document is the contract between the
   9| daemon, the harness, and the driver (change-rah-004; analysis D-01 option C).
  10| 
  11| ## Harness resolution
  12| 
  13| The daemon scans `PATH` in order and takes the first match:
  14| 
  15| | Order | Binary | Invocation |
  16| |---|---|---|
  17| | 1 | `claude` | `claude -p "<prompt>" --permission-mode bypassPermissions` |
  18| | 2 | `codex` | `codex exec --dangerously-bypass-hook-trust --full-auto "<prompt>"` |
  19| 
  20| `--dangerously-bypass-hook-trust` is the Codex flag that lets a headless
  21| `codex exec` run the plugin's non-managed hooks without the interactive trust
  22| prompt (`docs/codex-plugin.md`). `RESEARCH_HARNESS_ARGS` appends extra flags
  23| to either invocation. There is no per-job `harness` field on `research_start`
  24| (spec open question, default no): the daemon's `PATH` decides.
```

### E60 — P:skills/research/deep-research/references/okf-research-format.md:1-12 — report frontmatter is OKF v0.1

```
   1| # OKF Research Format
   2| 
   3| The `.research` package uses **Open Knowledge Format (OKF) v0.1** as its base,
   4| extended with Prometheus research-specific fields.
   5| 
   6| OKF v0.1 base spec is vendored at `shared/references/okf-v0.1.md`.
   7| OKF requires only a non-empty `type` frontmatter key. Unknown fields are
   8| permitted and must not cause rejection (permissive consumption rule).
   9| 
  10| ## Base OKF Fields (required)
  11| 
  12| | Field | Type | Description |
```

### E61 — P:skills/research/deep-research/references/research-package-spec.md:64-92 — manifest format 2.0.0

```
  64| 
  65| Every field is required; nullable fields carry `null` explicitly. The schema is
  66| the authority; this example is a literal, schema-valid copy for readers:
  67| 
  68| ```json
  69| {
  70|   "format": "research-package",
  71|   "format_version": "2.0.0",
  72|   "okf_type": "research-session",
  73|   "package_id": "vector-db-rag-20260905-a1f3",
  74|   "job_id": "job-1788000774-ffa477f9",
  75|   "query": "Current state of vector databases for production RAG systems",
  76|   "depth": "deep",
  77|   "scale": "full",
  78|   "created_at": "2026-09-05T10:00:00Z",
  79|   "completed_at": "2026-09-05T11:02:14Z",
  80|   "stages_completed": ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"],
  81|   "sources_count": 31,
  82|   "claims_count": 87,
  83|   "confidence": 0.74,
  84|   "verification_status": "verified",
  85|   "verification_verdict": "PASS WITH NOTES",
  86|   "feynman_grade": 0.82,
  87|   "feynman_gate_used": true,
  88|   "misconceptions_absent": 1.0,
  89|   "contradictions_detected": 4,
  90|   "contradictions_resolved": 3,
  91|   "contradictions_unresolved": 1,
  92|   "surreal_memory_used": true,
```

### E62 — P:skills/process/adversarial-review/scripts/dispatch-judge.sh:7-16 — exit contract 0/2/3/4

```
   7| #     [--mandate <mandate.md>] [--feedback <rejection.md>] [--out <findings.json>]
   8| #
   9| # Exit codes:
  10| #   0  findings written (isolation_mode=liter-llm)
  11| #   2  judge responded but output failed schema-shape validation
  12| #   3  liter-llm unavailable — caller must fall back to a harness-native
  13| #      fresh-context subagent (mandate + packet ONLY) and record
  14| #      isolation_mode=harness-native
  15| #   4  no judge possible — caller records a cumulative pending_review receipt
  16| #
```

### E63 — P:skills/process/adversarial-review/scripts/dispatch-judge.sh:69-92 — gateway probe, :8181 first, exit 3 fallback instruction

```
  69| fi
  70| 
  71| probe_endpoint() {
  72|   # --noproxy '*': an ambient HTTP(S)_PROXY must never intercept loopback.
  73|   curl -s -o /dev/null --max-time 5 --noproxy '*' "$1/models" 2>/dev/null
  74| }
  75| 
  76| JUDGE_BASE_URL="${LITER_LLM_BASE_URL:-}"
  77| if [ -z "$JUDGE_BASE_URL" ] && command -v kbd_resolve_gateway >/dev/null 2>&1; then
  78|   JUDGE_BASE_URL="$(kbd_resolve_gateway 2>/dev/null || true)"
  79| fi
  80| if [ -z "$JUDGE_BASE_URL" ]; then
  81|   for cand in "http://localhost:8181/v1" "http://localhost:4000/v1"; do
  82|     if probe_endpoint "$cand"; then JUDGE_BASE_URL="$cand"; break; fi
  83|   done
  84| fi
  85| 
  86| if [ -z "$JUDGE_BASE_URL" ]; then
  87|   echo "[judge] WARN: no OpenAI-compatible endpoint reachable (set" >&2
  88|   echo "[judge]       LITER_LLM_BASE_URL, or start one) — fall back to a" >&2
  89|   echo "[judge]       harness-native fresh-context subagent (prompt = mandate +" >&2
  90|   echo "[judge]       packet, nothing else) and record isolation_mode=harness-native" >&2
  91|   exit 3
  92| fi
```

### E64 — P:skills/process/adversarial-review/scripts/dispatch-judge.sh:213-232 — timeouts/retries and POST /chat/completions

```
 213| # Only timeout-shaped failures escalate. A 401 is not slow, it is wrong, and
 214| # retrying it just delays an actionable error.
 215| _timeout="${ADV_JUDGE_TIMEOUT:-300}"
 216| _max_attempts="${ADV_JUDGE_RETRIES:-3}"
 217| _attempt=1
 218| 
 219| while : ; do
 220|   _resp_file="$_judge_tmp/response.${_attempt}.json"
 221|   HTTP_CODE="$(curl -s --max-time "$_timeout" \
 222|     -o "$_resp_file" -w '%{http_code}' \
 223|     --noproxy '*' \
 224|     "$JUDGE_BASE_URL/chat/completions" \
 225|     -H 'content-type: application/json' -H "$AUTH_HEADER" \
 226|     --data-binary "@$REQ_BODY_FILE" 2>/dev/null)" || HTTP_CODE="000"
 227| 
 228|   # 000 = curl gave up locally. 502/503/504 with a Network/timeout body = the
 229|   # gateway gave up on the upstream. Treat both as "needs more time".
 230|   _retryable=0
 231|   if [ "$HTTP_CODE" = "000" ]; then
 232|     _retryable=1
```

### E65 — P:skills/process/adversarial-review/scripts/dispatch-judge.sh:346-354 — cross_model_check computation

```
 346| endpoint = os.environ.get("JUDGE_BASE_URL", "")
 347| 
 348| if producer == "unknown":
 349|     cross = "unverified-producer-unknown"
 350| elif judge.rsplit("/", 1)[-1] == producer.rsplit("/", 1)[-1]:
 351|     cross = "same-model-collision"
 352| else:
 353|     cross = "verified-distinct"
 354| 
```

### E66 — P:skills/process/adversarial-review/SKILL.md:276-289 — harness-native fallback is a caller contract

```
 276|    checked that the *binary* existed, the failure surfaced as "liter-llm
 277|    unavailable" rather than as the CLI-contract mismatch it was. Speak REST.
 278| 2. **Harness-native fresh-context subagent** — when no gateway is reachable
 279|    (`dispatch-judge.sh` exit 3), the calling session dispatches a subagent
 280|    (Agent tool / equivalent) whose prompt is exactly: the mode's mandate file
 281|    + the packet JSON. Nothing else. Findings are logged with
 282|    `"isolation_mode": "harness-native"` — a weaker guarantee (same model
 283|    family), stated, not hidden.
 284| 3. **Pending review** (exit 4) — no judge available at all. Write a local
 285|    `pending_review` receipt for the cumulative Git diff. Development may
 286|    continue; final local certification requires a completed independent review
 287|    receipt or an SSH-signed waiver.
 288| 
 289| ## Output contract
```

### E67 — P:skills/process/adversarial-review/assets/schemas/findings.schema.json:30-42 — isolation_mode pattern

```
  30|         "BLOCK"
  31|       ],
  32|       "description": "BLOCK iff at least one CRITICAL finding exists"
  33|     },
  34|     "judge_model": {
  35|       "type": "string",
  36|       "description": "Resolved model that produced this review (provider/model-id or class name)"
  37|     },
  38|     "isolation_mode": {
  39|       "type": "string",
  40|       "pattern": "^(rest-gateway(:.*)?|harness-native)$",
  41|       "description": "What actually served the review. 'rest-gateway:<url>' = fresh-context cross-model call to that OpenAI-compatible endpoint; 'harness-native' = fresh-context subagent fallback (weaker guarantee). Was previously the fixed literal 'liter-llm' regardless of endpoint, which made a same-family self-grade indistinguishable from a real cross-model review."
  42|     },
```

### E68 — P:skills/process/adversarial-review/scripts/decision-log.sh:20-25 — decision log is OKF v0.1

```
  20| # Writing decisions alone reproduces the competitor behaviour; the outcome loop
  21| # is the differentiator.
  22| #
  23| # Entries are OKF v0.1: a non-empty `type` is the only hard requirement, so
  24| # `type: Decision` is purely additive to the existing wiki.
  25| #
```

### E69 — P:shared/scripts/lib/sycophancy.sh:46-84 — named-pipe sycophancy client

```
  46|   [ -n "$escaped" ] || return 1
  47| 
  48|   local fifo; fifo="$(mktemp -u /tmp/sycophancy_lib_XXXXX)"
  49|   mkfifo "$fifo" || return 1
  50|   # shellcheck disable=SC2064
  51|   trap "rm -f '$fifo'" RETURN
  52| 
  53|   local skill_toml="" root="${CLAUDE_PLUGIN_ROOT:-}"
  54|   if [ -n "$root" ] && [ -f "${root}/skills/imported/sycophancy-correction/skill.toml" ]; then
  55|     skill_toml="${root}/skills/imported/sycophancy-correction/skill.toml"
  56|   fi
  57| 
  58|   (
  59|     printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"sycophancy-lib","version":"0.1.0"}}}\n'
  60|     sleep 0.2
  61|     printf '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n'
  62|     sleep 0.1
  63|     printf '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"detect_sycophancy","arguments":{"content":%s,"target":"completion","strictness":"%s"}}}\n' \
  64|       "$escaped" "$strictness"
  65|     sleep 3
  66|   ) > "$fifo" &
  67| 
  68|   local response=""
  69|   if command -v timeout >/dev/null 2>&1; then
  70|     if [ -n "$skill_toml" ]; then
  71|       response="$(timeout 30 "$bin" --config "$skill_toml" < "$fifo" 2>/dev/null)" || true
  72|     else
  73|       response="$(timeout 30 "$bin" < "$fifo" 2>/dev/null)" || true
  74|     fi
  75|   else
  76|     if [ -n "$skill_toml" ]; then
  77|       response="$("$bin" --config "$skill_toml" < "$fifo" 2>/dev/null)" || true
  78|     else
  79|       response="$("$bin" < "$fifo" 2>/dev/null)" || true
  80|     fi
  81|   fi
  82|   printf '%s' "$response"
  83| }
  84| 
```

### E70 — P:shared/scripts/lib/kbd-model-resolve.sh:18-36 — model resolution precedence

```
  18| # whose [endpoint]/[aliases] shape liter-llm cannot load. That mismatch is why the
  19| # judge silently fell back to passing the literal string "frontier" as a model id.
  20| # Keep precedence in ONE place so a config change never requires a script edit —
  21| # and never an edit inside a plugin cache, which the next install destroys.
  22| #
  23| # Resolution order per role (AWS-CLI convention, highest wins):
  24| #   1. explicit argument passed by the caller
  25| #   2. PROMETHEUS_KBD_<ROLE>_MODEL
  26| #   3. ~/.prometheus/kbd/models.toml   [roles]
  27| #   4. .kbd-orchestrator/project.json  model_policy  (repo-local, lower precedence)
  28| #   5. built-in default
  29| #
  30| # bash 3.2 compatible: no mapfile, no declare -A, no ${var^^}. macOS /bin/bash is
  31| # 3.2 and launchd invokes it directly, where those constructs fail with exit 127.
  32| 
  33| _KBD_MODELS_TOML="${PROMETHEUS_KBD_MODELS_CONFIG:-${HOME}/.prometheus/kbd/models.toml}"
  34| _KBD_LITER_CONFIG="${LITER_LLM_CONFIG:-${HOME}/.config/liter-llm/liter-llm-proxy.toml}"
  35| 
  36| # Built-in defaults — used only when nothing else resolves. These are model NAMES
```

### E71 — P:shared/scripts/lib/kbd-model-resolve.sh:84-96 — gateway candidates default 8181 then 4000

```
  84| # kbd_resolve_gateway — first candidate answering GET /v1/models wins.
  85| # LITER_LLM_BASE_URL short-circuits the probe entirely.
  86| kbd_resolve_gateway() {
  87|     if [ -n "${LITER_LLM_BASE_URL:-}" ]; then
  88|         printf '%s\n' "$LITER_LLM_BASE_URL"
  89|         return 0
  90|     fi
  91| 
  92|     _cands="$(kbd_toml_get "$_KBD_MODELS_TOML" "gateway" "candidates" 2>/dev/null)"
  93|     if [ -z "$_cands" ]; then
  94|         _cands="http://localhost:8181/v1 http://localhost:4000/v1"
  95|     else
  96|         # "[a, b]" -> "a b"
```
