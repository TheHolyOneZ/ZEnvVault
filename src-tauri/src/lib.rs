mod auto_lock;
mod commands;
mod crypto;
mod db;
mod env_parser;
mod error;
mod state;

use std::sync::Arc;
use tauri::Manager;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::str::FromStr;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            tauri::async_runtime::block_on(async move {

                let data_dir = app_handle.path().app_data_dir()
                    .expect("failed to get app data dir");
                std::fs::create_dir_all(&data_dir).expect("failed to create data dir");
                let db_path = data_dir.join("zvault.db");


                let opts = SqliteConnectOptions::from_str(&format!("sqlite://{}?mode=rwc", db_path.display()))
                    .expect("bad db url")
                    .foreign_keys(true)
                    .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

                let pool = SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect_with(opts)
                    .await
                    .expect("failed to connect to db");


                db::migrations::run(&pool).await.expect("migration failed");

                let app_state = Arc::new(state::AppState::new(pool));
                app_handle.manage(app_state.clone());


                auto_lock::start_auto_lock_task(app_handle.clone());
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![

            commands::auth::is_first_run,
            commands::auth::is_locked,
            commands::auth::setup_master_password,
            commands::auth::unlock,
            commands::auth::lock,
            commands::auth::change_master_password,
            commands::auth::reset_password_with_recovery,
            commands::auth::wipe_vault,
            commands::auth::regenerate_recovery_code,

            commands::projects::list_projects,
            commands::projects::create_project,
            commands::projects::update_project,
            commands::projects::delete_project,
            commands::projects::reorder_projects,

            commands::tiers::list_tiers,
            commands::tiers::create_tier,
            commands::tiers::rename_tier,
            commands::tiers::delete_tier,
            commands::tiers::clone_tier,
            commands::tiers::get_tier_diff,
            commands::tiers::link_tier_file,
            commands::tiers::unlink_tier_file,
            commands::tiers::sync_tier_to_file,

            commands::variables::list_variables,
            commands::variables::reveal_variable,
            commands::variables::reveal_all_variables,
            commands::variables::create_variable,
            commands::variables::update_variable,
            commands::variables::delete_variable,
            commands::variables::reorder_variables,
            commands::variables::get_variable_history,
            commands::variables::reveal_history_value,
            commands::variables::check_auto_secret,
            commands::variables::generate_random_value,

            commands::clipboard::copy_variable_value,
            commands::clipboard::clear_clipboard,

            commands::import_export::preview_import,
            commands::import_export::import_env_file,
            commands::import_export::export_env_file,

            commands::search::search_variables,

            commands::config::get_config,
            commands::config::update_config,
            commands::config::get_audit_log,
            commands::config::get_db_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
