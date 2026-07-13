# uBase Installer

A modern, high-performance, cross-platform desktop application built with **Tauri v2**, **Rust**, and **HTML5/JS** that enables developers to seamlessly install packet files (`.ubase`) into their Base44 apps.

---

## Key Features

- **Double-column Split Interface:** Beautiful styling using high-contrast themes (#000000 pure black and electrical accents).
- **Embedded Marketplace:** Browse official templates and packets directly from `ubase.tech` within the client.
- **5-Step Deployment Wizard:**
  - **Step 1:** Secure drag-and-drop zone or fallback browser for local `.ubase` packets.
  - **Step 2:** Interactive payload preview showing manifest files, packet metadata, and a collapsible raw prompt viewer.
  - **Step 3:** Quick-selection selector with default Base44 apps (InstaFi, Pluto, uBase, BMail44) or manual input.
  - **Step 4:** Status tracking displaying real-time animations, API transmission logs, and active status polling.
  - **Step 5:** Final execution success logs detailing target apps and payload dimensions.
- **Deep-Link Protocol:** Integrated protocol handling for `ubase://` paths (e.g. `ubase://install?id=xyz&app=123`). Emits deep link events straight to front-end states.
- **Installation History Logging:** Local persistence (`localStorage`) database displaying historical status tags (`Completed` (green), `Failed` (red), `Installing` (blue)) alongside fully expandable prompts.
- **Secure Key Management:** Masked environment variables to store developer API tokens, complete with verification connectivity endpoints.

---

## File Structure

```
ubase-installer-tauri/
  ├── src/
  │   ├── index.html        # Centralized visual UI layout
  │   ├── main.js           # Core state logic and API controllers
  │   └── styles.css        # Pure black sleek CSS styling definitions
  ├── src-tauri/
  │   ├── src/
  │   │   ├── main.rs       # Platform bootstrap entry point
  │   │   └── lib.rs        # Deep-link event handlers and tray menu
  │   ├── build.rs          # Rust build controller
  │   ├── Cargo.toml        # Tauri compilation specifications and features
  │   └── tauri.conf.json   # Multi-platform deployment config (Mac/Windows/Linux)
  ├── package.json          # Node dependency configurations
  ├── .gitignore            # Version control filters
  └── README.md             # Developer instruction handbook
```

---

## Getting Started

### Prerequisites

To compile or test this application locally, ensure you have the following frameworks installed:

1. **Rust Language:** [Rustup toolchain](https://rustup.rs/) (stable v1.75+)
2. **NodeJS runtime:** [Node.js installation](https://nodejs.org/) (v18+)
3. **OS-specific developer compilation toolchains:**
   - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
   - **Windows:** C++ build tools or Visual Studio C++ workload
   - **Linux:** System packages including webkit2gtk, build-essential, and libssl (`sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`)

### Installation & Run Steps

1. **Install dependencies:**
   Navigate to the root directory and install NodeJS packages:
   ```bash
   cd ubase-installer-tauri
   npm install
   ```

2. **Run in Development Mode:**
   Launches the hot-reloading desktop development interface:
   ```bash
   npm run dev
   ```

3. **Build Production Release Binaries:**
   Compiles target-optimized native application installers (e.g. `.app`, `.dmg`, `.msi`, `.deb`):
   ```bash
   npm run build
   ```

---

## Deep Link integration (`ubase://`)

The app configures standard protocol bindings to support remote-triggered configurations:
- **Protocol Schema:** `ubase://install?id=[packet_id]&app=[target_app_id]`
- **Behavior:** Upon hitting this link externally, the Tauri Rust Core captures the URL payload, wakes the webview window, and fires a `deep-link` channel broadcast. The javascript client loads this into the installation wizard, pre-fills target inputs, and prepares the installation preview immediately.

---

## Getting your Base44 API Key

To authorize packets sent to the builder pipeline:
1. Navigate to your [Base44 Settings Console](https://base44.com).
2. Go to **Developer Settings** → **API Keys**.
3. Create a new token with write/builder scopes.
4. Copy the secret key starting with `b44_`.
5. Open your `uBase Installer` app → **Settings**, paste your key, and click **Save Key** (You can click **Test Connection** to verify connection to the builder API).
