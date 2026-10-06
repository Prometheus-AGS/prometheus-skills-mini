use super::actions::{action_id, existing_admission, request_hash, ObserverAppend};
use super::*;

impl ChannelActionStore {
    /// Register an independent observer cursor. Re-registering the same
    /// identity is idempotent; a changed recipient/filter/grant needs a new ID.
    pub async fn subscribe_observer(
        &self,
        request: &ObserverSubscriptionRequest,
    ) -> StorageResult<ObserverSubscription> {
        for (name, value) in [
            ("subscription_id", &request.subscription_id),
            ("subscriber_id", &request.subscriber_id),
            ("observer_instance_id", &request.observer_instance_id),
            ("uar_workspace_id", &request.uar_workspace_id),
            ("filter_id", &request.filter_id),
            ("source_grant_issuer", &request.source_grant_issuer),
            ("source_grant_id", &request.source_grant_id),
            ("recipient_grant_issuer", &request.recipient_grant_issuer),
            ("recipient_grant_id", &request.recipient_grant_id),
            ("grant_revision", &request.grant_revision),
        ] {
            required(value, name)?;
        }
        let key = subscription_record_id(&request.subscription_id);
        if let Some(existing) = self
            .read::<ObserverSubscription>(SUBSCRIPTIONS, &key)
            .await?
        {
            return same_subscription(existing, request);
        }
        let timestamp = now();
        let row = ObserverSubscription {
            subscription_id: request.subscription_id.clone(),
            subscriber_id: request.subscriber_id.clone(),
            observer_instance_id: request.observer_instance_id.clone(),
            uar_workspace_id: request.uar_workspace_id.clone(),
            filter_id: request.filter_id.clone(),
            source_grant_issuer: request.source_grant_issuer.clone(),
            source_grant_id: request.source_grant_id.clone(),
            recipient_grant_issuer: request.recipient_grant_issuer.clone(),
            recipient_grant_id: request.recipient_grant_id.clone(),
            grant_revision: request.grant_revision.clone(),
            status: ObserverStatus::Active,
            next_sequence: 1,
            ack_sequence: 0,
            recorded_at: timestamp.clone(),
            updated_at: timestamp,
        };
        let sql = format!("CREATE ONLY {SUBSCRIPTIONS}:{key} CONTENT $subscription");
        match self
            .db
            .query(sql)
            .bind(("subscription", encode(&row)?))
            .await
            .map_err(db_error)?
            .check()
        {
            Ok(_) => Ok(row),
            Err(error) => match self.read(SUBSCRIPTIONS, &key).await? {
                Some(existing) => same_subscription(existing, request),
                None => Err(db_error(error)),
            },
        }
    }

    /// Read one subscription for operator administration and restart recovery.
    pub async fn get_observer_subscription(
        &self,
        subscription_id: &str,
    ) -> StorageResult<Option<ObserverSubscription>> {
        required(subscription_id, "subscription_id")?;
        self.read(SUBSCRIPTIONS, &subscription_record_id(subscription_id))
            .await
    }

    /// Enumerate durable subscriptions for owner-only administration.
    /// The caller must authorize this operation before returning records.
    pub async fn list_observer_subscriptions(
        &self,
        limit: usize,
    ) -> StorageResult<Vec<ObserverSubscription>> {
        let sql = format!("SELECT * FROM {SUBSCRIPTIONS} ORDER BY recorded_at ASC LIMIT $limit");
        let mut response = self
            .db
            .query(sql)
            .bind(("limit", limit.min(1000) as i64))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
        rows.into_iter().map(decode).collect()
    }

    /// Enumerate subscriptions matching an externally authorized source filter.
    pub async fn list_observer_subscriptions_for_filter(
        &self,
        filter_id: &str,
        limit: usize,
    ) -> StorageResult<Vec<ObserverSubscription>> {
        required(filter_id, "filter_id")?;
        let sql = format!(
            "SELECT * FROM {SUBSCRIPTIONS} WHERE filter_id = $filter_id \
            AND status = 'active' ORDER BY recorded_at ASC LIMIT $limit"
        );
        let mut response = self
            .db
            .query(sql)
            .bind(("filter_id", filter_id.to_owned()))
            .bind(("limit", limit.min(1000) as i64))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
        rows.into_iter().map(decode).collect()
    }

    /// Atomically admit one observer copy, charge root-wide fanout, allocate
    /// this subscriber's next sequence, and create its pending delivery row.
    /// The caller must have evaluated source disclosure and recipient delivery
    /// and must recheck current authority before [`Self::claim_observer_delivery`].
    pub async fn enqueue_observer_delivery(
        &self,
        request: &ObserverDeliveryRequest,
    ) -> StorageResult<ObserverDeliveryAdmission> {
        required(&request.subscription_id, "subscription_id")?;
        required(&request.grant_revision, "grant_revision")?;
        required(
            &request.projection.source_grant_issuer,
            "source_grant_issuer",
        )?;
        required(&request.projection.source_grant_id, "source_grant_id")?;
        required(
            &request.projection.source_grant_revision,
            "source_grant_revision",
        )?;
        required(&request.projection.classification, "classification")?;
        let text = request.projection.text.as_deref().ok_or_else(|| {
            StorageError::InvalidConfig("observer delivery requires a filtered text projection".into())
        })?;
        let projection_sha256 = hex::encode(Sha256::digest(text.as_bytes()));
        validate_digest(&request.occurrence_id, "occurrence_id")?;
        if request.action.kind != ActionKind::ObserverCopy
            || request.action.source_occurrence_id != request.occurrence_id
        {
            return Err(StorageError::InvalidConfig(
                "observer delivery action must copy its exact source occurrence".into(),
            ));
        }
        let mut action = request.action.clone();
        action.action_key = digest_parts(&[
            "observer-copy-action-v1",
            &request.subscription_id,
            &request.occurrence_id,
        ]);
        let action_id = action_id(&action);
        let action_hash = request_hash(&action)?;
        let delivery_id = delivery_record_id(&request.subscription_id, &request.occurrence_id);
        let subscription_key = subscription_record_id(&request.subscription_id);
        let mut last_error = None;
        for _ in 0..4 {
            if let Some(existing) = self
                .read::<ObserverDeliveryReceipt>(DELIVERIES, &delivery_id)
                .await?
            {
                return existing_delivery(existing, &action_id, &request.grant_revision);
            }
            if let Some(existing) = self.read::<ActionReceipt>(ACTIONS, &action_id).await? {
                match existing_admission(existing, &action_hash)? {
                    ActionAdmission::Suppressed(receipt) => {
                        return Ok(ObserverDeliveryAdmission::Suppressed(Box::new(receipt)));
                    }
                    _ => {
                        return Err(StorageError::Backend(
                            "observer action exists without its atomic delivery".into(),
                        ));
                    }
                }
            }
            let subscription: ObserverSubscription = self
                .read(SUBSCRIPTIONS, &subscription_key)
                .await?
                .ok_or_else(|| {
                    StorageError::InvalidConfig("observer subscription is absent".into())
                })?;
            if subscription.status != ObserverStatus::Active
                || subscription.grant_revision != request.grant_revision
                || subscription.source_grant_issuer != request.projection.source_grant_issuer
                || subscription.source_grant_id != request.projection.source_grant_id
            {
                return Err(StorageError::InvalidConfig(
                    "observer subscription is inactive or its grant revision changed".into(),
                ));
            }
            let prepared = self.prepare_action(&action).await?;
            if !prepared.charge {
                match self.commit_action(&prepared, None).await {
                    Ok(()) => {
                        return Ok(ObserverDeliveryAdmission::Suppressed(Box::new(
                            prepared.receipt,
                        )));
                    }
                    Err(error) => {
                        if let Some(existing) =
                            self.read::<ActionReceipt>(ACTIONS, &action_id).await?
                        {
                            match existing_admission(existing, &action_hash)? {
                                ActionAdmission::Suppressed(receipt) => {
                                    return Ok(ObserverDeliveryAdmission::Suppressed(Box::new(
                                        receipt,
                                    )));
                                }
                                _ => return Err(error),
                            }
                        }
                        last_error = Some(error);
                        continue;
                    }
                }
            }
            if subscription.next_sequence >= i64::MAX as u64 {
                return Err(StorageError::InvalidConfig(
                    "observer sequence exceeded SurrealDB integer range".into(),
                ));
            }
            let mut after = subscription.clone();
            after.next_sequence += 1;
            after.updated_at = now();
            let timestamp = now();
            let delivery = ObserverDeliveryReceipt {
                delivery_id: delivery_id.clone(),
                subscription_id: request.subscription_id.clone(),
                subscriber_id: subscription.subscriber_id.clone(),
                occurrence_id: request.occurrence_id.clone(),
                action_id: action_id.clone(),
                sequence: subscription.next_sequence,
                grant_revision: request.grant_revision.clone(),
                projection_sha256: projection_sha256.clone(),
                classification: request.projection.classification.clone(),
                state: ObserverDeliveryState::Pending,
                claimant: None,
                withheld_reason: None,
                recorded_at: timestamp.clone(),
                updated_at: timestamp.clone(),
            };
            let append = ObserverAppend {
                subscription_before: subscription.clone(),
                subscription_after: after,
                delivery: delivery.clone(),
                projection: StoredObserverProjection {
                    delivery_id: delivery_id.clone(),
                    source_grant_issuer: request.projection.source_grant_issuer.clone(),
                    source_grant_id: request.projection.source_grant_id.clone(),
                    source_grant_revision: request.projection.source_grant_revision.clone(),
                    classification: request.projection.classification.clone(),
                    text: request.projection.text.clone(),
                    recorded_at: timestamp,
                },
            };
            match self.commit_action(&prepared, Some(&append)).await {
                Ok(()) => return Ok(ObserverDeliveryAdmission::Queued(delivery)),
                Err(error) => {
                    if let Some(existing) = self
                        .read::<ObserverDeliveryReceipt>(DELIVERIES, &delivery_id)
                        .await?
                    {
                        return existing_delivery(existing, &action_id, &request.grant_revision);
                    }
                    let latest_root: Option<CausalRoot> =
                        self.read(ROOTS, &action.root_occurrence_id).await?;
                    let latest_sub: Option<ObserverSubscription> =
                        self.read(SUBSCRIPTIONS, &subscription_key).await?;
                    let root_changed = latest_root.as_ref().map(|r| r.fanout_used)
                        != prepared.root_before.as_ref().map(|r| r.fanout_used);
                    let subscriber_changed = latest_sub.as_ref().map(|s| s.next_sequence)
                        != Some(subscription.next_sequence);
                    if !root_changed && !subscriber_changed {
                        return Err(error);
                    }
                    last_error = Some(error);
                }
            }
        }
        Err(last_error.unwrap_or_else(|| {
            StorageError::Backend("observer delivery admission conflict".into())
        }))
    }

    /// Read one subscription's independently advancing cursor.
    pub async fn observer_cursor(&self, subscription_id: &str) -> StorageResult<ObserverCursor> {
        let subscription = self.subscription(subscription_id).await?;
        Ok(ObserverCursor {
            next_sequence: subscription.next_sequence,
            ack_sequence: subscription.ack_sequence,
        })
    }

    /// Recover all unacknowledged queue states, including delivered and
    /// withheld receipts that only need a contiguous cursor acknowledgement.
    pub async fn observer_deliveries_after_cursor(
        &self,
        subscription_id: &str,
        limit: usize,
    ) -> StorageResult<Vec<ObserverDeliveryReceipt>> {
        let subscription = self.subscription(subscription_id).await?;
        let sql = format!(
            "SELECT * FROM {DELIVERIES} WHERE subscription_id = $subscription_id \
             AND sequence > $cursor ORDER BY sequence ASC LIMIT $limit"
        );
        let mut response = self
            .db
            .query(sql)
            .bind(("subscription_id", subscription_id.to_owned()))
            .bind(("cursor", subscription.ack_sequence as i64))
            .bind(("limit", limit.min(1000) as i64))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
        rows.into_iter().map(decode).collect()
    }

    /// Return a queued recipient's filtered text only after current Gate
    /// source disclosure and delivery grants have both been rechecked. The
    /// caller owns that evaluation; this method binds its exact identities
    /// and revisions to the immutable projection and claimed delivery.
    pub async fn released_observer_projection(
        &self,
        subscription_id: &str,
        sequence: u64,
        current_source_grant_issuer: &str,
        current_source_grant_id: &str,
        current_source_grant_revision: &str,
        current_delivery_grant_revision: &str,
    ) -> StorageResult<Option<ObserverProjection>> {
        for (name, value) in [
            ("source_grant_issuer", current_source_grant_issuer),
            ("source_grant_id", current_source_grant_id),
            ("source_grant_revision", current_source_grant_revision),
            ("delivery_grant_revision", current_delivery_grant_revision),
        ] {
            required(value, name)?;
        }
        let subscription = self.subscription(subscription_id).await?;
        let Some(delivery) = self.delivery_by_sequence(subscription_id, sequence).await? else {
            return Ok(None);
        };
        if subscription.status != ObserverStatus::Active
            || subscription.source_grant_issuer != current_source_grant_issuer
            || subscription.source_grant_id != current_source_grant_id
            || subscription.grant_revision != current_delivery_grant_revision
            || delivery.grant_revision != current_delivery_grant_revision
            || delivery.state != ObserverDeliveryState::Claimed
        {
            return Ok(None);
        }
        let Some(projection) = self
            .read::<StoredObserverProjection>(PROJECTIONS, &delivery.delivery_id)
            .await?
        else {
            return Err(StorageError::Backend(
                "claimed observer delivery is missing its projection".into(),
            ));
        };
        if projection.delivery_id != delivery.delivery_id
            || projection.source_grant_issuer != current_source_grant_issuer
            || projection.source_grant_id != current_source_grant_id
            || projection.source_grant_revision != current_source_grant_revision
        {
            return Ok(None);
        }
        Ok(Some(ObserverProjection {
            source_grant_issuer: projection.source_grant_issuer,
            source_grant_id: projection.source_grant_id,
            source_grant_revision: projection.source_grant_revision,
            classification: projection.classification,
            text: projection.text,
        }))
    }

    /// Read pending copies after this subscriber's acknowledged cursor.
    pub async fn pending_observer_deliveries(
        &self,
        subscription_id: &str,
        limit: usize,
    ) -> StorageResult<Vec<ObserverDeliveryReceipt>> {
        let subscription = self.subscription(subscription_id).await?;
        let sql = format!(
            "SELECT * FROM {DELIVERIES} WHERE subscription_id = $subscription_id \
             AND sequence > $cursor AND state = 'pending' \
             ORDER BY sequence ASC LIMIT $limit"
        );
        let mut response = self
            .db
            .query(sql)
            .bind(("subscription_id", subscription_id.to_owned()))
            .bind(("cursor", subscription.ack_sequence as i64))
            .bind(("limit", limit.min(1000) as i64))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
        rows.into_iter().map(decode).collect()
    }

    /// Show claimed or uncertain copies for operator reconciliation; never
    /// publish these automatically after restart.
    pub async fn unresolved_observer_deliveries(
        &self,
        subscription_id: &str,
        limit: usize,
    ) -> StorageResult<Vec<ObserverDeliveryReceipt>> {
        let _ = self.subscription(subscription_id).await?;
        let sql = format!(
            "SELECT * FROM {DELIVERIES} WHERE subscription_id = $subscription_id \
             AND (state = 'claimed' OR state = 'uncertain') \
             ORDER BY sequence ASC LIMIT $limit"
        );
        let mut response = self
            .db
            .query(sql)
            .bind(("subscription_id", subscription_id.to_owned()))
            .bind(("limit", limit.min(1000) as i64))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
        rows.into_iter().map(decode).collect()
    }

    /// Claim one pending copy after the caller has rechecked current Gate
    /// disclosure and recipient delivery authority at `grant_revision`.
    pub async fn claim_observer_delivery(
        &self,
        subscription_id: &str,
        sequence: u64,
        claimant: &str,
        current_grant_revision: &str,
    ) -> StorageResult<ObserverDeliveryClaim> {
        required(claimant, "claimant")?;
        required(current_grant_revision, "current_grant_revision")?;
        let subscription = self.subscription(subscription_id).await?;
        let Some(delivery) = self.delivery_by_sequence(subscription_id, sequence).await? else {
            return Ok(ObserverDeliveryClaim::Missing);
        };
        if subscription.status != ObserverStatus::Active
            || subscription.grant_revision != current_grant_revision
            || delivery.grant_revision != current_grant_revision
            || delivery.state != ObserverDeliveryState::Pending
        {
            return Ok(ObserverDeliveryClaim::NotClaimable(delivery));
        }
        let sub_key = subscription_record_id(subscription_id);
        let id = &delivery.delivery_id;
        let action_id = &delivery.action_id;
        let sql = format!(
            "BEGIN TRANSACTION; \
             LET $sub = SELECT * FROM ONLY {SUBSCRIPTIONS}:{sub_key} FOR UPDATE; \
             IF $sub = NONE OR $sub.status != 'active' \
                OR $sub.grant_revision != $grant_revision {{ \
                 THROW 'observer authority changed' \
             }}; \
             LET $delivery = SELECT * FROM ONLY {DELIVERIES}:{id} FOR UPDATE; \
             IF $delivery = NONE OR $delivery.state != 'pending' \
                OR $delivery.grant_revision != $grant_revision {{ \
                 THROW 'observer delivery changed' \
             }}; \
             LET $action = SELECT * FROM ONLY {ACTIONS}:{action_id} FOR UPDATE; \
             IF $action = NONE OR $action.state != 'pending' \
                OR $action.kind != 'observer_copy' {{ \
                 THROW 'observer action changed' \
             }}; \
             UPDATE ONLY {DELIVERIES}:{id} SET state = 'claimed', claimant = $claimant, \
                 updated_at = $now; \
             UPDATE ONLY {ACTIONS}:{action_id} SET state = 'claimed', claimant = $claimant, \
                 updated_at = $now WHERE state = 'pending'; \
             COMMIT TRANSACTION;"
        );
        let result = self
            .db
            .query(sql)
            .bind(("grant_revision", current_grant_revision.to_owned()))
            .bind(("claimant", claimant.to_owned()))
            .bind(("now", now()))
            .await
            .map_err(db_error)?
            .check();
        match result {
            Ok(_) => Ok(ObserverDeliveryClaim::Acquired(
                self.read(DELIVERIES, id).await?.ok_or_else(|| {
                    StorageError::Backend("claimed observer delivery disappeared".into())
                })?,
            )),
            Err(error) => {
                let latest_subscription = self.subscription(subscription_id).await?;
                match self.read::<ObserverDeliveryReceipt>(DELIVERIES, id).await? {
                    None => Ok(ObserverDeliveryClaim::Missing),
                    Some(current)
                        if current.state != ObserverDeliveryState::Pending
                            || latest_subscription.status != ObserverStatus::Active
                            || latest_subscription.grant_revision != current_grant_revision
                            || current.grant_revision != current_grant_revision =>
                    {
                        Ok(ObserverDeliveryClaim::NotClaimable(current))
                    }
                    Some(_) => Err(db_error(error)),
                }
            }
        }
    }

    /// Confirm recipient delivery for the matching claimant and action.
    pub async fn complete_observer_delivery(
        &self,
        subscription_id: &str,
        sequence: u64,
        claimant: &str,
    ) -> StorageResult<ObserverDeliveryState> {
        self.transition_delivery(subscription_id, sequence, claimant, "delivered")
            .await
    }

    /// Record an uncertain delivery result without retransmitting the copy.
    pub async fn mark_observer_uncertain(
        &self,
        subscription_id: &str,
        sequence: u64,
        claimant: &str,
    ) -> StorageResult<ObserverDeliveryState> {
        self.transition_delivery(subscription_id, sequence, claimant, "uncertain")
            .await
    }

    /// Terminally withhold a pending copy after current authority is denied.
    pub async fn withhold_observer_delivery(
        &self,
        subscription_id: &str,
        sequence: u64,
        reason: &str,
    ) -> StorageResult<ObserverDeliveryState> {
        required(reason, "withheld reason")?;
        let delivery = self
            .delivery_by_sequence(subscription_id, sequence)
            .await?
            .ok_or_else(|| StorageError::InvalidConfig("observer delivery is absent".into()))?;
        let id = &delivery.delivery_id;
        let action_id = &delivery.action_id;
        let sql = format!(
            "BEGIN TRANSACTION; \
             LET $delivery = SELECT * FROM ONLY {DELIVERIES}:{id} FOR UPDATE; \
             IF $delivery = NONE OR $delivery.state != 'pending' {{ \
                 THROW 'observer delivery is not pending' \
             }}; \
             LET $action = SELECT * FROM ONLY {ACTIONS}:{action_id} FOR UPDATE; \
             IF $action = NONE OR $action.state != 'pending' {{ \
                 THROW 'observer action is not pending' \
             }}; \
             UPDATE ONLY {DELIVERIES}:{id} SET state = 'withheld', \
                 withheld_reason = $reason, updated_at = $now; \
             UPDATE ONLY {ACTIONS}:{action_id} SET state = 'withheld', updated_at = $now \
                 WHERE state = 'pending'; \
             COMMIT TRANSACTION;"
        );
        self.db
            .query(sql)
            .bind(("reason", reason.to_owned()))
            .bind(("now", now()))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        Ok(ObserverDeliveryState::Withheld)
    }

    /// Advance one subscriber's cursor only over a contiguous delivered or
    /// withheld sequence. Repeated acknowledgement is idempotent.
    pub async fn ack_observer_delivery(
        &self,
        subscription_id: &str,
        sequence: u64,
    ) -> StorageResult<ObserverCursor> {
        let subscription = self.subscription(subscription_id).await?;
        if sequence <= subscription.ack_sequence {
            return Ok(ObserverCursor {
                next_sequence: subscription.next_sequence,
                ack_sequence: subscription.ack_sequence,
            });
        }
        if sequence != subscription.ack_sequence + 1 {
            return Err(StorageError::InvalidConfig(
                "observer cursor cannot skip an unacknowledged delivery".into(),
            ));
        }
        let delivery = self
            .delivery_by_sequence(subscription_id, sequence)
            .await?
            .ok_or_else(|| StorageError::InvalidConfig("observer delivery is absent".into()))?;
        if !matches!(
            delivery.state,
            ObserverDeliveryState::Delivered | ObserverDeliveryState::Withheld
        ) {
            return Err(StorageError::InvalidConfig(
                "observer delivery has no terminal acknowledgement state".into(),
            ));
        }
        let sub_key = subscription_record_id(subscription_id);
        let id = &delivery.delivery_id;
        let sql = format!(
            "BEGIN TRANSACTION; \
             LET $sub = SELECT * FROM ONLY {SUBSCRIPTIONS}:{sub_key} FOR UPDATE; \
             IF $sub = NONE OR $sub.ack_sequence != $expected_cursor {{ \
                 THROW 'observer cursor changed' \
             }}; \
             LET $delivery = SELECT * FROM ONLY {DELIVERIES}:{id} FOR UPDATE; \
             IF $delivery = NONE OR $delivery.sequence != $sequence \
                OR ($delivery.state != 'delivered' AND $delivery.state != 'withheld') {{ \
                 THROW 'observer delivery is not acknowledgeable' \
             }}; \
             UPDATE ONLY {SUBSCRIPTIONS}:{sub_key} SET ack_sequence = $sequence, \
                 updated_at = $now; COMMIT TRANSACTION;"
        );
        match self
            .db
            .query(sql)
            .bind(("expected_cursor", subscription.ack_sequence as i64))
            .bind(("sequence", sequence as i64))
            .bind(("now", now()))
            .await
            .map_err(db_error)?
            .check()
        {
            Ok(_) => self.observer_cursor(subscription_id).await,
            Err(error) => {
                let latest = self.observer_cursor(subscription_id).await?;
                if sequence <= latest.ack_sequence {
                    Ok(latest)
                } else {
                    Err(db_error(error))
                }
            }
        }
    }

    /// Pause or revoke a subscription by exact current status. Revocation is
    /// terminal; a new grant must use a new subscription ID.
    pub async fn set_observer_status(
        &self,
        subscription_id: &str,
        expected: ObserverStatus,
        target: ObserverStatus,
    ) -> StorageResult<ObserverSubscription> {
        if target == ObserverStatus::Active || expected == ObserverStatus::Revoked {
            return Err(StorageError::InvalidConfig(
                "reactivation requires a new subscription identity".into(),
            ));
        }
        let key = subscription_record_id(subscription_id);
        let sql = format!(
            "UPDATE {SUBSCRIPTIONS}:{key} SET status = $target, updated_at = $now \
             WHERE status = $expected RETURN AFTER"
        );
        let mut response = self
            .db
            .query(sql)
            .bind(("target", encode(target)?))
            .bind(("expected", encode(expected)?))
            .bind(("now", now()))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
        rows.into_iter()
            .next()
            .map(decode)
            .transpose()?
            .ok_or_else(|| {
                StorageError::InvalidConfig("observer status changed concurrently".into())
            })
    }

    async fn transition_delivery(
        &self,
        subscription_id: &str,
        sequence: u64,
        claimant: &str,
        target: &str,
    ) -> StorageResult<ObserverDeliveryState> {
        required(claimant, "claimant")?;
        let delivery = self
            .delivery_by_sequence(subscription_id, sequence)
            .await?
            .ok_or_else(|| StorageError::InvalidConfig("observer delivery is absent".into()))?;
        let id = &delivery.delivery_id;
        let action_id = &delivery.action_id;
        let sql = format!(
            "BEGIN TRANSACTION; \
             LET $delivery = SELECT * FROM ONLY {DELIVERIES}:{id} FOR UPDATE; \
             IF $delivery = NONE OR $delivery.state != 'claimed' \
                OR $delivery.claimant != $claimant {{ \
                 THROW 'observer delivery is not claimed by this caller' \
             }}; \
             LET $action = SELECT * FROM ONLY {ACTIONS}:{action_id} FOR UPDATE; \
             IF $action = NONE OR $action.state != 'claimed' \
                OR $action.claimant != $claimant {{ \
                 THROW 'observer action is not claimed by this caller' \
             }}; \
             UPDATE ONLY {DELIVERIES}:{id} SET state = $target, updated_at = $now; \
             UPDATE ONLY {ACTIONS}:{action_id} SET state = $action_target, updated_at = $now \
                 WHERE state = 'claimed' AND claimant = $claimant; \
             COMMIT TRANSACTION;"
        );
        let action_target = if target == "delivered" {
            "completed"
        } else {
            "uncertain"
        };
        self.db
            .query(sql)
            .bind(("target", target.to_owned()))
            .bind(("action_target", action_target.to_owned()))
            .bind(("claimant", claimant.to_owned()))
            .bind(("now", now()))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        Ok(if target == "delivered" {
            ObserverDeliveryState::Delivered
        } else {
            ObserverDeliveryState::Uncertain
        })
    }

    async fn subscription(&self, subscription_id: &str) -> StorageResult<ObserverSubscription> {
        required(subscription_id, "subscription_id")?;
        self.read(SUBSCRIPTIONS, &subscription_record_id(subscription_id))
            .await?
            .ok_or_else(|| StorageError::InvalidConfig("observer subscription is absent".into()))
    }

    async fn delivery_by_sequence(
        &self,
        subscription_id: &str,
        sequence: u64,
    ) -> StorageResult<Option<ObserverDeliveryReceipt>> {
        required(subscription_id, "subscription_id")?;
        if sequence == 0 || sequence > i64::MAX as u64 {
            return Err(StorageError::InvalidConfig(
                "invalid observer sequence".into(),
            ));
        }
        let sql = format!(
            "SELECT * FROM {DELIVERIES} WHERE subscription_id = $subscription_id \
             AND sequence = $sequence LIMIT 1"
        );
        let mut response = self
            .db
            .query(sql)
            .bind(("subscription_id", subscription_id.to_owned()))
            .bind(("sequence", sequence as i64))
            .await
            .map_err(db_error)?
            .check()
            .map_err(db_error)?;
        let rows: Vec<serde_json::Value> = response.take(0).map_err(db_error)?;
        rows.into_iter().next().map(decode).transpose()
    }
}

fn same_subscription(
    existing: ObserverSubscription,
    request: &ObserverSubscriptionRequest,
) -> StorageResult<ObserverSubscription> {
    if existing.subscription_id != request.subscription_id
        || existing.subscriber_id != request.subscriber_id
        || existing.observer_instance_id != request.observer_instance_id
        || existing.uar_workspace_id != request.uar_workspace_id
        || existing.filter_id != request.filter_id
        || existing.source_grant_issuer != request.source_grant_issuer
        || existing.source_grant_id != request.source_grant_id
        || existing.recipient_grant_issuer != request.recipient_grant_issuer
        || existing.recipient_grant_id != request.recipient_grant_id
        || existing.grant_revision != request.grant_revision
    {
        return Err(StorageError::InvalidConfig(
            "subscription ID was reused for another recipient, filter or grant".into(),
        ));
    }
    Ok(existing)
}

fn existing_delivery(
    existing: ObserverDeliveryReceipt,
    expected_action_id: &str,
    expected_grant_revision: &str,
) -> StorageResult<ObserverDeliveryAdmission> {
    if existing.action_id != expected_action_id
        || existing.grant_revision != expected_grant_revision
    {
        return Err(StorageError::InvalidConfig(
            "observer delivery identity was reused with different action or grant".into(),
        ));
    }
    Ok(ObserverDeliveryAdmission::Replay(existing))
}
