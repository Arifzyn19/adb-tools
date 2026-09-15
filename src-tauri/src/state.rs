//! App state + mock data for UI development (ADB_MANAGER_MOCK=1).

use crate::adb_types::*;
use std::path::PathBuf;
use tokio::sync::Mutex;
use tokio::sync::broadcast;

pub struct AppState {
    pub adb_path: Mutex<Option<PathBuf>>,
    pub settings_path: PathBuf,
    pub log_tx: broadcast::Sender<LogEntry>,
}

impl AppState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel::<LogEntry>(2048);
        let dir = crate::adb_client::config_dir();
        let _ = std::fs::create_dir_all(&dir);
        Self { adb_path: Mutex::new(crate::adb_client::discover_adb(None)), settings_path: dir.join("config.json"), log_tx: tx }
    }

    pub fn mock_mode() -> bool {
        crate::adb_client::AdbClient::mock_mode()
    }
}

pub fn mock_devices() -> Vec<DeviceInfo> {
    vec![
        DeviceInfo {
            serial: "192.168.1.10:37747".into(),
            state: DeviceState::Connected,
            transport: Transport::Wireless,
            manufacturer: Some("vivo".into()),
            model: Some("vivo X100".into()),
            device: Some("V2308".into()),
            product: Some("V2308".into()),
            android_version: Some("16".into()),
            sdk: Some("36".into()),
            abi: Some("arm64-v8a".into()),
            build_id: Some("UP1A.231 enhanced".into()),
            fingerprint: Some("vivo/V2308/V2308:16/UP1A:user/release-keys".into()),
            battery_pct: Some(78),
            screen: Some("Physical size: 1260x2800".into()),
            density: Some("Physical density: 480".into()),
        },
        DeviceInfo {
            serial: "emulator-5554".into(),
            state: DeviceState::Connected,
            transport: Transport::Emulator,
            manufacturer: Some("Google".into()),
            model: Some("Pixel 9".into()),
            device: Some("panther".into()),
            product: Some("sdk_gphone64".into()),
            android_version: Some("15".into()),
            sdk: Some("35".into()),
            abi: Some("x86_64".into()),
            build_id: Some("AP3A.241005".into()),
            fingerprint: Some("google/sdk_gphone64:15/AP3A:userdebug/test-keys".into()),
            battery_pct: Some(100),
            screen: Some("Physical size: 1080x2400".into()),
            density: Some("Physical density: 420".into()),
        },
        DeviceInfo {
            serial: "XYZOFFLINE1".into(),
            state: DeviceState::Unauthorized,
            transport: Transport::Usb,
            manufacturer: None,
            model: Some("SM-A546B".into()),
            device: None,
            product: None,
            android_version: None,
            sdk: None,
            abi: None,
            build_id: None,
            fingerprint: None,
            battery_pct: None,
            screen: None,
            density: None,
        },
    ]
}

pub fn mock_apps() -> Vec<AppInfo> {
    vec![
        AppInfo { name: "TikTok".into(), package: "com.ss.android.ugc.trill".into(), version: Some("40.2.4".into()), version_code: Some("400204".into()), uid: Some("10231".into()), install_type: "user".into(), running: true, system: false },
        AppInfo { name: "Chrome".into(), package: "com.android.chrome".into(), version: Some("140.0.7339".into()), version_code: Some("7339000".into()), uid: Some("10061".into()), install_type: "user".into(), running: false, system: false },
        AppInfo { name: "Settings".into(), package: "com.android.settings".into(), version: Some("16".into()), version_code: Some("36".into()), uid: Some("1000".into()), install_type: "system".into(), running: false, system: true },
        AppInfo { name: "Example App".into(), package: "com.example.app".into(), version: Some("2.4.1".into()), version_code: Some("241".into()), uid: Some("10312".into()), install_type: "user".into(), running: true, system: false },
        AppInfo { name: "System UI".into(), package: "com.android.systemui".into(), version: Some("16".into()), version_code: Some("36".into()), uid: Some("1001".into()), install_type: "system".into(), running: true, system: true },
    ]
}

pub fn mock_processes() -> Vec<ProcessInfo> {
    vec![
        ProcessInfo { pid: 1234, name: "com.example.app".into(), package: Some("com.example.app".into()), cpu_pct: 12.4, mem_kb: 184320, state: "R".into(), user: "u0_a312".into() },
        ProcessInfo { pid: 567, name: "surfaceflinger".into(), package: None, cpu_pct: 3.1, mem_kb: 96256, state: "S".into(), user: "system".into() },
        ProcessInfo { pid: 890, name: "com.ss.android.ugc.trill".into(), package: Some("com.ss.android.ugc.trill".into()), cpu_pct: 8.9, mem_kb: 402112, state: "R".into(), user: "u0_a231".into() },
        ProcessInfo { pid: 42, name: "zygote64".into(), package: None, cpu_pct: 0.2, mem_kb: 45056, state: "S".into(), user: "root".into() },
    ]
}
