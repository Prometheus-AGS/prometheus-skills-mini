# Harness source-bound declaration — backend 1 / Spec 1.1

Delivered `acceptance/harness-inputs.json`, schemaVersion 1. Runtime seal remains pending.

Bossfang HEAD: 1d518936cb15b79d30bdd315510ff925613a0f4d. UAR HEAD: 84ca0ffff5da8fafc1e2e7f5585efc07a396b14e. Boss HEAD: 7a5bdb4b7c02e9f13875fc7f837815c03fe3dacd. Finite source and complete five-file gate import digests, literal Plan commands/digests, host profiles, source receipts, retained bundled sidecar and runtime identities are recorded. No repository-wide source or cleanliness claim.

API `librefang-api/bauar_harness_host` and kernel `librefang-kernel/bauar_harness_delegation` binaries are missing: candidate target directory absent. Their executable/hash fields are null. Exact planned `cargo test --locked ... --no-run --message-format=json` commands and future receipt paths are declared. Runtime sealing must consume exactly one compiler-artifact executable for the exact package manifest/test target/source/features receipt, canonicalize it and hash bytes; filename guessing is forbidden. Compilation remains prohibited until all five production tasks complete.

Measured Node child v24.11.1 and coordinator v22.20.0. Bossfang cwd selects cargo 1.95.0 (f2d3ce0bd 2026-03-21) / rustc 1.95.0 (59807616e 2026-04-14); UAR cwd selects cargo 1.99.0-nightly (59800466c 2026-07-07) / rustc 1.99.0-nightly (b6839f4d0 2026-07-17). Absolute Cargo launcher alone does not pin a compiler: the manifest hashes launcher plus actual rustup-resolved tool binaries and binds cwd/toolchain. The Plan nightly version belongs to UAR, not Bossfang. No toolchain was changed.

Retained bundled `uar-sidecar` 1.0.0, server-full per prior local-delivery receipt, SHA256 9f91874091f8241d97209fd21b8c0c5b79ae6cdeb82ee0e873a5ea4540a8adea; its payload manifest source equals current UAR HEAD. This is static prior-package identity, not current packaged runtime acceptance. Seal against the actual post-production package is pending. Supporting server-full,test-probes targets remain separately declared, require nonzero tests, and cannot replace bundle evidence.

Private target/store/child HOME/CODEX_HOME/XDG/TMP roots and exact argv are declared. Actual per-attempt/inner mkdtemp roots and cleanup outcomes require execution receipts. Existing inner privateEnv behavior is described truthfully; it is not silently claimed to inherit outer CODEX_HOME. No security hardening or product code added.

Only tool `--version`, finite artifact/source reads and SHA256 measurements ran. No builds, tests, launches, executable test authoring, review, commits, state/hooks or backend checkbox changes. F6 excluded files were not accessed. Production declaration completion is independent of runtime PASS.

Manifest SHA256: 5e70a9665828e8a5e59c77dd7cbd04a78141ce1d8d4c4708152fea779290c2ba
