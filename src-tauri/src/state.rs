//! App state: ADB path + log broadcast channel.

use std::path::PathBuf;
use tokio::sync::Mutex;
use tokio::sync::broadcast;

use crate::adb_types::LogEntry;

pub struct AppState {
    pub adb_path: Mutex<Option<PathBuf>>,
    pub settings_path: PathBuf,
    pub log_tx: broadcast::Sender<LogEntry>,
    pub qr_pending: Mutex<Option<QrPending>>,
}

/// In-progress QR pairing session: WE display the QR, the phone scans it.
#[derive(Debug, Clone)]
pub struct QrPending {
    pub service: String,
    pub code: String,
}

impl AppState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel::<LogEntry>(2048);
        let dir = crate::adb_client::config_dir();
        let _ = std::fs::create_dir_all(&dir);
        Self { adb_path: Mutex::new(crate::adb_client::discover_adb(None)), settings_path: dir.join("config.json"), log_tx: tx, qr_pending: Mutex::new(None) }
    }
}
