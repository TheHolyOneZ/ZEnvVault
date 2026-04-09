mod auto_lock;
mod commands;
mod crypto;
mod db;
mod env_parser;
mod error;
mod state;

use std::sync::Arc;
use tauri::{Manager, Emitter};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::WindowEvent;
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

                let backup_handle = app_handle.clone();
                let backup_state = app_state.clone();
                tauri::async_runtime::spawn(async move {
                    loop {
                        tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
                        commands::backup::maybe_auto_backup(&backup_handle, &backup_state).await;
                    }
                });
            });

            let handle = app.handle();

            let show_item  = MenuItem::with_id(handle, "show",  "Show ZVault", true, None::<&str>)?;
            let lock_item  = MenuItem::with_id(handle, "lock",  "Lock Vault",  true, None::<&str>)?;
            let sep        = PredefinedMenuItem::separator(handle)?;
            let quit_item  = MenuItem::with_id(handle, "quit",  "Quit",        true, None::<&str>)?;

            let menu = Menu::with_items(handle, &[&show_item, &lock_item, &sep, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("ZVault")
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "lock" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.emit("vault-locked", ());
                        }
                        let state = app.state::<Arc<state::AppState>>();
                        let state = state.inner().clone();
                        tauri::async_runtime::spawn(async move {
                            state.lock().await;
                        });
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            let main_window = app.get_webview_window("main").expect("no main window");
            let app_handle2 = app.handle().clone();
            main_window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    let app = app_handle2.clone();
                    let state = app.state::<Arc<state::AppState>>();
                    let db = state.db.clone();
                    let api = api.clone();
                    tauri::async_runtime::block_on(async move {
                        let config = db::queries::get_app_config(&db).await;
                        if config.minimize_to_tray {
                            api.prevent_close();
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.hide();
                            }
                        }
                    });
                }
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
            commands::projects::restore_project,
            commands::projects::hard_delete_project,
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
            commands::variables::restore_variable,
            commands::variables::hard_delete_variable,
            commands::variables::pin_variable,
            commands::variables::reveal_sensitive_variable,
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
            commands::import_export::export_as_format,

            commands::search::search_variables,

            commands::config::get_config,
            commands::config::update_config,
            commands::config::get_audit_log,
            commands::config::get_db_path,

            commands::backup::backup_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
