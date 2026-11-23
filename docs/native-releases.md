# Mini native releases

From a durable Mini source checkout, run `npm run install:native` after `npm ci`. The default tools are `prometheus` (KBD) and `pk` (knowledge). The default destination is `.prometheus/native/bin` inside that checkout. Put the printed directory on the PATH of the harness or application that invokes Mini. An application can supply its own private directory.

```text
node scripts/install-native.mjs pk --bin-dir <directory>
node scripts/install-native.mjs liter-llm surreal-memory-server --bin-dir <directory>
node scripts/install-native.mjs --source-only pk
```

The installer selects the exact Mini package version and native Rust target. It downloads from that tag's GitHub Release and compares SHA-256 to the matching entry in `SHA256SUMS`. A damaged download, missing digest, TLS error or HTTP permission error aborts installation. An absent asset (404/410), unsupported host or explicit `--source-only` uses a clean, locked build of the declared source. A specific HTTPS release mirror can be selected with `MINI_NATIVE_RELEASE_BASE_URL` pointing at the directory containing the version tags. Loopback HTTP is also supported for local mirrors.

Executable ownership receipts sit beside the binaries. Installation refuses an existing binary whose receipt is absent or whose bytes have changed. Use a dedicated destination to preserve another installation. Replacing a running executable on Windows may require closing its owner first.

| Binary | Pinned source and role |
| --- | --- |
| `prometheus` | Full pack revision in `lib/native-release/catalog.mjs`, including its shared KBD runtime |
| `pk` | `versions.toml` knowledge gitlink, `pk-cli` package |
| `liter-llm` | `versions.toml` gateway gitlink, `liter-llm-cli` package |
| `surreal-memory-server` | `versions.toml` memory gitlink, server-only with palace and local CPU embeddings |

The six release targets use Intel and Apple Silicon on macOS, x86_64 and ARM64 on Ubuntu 24.04/glibc, and x86_64 and ARM64 MSVC on Windows. Linux binaries use the runner's glibc/system libraries. Musl hosts select the source path. Local builds require Git, Cargo, the native C/C++ toolchain and system build dependencies for the selected tool. Linux packages used by the release are listed in the workflow. Some services require separate data, configuration, models and runtime libraries.

Skills, generated slash commands and local Claude/Codex plugins are copied or registered through their existing Node/harness entry points. These do not compile native tools. The service manager uses Docker/Compose and prebuilt images; its maintainer overlay builds Linux images. Downloading service executables does not register or start them. SurrealDB is supplied as the operator-pinned container image. External optional tools such as sycophancy, template-forge and Prometheus Companion have separate owners and no source pin or binary installation step in Mini.

A push to main that changes `package.json`'s version starts native release production. A matching `vX.Y.Z` tag push or manual dispatch from main can produce the initial release. Every build uses the captured main commit. Publication waits for all 24 executables, derives their checksum file and creates a missing version tag at that commit before uploading a draft and publishing it. Existing tags must point at the same commit. Published assets are immutable. Independent tools build on separate native runners; each runner limits Cargo parallelism. The release workflow contains no test or validation job.
