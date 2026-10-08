//! Server-produced MCP provenance. Routing headers never establish identity.
use axum::{body::Body, http::{Request, HeaderMap}};
use serde::Serialize;
use std::net::SocketAddr;

pub const POLICY_REVISION: &str = "bossfang.mcp-inbound-policy/1";
pub const RESULT_META_KEY: &str = "ai.bossfang/mcp-attribution";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum McpMode { TrustedLocal, Service, AuthenticatedUser }
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum McpAuthnSource { LocalTransport, MasterApiKey, UserApiKey, DashboardSession, Oidc }

/// Non-secret inspection data, not a deserializable delegation credential.
#[derive(Clone, Debug, Serialize)]
pub struct McpAttribution {
    pub mode: McpMode,
    pub authenticated_subject: Option<String>,
    pub verified_tenant: Option<String>,
    pub verified_actor: Option<String>,
    pub authorized_agent_id: Option<String>,
    pub authn_source: McpAuthnSource,
    pub policy_revision: &'static str,
}

/// Opaque handler extractor; only crate-internal authentication producers can
/// construct it. No public constructor or deserializer accepts caller claims.
#[derive(Clone)]
pub struct AuthenticatedMcpAttribution(pub(crate) McpAttribution);

#[derive(Clone)]
pub(crate) struct McpDeploymentContext { loopback_listener: bool, external_auth_proxy: bool }
impl McpDeploymentContext {
    pub(crate) fn from_listener(listener: SocketAddr, external_auth_proxy: bool) -> Self {
        Self { loopback_listener: listener.ip().is_loopback(), external_auth_proxy }
    }
}

pub(crate) fn trusted_local(request: &Request<Body>) -> bool {
    request.extensions().get::<McpDeploymentContext>().is_some_and(|context|
        context.loopback_listener && !context.external_auth_proxy
        && request.extensions().get::<axum::extract::ConnectInfo<SocketAddr>>()
            .is_some_and(|peer| peer.0.ip().is_loopback()))
}

pub(crate) fn establish(request: &mut Request<Body>, source: McpAuthnSource, subject: Option<String>) {
    if request.uri().path().trim_end_matches('/') != "/mcp" { return; }
    let mode = match source {
        McpAuthnSource::LocalTransport => McpMode::TrustedLocal,
        McpAuthnSource::MasterApiKey => McpMode::Service,
        _ => McpMode::AuthenticatedUser,
    };
    request.extensions_mut().insert(AuthenticatedMcpAttribution(McpAttribution {
        mode, authenticated_subject: subject, verified_tenant: None, verified_actor: None,
        authorized_agent_id: None, authn_source: source, policy_revision: POLICY_REVISION,
    }));
}

/// The legacy derived dashboard token has service authority, not a registered
/// person's identity. This branch is selected only after actual token matching.
pub(crate) fn establish_legacy_dashboard(request: &mut Request<Body>) {
    establish(request, McpAuthnSource::DashboardSession, Some("dashboard:legacy-session".into()));
    if let Some(record) = request.extensions_mut().get_mut::<AuthenticatedMcpAttribution>() {
        record.0.mode = McpMode::Service;
    }
}

/// These reserved request selectors can only narrow/refuse a request. Existing
/// peer/channel/chat/account headers remain non-authentication routing context.
pub(crate) fn requested_authority_error(headers: &HeaderMap) -> Option<&'static str> {
    if ["x-bossfang-mcp-subject", "x-bossfang-mcp-tenant", "x-bossfang-mcp-actor", "x-bossfang-mcp-authn-source"]
        .iter().any(|name| headers.contains_key(*name)) {
        return Some("mcp_authority_override_invalid");
    }
    if let Some(mode) = headers.get("x-bossfang-mcp-mode") {
        return Some(if mode.to_str().ok() == Some("delegated_user") {
            "mcp_delegated_user_mapping_unsupported"
        } else { "mcp_mode_selector_unsupported" });
    }
    None
}

/// Add inspection metadata without rewriting content or existing other keys.
/// Error envelopes remain errors; no invented result is added to them.
pub(crate) fn attach(response: &mut serde_json::Value, attribution: &McpAttribution) {
    if let Some(result) = response.get_mut("result").and_then(serde_json::Value::as_object_mut) {
        let meta = result.entry("_meta").or_insert_with(|| serde_json::json!({}));
        if let Some(meta) = meta.as_object_mut() {
            if let Ok(record) = serde_json::to_value(attribution) { meta.insert(RESULT_META_KEY.into(), record); }
        }
    }
}
