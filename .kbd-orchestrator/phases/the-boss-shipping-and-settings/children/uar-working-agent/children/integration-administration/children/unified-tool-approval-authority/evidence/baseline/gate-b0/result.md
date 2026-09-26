# Gate B0 result

The selected production pair built successfully once:

- The Boss `749278ad2e2e9d1cc2295ef109eb12c0db492984`
- Universal Agent Runtime `a50b9ce419fd8a66778b5ed5de5a62779451ec70`

The single Gate B0 run stopped before the catalog-to-conversation-to-UAR-to-MCP flow began. The Boss tried to launch the selected UAR binary, and the sidecar exited before readiness with `Address already in use (os error 48)`. This is the first decisive failure for the baseline boundary. The phase retains it without starting a retry loop or attributing later runtime behavior that was not reached.

The copied Playwright evidence directory contains the failure screenshots, trace, and error context produced by that run.
