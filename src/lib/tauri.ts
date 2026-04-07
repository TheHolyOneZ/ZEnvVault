import { invoke } from '@tauri-apps/api/core';
import type {
  Project, Tier, Variable, VariableHistory, AppConfig,
  SearchResult, ImportPreviewItem, ImportResult, DiffRow,
  AuditEntry, MergeStrategy, RandomKind
} from '@/types';

export const isFirstRun = () => invoke<boolean>('is_first_run');
export const isLocked = () => invoke<boolean>('is_locked');
export const setupMasterPassword = (password: string) => invoke<string>('setup_master_password', { password });
export const resetPasswordWithRecovery = (code: string, newPassword: string) =>
  invoke<void>('reset_password_with_recovery', { code, newPassword });
export const wipeVault = () => invoke<void>('wipe_vault');
export const regenerateRecoveryCode = () => invoke<string>('regenerate_recovery_code');
export const unlock = (password: string) => invoke<void>('unlock', { password });
export const lock = () => invoke<void>('lock');
export const changeMasterPassword = (oldPassword: string, newPassword: string) =>
  invoke<void>('change_master_password', { oldPassword, newPassword });

export const listProjects = () => invoke<Project[]>('list_projects');
export const createProject = (name: string, description?: string, color?: string, icon?: string) =>
  invoke<Project>('create_project', { name, description, color, icon });
export const updateProject = (id: string, name: string, description: string | undefined, color: string, icon?: string) =>
  invoke<Project>('update_project', { id, name, description, color, icon });
export const deleteProject = (id: string) => invoke<void>('delete_project', { id });
export const reorderProjects = (ids: string[]) => invoke<void>('reorder_projects', { ids });

export const listTiers = (projectId: string) => invoke<Tier[]>('list_tiers', { projectId });
export const createTier = (projectId: string, name: string) => invoke<Tier>('create_tier', { projectId, name });
export const renameTier = (id: string, name: string) => invoke<Tier>('rename_tier', { id, name });
export const deleteTier = (id: string) => invoke<void>('delete_tier', { id });
export const cloneTier = (sourceId: string, targetProjectId: string, newName: string) =>
  invoke<Tier>('clone_tier', { sourceId, targetProjectId, newName });
export const getTierDiff = (leftTierId: string, rightTierId: string) =>
  invoke<DiffRow[]>('get_tier_diff', { leftTierId, rightTierId });
export const linkTierFile = (tierId: string, path: string, autoSync: boolean) =>
  invoke<Tier>('link_tier_file', { tierId, path, autoSync });
export const unlinkTierFile = (tierId: string) =>
  invoke<Tier>('unlink_tier_file', { tierId });
export const syncTierToFile = (tierId: string) =>
  invoke<void>('sync_tier_to_file', { tierId });

export const listVariables = (tierId: string) => invoke<Variable[]>('list_variables', { tierId });
export const revealVariable = (id: string) => invoke<string>('reveal_variable', { id });
export const revealAllVariables = (tierId: string) => invoke<Record<string, string>>('reveal_all_variables', { tierId });
export const createVariable = (tierId: string, key: string, value: string, description: string | undefined, isSecret: boolean) =>
  invoke<Variable>('create_variable', { tierId, key, value, description, isSecret });
export const updateVariable = (id: string, key: string, value: string, description: string | undefined, isSecret: boolean) =>
  invoke<Variable>('update_variable', { id, key, value, description, isSecret });
export const deleteVariable = (id: string) => invoke<void>('delete_variable', { id });
export const reorderVariables = (ids: string[]) => invoke<void>('reorder_variables', { ids });
export const getVariableHistory = (variableId: string) => invoke<VariableHistory[]>('get_variable_history', { variableId });
export const revealHistoryValue = (historyId: number) => invoke<string>('reveal_history_value', { historyId });
export const checkAutoSecret = (key: string) => invoke<boolean>('check_auto_secret', { key });
export const generateRandomValue = (kind: RandomKind, length?: number) =>
  invoke<string>('generate_random_value', { kind, length });

export const copyVariableValue = (id: string) => invoke<void>('copy_variable_value', { id });
export const clearClipboard = () => invoke<void>('clear_clipboard');

export const previewImport = (path: string, tierId: string) =>
  invoke<ImportPreviewItem[]>('preview_import', { path, tierId });
export const importEnvFile = (path: string, tierId: string, strategy: MergeStrategy) =>
  invoke<ImportResult>('import_env_file', { path, tierId, strategy });
export const exportEnvFile = (tierId: string, path: string) =>
  invoke<void>('export_env_file', { tierId, path });

export const searchVariables = (query: string) => invoke<SearchResult[]>('search_variables', { query });

export const getConfig = () => invoke<AppConfig>('get_config');
export const updateConfig = (config: AppConfig) => invoke<void>('update_config', { config });
export const getAuditLog = (limit: number, offset: number) => invoke<AuditEntry[]>('get_audit_log', { limit, offset });
export const getDbPath = () => invoke<string>('get_db_path');
