# Changelog

All notable changes to ZVault are documented here.

---

## [0.3.0] — 2026-04-08

### UI

- **Login & setup screen redesign** (`src/components/auth/LockScreen.tsx`, `src/components/auth/SetupScreen.tsx`, `src/styles/animations.css`)
  - Both screens now use a floating card layout on a dot-grid background with a soft accent halo
  - Staggered spring-eased enter animation (background fade → content rise), floating logo idle loop
  - Show/hide toggle on all password inputs
  - Wrong password: input shakes horizontally with a red border glow
  - Correct password: button turns green with checkmark + ripple ring, screen blurs out before app loads
  - Logout re-lock fades the screen in cleanly every time it appears

- **Audit log tab redesign** (`src/components/settings/SettingsModal.tsx`)
  - Filter chips: All / Reads / Writes / Auth (client-side, no re-fetch)
  - Icon badges per action type (Plus, Pencil, Trash, Eye, Copy, Lock/Unlock, Key, Download/Upload)
  - Date group separators: Today / Yesterday / weekday+date
  - Row hover highlight; timestamp with full datetime on hover (`title` attribute)
  - Spinner + two-line empty state (disabled vs no-data vs filtered-empty)
  - Event count shown in toolbar

- **Toast notifications** (`src/components/ui/Toast.tsx`)
  - 2 px progress bar at the bottom depletes over 3.5 s, color-matched per type
  - Icon now uses a square badge (consistent with audit log style)

- **Empty states** (`src/components/variables/EmptyState.tsx`)
  - "No environments": `Layers` icon in a bordered box, proper heading + styled code examples
  - "No variables": accent-colored `KeyRound` icon (was grey), hover states on action buttons

- **MainPanel toolbar** (`src/components/layout/MainPanel.tsx`)
  - Filter `<select>` replaced with `All | Secrets | Non-secrets` pill group
  - Sort `<select>` restyled with `appearance: none` + custom chevron (no more native OS control)
  - "No project selected" splash: ZLogo + heading + `Encrypted · Offline · Organized` badges + "New project" CTA

- **Sidebar** (`src/components/layout/Sidebar.tsx`)
  - Projects now show **edit (pencil) and delete (trash) buttons** on hover — trash turns red, confirms before deleting
  - Footer redesigned: Lock button is icon-only (32 px), turns red on hover; Settings button is icon + label
  - Vertical separator between Lock and Settings

- **Variable table header** (`src/components/variables/VariableTable.tsx`)
  - "Key" column header is now clickable — toggles A→Z / Z→A sort with `▲`/`▼` indicator in accent color
  - Subtle `↕` hint shown on hover when not actively sorted

- **Status bar auto-lock countdown** (`src/components/layout/StatusBar.tsx`, `src/store/configStore.ts`, `src/types/index.ts`)
  - Status bar shows remaining time before auto-lock (e.g. `4m 32s`) with a lock icon
  - Color shifts to amber at ≤5 min and red at ≤60 s remaining
  - Countdown is optional — toggle in Settings → Security → "Show lock countdown in status bar"
  - Defaults to **on**; hidden automatically when auto-lock is set to Never

- **Command palette redesign** (`src/components/search/CommandPalette.tsx`)
  - Each action now has an icon badge (Plus, FolderOpen, Download, Upload, Settings, Lock)
  - "Lock vault" action added — locks immediately
  - Keyboard shortcut hints shown next to each action (`N`, `P`, `,`, `L`)
  - Variable results show a Key icon badge and `↵` hint; clicking or pressing Enter navigates to the correct project + env
  - Navigation hint bar at the bottom (↑↓ navigate, ↵ select, ESC close)

- **Version bump** (`src/components/settings/SettingsModal.tsx`, `src/components/layout/StatusBar.tsx`)
  Hardcoded version strings updated to `v0.3.0`.

### Security

- **Argon2id time cost raised from 3 → 5** (`src-tauri/src/crypto/argon2.rs`)  
  The previous value of 3 was below the OWASP-recommended minimum of 4 for
  Argon2id. New vaults now use `t=5` (64 MB memory, 5 iterations, 4 threads).
  Existing vaults are unaffected — the t_cost used at setup is persisted in the
  database (`argon2_t_cost` config key) and read back at unlock time, so old
  vaults remain openable with their original parameters. The upgrade applies
  automatically the next time a user changes their master password.

- **KDF parameters stored per-vault** (`src-tauri/src/commands/auth.rs`)  
  `argon2_t_cost` is now written to the database at setup and after every
  password change. This decouples vault files from the application binary,
  making future parameter upgrades safe and backward-compatible.

- **Recovery code entropy raised from ~100 → ~150 bits** (`src-tauri/src/crypto/random.rs`)  
  Recovery codes now use 6 groups of 5 characters (format: `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX`)
  instead of 4 groups. Both formats use the same 32-symbol unambiguous alphabet
  (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`). Old recovery codes stored in existing
  vaults continue to work — the minimum-length check in `reset_password_with_recovery`
  accepts any normalized code ≥ 16 characters.

- **Decrypted secret values are now zeroized in memory** (`src-tauri/src/crypto/aes_gcm.rs`, `src-tauri/src/commands/auth.rs`)  
  A new `decrypt_str_zeroizing` function returns `Zeroizing<String>` instead of
  a plain `String`. It is used in all code paths where a decrypted variable
  value is a transient intermediate — specifically the re-encryption loops
  in `change_master_password` and `reset_password_with_recovery`, and the
  `unseal_dek` helper (which decrypts a hex-encoded copy of the DEK).
  The `secrecy` crate was already a dependency; this closes the gap where
  the DEK itself was zeroized but the plaintext values it decrypted were not.

- **Constant-time comparison in `verify_key`** (`src-tauri/src/crypto/aes_gcm.rs`)  
  The equality check after decrypting the verification blob now uses
  `subtle::ConstantTimeEq` instead of `==`. While the risk in this specific
  context is low (AES-GCM authentication already provides the primary
  security guarantee), constant-time comparison is the correct practice for
  any comparison involving key-derived material.

### Dependencies

- Added `subtle = "2"` for constant-time comparisons.

