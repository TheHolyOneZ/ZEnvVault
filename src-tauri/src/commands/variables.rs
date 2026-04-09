use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;

use crate::crypto::{aes_gcm, random};
use crate::db::{
    models::{Variable, VariableHistory},
    queries::{self, VariableRaw},
};
use crate::env_parser;
use crate::error::{AppError, Result};
use crate::state::AppState;

async fn maybe_auto_sync(state: &AppState, tier_id: &str) {
    let Some((path, true)) = queries::get_tier_source(&state.db, tier_id).await else { return; };

    let dek = match state.get_dek_bytes().await {
        Some(d) => d,
        None => return,
    };

    use sqlx::Row;
    let Ok(var_rows) = sqlx::query(
        "SELECT key, value_enc, description FROM variables WHERE tier_id=? ORDER BY sort_order, key"
    )
    .bind(tier_id).fetch_all(&state.db).await else { return; };

    let mut pairs = Vec::new();
    for r in var_rows {
        let key: String = r.get("key");
        let value_enc: String = r.get("value_enc");
        let description: Option<String> = r.get("description");
        if let Ok(value) = aes_gcm::decrypt_str(&dek, &value_enc) {
            pairs.push((key, value, description));
        }
    }

    let content = env_parser::generate_env_file(&pairs, "", "");
    let _ = std::fs::write(&path, content);
}

fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

const SECRET_KEY_HINTS: &[&str] = &[
    "SECRET", "KEY", "TOKEN", "PASSWORD", "PASS", "PWD", "PRIVATE", "AUTH", "CREDENTIAL",
];

pub fn should_auto_secret(key: &str) -> bool {
    let upper = key.to_uppercase();
    SECRET_KEY_HINTS.iter().any(|h| upper.contains(h))
}

#[tauri::command]
pub async fn list_variables(tier_id: String, state: State<'_, Arc<AppState>>) -> Result<Vec<Variable>> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::list_variables(&state.db, &tier_id).await
}

#[tauri::command]
pub async fn reveal_variable(id: String, state: State<'_, Arc<AppState>>) -> Result<String> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;
    let enc = queries::get_variable_enc(&state.db, &id).await?;
    let value = aes_gcm::decrypt_str(&dek, &enc)?;

    queries::add_audit(&state.db, "reveal", "variable", &id, None).await?;
    Ok(value)
}

#[tauri::command]
pub async fn reveal_all_variables(tier_id: String, state: State<'_, Arc<AppState>>) -> Result<HashMap<String, String>> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;
    let encs = queries::get_all_variable_encs(&state.db, &tier_id).await?;

    let mut map = HashMap::new();
    for (key, enc) in encs {
        let value = aes_gcm::decrypt_str(&dek, &enc).unwrap_or_else(|_| "[decrypt error]".to_string());
        map.insert(key, value);
    }
    Ok(map)
}

#[tauri::command]
pub async fn create_variable(
    tier_id: String,
    key: String,
    value: String,
    description: Option<String>,
    is_secret: bool,
    sensitive: Option<bool>,
    group_name: Option<String>,
    value_type: Option<String>,
    state: State<'_, Arc<AppState>>,
) -> Result<Variable> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;
    let value_enc = aes_gcm::encrypt_str(&dek, &value)?;
    let now = now();
    let sensitive = sensitive.unwrap_or(false);

    let raw = VariableRaw {
        id: random::new_id(), tier_id: tier_id.clone(), key: key.clone(),
        value_enc, description: description.clone(), is_secret,
        pinned: false, sensitive, group_name: group_name.clone(), value_type: value_type.clone(),
        sort_order: 0, created_at: now.clone(), updated_at: now.clone(),
    };
    queries::create_variable(&state.db, &raw).await?;
    queries::add_audit(&state.db, "create_variable", "variable", &raw.id, Some(&key)).await?;
    maybe_auto_sync(&state, &tier_id).await;

    Ok(Variable {
        id: raw.id, tier_id, key, description, is_secret, pinned: false, sensitive,
        group_name, value_type, sort_order: 0, created_at: now.clone(), updated_at: now,
    })
}

#[tauri::command]
pub async fn update_variable(
    id: String,
    key: String,
    value: Option<String>,
    description: Option<String>,
    is_secret: bool,
    sensitive: Option<bool>,
    group_name: Option<String>,
    value_type: Option<String>,
    state: State<'_, Arc<AppState>>,
) -> Result<Variable> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let sensitive = sensitive.unwrap_or(false);
    let now = now();

    use sqlx::Row;

    let tier_id: String = sqlx::query("SELECT tier_id FROM variables WHERE id=?")
        .bind(&id).fetch_optional(&state.db).await?
        .map(|r: sqlx::sqlite::SqliteRow| r.get("tier_id"))
        .ok_or(AppError::NotFound)?;

    let pinned: bool = sqlx::query("SELECT pinned FROM variables WHERE id=?")
        .bind(&id).fetch_optional(&state.db).await?
        .map(|r: sqlx::sqlite::SqliteRow| r.get::<i64, _>("pinned") != 0)
        .unwrap_or(false);

    // If value is None (sensitive variable, user didn't change it), reuse existing value_enc
    let value_enc = match value {
        Some(ref v) => {
            let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;
            aes_gcm::encrypt_str(&dek, v)?
        }
        None => {
            sqlx::query("SELECT value_enc FROM variables WHERE id=?")
                .bind(&id).fetch_optional(&state.db).await?
                .map(|r: sqlx::sqlite::SqliteRow| r.get::<String, _>("value_enc"))
                .ok_or(AppError::NotFound)?
        }
    };

    let raw = VariableRaw {
        id: id.clone(), tier_id: tier_id.clone(), key: key.clone(),
        value_enc, description: description.clone(), is_secret, pinned, sensitive,
        group_name: group_name.clone(), value_type: value_type.clone(),
        sort_order: 0, created_at: now.clone(), updated_at: now.clone(),
    };
    queries::update_variable(&state.db, &raw).await?;
    queries::add_audit(&state.db, "update_variable", "variable", &id, Some(&key)).await?;
    maybe_auto_sync(&state, &tier_id).await;

    let sort_order: i64 = sqlx::query("SELECT sort_order FROM variables WHERE id=?")
        .bind(&id).fetch_optional(&state.db).await?
        .map(|r: sqlx::sqlite::SqliteRow| r.get("sort_order")).unwrap_or(0);

    Ok(Variable {
        id, tier_id, key, description, is_secret, pinned, sensitive,
        group_name, value_type, sort_order, created_at: now.clone(), updated_at: now,
    })
}

#[tauri::command]
pub async fn delete_variable(id: String, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    use sqlx::Row;
    let key: String = sqlx::query("SELECT key FROM variables WHERE id=?")
        .bind(&id).fetch_optional(&state.db).await?
        .map(|r: sqlx::sqlite::SqliteRow| r.get("key")).unwrap_or_default();

    let tier_id: String = sqlx::query("SELECT tier_id FROM variables WHERE id=?")
        .bind(&id).fetch_optional(&state.db).await?
        .map(|r: sqlx::sqlite::SqliteRow| r.get("tier_id"))
        .unwrap_or_default();

    queries::add_audit(&state.db, "delete_variable", "variable", &id, Some(&key)).await?;
    queries::soft_delete_variable(&state.db, &id, &now()).await?;
    if !tier_id.is_empty() { maybe_auto_sync(&state, &tier_id).await; }
    Ok(())
}

#[tauri::command]
pub async fn restore_variable(id: String, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::restore_variable(&state.db, &id).await
}

#[tauri::command]
pub async fn hard_delete_variable(id: String, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::hard_delete_variable(&state.db, &id).await
}

#[tauri::command]
pub async fn pin_variable(id: String, pinned: bool, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::pin_variable(&state.db, &id, pinned, &now()).await
}

#[tauri::command]
pub async fn reveal_sensitive_variable(id: String, password: String, state: State<'_, Arc<AppState>>) -> Result<String> {
    if state.is_locked().await { return Err(AppError::Locked); }
    use sqlx::Row;
    let row = sqlx::query("SELECT sensitive FROM variables WHERE id=?")
        .bind(&id).fetch_optional(&state.db).await?
        .ok_or(AppError::NotFound)?;
    let is_sensitive: bool = row.get::<i64, _>("sensitive") != 0;
    if !is_sensitive { return Err(AppError::Forbidden); }

    let salt = crate::db::queries::get_config_value(&state.db, "argon2_salt").await
        .ok_or(AppError::AuthFailed)?;
    let verify_blob = crate::db::queries::get_config_value(&state.db, "verify_blob").await
        .ok_or(AppError::AuthFailed)?;
    let t_cost: u32 = crate::db::queries::get_config_value(&state.db, "argon2_t_cost").await
        .and_then(|v| v.parse().ok()).unwrap_or(3);

    let wrapping_key = crate::crypto::argon2::derive_key(&password, &salt, t_cost)?;
    if !aes_gcm::verify_key(&wrapping_key, &verify_blob) {
        return Err(AppError::InvalidPassword);
    }

    state.touch().await;
    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;
    let enc = queries::get_variable_enc(&state.db, &id).await?;
    let value = aes_gcm::decrypt_str(&dek, &enc)?;
    queries::add_audit(&state.db, "reveal_variable", "variable", &id, None).await?;
    Ok(value)
}

#[tauri::command]
pub async fn reorder_variables(ids: Vec<String>, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::reorder_variables(&state.db, &ids).await
}

#[tauri::command]
pub async fn get_variable_history(variable_id: String, state: State<'_, Arc<AppState>>) -> Result<Vec<VariableHistory>> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::get_variable_history(&state.db, &variable_id).await
}

#[tauri::command]
pub async fn reveal_history_value(history_id: i64, state: State<'_, Arc<AppState>>) -> Result<String> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;
    use sqlx::Row;
    let enc: String = sqlx::query("SELECT value_enc FROM variable_history WHERE id=?")
        .bind(history_id).fetch_optional(&state.db).await?
        .map(|r: sqlx::sqlite::SqliteRow| r.get("value_enc"))
        .ok_or(AppError::NotFound)?;
    aes_gcm::decrypt_str(&dek, &enc)
}

#[tauri::command]
pub async fn check_auto_secret(key: String) -> Result<bool> {
    Ok(should_auto_secret(&key))
}

#[tauri::command]
pub async fn generate_random_value(kind: String, length: Option<usize>) -> Result<String> {
    let len = length.unwrap_or(32);
    let value = match kind.as_str() {
        "hex32" => crate::crypto::random::random_hex(16),
        "hex64" => crate::crypto::random::random_hex(32),
        "hex128" => crate::crypto::random::random_hex(64),
        "base64_32" => crate::crypto::random::random_base64(24),
        "base64_64" => crate::crypto::random::random_base64(48),
        "alphanumeric" => crate::crypto::random::random_alphanumeric(len),
        "uuid" => crate::crypto::random::random_uuid(),
        _ => return Err(AppError::InvalidInput(format!("Unknown kind: {}", kind))),
    };
    Ok(value)
}
