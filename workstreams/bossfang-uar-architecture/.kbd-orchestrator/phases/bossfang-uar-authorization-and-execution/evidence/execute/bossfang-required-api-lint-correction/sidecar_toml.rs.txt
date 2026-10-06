//! Idempotent upsert of one `[[sidecar_channels]]` block in config.toml,
//! identified by its `name`. Uses toml_edit to preserve formatting,
//! comments, and key ordering of every other section.

use std::collections::BTreeMap;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use toml_edit::{value, Array, ArrayOfTables, DocumentMut, Item, Table};

fn read_existing_or_empty(path: &Path) -> Result<String, String> {
    match fs::read_to_string(path) {
        Ok(contents) => Ok(contents),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(error) => Err(format!("read {path:?}: {error}")),
    }
}

// `agent` (multi-instance support) pushed this to 8 positional params — a
// dedicated params struct would help call-site readability more than it
// would help correctness here (every call site is already a well-commented
// test or the one production caller), so the lint is silenced rather than
// churned into a struct.
#[allow(clippy::too_many_arguments)]
pub fn upsert_sidecar_block(
    path: &Path,
    name: &str,
    channel_type: &str,
    command: &str,
    args: &[&str],
    env: &BTreeMap<String, String>,
    managed_env_keys: &[&str],
    agent: Option<&str>,
) -> Result<(), String> {
    let original = read_existing_or_empty(path)?;
    let mut doc: DocumentMut = original
        .parse()
        .map_err(|e| format!("parse {path:?}: {e}"))?;

    // Helper: write the catalog defaults that the form does NOT know about
    // — `command` and `args`. These come from `SIDECAR_CATALOG`, not from
    // the operator's payload. On the **insert** path we always write
    // them. On the **update** path we leave any non-empty existing
    // value alone so operators who hand-edit `config.toml` to point at
    // a venv binary (`command = "/opt/venv/bin/python"`) or pass extra
    // flags (`args = [..., "--debug"]`) don't lose those edits every
    // time someone clicks Save in the dashboard.
    fn write_command_default(block: &mut Table, command: &str) {
        block["command"] = value(command);
    }

    fn write_args_default(block: &mut Table, args: &[&str]) {
        let mut args_arr = Array::new();
        for a in args {
            args_arr.push(*a);
        }
        block["args"] = value(args_arr);
    }

    fn command_present(block: &Table) -> bool {
        block
            .get("command")
            .and_then(|i| i.as_str())
            .is_some_and(|s| !s.is_empty())
    }

    fn args_present(block: &Table) -> bool {
        block
            .get("args")
            .and_then(|i| i.as_array())
            .is_some_and(|a| !a.is_empty())
    }

    fn write_command_and_args_defaults(block: &mut Table, command: &str, args: &[&str]) {
        write_command_default(block, command);
        write_args_default(block, args);
    }

    // Helper: apply the keys the dashboard configure form owns. `name`
    // and `channel_type` identify the block. Within the `env` sub-table,
    // only the **schema-managed** keys (those listed in `managed_env_keys`,
    // the non-secret schema fields the form actually renders) are owned
    // by the form; every other env key present in the existing block —
    // operator hand-edits like `PYTHONPATH = "/custom"`, `HTTP_PROXY`,
    // locale variables, or even a hand-edited `TELEGRAM_BOT_TOKEN` inline
    // (legacy) — is preserved as-is across the save. Per managed key:
    // form provides non-empty value ⇒ overwrite; form provides empty /
    // absent ⇒ remove from the env table. Operator-tuned supervision
    // fields (`restart`, `restart_*`, `ready_timeout_secs`,
    // `shutdown_grace_secs`, `message_buffer`, `overflow`, …) live on
    // the same `[[sidecar_channels]]` table but are NOT touched here —
    // they survive a save.
    fn write_form_managed(
        block: &mut Table,
        name: &str,
        channel_type: &str,
        env: &BTreeMap<String, String>,
        managed_env_keys: &[&str],
        agent: Option<&str>,
    ) {
        block["name"] = value(name);
        block["channel_type"] = value(channel_type);
        // `agent` is the per-instance default-agent binding (multi-instance
        // support, #8xxx). Always normalize to the current field name —
        // drop the pre-#5671 `default_agent` alias key too, so a config
        // hand-edited (or written by an older dashboard build) under the
        // old key doesn't leave a stale duplicate sitting next to the one
        // this save actually intends.
        match agent {
            Some(a) if !a.is_empty() => block["agent"] = value(a),
            _ => {
                block.remove("agent");
            }
        }
        block.remove("default_agent");
        // Start from the existing env table (clone it) so non-schema
        // keys survive the rewrite. If it's missing or shaped wrong,
        // fall back to a fresh empty table.
        let mut env_table: Table = block
            .get("env")
            .and_then(|i| i.as_table())
            .cloned()
            .unwrap_or_default();
        for key in managed_env_keys {
            match env.get(*key) {
                Some(v) if !v.is_empty() => {
                    env_table[*key] = value(v.clone());
                }
                _ => {
                    env_table.remove(key);
                }
            }
        }
        // Render as `[sidecar_channels.env]` (not dotted inline).
        env_table.set_implicit(false);
        block["env"] = Item::Table(env_table);
    }

    let aot_item = doc
        .entry("sidecar_channels")
        .or_insert_with(|| Item::ArrayOfTables(ArrayOfTables::new()));
    let aot = aot_item
        .as_array_of_tables_mut()
        .ok_or_else(|| "config.toml: `sidecar_channels` is not an array-of-tables".to_string())?;

    // Upsert by `name`; if absent, append.
    let mut replaced = false;
    for i in 0..aot.len() {
        let existing_name = aot
            .get(i)
            .and_then(|t| t.get("name"))
            .and_then(|i| i.as_str())
            .unwrap_or("");
        if existing_name == name {
            let existing = aot.get_mut(i).expect("indexed");
            // Backfill each missing catalog field independently. A partial
            // hand-edit must not suppress the default for its required
            // sibling, while a non-empty operator value remains untouched.
            if !command_present(existing) {
                write_command_default(existing, command);
            }
            if !args_present(existing) {
                write_args_default(existing, args);
            }
            write_form_managed(existing, name, channel_type, env, managed_env_keys, agent);
            replaced = true;
            break;
        }
    }
    if !replaced {
        let mut block = Table::new();
        write_command_and_args_defaults(&mut block, command, args);
        write_form_managed(&mut block, name, channel_type, env, managed_env_keys, agent);
        aot.push(block);
    }

    atomic_write(path, &doc.to_string())?;
    Ok(())
}

/// Borrowed catalog command and arguments used for sidecar defaults.
#[cfg(feature = "surreal-backend")]
pub struct SidecarCommand<'a> {
    /// Executable used when no operator command is already configured.
    pub command: &'a str,
    /// Catalog arguments paired with the executable.
    pub args: &'a [&'a str],
}

/// In-memory counterpart of [`upsert_sidecar_block`] for the surreal config
/// store (C-005d.3). Upserts one `SidecarChannelConfig` by `name` in a `Vec`,
/// mirroring the toml_edit semantics: on update, catalog `command`/`args`
/// defaults are backfilled only when absent (preserving operator hand-edits);
/// `name`/`channel_type` and the form-owned per-instance `agent` are set;
/// within `env`, only the schema-managed keys are overwritten (non-empty) or
/// removed (empty/absent) while every other env key and all supervision fields
/// survive. On insert, a fresh entry is built via serde so each
/// `#[serde(default)]` supervision field (restart/backoff/…) gets its canonical
/// default.
///
/// **Security:** the caller passes only the NON-secret schema fields here
/// (`nonsecret_env` + `managed_env_keys`). Secret-typed fields are written to
/// `secrets.env` and never reach this Vec, so they cannot enter the
/// `sidecar_channels` config-store override.
#[cfg(feature = "surreal-backend")]
pub fn upsert_sidecar_in_vec(
    sidecars: &mut Vec<librefang_types::config::SidecarChannelConfig>,
    name: &str,
    channel_type: &str,
    command: SidecarCommand<'_>,
    env: &BTreeMap<String, String>,
    managed_env_keys: &[&str],
    agent: Option<&str>,
) -> Result<(), String> {
    let SidecarCommand { command, args } = command;
    let apply_managed = |env_map: &mut std::collections::HashMap<String, String>| {
        for key in managed_env_keys {
            match env.get(*key) {
                Some(v) if !v.is_empty() => {
                    env_map.insert((*key).to_string(), v.clone());
                }
                _ => {
                    env_map.remove(*key);
                }
            }
        }
    };

    if let Some(existing) = sidecars.iter_mut().find(|s| s.name == name) {
        // Backfill catalog defaults only if the operator never set them.
        if existing.command.is_empty() && existing.args.is_empty() {
            existing.command = command.to_string();
            existing.args = args.iter().map(|a| a.to_string()).collect();
        }
        existing.name = name.to_string();
        existing.channel_type = Some(channel_type.to_string());
        existing.agent = agent.map(str::to_string);
        apply_managed(&mut existing.env);
    } else {
        // Build via serde so every `#[serde(default)]` supervision field is set.
        let mut block: librefang_types::config::SidecarChannelConfig =
            serde_json::from_value(serde_json::json!({
                "name": name,
                "channel_type": channel_type,
                "command": command,
                "args": args,
                "env": {},
                "agent": agent,
            }))
            .map_err(|e| format!("construct sidecar entry: {e}"))?;
        apply_managed(&mut block.env);
        sidecars.push(block);
    }
    Ok(())
}

#[cfg(all(test, feature = "surreal-backend"))]
mod config_store_tests {
    use super::*;

    #[test]
    fn upsert_in_vec_inserts_then_updates_managed_keys_only() {
        let mut sidecars = Vec::new();
        let mut env = BTreeMap::new();
        env.insert("TELEGRAM_API_BASE".to_string(), "https://api".to_string());
        // A secret-shaped key the caller would NEVER pass (not in managed set):
        env.insert("TELEGRAM_BOT_TOKEN".to_string(), "SECRET".to_string());
        let managed = ["TELEGRAM_API_BASE"];

        upsert_sidecar_in_vec(
            &mut sidecars,
            "telegram",
            "telegram",
            SidecarCommand { command: "python3", args: &["-m", "adapter"] },
            &env,
            &managed,
            Some("coder"),
        )
        .unwrap();

        assert_eq!(sidecars.len(), 1);
        let s = &sidecars[0];
        assert_eq!(s.name, "telegram");
        assert_eq!(s.channel_type.as_deref(), Some("telegram"));
        assert_eq!(s.command, "python3");
        assert_eq!(s.args, vec!["-m", "adapter"]);
        assert_eq!(s.agent.as_deref(), Some("coder"));
        assert_eq!(
            s.env.get("TELEGRAM_API_BASE").map(String::as_str),
            Some("https://api")
        );
        // SECURITY: a non-managed (secret) key must never land in the struct,
        // even when present in the input map.
        assert!(
            !s.env.contains_key("TELEGRAM_BOT_TOKEN"),
            "non-managed (secret) key must not enter the sidecar override"
        );

        // Update: preserve a hand-edited env key + supervision defaults; clear a
        // managed key when the form sends it empty.
        sidecars[0]
            .env
            .insert("PYTHONPATH".to_string(), "/custom".to_string());
        sidecars[0].restart = true;
        let mut env2 = BTreeMap::new();
        env2.insert("TELEGRAM_API_BASE".to_string(), String::new()); // cleared
        upsert_sidecar_in_vec(
            &mut sidecars,
            "telegram",
            "telegram",
            SidecarCommand { command: "python3", args: &["-m", "adapter"] },
            &env2,
            &managed,
            None,
        )
        .unwrap();
        assert_eq!(sidecars.len(), 1, "update must not append a duplicate");
        let s = &sidecars[0];
        assert!(
            !s.env.contains_key("TELEGRAM_API_BASE"),
            "empty managed key removed"
        );
        assert_eq!(
            s.env.get("PYTHONPATH").map(String::as_str),
            Some("/custom"),
            "hand-edit preserved"
        );
        assert!(s.restart, "supervision field preserved across update");
        assert_eq!(s.agent, None, "empty form agent clears the binding");
    }
}

/// Monotonic counter disambiguating concurrent tempfile names within this process.
///
/// Module-level on purpose.
/// Both writers format into the same `.config.toml.tmp.{pid}.{seq}` namespace, so a counter declared inside each function would give each its own sequence starting at zero and the first call to either would mint the identical path — a concurrent configure and remove could then write and rename each other's tempfile, landing one request's document at the other's target or losing it entirely.
static TMP_SEQ: AtomicU64 = AtomicU64::new(0);

/// Write `contents` to `path` by way of a sibling tempfile and a rename.
///
/// Shared by both writers so the sequence that disambiguates their tempfile names is genuinely shared — see [`TMP_SEQ`].
/// PID guards against other daemon processes touching the same directory; the counter guards against concurrent threads within this process (parallel tests, or two HTTP handlers racing on the same config file).
/// Same defect class as `secrets_env::upsert_secret` (T3.1).
fn atomic_write(path: &Path, contents: &str) -> Result<(), String> {
    let parent = path.parent().ok_or("config path has no parent")?;
    let tmp = parent.join(next_tmp_name());

    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&tmp)
        .map_err(|e| format!("open {tmp:?}: {e}"))?;
    let write_result = (|| -> Result<(), String> {
        file.write_all(contents.as_bytes())
            .map_err(|e| format!("write {tmp:?}: {e}"))?;
        file.sync_all().map_err(|e| format!("sync {tmp:?}: {e}"))?;
        Ok(())
    })();
    if let Err(error) = write_result {
        let _ = fs::remove_file(&tmp);
        return Err(error);
    }

    if let Err(error) = fs::rename(&tmp, path) {
        let _ = fs::remove_file(&tmp);
        return Err(format!("rename {tmp:?} -> {path:?}: {error}"));
    }

    #[cfg(unix)]
    fs::File::open(parent)
        .and_then(|dir| dir.sync_all())
        .map_err(|e| format!("sync parent directory {parent:?}: {e}"))?;

    Ok(())
}

pub(super) fn restore_sidecar_file(path: &Path, contents: Option<&str>) -> Result<(), String> {
    match contents {
        Some(contents) => atomic_write(path, contents),
        None => match fs::remove_file(path) {
            Ok(()) => {
                #[cfg(unix)]
                {
                    let parent = path.parent().ok_or("config path has no parent")?;
                    fs::File::open(parent)
                        .and_then(|dir| dir.sync_all())
                        .map_err(|e| format!("sync parent directory {parent:?}: {e}"))?;
                }
                Ok(())
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(format!("remove {path:?}: {error}")),
        },
    }
}

/// Next tempfile name from the shared sequence.
/// Split out so a test can assert successive names differ without writing to the filesystem.
fn next_tmp_name() -> String {
    let seq = TMP_SEQ.fetch_add(1, Ordering::Relaxed);
    format!(".config.toml.tmp.{}.{seq}", std::process::id())
}

/// Remove every `[[sidecar_channels]]` block identified by `name`; returns whether at least one was removed.
///
/// Drains every match rather than stopping at the first — a file with a
/// duplicate `name` entry (a hand-edit, or a copy-pasted block) used to keep
/// the second one alive after a "successful" removal, which the reload then
/// re-merged and respawned. That is the single-file version of the same
/// "reported `removed` while the channel comes back" bug the cross-file walk
/// in `remove_sidecar_block_anywhere` exists to prevent.
pub fn remove_sidecar_block(path: &Path, name: &str) -> Result<bool, String> {
    let original = read_existing_or_empty(path)?;
    let mut doc: DocumentMut = original
        .parse()
        .map_err(|e| format!("parse {path:?}: {e}"))?;

    let mut removed_any = false;
    let now_empty;
    {
        let Some(aot_item) = doc.get_mut("sidecar_channels") else {
            return Ok(false);
        };
        let aot = aot_item.as_array_of_tables_mut().ok_or_else(|| {
            "config.toml: `sidecar_channels` is not an array-of-tables".to_string()
        })?;
        let mut i = 0;
        while i < aot.len() {
            let matches = aot
                .get(i)
                .and_then(|t| t.get("name"))
                .and_then(|v| v.as_str())
                == Some(name);
            if matches {
                aot.remove(i);
                removed_any = true;
            } else {
                i += 1;
            }
        }
        now_empty = aot.is_empty();
    }
    if !removed_any {
        return Ok(false);
    }
    // Drop a now-empty array entirely rather than leaving a bare `sidecar_channels = []`.
    if now_empty {
        doc.remove("sidecar_channels");
    }

    atomic_write(path, &doc.to_string())?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;
    use tempfile::TempDir;

    #[test]
    fn atomic_write_replaces_config_without_staging_residue() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("config.toml");

        atomic_write(&path, "[kernel]\nname = \"test\"\n").unwrap();

        assert_eq!(
            fs::read_to_string(&path).unwrap(),
            "[kernel]\nname = \"test\"\n"
        );
        assert_eq!(
            fs::read_dir(dir.path()).unwrap().count(),
            1,
            "successful writes must not leave staging files"
        );
    }

    #[test]
    fn remove_drains_every_duplicate_entry_in_one_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("config.toml");
        fs::write(
            &path,
            "[[sidecar_channels]]\nname = \"email\"\n\
             [[sidecar_channels]]\nname = \"telegram\"\n\
             [[sidecar_channels]]\nname = \"email\"\n",
        )
        .unwrap();

        let removed = remove_sidecar_block(&path, "email").unwrap();
        assert!(removed);

        let written = fs::read_to_string(&path).unwrap();
        assert!(
            !written.contains("\"email\""),
            "both duplicate `email` entries must be gone: {written}"
        );
        assert!(
            written.contains("\"telegram\""),
            "the unrelated entry must survive: {written}"
        );
    }

    #[test]
    fn remove_propagates_existing_config_read_error() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("config.toml");
        fs::create_dir(&path).unwrap();

        let error = remove_sidecar_block(&path, "telegram").unwrap_err();

        assert!(error.contains("read"), "got: {error}");
        assert_eq!(
            fs::read_dir(dir.path()).unwrap().count(),
            1,
            "a read failure must not create a staging file"
        );
    }

    #[test]
    fn atomic_write_removes_staging_file_when_rename_fails() {
        let dir = TempDir::new().unwrap();
        let target_dir = dir.path().join("config.toml");
        fs::create_dir(&target_dir).unwrap();

        let error = atomic_write(&target_dir, "new config").unwrap_err();

        assert!(error.contains("rename"), "got: {error}");
        assert_eq!(
            fs::read_dir(dir.path()).unwrap().count(),
            1,
            "failed renames must not leave staging files"
        );
    }

    /// Both writers mint tempfile names from one namespace, so the sequence backing that namespace has to be shared and atomic.
    /// Before the writers were funnelled through `atomic_write`, each declared its own `static SEQ` starting at zero, so the first `upsert` and the first `remove` in a process both produced `.config.toml.tmp.{pid}.0`.
    ///
    /// Names are drawn concurrently and asserted all-distinct.
    /// This pins atomicity and the single shared counter; it cannot detect a future writer that bypasses `next_tmp_name` and formats the same pattern itself, which is what the doc comment on `TMP_SEQ` is for.
    #[test]
    fn tmp_names_are_unique_across_concurrent_callers() {
        const THREADS: usize = 8;
        const PER_THREAD: usize = 32;

        let handles: Vec<_> = (0..THREADS)
            .map(|_| {
                std::thread::spawn(|| {
                    (0..PER_THREAD)
                        .map(|_| next_tmp_name())
                        .collect::<Vec<String>>()
                })
            })
            .collect();

        let names: Vec<String> = handles
            .into_iter()
            .flat_map(|h| h.join().expect("tmp-name thread panicked"))
            .collect();

        let distinct: HashSet<&str> = names.iter().map(String::as_str).collect();
        assert_eq!(
            distinct.len(),
            THREADS * PER_THREAD,
            "tempfile names collided — the sequence is not shared or not atomic; \
             a concurrent configure and remove can rename each other's tempfile away"
        );

        let pid_prefix = format!(".config.toml.tmp.{}.", std::process::id());
        for name in &names {
            assert!(
                name.starts_with(&pid_prefix),
                "unexpected tempfile name shape: {name}"
            );
        }
    }
}
