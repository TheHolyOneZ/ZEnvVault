use std::sync::Arc;
use tauri::State;

use crate::crypto::{aes_gcm, random};
use crate::db::{models::Tier, queries};
use crate::env_parser;
use crate::error::{AppError, Result};
use crate::state::AppState;

fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[tauri::command]
pub async fn list_tiers(project_id: String, state: State<'_, Arc<AppState>>) -> Result<Vec<Tier>> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::list_tiers(&state.db, &project_id).await
}

#[tauri::command]
pub async fn create_tier(
    project_id: String,
    name: String,
    state: State<'_, Arc<AppState>>,
) -> Result<Tier> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let now = now();
    let t = Tier {
        id: random::new_id(), project_id, name, sort_order: 0,
        created_at: now.clone(), updated_at: now, variable_count: 0,
        source_path: None, auto_sync: false,
    };
    queries::create_tier(&state.db, &t).await?;
    queries::add_audit(&state.db, "create", "tier", &t.id, Some(&t.name)).await?;
    Ok(t)
}

#[tauri::command]
pub async fn rename_tier(id: String, name: String, state: State<'_, Arc<AppState>>) -> Result<Tier> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    let now = now();
    queries::rename_tier(&state.db, &id, &name, &now).await?;
    queries::get_tier(&state.db, &id).await
}

#[tauri::command]
pub async fn delete_tier(id: String, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::add_audit(&state.db, "delete", "tier", &id, None).await?;
    queries::delete_tier(&state.db, &id).await
}

#[tauri::command]
pub async fn clone_tier(
    source_id: String,
    target_project_id: String,
    new_name: String,
    state: State<'_, Arc<AppState>>,
) -> Result<Tier> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    
    let now = now();
    let new_tier = Tier {
        id: random::new_id(), project_id: target_project_id,
        name: new_name, sort_order: 0, created_at: now.clone(), updated_at: now.clone(),
        variable_count: 0, source_path: None, auto_sync: false,
    };
    queries::create_tier(&state.db, &new_tier).await?;

    
    use sqlx::Row;
    type VarRow = (String, String, Option<String>, i64, i64);
    let vars: Vec<VarRow> = sqlx::query(
        "SELECT key, value_enc, description, is_secret, sort_order FROM variables WHERE tier_id=? ORDER BY sort_order"
    )
    .bind(&source_id).fetch_all(&state.db).await?
    .into_iter().map(|r: sqlx::sqlite::SqliteRow| (
        r.get("key"), r.get("value_enc"), r.get("description"), r.get("is_secret"), r.get("sort_order")
    )).collect();

    for (key, value_enc, description, is_secret, sort_order) in vars {
        let new_id = random::new_id();
        sqlx::query(
            "INSERT INTO variables(id, tier_id, key, value_enc, description, is_secret, sort_order, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)"
        )
        .bind(&new_id).bind(&new_tier.id).bind(&key).bind(&value_enc)
        .bind(&description).bind(is_secret).bind(sort_order).bind(&now).bind(&now)
        .execute(&state.db).await?;
    }

    queries::add_audit(&state.db, "clone", "tier", &new_tier.id, Some(&new_tier.name)).await?;
    queries::get_tier(&state.db, &new_tier.id).await
}

#[tauri::command]
pub async fn get_tier_diff(
    left_tier_id: String,
    right_tier_id: String,
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<crate::db::models::DiffRow>> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;

    use sqlx::Row;
    let fetch_kv = |tid: String| {
        let pool = state.db.clone();
        async move {
            let rows = sqlx::query("SELECT key, value_enc FROM variables WHERE tier_id=?")
                .bind(tid).fetch_all(&pool).await.unwrap_or_default();
            rows.into_iter().map(|r: sqlx::sqlite::SqliteRow| (r.get::<String,_>("key"), r.get::<String,_>("value_enc"))).collect::<Vec<_>>()
        }
    };
    let (left_raw, right_raw) = tokio::join!(fetch_kv(left_tier_id), fetch_kv(right_tier_id));

    use std::collections::HashMap;
    let left_map: HashMap<String, String> = left_raw.into_iter()
        .map(|(k, enc)| (k, aes_gcm::decrypt_str(&dek, &enc).unwrap_or_default()))
        .collect();
    let right_map: HashMap<String, String> = right_raw.into_iter()
        .map(|(k, enc)| (k, aes_gcm::decrypt_str(&dek, &enc).unwrap_or_default()))
        .collect();

    let mut all_keys: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    all_keys.extend(left_map.keys().cloned());
    all_keys.extend(right_map.keys().cloned());

    let mut rows = Vec::new();
    for key in all_keys {
        let left_val = left_map.get(&key).cloned();
        let right_val = right_map.get(&key).cloned();
        let status = match (&left_val, &right_val) {
            (Some(l), Some(r)) => if l == r { "both" } else { "different" },
            (Some(_), None) => "left-only",
            (None, Some(_)) => "right-only",
            _ => "both",
        }.to_string();
        rows.push(crate::db::models::DiffRow { key, left_value: left_val, right_value: right_val, status });
    }

    Ok(rows)
}

#[tauri::command]
pub async fn link_tier_file(
    tier_id: String,
    path: String,
    auto_sync: bool,
    state: State<'_, Arc<AppState>>,
) -> Result<Tier> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::set_tier_source(&state.db, &tier_id, Some(&path), auto_sync).await?;
    queries::get_tier(&state.db, &tier_id).await
}

#[tauri::command]
pub async fn unlink_tier_file(tier_id: String, state: State<'_, Arc<AppState>>) -> Result<Tier> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::set_tier_source(&state.db, &tier_id, None, false).await?;
    queries::get_tier(&state.db, &tier_id).await
}

#[tauri::command]
pub async fn sync_tier_to_file(tier_id: String, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let (source_path, _) = queries::get_tier_source(&state.db, &tier_id).await
        .ok_or(AppError::InvalidInput("No file linked to this environment".into()))?;

    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;

    use sqlx::Row;
    let var_rows = sqlx::query(
        "SELECT key, value_enc, description FROM variables WHERE tier_id=? ORDER BY sort_order, key"
    )
    .bind(&tier_id).fetch_all(&state.db).await?;

    let mut pairs = Vec::new();
    for r in var_rows {
        let key: String = r.get("key");
        let value_enc: String = r.get("value_enc");
        let description: Option<String> = r.get("description");
        let value = aes_gcm::decrypt_str(&dek, &value_enc)?;
        pairs.push((key, value, description));
    }

    
    let tier_info = sqlx::query(
        "SELECT t.name as tier_name, p.name as project_name FROM tiers t JOIN projects p ON p.id = t.project_id WHERE t.id=?"
    )
    .bind(&tier_id).fetch_optional(&state.db).await?;

    let (project_name, tier_name) = match tier_info {
        Some(r) => (r.get::<String,_>("project_name"), r.get::<String,_>("tier_name")),
        None => ("Unknown".to_string(), "Unknown".to_string()),
    };

    let content = env_parser::generate_env_file(&pairs, &project_name, &tier_name);
    std::fs::write(&source_path, content)
        .map_err(|e| AppError::Io(e.to_string()))?;

    queries::add_audit(&state.db, "sync_to_file", "tier", &tier_id, Some(&source_path)).await?;
    Ok(())
}
