# ADB MANAGER
## Premium Windows Android ADB Management & Debugging Suite

You are a senior full-stack desktop engineer specializing in:

- Rust
- Tauri 2
- React
- TypeScript
- Windows desktop applications
- Android ADB
- Android debugging
- UI/UX engineering
- performance optimization

Build a production-quality Windows desktop application called:

# ADB Manager

ADB Manager is a modern Android device management, debugging, inspection,
and development utility for Windows.

The application communicates with Android devices through ADB.

The application must feel like a professional developer tool, not a basic
GUI wrapper around adb.exe.

==================================================
1. CORE STACK
==================================================

Desktop runtime:

- Tauri 2

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide React
- Zustand
- TanStack Table
- TanStack Virtual where appropriate

Backend:

- Rust

Android communication:

- Android Platform Tools / adb.exe

Other Rust responsibilities:

- ADB process management
- device discovery
- package management
- process management
- Logcat streaming
- APK operations
- file transfer
- wireless ADB
- QR pairing support
- screenshots
- screen recording
- device information
- system information

Do NOT use Electron.

Do NOT implement ADB communication directly from React.

React must communicate with Rust through Tauri IPC.

==================================================
2. PRODUCT PHILOSOPHY
==================================================

ADB Manager should be:

- fast
- modern
- premium
- developer-focused
- reliable
- local-first
- privacy-friendly
- multi-device capable
- highly responsive

The application should feel like a combination of:

- Android development tooling
- professional system utility
- modern IDE
- device management application

Do NOT copy the exact UI of any existing application.

Use modern developer-tool design principles while maintaining an original
visual identity.

==================================================
3. NO SERVER
==================================================

The application should work locally.

Architecture:

Windows PC
    |
    +-- ADB Manager
    |      |
    |      +-- React UI
    |      |
    |      +-- Tauri
    |      |
    |      +-- Rust backend
    |             |
    |             +-- adb.exe
    |
    +-- Android Device

Do not upload:

- APK files
- videos
- screenshots
- Logcat
- device information
- files

to a remote server.

No cloud account should be required.

No telemetry by default.

==================================================
4. MAIN APPLICATION STRUCTURE
==================================================

Create the following navigation:

OVERVIEW

- Dashboard
- Devices

MANAGEMENT

- Apps
- Processes
- Files

DEBUG

- Logcat
- Crashes
- APK Inspector
- Shell

TOOLS

- Device Tools

SYSTEM

- Settings

Main layout:

----------------------------------------------------
| ADB Manager       Device Selector       Search ⚙ |
----------------------------------------------------
| Sidebar |                                         |
|         |                                         |
|         |             Main Content                |
|         |                                         |
|         |                                         |
----------------------------------------------------
| Connected | Device | Transport | ADB Version     |
----------------------------------------------------

==================================================
5. VISUAL DESIGN
==================================================

Create a premium dark developer-tool interface.

Primary background:

#090B10

Sidebar:

#0C1016

Panel:

#11161E

Elevated panel:

#151B24

Border:

#222A36

Primary text:

#F4F6F8

Secondary text:

#9AA4B2

Muted text:

#687385

Accent:

#6D7CFF

Success:

#35D07F

Warning:

#F5B84B

Error:

#FF5C68

Information:

#5EA2FF

The exact values may be adjusted for visual consistency.

IMPORTANT:

Do not overuse gradients.

Do not use excessive glassmorphism.

Do not make everything a rounded card.

Do not use giant empty spaces.

Do not use huge typography.

Do not use default shadcn styling without customization.

Create a unique design system.

==================================================
6. DESIGN LANGUAGE
==================================================

The UI should communicate:

"Professional Android developer workstation."

Use:

- compact spacing
- clear hierarchy
- subtle borders
- subtle shadows
- precise alignment
- polished hover states
- smooth transitions
- excellent typography
- semantic status colors
- professional icons

Use rounded corners moderately.

Recommended radius:

- small controls: 6px
- panels: 8px
- dialogs: 10-12px

Avoid excessive 20-30px pill-shaped UI.

==================================================
7. TYPOGRAPHY
==================================================

Use a clean modern UI font.

Suggested:

Inter / Geist / system UI equivalent.

Use monospace font for:

- Logcat
- Shell
- stack traces
- technical output
- PIDs
- package names where useful

Create a clear typography hierarchy:

Page title
Page description
Section title
Body
Secondary
Caption

==================================================
8. ICONOGRAPHY
==================================================

Use Lucide icons.

Do not use emojis as the primary UI icon system.

Examples:

Dashboard:
LayoutDashboard

Devices:
Smartphone

Apps:
Package

Processes:
Activity

Files:
Folder

Logcat:
TerminalSquare / ScrollText

APK:
Box / Package

Shell:
Terminal

Tools:
Wrench

Settings:
Settings

Connect:
Cable / Wifi

Use consistent icon size.

==================================================
9. MAIN SIDEBAR
==================================================

Width:

approximately 220-240px.

Structure:

OVERVIEW

Dashboard
Devices

MANAGEMENT

Apps
Processes
Files

DEBUG

Logcat
Crashes
APK Inspector
Shell

TOOLS

Device Tools

SYSTEM

Settings

Each item:

- icon
- label
- hover state
- active state
- keyboard focus state

Active item should have:

- subtle accent background
- accent indicator
- brighter icon
- brighter text

Do not make the active state visually aggressive.

==================================================
10. SIDEBAR DEVICE STATUS
==================================================

At the bottom of the sidebar display the selected device.

Example:

------------------------------------------------
● CONNECTED

vivo X100
Android 16
Wireless ADB
------------------------------------------------

If no device:

------------------------------------------------
○ NO DEVICE

Connect an Android device
------------------------------------------------

Clicking the device area opens the device selector.

==================================================
11. TOP HEADER
==================================================

Header:

Left:

ADB Manager

Center/right:

Current device selector

Example:

[ ● vivo X100 ▾ ]

Right:

[ Search ]
[ Notifications ]
[ Settings ]

The header should remain compact.

==================================================
12. COMMAND PALETTE
==================================================

Implement:

Ctrl + K

Command palette.

Search:

- Dashboard
- Devices
- Apps
- Processes
- Files
- Logcat
- Crashes
- APK Inspector
- Shell
- Screenshot
- Screen Recording
- Connect Device
- Settings

Also support actions:

Connect Device
Refresh Device
Start Logcat
Take Screenshot
Open Shell

==================================================
13. DEVICE MANAGEMENT
==================================================

Support multiple devices.

Never assume only one Android device exists.

Device model should include:

- serial
- state
- transport
- manufacturer
- model
- device
- product
- Android version
- SDK
- ABI
- build ID
- fingerprint
- battery
- memory
- storage
- screen resolution
- density

States:

- Connected
- Unauthorized
- Offline
- Disconnected
- Connecting
- Pairing
- Error

Transport:

- USB
- Wireless

==================================================
14. DEVICE DISCOVERY
==================================================

Use adb devices -l.

Parse:

- device
- unauthorized
- offline
- emulator
- wireless

Detect changes.

Do not aggressively poll.

Use a background Rust worker.

Emit Tauri events:

device-connected
device-disconnected
device-updated
device-state-changed

==================================================
15. ADB ENVIRONMENT
==================================================

Do not assume adb.exe exists in PATH.

Detect adb automatically.

Possible locations may include:

- PATH
- configured path
- common Android SDK locations

Allow:

[ Detect ADB ]
[ Browse ]
[ Test ADB ]

Display:

ADB Status
ADB Version
ADB Path

Example:

ADB Status
● Ready

ADB Version
1.0.41

ADB Path
C:\Android\platform-tools\adb.exe

If ADB is unavailable:

show a helpful setup screen.

==================================================
16. FIRST RUN
==================================================

If adb.exe is not found:

Welcome to ADB Manager

Android Platform Tools were not detected.

[ Browse for adb.exe ]

[ Continue Without Device ]

The app must still launch.

==================================================
17. CONNECT DEVICE
==================================================

Create a premium Connect Device modal.

Tabs:

USB
Wireless
Manual

USB:

Show available ADB devices.

Wireless:

Wireless Debugging

[ Scan QR Code ]

OR

IP Address
[____________]

Pairing Port
[____________]

Pairing Code
[____________]

[ Pair Device ]

Manual:

IP Address
[____________]

ADB Port
[____________]

[ Connect ]

==================================================
18. WIRELESS ADB
==================================================

Support:

- pairing code
- QR pairing
- manual IP connection
- saved wireless devices
- reconnect
- disconnect

Important:

Pairing port and connection port are not necessarily the same.

Do not assume they are identical.

==================================================
19. QR PAIRING
==================================================

Create a QR pairing modal.

UI:

Wireless ADB

Scan QR Code

[ CAMERA PREVIEW ]

Open Wireless Debugging on your Android device
and choose "Pair device with QR code".

[ Use Pairing Code Instead ]

Camera processing must happen locally.

Do not upload frames.

If camera access fails:

show an error and provide manual pairing.

After successful QR decoding:

1. Validate payload
2. Extract pairing information
3. Execute appropriate ADB pairing operation
4. Detect paired device
5. Connect
6. Add device to saved devices
7. Close scanner
8. Show success notification

==================================================
20. SAVED DEVICES
==================================================

Allow devices to be remembered.

Saved device card:

● vivo X100
Android 16
Wireless ADB

[ Connect ]
[ Forget ]

Never store sensitive information unnecessarily.

==================================================
21. DASHBOARD
==================================================

Dashboard title:

Dashboard

Description:

Your Android device at a glance.

Main device card:

vivo X100

● Connected via Wireless ADB

Android 16
API 36
arm64-v8a

System cards:

Battery
Memory
Storage
CPU

Example:

BATTERY
78%
Charging

MEMORY
4.2 / 12 GB
35%

STORAGE
71 / 128 GB
55%

CPU
12%

Quick Actions:

Apps
Logcat
Files
Shell
Screenshot
Device Tools

Also show recent activity.

==================================================
22. APPS PAGE
==================================================

Title:

Applications

Description:

Manage applications installed on the selected Android device.

Statistics:

Total Apps
Running
User Apps
System Apps

Toolbar:

Search applications...

Filters:

All
User
System
Running

Table columns:

Icon
Application
Package
Version
State

Example:

TikTok
com.ss.android.ugc.trill
40.2.4
● Running

Chrome
com.android.chrome
140
○ Stopped

==================================================
23. APP DETAIL DRAWER
==================================================

Clicking an app opens a right-side drawer.

Do not unnecessarily navigate away.

Show:

Application name
Package
Version
Version Code
UID
Install Type
State

Actions:

Launch
Force Stop
Clear Cache
Clear Data
Extract APK
Uninstall

Tabs:

Overview
Permissions
Activities
Services
Receivers
Providers

Destructive actions require confirmation.

==================================================
24. PROCESS MANAGER
==================================================

Title:

Processes

Description:

Monitor processes running on the selected device.

Toolbar:

Search
Auto Refresh
Refresh

Table:

PID
Process
Package
CPU
Memory
State

Support:

sorting
filtering
context menu

Context menu:

Force Stop
Kill Process
Open App
Copy PID
Copy Package

==================================================
25. LOGCAT
==================================================

This is a flagship feature.

Create a professional Logcat viewer.

Do not use a basic textarea.

Layout:

LOGCAT

Live Android system logs

Toolbar:

Search logs
Package filter
Level filter
Pause
Clear
Export
Auto-scroll

Log viewer columns:

Timestamp
Level
Tag
Message

Example:

20:42:31    I    ActivityManager
Start proc com.example.app

20:42:35    W    WindowManager
Window timeout

20:42:37    E    AndroidRuntime
FATAL EXCEPTION: main

Use monospace typography.

Use subtle semantic colors.

==================================================
26. LOGCAT PERFORMANCE
==================================================

Logcat may produce thousands of lines.

Implement:

- virtualized rendering
- bounded buffer
- batching
- efficient state updates

Default maximum:

10,000 lines

Configurable.

Never render 10,000 DOM nodes without virtualization.

Never update React state once per line if that causes performance issues.

Batch incoming logs where appropriate.

==================================================
27. LOGCAT FILTERS
==================================================

Level:

Verbose
Debug
Info
Warning
Error
Fatal

Package:

All
Specific package

Text search.

Allow combined filters.

==================================================
28. LOGCAT CONTROLS
==================================================

Support:

Start
Stop
Pause
Resume
Clear
Export
Copy selected
Copy visible
Auto-scroll

When paused:

Do not necessarily stop receiving logs from the device.

Maintain a clear distinction between:

stream state

and

display state

==================================================
29. CRASH DETECTION
==================================================

Detect meaningful crashes.

Patterns include:

FATAL EXCEPTION
AndroidRuntime
Process ... has died
ANR
Force finishing activity

Do not classify every error as a crash.

When a crash is detected:

show toast:

Crash Detected

com.example.app

NullPointerException

Thread: main

[ View Crash ]

==================================================
30. CRASH CENTER
==================================================

Create a dedicated Crashes page.

Show recent crashes.

Example:

Crash

com.example.app

NullPointerException

main

MainActivity.kt:142

2 minutes ago

[ View Crash ]

Store crash history locally if configured.

Allow:

- copy
- export
- clear history

==================================================
31. CRASH DETAIL
==================================================

Show:

Application
Process
Exception
Thread
Timestamp

Stacktrace.

Actions:

Copy Stacktrace
Export
Filter System Frames

Highlight application frames.

Do not incorrectly remove useful frames.

==================================================
32. APK INSPECTOR
==================================================

Create a drag-and-drop APK inspector.

Title:

APK Inspector

Description:

Analyze an Android APK locally.

Drop zone:

Drop APK here

or

Browse your files

After selecting:

File name
Size
Package
Version
Version Code
Min SDK
Target SDK
ABI

Tabs:

Overview
Manifest
Permissions
Activities
Services
Receivers
Providers
Certificate
Files

All inspection should happen locally.

==================================================
33. APK INSTALLER
==================================================

Allow installing APK files.

Support:

- install
- reinstall
- split APKs where practical

Show progress.

Handle:

INSTALL_FAILED errors
device unauthorized
device offline
insufficient storage
incompatible SDK
signature conflicts

Display both:

human-readable explanation

and

technical ADB output

==================================================
34. APK EXTRACTION
==================================================

From App Details:

Extract APK

Allow destination selection.

Show:

Preparing
Pulling
Completed
Failed

Use native Windows file dialog.

==================================================
35. FILE MANAGER
==================================================

Title:

Files

Path:

/storage/emulated/0/

Toolbar:

Upload
Download
New Folder
Refresh
Search

Columns:

Name
Type
Size
Modified

Actions:

Upload
Download
Delete
Rename
Create Folder

Support drag and drop.

Use progress indicators for transfers.

==================================================
36. FILE TRANSFER
==================================================

For large files:

Never block UI.

Show:

File name
Transferred
Total
Speed
ETA
Progress

Allow cancellation when possible.

If transfer fails:

show retry.

==================================================
37. SHELL
==================================================

Create terminal-style interface.

Header:

Shell

vivo X100 · Wireless ADB

Terminal:

vivo:/ $ getprop ro.build.version.release
16

vivo:/ $ pm list packages

Features:

- command history
- clear
- copy
- save output
- auto-scroll
- cancel

Do not execute arbitrary Windows shell commands through cmd.exe.

Use adb shell explicitly.

==================================================
38. DEVICE TOOLS
==================================================

Categories:

SCREEN

Screenshot
Screen Recording

SYSTEM

Reboot
Recovery
Bootloader

INFO

Battery
Memory
Storage
Properties

ADB

Restart ADB
Clear Logcat

Dangerous operations require confirmation.

==================================================
39. SCREENSHOT
==================================================

Allow:

Capture screenshot
Preview
Save to Windows
Copy

Use native file dialogs.

==================================================
40. SCREEN RECORDING
==================================================

UI:

Screen Recording

[ Start Recording ]

While recording:

Recording
00:12

[ Stop ]

After stop:

Save recording to Windows.

Show errors if device does not support the requested recording operation.

==================================================
41. DEVICE INFORMATION
==================================================

Show:

Manufacturer
Model
Device
Product
Android Version
SDK
Build ID
Fingerprint
ABI
Security Patch
Kernel Version
Screen Resolution
Density

Use ADB commands appropriate to the device.

==================================================
42. BATTERY
==================================================

Show:

percentage
charging state
health
temperature
voltage
current if available
technology

Use dumpsys battery or equivalent.

Unavailable fields should display:

Not available

not zero.

==================================================
43. MEMORY
==================================================

Show:

Total RAM
Available RAM
Used RAM where derivable

Do not claim exact values if the source is approximate.

==================================================
44. STORAGE
==================================================

Show:

Total
Used
Available

Provide a compact visual indicator.

==================================================
45. SETTINGS
==================================================

Sections:

ADB

ADB path
Auto detect
Test ADB

DEVICES

Auto refresh
Auto reconnect
Remember devices

LOGCAT

Maximum buffer
Auto-scroll
Pause on crash

APPEARANCE

Dark theme
UI scale

BEHAVIOR

Confirm destructive actions
Start minimized

==================================================
46. GLOBAL SEARCH
==================================================

Ctrl+K

Search navigation and actions.

Use command palette UI.

Example:

> screenshot

Result:

Take Screenshot

> logcat

Result:

Open Logcat

> connect

Result:

Connect Device

==================================================
47. NOTIFICATIONS
==================================================

Create reusable toast system.

Success:

✓ APK installed successfully

Warning:

⚠ Device unauthorized

Error:

✕ Failed to install APK

Info:

Device connected

Toasts should be subtle.

==================================================
48. DIALOGS
==================================================

Create reusable confirmation dialogs.

Uninstall:

Confirm Uninstall

Are you sure you want to uninstall:

com.example.app

This action cannot be undone.

[ Cancel ] [ Uninstall ]

Same for:

Clear Data
Delete File
Kill Process
Reboot
Recovery
Bootloader

==================================================
49. EMPTY STATES
==================================================

Every page must have a polished empty state.

No device:

No Android device connected.

Connect a device using USB or Wireless ADB.

[ Connect Device ]

No apps:

No applications found.

No logs:

Waiting for Logcat...

No files:

This directory is empty.

==================================================
50. LOADING STATES
==================================================

Do not show only:

Loading...

Instead:

Loading installed applications...

Fetching package information from vivo X100

Use spinner/progress.

==================================================
51. ERROR STATES
==================================================

Example:

Unable to load applications

Could not execute ADB operation.

[ Retry ]

Technical Details ▾

Show original stderr under technical details.

==================================================
52. RUST ADB ABSTRACTION
==================================================

Create:

AdbClient

Responsibilities:

- executable discovery
- version
- command execution
- streaming commands
- timeout
- cancellation
- stdout
- stderr
- exit code

Conceptually:

AdbClient
├── devices()
├── version()
├── shell()
├── install()
├── uninstall()
├── launch()
├── force_stop()
├── clear_cache()
├── clear_data()
├── pull()
├── push()
├── logcat()
├── screenshot()
├── reboot()
├── pair()
└── connect()

React must never directly spawn adb.exe.

==================================================
53. ADB COMMAND SECURITY
==================================================

Never construct unsafe shell strings.

Prefer:

Command::new(adb_path)
    .arg("-s")
    .arg(serial)
    .arg("shell")
    ...

Do not use:

cmd.exe /C

unless absolutely required.

Validate user-supplied paths.

Prevent command injection.

==================================================
54. RUST BACKGROUND WORKERS
==================================================

Background operations:

- device discovery
- Logcat
- process monitor
- battery updates
- storage updates
- memory updates
- file transfers
- APK inspection
- screenshot
- recording
- shell

Never block the UI thread.

==================================================
55. TAURI EVENTS
==================================================

Use events for realtime data.

Examples:

device-connected
device-disconnected
device-updated

logcat-line
logcat-batch

crash-detected

process-updated

transfer-progress

operation-started
operation-completed
operation-failed

==================================================
56. FRONTEND STATE
==================================================

Use Zustand.

Stores:

deviceStore
appStore
processStore
logcatStore
crashStore
fileStore
uiStore
settingsStore

Keep state normalized.

Avoid giant global objects.

==================================================
57. TANSTACK TABLE
==================================================

Use TanStack Table for:

Apps
Processes
Files
Devices where appropriate

Use TanStack Virtual for very large datasets.

==================================================
58. COMPONENT ARCHITECTURE
==================================================

Create reusable components:

Button
IconButton
Badge
StatusBadge
Card
StatCard
DataTable
SearchInput
Tabs
Select
Dialog
Drawer
Toast
Tooltip
Progress
EmptyState
LoadingState
ErrorState
DeviceSelector
DeviceCard
SidebarItem
Breadcrumb
CommandPalette
CodeViewer
LogViewer
Terminal

Do not duplicate UI patterns.

==================================================
59. DESIGN TOKENS
==================================================

Create centralized theme variables.

Example:

--background
--panel
--panel-elevated
--border
--text
--text-muted
--accent
--success
--warning
--error

Spacing:

xs
sm
md
lg
xl

Radius:

sm
md
lg

Shadows:

subtle
elevated

All components should use the design system.

==================================================
60. RESPONSIVE WINDOW
==================================================

Support:

1280x720
1366x768
1920x1080
2560x1440

Minimum reasonable window size:

approximately 1100x700

Do not break layouts at smaller supported sizes.

==================================================
61. WINDOW BEHAVIOR
==================================================

Support:

- resize
- maximize
- restore
- minimize
- remember window size if practical

Default:

approximately 1280x800

==================================================
62. ACCESSIBILITY
==================================================

Support:

- keyboard navigation
- visible focus states
- readable contrast
- tooltips
- semantic labels
- non-color status indicators

==================================================
63. KEYBOARD SHORTCUTS
==================================================

Implement:

Ctrl+K
Command palette

Ctrl+R
Refresh

Ctrl+Shift+L
Logcat

Ctrl+Shift+A
Apps

Ctrl+Shift+S
Shell

Esc
Close dialogs/drawers

Do not break normal text input shortcuts.

==================================================
64. MULTI-DEVICE SAFETY
==================================================

Every operation must have an explicit target device.

Never accidentally execute:

adb shell ...

when multiple devices exist.

Use:

adb -s SERIAL ...

If no device is selected:

show:

Select a device first.

==================================================
65. DISCONNECT HANDLING
==================================================

If a device disconnects during:

- install
- uninstall
- Logcat
- shell
- file transfer
- screenshot
- recording

The application must:

1. detect disconnect
2. stop/cancel related operation
3. clean resources
4. preserve application state
5. show error
6. allow retry after reconnect

Never crash.

==================================================
66. PROCESS MANAGEMENT
==================================================

Create a reusable process runner.

Requirements:

- stdout
- stderr
- exit code
- timeout
- cancellation
- streaming
- cleanup

Use Tokio process APIs where useful.

==================================================
67. CONFIGURATION
==================================================

Store locally:

%APPDATA%\ADBManager\

Possible files:

config.json
devices.json
crashes.json

Do not store unnecessary sensitive data.

==================================================
68. LOGGING
==================================================

Use tracing.

Store application logs locally.

Do not log:

- credentials
- sensitive files
- unnecessary device content

==================================================
69. MOCK MODE
==================================================

Create mock mode for UI development.

Environment:

ADB_MANAGER_MOCK=1

Mock:

- devices
- apps
- processes
- Logcat
- crashes
- battery
- memory
- storage
- files

The UI should be fully testable without an Android device.

==================================================
70. TESTING
==================================================

Write unit tests for:

ADB device parsing
package parsing
process parsing
battery parsing
memory parsing
storage parsing
Logcat parsing
crash detection
wireless pairing parsing
configuration

Test error handling.

Test multiple device scenarios.

==================================================
71. PERFORMANCE
==================================================

Performance is critical.

The app should remain responsive with:

10,000+ Logcat entries
multiple connected devices
large APKs
large file transfers
process monitoring

Use:

- batching
- virtualization
- bounded buffers
- background workers
- efficient serialization
- minimal unnecessary cloning

==================================================
72. SECURITY / PRIVACY
==================================================

The app is local-first.

Do not implement telemetry unless explicitly requested.

Do not upload device information.

Do not upload APKs.

Do not upload Logcat.

Do not upload files.

Do not silently download tools.

Do not silently install software.

Destructive actions require confirmation.

==================================================
73. ADB INSTALLATION
==================================================

Do not bundle adb.exe blindly unless licensing/distribution requirements
are verified.

Allow:

- user-provided adb.exe
- configured Android SDK path
- documented Platform Tools installation

If bundling Platform Tools is later desired, clearly separate that from
the core application and verify redistribution requirements.

==================================================
74. UI DETAILS
==================================================

Use subtle micro-interactions:

- hover transitions
- drawer slide
- dialog fade
- connection indicator
- progress transitions
- toast animations

Animations should be fast.

Do not over-animate.

==================================================
75. PREMIUM DETAILS
==================================================

Add polish through:

- precise spacing
- alignment
- subtle borders
- elegant typography
- clean icons
- good empty states
- polished loading states
- contextual menus
- keyboard shortcuts
- smooth drawers
- compact controls
- professional status indicators

Do not rely on gradients to make the UI look premium.

==================================================
76. DEVICE SELECTOR
==================================================

Global device selector:

[ ● vivo X100 ▾ ]

Dropdown:

Connected Devices

● vivo X100
  Android 16 · Wireless

● Pixel 9
  Android 15 · USB

────────────────

+ Connect Device

Selecting a device updates all relevant pages.

==================================================
77. APP CONTEXT
==================================================

When an application is selected:

Show a detail drawer.

The drawer should not cause unnecessary full-page navigation.

Allow:

Launch
Force Stop
Clear Cache
Clear Data
Extract APK
Uninstall

==================================================
78. LOGCAT CONTEXT
==================================================

When a package is selected in Apps:

Provide an action:

Open Logcat for this app

This should navigate to Logcat and automatically apply the package filter.

==================================================
79. CRASH CONTEXT
==================================================

When a crash is detected:

Allow:

View Crash
Open Logcat Around Crash

The Logcat viewer should optionally position itself near the relevant timestamp
if enough context exists.

==================================================
80. APK CONTEXT
==================================================

From Apps:

Extract APK

From APK Inspector:

Install APK

Create a smooth workflow between these features.

==================================================
81. FILE CONTEXT
==================================================

From file manager:

Right-click:

Download
Delete
Rename
Copy Path
Open Parent

Where appropriate.

==================================================
82. DEVICE TOOLS CONTEXT
==================================================

Quick actions should be available from:

Dashboard
Device page

Examples:

Screenshot
Logcat
Shell
Apps

Avoid forcing users to navigate through many pages for common actions.

==================================================
83. PROJECT QUALITY
==================================================

Use strict TypeScript.

Avoid:

any

unless absolutely necessary.

Use Rust Result and structured errors.

Avoid:

unwrap()

expect()

in production paths.

Use proper error propagation.

==================================================
84. DOCUMENTATION
==================================================

README must include:

Project overview
Architecture
Requirements
Installation
Development
ADB setup
Wireless ADB
QR pairing
Building
Testing
Packaging
Troubleshooting

==================================================
85. BUILD
==================================================

The project must support:

npm install

npm run dev

npm run build

cargo check

cargo test

cargo build --release

and:

tauri build

The final Windows output should be a proper Windows desktop executable.

==================================================
86. DEVELOPMENT PHASES
==================================================

Do NOT implement everything in one giant step.

Implement in phases.

------------------------------------------
PHASE 1 — FOUNDATION
------------------------------------------

Create:

Tauri 2
React
TypeScript
Vite
Tailwind
shadcn/ui
Zustand
Lucide

Create:

- app shell
- sidebar
- header
- status bar
- theme
- reusable components
- routing/navigation
- settings foundation

Then implement Rust:

- ADB detection
- ADB version
- adb devices -l
- device parser
- device state

At the end:

Real Android devices should appear in the UI.

------------------------------------------
PHASE 2 — DEVICE MANAGEMENT
------------------------------------------

Implement:

- device selector
- multiple devices
- device details
- USB
- connection states
- saved devices
- reconnect

------------------------------------------
PHASE 3 — WIRELESS ADB
------------------------------------------

Implement:

- manual IP connection
- pairing code
- QR pairing
- camera
- saved wireless devices
- reconnect

------------------------------------------
PHASE 4 — APP MANAGER
------------------------------------------

Implement:

- installed apps
- filtering
- search
- app details
- launch
- force stop
- clear cache
- clear data
- uninstall
- APK extraction

------------------------------------------
PHASE 5 — PROCESS MANAGER
------------------------------------------

Implement:

- process list
- CPU
- memory
- sorting
- filtering
- kill/force stop

------------------------------------------
PHASE 6 — LOGCAT
------------------------------------------

Implement:

- realtime streaming
- parser
- filtering
- search
- package filter
- pause
- clear
- export
- virtualization
- bounded buffer

------------------------------------------
PHASE 7 — CRASH CENTER
------------------------------------------

Implement:

- crash detection
- crash history
- stacktrace viewer
- system-frame filtering
- export
- Logcat integration

------------------------------------------
PHASE 8 — APK INSPECTOR
------------------------------------------

Implement:

- APK drag/drop
- metadata
- manifest
- permissions
- components
- certificate
- installation

------------------------------------------
PHASE 9 — FILE MANAGER
------------------------------------------

Implement:

- directory browsing
- push
- pull
- upload
- download
- delete
- rename
- new folder
- progress

------------------------------------------
PHASE 10 — SHELL
------------------------------------------

Implement:

- shell session
- history
- output
- cancellation
- save output

------------------------------------------
PHASE 11 — DEVICE TOOLS
------------------------------------------

Implement:

- screenshot
- recording
- battery
- memory
- storage
- properties
- reboot

------------------------------------------
PHASE 12 — POLISH
------------------------------------------

Implement:

- command palette
- keyboard shortcuts
- animations
- improved errors
- diagnostics
- performance optimization
- accessibility
- packaging
- documentation

==================================================
87. CRITICAL DEVELOPMENT RULE
==================================================

After every phase:

npm run build
cargo check
cargo test
npm run tauri build

must remain functional where applicable.

Do not knowingly leave the project in a broken state.

==================================================
88. EXISTING CODE
==================================================

If an existing project is provided:

First inspect the repository.

Identify:

- current frontend
- current Rust backend
- current ADB abstraction
- existing device manager
- existing parsing
- existing state management
- existing commands
- existing tests

Preserve useful working code.

Do not rewrite stable backend functionality without a reason.

If the current frontend is egui:

remove the egui presentation layer and migrate the UI to:

Tauri + React + TypeScript

Do not simply imitate the old UI.

Redesign it completely.

==================================================
89. NO PLACEHOLDER IMPLEMENTATION
==================================================

Do not create fake buttons that appear functional.

If a feature is displayed as available, it should work.

If a feature is not implemented yet:

either implement it

or hide/disable it appropriately.

Do not fake ADB results.

Do not hardcode fake device data in production mode.

Mock mode is allowed only when explicitly enabled.

==================================================
90. FINAL QUALITY BAR
==================================================

The final application should feel like:

A professional Android developer workstation for Windows.

It should NOT feel like:

- a generic CRUD app
- a website inside a desktop window
- a default shadcn template
- a basic ADB terminal wrapper
- a prototype

The application should have:

- polished UI
- fast interactions
- excellent navigation
- reliable ADB operations
- proper multi-device support
- realtime Logcat
- crash analysis
- APK tools
- file manager
- wireless ADB
- QR pairing
- shell
- professional error handling

==================================================
91. START NOW
==================================================

Before coding:

1. Inspect the repository.
2. Inspect existing source code.
3. Identify what functionality already works.
4. Create a migration plan.
5. Do not destroy working backend code.
6. Set up Tauri + React + TypeScript.
7. Establish the design system.
8. Build the new premium UI shell.
9. Connect the UI to the existing Rust ADB layer.
10. Implement Phase 1 completely.
11. Run tests.
12. Run builds.
13. Fix all compilation/type errors.
14. Only then continue to Phase 2.

When making architectural decisions, prefer maintainability,
performance, type safety, and clean separation of concerns.

Do not take shortcuts that will make future features harder to implement. 