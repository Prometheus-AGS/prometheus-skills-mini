# Value-led scenario workflow (mini #69)

Compact Node-only counterpart of the full pack's value-scenario workflow
([full #196](https://github.com/Prometheus-AGS/prometheus-skill-system/issues/196)),
under the policy of #68. Three small instruction-only procedures turn a broad
intent into a finite set of useful scenarios and an honest, scoped verdict. They
reuse the adopted contract (#60) and phase closure (#59/#66) and add no runner,
ledger, schema field, daemon or phase system. Method background: the
independently published VLBV paper cited in `value-scenario-discovery`.

| Invoke | Does | Never does |
|---|---|---|
| `/value-scenario-discovery <phase-or-contract>` | Proposes a finite, owner-calibrated frontier | Adopts scope, authors tests, runs anything |
| `/bdd-cucumber-js author-only <contract> <IDs>` | Writes features, real assertions, steps, config and an assertion map for adopted IDs | Executes, imports support code, installs, dry-runs, edits protected scenarios |
| `/value-scenario-verify <contract>` | Runs the adopted boundary packet once at the authorized completed boundary and returns scoped evidence | Replaces a runner, starts early checks, retries blindly, publishes, creates a successor |

## Order of use

1. **Define** in Assess/Spec/Plan with `value-scenario-discovery`. Only
   owner-adopted cases enter `adopted-contract.json` `scenarioMatrix`.
2. **Implement** every planned production change. No test, build, lint or probe
   runs against unfinished code (A-9).
3. **Author** with `author-only` after the complete production work. Result:
   files plus "authored only; NOT_EXERCISED".
4. **Verify** once the complete value phase is implemented and separate authority
   names the actual boundary, candidate and effects. A task, hour, commit,
   checkpoint, reviewer request or compiler problem is not that boundary.

## Calibration

Review a few examples: an ordinary useful operation, an available but irrelevant
test (deferred with its reason) and a rare mandatory constraint. Likelihood stays
qualitative or `UNKNOWN`; no probabilities are invented. A material model or
context change sends unfamiliar candidates back through review.

## Dispositions

| Situation | Disposition |
|---|---|
| Exercised production oracle unmet | `FAIL` |
| Required assertion never observed, disabled or always true | `NOT_EXERCISED` |
| Stale candidate/config/oracle, missing runner/permission/fixture, failed cleanup, uncertain effect | `BLOCKED` |
| Correct scoped observation, effective negative control, limits and cleanup met | `PASS` within that scope |

A zero exit never passes. Product failures stay separate from prerequisite,
fixture, permission and evidence failures. Earlier failures, consumed budget and
unknown effects are kept. A repair is a complete implementation batch followed by
one targeted rerun, with lineage retained. In `boundary-results.json` the
evaluator treats only `PASS` and `FAIL` entries as decided; `BLOCKED` and
`NOT_EXERCISED` leave the phase open.

## Closure

Evidence goes to the existing `boundary-results.json` consumed by
`scripts/kbd-phase-close-eval.mjs`. Reports keep authored implementation,
measured acceptance, demonstrated runtime value, unresolved gaps and release
authority separate. Unsupported closure vocabulary stays refused.

## Limits

- Instruction-only: enforcement is exactly what the host and KBD runtime provide;
  no skill can intercept arbitrary commands or override host rules.
- API and CLI scenarios need no browser, Rust toolchain, shell/Python helper or
  service. Browser/video adapters and the full testing catalog are not shipped.
- Node compatibility is not Windows qualification; untested environments are
  reported, not assumed.
- Nothing here has been executed; this document claims no observed behavior.

See also: `docs/phase-completion-contract.md`.
