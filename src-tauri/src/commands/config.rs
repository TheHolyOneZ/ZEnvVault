use std::sync::Arc;
use tauri::State;

use crate::db::{models::AppConfig, queries};
use crate::error::{AppError, Result};
use crate::state::AppState;

#[tauri::command]
pub async fn get_config(state: State<'_, Arc<AppState>>) -> Result<AppConfig> {
    Ok(queries::get_app_config(&state.db).await)
}

#[tauri::command]
pub async fn update_config(config: AppConfig, state: State<'_, Arc<AppState>>) -> Result<()> {
    queries::save_app_config(&state.db, &config).await
}

#[tauri::command]
pub async fn get_audit_log(
    limit: i64,
    offset: i64,
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<crate::db::models::AuditEntry>> {
    if state.is_locked().await { return Err(AppError::Locked); }
    queries::get_audit_log(&state.db, limit, offset).await
}

#[tauri::command]
pub async fn get_db_path(app: tauri::AppHandle) -> Result<String> {
    use tauri::Manager;
    let data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(data_dir.join("zvault.db").to_string_lossy().to_string())
}
