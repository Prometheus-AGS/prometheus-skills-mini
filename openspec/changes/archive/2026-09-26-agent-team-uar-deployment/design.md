# Design

The local team state remains an authoring and coordination workspace. Export derives immutable collaboration documents and exact UTF-8 file digests. `deploy-preflight`, `deploy-install`, `binding-preflight`, and `binding-apply` call only the versioned UAR collaboration API, require explicit base URL and host-resolved credential reference, record native IDs/revisions, and do not activate a team.

`team-update` requires current state revision and an explicit semantic version bump. Installed definitions are append-only. A deployment migration installs the new package first and then CAS-updates the private binding; rollback selects an earlier installed package rather than deleting catalog history.
