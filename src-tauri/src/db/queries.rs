use sqlx::{Row, SqlitePool};
use crate::error::{AppError, Result};
use crate::db::models::*;

pub async fn get_config_value(pool: &SqlitePool, key: &str) -> Option<String> {
    sqlx::query("SELECT value FROM app_config WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .map(|r: sqlx::sqlite::SqliteRow| r.get::<String, _>("value"))
}

pub async fn set_config_value(pool: &SqlitePool, key: &str, value: &str) -> Result<()> {
    sqlx::query(
        "INSERT INTO app_config(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(key).bind(value)
    .execute(pool).await?;
    Ok(())
}

pub async fn get_app_config(pool: &SqlitePool) -> AppConfig {
    let auto_lock = get_config_value(pool, "auto_lock_minutes").await
        .and_then(|v| v.parse().ok()).unwrap_or(5);
    let lock_focus = get_config_value(pool, "lock_on_focus_loss").await
        .map(|v| v == "1").unwrap_or(false);
    let audit = get_config_value(pool, "audit_enabled").await
        .map(|v| v != "0").unwrap_or(true);
    let clip = get_config_value(pool, "clipboard_clear_seconds").await
        .and_then(|v| v.parse().ok()).unwrap_or(30);
    let show_countdown = get_config_value(pool, "show_lock_countdown").await
        .map(|v| v != "0").unwrap_or(true);
    let theme = get_config_value(pool, "theme").await
        .unwrap_or_else(|| "dark".to_string());
    let minimize_to_tray = get_config_value(pool, "minimize_to_tray").await
        .map(|v| v == "1").unwrap_or(false);
    let backup_enabled = get_config_value(pool, "backup_enabled").await
        .map(|v| v == "1").unwrap_or(false);
    let backup_interval_days = get_config_value(pool, "backup_interval_days").await
        .and_then(|v| v.parse().ok()).unwrap_or(7);
    let backup_folder = get_config_value(pool, "backup_folder").await;
    AppConfig {
        auto_lock_minutes: auto_lock, lock_on_focus_loss: lock_focus,
        audit_enabled: audit, clipboard_clear_seconds: clip,
        show_lock_countdown: show_countdown, theme, minimize_to_tray,
        backup_enabled, backup_interval_days, backup_folder,
    }
}

pub async fn save_app_config(pool: &SqlitePool, config: &AppConfig) -> Result<()> {
    set_config_value(pool, "auto_lock_minutes", &config.auto_lock_minutes.to_string()).await?;
    set_config_value(pool, "lock_on_focus_loss", if config.lock_on_focus_loss { "1" } else { "0" }).await?;
    set_config_value(pool, "audit_enabled", if config.audit_enabled { "1" } else { "0" }).await?;
    set_config_value(pool, "clipboard_clear_seconds", &config.clipboard_clear_seconds.to_string()).await?;
    set_config_value(pool, "show_lock_countdown", if config.show_lock_countdown { "1" } else { "0" }).await?;
    set_config_value(pool, "theme", &config.theme).await?;
    set_config_value(pool, "minimize_to_tray", if config.minimize_to_tray { "1" } else { "0" }).await?;
    set_config_value(pool, "backup_enabled", if config.backup_enabled { "1" } else { "0" }).await?;
    set_config_value(pool, "backup_interval_days", &config.backup_interval_days.to_string()).await?;
    if let Some(ref folder) = config.backup_folder {
        set_config_value(pool, "backup_folder", folder).await?;
    }
    Ok(())
}

pub async fn list_projects(pool: &SqlitePool) -> Result<Vec<Project>> {
    let rows = sqlx::query(
        "SELECT id, name, description, color, icon, sort_order, created_at, updated_at, deleted_at FROM projects WHERE deleted_at IS NULL ORDER BY sort_order, created_at"
    )
    .fetch_all(pool).await?;

    Ok(rows.into_iter().map(|r: sqlx::sqlite::SqliteRow| Project {
        id: r.get("id"), name: r.get("name"), description: r.get("description"),
        color: r.get("color"), icon: r.get("icon"),
        sort_order: r.get("sort_order"), created_at: r.get("created_at"), updated_at: r.get("updated_at"),
        deleted_at: r.try_get("deleted_at").ok().flatten(),
    }).collect())
}

pub async fn create_project(pool: &SqlitePool, p: &Project) -> Result<()> {
    sqlx::query(
        "INSERT INTO projects(id, name, description, color, icon, sort_order, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?)"
    )
    .bind(&p.id).bind(&p.name).bind(&p.description).bind(&p.color)
    .bind(&p.icon).bind(p.sort_order).bind(&p.created_at).bind(&p.updated_at)
    .execute(pool).await?;
    Ok(())
}

pub async fn update_project(pool: &SqlitePool, p: &Project) -> Result<()> {
    sqlx::query(
        "UPDATE projects SET name=?, description=?, color=?, icon=?, updated_at=? WHERE id=?"
    )
    .bind(&p.name).bind(&p.description).bind(&p.color).bind(&p.icon)
    .bind(&p.updated_at).bind(&p.id)
    .execute(pool).await?;
    Ok(())
}

pub async fn delete_project(pool: &SqlitePool, id: &str) -> Result<()> {
    sqlx::query("DELETE FROM projects WHERE id=?").bind(id).execute(pool).await?;
    Ok(())
}

pub async fn reorder_projects(pool: &SqlitePool, ids: &[String]) -> Result<()> {
    for (i, id) in ids.iter().enumerate() {
        sqlx::query("UPDATE projects SET sort_order=? WHERE id=?")
            .bind(i as i64).bind(id).execute(pool).await?;
    }
    Ok(())
}

fn row_to_tier(r: &sqlx::sqlite::SqliteRow) -> Tier {
    Tier {
        id: r.get("id"), project_id: r.get("project_id"), name: r.get("name"),
        sort_order: r.get("sort_order"), created_at: r.get("created_at"),
        updated_at: r.get("updated_at"), variable_count: r.get("variable_count"),
        source_path: r.try_get("source_path").ok().flatten(),
        auto_sync: r.try_get::<i64, _>("auto_sync").unwrap_or(0) != 0,
    }
}

pub async fn list_tiers(pool: &SqlitePool, project_id: &str) -> Result<Vec<Tier>> {
    let rows = sqlx::query(
        "SELECT t.id, t.project_id, t.name, t.sort_order, t.created_at, t.updated_at,
         t.source_path, t.auto_sync, COUNT(v.id) as variable_count
         FROM tiers t LEFT JOIN variables v ON v.tier_id = t.id
         WHERE t.project_id = ? GROUP BY t.id ORDER BY t.sort_order, t.created_at"
    )
    .bind(project_id).fetch_all(pool).await?;
    Ok(rows.iter().map(row_to_tier).collect())
}

pub async fn create_tier(pool: &SqlitePool, t: &Tier) -> Result<()> {
    sqlx::query(
        "INSERT INTO tiers(id, project_id, name, sort_order, created_at, updated_at) VALUES(?,?,?,?,?,?)"
    )
    .bind(&t.id).bind(&t.project_id).bind(&t.name)
    .bind(t.sort_order).bind(&t.created_at).bind(&t.updated_at)
    .execute(pool).await?;
    Ok(())
}

pub async fn rename_tier(pool: &SqlitePool, id: &str, name: &str, updated_at: &str) -> Result<()> {
    sqlx::query("UPDATE tiers SET name=?, updated_at=? WHERE id=?")
        .bind(name).bind(updated_at).bind(id).execute(pool).await?;
    Ok(())
}

pub async fn delete_tier(pool: &SqlitePool, id: &str) -> Result<()> {
    sqlx::query("DELETE FROM tiers WHERE id=?").bind(id).execute(pool).await?;
    Ok(())
}

pub async fn get_tier(pool: &SqlitePool, id: &str) -> Result<Tier> {
    let row = sqlx::query(
        "SELECT t.id, t.project_id, t.name, t.sort_order, t.created_at, t.updated_at,
         t.source_path, t.auto_sync, COUNT(v.id) as variable_count
         FROM tiers t LEFT JOIN variables v ON v.tier_id = t.id
         WHERE t.id = ? GROUP BY t.id"
    )
    .bind(id).fetch_optional(pool).await?
    .ok_or(AppError::NotFound)?;
    Ok(row_to_tier(&row))
}

pub async fn set_tier_source(pool: &SqlitePool, tier_id: &str, source_path: Option<&str>, auto_sync: bool) -> Result<()> {
    sqlx::query("UPDATE tiers SET source_path=?, auto_sync=? WHERE id=?")
        .bind(source_path).bind(if auto_sync { 1i64 } else { 0i64 }).bind(tier_id)
        .execute(pool).await?;
    Ok(())
}

pub async fn get_tier_source(pool: &SqlitePool, tier_id: &str) -> Option<(String, bool)> {
    let row = sqlx::query("SELECT source_path, auto_sync FROM tiers WHERE id=?")
        .bind(tier_id).fetch_optional(pool).await.ok()??;
    let path: Option<String> = row.try_get("source_path").ok().flatten();
    let auto_sync: bool = row.try_get::<i64, _>("auto_sync").unwrap_or(0) != 0;
    path.map(|p| (p, auto_sync))
}

pub struct VariableRaw {
    pub id: String,
    pub tier_id: String,
    pub key: String,
    pub value_enc: String,
    pub description: Option<String>,
    pub is_secret: bool,
    pub pinned: bool,
    pub sensitive: bool,
    pub group_name: Option<String>,
    pub value_type: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

fn row_to_variable(r: &sqlx::sqlite::SqliteRow) -> Variable {
    Variable {
        id: r.get("id"), tier_id: r.get("tier_id"), key: r.get("key"),
        description: r.get("description"),
        is_secret: r.get::<i64, _>("is_secret") != 0,
        pinned: r.try_get::<i64, _>("pinned").unwrap_or(0) != 0,
        sensitive: r.try_get::<i64, _>("sensitive").unwrap_or(0) != 0,
        group_name: r.try_get("group_name").ok().flatten(),
        value_type: r.try_get("value_type").ok().flatten(),
        sort_order: r.get("sort_order"),
        created_at: r.get("created_at"), updated_at: r.get("updated_at"),
    }
}

pub async fn list_variables(pool: &SqlitePool, tier_id: &str) -> Result<Vec<Variable>> {
    let rows = sqlx::query(
        "SELECT id, tier_id, key, description, is_secret, pinned, sensitive, group_name, value_type, sort_order, created_at, updated_at
         FROM variables WHERE tier_id = ? AND deleted_at IS NULL
         ORDER BY pinned DESC, group_name NULLS LAST, sort_order, created_at"
    )
    .bind(tier_id).fetch_all(pool).await?;
    Ok(rows.iter().map(row_to_variable).collect())
}

pub async fn get_variable_enc(pool: &SqlitePool, id: &str) -> Result<String> {
    sqlx::query("SELECT value_enc FROM variables WHERE id=?")
        .bind(id).fetch_optional(pool).await?
        .map(|r: sqlx::sqlite::SqliteRow| r.get::<String, _>("value_enc"))
        .ok_or(AppError::NotFound)
}

pub async fn get_all_variable_encs(pool: &SqlitePool, tier_id: &str) -> Result<Vec<(String, String)>> {
    let rows = sqlx::query(
        "SELECT key, value_enc FROM variables WHERE tier_id=? ORDER BY sort_order, created_at"
    )
    .bind(tier_id).fetch_all(pool).await?;
    Ok(rows.into_iter().map(|r: sqlx::sqlite::SqliteRow| (r.get("key"), r.get("value_enc"))).collect())
}

pub async fn create_variable(pool: &SqlitePool, v: &VariableRaw) -> Result<()> {
    sqlx::query(
        "INSERT INTO variables(id, tier_id, key, value_enc, description, is_secret, pinned, sensitive, group_name, value_type, sort_order, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)"
    )
    .bind(&v.id).bind(&v.tier_id).bind(&v.key).bind(&v.value_enc)
    .bind(&v.description).bind(v.is_secret as i64)
    .bind(v.pinned as i64).bind(v.sensitive as i64)
    .bind(&v.group_name).bind(&v.value_type)
    .bind(v.sort_order).bind(&v.created_at).bind(&v.updated_at)
    .execute(pool).await
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") { AppError::DuplicateKey } else { AppError::from(e) }
    })?;
    Ok(())
}

pub async fn update_variable(pool: &SqlitePool, v: &VariableRaw) -> Result<()> {

    let old_enc: Option<String> = sqlx::query("SELECT value_enc FROM variables WHERE id=?")
        .bind(&v.id).fetch_optional(pool).await?
        .map(|r: sqlx::sqlite::SqliteRow| r.get("value_enc"));

    if let Some(enc) = old_enc {
        sqlx::query("INSERT INTO variable_history(variable_id, value_enc, changed_at) VALUES(?,?,?)")
            .bind(&v.id).bind(&enc).bind(&v.updated_at).execute(pool).await?;

        sqlx::query(
            "DELETE FROM variable_history WHERE variable_id=? AND id NOT IN (SELECT id FROM variable_history WHERE variable_id=? ORDER BY id DESC LIMIT 10)"
        )
        .bind(&v.id).bind(&v.id).execute(pool).await?;
    }

    sqlx::query(
        "UPDATE variables SET key=?, value_enc=?, description=?, is_secret=?, pinned=?, sensitive=?, group_name=?, value_type=?, updated_at=? WHERE id=?"
    )
    .bind(&v.key).bind(&v.value_enc).bind(&v.description)
    .bind(v.is_secret as i64).bind(v.pinned as i64).bind(v.sensitive as i64)
    .bind(&v.group_name).bind(&v.value_type)
    .bind(&v.updated_at).bind(&v.id)
    .execute(pool).await
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") { AppError::DuplicateKey } else { AppError::from(e) }
    })?;
    Ok(())
}

pub async fn soft_delete_variable(pool: &SqlitePool, id: &str, deleted_at: &str) -> Result<()> {
    sqlx::query("UPDATE variables SET deleted_at=? WHERE id=?")
        .bind(deleted_at).bind(id).execute(pool).await?;
    Ok(())
}

pub async fn restore_variable(pool: &SqlitePool, id: &str) -> Result<()> {
    sqlx::query("UPDATE variables SET deleted_at=NULL WHERE id=?")
        .bind(id).execute(pool).await?;
    Ok(())
}

pub async fn hard_delete_variable(pool: &SqlitePool, id: &str) -> Result<()> {
    sqlx::query("DELETE FROM variables WHERE id=?").bind(id).execute(pool).await?;
    Ok(())
}

pub async fn soft_delete_project(pool: &SqlitePool, id: &str, deleted_at: &str) -> Result<()> {
    sqlx::query("UPDATE projects SET deleted_at=? WHERE id=?")
        .bind(deleted_at).bind(id).execute(pool).await?;
    Ok(())
}

pub async fn restore_project(pool: &SqlitePool, id: &str) -> Result<()> {
    sqlx::query("UPDATE projects SET deleted_at=NULL WHERE id=?")
        .bind(id).execute(pool).await?;
    Ok(())
}

pub async fn hard_delete_project(pool: &SqlitePool, id: &str) -> Result<()> {
    sqlx::query("DELETE FROM projects WHERE id=?").bind(id).execute(pool).await?;
    Ok(())
}

pub async fn pin_variable(pool: &SqlitePool, id: &str, pinned: bool, updated_at: &str) -> Result<()> {
    sqlx::query("UPDATE variables SET pinned=?, updated_at=? WHERE id=?")
        .bind(pinned as i64).bind(updated_at).bind(id).execute(pool).await?;
    Ok(())
}

pub async fn delete_variable(pool: &SqlitePool, id: &str) -> Result<()> {
    sqlx::query("DELETE FROM variables WHERE id=?").bind(id).execute(pool).await?;
    Ok(())
}

pub async fn reorder_variables(pool: &SqlitePool, ids: &[String]) -> Result<()> {
    for (i, id) in ids.iter().enumerate() {
        sqlx::query("UPDATE variables SET sort_order=? WHERE id=?")
            .bind(i as i64).bind(id).execute(pool).await?;
    }
    Ok(())
}

pub async fn get_variable_history(pool: &SqlitePool, variable_id: &str) -> Result<Vec<VariableHistory>> {
    let rows = sqlx::query(
        "SELECT id, variable_id, value_enc, changed_at FROM variable_history WHERE variable_id=? ORDER BY id DESC"
    )
    .bind(variable_id).fetch_all(pool).await?;
    Ok(rows.into_iter().map(|r: sqlx::sqlite::SqliteRow| VariableHistory {
        id: r.get("id"), variable_id: r.get("variable_id"),
        value_enc: r.get("value_enc"), changed_at: r.get("changed_at"),
    }).collect())
}

pub async fn search_variables(pool: &SqlitePool, query: &str) -> Result<Vec<SearchResult>> {
    let pattern = format!("%{}%", query);
    let rows = sqlx::query(
        "SELECT v.id as variable_id, v.key, v.description, v.tier_id,
         t.name as tier_name, t.project_id,
         p.name as project_name
         FROM variables v
         JOIN tiers t ON t.id = v.tier_id
         JOIN projects p ON p.id = t.project_id
         WHERE (v.key LIKE ? OR v.description LIKE ?) AND v.deleted_at IS NULL
         ORDER BY v.key LIMIT 50"
    )
    .bind(&pattern).bind(&pattern).fetch_all(pool).await?;

    Ok(rows.into_iter().map(|r: sqlx::sqlite::SqliteRow| SearchResult {
        variable_id: r.get("variable_id"), key: r.get("key"), description: r.get("description"),
        project_name: r.get("project_name"), tier_name: r.get("tier_name"),
        project_id: r.get("project_id"), tier_id: r.get("tier_id"),
    }).collect())
}

pub async fn add_audit(pool: &SqlitePool, action: &str, entity_type: &str, entity_id: &str, detail: Option<&str>) -> Result<()> {
    let enabled = get_config_value(pool, "audit_enabled").await.map(|v| v != "0").unwrap_or(true);
    if !enabled { return Ok(()); }
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO audit_log(action, entity_type, entity_id, detail, timestamp) VALUES(?,?,?,?,?)"
    )
    .bind(action).bind(entity_type).bind(entity_id).bind(detail).bind(now)
    .execute(pool).await?;
    Ok(())
}

pub async fn get_audit_log(pool: &SqlitePool, limit: i64, offset: i64) -> Result<Vec<AuditEntry>> {
    let rows = sqlx::query(
        "SELECT id, action, entity_type, entity_id, detail, timestamp FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?"
    )
    .bind(limit).bind(offset).fetch_all(pool).await?;
    Ok(rows.into_iter().map(|r: sqlx::sqlite::SqliteRow| AuditEntry {
        id: r.get("id"), action: r.get("action"), entity_type: r.get("entity_type"),
        entity_id: r.get("entity_id"), detail: r.get("detail"), timestamp: r.get("timestamp"),
    }).collect())
}
