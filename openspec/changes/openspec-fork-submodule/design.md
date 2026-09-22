# Design — openspec-fork-submodule

## Why not the npm git-dependency form

`github:Prometheus-AGS/OpenSpec#d39ca5a` would run the fork's `prepare` and install a real directory. It also needs network `git` on every `npm ci`, hides the pin inside `package-lock.json`, and gives the doctor nothing to inspect. The operator asked for a submodule; the submodule *is* the pin. The git-dependency form is the documented fallback if the build-on-install step proves fragile on `windows-latest`.

## Finding npm without a shell

npm ships inside the Node installation. On POSIX the entry is `<dirname(process.execPath)>/../lib/node_modules/npm/bin/npm-cli.js`; on Windows it is `<dirname(process.execPath)>/node_modules/npm/bin/npm-cli.js`. `lib/platform/npm.mjs` tries both, in that order for the current platform, and refuses anything ending in `.cmd`. `NPM_CLI_JS` overrides for unusual installations (nvm, volta, fnm) and is what the test injects.

## `--ignore-scripts`, then build

`npm ci --ignore-scripts` installs the fork's dependencies without running *their* lifecycle scripts (A-3: a pinned commit of the fork is trusted; its transitive dependencies' install scripts are not what we audited). `node build.js` is the fork's own build, run explicitly. The fork's `prepare` is therefore never relied on.

## Resolver precedence

`resolveNodeCli(packageName, binName)`: (1) `tools/<mapped dir>/bin/<binName>.js` if the mapped directory exists — built → return; unbuilt → throw naming the installer; (2) otherwise the existing `require.resolve` path. The map has one entry today; adding one is a one-line change and a test.
