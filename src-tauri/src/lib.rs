//! ADB Manager — Tauri 2 library entry.

mod adb_client;
mod adb_types;
mod commands;
mod parsers;
mod state;

use state::AppState;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "adb_manager_lib=info".into()))
        .with(tracing_subscriber::fmt::layer())
        .try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::adb_status,
            commands::adb_detect,
            commands::adb_set_path,
            commands::adb_test,
            commands::list_devices,
            commands::device_details,
            commands::pair_device,
            commands::qr_pair_start,
            commands::qr_pair_poll,
            commands::qr_pair_cancel,
            commands::connect_device,
            commands::disconnect_device,
            commands::list_apps,
            commands::app_action,
            commands::list_processes,
            commands::kill_process,
            commands::shell_exec,
            commands::logcat_dump,
            commands::logcat_clear,
            commands::battery_info,
            commands::memory_info,
            commands::storage_info,
            commands::list_files,
            commands::screenshot,
            commands::reboot_device,
            commands::install_apk,
            commands::inspect_apk,
            commands::saved_devices_load,
            commands::saved_devices_save,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
