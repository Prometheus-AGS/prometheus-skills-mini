# Copied skill real-operation evidence

Operated the built mini Codex payload through its public cadence CLI on macOS with Node v26.5.0. This was a local application operation; no test runner, assertion suite, hosted runner, The Boss instance, or release dispatch was used.

- Temporary repository: /var/folders/ln/0wnpd96j26z2qhvx9m6hwt2r0000gn/T/delivery-cadence-operation-9W5wAy/app
- Two independently committed greeting versions were built to dist/main.mjs and launched. Both iterations recorded successful required build and run checkpoints. Final runnable output: {"version":2,"message":"Personal delivery greeting: operator"}.
- Report counted 2 unique completed tasks and left missing implementation/cost measurements unknown.
- Main run: successfulDeliveries=2, publicationDue=true, reviewDue=false. Publication interval was every 2 successful deliveries; no publication was claimed.
- Explicitly registered local-summary and local HTTP email-API handlers completed for each iteration: four durable succeeded receipts, one attempt each; 2 summary files and 2 received HTTP event payloads. The receiver bound loopback only and was closed afterward. No real email was sent.
- Replaying finish with its original command ID and retrying an already successful email receipt left HTTP delivery count at 2 (before replay: 2); successful effects were not repeated.
- Separate reviewEvery=1 run completed build + launch, then returned reviewDue=true. Its next start exited 1 with: Human review is due; record review acknowledgement before new work. No approval was fabricated.

All observed CLI commands and outputs, event IDs, source revisions, receipts and local HTTP deliveries are in copied-skill-operation.json. Source and receipts remain in the temporary directory for inspection.

Limits: failed-build repair/resume, process interruption/timeout, real mail provider delivery, hosted publication, Windows operation and The Boss feature behavior were not exercised in this session.

## Completed-boundary failure and repair operation

The copied CLI also operated a deliberately incomplete **actual application source** through its real build procedure. Node's syntax compiler rejected main.mjs; the build checkpoint exited 1. A new start was refused while that iteration remained active. The source was repaired and committed, ready refreshed the source identity, and the same iteration's build and runnable distribution both succeeded. Its receipts preserve the failed source revision 297a56028db2d65ea2e9189a56586d8e2afe1e5a and repaired revision b67fe509829d72c6b6463f252452e1083986e050. The iteration count remained 1; successfulDeliveries became 1. Final application output: {"version":3,"message":"Recovered delivery greeting: recovered"}.

A required local HTTP notification then received a real 503 response. The handler declared no effects, its receipt became failed, and the next start was refused. After deliberately enabling acceptance at the same loopback receiver, hooks retry reused the receipt/idempotency identity; it succeeded, and resume finalized the same iteration with hookBlocked=false. Receiver observations: rejected (503), accepted. No external email or publication occurred.

This closes the earlier failed-build repair/resume gap. Process interruption/timeout, external email provider delivery, hosted publication, Windows operation and The Boss feature behavior remain outside this operation's evidence. No tests, assertions or suite runner were authored or executed.
