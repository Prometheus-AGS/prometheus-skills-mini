# Certification baseline of the mini pack — 2026-11-17

Taken before the parity change `parity-full-certification`, on mini main `de297c8`, with the full pack's certifier (`skills/testing/skill-certification`, static levels only). The repository-validator leg was not exercised because mini had no validator; the two validators that ran were the built-in checks and `skills-ref`.

## Result

| | Skills |
|---|---|
| Certified | 105 |
| Level held: C1 | 65 |
| Level held: none | 40 |
| C0 (specification) PASS / FAIL | 65 / 40 |
| C1 (static) PASS | 105 |

C2 (trigger), C3 (outcome) and C4 (portability) were not exercised.

## Findings

| Level | Severity | Check | Skills |
|---|---|---|---|
| C1 | warning | no-eval-cases | 105 |
| C1 | warning | description-no-trigger | 63 |
| C0 | error | top-level-fields | 38 |
| C0 | error | skills-ref | 38 |
| C0 | error | metadata-strings | 3 |
| C0 | error | description | 2 |
| C1 | warning | skill-length | 1 |

Two of the `description` failures were false: `vercel-composition-patterns` and `vercel-react-native-skills` write the description as plain text continued on indented lines, which the certifier's reader took for a nested mapping. The reader is fixed in the mini port; the same defect remains in the full pack's copy.

## Skills below the static level

`adversarial-review`, `android-compose-adaptive`, `android-edge-to-edge`, `better-accessibility`, `better-colors`, `better-interface`, `better-layout`, `better-typography`, `better-ui`, `better-writing`, `break`, `design-taste-frontend`, `design-taste-frontend-v1`, `explain-interface`, `expo-animation`, `expo-design-system`, `expo-native-ui`, `expo-router`, `expo-ui`, `flutter-build-responsive-layout`, `flutter-fix-layout-issues`, `flutter-setup-declarative-routing`, `flutter-setup-localization`, `full-output-enforcement`, `gpt-taste`, `high-end-visual-design`, `ideation-mindmap`, `industrial-brutalist-ui`, `interface-review`, `karpathy-progress-memory`, `minimalist-ui`, `prometheus-impeccable-core`, `prometheus-ui-review`, `prometheus-ui-ux`, `redesign-existing-projects`, `stitch-design-taste`, `ui-ux-pro-max`, `variant`, `vercel-composition-patterns`, `vercel-react-native-skills`
