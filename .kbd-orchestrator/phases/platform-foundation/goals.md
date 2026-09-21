# Goals

- lib/platform/ — paths (os.homedir/os.tmpdir/path.join), atomic write (temp in same dir + rename, bounded EPERM/EBUSY retry), lock (fs.open wx), spawn with shell:false — npm CLIs are resolved to their JavaScript entry and run with process.execPath; a tool that exists only as .cmd is refused with a clear error
- node:test harness — Arrange-Act-Assert, tests written first; package.json with engines.node >= 22 and test/check scripts
- Three-OS CI matrix — windows-latest, ubuntu-latest, macos-latest — running node --test, node rules/build.mjs --check, openspec validate
- .gitattributes — text=auto eol=lf; parsers tolerate CRLF on input
- Exit evidence: every Windows behaviour claimed in this phase is observed on windows-latest CI, not self-reported from macOS (A-6)

## Revisions

- 2026-09-21 — spawn goal revised, accepted by the owner. The original text ("spawn with shell:false and Windows .cmd shim resolution") was infeasible: Node documents that .bat/.cmd files cannot be launched without a shell. See analysis.md and decision-log.md.
