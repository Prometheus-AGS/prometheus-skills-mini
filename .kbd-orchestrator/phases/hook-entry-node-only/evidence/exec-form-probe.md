# Exec-form probe — change 1, tasks 1.1 / 1.2

**Question (the phase's one blocking unknown):** does this harness accept exec form
(`{"type":"command","command":"node","args":[...]}`) in a project hook configuration, or only a
shell-string `command`? If only a shell string, `sh -c`/PowerShell re-enters the hook path, C1 and C3
are violated, and change 1 must be re-planned.

**Answer: exec form fires. Verified empirically, not from documentation.**

## Method

1. Wrote `scripts/_probe-hook.mjs`, which records its argv to a file and prints `PROBE_FIRED`.
2. Registered it in `.claude/settings.local.json` as a `PreToolUse` hook in **exec form** —
   `"command": "node"` with a separate 4-element `args` array — matcher `Bash`, timeout 5.
3. Triggered a Bash tool call. `fired.json` appeared.
4. **Deleted `fired.json` and triggered a second Bash call.** The harness recreated it.

Step 4 is what makes this evidence rather than coincidence: a leftover file from the direct spawn in
step 1 cannot explain a file that reappears after deletion.

## Observed

| | Value |
|---|---|
| Recreated after deletion | `2026-09-21T12:18:21.822Z` |
| My earlier direct spawn | `2026-09-21T12:17:14.764Z` (41 s before) |
| argv received | `["--hook","probe-exec-form","--harness","claude-code"]` |
| Token count | 4 discrete tokens, exactly as registered |
| Interpreter | `/Users/gqadonis/.local/share/fnm/node-versions/v26.5.0/installation/bin/node` |

The argv arriving as **four discrete tokens** — not one re-tokenised string — is the second
confirmation: a shell-string path would have concatenated and re-split them.

## Consequence

The design stands as specified. The static import map, `hooks.json` in exec form, and the
`--hook`-keyed dispatch all proceed. **No shell-string fallback is needed and none is adopted.**

## Caveat, stated rather than glossed

This is confirmed for **this harness (Claude Code) on macOS**. The manifest ships for Windows too, and
the phase's exit-evidence rule requires observation on `windows-latest`. The probe proves the schema is
accepted and shell-free here; the Windows leg is covered by the CI evidence task (6.1), not by this
probe. The other harnesses in `README.md` §9 remain unverified for hooks — they are configured here for
skills, commands and rules only, and none has a hooks directory.

Documentation corroborates the result (Claude Code hooks reference: when `args` is present the command
is spawned directly with no shell), but the verdict above rests on the observation, because the task
called for a probe and a doc claim is not an observation.
