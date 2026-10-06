# Operator-owned version authority

`versions.toml` is authored by the repository operator. Agents read it and preserve it; a proposed dependency or service upgrade does not authorize changing its pins. The current file contains `[node]`, `[submodules]` and `[images]`. It does not currently contain the optional `[npm]` section described by the parser. The isolated site package and lockfile pin Docusaurus 3.10.2; adding that section to the protected authority remains an operator decision.

`rules/lib/versions-toml.mjs` implements a bounded TOML subset: tables, strings, inline tables and comments. Richer unsupported syntax is an explicit parse error. Its comparison checks the Node minimum against root `package.json`, declared tool gitlinks against Git, and image entries for an immutable digest or a declared build-context submodule. Inspect the authority and actual source before advancing a gitlink; documentation examples are not selected pins.

The root package pins OpenSpec as a development dependency. Optional surreal-memory and liter-llm images are built from their selected submodules. SurrealDB is selected by the operator's image and digest. These components have independent versions; a pack version does not make them one release.

Complete all phase production before local checks or real integration gates. Existing parser unit tests describe legacy comparisons but are not acceptance evidence. A matching source pin, built image, healthy service and installed invocation are separate proof states. Follow [service operations](service-operations.md) and the repository's local-only, integration-only policy.
