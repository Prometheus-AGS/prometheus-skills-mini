# Rust auditor report — okf-v02-writer @ 3481e86

Independent agent, report-only (no edits, commits or pushes; `git status` empty before and after). Method:
read the full diff and each changed function whole; built a throwaway probe crate outside the repository
with its own target directory; compared against the installed `pk 1.8.0` on the same inputs.

| # | Severity | Where | Finding | Author's verification |
|---|---|---|---|---|
| 1 | **CRITICAL** | `pk-store/src/prompt_snapshot.rs:74-85` | `read_prompt_snapshot` re-serialises the entries and requires the SHA-256 and byte count to equal the stored generation. `WikiEntry` now serialises differently (`sources` as mappings; `generated_by: null` always emitted), so **every 1.8.0 snapshot with at least one entry fails validation**. `pk context` returns no results for that scope until something commits a new snapshot. | **REPRODUCED** read-only on the real global snapshot: 1.8.0 → `candidate_count 4, failures []`; this branch → `candidate_count 0`, `failures: prompt snapshot failed identity or count validation`. Code read at `:62-88`. |
| 2 | HIGH | `pk-store/src/markdown.rs` (`Generated`) | `generated` used to fall into the flattened `extra`, so any shape parsed. It is now typed with a required `by`, so a non-mapping `generated`, a mapping without `by`, or an `at` chrono rejects (`2026-07-01T10:00+00:00`, `…+0000`, no offset, date only) **fails the whole document**. 1.8.0 loads all of them. A parse failure also freezes live reload and blocks snapshot commits for the whole store. | Accepted; consistent with the code. pk 1.8.0 never wrote the key, so exposure is hand-edited or third-party documents. |
| 3 | MEDIUM | `pk-core/src/types.rs` (`SourceRepr`) | A non-string scalar in `sources` (`[12345]`, a bool, null) now fails the document: the untagged enum buffers the value, so it is already a number and matches neither variant. 1.8.0's `Vec<String>` read it. | Accepted. |
| 4 | MEDIUM | `pk-core/src/types.rs` (`Source.extra` is `pub`) | Code can put `id`/`resource` back into `extra` and serialise duplicate keys. Unreachable from parsed data; nothing in the workspace does it. | Accepted as latent. |
| 5 | HIGH | `pk-librarian/src/librarian.rs` (`with_unique_ids`) | The first pass protects model labels from *derived* labels but not from the `-2`/`-3` suffixes it hands out itself: `[{id:x,A},{id:x,B},{id:x-2,C}]` → B takes `x-2`, and the body's `[^x-2]`, which meant C, now resolves to B. | Accepted; traced by hand, the algorithm does this. |
| 6 | MEDIUM | `pk-librarian/src/librarian.rs` (`is_footnote_label`) | The allowed set is safe but too narrow: `notes.md`, `session:abc`, `a/b` are valid footnote labels in pulldown-cmark 0.12.2. pk rewrites the id and leaves the body's `[^notes.md]`, so **pk itself causes the mismatch**. Labels are also case-insensitive in markdown; pk treats `Doc` and `doc` as distinct. | Accepted. |
| 7 | MEDIUM | `pk-store/src/bundle.rs:34` | The body parser runs without footnote support, so a definition line `[^notes]: /abs/path/file.md` is read as a link reference definition and lands in `entry.links` as a bogus article id. Unchanged code, but the new prompt is what produces this input. | Accepted. |
| 8 | MEDIUM | `pk-mcp/src/tools.rs:273` | `handle_get` returns the whole `WikiEntry`, so the MCP wire shape of `sources` changed and `generated_by` is new. External clients reading `sources[i]` as a string break. | **Confirmed by reading the code — and it contradicts a claim in `plan.md` and `execution.md`**, which said pk-mcp returns only a five-field summary. That claim was wrong; see the correction there. |
| 9 | LOW | `pk-librarian/src/librarian.rs` (`free_label`) | Cubic on identical labels (n=1000 → 1.2 s debug) and the only `expect` in non-test code. Not reachable with token-bounded model output. | Accepted. |

Outside the diff, noted and not investigated: `Frontmatter.resource` is read but never carried into
`WikiEntry`, so a document-level `resource` is lost on rewrite. Pre-dates this change.

## Checked and found sound

`generated.at` via `to_rfc3339()` is ISO 8601 with an explicit offset · `timestamp` is never written, still
read last, outranked by `generated.at` · a producer's `generated.by` survives a write · `Source` round-trips
exactly in YAML and JSON, key order `id`, `resource`, then sorted `extra`; a bare string is never written
back as one · no other panic path in `with_unique_ids` · `render_index` is deterministic and passes pk's own
index check, CRLF copy included; nothing reads `index.md` expecting it to start with the title · **Windows:**
no unix-only API, path-separator assumption or CRLF sensitivity introduced · manifests change only by the
version bump · no `unsafe` · the untagged buffering adds one small allocation per source, negligible beside
the YAML parse · `LibrarianEvent` does not embed `WikiEntry`; the only persisted `WikiEntry` JSON is the
prompt snapshot of finding 1.

## Why the author's evidence missed finding 1

`evidence.md` §6.2 copied only the wiki root into the sandbox — deliberately, to limit what `pk ingest` sent
to the model — so no 1.8.0 snapshot was ever exercised. The "pk context before any write" check returned
nothing and was labelled vacuous; it was vacuous in a way that hid exactly this defect.

## Disposition after section 7 (branch head a656f47)

| # | Disposition |
|---|---|
| 1 CRITICAL | **FIXED** (`677b2eb`). Identity is verified against the entries as stored (raw text, compacted), not a re-serialisation. Confirmed read-only on the real snapshots: global 4/4, shared 128/128 under 1.8.0 and 1.9.0. |
| 2 HIGH | **FIXED** (`2527ec9`). `generated` is read leniently; an unparseable `generated.at` falls through. |
| 3 MEDIUM | **FIXED** (`98fcf98`). A number or boolean source is read as its text. |
| 4 MEDIUM | **DECLINED**, reason in design.md: unreachable from parsed data, no caller, nothing observed. |
| 5 HIGH | **FIXED** (`a374782`). Three ordered passes; labels compared case-folded. A surviving mutant led to one more test. |
| 6 MEDIUM | **FIXED** (`a7852e8`). Only whitespace, `[`, `]`, `^` and the empty label are refused. |
| 7 MEDIUM | **FIXED** (`fd13a25`). Bodies are parsed with footnotes enabled. |
| 8 MEDIUM | **DOCUMENTED** under BREAKING in proposal.md, with the Rust API change. |
| 9 LOW | **FIXED** with #5: a HashSet and a plain loop; no `expect` remains in non-test code in the diff. |

Found while redoing the evidence, not by the auditor: a knowledge base 1.9.0 has written to cannot be shared
with a 1.8.0 binary (it skips v0.2 entries and fails 1.9.0 snapshots). Inherent in v0.2; documented as a
fourth BREAKING surface.
