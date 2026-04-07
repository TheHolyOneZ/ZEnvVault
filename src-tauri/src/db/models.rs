use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub icon: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tier {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
    pub variable_count: i64,
    pub source_path: Option<String>,
    pub auto_sync: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Variable {
    pub id: String,
    pub tier_id: String,
    pub key: String,
    pub description: Option<String>,
    pub is_secret: bool,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VariableWithValue {
    pub id: String,
    pub tier_id: String,
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    pub is_secret: bool,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VariableHistory {
    pub id: i64,
    pub variable_id: String,
    pub value_enc: String,
    pub changed_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditEntry {
    pub id: i64,
    pub action: String,
    pub entity_type: String,
    pub entity_id: String,
    pub detail: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub auto_lock_minutes: i64,
    pub lock_on_focus_loss: bool,
    pub audit_enabled: bool,
    pub clipboard_clear_seconds: i64,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            auto_lock_minutes: 5,
            lock_on_focus_loss: false,
            audit_enabled: true,
            clipboard_clear_seconds: 30,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub variable_id: String,
    pub key: String,
    pub description: Option<String>,
    pub project_name: String,
    pub tier_name: String,
    pub project_id: String,
    pub tier_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedVariable {
    pub key: String,
    pub value: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportPreviewItem {
    pub key: String,
    pub value: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportResult {
    pub added: usize,
    pub updated: usize,
    pub skipped: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffRow {
    pub key: String,
    pub left_value: Option<String>,
    pub right_value: Option<String>,
    pub status: String,
}
