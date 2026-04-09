use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

use crate::db::queries;
use crate::error::{AppError, Result};
use crate::state::AppState;

fn db_path(app: &AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir()
        .expect("no app data dir")
        .join("zvault.db")
}

fn last_backup_path(app: &AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir()
        .expect("no app data dir")
        .join("last_backup.txt")
}

fn days_since_last_backup(app: &AppHandle) -> i64 {
    let path = last_backup_path(app);
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(ts) = content.trim().parse::<i64>() {
            let now = chrono::Utc::now().timestamp();
            return (now - ts) / 86400;
        }
    }
    i64::MAX
}

fn record_backup_time(app: &AppHandle) {
    let now = chrono::Utc::now().timestamp().to_string();
    let _ = std::fs::write(last_backup_path(app), now);
}

#[tauri::command]
pub async fn backup_vault(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<String> {
    let config = queries::get_app_config(&state.db).await;
    let folder = config.backup_folder.ok_or_else(|| AppError::Io("No backup folder configured".into()))?;

    std::fs::create_dir_all(&folder)
        .map_err(|e| AppError::Io(e.to_string()))?;

    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let dest = std::path::Path::new(&folder).join(format!("zvault_backup_{}.db", ts));

    std::fs::copy(db_path(&app), &dest)
        .map_err(|e| AppError::Io(e.to_string()))?;

    record_backup_time(&app);
    Ok(dest.to_string_lossy().to_string())
}

pub async fn maybe_auto_backup(app: &AppHandle, state: &Arc<AppState>) {
    let config = queries::get_app_config(&state.db).await;
    if !config.backup_enabled { return; }
    if config.backup_folder.is_none() { return; }
    if days_since_last_backup(app) < config.backup_interval_days { return; }

    let folder = config.backup_folder.unwrap();
    let _ = std::fs::create_dir_all(&folder);
    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let dest = std::path::Path::new(&folder).join(format!("zvault_backup_{}.db", ts));
    if std::fs::copy(db_path(app), &dest).is_ok() {
        record_backup_time(app);
    }
}
