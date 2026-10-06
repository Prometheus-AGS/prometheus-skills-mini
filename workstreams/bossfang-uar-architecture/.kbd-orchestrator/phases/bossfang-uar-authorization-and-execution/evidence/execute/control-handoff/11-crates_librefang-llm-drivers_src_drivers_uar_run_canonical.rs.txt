use librefang_types::uar_run::UarRunEvent;
use serde_json::Value;
use sha2::{Digest, Sha256};

use super::UarRunClientError;

pub(super) fn canonical_digest(value: &Value) -> String {
    let mut canonical = String::new();
    write_canonical(value, &mut canonical);
    format!(
        "sha256:{}",
        hex::encode(Sha256::digest(canonical.as_bytes()))
    )
}

fn write_canonical(value: &Value, output: &mut String) {
    match value {
        Value::Null => output.push_str("null"),
        Value::Bool(value) => output.push_str(if *value { "true" } else { "false" }),
        Value::Number(value) => output.push_str(&value.to_string()),
        Value::String(value) => output.push_str(
            &serde_json::to_string(value).expect("serializing a JSON string cannot fail"),
        ),
        Value::Array(values) => {
            output.push('[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                write_canonical(value, output);
            }
            output.push(']');
        }
        Value::Object(values) => {
            output.push('{');
            let mut entries = values.iter().collect::<Vec<_>>();
            entries.sort_by(|left, right| left.0.cmp(right.0));
            for (index, (key, value)) in entries.into_iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                output.push_str(
                    &serde_json::to_string(key).expect("serializing a JSON key cannot fail"),
                );
                output.push(':');
                write_canonical(value, output);
            }
            output.push('}');
        }
    }
}

// Selected policy also bounds complete frames, not only unfinished buffers.
pub(super) const MAX_OBSERVATION_BYTES: usize = 1024 * 1024;
pub(super) fn observation_error(message: &'static str) -> UarRunClientError {
    UarRunClientError::InvalidResponse { operation: "event observation", message: message.into() }
}

pub(super) fn parse_sse_events(
    task_id: &str, revision: u64, body: &str,
) -> Result<Vec<UarRunEvent>, UarRunClientError> {
    let normalized = body.replace("\r\n", "\n");
    let mut events = Vec::new();
    for frame in normalized.split("\n\n") {
        if frame.len() > MAX_OBSERVATION_BYTES { return Err(observation_error("observation frame exceeded limit")); }
        let mut cursor = None;
        let mut event_type = None;
        let mut data = Vec::new();
        for line in frame.lines() {
            if let Some(value) = line.strip_prefix("id:") {
                cursor = value.trim().parse::<u64>().ok();
            } else if let Some(value) = line.strip_prefix("event:") {
                event_type = Some(value.trim().to_string());
            } else if let Some(value) = line.strip_prefix("data:") {
                data.push(value.strip_prefix(' ').unwrap_or(value));
            }
        }
        if data.is_empty() { continue; } // SSE keepalive only.
        let data = data.join("\n");
        let cursor = cursor.filter(|id| *id > 0)
            .ok_or_else(|| observation_error("SSE event omitted its positive monotonic ID"))?;
        let data = serde_json::from_str(&data)
            .map_err(|_| observation_error("malformed observation JSON"))?;
        let event = UarRunEvent { task_id: task_id.into(), cursor, revision,
            event_type: event_type.ok_or_else(|| observation_error("missing observation type"))?,
            occurred_at: None, data };
        if serde_json::to_vec(&event).map_err(|_| observation_error("malformed decoded observation"))?.len() > MAX_OBSERVATION_BYTES {
            return Err(observation_error("decoded observation exceeded limit"));
        }
        events.push(event);
    }
    Ok(events)
}

pub(super) fn take_complete_sse_frames(buffer: &mut Vec<u8>) -> Result<Option<String>, UarRunClientError> {
    let mut start = 0;
    let mut complete_end = 0;
    while start < buffer.len() {
        let delimiter = (start..buffer.len()).find_map(|index| {
            if buffer[index..].starts_with(b"\r\n\r\n") { Some((index, 4)) }
            else if buffer[index..].starts_with(b"\n\n") { Some((index, 2)) }
            else { None }
        });
        let Some((end, width)) = delimiter else { break; };
        if end + width - start > MAX_OBSERVATION_BYTES {
            return Err(observation_error("observation frame exceeded limit"));
        }
        complete_end = end + width;
        start = complete_end;
    }
    if buffer.len() - complete_end > MAX_OBSERVATION_BYTES {
        return Err(observation_error("unfinished observation frame exceeded limit"));
    }
    if complete_end == 0 { return Ok(None); }
    String::from_utf8(buffer.drain(..complete_end).collect()).map(Some)
        .map_err(|_| observation_error("observation frame is not UTF-8"))
}
