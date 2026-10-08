//! OpenAPI descriptors independent of the optional runtime handler feature.
//! These documentation functions are never registered as runtime routes.

#[utoipa::path(get,path="/api/uar/connections",tag="uar",responses((status=200,description="Secret-free active original run bindings and private credential presence")))]
#[doc(hidden)]
pub fn connections() {}

#[utoipa::path(post,path="/api/uar/connections/refresh",tag="uar",request_body=crate::types::JsonObject,responses((status=200,description="Original connection credential replaced after exact identity, epoch and owned receipt validation"),(status=410,description="Original UAR runtime epoch no longer recoverable")))]
#[doc(hidden)]
pub fn refresh() {}

/// Authenticated Owner-only full-run diagnostic; no catalog installation.
#[utoipa::path(post, path="/api/uar/diagnostics/delegation", tag="uar", request_body=crate::types::JsonObject,
    responses((status=201,description="Real inline diagnostic admission projection; body workspaceId/providerId/model and optional bossTaskId"),
    (status=202,description="Admission outcome unresolved; retain task identity for reconciliation"),
    (status=503,description="uar-driver feature unavailable")))]
#[doc(hidden)]
pub fn diagnostic_route() {}
