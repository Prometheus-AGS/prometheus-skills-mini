//! Non-executable copies projected from a finite, original admission dictionary.
//! This is not general DLP or proof of the receiver's private secret corpus.
use base64::{Engine, engine::general_purpose};
use librefang_types::uar_run::*;
use serde_json::{Map, Value};
use zeroize::Zeroizing;
use super::{Transport, UarRunClientError, canonical::observation_error};

pub(super) const MAX_PRESENTATION_PARTS: usize = 1000;
pub(super) const MAX_PRESENTATION_BYTES: usize = 4 * 1024 * 1024;

/// Private, zeroized on drop; never Serialize or Debug. Absence after process
/// restart is unknown, not an empty dictionary or permission to project text.
#[derive(Clone, Default)]
pub(super) struct CapturedSecrets(Zeroizing<Vec<String>>);

impl CapturedSecrets {
    pub(super) fn capture(transport: &Transport, run: &Map<String, Value>) -> Self {
        let mut captured = Self::default();
        captured.add_transport(transport);
        if let Some(credentials) = run.get("run_credentials").and_then(Value::as_array) {
            for credential in credentials {
                captured.add_value(&credential["api_key"]);
                captured.add_value(&credential["base_url"]);
            }
        }
        if let Some(servers) = run.get("mcp_servers").and_then(Value::as_array) {
            for server in servers {
                captured.add_value(&server["url"]);
                captured.add_headers(&server["headers"]);
                captured.add_headers(&server["grant"]["headers"]);
            }
        }
        if let Some(admission) = run.get("tool_admission") {
            captured.add_value(&admission["url"]);
            captured.add_headers(&admission["headers"]);
        }
        captured
    }

    pub(super) fn add_transport(&mut self, transport: &Transport) {
        if let Some(bearer) = &transport.credential { self.add(bearer.as_str()); }
    }

    fn add_value(&mut self, value: &Value) {
        if let Some(value) = value.as_str() { self.add(value); }
    }

    fn add_headers(&mut self, value: &Value) {
        if let Some(headers) = value.as_object() {
            for (name, value) in headers {
                self.add_value(value);
                // A server may reflect only the token rather than its scheme.
                if let Some(token) = value.as_str().and_then(|v| v.split_once(' '))
                    .filter(|(scheme, _)| name.eq_ignore_ascii_case("authorization")
                        && scheme.eq_ignore_ascii_case("bearer")).map(|(_, token)| token) {
                    self.add(token);
                }
            }
        }
    }

    fn add(&mut self, secret: &str) {
        if secret.is_empty() { return; }
        let json = serde_json::to_string(secret).expect("string serialization");
        let percent = secret.bytes().map(|byte| {
            if byte.is_ascii_alphanumeric() || b"-_.~".contains(&byte) {
                (byte as char).to_string()
            } else { format!("%{byte:02X}") }
        }).collect::<String>();
        for value in [secret.to_owned(), json[1..json.len()-1].to_owned(), percent.clone(),
            percent_escape_lowercase(&percent), general_purpose::STANDARD.encode(secret),
            general_purpose::STANDARD_NO_PAD.encode(secret), general_purpose::URL_SAFE.encode(secret),
            general_purpose::URL_SAFE_NO_PAD.encode(secret)] {
            if !self.0.contains(&value) { self.0.push(value); }
        }
        self.0.sort_by_key(|value| std::cmp::Reverse(value.len()));
    }

    fn project(&self, text: &str) -> String {
        // Longest match at each source position; never reprocess replacement
        // text (a short secret could otherwise alter the redaction marker).
        let mut projected = String::new();
        let mut offset = 0;
        while offset < text.len() {
            if let Some(secret) = self.0.iter().find(|secret| text[offset..].starts_with(secret.as_str())) {
                projected.push_str("[REDACTED]");
                offset += secret.len();
            } else {
                let ch = text[offset..].chars().next().expect("remaining character");
                projected.push(ch);
                offset += ch.len_utf8();
            }
        }
        projected
    }

    /// Hold only a suffix that may still become a captured value. Emitted
    /// prefixes can never later become part of that value. The caller commits
    /// only a complete safe group, so a crash cannot lose this private carry.
    pub(super) fn delta(&self, text: &str, carry: &mut Zeroizing<String>) -> String {
        carry.push_str(text);
        let mut output = String::new();
        let mut offset = 0;
        while offset < carry.len() {
            let remaining = &carry[offset..];
            if let Some(secret) = self.0.iter().find(|secret| remaining.starts_with(secret.as_str())) {
                output.push_str("[REDACTED]");
                offset += secret.len();
            } else if self.0.iter().any(|secret| secret.starts_with(remaining)) {
                break;
            } else {
                let ch = remaining.chars().next().expect("remaining character");
                output.push(ch);
                offset += ch.len_utf8();
            }
        }
        *carry = Zeroizing::new(carry[offset..].to_owned());
        output
    }

    fn text(&self, text: &str) -> UarSecretExcludedText {
        UarSecretExcludedText::from_secret_excluded_text(self.project(text))
    }
}

fn percent_escape_lowercase(value: &str) -> String {
    let mut output = String::new();
    let bytes = value.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            output.push('%');
            output.push((bytes[index + 1] as char).to_ascii_lowercase());
            output.push((bytes[index + 2] as char).to_ascii_lowercase());
            index += 3;
        } else { output.push(bytes[index] as char); index += 1; }
    }
    output
}

fn string<'a>(data: &'a Value, field: &str) -> Result<&'a str, UarRunClientError> {
    data.get(field).and_then(Value::as_str)
        .ok_or_else(|| observation_error("required presentation field is malformed"))
}

pub(super) fn project_event(
    event: &UarRunEvent, projection: &UarDelegatedRunProjection, secrets: &CapturedSecrets,
    carry: &mut Zeroizing<String>,
) -> Result<UarAttemptPresentationEvent, UarRunClientError> {
    let run_id = projection.uar_run_id.as_deref().ok_or_else(|| observation_error("run identity unavailable"))?;
    let epoch = projection.runtime_epoch.as_deref().ok_or_else(|| observation_error("runtime epoch unavailable"))?;
    if projection.uar_task_id.as_deref() != Some(event.task_id.as_str())
        || string(&event.data, "request_id")? != run_id {
        return Err(observation_error("observation execution identity mismatch"));
    }
    if event.event_type == "agui.error" && event.data["code"] == "STREAM_GAP" {
        return Err(observation_error("upstream observation history has a gap"));
    }
    let mut parts = Vec::new();
    // These wire events finish the preceding assistant output segment. Flush
    // a harmless partial prefix before the tool/approval display, rather than
    // withholding a human decision while waiting for another model delta.
    if matches!(event.event_type.as_str(), "agui.tool_call.complete" | "agui.tool_call.approval_required" | "agui.tool_result")
        && !carry.is_empty() {
        parts.push(UarPresentationPart::Message {
            speaker: UarPresentationSpeaker::Assistant, text: secrets.text(carry.as_str()),
        });
        *carry = Zeroizing::new(String::new());
    }
    let kind = match event.event_type.as_str() {
        "agui.message.delta" => {
            let text = event.data["delta"]["text"].as_str()
                .ok_or_else(|| observation_error("message delta is malformed"))?;
            parts.push(UarPresentationPart::Message {
                speaker: UarPresentationSpeaker::Assistant,
                text: UarSecretExcludedText::from_secret_excluded_text(secrets.delta(text, carry)),
            });
            UarAttemptEventKind::Output
        }
        "agui.tool_result" => {
            let success = event.data["success"].as_bool()
                .ok_or_else(|| observation_error("tool result outcome is malformed"))?;
            parts.push(UarPresentationPart::ToolResult {
                tool_name: secrets.text(string(&event.data, "name")?),
                outcome: if success { UarPresentedToolOutcome::Succeeded } else { UarPresentedToolOutcome::Failed },
                text: secrets.text(string(&event.data, "content")?),
            });
            UarAttemptEventKind::Tool
        }
        "agui.tool_call.approval_required" => {
            let approval_id = string(&event.data, "approval_id")?;
            let admission_id = match event.data.get("admission_id") {
                None | Some(Value::Null) => None,
                Some(Value::String(id)) if !id.is_empty() => Some(id.clone()),
                _ => return Err(observation_error("tool admission identity is malformed")),
            };
            let tool_call_id = string(&event.data, "id")?;
            if approval_id.is_empty() || tool_call_id.is_empty() {
                return Err(observation_error("approval identity mismatch"));
            }
            parts.push(UarPresentationPart::ApprovalRequired {
                approval_id: approval_id.into(), admission_id,
                tool_call_id: tool_call_id.into(), observed_revision: projection.revision,
                tool_name: secrets.text(string(&event.data, "name")?),
                reason: secrets.text(string(&event.data, "risk_reason")?),
            });
            UarAttemptEventKind::Approval
        },
        "agui.done" => {
            if let Some(part) = observed_usage(&event.data, secrets) { parts.push(part); }
            UarAttemptEventKind::State
        }
        "uar.cursor" => UarAttemptEventKind::State,
        "agui.error" => UarAttemptEventKind::Error,
        "agui.usage" => UarAttemptEventKind::Usage,
        _ => UarAttemptEventKind::State,
    };
    if matches!(event.event_type.as_str(), "agui.done" | "agui.cancelled" | "agui.error") && !carry.is_empty() {
        parts.push(UarPresentationPart::Message {
            speaker: UarPresentationSpeaker::Assistant, text: secrets.text(carry.as_str()),
        });
        *carry = Zeroizing::new(String::new());
    }
    validate_parts(&parts)?;
    Ok(UarAttemptPresentationEvent { runtime_epoch: epoch.into(), task_id: event.task_id.clone(),
        run_id: run_id.into(), event_id: event.cursor, kind, parts })
}

/// Only the actual full-harness agui.done usage object is mapped. The provider
/// exposes cost_usd_estimate, so cost is deliberately not an observed field.
fn observed_usage(data: &Value, secrets: &CapturedSecrets) -> Option<UarPresentationPart> {
    let usage = data.get("usage")?.as_object()?;
    let input_tokens = usage.get("input_tokens").and_then(Value::as_u64);
    let output_tokens = usage.get("output_tokens").and_then(Value::as_u64);
    let total_tokens = usage.get("total_tokens").and_then(Value::as_u64);
    let model = usage.get("model").and_then(Value::as_str).filter(|value| !value.is_empty())
        .map(|value| secrets.text(value));
    if input_tokens.is_none() && output_tokens.is_none() && total_tokens.is_none() && model.is_none() { return None; }
    Some(UarPresentationPart::Usage { input_tokens, output_tokens, total_tokens, model })
}

fn validate_parts(parts: &[UarPresentationPart]) -> Result<(), UarRunClientError> {
    let bytes: usize = parts.iter().map(|part| match part {
        UarPresentationPart::Usage { model, .. } => model.as_ref().map_or(0, |value| value.as_str().len()),
        UarPresentationPart::Message { text, .. } => text.as_str().len(),
        UarPresentationPart::ApprovalRequired { tool_name, reason, .. } => tool_name.as_str().len() + reason.as_str().len(),
        UarPresentationPart::ToolResult { tool_name, text, .. } => tool_name.as_str().len() + text.as_str().len(),
    }).sum();
    if parts.len() > MAX_PRESENTATION_PARTS || bytes > MAX_PRESENTATION_BYTES {
        return Err(observation_error("presentation exceeded selected limits"));
    }
    Ok(())
}

#[cfg(test)]
#[path = "presentation_tests.rs"]
mod tests;
