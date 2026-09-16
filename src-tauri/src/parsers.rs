//! Pure parsing helpers — heavily unit tested.
//! All functions are deterministic and side-effect free.

use crate::adb_types::*;
use regex::Regex;
use std::collections::HashMap;

/// Parse `adb devices -l` output.
pub fn parse_devices_l(output: &str) -> Vec<(String, DeviceState, HashMap<String, String>)> {
    let mut out = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("List of devices") || line.starts_with('*') {
            continue;
        }
        let mut parts = line.split_whitespace();
        let Some(serial) = parts.next() else { continue };
        let Some(state_tok) = parts.next() else { continue };
        let state = DeviceState::from_adb_token(state_tok);
        let mut kv = HashMap::new();
        for tok in parts {
            if let Some((k, v)) = tok.split_once(':') {
                kv.insert(k.to_string(), v.to_string());
            }
        }
        out.push((serial.to_string(), state, kv));
    }
    out
}

pub fn detect_transport(serial: &str, kv: &HashMap<String, String>) -> Transport {
    if serial.starts_with("emulator-") {
        return Transport::Emulator;
    }
    // Wireless serials look like 192.168.x.x:port or adb-xxx / IPv6 with port.
    if serial.contains(':') && serial.parse::<std::net::SocketAddr>().is_ok() {
        return Transport::Wireless;
    }
    if serial.contains('.') && serial.contains(':') {
        return Transport::Wireless;
    }
    if let Some(t) = kv.get("transport_id") {
        let _ = t;
    }
    Transport::Usb
}

/// Parse `cmd package list packages -f`-ish or `pm list packages -f` lines:
/// `package:/data/app/xxx/base.apk=com.example.app`
pub fn parse_pm_list_packages(output: &str) -> Vec<String> {
    output
        .lines()
        .filter_map(|l| {
            let l = l.trim();
            let rest = l.strip_prefix("package:")?;
            rest.rsplit('=').next().map(|s| s.trim().to_string())
        })
        .filter(|s| !s.is_empty())
        .collect()
}

/// Parse `dumpsys package <pkg>` excerpt for version info.
pub fn parse_dumpsys_package_version(output: &str) -> (Option<String>, Option<String>) {
    let mut version: Option<String> = None;
    let mut code: Option<String> = None;
    for line in output.lines() {
        let t = line.trim();
        if let Some(v) = t.strip_prefix("versionName=") {
            version = Some(v.trim().to_string());
        } else if let Some(v) = t.strip_prefix("versionCode=") {
            code = Some(v.split_whitespace().next().unwrap_or("").to_string());
        }
    }
    (version, code)
}

/// Parse `ps -A -o PID,NAME,USER...` simplified or `ps` output.
/// Expected columns include PID and NAME at minimum.
pub fn parse_ps(output: &str) -> Vec<ProcessInfo> {
    let mut procs = Vec::new();
    let mut lines = output.lines();
    let Some(header) = lines.next() else { return procs };
    let h = header.to_uppercase();
    let pid_idx = h.find("PID");
    let name_idx = h.find("NAME").or_else(|| h.find("CMD")).or_else(|| h.find("COMMAND"));
    if pid_idx.is_none() || name_idx.is_none() {
        return procs;
    }
    for line in lines {
        let line = line.trim_end();
        if line.trim().is_empty() {
            continue;
        }
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() < 2 {
            continue;
        }
        // Heuristic: first numeric col is USER offset; find PID as first u32-looking token.
        let mut pid: Option<u32> = None;
        for c in &cols {
            if let Ok(p) = c.parse::<u32>() {
                if *c != cols[cols.len() - 1] || cols.len() <= 3 {
                    pid = Some(p);
                    break;
                }
            }
        }
        let Some(pid) = pid else { continue };
        let name = cols.last().unwrap_or(&"").to_string();
        // package guess: name containing a dot and lowercase start
        let package = if name.contains('.') { Some(name.clone()) } else { None };
        procs.push(ProcessInfo {
            pid,
            name: name.clone(),
            package,
            cpu_pct: 0.0,
            mem_kb: 0,
            state: "R".to_string(),
            user: cols.first().unwrap_or(&"").to_string(),
        });
    }
    procs
}

/// Parse `dumpsys battery` output.
pub fn parse_dumpsys_battery(output: &str) -> BatteryInfo {
    let mut level: Option<u8> = None;
    let mut charging: Option<bool> = None;
    let mut health: Option<String> = None;
    let mut temp: Option<f32> = None;
    let mut voltage: Option<u32> = None;
    let mut tech: Option<String> = None;
    for line in output.lines() {
        let t = line.trim();
        if let Some(v) = t.strip_prefix("level:") {
            level = v.trim().parse().ok();
        } else if let Some(v) = t.strip_prefix("status:") {
            // 2 = charging, 5 = full
            let n: i32 = v.trim().parse().unwrap_or(1);
            charging = Some(n == 2 || n == 5);
        } else if let Some(v) = t.strip_prefix("health:") {
            health = Some(match v.trim() {
                "2" => "Good".to_string(),
                "3" => "Overheat".to_string(),
                "4" => "Dead".to_string(),
                "5" => "Over voltage".to_string(),
                "6" => "Unspecified failure".to_string(),
                "7" => "Cold".to_string(),
                other => other.to_string(),
            });
        } else if let Some(v) = t.strip_prefix("temperature:") {
            if let Ok(raw) = v.trim().parse::<f32>() {
                temp = Some(raw / 10.0);
            }
        } else if let Some(v) = t.strip_prefix("voltage:") {
            voltage = v.trim().parse().ok();
        } else if let Some(v) = t.strip_prefix("technology:") {
            tech = Some(v.trim().to_string());
        }
    }
    BatteryInfo { pct: level, charging, health, temperature_c: temp, voltage_mv: voltage, technology: tech }
}

/// Parse /proc/meminfo excerpt.
pub fn parse_meminfo(output: &str) -> MemoryInfo {
    let mut total = None;
    let mut avail = None;
    for line in output.lines() {
        let t = line.trim();
        if let Some(v) = t.strip_prefix("MemTotal:") {
            total = v.split_whitespace().next().and_then(|n| n.parse().ok());
        } else if let Some(v) = t.strip_prefix("MemAvailable:") {
            avail = v.split_whitespace().next().and_then(|n| n.parse().ok());
        }
    }
    MemoryInfo { total_kb: total, avail_kb: avail }
}

/// Parse `df /data` or `df /storage/emulated/0` output; returns first data row.
pub fn parse_df(output: &str, path: &str) -> StorageInfo {
    for line in output.lines().skip(1) {
        let cols: Vec<&str> = line.split_whitespace().collect();
        // Filesystem 1K-blocks Used Available Use% Mounted on
        if cols.len() >= 6 {
            let total = cols[1].parse().ok();
            let used = cols[2].parse().ok();
            let avail = cols[3].parse().ok();
            return StorageInfo { total_kb: total, used_kb: used, avail_kb: avail, path: path.to_string() };
        }
    }
    StorageInfo { total_kb: None, used_kb: None, avail_kb: None, path: path.to_string() }
}

/// Parse one logcat `threadtime` line:
/// `09-15 20:42:31.123  1234  5678 I ActivityManager: Start proc ...`
pub fn parse_logcat_threadtime(line: &str) -> Option<LogEntry> {
    // threadtime fields are separated by variable whitespace, so consume
    // the first 5 tokens (date, time, pid, tid, level) then keep the rest.
    let mut head = line;
    let mut tokens: Vec<&str> = Vec::with_capacity(5);
    for _ in 0..5 {
        head = head.trim_start();
        let end = head.find(char::is_whitespace)?;
        tokens.push(&head[..end]);
        head = &head[end..];
    }
    let (_date, time_full, pid_s, _tid, level_s) =
        (tokens[0], tokens[1], tokens[2], tokens[3], tokens[4]);
    let rest = head.trim_start();
    if time_full.len() < 8 || level_s.len() != 1 {
        return None;
    }
    let level = LogLevel::from_char(level_s.chars().next()?)?;
    let colon = rest.find(':')?;
    let tag = rest[..colon].trim().to_string();
    let message = rest[colon + 1..].trim_start().to_string();
    let pid = pid_s.parse().ok();
    Some(LogEntry {
        id: String::new(),
        timestamp: time_full[..8].to_string(),
        level,
        tag,
        pid,
        message,
        package_hint: None,
    })
}

/// Crash detection: returns (package, exception) if the line strongly indicates a crash.
pub fn detect_crash_line(line: &str) -> Option<(String, String)> {
    if line.contains("FATAL EXCEPTION") {
        // e.g. "E AndroidRuntime: FATAL EXCEPTION: main ... com.example.app ... NullPointerException"
        let pkg = extract_package(line).unwrap_or_else(|| "unknown".to_string());
        let exc = extract_exception(line).unwrap_or_else(|| "RuntimeException".to_string());
        return Some((pkg, exc));
    }
    if line.contains("has died") && line.contains("Process") {
        if let Some(pkg) = extract_package(line) {
            return Some((pkg, "ProcessDied".to_string()));
        }
    }
    None
}

fn extract_package(line: &str) -> Option<String> {
    let re = Regex::new(r"[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+").ok()?;
    // Prefer token containing at least two dots? Just take first plausible.
    for m in re.find_iter(line) {
        let s = m.as_str();
        if s.contains('.') && !s.starts_with("java.") && !s.starts_with("android.") && !s.starts_with("kotlin.") {
            return Some(s.to_string());
        }
    }
    None
}

fn extract_exception(line: &str) -> Option<String> {
    let re = Regex::new(r"[A-Z][A-Za-z0-9]*(Exception|Error|ANR)").ok()?;
    re.find(line).map(|m| m.as_str().to_string())
}

/// Parse `adb pair` success text.
pub fn parse_pair_result(output: &str) -> bool {
    let lower = output.to_lowercase();
    lower.contains("successfully paired") || lower.contains("successfully")
}

/// Split on `delim` unless escaped with a backslash.
fn split_unescaped(s: &str, delim: char) -> Vec<String> {
    let mut parts = Vec::new();
    let mut cur = String::new();
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '\\' {
            if let Some(n) = chars.next() {
                cur.push(n);
            }
        } else if c == delim {
            parts.push(std::mem::take(&mut cur));
        } else {
            cur.push(c);
        }
    }
    parts.push(cur);
    parts
}

/// Parse Android Wireless Debugging QR payload:
/// `WIFI:T:ADB;S:<service>;P:<password>;;`
/// Returns (service_name, password). The IP/port is NOT in the QR —
/// it must be resolved via mDNS (`_adb-tls-pairing._tcp`).
pub fn parse_wifi_qr(payload: &str) -> Result<(String, String), String> {
    let body = payload.trim().strip_prefix("WIFI:").ok_or("Not a Wi-Fi QR code")?.to_string();
    let mut t: Option<String> = None;
    let mut svc: Option<String> = None;
    let mut pass: Option<String> = None;
    for field in split_unescaped(&body, ';') {
        if field.is_empty() {
            continue;
        }
        let Some((k, v)) = field.split_once(':') else { continue };
        match k {
            "T" => t = Some(v.to_string()),
            "S" => svc = Some(v.to_string()),
            "P" => pass = Some(v.to_string()),
            _ => {}
        }
    }
    if t.as_deref() != Some("ADB") {
        return Err("QR is not an ADB pairing code (T must be ADB)".to_string());
    }
    let svc = svc.filter(|v| !v.is_empty()).ok_or("QR is missing the service name (S)".to_string())?;
    let pass = pass.filter(|v| !v.is_empty()).ok_or("QR is missing the pairing password (P)".to_string())?;
    Ok((svc, pass))
}

/// Validate IPv4/host + port user input (no injection: strict charset).
pub fn validate_host_port(host: &str, port: u16) -> Result<(), String> {
    if host.is_empty() || host.len() > 255 {
        return Err("Invalid host".to_string());
    }
    if port == 0 {
        return Err("Invalid port".to_string());
    }
    if !host.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == ':') {
        return Err("Host contains invalid characters".to_string());
    }
    Ok(())
}

/// Parse `ls -la` style or `stat` fallback for file manager (custom `ls` format from client).
/// Expected: `<type>|<name>|<size>|<mtime>` per line where type is d or f.
pub fn parse_file_list(output: &str, base: &str) -> Vec<FileEntry> {
    let mut out = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(4, '|').collect();
        if parts.len() < 3 {
            continue;
        }
        let is_dir = parts[0] == "d";
        let name = parts[1].to_string();
        if name == "." || name == ".." || name.is_empty() {
            continue;
        }
        let size = parts[2].parse().unwrap_or(0);
        let modified = if parts.len() == 4 { Some(parts[3].to_string()) } else { None };
        let path = format!("{}/{}", base.trim_end_matches('/'), name);
        out.push(FileEntry { name, path, is_dir, size, modified });
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn devices_basic() {
        let out = "List of devices attached\nemulator-5554\tdevice product:sdk_gphone model:Pixel transport_id:1\n192.168.1.10:37747\tdevice product:x model:X100 device:vivo transport_id:2\nXYZ123\tunauthorized transport_id:3\n\n";
        let parsed = parse_devices_l(out);
        assert_eq!(parsed.len(), 3);
        assert_eq!(parsed[0].1, DeviceState::Connected);
        assert_eq!(parsed[2].1, DeviceState::Unauthorized);
        assert_eq!(detect_transport(&parsed[0].0, &parsed[0].2), Transport::Emulator);
        assert_eq!(detect_transport(&parsed[1].0, &parsed[1].2), Transport::Wireless);
    }

    #[test]
    fn devices_ignores_noise() {
        let out = "* daemon started *\nList of devices attached\n\n";
        assert!(parse_devices_l(out).is_empty());
    }

    #[test]
    fn pm_list() {
        let out = "package:/data/app/a==/base.apk=com.example.a\npackage:/system/app/b.apk=com.example.b\n";
        let pkgs = parse_pm_list_packages(out);
        assert_eq!(pkgs, vec!["com.example.a", "com.example.b"]);
    }

    #[test]
    fn dumpsys_version() {
        let out = "  versionCode=123 minSdk=29\n  versionName=1.2.3\n";
        let (v, c) = parse_dumpsys_package_version(out);
        assert_eq!(v.as_deref(), Some("1.2.3"));
        assert_eq!(c.as_deref(), Some("123"));
    }

    #[test]
    fn ps_parse() {
        let out = "USER          PID   PPID  NAME\nshell         123   1     com.example.app\nu0_a1         456   2     surfaceflinger\n";
        let procs = parse_ps(out);
        assert_eq!(procs.len(), 2);
        assert_eq!(procs[0].pid, 123);
        assert_eq!(procs[0].package.as_deref(), Some("com.example.app"));
    }

    #[test]
    fn battery_parse() {
        let out = "Current Battery Service state:\n  level: 78\n  status: 2\n  health: 2\n  temperature: 310\n  voltage: 4100\n  technology: Li-ion\n";
        let b = parse_dumpsys_battery(out);
        assert_eq!(b.pct, Some(78));
        assert_eq!(b.charging, Some(true));
        assert_eq!(b.health.as_deref(), Some("Good"));
        assert!((b.temperature_c.unwrap() - 31.0).abs() < 0.01);
    }

    #[test]
    fn meminfo_parse() {
        let out = "MemTotal:        11560104 kB\nMemFree:          123456 kB\nMemAvailable:     7654321 kB\n";
        let m = parse_meminfo(out);
        assert_eq!(m.total_kb, Some(11560104));
        assert_eq!(m.avail_kb, Some(7654321));
    }

    #[test]
    fn df_parse() {
        let out = "Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/block  118000000 84000000 34000000  72% /data\n";
        let s = parse_df(out, "/data");
        assert_eq!(s.total_kb, Some(118000000));
    }

    #[test]
    fn logcat_threadtime() {
        let line = "09-15 20:42:31.123  1234  5678 I ActivityManager: Start proc com.example.app";
        let e = parse_logcat_threadtime(line).unwrap();
        assert_eq!(e.level, LogLevel::I);
        assert_eq!(e.tag, "ActivityManager");
        assert_eq!(e.timestamp, "20:42:31");
    }

    #[test]
    fn crash_detect() {
        let line = "E AndroidRuntime: FATAL EXCEPTION: main Process: com.example.app, PID: 1 java.lang.NullPointerException";
        let (pkg, exc) = detect_crash_line(line).unwrap();
        assert_eq!(pkg, "com.example.app");
        assert!(exc.contains("NullPointerException"));
    }

    #[test]
    fn no_false_crash_on_plain_error() {
        assert!(detect_crash_line("E Foo: some error happened").is_none());
    }

    #[test]
    fn host_port_validation() {
        assert!(validate_host_port("192.168.1.10", 5555).is_ok());
        assert!(validate_host_port("a; rm -rf /", 5555).is_err());
        assert!(validate_host_port("", 5555).is_err());
        assert!(validate_host_port("host", 0).is_err());
    }

    #[test]
    fn file_list_parse() {
        let out = "d|DCIM|0|2024-01-01\nf|a.jpg|1234|2024-01-02\n";
        let files = parse_file_list(out, "/sdcard");
        assert_eq!(files.len(), 2);
        assert!(files[0].is_dir);
        assert_eq!(files[1].size, 1234);
    }

    #[test]
    fn pair_parse() {
        assert!(parse_pair_result("Successfully paired to 192.168.1.1"));
        assert!(!parse_pair_result("Failed to pair"));
    }

    #[test]
    fn wifi_qr_basic() {
        let (svc, pass) = parse_wifi_qr("WIFI:T:ADB;S:adb-54EFAB12;P:482917;;").unwrap();
        assert_eq!(svc, "adb-54EFAB12");
        assert_eq!(pass, "482917");
    }

    #[test]
    fn wifi_qr_escaped() {
        let (svc, pass) = parse_wifi_qr("WIFI:T:ADB;S:adb\\;X;P:12\\:34;;").unwrap();
        assert_eq!(svc, "adb;X");
        assert_eq!(pass, "12:34");
    }

    #[test]
    fn wifi_qr_rejects_non_adb() {
        assert!(parse_wifi_qr("WIFI:T:WPA;S:home;P:secret;;").is_err());
        assert!(parse_wifi_qr("WIFI:T:ADB;S:only-service;;").is_err());
        assert!(parse_wifi_qr("hello world").is_err());
    }

    #[test]
    fn multi_device_states() {
        let out = "List of devices attached\nA\tdevice\nB\toffline\nC\tunauthorized\n";
        let p = parse_devices_l(out);
        assert_eq!(p.len(), 3);
        assert_eq!(p[1].1, DeviceState::Offline);
    }
}
