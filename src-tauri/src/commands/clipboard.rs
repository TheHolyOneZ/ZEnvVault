use std::sync::Arc;
use tauri::State;
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::crypto::aes_gcm;
use crate::db::queries;
use crate::error::{AppError, Result};
use crate::state::AppState;

#[tauri::command]
pub async fn copy_variable_value(
    id: String,
    app: tauri::AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;
    let enc = queries::get_variable_enc(&state.db, &id).await?;
    let value = aes_gcm::decrypt_str(&dek, &enc)?;

    app.clipboard().write_text(value)
        .map_err(|e| AppError::Io(e.to_string()))?;

    queries::add_audit(&state.db, "copy", "variable", &id, None).await?;
    Ok(())
}

#[tauri::command]
pub async fn clear_clipboard(app: tauri::AppHandle) -> Result<()> {
    app.clipboard().write_text(String::new())
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}
