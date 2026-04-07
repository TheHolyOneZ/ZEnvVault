use std::sync::Arc;
use tauri::State;

use crate::crypto::{aes_gcm, random};
use crate::db::{
    models::{ImportPreviewItem, ImportResult},
    queries::{self, VariableRaw},
};
use crate::env_parser;
use crate::error::{AppError, Result};
use crate::state::AppState;

fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[tauri::command]
pub async fn preview_import(path: String, tier_id: String, state: State<'_, Arc<AppState>>) -> Result<Vec<ImportPreviewItem>> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let content = std::fs::read_to_string(&path)
        .map_err(|_| AppError::FileNotFound(path.clone()))?;
    let parsed = env_parser::parse_env_file(&content)?;

    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;
    let existing_encs = queries::get_all_variable_encs(&state.db, &tier_id).await?;
    let existing: std::collections::HashMap<String, String> = existing_encs.into_iter()
        .map(|(k, enc)| (k, aes_gcm::decrypt_str(&dek, &enc).unwrap_or_default()))
        .collect();

    let items = parsed.into_iter().map(|pv| {
        let status = if let Some(old) = existing.get(&pv.key) {
            if *old == pv.value { "unchanged" } else { "conflict" }
        } else {
            "new"
        };
        ImportPreviewItem { key: pv.key, value: pv.value, status: status.to_string() }
    }).collect();

    Ok(items)
}

#[tauri::command]
pub async fn import_env_file(
    path: String,
    tier_id: String,
    strategy: String, 
    state: State<'_, Arc<AppState>>,
) -> Result<ImportResult> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;
    let content = std::fs::read_to_string(&path)
        .map_err(|_| AppError::FileNotFound(path.clone()))?;
    let parsed = env_parser::parse_env_file(&content)?;

    use sqlx::Row;
    if strategy == "replace" {
        sqlx::query("DELETE FROM variables WHERE tier_id=?")
            .bind(&tier_id).execute(&state.db).await?;
    }

    let existing_keys: std::collections::HashSet<String> = if strategy != "replace" {
        sqlx::query("SELECT key FROM variables WHERE tier_id=?")
            .bind(&tier_id).fetch_all(&state.db).await?
            .into_iter().map(|r: sqlx::sqlite::SqliteRow| r.get::<String,_>("key")).collect()
    } else {
        std::collections::HashSet::new()
    };

    let mut added = 0usize;
    let mut updated = 0usize;
    let mut skipped = 0usize;

    let now = now();
    for (i, pv) in parsed.iter().enumerate() {
        let value_enc = aes_gcm::encrypt_str(&dek, &pv.value)?;
        let auto_secret = crate::commands::variables::should_auto_secret(&pv.key);

        if existing_keys.contains(&pv.key) {
            match strategy.as_str() {
                "skip" => { skipped += 1; continue; }
                "overwrite" => {
                    let id: String = sqlx::query("SELECT id FROM variables WHERE tier_id=? AND key=?")
                        .bind(&tier_id).bind(&pv.key)
                        .fetch_one(&state.db).await
                        .map(|r: sqlx::sqlite::SqliteRow| r.get("id"))?;
                    let raw = VariableRaw {
                        id, tier_id: tier_id.clone(), key: pv.key.clone(),
                        value_enc, description: pv.description.clone(), is_secret: auto_secret,
                        sort_order: i as i64, created_at: now.clone(), updated_at: now.clone(),
                    };
                    queries::update_variable(&state.db, &raw).await?;
                    updated += 1;
                }
                _ => { skipped += 1; }
            }
        } else {
            let raw = VariableRaw {
                id: random::new_id(), tier_id: tier_id.clone(), key: pv.key.clone(),
                value_enc, description: pv.description.clone(), is_secret: auto_secret,
                sort_order: i as i64, created_at: now.clone(), updated_at: now.clone(),
            };
            queries::create_variable(&state.db, &raw).await?;
            added += 1;
        }
    }

    queries::add_audit(&state.db, "import", "tier", &tier_id, Some(&path)).await?;
    Ok(ImportResult { added, updated, skipped })
}

#[tauri::command]
pub async fn export_env_file(
    tier_id: String,
    path: String,
    state: State<'_, Arc<AppState>>,
) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;

    
    use sqlx::Row;
    let tier_info_row = sqlx::query(
        "SELECT t.name as tier_name, p.name as project_name FROM tiers t JOIN projects p ON p.id = t.project_id WHERE t.id=?"
    )
    .bind(&tier_id).fetch_optional(&state.db).await?.ok_or(AppError::NotFound)?;
    let tier_name: String = tier_info_row.get("tier_name");
    let project_name: String = tier_info_row.get("project_name");

    let var_rows = sqlx::query(
        "SELECT key, value_enc, description FROM variables WHERE tier_id=? ORDER BY key"
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

    let content = env_parser::generate_env_file(&pairs, &project_name, &tier_name);
    std::fs::write(&path, content)?;

    queries::add_audit(&state.db, "export", "tier", &tier_id, Some(&path)).await?;
    Ok(())
}
