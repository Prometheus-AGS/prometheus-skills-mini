---
okf_version: "0.2"
---

# prometheus-skills-mini — project memory

# Operating knowledge
* [Gotchas](/gotchas.md) - Learned constraints about this repo's tools and services; grep for a subsystem before the first edit in it.

# Postmortems
* [Mirror write failed while surreal-memory reported healthy](/postmortems/2026-09-20-surreal-memory-mirror-write-failed.md) - A 3 s client timeout against 1.7-5.4 s writes, plus a server bug that restarts the embedding executor when a request is aborted.
