//! ADB Manager shared types.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DeviceState {
    Connected,
    Unauthorized,
    Offline,
    Disconnected,
    Connecting,
    Pairing,
    Error,
}

impl DeviceState {
    pub fn from_adb_token(token: &str) -> Self {
        match token {
            "device" => Self::Connected,
            "unauthorized" => Self::Unauthorized,
            "offline" => Self::Offline,
            "connecting" => Self::Connecting,
            _ => Self::Error,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Transport {
    Usb,
    Wireless,
    Emulator,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub serial: String,
    pub state: DeviceState,
    pub transport: Transport,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub device: Option<String>,
    pub product: Option<String>,
    pub android_version: Option<String>,
    pub sdk: Option<String>,
    pub abi: Option<String>,
    pub build_id: Option<String>,
    pub fingerprint: Option<String>,
    pub battery_pct: Option<u8>,
    pub screen: Option<String>,
    pub density: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdbStatus {
    pub ready: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub mock: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub package: String,
    pub version: Option<String>,
    pub version_code: Option<String>,
    pub uid: Option<String>,
    pub install_type: String,
    pub running: bool,
    pub system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub package: Option<String>,
    pub cpu_pct: f32,
    pub mem_kb: u64,
    pub state: String,
    pub user: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum LogLevel {
    V,
    D,
    I,
    W,
    E,
    F,
}

impl LogLevel {
    pub fn from_char(c: char) -> Option<Self> {
        match c {
            'V' => Some(Self::V),
            'D' => Some(Self::D),
            'I' => Some(Self::I),
            'W' => Some(Self::W),
            'E' => Some(Self::E),
            'F' => Some(Self::F),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: LogLevel,
    pub tag: String,
    pub pid: Option<u32>,
    pub message: String,
    pub package_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrashInfo {
    pub id: String,
    pub package: String,
    pub exception: String,
    pub thread: String,
    pub timestamp: String,
    pub location: Option<String>,
    pub stacktrace: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryInfo {
    pub pct: Option<u8>,
    pub charging: Option<bool>,
    pub health: Option<String>,
    pub temperature_c: Option<f32>,
    pub voltage_mv: Option<u32>,
    pub technology: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    pub total_kb: Option<u64>,
    pub avail_kb: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageInfo {
    pub total_kb: Option<u64>,
    pub used_kb: Option<u64>,
    pub avail_kb: Option<u64>,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedDevice {
    pub serial: String,
    pub nickname: String,
    pub transport: Transport,
    pub last_ip: Option<String>,
    pub last_port: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApkMeta {
    pub file_name: String,
    pub size_bytes: u64,
    pub package: Option<String>,
    pub version: Option<String>,
    pub version_code: Option<String>,
    pub min_sdk: Option<String>,
    pub target_sdk: Option<String>,
    pub abis: Vec<String>,
    pub permissions: Vec<String>,
    pub activities: Vec<String>,
    pub services: Vec<String>,
    pub receivers: Vec<String>,
    pub providers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationProgress {
    pub op_id: String,
    pub file_name: String,
    pub transferred: u64,
    pub total: u64,
}
