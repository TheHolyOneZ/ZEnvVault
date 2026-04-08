# ZVault

**Encrypted environment variable manager. Local-first, offline, no accounts.**

ZVault is a desktop application for developers who are tired of losing track of which secret goes where. Every variable is encrypted with AES-256-GCM before it touches disk. The encryption key lives in memory only — and is zeroed when you lock.

Built with Tauri v2 + Rust backend, React 18 frontend.

---

## Features

- **AES-256-GCM encryption** — each variable value encrypted individually with a unique random nonce
- **Argon2id key derivation** — 64 MB memory, 5 iterations, 4 threads; brute force is expensive by design
- **Project → Environment → Variable hierarchy** — organize secrets by project and stage (dev, staging, prod)
- **Live .env file sync** — link any environment to a file on disk; import with a visual diff preview
- **Auto-lock** — configurable timer (1m / 5m / 15m / 30m / never); DEK zeroed on every lock; optional status bar countdown (amber at ≤5 min, red at ≤60 s)
- **Audit log** — every reveal, copy, import, export, lock, and unlock recorded; filterable by type with date grouping
- **Recovery code** — reset your master password without losing any data
- **Command palette** — `Ctrl+K` quick-access to all actions
- **Bulk operations** — select multiple variables to delete or manage at once
- **100% offline** — no network requests, no accounts, no telemetry, no cloud

---

## Download

**[→ Pre-built download at zsync.eu/zvault/](https://zsync.eu/zvault/)**

Also available as MSI installer and portable `.exe`.

Requires Windows 10/11 x64.

---

## Screenshots

<details>
<summary><b>🖥️ Main interface</b></summary>
<br>
<div align="center">
<img src="Images/ExampleMainView.png" alt="Main view" width="720"/>
<br><br>
<table>
<tr>
<td align="center"><img src="Images/ExampleInsideenv.png" alt="Variables inside environment" width="360"/><br><sub>Variables — environment view</sub></td>
<td align="center"><img src="Images/RightClickContextMenuInsideEnv.png" alt="Right-click context menu" width="360"/><br><sub>Right-click context menu</sub></td>
</tr>
</table>
</div>
</details>

<details>
<summary><b>🔍 Command palette &amp; search</b></summary>
<br>
<div align="center">
<img src="Images/ShortCut_ctrl+k-CommandPallete.png" alt="Command palette (Ctrl+K)" width="600"/>
<br><sub>Command palette — Ctrl+K</sub>
</div>
</details>

<details>
<summary><b>📥 Import &amp; export</b></summary>
<br>
<div align="center">
<img src="Images/ExampleImportEnvFile-diff.png" alt="Import .env diff preview" width="640"/>
<br><sub>Import .env — visual diff preview before committing</sub>
</div>
</details>

<details>
<summary><b>🔐 Security &amp; auth</b></summary>
<br>
<div align="center">
<table>
<tr>
<td align="center"><img src="Images/login.png" alt="Login screen" width="340"/><br><sub>Login screen</sub></td>
<td align="center"><img src="Images/ResetPassword.png" alt="Reset password" width="340"/><br><sub>Reset with recovery code</sub></td>
</tr>
<tr>
<td align="center" colspan="2"><img src="Images/Start CompletlyFresh-Wipemyvault.png" alt="Wipe vault" width="400"/><br><sub>Wipe vault — fresh start</sub></td>
</tr>
</table>
</div>
</details>

<details>
<summary><b>⚙️ Settings</b></summary>
<br>
<div align="center">
<table>
<tr>
<td align="center"><img src="Images/Settings-Security.png" alt="Settings — Security" width="220"/><br><sub>Security</sub></td>
<td align="center"><img src="Images/Settings-Auditlogs.png" alt="Settings — Audit log" width="220"/><br><sub>Audit log</sub></td>
<td align="center"><img src="Images/Settings-Data.png" alt="Settings — Data" width="220"/><br><sub>Data</sub></td>
<td align="center"><img src="Images/Settings-Shortcuts.png" alt="Settings — Shortcuts" width="220"/><br><sub>Shortcuts</sub></td>
</tr>
</table>
</div>
</details>

<details>
<summary><b>📁 Project management</b></summary>
<br>
<div align="center">
<img src="Images/NewProject.png" alt="New project dialog" width="480"/>
<br><sub>New project dialog</sub>
</div>
</details>

---

## Security design

| Component | Choice | Reason |
|-----------|--------|--------|
| Encryption | AES-256-GCM | Authenticated encryption; each value gets a unique 96-bit nonce |
| Key derivation | Argon2id | Memory-hard; winner of Password Hashing Competition |
| KDF parameters | 64 MB memory, 5 iterations, 4 threads | OWASP-recommended minimum for Argon2id (upgraded from 3 in v0.3.0) |
| KDF params stored per-vault | `argon2_t_cost` in DB | Allows future upgrades without breaking existing vaults |
| Key storage | `Zeroizing<[u8;32]>` (zeroize crate) | Zeroed on drop, never serialized |
| Plaintext intermediates | `Zeroizing<String>` during re-encryption | Secret values overwritten in RAM immediately after use |
| On lock | `dek.zeroize()` | Overwrites memory byte-by-byte, not just freed |
| Verify blob comparison | `subtle::ConstantTimeEq` | Constant-time; no timing side-channel on password verification |
| Recovery code | 30 chars (6×5) from 32-symbol alphabet | ~150 bits entropy; above 128-bit offline-attack threshold |
| Database | SQLite (local) | Single file, no server, no network |
| Only values encrypted | Keys and descriptions are plaintext | Acceptable trade-off; only secrets need protection |

The master password is never stored. A verification blob (AES-GCM of a known constant, compared in constant time) is stored so the app can confirm an unlock attempt is correct without persisting the password or key.

---

## Building from source

**Prerequisites:** Rust (stable), Node.js 18+, npm

```bash
git clone https://github.com/TheHolyOneZ/ZEnvVault
cd ZEnvVault

# Install frontend dependencies
npm install

# Development (hot reload)
npm run tauri dev

# Production build + installer
npm run tauri build
```

Output: `src-tauri/target/release/bundle/`
- `nsis/ZVault_0.3.0_x64-setup.exe` — NSIS installer
- `msi/ZVault_0.3.0_x64_en-US.msi` — MSI installer

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+L` | Lock vault immediately |
| `Ctrl+,` | Settings |
| `Ctrl+N` | New variable |
| `Ctrl+Shift+N` | New project |
| `Ctrl+F` | Focus variable search |
| `Ctrl+I` | Import .env file |
| `Ctrl+E` | Export current environment |
| `Ctrl+1–9` | Jump to project 1–9 |
| `Alt+← / →` | Previous / next environment |
| `Escape` | Close modal |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri v2 |
| Backend | Rust |
| Frontend | React 18 + TypeScript |
| State | Zustand |
| Database | SQLite via sqlx |
| Encryption | aes-gcm 0.10 |
| Key derivation | argon2 0.5 |
| Memory safety | secrecy + zeroize |
| Icons | Lucide React |

---

## Data location

```
%APPDATA%\ZVault\zvault.db
```

Single encrypted SQLite file. Back it up like any other file.

---

## Links

- **Project:** [github.com/TheHolyOneZ/ZEnvVault](https://github.com/TheHolyOneZ/ZEnvVault)
- **Author:** [github.com/TheHolyOneZ](https://github.com/TheHolyOneZ)
- **More projects:** [zsync.eu](https://zsync.eu)

---

## License

MIT — see [LICENSE](LICENSE) for details.
