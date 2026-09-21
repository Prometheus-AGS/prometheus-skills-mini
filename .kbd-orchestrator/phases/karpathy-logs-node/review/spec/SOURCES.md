# Third-party material in this review

The packets in this directory quote sections §4.1, §5.1–§5.2, §7–§9 and §11–§13 of the **Open Knowledge
Format specification, version 0.2**, © Google LLC, licensed under Apache-2.0:
<https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md>

They are quoted as evidence so that a reviewer with no tools can check each requirement in
`okf-v02-writer` and `okf-v02-via-pk` against the text it claims to implement. The full document is not
committed. `build-packet.cjs` reads it from `okf-spec-v0.2.md` in this directory, which is git-ignored:

    gh api repos/GoogleCloudPlatform/knowledge-catalog/contents/okf/SPEC.md --jq .content   (then base64-decode)

The packets also quote `record-progress.py` from `Prometheus-AGS/prometheus-skill-system` and Rust source
from `Prometheus-AGS/prometheus-knowledge-rs`; both are public repositories of this organisation.
