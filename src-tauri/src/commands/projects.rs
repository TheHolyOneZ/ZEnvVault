use std::sync::Arc;
use tauri::State;

use crate::crypto::random;
use crate::db::{models::Project, queries};
use crate::error::{AppError, Result};
use crate::state::AppState;

fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[tauri::command]
pub async fn list_projects(state: State<'_, Arc<AppState>>) -> Result<Vec<Project>> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::list_projects(&state.db).await
}

#[tauri::command]
pub async fn create_project(
    name: String,
    description: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    state: State<'_, Arc<AppState>>,
) -> Result<Project> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let now = now();
    let p = Project {
        id: random::new_id(),
        name,
        description,
        color: color.unwrap_or_else(|| "#7C6AF7".to_string()),
        icon,
        sort_order: 0,
        created_at: now.clone(),
        updated_at: now,
        deleted_at: None,
    };
    queries::create_project(&state.db, &p).await?;
    queries::add_audit(&state.db, "create", "project", &p.id, Some(&p.name)).await?;
    Ok(p)
}

#[tauri::command]
pub async fn update_project(
    id: String,
    name: String,
    description: Option<String>,
    color: String,
    icon: Option<String>,
    state: State<'_, Arc<AppState>>,
) -> Result<Project> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let now = now();
    let p = Project { id, name, description, color, icon, sort_order: 0, created_at: now.clone(), updated_at: now, deleted_at: None };
    queries::update_project(&state.db, &p).await?;
    queries::add_audit(&state.db, "update", "project", &p.id, Some(&p.name)).await?;
    Ok(p)
}

#[tauri::command]
pub async fn delete_project(id: String, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::add_audit(&state.db, "delete_project", "project", &id, None).await?;
    queries::soft_delete_project(&state.db, &id, &now()).await
}

#[tauri::command]
pub async fn restore_project(id: String, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::restore_project(&state.db, &id).await
}

#[tauri::command]
pub async fn hard_delete_project(id: String, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::hard_delete_project(&state.db, &id).await
}

#[tauri::command]
pub async fn reorder_projects(ids: Vec<String>, state: State<'_, Arc<AppState>>) -> Result<()> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;
    queries::reorder_projects(&state.db, &ids).await
}
