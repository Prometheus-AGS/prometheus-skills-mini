# Round 2 resolution

1. **Caller-selected admission receiver — fixed.** `create_run` now accepts `tool_admission` only when the request carries UAR's `HostAuthenticated` marker. That marker is installed solely by `SidecarGuard` after exact authority, absent-Origin and constant-time per-launch bearer-token checks; the guard removes the token before inner routing. Ordinary JWT/API callers can still create standalone runs, but cannot install the paired HTTP admission adapter or choose its loopback receiver.
2. **Workspace spelling mismatch — fixed.** Boss now resolves the workspace once with `realpathSync.native`, passes that same value to the bridge binding and sends it as `working_directory` in the UAR create-run request. UAR and Boss therefore freeze the same workspace identity.
