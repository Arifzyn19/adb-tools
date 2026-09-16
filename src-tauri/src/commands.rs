//! All Tauri IPC commands. React must never spawn adb.exe directly.

use crate::adb_client::{discover_adb, AdbClient};
use crate::adb_types::*;
use crate::state::AppState;
use anyhow::Result;
use std::path::PathBuf;
use tauri::State;

async fn client_or_err(state: &State<'_, AppState>) -> Result<AdbClient, String> {
    let guard = state.adb_path.lock().await;
    match guard.clone() {
        Some(p) => Ok(AdbClient::new(p)),
        None => Err("ADB executable not configured. Set it in Settings.".to_string()),
    }
}

#[tauri::command]
pub async fn adb_status(state: State<'_, AppState>) -> Result<AdbStatus, String> {
    let guard = state.adb_path.lock().await;
    match guard.clone() {
        Some(p) => {
            let c = AdbClient::new(p.clone());
            match c.version().await {
                Ok(v) => Ok(AdbStatus { ready: true, version: Some(v), path: Some(p.to_string_lossy().to_string()) }),
                Err(_) => Ok(AdbStatus { ready: false, version: None, path: Some(p.to_string_lossy().to_string()) }),
            }
        }
        None => Ok(AdbStatus { ready: false, version: None, path: None }),
    }
}

#[tauri::command]
pub async fn adb_detect(state: State<'_, AppState>) -> Result<AdbStatus, String> {
    let found = discover_adb(None);
    {
        let mut guard = state.adb_path.lock().await;
        *guard = found.clone();
    }
    adb_status(state).await
}

#[tauri::command]
pub async fn adb_set_path(path: String, state: State<'_, AppState>) -> Result<AdbStatus, String> {
    if path.is_empty() || path.len() > 1024 {
        return Err("Invalid path".into());
    }
    let pb = PathBuf::from(&path);
    {
        let mut guard = state.adb_path.lock().await;
        *guard = Some(pb);
    }
    adb_status(state).await
}

#[tauri::command]
pub async fn adb_test(state: State<'_, AppState>) -> Result<String, String> {
    let c = client_or_err(&state).await?;
    c.version().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_devices(state: State<'_, AppState>) -> Result<Vec<DeviceInfo>, String> {
    let c = client_or_err(&state).await?;
    let mut devices = c.devices().await.map_err(|e| e.to_string())?;
    for d in devices.iter_mut() {
        let _ = c.enrich_device(d).await;
    }
    Ok(devices)
}

#[tauri::command]
pub async fn device_details(serial: String, state: State<'_, AppState>) -> Result<DeviceInfo, String> {
    let c = client_or_err(&state).await?;
    let devices = c.devices().await.map_err(|e| e.to_string())?;
    let mut found = devices.into_iter().find(|d| d.serial == serial).ok_or_else(|| "device not found".to_string())?;
    c.enrich_device(&mut found).await.map_err(|e| e.to_string())?;
    Ok(found)
}

#[tauri::command]
pub async fn pair_device(host: String, port: u16, code: String, state: State<'_, AppState>) -> Result<String, String> {
    let c = client_or_err(&state).await?;
    c.pair(&host, port, &code).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pair_qr_start(state: State<'_, AppState>) -> Result<QrPayload, String> {
    let c = client_or_err(&state).await?;
    // Make sure the adb server (and its mDNS backend) is up before we
    // show a QR the phone is supposed to trigger discovery against.
    c.mdns_services().await.map_err(|e| format!("adb mDNS check failed: {e}"))?;
    let (service, code) = random_qr_secret();
    let payload = crate::parsers::qr_payload(&service, &code);
    *state.qr_pending.lock().await = Some(crate::state::QrPending { service: service.clone(), code: code.clone() });
    Ok(QrPayload { payload, service, code })
}

#[tauri::command]
pub async fn pair_qr_poll(state: State<'_, AppState>) -> Result<QrPollResult, String> {
    let c = client_or_err(&state).await?;
    let pending = state.qr_pending.lock().await.clone();
    let Some(p) = pending else {
        return Err("No QR pairing session. Start again.".to_string());
    };
    let services = c.mdns_services().await.map_err(|e| e.to_string())?;
    let found = services.pairing.iter().find(|(name, _, _)| name == &p.service);
    let Some((_, ip, port)) = found else {
        return Ok(QrPollResult { paired: false, connected: false, message: "Waiting for the phone to scan…".to_string() });
    };
    let ip = ip.clone();
    let port = *port;
    let pair_out = c.pair(&ip, port, &p.code).await.map_err(|e| e.to_string())?;
    // Pairing port != connection port: connect via the connect service.
    let services = c.mdns_services().await.map_err(|e| e.to_string())?;
    let mut notes = vec![pair_out.trim().to_string()];
    let mut connected = false;
    for (_, cip, cport) in &services.connect {
        match c.connect(cip, *cport).await {
            Ok(msg) => {
                notes.push(msg.trim().to_string());
                connected = true;
                break;
            }
            Err(e) => notes.push(format!("connect {cip}:{cport} failed: {e}")),
        }
    }
    if !connected {
        notes.push("Paired but not connected yet — adb usually auto-connects in a few seconds, or connect manually.".to_string());
    }
    *state.qr_pending.lock().await = None;
    Ok(QrPollResult { paired: true, connected, message: notes.join("\n") })
}

#[tauri::command]
pub async fn pair_qr_cancel(state: State<'_, AppState>) -> Result<(), String> {
    *state.qr_pending.lock().await = None;
    Ok(())
}

/// Random `studio-<10>` service name + 10-digit pairing secret (QR pairing
/// uses a 10-digit secret; manual pairing uses 6).
fn random_qr_secret() -> (String, String) {
    let hex = uuid::Uuid::new_v4().simple().to_string();
    let service = format!("studio-{}", &hex[..10]);
    let bytes = uuid::Uuid::new_v4().into_bytes();
    let mut code = String::with_capacity(10);
    for b in bytes {
        code.push((b'0' + (b % 10)) as char);
        if code.len() == 10 {
            break;
        }
    }
    (service, code)
}

#[derive(serde::Serialize)]
pub struct QrPayload {
    pub payload: String,
    pub service: String,
    pub code: String,
}

#[derive(serde::Serialize)]
pub struct QrPollResult {
    pub paired: bool,
    pub connected: bool,
    pub message: String,
}

#[tauri::command]
pub async fn connect_device(host: String, port: u16, state: State<'_, AppState>) -> Result<String, String> {
    let c = client_or_err(&state).await?;
    c.connect(&host, port).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disconnect_device(serial: String, state: State<'_, AppState>) -> Result<String, String> {
    let c = client_or_err(&state).await?;
    c.disconnect(&serial).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_apps(serial: String, state: State<'_, AppState>) -> Result<Vec<AppInfo>, String> {
    let c = client_or_err(&state).await?;
    let pkgs = c.list_packages(&serial).await.map_err(|e| e.to_string())?;
    // Enrich versions concurrently (bounded) — sequential dumpsys for
    // hundreds of packages would take a minute or more.
    let sem = std::sync::Arc::new(tokio::sync::Semaphore::new(8));
    let mut handles = Vec::new();
    for pkg in pkgs.into_iter().take(400) {
        let cc = c.clone();
        let ss = serial.clone();
        let permit = sem.clone();
        handles.push(tokio::spawn(async move {
            let _guard = permit.acquire_owned().await.map_err(|e| e.to_string())?;
            let (version, version_code) = cc.package_version(&ss, &pkg).await;
            Ok::<AppInfo, String>(AppInfo {
                name: pretty_name(&pkg),
                package: pkg.clone(),
                version,
                version_code,
                uid: None,
                install_type: if pkg.starts_with("com.android.") || pkg.starts_with("android") { "system".into() } else { "user".into() },
                running: false,
                system: pkg.starts_with("com.android."),
            })
        }));
    }
    let mut out = Vec::new();
    for h in handles {
        match h.await {
            Ok(Ok(app)) => out.push(app),
            Ok(Err(e)) => return Err(e),
            Err(e) => return Err(e.to_string()),
        }
    }
    out.sort_by(|a, b| a.package.cmp(&b.package));
    Ok(out)
}

fn pretty_name(pkg: &str) -> String {
    pkg.rsplit('.').next().unwrap_or(pkg).to_string()
}

#[tauri::command]
pub async fn app_action(serial: String, package: String, action: String, state: State<'_, AppState>) -> Result<String, String> {
    let c = client_or_err(&state).await?;
    match action.as_str() {
        "launch" => c.launch(&serial, &package).await.map_err(|e| e.to_string()),
        "force-stop" => c.force_stop(&serial, &package).await.map(|_| "Force stopped".into()).map_err(|e| e.to_string()),
        "clear-data" => c.clear_data(&serial, &package).await.map_err(|e| e.to_string()),
        "uninstall" => c.uninstall(&serial, &package).await.map_err(|e| e.to_string()),
        _ => Err("unknown action".into()),
    }
}

#[tauri::command]
pub async fn list_processes(serial: String, state: State<'_, AppState>) -> Result<Vec<ProcessInfo>, String> {
    let c = client_or_err(&state).await?;
    c.list_processes(&serial).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kill_process(serial: String, pid: u32, package: Option<String>, state: State<'_, AppState>) -> Result<String, String> {
    let c = client_or_err(&state).await?;
    if let Some(pkg) = package {
        if !pkg.is_empty() {
            return c.force_stop(&serial, &pkg).await.map(|_| "Force stopped".into()).map_err(|e| e.to_string());
        }
    }
    c.shell(&serial, &["kill", "-9", &pid.to_string()], 10).await.map(|r| r.stdout).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn shell_exec(serial: String, line: String, state: State<'_, AppState>) -> Result<ExecOut, String> {
    let c = client_or_err(&state).await?;
    c.shell_exec(&serial, &line).await.map(|r| ExecOut { stdout: r.stdout, stderr: r.stderr, code: r.code }).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct ExecOut {
    pub stdout: String,
    pub stderr: String,
    pub code: Option<i32>,
}

#[tauri::command]
pub async fn logcat_dump(serial: String, tail: u32, state: State<'_, AppState>) -> Result<Vec<LogEntry>, String> {
    let c = client_or_err(&state).await?;
    c.logcat_dump(&serial, tail).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn logcat_clear(serial: String, state: State<'_, AppState>) -> Result<String, String> {
    let c = client_or_err(&state).await?;
    c.clear_logcat(&serial).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn battery_info(serial: String, state: State<'_, AppState>) -> Result<BatteryInfo, String> {
    let c = client_or_err(&state).await?;
    c.battery(&serial).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn memory_info(serial: String, state: State<'_, AppState>) -> Result<MemoryInfo, String> {
    let c = client_or_err(&state).await?;
    c.meminfo(&serial).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn storage_info(serial: String, path: String, state: State<'_, AppState>) -> Result<StorageInfo, String> {
    let c = client_or_err(&state).await?;
    let p = if path.is_empty() { "/data" } else { &path };
    c.storage(&serial, p).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_files(serial: String, path: String, state: State<'_, AppState>) -> Result<Vec<FileEntry>, String> {
    let c = client_or_err(&state).await?;
    let p = if path.is_empty() { "/storage/emulated/0" } else { &path };
    c.list_files(&serial, p).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn screenshot(serial: String, state: State<'_, AppState>) -> Result<String, String> {
    // Returns base64 PNG.
    let c = client_or_err(&state).await?;
    let bytes = c.screenshot_raw(&serial).await.map_err(|e| e.to_string())?;
    Ok(base64_encode(&bytes))
}

fn base64_encode(bytes: &[u8]) -> String {
    const ALPH: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len() * 4 / 3 + 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(ALPH[((n >> 18) & 63) as usize] as char);
        out.push(ALPH[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 { ALPH[((n >> 6) & 63) as usize] as char } else { '=' });
        out.push(if chunk.len() > 2 { ALPH[(n & 63) as usize] as char } else { '=' });
    }
    out
}

#[tauri::command]
pub async fn reboot_device(serial: String, mode: String, state: State<'_, AppState>) -> Result<String, String> {
    let c = client_or_err(&state).await?;
    c.reboot(&serial, &mode).await.map(|_| "Reboot command sent".into()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn install_apk(serial: String, path: String, reinstall: bool, state: State<'_, AppState>) -> Result<String, String> {
    let c = client_or_err(&state).await?;
    c.install(&serial, &PathBuf::from(path), reinstall).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn inspect_apk(path: String) -> Result<ApkMeta, String> {
    let pb = PathBuf::from(&path);
    let data = std::fs::read(&pb).map_err(|e| e.to_string())?;
    let size = data.len() as u64;
    // Lightweight: scan zip entries for names + ABI folders.
    // Full binary AndroidManifest parsing requires aapt2 — reported honestly.
    let reader = std::io::Cursor::new(data);
    let mut zip = zip::ZipArchive::new(reader).map_err(|e| e.to_string())?;
    let mut names: Vec<String> = Vec::new();
    for i in 0..zip.len() {
        if let Ok(f) = zip.by_index(i) {
            names.push(f.name().to_string());
        }
    }
    Ok(ApkMeta {
        file_name: pb.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default(),
        size_bytes: size,
        package: None,
        version: None,
        version_code: None,
        min_sdk: None,
        target_sdk: None,
        abis: detect_abis(&names),
        permissions: Vec::new(),
        activities: Vec::new(),
        services: Vec::new(),
        receivers: Vec::new(),
        providers: Vec::new(),
    })
}

fn detect_abis(names: &[String]) -> Vec<String> {
    let mut abis = Vec::new();
    for abi in ["arm64-v8a", "armeabi-v7a", "x86_64", "x86"] {
        if names.iter().any(|n| n.contains(abi)) {
            abis.push(abi.to_string());
        }
    }
    abis
}

#[tauri::command]
pub async fn saved_devices_load(_state: State<'_, AppState>) -> Result<Vec<SavedDevice>, String> {
    let path = crate::adb_client::config_dir().join("devices.json");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn saved_devices_save(devices: Vec<SavedDevice>) -> Result<(), String> {
    let dir = crate::adb_client::config_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let data = serde_json::to_string_pretty(&devices).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("devices.json"), data).map_err(|e| e.to_string())
}
