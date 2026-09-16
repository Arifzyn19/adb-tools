# ADB Manager

Premium Windows Android ADB Management & Debugging Suite — a modern device management,
debugging, inspection, and development utility. Local-first, multi-device capable,
no cloud account, no telemetry.

## Architecture

```
Windows PC
 └── ADB Manager
      ├── React UI (Vite + TypeScript + Tailwind + Zustand)
      │     └── HashRouter pages, Tauri IPC via @tauri-apps/api
      └── Rust backend (Tauri 2)
            └── AdbClient → adb.exe (argv-based, never via cmd.exe)
```

- **Frontend** (`src/`): Vite SPA with `HashRouter` (required — Tauri serves static
  files, so no server-side routing), Zustand stores, TanStack Table/Virtual,
  Lucide icons. No direct ADB access from React — everything goes through Tauri IPC.
- **Backend** (`src-tauri/`): `AdbClient` (discovery, version, command execution
  with timeout, streaming), pure parsers (`parsers.rs`, fully unit-tested),
  Tauri commands (`commands.rs`), app state + mock data (`state.rs`).
- **Events**: `device-connected`, `device-disconnected`, `logcat-batch`,
  `crash-detected`, `transfer-progress`, `operation-*`.

## Requirements

- Windows 10/11, WebView2 (bundled by Tauri installer)
- Node.js 20+, Rust stable (1.77+)
- Android Platform Tools (`adb.exe`) — **not bundled**; bring your own (see ADB Setup)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev          # browser preview (calls fail without Tauri runtime — use the desktop app)
npm run tauri dev    # full desktop dev (needs @tauri-apps/cli + Rust)
```

All data is real — there is no mock mode. The app requires `adb.exe` and a
connected device; without them pages show setup/error states, never fake data.

## ADB Setup

1. Install [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools)
   and note the path to `adb.exe`.
2. Open ADB Manager → **Settings → ADB** → **Detect / Test**, or paste the path manually.
3. Enable **USB debugging** on the device (Developer options) and accept the RSA prompt.
4. Common locations auto-detected: `PATH`, `%APPDATA%/../Local/Android/Sdk/platform-tools`,
   `C:\Android\platform-tools`.

## Wireless ADB

- **Pairing code**: Devices → Connect Device → Wireless tab. Enter IP + pairing port +
  pairing code from *Wireless debugging → Pair device with pairing code*.
  Note: the **pairing port and connection port are different**.
- **QR code**: Connect Device → QR tab. The laptop displays a QR code —
  on the phone open *Wireless debugging → Pair device with QR code* and scan it
  with the phone's camera. The app then discovers the phone via
  `adb mdns services`, pairs, and auto-connects
  (phone and laptop must share the same Wi-Fi; nothing is uploaded).
- **Manual**: Manual tab → IP + ADB port (usually 5555) → Connect.
- **QR pairing**: scan the QR from Wireless debugging with the in-app scanner.
  Camera frames are processed locally, never uploaded.

## Building

```bash
npm run build        # tsc + vite → dist/
cargo check          # from src-tauri (or workspace root with manifest path)
cargo test
npm run tauri build  # Windows .msi / NSIS installer (run on Windows)
```

## Testing

- Rust: `cargo test` — device/package/process/battery/memory/storage/logcat/crash/pairing parsers.
- Frontend: `npm run typecheck` (`tsc --noEmit`).

## Packaging

`npm run tauri build` on Windows produces MSI + NSIS installers (see
`src-tauri/tauri.conf.json`). Icons live in `src-tauri/icons/`
(regenerate from `icon.png` with `npm run tauri icon` if you replace it).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ADB not found` | Settings → ADB → Detect; verify `adb.exe` path |
| `unauthorized` | Accept the RSA fingerprint prompt on the device |
| `offline` | Replug / `adb reconnect`, restart ADB |
| Install fails: signatures | Uninstall existing app first (signature conflict) |
| Install fails: storage | Free space on device |
| Logcat empty | Press Start; ensure exactly one device selected (`adb -s SERIAL`) |
| Multi-device wrong target | Every command is scoped with `-s SERIAL`; reselect device in header |

## Privacy

Local-first. APKs, screenshots, recordings, Logcat, and device info never leave
your machine. No telemetry. Destructive actions (uninstall, clear data, reboot…)
require confirmation.
