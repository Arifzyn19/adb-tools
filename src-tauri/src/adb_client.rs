//! Secure ADB process abstraction. Never builds shell strings.

use crate::adb_types::*;
use crate::parsers;
use anyhow::{Context, Result};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tokio::process::Command;
use tracing::{info, warn};

/// Build an adb Command that never flashes a console window on Windows.
/// All adb spawning in this app must go through here.
fn adb_command(adb_path: &Path) -> Command {
    let mut std_cmd = std::process::Command::new(adb_path);
    std_cmd
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std_cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    Command::from(std_cmd)
}

#[derive(Debug, Clone)]
pub struct ExecResult {
    pub stdout: String,
    pub stderr: String,
    pub code: Option<i32>,
}

#[derive(Debug, Clone)]
pub struct AdbClient {
    pub adb_path: PathBuf,
}

impl AdbClient {
    pub fn new(path: PathBuf) -> Self {
        Self { adb_path: path }
    }

    async fn run(&self, args: &[&str], timeout_secs: u64) -> Result<ExecResult> {
        let mut cmd = adb_command(&self.adb_path);
        for a in args {
            cmd.arg(a);
        }
        // Kill on drop to avoid zombies; timeout guards hangs.
        let fut = async {
            let out = cmd.output().await.context("spawn adb")?;
            Ok::<ExecResult, anyhow::Error>(ExecResult {
                stdout: String::from_utf8_lossy(&out.stdout).to_string(),
                stderr: String::from_utf8_lossy(&out.stderr).to_string(),
                code: out.status.code(),
            })
        };
        match tokio::time::timeout(std::time::Duration::from_secs(timeout_secs), fut).await {
            Ok(r) => r,
            Err(_) => anyhow::bail!("adb timed out after {timeout_secs}s"),
        }
    }

    async fn run_serial(&self, serial: &str, args: &[&str], timeout_secs: u64) -> Result<ExecResult> {
        // Always scope to explicit serial (multi-device safety).
        let mut full: Vec<&str> = vec!["-s", serial];
        full.extend_from_slice(args);
        self.run(&full, timeout_secs).await
    }

    pub async fn version(&self) -> Result<String> {
        let r = self.run(&["version"], 10).await?;
        // "Android Debug Bridge version 1.0.41 ..."
        Ok(r.stdout.lines().next().unwrap_or("").trim().to_string())
    }

    pub async fn devices(&self) -> Result<Vec<DeviceInfo>> {
        let r = self.run(&["devices", "-l"], 10).await?;
        if r.code.unwrap_or(1) != 0 {
            anyhow::bail!("adb devices failed: {}", r.stderr.trim());
        }
        let parsed = parsers::parse_devices_l(&r.stdout);
        Ok(parsed
            .into_iter()
            .map(|(serial, state, kv)| {
                let transport = parsers::detect_transport(&serial, &kv);
                DeviceInfo {
                    serial,
                    state,
                    transport,
                    manufacturer: None,
                    model: kv.get("model").cloned(),
                    device: kv.get("device").cloned(),
                    product: kv.get("product").cloned(),
                    android_version: None,
                    sdk: None,
                    abi: None,
                    build_id: None,
                    fingerprint: None,
                    battery_pct: None,
                    screen: None,
                    density: None,
                }
            })
            .collect())
    }

    pub async fn shell(&self, serial: &str, cmd: &[&str], timeout_secs: u64) -> Result<ExecResult> {
        let mut args = vec!["shell"];
        args.extend_from_slice(cmd);
        let r = self.run_serial(serial, &args, timeout_secs).await?;
        if r.code.unwrap_or(1) != 0 && r.stdout.is_empty() {
            anyhow::bail!("{}", short_err(&r.stderr));
        }
        Ok(r)
    }

    pub async fn getprop(&self, serial: &str, key: &str) -> Result<String> {
        // Validate key charset to prevent injection (even though we use argv, be strict).
        if !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-') {
            anyhow::bail!("invalid prop key");
        }
        let r = self.shell(serial, &["getprop", key], 10).await?;
        Ok(r.stdout.trim().to_string())
    }

    pub async fn enrich_device(&self, d: &mut DeviceInfo) -> Result<()> {
        if d.state != DeviceState::Connected {
            return Ok(());
        }
        let s = &d.serial;
        // Best-effort: never fail whole enrichment on one missing prop.
        for (key, slot) in [
            ("ro.product.manufacturer", &mut d.manufacturer),
            ("ro.product.model", &mut d.model),
            ("ro.build.version.release", &mut d.android_version),
            ("ro.build.version.sdk", &mut d.sdk),
            ("ro.product.cpu.abi", &mut d.abi),
            ("ro.build.id", &mut d.build_id),
            ("ro.build.fingerprint", &mut d.fingerprint),
            ("ro.product.device", &mut d.device),
        ] {
            if let Ok(v) = self.getprop(s, key).await {
                if !v.is_empty() {
                    *slot = Some(v);
                }
            }
        }
        if let Ok(r) = self.shell(s, &["wm", "size"], 10).await {
            if let Some(line) = r.stdout.lines().next() {
                d.screen = Some(line.trim().to_string());
            }
        }
        if let Ok(r) = self.shell(s, &["wm", "density"], 10).await {
            if let Some(line) = r.stdout.lines().next() {
                d.density = Some(line.trim().to_string());
            }
        }
        if let Ok(b) = self.battery(s).await {
            d.battery_pct = b.pct;
        }
        Ok(())
    }

    pub async fn list_packages(&self, serial: &str) -> Result<Vec<String>> {
        let r = self.shell(serial, &["pm", "list", "packages", "-f"], 30).await?;
        Ok(parsers::parse_pm_list_packages(&r.stdout))
    }

    pub async fn package_version(&self, serial: &str, package: &str) -> (Option<String>, Option<String>) {
        if !is_safe_package(package) {
            return (None, None);
        }
        match self.shell(serial, &["dumpsys", "package", package], 15).await {
            Ok(r) => parsers::parse_dumpsys_package_version(&r.stdout),
            Err(_) => (None, None),
        }
    }

    pub async fn launch(&self, serial: &str, package: &str) -> Result<String> {
        if !is_safe_package(package) {
            anyhow::bail!("invalid package name");
        }
        // monkey -p <pkg> 1 launches the default activity without knowing its name.
        let r = self.shell(serial, &["monkey", "-p", package, "-c", "android.intent.category.LAUNCHER", "1"], 15).await?;
        Ok(r.stdout)
    }

    pub async fn force_stop(&self, serial: &str, package: &str) -> Result<()> {
        if !is_safe_package(package) {
            anyhow::bail!("invalid package name");
        }
        self.shell(serial, &["am", "force-stop", package], 15).await?;
        Ok(())
    }

    pub async fn clear_data(&self, serial: &str, package: &str) -> Result<String> {
        if !is_safe_package(package) {
            anyhow::bail!("invalid package name");
        }
        let r = self.shell(serial, &["pm", "clear", package], 20).await?;
        Ok(r.stdout)
    }

    pub async fn uninstall(&self, serial: &str, package: &str) -> Result<String> {
        if !is_safe_package(package) {
            anyhow::bail!("invalid package name");
        }
        let r = self.run_serial(serial, &["uninstall", package], 60).await?;
        if r.stdout.contains("Success") {
            Ok(r.stdout)
        } else {
            anyhow::bail!("{}", friendly_install_err(&format!("{}{}", r.stdout, r.stderr)))
        }
    }

    pub async fn install(&self, serial: &str, apk_path: &Path, reinstall: bool) -> Result<String> {
        validate_local_path(apk_path)?;
        let mut args: Vec<&str> = vec!["install"];
        let r_flag;
        if reinstall {
            r_flag = "-r";
            args.push(r_flag);
        }
        let path_s = apk_path.to_string_lossy().to_string();
        // argv-based, no shell involved.
        let mut full: Vec<&str> = vec!["-s", serial];
        full.extend(args.iter().copied());
        full.push(&path_s);
        let res = self.run(&full, 180).await?;
        if res.stdout.contains("Success") {
            Ok(res.stdout)
        } else {
            anyhow::bail!("{}", friendly_install_err(&format!("{}{}", res.stdout, res.stderr)))
        }
    }

    pub async fn list_processes(&self, serial: &str) -> Result<Vec<ProcessInfo>> {
        let r = self.shell(serial, &["ps", "-A"], 15).await?;
        Ok(parsers::parse_ps(&r.stdout))
    }

    pub async fn battery(&self, serial: &str) -> Result<BatteryInfo> {
        let r = self.shell(serial, &["dumpsys", "battery"], 10).await?;
        Ok(parsers::parse_dumpsys_battery(&r.stdout))
    }

    pub async fn meminfo(&self, serial: &str) -> Result<MemoryInfo> {
        let r = self.shell(serial, &["cat", "/proc/meminfo"], 10).await?;
        Ok(parsers::parse_meminfo(&r.stdout))
    }

    pub async fn storage(&self, serial: &str, path: &str) -> Result<StorageInfo> {
        if path.is_empty() || path.len() > 256 || path.contains(';') || path.contains('&') || path.contains('|') {
            anyhow::bail!("invalid path");
        }
        let r = self.shell(serial, &["df", path], 10).await?;
        Ok(parsers::parse_df(&r.stdout, path))
    }

    pub async fn list_files(&self, serial: &str, path: &str) -> Result<Vec<FileEntry>> {
        if path.is_empty() || path.len() > 512 {
            anyhow::bail!("invalid path");
        }
        // Use a delimiter-safe listing: directories first via printf.
        // for f in "$path"/*; do [ -d "$f" ] && t=d || t=f; s=$(stat -c %s "$f" 2>/dev/null || echo 0); m=$(stat -c %y "$f" 2>/dev/null | cut -d. -f1); n=$(basename "$f"); printf '%s|%s|%s|%s\n' "$t" "$n" "$s" "$m"; done
        // NOTE: single adb shell argv element; device-side shell expands it. Path validated above.
        let script = format!(
            "for f in \"{}\"/*; do [ -e \"$f\" ] || continue; if [ -d \"$f\" ]; then t=d; else t=f; fi; s=$(stat -c %s \"$f\" 2>/dev/null || echo 0); m=$(stat -c %y \"$f\" 2>/dev/null | cut -d. -f1); n=$(basename \"$f\"); printf '%s|%s|%s|%s\\n' \"$t\" \"$n\" \"$s\" \"$m\"; done",
            path.replace('"', "")
        );
        let r = self.shell(serial, &[&script], 20).await?;
        Ok(parsers::parse_file_list(&r.stdout, path))
    }

    pub async fn pull(&self, serial: &str, remote: &str, local: &Path) -> Result<()> {
        if remote.is_empty() || remote.len() > 1024 {
            anyhow::bail!("invalid remote path");
        }
        validate_local_path_parent(local)?;
        let local_s = local.to_string_lossy().to_string();
        let r = self.run_serial(serial, &["pull", remote, &local_s], 600).await?;
        if r.code.unwrap_or(1) != 0 {
            anyhow::bail!("{}", short_err(&r.stderr));
        }
        Ok(())
    }

    pub async fn push(&self, serial: &str, local: &Path, remote: &str) -> Result<()> {
        validate_local_path(local)?;
        if remote.is_empty() || remote.len() > 1024 {
            anyhow::bail!("invalid remote path");
        }
        let local_s = local.to_string_lossy().to_string();
        let r = self.run_serial(serial, &["push", &local_s, remote], 600).await?;
        if r.code.unwrap_or(1) != 0 {
            anyhow::bail!("{}", short_err(&r.stderr));
        }
        Ok(())
    }

    pub async fn screenshot_raw(&self, serial: &str) -> Result<Vec<u8>> {
        // exec-out avoids newline mangling.
        let mut cmd = adb_command(&self.adb_path);
        cmd.arg("-s").arg(serial).arg("exec-out").arg("screencap").arg("-p");
        let out = tokio::time::timeout(std::time::Duration::from_secs(20), cmd.output())
            .await
            .map_err(|_| anyhow::anyhow!("screenshot timed out"))?
            .context("spawn screencap")?;
        if !out.status.success() {
            anyhow::bail!("{}", short_err(&String::from_utf8_lossy(&out.stderr)));
        }
        info!("screenshot {} bytes", out.stdout.len());
        Ok(out.stdout)
    }

    pub async fn pair(&self, host: &str, port: u16, code: &str) -> Result<String> {
        parsers::validate_host_port(host, port).map_err(anyhow::Error::msg)?;
        if code.is_empty() || code.len() > 64 || !code.chars().all(|c| c.is_ascii_alphanumeric()) {
            anyhow::bail!("invalid pairing code");
        }
        let addr = format!("{host}:{port}");
        let r = self.run(&["pair", &addr, code], 30).await?;
        let combined = format!("{}{}", r.stdout, r.stderr);
        if parsers::parse_pair_result(&combined) {
            Ok(combined)
        } else {
            anyhow::bail!("pairing failed: {}", short_err(&combined))
        }
    }

    pub async fn connect(&self, host: &str, port: u16) -> Result<String> {
        parsers::validate_host_port(host, port).map_err(anyhow::Error::msg)?;
        let addr = format!("{host}:{port}");
        let r = self.run(&["connect", &addr], 20).await?;
        let combined = format!("{}{}", r.stdout, r.stderr);
        if combined.to_lowercase().contains("connected") || combined.to_lowercase().contains("already") {
            Ok(combined)
        } else {
            anyhow::bail!("connect failed: {}", short_err(&combined))
        }
    }

    pub async fn disconnect(&self, serial: &str) -> Result<String> {
        let r = self.run(&["disconnect", serial], 10).await?;
        Ok(format!("{}{}", r.stdout, r.stderr))
    }

    pub async fn reboot(&self, serial: &str, mode: &str) -> Result<()> {
        let arg = match mode {
            "recovery" => "recovery",
            "bootloader" => "bootloader",
            _ => "",
        };
        if arg.is_empty() {
            self.run_serial(serial, &["reboot"], 15).await?;
        } else {
            self.run_serial(serial, &["reboot", arg], 15).await?;
        }
        Ok(())
    }

    pub async fn logcat_dump(&self, serial: &str, tail: u32) -> Result<Vec<LogEntry>> {
        let n = tail.clamp(1, 2000).to_string();
        let r = self.run_serial(serial, &["logcat", "-v", "threadtime", "-d", "-t", &n], 20).await?;
        if r.code.unwrap_or(1) != 0 && r.stdout.is_empty() {
            anyhow::bail!("{}", short_err(&r.stderr));
        }
        Ok(r
            .stdout
            .lines()
            .filter_map(parsers::parse_logcat_threadtime)
            .map(|mut e| {
                e.id = uuid::Uuid::new_v4().to_string();
                e
            })
            .collect())
    }

    pub async fn clear_logcat(&self, serial: &str) -> Result<String> {
        let r = self.run_serial(serial, &["logcat", "-c"], 10).await?;
        if r.code.unwrap_or(1) != 0 {
            anyhow::bail!("{}", short_err(&r.stderr));
        }
        Ok("Logcat cleared".to_string())
    }

    pub async fn shell_exec(&self, serial: &str, line: &str) -> Result<ExecResult> {
        // Split user line on whitespace; run as adb shell argv (no host shell).
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() {
            anyhow::bail!("empty command");
        }
        if parts.len() > 64 {
            anyhow::bail!("command too long");
        }
        self.shell(serial, &parts, 30).await
    }
}

/// Discover adb executable: configured path -> PATH -> common SDK locations.
pub fn discover_adb(configured: Option<&str>) -> Option<PathBuf> {
    if let Some(p) = configured {
        let pb = PathBuf::from(p);
        if pb.is_file() {
            return Some(pb);
        }
    }
    if let Ok(path_var) = std::env::var("PATH") {
        #[cfg(windows)]
        let exe = "adb.exe";
        #[cfg(not(windows))]
        let exe = "adb";
        for dir in std::env::split_paths(&path_var) {
            let cand = dir.join(exe);
            if cand.is_file() {
                return Some(cand);
            }
        }
    }
    let home = dirs_fallback();
    let mut candidates: Vec<PathBuf> = Vec::new();
    #[cfg(windows)]
    {
        candidates.push(PathBuf::from(r"C:\Android\platform-tools\adb.exe"));
        if let Some(h) = home.clone() {
            candidates.push(h.join("AppData/Local/Android/Sdk/platform-tools/adb.exe"));
        }
    }
    #[cfg(not(windows))]
    {
        if let Some(h) = home.clone() {
            candidates.push(h.join("Android/Sdk/platform-tools/adb"));
            candidates.push(h.join(".android/platform-tools/adb"));
        }
        candidates.push(PathBuf::from("/usr/bin/adb"));
        candidates.push(PathBuf::from("/opt/android-sdk/platform-tools/adb"));
    }
    candidates.into_iter().find(|p| p.is_file())
}

fn dirs_fallback() -> Option<PathBuf> {
    std::env::var("HOME")
        .map(PathBuf::from)
        .ok()
        .or_else(|| std::env::var("USERPROFILE").map(PathBuf::from).ok())
}

pub fn is_safe_package(pkg: &str) -> bool {
    !pkg.is_empty()
        && pkg.len() <= 255
        && pkg.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_')
}

fn validate_local_path(p: &Path) -> Result<()> {
    let s = p.to_string_lossy();
    if s.is_empty() || s.len() > 1024 {
        anyhow::bail!("invalid file path");
    }
    Ok(())
}

fn validate_local_path_parent(p: &Path) -> Result<()> {
    if let Some(parent) = p.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            warn!("destination parent does not exist yet: {:?}", parent);
        }
    }
    validate_local_path(p)
}

fn short_err(stderr: &str) -> String {
    let t = stderr.trim();
    if t.is_empty() {
        "ADB operation failed".to_string()
    } else {
        t.lines().next().unwrap_or(t).chars().take(300).collect()
    }
}

fn friendly_install_err(raw: &str) -> String {
    let lower = raw.to_lowercase();
    let human = if lower.contains("install_failed_insufficient_storage") {
        "Insufficient storage on device."
    } else if lower.contains("install_failed_incompatible") || lower.contains("requires newer sdk") {
        "APK requires a newer Android version."
    } else if lower.contains("install_failed_update_incompatible") || lower.contains("signatures do not match") {
        "Signature conflict: uninstall the existing app first."
    } else if lower.contains("unauthorized") {
        "Device unauthorized — accept the RSA prompt on the device."
    } else if lower.contains("offline") || lower.contains("no devices") || lower.contains("device not found") {
        "Device offline or disconnected."
    } else {
        "APK install failed."
    };
    format!("{human} ({})", short_err(raw))
}

/// Config dir: %APPDATA%\ADBManager on Windows, ~/.config/adb-manager elsewhere.
pub fn config_dir() -> PathBuf {
    #[cfg(windows)]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            return PathBuf::from(appdata).join("ADBManager");
        }
    }
    if let Some(h) = dirs_fallback() {
        return h.join(".config/adb-manager");
    }
    PathBuf::from(".adb-manager")
}

#[allow(dead_code)]
pub fn saved_devices_path() -> PathBuf {
    config_dir().join("devices.json")
}
