# ZVault

**Encrypted environment variable manager. Local-first, offline, no accounts.**

ZVault is a desktop application for developers who are tired of losing track of which secret goes where. Every variable is encrypted with AES-256-GCM before it touches disk. The encryption key lives in memory only — and is zeroed when you lock.

Built with Tauri v2 + Rust backend, React 18 frontend.

---

## Features

- **AES-256-GCM encryption** — each variable value encrypted individually with a unique random nonce
- **Argon2id key derivation** — 64 MB memory, 3 iterations, 4 threads; brute force is expensive by design
- **Project → Environment → Variable hierarchy** — organize secrets by project and stage (dev, staging, prod)
- **Live .env file sync** — link any environment to a file on disk; import with a visual diff preview
- **Auto-lock** — configurable timer (1m / 5m / 15m / 30m / never); DEK zeroed on every lock
- **Audit log** — every reveal, copy, import, export, lock, and unlock recorded with a timestamp
- **Recovery code** — reset your master password without losing any data
- **100% offline** — no network requests, no accounts, no telemetry, no cloud

---

## Download

**[→ Download for Windows (NSIS installer)](https://github.com/TheHolyOneZ/ZEnvVault/releases)**

Also available as MSI installer and portable `.exe`.

Requires Windows 10/11 x64.

---

## Security design

| Component | Choice | Reason |
|-----------|--------|--------|
| Encryption | AES-256-GCM | Authenticated encryption; each value gets a unique 96-bit nonce |
| Key derivation | Argon2id | Memory-hard; winner of Password Hashing Competition |
| Key storage | `SecretBox<[u8;32]>` (secrecy crate) | Zeroed on drop, never serialized |
| On lock | `dek.zeroize()` | Overwrites memory byte-by-byte, not just freed |
| Database | SQLite (local) | Single file, no server, no network |
| Only values encrypted | Keys and descriptions are plaintext | Acceptable trade-off; only secrets need protection |

The master password is never stored. A verification blob (AES-GCM of a known constant) is stored so the app can confirm an unlock attempt is correct without persisting the password or key.

---

## Building from source

**Prerequisites:** Rust (stable), Node.js 18+, pnpm

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
- `nsis/ZVault_0.1.0_x64-setup.exe` — NSIS installer (~2.4 MB)
- `msi/ZVault_0.1.0_x64_en-US.msi` — MSI installer (~3.3 MB)

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
