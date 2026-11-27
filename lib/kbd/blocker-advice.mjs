// Advisory blocker disposition. A pure classifier over attempt records the session or operator
// supplies; it reads nothing and stops nothing.
//
// Rule: after two COMPLETED attempts at the same blocker with no new evidence between them,
// recommend exactly one disposition. An attempt waiting on an approval is not a failed attempt,
// and a job that is still running (or whose progress is unknown) is not a completed one.
//
// Attempt record: { blocker, completed, waitingOnApproval, evidence, kind }
//   blocker            stable id or short name of what stopped the work
//   completed          true only when the attempt ran to an end
//   waitingOnApproval  true while the attempt is held for an approval
//   evidence           reference to what the attempt observed; a new value means new evidence
//   kind               what stands in the way: setup | measurement | authority | architecture
//
// A result with no recommendation carries `guidance`: what to do instead of acting on the blocker.

export const ATTEMPTS_BEFORE_ADVICE = 2;

export const DISPOSITIONS = Object.freeze({
  setup: {
    disposition: 'bounded-setup-repair',
    action: 'Repair the environment, fixture or tooling once, within a stated limit, then retry.',
  },
  measurement: {
    disposition: 'measurement-repair',
    action: 'Repair the check or oracle so it can observe the outcome; do not change the product to satisfy it.',
  },
  authority: {
    disposition: 'authority-handoff',
    action: 'Hand one exact question or approval request to the person who holds the authority.',
  },
  architecture: {
    disposition: 'scoped-architecture-child',
    action: 'Open one scoped child for the design question through the existing child-phase path.',
  },
});

// Qualification showed that "no recommendation" alone is read as room to invent one: agents told the
// operator to escalate past a pending approval. The advice therefore says what to do when it
// recommends nothing.
const WAIT_GUIDANCE = 'Keep waiting. Advise no escalation, deadline, other decider or repeated request while the approval is pending; whether to chase it is the operator\'s decision. Continue only with work that does not depend on it.';
const RUNNING_GUIDANCE = 'Leave it running. Do not stop it or count it as failed; look again when it ends or produces output.';

const sameEvidence = (a, b) => (a ?? null) === (b ?? null);

function adviseOne(blocker, attempts) {
  const latest = attempts[attempts.length - 1];
  if (latest.waitingOnApproval === true) {
    return { blocker, counted: 0, recommendation: null, reason: 'waiting on an approval; a wait is not a failed attempt', guidance: WAIT_GUIDANCE };
  }
  const completed = attempts.filter((attempt) => attempt.completed === true && attempt.waitingOnApproval !== true);
  if (!completed.length) {
    return { blocker, counted: 0, recommendation: null, reason: 'no completed attempt; a running or unknown job is not counted', guidance: RUNNING_GUIDANCE };
  }
  const last = completed[completed.length - 1];
  let counted = 0;
  for (let index = completed.length - 1; index >= 0 && sameEvidence(completed[index].evidence, last.evidence); index -= 1) {
    counted += 1;
  }
  if (counted < ATTEMPTS_BEFORE_ADVICE) {
    return { blocker, counted, recommendation: null, reason: 'fewer than two completed attempts since the last new evidence' };
  }
  const known = Object.hasOwn(DISPOSITIONS, last.kind);
  const choice = DISPOSITIONS[known ? last.kind : 'authority'];
  return {
    blocker,
    counted,
    recommendation: { ...choice },
    reason: known
      ? `${counted} completed attempts at the same blocker with no new evidence; blocker kind is ${last.kind}`
      : `${counted} completed attempts at the same blocker with no new evidence; blocker kind is not stated, so ask who decides`,
  };
}

/**
 * Advice for every blocker named in `attempts`, in first-seen order. Always advisory: the result
 * carries no authority and never tells the caller to stop or cancel work.
 */
export function adviseBlockers(attempts) {
  if (!Array.isArray(attempts)) throw new TypeError('attempts must be an array of attempt records');
  const byBlocker = new Map();
  for (const attempt of attempts) {
    if (!attempt || typeof attempt.blocker !== 'string' || !attempt.blocker) {
      throw new TypeError('each attempt needs a non-empty string "blocker"');
    }
    byBlocker.set(attempt.blocker, [...(byBlocker.get(attempt.blocker) ?? []), attempt]);
  }
  return {
    advisory: true,
    advice: [...byBlocker.entries()].map(([blocker, records]) => adviseOne(blocker, records)),
  };
}
