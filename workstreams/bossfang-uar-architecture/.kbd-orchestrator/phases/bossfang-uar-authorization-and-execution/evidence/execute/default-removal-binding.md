# UAR default MCP configuration removal binding

Status: implementation packet only, 2026-10-06. The driver relayed the user's explicit instruction to remove all defaults because the application supplies them. This ordinary configuration task is independent of harness/identity production. Apply only when the driver begins amended parent `bauar-04-resource-credential-lifecycle` backend task 7 and records its scheduling amendment.

## Exact scope

Only proposed write: `/Users/gqadonis/.claude/worktrees/bauar-uar/mcp.json`.

The inspected JSON contains exactly one top-level field, `mcpServers`, with three default entries: `tavily`, `surreal_memory`, and `kreuzberg`. Empty that map. Preserve the existing top-level JSON structure, any other fields present at apply time and formatting convention. The inspected file has 21 lines and no terminal newline; retain that EOF convention. No other configuration, source, dependency, runtime or service file is in scope.

Expected resulting contents for the inspected file:

```json
{
  "mcpServers": {}
}
```

Exact proposed diff against the inspected contents:

```diff
--- a/mcp.json
+++ b/mcp.json
@@ -1,21 +1,3 @@
 {
-  "mcpServers": {
-    "tavily": {
-      "url": "https://mcp.tavily.com/mcp/?tavilyApiKey=${TAVILY_API_KEY}",
-      "env": {
-        "TAVILY_API_KEY": "${TAVILY_API_KEY}"
-      }
-    },
-    "surreal_memory": {
-      "url": "${UAR_MEMORY_MCP_URL:-http://127.0.0.1:1906/mcp/memory}"
-    },
-    "kreuzberg": {
-      "command": "kreuzberg",
-      "args": [
-        "mcp",
-        "--transport",
-        "stdio"
-      ]
-    }
-  }
+  "mcpServers": {}
 }
\ No newline at end of file
```

The environment-variable expressions above are existing literal references, not secret values. No credential was resolved or read.

## Behavioral boundary

The repository default map becomes empty, so a consumer loading this exact file no longer receives these three presets from it. This intentionally includes the local-memory URL and stdio preset as well as the remote search preset: the user requested all defaults. This packet makes no claim about loader precedence or fallback behavior because no other file was inspected.

Application-owned and developer-owned configuration is outside the write scope and remains untouched. Do not delete application connections, rewrite user config, unset environment variables, revoke credentials, stop services, or remove installed tools. The original UAR checkout is also untouched; the sole target is the named isolated worktree file.

## Apply and verification boundary

Before the authorized edit, re-read this same file and preserve any unrelated fields or concurrent changes. Set only `mcpServers` to an empty object. Verify with Node 24 JSON parsing that the map has zero own entries and any other top-level fields match the pre-edit values; inspect a diff limited to this file. This is a configuration-shape check, not a runtime or security diagnostic. No Rust build, dependency update, service call or session-isolation/security diagnostic is needed or authorized by this packet.

## Evidence

Performed only a read of the exact target file and authored this note. No configuration edit, product Rust edit, test, build, service action or security diagnostic was performed. The driver owns parent scheduling/task state and the later edit authorization.
