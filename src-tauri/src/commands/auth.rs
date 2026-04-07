use std::sync::Arc;
use tauri::State;

use crate::crypto::{aes_gcm, argon2 as kdf, random};
use crate::db::queries;
use crate::error::{AppError, Result};
use crate::state::AppState;

fn seal_dek(wrapping_key: &[u8; 32], dek: &[u8; 32]) -> Result<String> {
    aes_gcm::encrypt_str(wrapping_key, &hex::encode(dek))
}

fn unseal_dek(wrapping_key: &[u8; 32], sealed: &str) -> Result<[u8; 32]> {
    let hex_str = aes_gcm::decrypt_str(wrapping_key, sealed)?;
    let bytes = hex::decode(&hex_str).map_err(|_| AppError::Encryption)?;
    if bytes.len() != 32 { return Err(AppError::Encryption); }
    let mut out = [0u8; 32];
    out.copy_from_slice(&bytes);
    Ok(out)
}

#[tauri::command]
pub async fn is_first_run(state: State<'_, Arc<AppState>>) -> Result<bool> {
    Ok(queries::get_config_value(&state.db, "argon2_salt").await.is_none())
}

#[tauri::command]
pub async fn is_locked(state: State<'_, Arc<AppState>>) -> Result<bool> {
    Ok(state.is_locked().await)
}

#[tauri::command]
pub async fn setup_master_password(
    password: String,
    state: State<'_, Arc<AppState>>,
) -> Result<String> {
    if password.len() < 12 {
        return Err(AppError::InvalidInput("Password must be at least 12 characters".into()));
    }
    if queries::get_config_value(&state.db, "argon2_salt").await.is_some() {
        return Err(AppError::InvalidInput("Already initialized".into()));
    }

    
    let salt = kdf::generate_salt();
    let dek = kdf::derive_key(&password, &salt)?;
    let verify_blob = aes_gcm::create_verify_blob(&dek)?;

    
    let recovery_code = random::generate_recovery_code();
    let normalized = random::normalize_recovery_code(&recovery_code);
    let recovery_salt = kdf::generate_salt();
    let recovery_key = kdf::derive_key(&normalized, &recovery_salt)?;

    
    let recovery_dek_enc = seal_dek(&recovery_key, &dek)?;

    queries::set_config_value(&state.db, "argon2_salt", &salt).await?;
    queries::set_config_value(&state.db, "verify_blob", &verify_blob).await?;
    queries::set_config_value(&state.db, "recovery_salt", &recovery_salt).await?;
    queries::set_config_value(&state.db, "recovery_dek_enc", &recovery_dek_enc).await?;

    *state.dek.write().await = Some(zeroize::Zeroizing::new(dek));
    state.touch().await;

    Ok(recovery_code)
}

#[tauri::command]
pub async fn unlock(password: String, state: State<'_, Arc<AppState>>) -> Result<()> {
    let salt = queries::get_config_value(&state.db, "argon2_salt").await.ok_or(AppError::FirstRun)?;
    let verify_blob = queries::get_config_value(&state.db, "verify_blob").await.ok_or(AppError::FirstRun)?;
    let dek = kdf::derive_key(&password, &salt)?;
    if !aes_gcm::verify_key(&dek, &verify_blob) {
        return Err(AppError::InvalidPassword);
    }
    *state.dek.write().await = Some(zeroize::Zeroizing::new(dek));
    state.touch().await;
    Ok(())
}

#[tauri::command]
pub async fn lock(state: State<'_, Arc<AppState>>) -> Result<()> {
    state.lock().await;
    Ok(())
}

#[tauri::command]
pub async fn reset_password_with_recovery(
    code: String,
    new_password: String,
    state: State<'_, Arc<AppState>>,
) -> Result<()> {
    if new_password.len() < 12 {
        return Err(AppError::InvalidInput("New password must be at least 12 characters".into()));
    }

    let normalized = random::normalize_recovery_code(&code);
    if normalized.len() < 16 {
        return Err(AppError::InvalidInput("Recovery code is too short".into()));
    }

    
    let recovery_salt = queries::get_config_value(&state.db, "recovery_salt")
        .await
        .ok_or_else(|| AppError::InvalidInput("No recovery code registered for this vault".into()))?;
    let recovery_dek_enc = queries::get_config_value(&state.db, "recovery_dek_enc")
        .await
        .ok_or_else(|| AppError::InvalidInput("No recovery data found".into()))?;

    let recovery_key = kdf::derive_key(&normalized, &recovery_salt)?;

    
    let old_dek = unseal_dek(&recovery_key, &recovery_dek_enc)
        .map_err(|_| AppError::InvalidPassword)?;

    
    let verify_blob = queries::get_config_value(&state.db, "verify_blob").await.ok_or(AppError::FirstRun)?;
    if !aes_gcm::verify_key(&old_dek, &verify_blob) {
        return Err(AppError::InvalidPassword);
    }

    
    use sqlx::Row;
    let all_vars: Vec<(String, String)> = sqlx::query("SELECT id, value_enc FROM variables")
        .fetch_all(&state.db).await?
        .into_iter().map(|r: sqlx::sqlite::SqliteRow| (r.get("id"), r.get("value_enc"))).collect();
    let history: Vec<(i64, String)> = sqlx::query("SELECT id, value_enc FROM variable_history")
        .fetch_all(&state.db).await?
        .into_iter().map(|r: sqlx::sqlite::SqliteRow| (r.get("id"), r.get("value_enc"))).collect();

    let new_salt = kdf::generate_salt();
    let new_dek = kdf::derive_key(&new_password, &new_salt)?;
    let new_verify_blob = aes_gcm::create_verify_blob(&new_dek)?;

    let mut tx = state.db.begin().await?;
    for (id, enc) in all_vars {
        let plain = aes_gcm::decrypt_str(&old_dek, &enc)?;
        let new_enc = aes_gcm::encrypt_str(&new_dek, &plain)?;
        sqlx::query("UPDATE variables SET value_enc=? WHERE id=?")
            .bind(&new_enc).bind(&id).execute(&mut *tx).await?;
    }
    for (id, enc) in history {
        let plain = aes_gcm::decrypt_str(&old_dek, &enc)?;
        let new_enc = aes_gcm::encrypt_str(&new_dek, &plain)?;
        sqlx::query("UPDATE variable_history SET value_enc=? WHERE id=?")
            .bind(&new_enc).bind(id).execute(&mut *tx).await?;
    }
    tx.commit().await?;

    
    let new_recovery_dek_enc = seal_dek(&recovery_key, &new_dek)?;

    queries::set_config_value(&state.db, "argon2_salt", &new_salt).await?;
    queries::set_config_value(&state.db, "verify_blob", &new_verify_blob).await?;
    queries::set_config_value(&state.db, "recovery_dek_enc", &new_recovery_dek_enc).await?;
    

    *state.dek.write().await = Some(zeroize::Zeroizing::new(new_dek));
    state.touch().await;

    Ok(())
}

#[tauri::command]
pub async fn wipe_vault(state: State<'_, Arc<AppState>>) -> Result<()> {
    sqlx::query("DELETE FROM variable_history").execute(&state.db).await?;
    sqlx::query("DELETE FROM variables").execute(&state.db).await?;
    sqlx::query("DELETE FROM tiers").execute(&state.db).await?;
    sqlx::query("DELETE FROM projects").execute(&state.db).await?;
    sqlx::query("DELETE FROM audit_log").execute(&state.db).await?;
    sqlx::query("DELETE FROM app_config").execute(&state.db).await?;
    *state.dek.write().await = None;
    Ok(())
}

#[tauri::command]
pub async fn change_master_password(
    old_password: String,
    new_password: String,
    state: State<'_, Arc<AppState>>,
) -> Result<()> {
    if new_password.len() < 12 {
        return Err(AppError::InvalidInput("Password must be at least 12 characters".into()));
    }

    let salt = queries::get_config_value(&state.db, "argon2_salt").await.ok_or(AppError::FirstRun)?;
    let verify_blob = queries::get_config_value(&state.db, "verify_blob").await.ok_or(AppError::FirstRun)?;
    let old_dek = kdf::derive_key(&old_password, &salt)?;
    if !aes_gcm::verify_key(&old_dek, &verify_blob) {
        return Err(AppError::InvalidPassword);
    }

    use sqlx::Row;
    let all_vars: Vec<(String, String)> = sqlx::query("SELECT id, value_enc FROM variables")
        .fetch_all(&state.db).await?
        .into_iter().map(|r: sqlx::sqlite::SqliteRow| (r.get("id"), r.get("value_enc"))).collect();
    let history: Vec<(i64, String)> = sqlx::query("SELECT id, value_enc FROM variable_history")
        .fetch_all(&state.db).await?
        .into_iter().map(|r: sqlx::sqlite::SqliteRow| (r.get("id"), r.get("value_enc"))).collect();

    let new_salt = kdf::generate_salt();
    let new_dek = kdf::derive_key(&new_password, &new_salt)?;
    let new_blob = aes_gcm::create_verify_blob(&new_dek)?;

    let mut tx = state.db.begin().await?;
    for (id, enc) in all_vars {
        let plain = aes_gcm::decrypt_str(&old_dek, &enc)?;
        let new_enc = aes_gcm::encrypt_str(&new_dek, &plain)?;
        sqlx::query("UPDATE variables SET value_enc=? WHERE id=?")
            .bind(&new_enc).bind(&id).execute(&mut *tx).await?;
    }
    for (id, enc) in history {
        let plain = aes_gcm::decrypt_str(&old_dek, &enc)?;
        let new_enc = aes_gcm::encrypt_str(&new_dek, &plain)?;
        sqlx::query("UPDATE variable_history SET value_enc=? WHERE id=?")
            .bind(&new_enc).bind(id).execute(&mut *tx).await?;
    }
    tx.commit().await?;

    
    if let (Some(recovery_salt), Some(recovery_dek_enc_old)) = (
        queries::get_config_value(&state.db, "recovery_salt").await,
        queries::get_config_value(&state.db, "recovery_dek_enc").await,
    ) {
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        let _ = (recovery_salt, recovery_dek_enc_old); 
        queries::set_config_value(&state.db, "recovery_dek_enc", "").await?;
        
    }

    queries::set_config_value(&state.db, "argon2_salt", &new_salt).await?;
    queries::set_config_value(&state.db, "verify_blob", &new_blob).await?;

    *state.dek.write().await = Some(zeroize::Zeroizing::new(new_dek));
    state.touch().await;

    Ok(())
}

#[tauri::command]
pub async fn regenerate_recovery_code(state: State<'_, Arc<AppState>>) -> Result<String> {
    if state.is_locked().await { return Err(AppError::Locked); }
    state.touch().await;

    let dek = state.get_dek_bytes().await.ok_or(AppError::Locked)?;
    let recovery_code = random::generate_recovery_code();
    let normalized = random::normalize_recovery_code(&recovery_code);
    let recovery_salt = kdf::generate_salt();
    let recovery_key = kdf::derive_key(&normalized, &recovery_salt)?;
    let recovery_dek_enc = seal_dek(&recovery_key, &dek)?;

    queries::set_config_value(&state.db, "recovery_salt", &recovery_salt).await?;
    queries::set_config_value(&state.db, "recovery_dek_enc", &recovery_dek_enc).await?;

    Ok(recovery_code)
}
