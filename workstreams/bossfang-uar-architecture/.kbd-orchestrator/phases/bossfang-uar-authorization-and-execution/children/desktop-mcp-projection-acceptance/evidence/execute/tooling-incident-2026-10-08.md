# Tooling incident during repair intake

On 2026-10-08, two Node 22 ESM-from-stdin commands stalled before their initial output. Both owned sessions were interrupted and returned exit 130. Neither produced its intended receipt. The review dispatcher subsequently ran from a saved `.mjs` file; lifecycle coordination used Node 22 `-e`. No product build or test failed in this incident.

A diagnostic using the macOS process `comm` column unexpectedly returned credential-bearing process titles from unrelated processes. Values are deliberately omitted here and were not copied into review packets. The user was informed in commentary and advised to rotate exposed credentials. No credentials were used, tested, or transmitted to another destination, and no unrelated process was modified. Future diagnostics must avoid process title/argument output.

The first completed phase-activation attempt used the short child ID and was rejected with “phase ... was not found.” The later request uses the existing full canonical child ID and a distinct command ID; its result is recorded separately. A rejected command is not a phase transition.
