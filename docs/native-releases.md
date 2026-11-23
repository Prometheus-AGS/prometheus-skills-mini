# Mini native releases

From a durable Mini source checkout, run `npm run install:native` after `npm ci`. The default tools are `prometheus` (KBD) and `pk` (knowledge). The default destination is `.prometheus/native/bin` inside that checkout. Put the printed directory on the PATH of the harness or application that invokes Mini. An application can supply its own private directory.

```text
node scripts/install-native.mjs pk --bin-dir <directory>
node scripts/install-native.mjs liter-llm surreal-memory-server --bin-dir <directory>
node scripts/install-native.mjs --source-only pk
```

The installer selects the exact Mini package version and native Rust target. It uses the tag's `SHA256SUMS` to compare each tool's repository, revision, Cargo package, workspace and build features with the local pins before downloading the binary. When one tool has advanced under the same Mini version, only that tool builds from pinned source. Downloads must match the corresponding published SHA-256. Mini 1.20.0's original checksum file predates source records, so its known digest identifies the source records from the immutable tag. A damaged download, missing digest, TLS error or HTTP permission error aborts installation. An absent asset (404/410), unsupported host or explicit `--source-only` uses a clean, locked build of the declared source. A specific HTTPS release mirror can be selected with `MINI_NATIVE_RELEASE_BASE_URL` pointing at the directory containing the version tags. Loopback HTTP is also supported for local mirrors.

Executable ownership receipts sit beside the binaries. Installation refuses an existing binary whose receipt is absent or whose bytes have changed. Use a dedicated destination to preserve another installation. Replacing a running executable on Windows may require closing its owner first.

| Binary | Pinned source and role |
| --- | --- |
| `prometheus` | Full pack revision in `lib/native-release/catalog.mjs`, including its shared KBD runtime |
| `pk` | `versions.toml` knowledge gitlink, `pk-cli` package |
| `liter-llm` | `versions.toml` gateway gitlink, `liter-llm-cli` package |
| `surreal-memory-server` | `versions.toml` memory gitlink, server-only with palace and local CPU embeddings |

The Windows ARM64 memory-server asset is a `.tar.gz` containing the server executable, Microsoft ONNX Runtime 1.20.0 ARM64 DLLs and redistribution notices. The installer verifies the release archive and the exact upstream companion bytes, then places them beside the executable. A conflicting existing DLL requires a separate destination. Source builds use the same pinned Microsoft NuGet package and import library. Windows x64 memory-server builds retain static ONNX Runtime; both Windows builds select the dynamic MSVC runtime for C++ objects.

The six release targets use Intel and Apple Silicon on macOS, x86_64 and ARM64 on Ubuntu 24.04/glibc, and x86_64 and ARM64 MSVC on Windows. Linux binaries use the runner's glibc/system libraries. Musl hosts select the source path. Local builds require Git, Cargo, the native C/C++ toolchain and system build dependencies for the selected tool. Linux packages used by the release are listed in the workflow. Some services require separate data, configuration, models and runtime libraries.

Skills, generated slash commands and local Claude/Codex plugins are copied or registered through their existing Node/harness entry points. These do not compile native tools. The service manager uses Docker/Compose and prebuilt images; its maintainer overlay wraps the released Linux binaries. Downloading service executables does not register or start them. SurrealDB is supplied as the operator-pinned container image. External optional tools such as sycophancy, template-forge and Prometheus Companion have separate owners and no source pin or binary installation step in Mini.

A push to main that changes `package.json`'s version starts native release production. A matching `vX.Y.Z` tag push or manual dispatch from main can produce the initial release. Every build uses the captured main commit. Publication waits for all 24 executables, derives their checksum file and creates a missing version tag at that commit before uploading a draft and publishing it. Existing tags must point at the same commit. Published assets are immutable. Independent tools build on separate native runners; each runner limits Cargo parallelism. The release workflow contains no test or validation job.

## Service installation

Use the service planner from a durable checkout. It can manage LiterLLM, Surreal Memory, and its SurrealDB dependency separately. Mini starts with no optional services enabled. In an interactive terminal, `npm run install:native` also prompts for the provider for each service. Use `--non-interactive` in scripts.

```sh
npm run services -- plan --service liter-llm=auto --service surreal-memory=reuse --service surrealdb=reuse
npm run services -- apply --service liter-llm=docker --service surreal-memory=reuse --service surrealdb=reuse
npm run services -- status --json
```

A file-based gateway configuration with the required models belongs at the path selected by the installer. For a native LiterLLM service, use `LITER_LLM_CONFIG` or `~/.config/liter-llm/liter-llm-proxy.toml`. Store provider keys outside version control. For native memory, configure the selected database namespace, database name, embedding model, and its provisioned user with `SURREAL_NAMESPACE`, `SURREAL_DATABASE`, `LOCAL_EMBEDDING_MODEL`, `MEMORY_USERNAME`, and `MEMORY_PASSWORD`. The native database provider uses a locally installed SurrealDB 4.0.1, optionally located through `SURREAL_BIN`, and requires `SURREAL_ROOT_USERNAME` and `SURREAL_ROOT_PASSWORD` for its private data directory. macOS uses per-user launch agents and Linux uses systemd user services. Windows can use Linux containers in Docker Desktop or reuse an existing endpoint.

Mini's memory client is built from the upstream v1.11.0 source and uses the SurrealDB 4.0.0 Rust SDK with the 4.0.1 server. The v1.20.0 Mini release contains the earlier 3.3.0 client. Install the matching pack release or allow the installer to build the current source pin. Native 4.x data lives in `~/.prometheus/service-providers/mini-native/surrealdb/data-v4`. When an older native datastore exists, restore the v4 data first or set `SURREAL_START_FRESH_V4=1` to request a separate empty store. The installer keeps the old data directory. For existing 3.x installations, restore a verified export into a separate 4.0.1 database and check representative memory records before changing the endpoint. [SurrealDB upgrade procedure](https://surrealdb.com/docs/operate/upgrading/3x-to-4x).

`auto` reuses a verified compatible instance first and otherwise selects the supported native provider. Use `--service ID=off` to disable an optional service, `--endpoint ID=URL` for an existing instance, and `--port ID=PORT` to resolve a conflict explicitly. Provider choice follows the CLI flag, per-service environment variable (for example `PROMETHEUS_SERVICE_LITER_LLM_MODE`), saved choice, and global `PROMETHEUS_SERVICE_MODE`, in that order. You can also pass service assignments to `npm run install:native -- --service liter-llm=docker`; `--dry-run` displays the proposed service and native tool installation.

Each pack release identifies the exact GHCR image digests for Linux AMD64 and ARM64 in its `service-images.json` asset. Docker on Mac and Windows selects the matching Linux architecture. The installer verifies the selected image against Mini's source pins. A port conflict reports the listener and leaves it intact. Stop and uninstall operate on Mini's own resources and preserve data volumes. The Boss keeps its own Compose project, private configuration, and lifecycle commands.
