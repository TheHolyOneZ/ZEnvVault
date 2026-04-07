use std::sync::Arc;
use tauri::State;

use crate::db::{models::SearchResult, queries};
use crate::error::{AppError, Result};
use crate::state::AppState;

#[tauri::command]
pub async fn search_variables(query: String, state: State<'_, Arc<AppState>>) -> Result<Vec<SearchResult>> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    if query.is_empty() {
        return Ok(vec![]);
    }
    queries::search_variables(&state.db, &query).await
}
