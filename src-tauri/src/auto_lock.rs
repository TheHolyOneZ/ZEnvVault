use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tokio::time::sleep;

use crate::state::AppState;

pub fn start_auto_lock_task(app: AppHandle) {
    tokio::spawn(async move {
        loop {
            sleep(Duration::from_secs(30)).await;

            let state = app.state::<Arc<AppState>>();

            if state.is_locked().await {
                continue;
            }

            let auto_lock_minutes: i64 = {
                use sqlx::Row;
                let result = sqlx::query("SELECT value FROM app_config WHERE key = 'auto_lock_minutes'")
                    .fetch_optional(&state.db)
                    .await;
                match result {
                    Ok(Some(r)) => r.get::<String,_>("value").parse().unwrap_or(5),
                    _ => 5,
                }
            };

            if auto_lock_minutes <= 0 {
                continue;
            }

            let elapsed = {
                let last = state.last_activity.read().await;
                last.elapsed()
            };

            if elapsed >= Duration::from_secs(auto_lock_minutes as u64 * 60) {
                state.lock().await;
                let _ = app.emit("vault-locked", ());
            }
        }
    });
}
