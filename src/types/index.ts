export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Tier {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  variable_count: number;
  source_path?: string;
  auto_sync: boolean;
}

export interface Variable {
  id: string;
  tier_id: string;
  key: string;
  description?: string;
  is_secret: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VariableHistory {
  id: number;
  variable_id: string;
  value_enc: string;
  changed_at: string;
}

export interface AppConfig {
  auto_lock_minutes: number;
  lock_on_focus_loss: boolean;
  audit_enabled: boolean;
  clipboard_clear_seconds: number;
  show_lock_countdown: boolean;
}

export interface SearchResult {
  variable_id: string;
  key: string;
  description?: string;
  project_name: string;
  tier_name: string;
  project_id: string;
  tier_id: string;
}

export interface ImportPreviewItem {
  key: string;
  value: string;
  status: 'new' | 'conflict' | 'unchanged';
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
}

export interface DiffRow {
  key: string;
  left_value?: string;
  right_value?: string;
  status: 'both' | 'left-only' | 'right-only' | 'different';
}

export interface AuditEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  detail?: string;
  timestamp: string;
}

export type MergeStrategy = 'skip' | 'overwrite' | 'replace';

export type RandomKind = 'hex32' | 'hex64' | 'hex128' | 'base64_32' | 'base64_64' | 'alphanumeric' | 'uuid';
