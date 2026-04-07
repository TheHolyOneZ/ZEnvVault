use sqlx::SqlitePool;
use crate::error::Result;

pub async fn run(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS app_config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS projects (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT,
            color       TEXT NOT NULL DEFAULT '#7C6AF7',
            icon        TEXT,
            sort_order  INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tiers (
            id          TEXT PRIMARY KEY,
            project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            sort_order  INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL,
            UNIQUE(project_id, name)
        );

        CREATE TABLE IF NOT EXISTS variables (
            id          TEXT PRIMARY KEY,
            tier_id     TEXT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
            key         TEXT NOT NULL,
            value_enc   TEXT NOT NULL,
            description TEXT,
            is_secret   INTEGER NOT NULL DEFAULT 1,
            sort_order  INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL,
            UNIQUE(tier_id, key)
        );

        CREATE TABLE IF NOT EXISTS variable_history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            variable_id TEXT NOT NULL REFERENCES variables(id) ON DELETE CASCADE,
            value_enc   TEXT NOT NULL,
            changed_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            action      TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id   TEXT NOT NULL,
            detail      TEXT,
            timestamp   TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_variables_tier ON variables(tier_id);
        CREATE INDEX IF NOT EXISTS idx_tiers_project ON tiers(project_id);
        CREATE INDEX IF NOT EXISTS idx_history_variable ON variable_history(variable_id);
        CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(timestamp);
        "#,
    )
    .execute(pool)
    .await?;


    let _ = sqlx::query("ALTER TABLE tiers ADD COLUMN source_path TEXT").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE tiers ADD COLUMN auto_sync INTEGER NOT NULL DEFAULT 0").execute(pool).await;

    Ok(())
}
