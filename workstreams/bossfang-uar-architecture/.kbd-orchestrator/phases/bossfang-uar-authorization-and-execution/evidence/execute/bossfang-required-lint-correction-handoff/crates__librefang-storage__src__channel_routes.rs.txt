//! Durable, metadata-only channel occurrence and handler-route records.
//!
//! Native source identity is admitted once. The occurrence's decision never
//! changes; an explicit reassignment changes only the affinity for later
//! occurrences. Dispatch has its own state so recovery can resume pending work
//! while a claimed-but-unconfirmed effect is never blindly repeated.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[cfg(feature = "surreal-backend")]
use crate::error::{StorageError, StorageResult};
#[cfg(feature = "surreal-backend")]
use crate::pool::SurrealSession;

/// Complete provider-native scope used to distinguish conversations and senders.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChannelScope {
    /// Channel adapter name, such as `slack`.
    pub provider: String,
    /// Native bot/account or configured sidecar-instance identifier.
    pub account: String,
    /// Whether `account` is a native account ID or configured instance ID.
    pub account_kind: String,
    /// Configured workspace identifier.
    pub workspace: String,
    /// Native room, conversation, or direct-message identifier.
    pub room: String,
    /// Native thread identifier when this message is threaded.
    pub thread: Option<String>,
    /// Native sender identifier.
    pub sender: String,
}

impl ChannelScope {
    fn key(&self) -> String {
        let thread_kind = if self.thread.is_some() {
            "thread-present"
        } else {
            "thread-absent"
        };
        digest_parts(&[
            "channel-scope-v1",
            &self.provider,
            &self.account,
            &self.account_kind,
            &self.workspace,
            &self.room,
            thread_kind,
            self.thread.as_deref().unwrap_or(""),
            &self.sender,
        ])
    }

    #[cfg(feature = "surreal-backend")]
    fn validate(&self) -> StorageResult<()> {
        for (field, value) in [
            ("provider", &self.provider),
            ("account", &self.account),
            ("account_kind", &self.account_kind),
            ("workspace", &self.workspace),
            ("room", &self.room),
            ("sender", &self.sender),
        ] {
            if value.is_empty() {
                return Err(StorageError::InvalidConfig(format!(
                    "channel source identity is missing {field}"
                )));
            }
        }
        Ok(())
    }
}

/// A provider-native message occurrence. Never synthesize its message ID.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceOccurrence {
    /// Provider, account, workspace, room, thread, and sender scope.
    pub scope: ChannelScope,
    /// Stable native message ID retained across provider redelivery.
    pub native_message_id: String,
}

impl SourceOccurrence {
    fn id(&self) -> String {
        digest_parts(&[
            "channel-occurrence-v1",
            &self.scope.key(),
            &self.native_message_id,
        ])
    }
}

/// A single handler, an equal-priority conflict, or no eligible handler.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum RouteOutcome {
    /// One chosen handler.
    Selected {
        /// Identity of the chosen handler.
        handler: String,
    },
    /// Equal-precedence distinct handlers; no dispatch is allowed.
    Conflict {
        /// Distinct handler identities with equal routing precedence.
        handlers: Vec<String>,
    },
    /// The source cannot be routed under the current capability or policy.
    Unavailable {
        /// Capability or policy reason routing is unavailable.
        reason: String,
    },
}

/// Auditable route proposal, excluding message content and credentials.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RouteDecision {
    /// Result of handler resolution.
    pub outcome: RouteOutcome,
    /// Stable routing precedence or operator-decision label.
    pub reason: String,
    /// Revision of the binding set consulted, when one exists.
    pub binding_revision: Option<String>,
}

/// Immutable metadata of an admitted provider-native source occurrence.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceOccurrenceReceipt {
    /// Deterministic occurrence identifier.
    pub occurrence_id: String,
    /// Hash of the complete normalized source scope.
    pub scope_key: String,
    /// Provider/account/workspace/room/thread/sender provenance.
    pub scope: ChannelScope,
    /// Stable provider-native message identifier.
    pub native_message_id: String,
    /// Immutable selected, conflicting, or unavailable route decision.
    pub decision: RouteDecision,
    /// Route revision pinned when admitted, if a handler was selected.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub route_revision: Option<u64>,
    /// RFC-3339 admission timestamp.
    pub recorded_at: String,
}

/// Latest route binding for future occurrences in this exact scope.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RouteAffinity {
    /// Hash of the complete normalized scope.
    pub scope_key: String,
    /// Complete normalized source scope.
    pub scope: ChannelScope,
    /// Selected handler identity.
    pub handler: String,
    /// Monotonic revision, starting at one.
    pub revision: u64,
    /// Binding revision that selected the handler.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub binding_revision: Option<String>,
    /// RFC-3339 timestamp of this revision.
    pub recorded_at: String,
}

/// Durable state of a selected handler's delivery attempt.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DispatchState {
    /// Committed to storage but not yet claimed for execution.
    Pending,
    /// Claimed; its effect is uncertain after a crash, so do not auto-retry.
    Claimed,
    /// Handler execution was confirmed by its owner.
    Completed,
    /// The outcome cannot safely be inferred or automatically retried.
    Uncertain,
}

/// Separate mutable dispatch receipt for an immutable selected occurrence.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DispatchReceipt {
    /// Stable occurrence identifier.
    pub occurrence_id: String,
    /// Stable normalized scope key.
    pub scope_key: String,
    /// Native source provenance for journal recovery and reply scoping.
    pub scope: ChannelScope,
    /// Stable native message ID for journal recovery.
    pub native_message_id: String,
    /// Stable action identifier reused by every retry or recovery path.
    pub action_id: String,
    /// Handler selected in the immutable occurrence decision.
    pub handler: String,
    /// Route revision selected when the occurrence was admitted.
    pub route_revision: u64,
    /// Current dispatch state.
    pub state: DispatchState,
    /// Process-specific claimant when claimed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub claimant: Option<String>,
    /// RFC-3339 creation time.
    pub recorded_at: String,
    /// RFC-3339 last state change time.
    pub updated_at: String,
}

/// Result of an atomic dispatch claim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DispatchClaim {
    /// This caller may invoke the exact selected handler once.
    Acquired(DispatchReceipt),
    /// Another claim, completed action, or uncertain effect prevents dispatch.
    NotClaimable(DispatchReceipt),
    /// This occurrence has no selected handler.
    NotDispatchable,
}

/// Durable admission result, including replay and dispatch state.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouteAdmission {
    /// Stable, deterministic occurrence identifier.
    pub occurrence_id: String,
    /// Affinity revision pinned by this occurrence, if a handler was selected.
    pub route_revision: Option<u64>,
    /// True only for the first successful admission of the native occurrence.
    pub is_new: bool,
    /// Immutable outcome for this occurrence.
    pub outcome: RouteOutcome,
    /// Stable action identifier for a selected handler.
    pub action_id: Option<String>,
    /// Current dispatch state, if the occurrence selected a handler.
    pub dispatch: Option<DispatchState>,
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
mod surreal_impl {
    use super::*;
    use surrealdb::{engine::any::Any, Surreal};

    const OCCURRENCES: &str = "channel_source_occurrences";
    const AFFINITY: &str = "channel_route_affinity";
    const REVISIONS: &str = "channel_route_revisions";
    const DISPATCH: &str = "channel_route_dispatch";

    /// SurrealDB-backed channel route store, valid for embedded one-host or
    /// shared remote installations. The caller owns capability reporting.
    #[derive(Clone)]
    pub struct ChannelRouteStore {
        db: Surreal<Any>,
    }

    impl ChannelRouteStore {
        /// Open over an existing session after migration 45 has been applied.
        pub async fn open(session: &SurrealSession) -> StorageResult<Self> {
            Ok(Self {
                db: session.clone_db().await?,
            })
        }

        /// Load retained handler affinity for one exact source scope.
        pub async fn affinity(&self, scope: &ChannelScope) -> StorageResult<Option<RouteAffinity>> {
            scope.validate()?;
            self.read(AFFINITY, &scope.key()).await
        }

        /// Read immutable normalized source and route metadata without
        /// re-admitting or dispatching the provider message.
        pub async fn source_occurrence(
            &self,
            occurrence_id: &str,
        ) -> StorageResult<Option<SourceOccurrenceReceipt>> {
            validate_occurrence_id(occurrence_id)?;
            self.read(OCCURRENCES, occurrence_id).await
        }

        /// Admit a native occurrence exactly once, pinning its immutable route.
        /// A retained affinity wins over a new proposal. Authorization for an
        /// explicit reassignment belongs to the caller, not this store.
        pub async fn admit(
            &self,
            source: &SourceOccurrence,
            proposed: &RouteDecision,
        ) -> StorageResult<RouteAdmission> {
            source.scope.validate()?;
            if source.native_message_id.is_empty() {
                return Err(StorageError::InvalidConfig(
                    "channel source identity is missing native_message_id".into(),
                ));
            }
            if matches!(&proposed.outcome, RouteOutcome::Selected { handler } if handler.is_empty())
            {
                return Err(StorageError::InvalidConfig(
                    "selected channel handler is empty".into(),
                ));
            }
            let id = source.id();
            if let Some(existing) = self
                .read::<SourceOccurrenceReceipt>(OCCURRENCES, &id)
                .await?
            {
                return self.admission(existing, false).await;
            }

            // A concurrent host can install affinity or this occurrence while
            // our snapshot is old. Re-read both identities before retrying;
            // no failed attempt is treated as successful admission.
            let mut last_error = None;
            for _ in 0..4 {
                let affinity = self.affinity(&source.scope).await?;
                let decision = match &affinity {
                    Some(route) => RouteDecision {
                        outcome: RouteOutcome::Selected {
                            handler: route.handler.clone(),
                        },
                        reason: "retained_affinity".into(),
                        binding_revision: route.binding_revision.clone(),
                    },
                    None => proposed.clone(),
                };
                let revision = match (&affinity, &decision.outcome) {
                    (Some(route), _) => Some(route.revision),
                    (None, RouteOutcome::Selected { .. }) => Some(1),
                    _ => None,
                };
                let now = chrono::Utc::now().to_rfc3339();
                let row = SourceOccurrenceReceipt {
                    occurrence_id: id.clone(),
                    scope_key: source.scope.key(),
                    scope: source.scope.clone(),
                    native_message_id: source.native_message_id.clone(),
                    decision: decision.clone(),
                    route_revision: revision,
                    recorded_at: now.clone(),
                };
                match self.write_admission(&row, affinity.as_ref()).await {
                    Ok(()) => return self.admission(row, true).await,
                    Err(error) => {
                        if let Some(existing) = self
                            .read::<SourceOccurrenceReceipt>(OCCURRENCES, &id)
                            .await?
                        {
                            return self.admission(existing, false).await;
                        }
                        let latest = self.affinity(&source.scope).await?;
                        if latest.as_ref().map(|r| r.revision)
                            == affinity.as_ref().map(|r| r.revision)
                        {
                            return Err(error);
                        }
                        last_error = Some(error);
                    }
                }
            }
            Err(last_error.unwrap_or_else(|| {
                StorageError::Backend("channel route admission conflict".into())
            }))
        }

        /// Read an existing dispatch receipt without admitting a source or
        /// changing its route. Used to reconcile a journal entry on restart.
        pub async fn dispatch_receipt(
            &self,
            occurrence_id: &str,
        ) -> StorageResult<Option<DispatchReceipt>> {
            validate_occurrence_id(occurrence_id)?;
            self.read(DISPATCH, occurrence_id).await
        }

        /// Claim pending dispatch once. A claimed receipt is never resent by
        /// this API, even if the claimant process later dies.
        pub async fn claim_dispatch(
            &self,
            occurrence_id: &str,
            claimant: &str,
        ) -> StorageResult<DispatchClaim> {
            validate_occurrence_id(occurrence_id)?;
            if claimant.is_empty() {
                return Err(StorageError::InvalidConfig(
                    "channel dispatch claimant is empty".into(),
                ));
            }
            let query = format!(
                "UPDATE {DISPATCH}:{occurrence_id} SET state = 'claimed', claimant = $claimant, \
                 updated_at = $now WHERE state = 'pending' RETURN AFTER"
            );
            let mut response = self
                .db
                .query(query)
                .bind(("claimant", claimant.to_owned()))
                .bind(("now", chrono::Utc::now().to_rfc3339()))
                .await
                .map_err(db_error)?
                .check()
                .map_err(db_error)?;
            let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
            if let Some(receipt) = rows.into_iter().next() {
                let receipt: DispatchReceipt = decode(receipt)?;
                return Ok(DispatchClaim::Acquired(receipt));
            }
            Ok(match self.read(DISPATCH, occurrence_id).await? {
                Some(receipt) => DispatchClaim::NotClaimable(receipt),
                None => DispatchClaim::NotDispatchable,
            })
        }

        /// Mark an owned claim complete only after its execution owner confirms.
        pub async fn complete_dispatch(
            &self,
            occurrence_id: &str,
            claimant: &str,
        ) -> StorageResult<DispatchState> {
            self.transition_claim(occurrence_id, claimant, DispatchState::Completed)
                .await
        }

        /// Preserve an owned claim's uncertain effect without retrying it.
        pub async fn mark_uncertain(
            &self,
            occurrence_id: &str,
            claimant: &str,
        ) -> StorageResult<DispatchState> {
            self.transition_claim(occurrence_id, claimant, DispatchState::Uncertain)
                .await
        }

        /// List only never-claimed work for restart recovery. Claimed work is
        /// intentionally excluded because its external effect may have fired.
        pub async fn pending_dispatches(
            &self,
            limit: usize,
        ) -> StorageResult<Vec<DispatchReceipt>> {
            let query = format!(
                "SELECT occurrence_id, scope_key, scope, native_message_id, action_id, handler, \
                 route_revision, state, claimant, \
                 recorded_at, updated_at FROM {DISPATCH} WHERE state = 'pending' \
                 ORDER BY recorded_at ASC, occurrence_id ASC LIMIT $limit"
            );
            let mut response = self
                .db
                .query(query)
                .bind(("limit", limit.min(1000) as i64))
                .await
                .map_err(db_error)?
                .check()
                .map_err(db_error)?;
            let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
            rows.into_iter().map(decode).collect()
        }

        /// Expose claimed and uncertain receipts for startup/operator
        /// reconciliation. A claim left by a crashed process is an uncertain
        /// effect, but this read does not rewrite another active host's claim.
        /// Neither state is eligible for automatic dispatch recovery.
        pub async fn unresolved_dispatches(
            &self,
            limit: usize,
        ) -> StorageResult<Vec<DispatchReceipt>> {
            let query = format!(
                "SELECT occurrence_id, scope_key, scope, native_message_id, action_id, handler, \
                 route_revision, state, claimant, recorded_at, updated_at FROM {DISPATCH} \
                 WHERE state = 'claimed' OR state = 'uncertain' \
                 ORDER BY updated_at ASC, occurrence_id ASC LIMIT $limit"
            );
            let mut response = self
                .db
                .query(query)
                .bind(("limit", limit.min(1000) as i64))
                .await
                .map_err(db_error)?
                .check()
                .map_err(db_error)?;
            let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
            rows.into_iter().map(decode).collect()
        }

        /// Change affinity for future occurrences with an exact revision CAS.
        /// The caller must authorize the reassignment. Historical occurrences
        /// and route revisions are never modified.
        pub async fn reassign(
            &self,
            scope: &ChannelScope,
            expected_revision: u64,
            authorized_decision: &RouteDecision,
        ) -> StorageResult<RouteAffinity> {
            scope.validate()?;
            let RouteOutcome::Selected { handler } = &authorized_decision.outcome else {
                return Err(StorageError::InvalidConfig(
                    "reassignment requires one selected handler".into(),
                ));
            };
            if handler.is_empty() || expected_revision == 0 || expected_revision >= i64::MAX as u64
            {
                return Err(StorageError::InvalidConfig(
                    "reassignment requires handler and existing route revision".into(),
                ));
            }
            let key = scope.key();
            let next = expected_revision
                .checked_add(1)
                .ok_or_else(|| StorageError::InvalidConfig("route revision overflow".into()))?;
            let route = RouteAffinity {
                scope_key: key.clone(),
                scope: scope.clone(),
                handler: handler.clone(),
                revision: next,
                binding_revision: authorized_decision.binding_revision.clone(),
                recorded_at: chrono::Utc::now().to_rfc3339(),
            };
            let revision_id = digest_parts(&["channel-route-revision-v1", &key, &next.to_string()]);
            let query = format!(
                "BEGIN TRANSACTION; \
                 LET $current = SELECT * FROM ONLY {AFFINITY}:{key} FOR UPDATE; \
                 IF $current = NONE OR $current.revision != $expected {{ \
                     THROW 'channel route revision conflict' \
                 }}; \
                 UPDATE ONLY {AFFINITY}:{key} CONTENT $route; \
                 CREATE ONLY {REVISIONS}:{revision_id} CONTENT $revision; \
                 COMMIT TRANSACTION;"
            );
            self.db
                .query(query)
                .bind(("expected", expected_revision as i64))
                .bind(("route", serde_json::to_value(&route).map_err(encode_error)?))
                .bind((
                    "revision",
                    serde_json::json!({
                        "scope_key": key,
                        "revision": next,
                        "decision": authorized_decision,
                        "recorded_at": route.recorded_at,
                    }),
                ))
                .await
                .map_err(db_error)?
                .check()
                .map_err(db_error)?;
            Ok(route)
        }

        async fn write_admission(
            &self,
            row: &SourceOccurrenceReceipt,
            affinity: Option<&RouteAffinity>,
        ) -> StorageResult<()> {
            let id = &row.occurrence_id;
            let mut query = String::from("BEGIN TRANSACTION; ");
            let mut proposed_affinity = None;
            let mut revision_row = None;
            if let RouteOutcome::Selected { handler } = &row.decision.outcome {
                match affinity {
                    None => {
                        let route = RouteAffinity {
                            scope_key: row.scope_key.clone(),
                            scope: row.scope.clone(),
                            handler: handler.clone(),
                            revision: 1,
                            binding_revision: row.decision.binding_revision.clone(),
                            recorded_at: row.recorded_at.clone(),
                        };
                        let revision_id =
                            digest_parts(&["channel-route-revision-v1", &row.scope_key, "1"]);
                        query.push_str(&format!(
                            "CREATE ONLY {AFFINITY}:{} CONTENT $affinity; \
                             CREATE ONLY {REVISIONS}:{revision_id} CONTENT $revision; ",
                            row.scope_key
                        ));
                        revision_row = Some(serde_json::json!({
                            "scope_key": row.scope_key,
                            "revision": 1,
                            "decision": row.decision,
                            "recorded_at": row.recorded_at,
                        }));
                        proposed_affinity = Some(route);
                    }
                    Some(existing) => {
                        query.push_str(&format!(
                            "LET $current = SELECT * FROM ONLY {AFFINITY}:{} FOR UPDATE; \
                             IF $current = NONE OR $current.revision != $expected {{ \
                                 THROW 'channel route revision changed' \
                             }}; ",
                            row.scope_key
                        ));
                        debug_assert_eq!(existing.handler, *handler);
                    }
                }
            }
            query.push_str(&format!(
                "CREATE ONLY {OCCURRENCES}:{id} CONTENT $occurrence; "
            ));
            if let RouteOutcome::Selected { handler } = &row.decision.outcome {
                let revision = row.route_revision.expect("selected route has revision");
                let receipt = DispatchReceipt {
                    occurrence_id: id.clone(),
                    scope_key: row.scope_key.clone(),
                    scope: row.scope.clone(),
                    native_message_id: row.native_message_id.clone(),
                    action_id: digest_parts(&["channel-dispatch-v1", id]),
                    handler: handler.clone(),
                    route_revision: revision,
                    state: DispatchState::Pending,
                    claimant: None,
                    recorded_at: row.recorded_at.clone(),
                    updated_at: row.recorded_at.clone(),
                };
                query.push_str(&format!("CREATE ONLY {DISPATCH}:{id} CONTENT $dispatch; "));
                let mut request = self.db.query(format!("{query} COMMIT TRANSACTION;"));
                request = request.bind((
                    "occurrence",
                    serde_json::to_value(row).map_err(encode_error)?,
                ));
                request = request.bind((
                    "dispatch",
                    serde_json::to_value(receipt).map_err(encode_error)?,
                ));
                if let Some(route) = proposed_affinity {
                    request = request.bind((
                        "affinity",
                        serde_json::to_value(route).map_err(encode_error)?,
                    ));
                }
                if let Some(revision_row) = revision_row {
                    request = request.bind(("revision", revision_row));
                }
                if let Some(existing) = affinity {
                    request = request.bind(("expected", existing.revision as i64));
                }
                request.await.map_err(db_error)?.check().map_err(db_error)?;
            } else {
                self.db
                    .query(format!("{query} COMMIT TRANSACTION;"))
                    .bind((
                        "occurrence",
                        serde_json::to_value(row).map_err(encode_error)?,
                    ))
                    .await
                    .map_err(db_error)?
                    .check()
                    .map_err(db_error)?;
            }
            Ok(())
        }

        async fn admission(
            &self,
            row: SourceOccurrenceReceipt,
            is_new: bool,
        ) -> StorageResult<RouteAdmission> {
            let dispatch: Option<DispatchReceipt> = self.read(DISPATCH, &row.occurrence_id).await?;
            if matches!(&row.decision.outcome, RouteOutcome::Selected { .. }) && dispatch.is_none()
            {
                return Err(StorageError::Backend(format!(
                    "selected channel occurrence {} has no dispatch receipt",
                    row.occurrence_id
                )));
            }
            Ok(RouteAdmission {
                occurrence_id: row.occurrence_id,
                route_revision: row.route_revision,
                is_new,
                outcome: row.decision.outcome,
                action_id: dispatch.as_ref().map(|d| d.action_id.clone()),
                dispatch: dispatch.map(|d| d.state),
            })
        }

        async fn transition_claim(
            &self,
            occurrence_id: &str,
            claimant: &str,
            target: DispatchState,
        ) -> StorageResult<DispatchState> {
            validate_occurrence_id(occurrence_id)?;
            if claimant.is_empty() {
                return Err(StorageError::InvalidConfig(
                    "channel dispatch claimant is empty".into(),
                ));
            }
            let state = match target {
                DispatchState::Completed => "completed",
                DispatchState::Uncertain => "uncertain",
                _ => {
                    return Err(StorageError::InvalidConfig(
                        "invalid channel dispatch terminal state".into(),
                    ))
                }
            };
            let query = format!(
                "UPDATE {DISPATCH}:{occurrence_id} SET state = $state, updated_at = $now \
                 WHERE state = 'claimed' AND claimant = $claimant RETURN AFTER"
            );
            let mut response = self
                .db
                .query(query)
                .bind(("state", state))
                .bind(("claimant", claimant.to_owned()))
                .bind(("now", chrono::Utc::now().to_rfc3339()))
                .await
                .map_err(db_error)?
                .check()
                .map_err(db_error)?;
            let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
            if let Some(receipt) = rows.into_iter().next() {
                let receipt: DispatchReceipt = decode(receipt)?;
                return Ok(receipt.state);
            }
            Err(StorageError::Backend(format!(
                "channel dispatch {occurrence_id} is not claimed by this caller"
            )))
        }

        async fn read<T: serde::de::DeserializeOwned>(
            &self,
            table: &str,
            id: &str,
        ) -> StorageResult<Option<T>> {
            let row: Option<serde_json::Value> =
                self.db.select((table, id)).await.map_err(db_error)?;
            row.map(decode).transpose()
        }
    }

    fn validate_occurrence_id(value: &str) -> StorageResult<()> {
        if value.len() != 64 || !value.bytes().all(|c| c.is_ascii_hexdigit()) {
            return Err(StorageError::InvalidConfig(
                "channel occurrence ID must be a SHA-256 hex digest".into(),
            ));
        }
        Ok(())
    }

    fn decode<T: serde::de::DeserializeOwned>(row: serde_json::Value) -> StorageResult<T> {
        serde_json::from_value(row)
            .map_err(|error| StorageError::Backend(format!("malformed channel route row: {error}")))
    }

    fn db_error(error: surrealdb::Error) -> StorageError {
        StorageError::Backend(error.to_string())
    }

    fn encode_error(error: serde_json::Error) -> StorageError {
        StorageError::Backend(format!("channel route metadata encoding failed: {error}"))
    }
}

#[cfg(feature = "surreal-backend")]
pub use surreal_impl::ChannelRouteStore;
