//! All Tauri IPC commands. React must never spawn adb.exe directly.

use crate::adb_client::{discover_adb, AdbClient};
use crate::adb_types::*;
use crate::state::{mock_apps, mock_devices, mock_processes, AppState};
use anyhow::Result;
use std::path::PathBuf;
use tauri::State;

async fn client_or_err(state: &State<'_, AppState>) -> Result<AdbClient, String> {
    if AppState::mock_mode() {
        return Err("MOCK_MODE".to_string());
    }
    let guard = state.adb_path.lock().await;
    match guard.clone() {
        Some(p) => Ok(AdbClient::new(p)),
        None => Err("ADB executable not configured. Set it in Settings.".to_string()),
    }
}

#[tauri::command]
pub async fn adb_status(state: State<'_, AppState>) -> Result<AdbStatus, String> {
    if AppState::mock_mode() {
        return Ok(AdbStatus { ready: true, version: Some("1.0.41 (mock)".into()), path: Some("mock/adb".into()), mock: true });
    }
    let guard = state.adb_path.lock().await;
    match guard.clone() {
        Some(p) => {
            let c = AdbClient::new(p.clone());
            match c.version().await {
                Ok(v) => Ok(AdbStatus { ready: true, version: Some(v), path: Some(p.to_string_lossy().to_string()), mock: false }),
                Err(_) => Ok(AdbStatus { ready: false, version: None, path: Some(p.to_string_lossy().to_string()), mock: false }),
            }
        }
        None => Ok(AdbStatus { ready: false, version: None, path: None, mock: false }),
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
    let c = client_or_err(&state).await.map_err(|e| if e == "MOCK_MODE" { "mock-ok".to_string() } else { e })?;
    c.version().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_devices(state: State<'_, AppState>) -> Result<Vec<DeviceInfo>, String> {
    if AppState::mock_mode() {
        return Ok(mock_devices());
    }
    let c = client_or_err(&state).await?;
    let mut devices = c.devices().await.map_err(|e| e.to_string())?;
    for d in devices.iter_mut() {
        let _ = c.enrich_device(d).await;
    }
    Ok(devices)
}

#[tauri::command]
pub async fn device_details(serial: String, state: State<'_, AppState>) -> Result<DeviceInfo, String> {
    if AppState::mock_mode() {
        return mock_devices().into_iter().find(|d| d.serial == serial).ok_or_else(|| "device not found".to_string());
    }
    let c = client_or_err(&state).await?;
    let mut devices = c.devices().await.map_err(|e| e.to_string())?;
    let mut found = devices.into_iter().find(|d| d.serial == serial).ok_or_else(|| "device not found".to_string())?;
    c.enrich_device(&mut found).await.map_err(|e| e.to_string())?;
    Ok(found)
}

#[tauri::command]
pub async fn pair_device(host: String, port: u16, code: String, state: State<'_, AppState>) -> Result<String, String> {
    if AppState::mock_mode() {
        return Ok(format!("Successfully paired to {host}:{port} (mock)"));
    }
    let c = client_or_err(&state).await?;
    c.pair(&host, port, &code).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn connect_device(host: String, port: u16, state: State<'_, AppState>) -> Result<String, String> {
    if AppState::mock_mode() {
        return Ok(format!("already connected to {host}:{port} (mock)"));
    }
    let c = client_or_err(&state).await?;
    c.connect(&host, port).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disconnect_device(serial: String, state: State<'_, AppState>) -> Result<String, String> {
    if AppState::mock_mode() {
        return Ok("disconnected (mock)".to_string());
    }
    let c = client_or_err(&state).await?;
    c.disconnect(&serial).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_apps(serial: String, state: State<'_, AppState>) -> Result<Vec<AppInfo>, String> {
    if AppState::mock_mode() {
        return Ok(mock_apps());
    }
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
    if AppState::mock_mode() {
        return Ok(format!("{action} ok (mock)"));
    }
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
    if AppState::mock_mode() {
        return Ok(mock_processes());
    }
    let c = client_or_err(&state).await?;
    c.list_processes(&serial).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kill_process(serial: String, pid: u32, package: Option<String>, state: State<'_, AppState>) -> Result<String, String> {
    if AppState::mock_mode() {
        return Ok("killed (mock)".into());
    }
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
    if AppState::mock_mode() {
        return Ok(ExecOut { stdout: format!("mock output for: {line}\n"), stderr: String::new(), code: Some(0) });
    }
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
pub async fn battery_info(serial: String, state: State<'_, AppState>) -> Result<BatteryInfo, String> {
    if AppState::mock_mode() {
        return Ok(BatteryInfo { pct: Some(78), charging: Some(true), health: Some("Good".into()), temperature_c: Some(31.0), voltage_mv: Some(4100), technology: Some("Li-ion".into()) });
    }
    let c = client_or_err(&state).await?;
    c.battery(&serial).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn memory_info(serial: String, state: State<'_, AppState>) -> Result<MemoryInfo, String> {
    if AppState::mock_mode() {
        return Ok(MemoryInfo { total_kb: Some(11560104), avail_kb: Some(7654321) });
    }
    let c = client_or_err(&state).await?;
    c.meminfo(&serial).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn storage_info(serial: String, path: String, state: State<'_, AppState>) -> Result<StorageInfo, String> {
    if AppState::mock_mode() {
        return Ok(StorageInfo { total_kb: Some(118000000), used_kb: Some(84000000), avail_kb: Some(34000000), path });
    }
    let c = client_or_err(&state).await?;
    let p = if path.is_empty() { "/data" } else { &path };
    c.storage(&serial, p).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_files(serial: String, path: String, state: State<'_, AppState>) -> Result<Vec<FileEntry>, String> {
    if AppState::mock_mode() {
        return Ok(vec![
            FileEntry { name: "DCIM".into(), path: format!("{path}/DCIM"), is_dir: true, size: 0, modified: Some("2024-05-01 10:00".into()) },
            FileEntry { name: "photo.jpg".into(), path: format!("{path}/photo.jpg"), is_dir: false, size: 2411723, modified: Some("2024-05-02 12:30".into()) },
        ]);
    }
    let c = client_or_err(&state).await?;
    let p = if path.is_empty() { "/storage/emulated/0" } else { &path };
    c.list_files(&serial, p).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn screenshot(serial: String, state: State<'_, AppState>) -> Result<String, String> {
    // Returns base64 PNG.
    if AppState::mock_mode() {
        return Ok(String::new());
    }
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
    if AppState::mock_mode() {
        return Ok("rebooting (mock)".into());
    }
    let c = client_or_err(&state).await?;
    c.reboot(&serial, &mode).await.map(|_| "Reboot command sent".into()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn install_apk(serial: String, path: String, reinstall: bool, state: State<'_, AppState>) -> Result<String, String> {
    if AppState::mock_mode() {
        return Ok("Success (mock)".into());
    }
    let c = client_or_err(&state).await?;
    c.install(&serial, &PathBuf::from(path), reinstall).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn inspect_apk(path: String) -> Result<ApkMeta, String> {
    let pb = PathBuf::from(&path);
    let data = std::fs::read(&pb).map_err(|e| e.to_string())?;
    let size = data.len() as u64;
    // Lightweight: parse AndroidManifest.xml binary? Full AAPT not available.
    // We scan zip entries for names + manifest text fallback.
    let reader = std::io::Cursor::new(data);
    let mut zip = zip::ZipArchive::new(reader).map_err(|e| e.to_string())?;
    let mut names: Vec<String> = Vec::new();
    for i in 0..zip.len() {
        if let Ok(f) = zip.by_index(i) {
            names.push(f.name().to_string());
        }
    }
    let _has_manifest = names.iter().any(|n| n == "AndroidManifest.xml");
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
    let _ = names.len();
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
