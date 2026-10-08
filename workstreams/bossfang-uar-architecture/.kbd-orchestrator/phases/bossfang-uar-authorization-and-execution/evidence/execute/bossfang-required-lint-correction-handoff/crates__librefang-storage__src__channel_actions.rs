//! Durable causal actions and independent observer deliveries for channel sources.
//!
//! Rows contain only provenance, routing, authority references, and effect
//! state. The provider payload and credentials remain outside this store.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::channel_routes::ChannelScope;
#[cfg(feature = "surreal-backend")]
use crate::error::{StorageError, StorageResult};
#[cfg(feature = "surreal-backend")]
use crate::pool::SurrealSession;

/// Default maximum number of reactions along one causal path.
pub const DEFAULT_MAX_DEPTH: u8 = 4;
/// Default cumulative number of actions and observer copies per root.
pub const DEFAULT_MAX_FANOUT: u8 = 8;

/// Immutable budget policy selected when the root is first admitted.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CausalPolicy {
    /// Versioned policy identity; every descendant must use the same revision.
    pub revision: String,
    /// Maximum number of action hops on any path.
    pub max_depth: u8,
    /// Maximum total actions and observer copies across every branch.
    pub max_fanout: u8,
}

impl Default for CausalPolicy {
    fn default() -> Self {
        Self {
            revision: "default-v1".into(),
            max_depth: DEFAULT_MAX_DEPTH,
            max_fanout: DEFAULT_MAX_FANOUT,
        }
    }
}

/// Exact channel destination for a reply or provider echo; sender is excluded.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReplyTargetScope {
    /// Provider adapter.
    pub provider: String,
    /// Native account or configured sidecar instance.
    pub account: String,
    /// Interpretation of `account`.
    pub account_kind: String,
    /// Workspace identifier.
    pub workspace: String,
    /// Room or direct-message identifier.
    pub room: String,
    /// Native thread, if any.
    pub thread: Option<String>,
}

impl From<&ChannelScope> for ReplyTargetScope {
    fn from(source: &ChannelScope) -> Self {
        Self {
            provider: source.provider.clone(),
            account: source.account.clone(),
            account_kind: source.account_kind.clone(),
            workspace: source.workspace.clone(),
            room: source.room.clone(),
            thread: source.thread.clone(),
        }
    }
}

impl ReplyTargetScope {
    fn key(&self) -> String {
        digest_parts(&[
            "reply-target-v1",
            &self.provider,
            &self.account,
            &self.account_kind,
            &self.workspace,
            &self.room,
            if self.thread.is_some() {
                "some"
            } else {
                "none"
            },
            self.thread.as_deref().unwrap_or(""),
        ])
    }
}

/// Scope of an externally verified reply grant.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReplyGrantScope {
    /// Reply to the exact source provider/account/workspace/room/thread only.
    SourceOnly,
    /// A distinct exact target authorized by a separate grant.
    ExplicitTarget,
}

/// Gate-authorized reply reference. Storage checks scope, while the caller
/// validates current grant authority immediately before the actual send.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReplyGrantReceipt {
    /// Stable grant identity, never a bearer secret.
    pub grant_id: String,
    /// Current policy/grant revision.
    pub grant_revision: String,
    /// Whether the grant covers only the source or an explicit other target.
    pub scope: ReplyGrantScope,
    /// Exact authorized destination.
    pub allowed_target: ReplyTargetScope,
}

/// Kind of externally visible action or observer copy.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActionKind {
    /// Authorized channel post.
    Reply,
    /// Policy-filtered observer delivery, never a channel post.
    ObserverCopy,
    /// Forwarded reaction to another execution route.
    Forward,
}

/// Immutable causal action request. `action_key` is a stable logical key;
/// retrying the same action must pass the same value.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CausalActionRequest {
    /// First provider-native source occurrence for the entire reaction tree.
    pub root_occurrence_id: String,
    /// Source occurrence causing this action.
    pub source_occurrence_id: String,
    /// Parent action; required for a non-root source reaction.
    pub parent_action_id: Option<String>,
    /// Stable caller-supplied logical action key, not a random retry UUID.
    pub action_key: String,
    /// Stable route or subscriber identity used for loop detection.
    pub route_identity: String,
    /// Effect kind.
    pub kind: ActionKind,
    /// Exact reply destination when kind is `Reply`.
    pub reply_target: Option<ReplyTargetScope>,
    /// Current, externally verified reply grant when kind is `Reply`.
    pub reply_grant: Option<ReplyGrantReceipt>,
    /// Root-pinned cumulative budget.
    pub policy: CausalPolicy,
    /// Original caller identity, distinct from current actor.
    pub original_principal: String,
    /// Current acting identity.
    pub actor_id: String,
}

/// Durable effect state. `Claimed` may be uncertain after a crash and is never
/// eligible for automatic retry.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActionState {
    /// Durable but not yet released to an execution owner.
    Pending,
    /// Claimed across the external-effect boundary.
    Claimed,
    /// Owner confirmed completion.
    Completed,
    /// The result cannot be inferred; reconcile by action ID.
    Uncertain,
    /// Budget or visited-route rule refused the action before an effect.
    Suppressed,
    /// Queued observer copy was refused by current delivery authority.
    Withheld,
}

/// Durable action and causal lineage receipt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ActionReceipt {
    /// Deterministic root/parent/action-key identity.
    pub action_id: String,
    /// Fingerprint of the full immutable request; conflicting retries fail.
    pub request_hash: String,
    /// Root source occurrence.
    pub root_occurrence_id: String,
    /// Immediate source occurrence.
    pub source_occurrence_id: String,
    /// Parent action, if this is a reaction.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_action_id: Option<String>,
    /// New route identity.
    pub route_identity: String,
    /// Full visited path including this action when allowed.
    pub visited_routes: Vec<String>,
    /// Depth of this action from the root source.
    pub depth: u8,
    /// Remaining path hops after this action.
    pub remaining_depth: u8,
    /// Root-wide fanout available immediately after this admission.
    pub remaining_fanout: u8,
    /// Action kind.
    pub kind: ActionKind,
    /// Exact reply destination, if any.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reply_target: Option<ReplyTargetScope>,
    /// Reply grant identity, if any.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reply_grant_id: Option<String>,
    /// Reply grant revision, if any.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reply_grant_revision: Option<String>,
    /// Original principal.
    pub original_principal: String,
    /// Acting identity.
    pub actor_id: String,
    /// Effect state.
    pub state: ActionState,
    /// Terminal suppression reason, if any.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suppression_reason: Option<String>,
    /// Current claimant, if any.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub claimant: Option<String>,
    /// RFC-3339 timestamp.
    pub recorded_at: String,
    /// RFC-3339 last change timestamp.
    pub updated_at: String,
}

/// New, replayed, or durably suppressed causal admission.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActionAdmission {
    /// New action charged to the root budget.
    New(ActionReceipt),
    /// Same action and request were already recorded; no second budget charge.
    Replay(ActionReceipt),
    /// Budget or route loop refused this action; no external effect is allowed.
    Suppressed(ActionReceipt),
}

/// Atomic claim result for one action.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActionClaim {
    /// This caller may cross the external-effect boundary once.
    Acquired(ActionReceipt),
    /// Already claimed, completed, uncertain, withheld, or suppressed.
    NotClaimable(ActionReceipt),
    /// No such action exists.
    Missing,
}

/// Stable observer subscription creation request.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ObserverSubscriptionRequest {
    /// Stable subscription identity.
    pub subscription_id: String,
    /// Authorized recipient identity.
    pub subscriber_id: String,
    /// UAR agent instance that receives the copy; distinct from subscription ID.
    pub observer_instance_id: String,
    /// Destination UAR workspace for this recipient.
    pub uar_workspace_id: String,
    /// Opaque Gate-owned source-filter identity; never raw source content.
    pub filter_id: String,
    /// Authority that issued the source disclosure grant.
    pub source_grant_issuer: String,
    /// Source disclosure grant identity.
    pub source_grant_id: String,
    /// Authority that issued the recipient delivery grant.
    pub recipient_grant_issuer: String,
    /// Recipient delivery grant identity.
    pub recipient_grant_id: String,
    /// Current Gate grant revision when registered.
    pub grant_revision: String,
}

/// Lifecycle of an observer subscription.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ObserverStatus {
    /// May accept and release authorized copies.
    Active,
    /// Retains cursor but refuses new release.
    Paused,
    /// Terminally revoked; requires a new subscription identity.
    Revoked,
}

/// Durable independent subscriber cursor and queue state.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ObserverSubscription {
    /// Stable subscription identity.
    pub subscription_id: String,
    /// Authorized recipient identity.
    pub subscriber_id: String,
    /// Gate recipient identity of the UAR observer instance.
    #[serde(default)]
    pub observer_instance_id: String,
    /// Destination UAR workspace.
    pub uar_workspace_id: String,
    /// Gate-owned source filter identity.
    pub filter_id: String,
    /// Source disclosure grant issuer.
    pub source_grant_issuer: String,
    /// Source disclosure grant identity.
    pub source_grant_id: String,
    /// Recipient delivery grant issuer.
    pub recipient_grant_issuer: String,
    /// Recipient delivery grant identity.
    pub recipient_grant_id: String,
    /// Current grant revision at registration.
    pub grant_revision: String,
    /// Lifecycle status.
    pub status: ObserverStatus,
    /// Next sequence number to allocate, starting at one.
    pub next_sequence: u64,
    /// Highest contiguous acknowledged sequence.
    pub ack_sequence: u64,
    /// RFC-3339 creation time.
    pub recorded_at: String,
    /// RFC-3339 last change time.
    pub updated_at: String,
}

/// Observer queue request; `action` must be an `ObserverCopy` for the exact
/// occurrence. The store derives its stable action key from subscription and
/// occurrence, so a retry cannot silently consume a second fanout slot.
#[derive(Debug, Clone, PartialEq)]
pub struct ObserverDeliveryRequest {
    /// Stable subscription ID.
    pub subscription_id: String,
    /// Exact source occurrence.
    pub occurrence_id: String,
    /// Current authorized recipient delivery grant revision.
    pub grant_revision: String,
    /// Causal lineage and root-wide budget request.
    pub action: CausalActionRequest,
    /// Gate-filtered, per-recipient content projection admitted atomically
    /// with this delivery. Never pass a raw provider payload here.
    pub projection: ObserverProjection,
}

/// Policy-filtered content sealed to one observer delivery. This type is
/// intentionally absent from list/cursor receipts; retrieve it only after
/// current disclosure and delivery authority has been rechecked.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ObserverProjection {
    /// Authority that issued the source-disclosure grant.
    pub source_grant_issuer: String,
    /// Stable source-disclosure grant identity, not a credential.
    pub source_grant_id: String,
    /// Source-disclosure grant revision at projection time.
    pub source_grant_revision: String,
    /// Gate-assigned content classification.
    pub classification: String,
    /// Filtered text, if disclosure permits it.
    pub text: Option<String>,
}

/// Observer delivery status, separate from its causal action state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ObserverDeliveryState {
    /// Queued, unreleased.
    Pending,
    /// Claimed for one policy-rechecked delivery.
    Claimed,
    /// Recipient delivery confirmed; ready for contiguous acknowledgement.
    Delivered,
    /// Current grant refused release; cursor may acknowledge this gap.
    Withheld,
    /// Provider outcome unclear; never auto-retry.
    Uncertain,
}

/// Per-subscription occurrence delivery receipt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ObserverDeliveryReceipt {
    /// Deterministic subscription/occurrence identity.
    pub delivery_id: String,
    /// Subscription identity.
    pub subscription_id: String,
    /// Recipient identity.
    pub subscriber_id: String,
    /// Source occurrence.
    pub occurrence_id: String,
    /// Causal action, charged once against root fanout.
    pub action_id: String,
    /// Independent per-subscriber sequence.
    pub sequence: u64,
    /// Grant revision checked at enqueue.
    pub grant_revision: String,
    /// Digest of the sealed UTF-8 text projection; sufficient for a current
    /// Gate recheck without reading protected content before authorization.
    #[serde(default)]
    pub projection_sha256: String,
    /// Source-disclosure classification pinned at enqueue.
    #[serde(default)]
    pub classification: String,
    /// Current state.
    pub state: ObserverDeliveryState,
    /// Claimant that crossed the delivery boundary.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub claimant: Option<String>,
    /// Withheld reason, if any.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub withheld_reason: Option<String>,
    /// RFC-3339 creation time.
    pub recorded_at: String,
    /// RFC-3339 last change time.
    pub updated_at: String,
}

/// Result of atomic observer-copy enqueue.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ObserverDeliveryAdmission {
    /// A new delivery and action were atomically admitted.
    Queued(ObserverDeliveryReceipt),
    /// The same subscription/occurrence delivery already exists.
    Replay(ObserverDeliveryReceipt),
    /// Causal policy or visited-route rule suppressed the copy.
    Suppressed(Box<ActionReceipt>),
}

/// Result of an observer release claim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ObserverDeliveryClaim {
    /// This caller may publish this copy once.
    Acquired(ObserverDeliveryReceipt),
    /// Existing status or grant revision refuses release.
    NotClaimable(ObserverDeliveryReceipt),
    /// Delivery does not exist.
    Missing,
}

/// Current independent acknowledgement cursor.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ObserverCursor {
    /// Next sequence number to allocate.
    pub next_sequence: u64,
    /// Highest contiguous acknowledged sequence.
    pub ack_sequence: u64,
}

fn digest_parts(parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    for part in parts {
        hasher.update((part.len() as u64).to_be_bytes());
        hasher.update(part.as_bytes());
    }
    hex::encode(hasher.finalize())
}

#[cfg(feature = "surreal-backend")]
mod surreal_impl;

#[cfg(feature = "surreal-backend")]
pub use surreal_impl::ChannelActionStore;
