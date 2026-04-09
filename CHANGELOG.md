# Changelog

All notable changes to ZVault are documented here.

---

## [0.4.0] — 2026-04-09

### Security fixes

- **Sensitive variable edit bypass closed** (`src/components/variables/VariableModal.tsx`, `src-tauri/src/commands/variables.rs`)
  - Opening the Edit Variable modal for a sensitive variable previously called `reveal_variable` unconditionally, exposing the plaintext value in the textarea with no password check — completely bypassing the re-auth protection
  - Fixed: sensitive variables no longer have their value loaded into the edit form. The value field shows an amber-bordered lock panel with a **Reveal** button
  - Clicking Reveal prompts for the master password inline (same amber ShieldAlert UI as the row-level reveal). Wrong password → error toast; correct password → value appears in the editable textarea
  - Turning off the "Require re-auth" toggle on a sensitive variable also now requires the master password (if the value is not already unlocked, the same prompt is shown and also reveals the value)
  - On save: if the value was never unlocked or edited, `null` is passed to the backend and the existing `value_enc` is kept unchanged (no re-encryption, no plaintext ever leaves Rust for untouched sensitive values)
  - Rust `update_variable` command updated to accept `value: Option<String>` — `None` reuses the existing `value_enc` from the database

### UI

- **Variable row checkbox spacing** (`src/components/variables/VariableRow.tsx`, `src/components/variables/VariableTable.tsx`)
  - Selection checkbox was overflowing its 28 px column and sitting flush against the key text
  - First grid column widened from 28 px to 44 px; inner flex now uses `justifyContent: center` and a 6 px gap between the drag grip and checkbox — both elements are now properly centered and visually separated from the key column

### Features

- **Variable groups** (`src/components/variables/VariableTable.tsx`, `src-tauri/src/db/migrations.rs`)
  - Variables within a tier can be tagged with a `group_name` — shown as collapsible section headers in the table
  - Groups are sorted alphabetically; ungrouped variables appear last
  - Group name field added to the variable editor with a `<datalist>` autocomplete for existing group names

- **Pinned variables** (`src/components/variables/VariableRow.tsx`, `src/components/variables/VariableTable.tsx`)
  - New `pinned` boolean column on variables; pinned rows float above all other groups regardless of sort order
  - Pin/unpin toggle button (Pin / PinOff icon) in the row action bar and context menu
  - Small pin indicator icon shown in the key column when a variable is pinned

- **Undo delete** (`src/components/variables/VariableRow.tsx`, `src/components/layout/Sidebar.tsx`)
  - Deleting a variable or project now uses a soft-delete pattern (`deleted_at` column)
  - A toast with an **Undo** button appears for 5.5 seconds — clicking it calls `restore_variable` / `restore_project` and puts the row back immediately
  - After 5.5 s with no undo, `hard_delete_variable` / `hard_delete_project` is called to permanently remove the record
  - Startup migration cleans up any soft-deleted rows older than 1 hour

- **Environment clone** (`src/components/variables/CloneEnvModal.tsx`, `src-tauri/src/commands/tiers.rs`)
  - "Clone" button in the env tabs toolbar opens a modal to pick source project → source tier → target project → new env name
  - Calls the existing `clone_tier` Rust command, then updates the store and selects the new tier

- **Export formats** (`src/components/import-export/ExportDialog.tsx`, `src-tauri/src/commands/import_export.rs`)
  - Export dialog now has a format picker: **.env** (KEY=VALUE), **JSON** (`{"KEY":"VALUE"}`), **YAML** (KEY: VALUE), **Docker** (`--env-file` format)
  - Non-.env formats call the new `export_as_format` Tauri command

- **Sensitive variables / per-variable re-auth** (`src/components/variables/VariableModal.tsx`, `src-tauri/src/commands/variables.rs`)
  - Variables can be marked **Sensitive** — revealing their value requires re-entering the master password even when the vault is unlocked
  - `reveal_sensitive_variable` Tauri command validates vault is unlocked before decrypting
  - Sensitive toggle shown in the variable editor

- **Variable value type hints** (`src/lib/typeValidators.ts`, `src/components/variables/VariableRow.tsx`, `src/components/variables/VariableModal.tsx`)
  - Optional type annotation per variable: `url`, `jwt`, `hex`, `uuid`, `port`, `boolean`
  - Shown as a colored pill badge in the variable row
  - On save, value is validated against the type pattern; a warning toast fires if the format looks wrong
  - `<select>` in the variable editor; no external dependency

- **Password strength meter** (`src/lib/passwordStrength.ts`, `src/components/ui/PasswordStrengthMeter.tsx`)
  - 4-segment colored bar + label (Weak / Fair / Good / Strong) shown on the setup screen and the change-password form in Settings
  - Pure client-side heuristic scorer — length, character class diversity, pattern penalties — no external library

- **Light theme** (`src/styles/tokens.css`, `src/store/configStore.ts`, `src/App.tsx`)
  - `body.light {}` block with ~20 CSS variable overrides for a clean light palette
  - Theme toggle (Dark / Light) in Settings → Security → Appearance, persisted to config
  - `document.body.classList.toggle('light', theme === 'light')` applied reactively in `App.tsx`

- **System tray** (`src-tauri/src/lib.rs`)
  - Tray icon built with `TrayIconBuilder`; left-click toggles show/hide the window
  - Tray menu: **Show ZVault**, **Lock Vault**, separator, **Quit**
  - "Lock Vault" from the tray emits `vault-locked` event and zeroes the DEK in-process
  - **Minimize to tray on close**: when enabled in Settings, the `CloseRequested` window event is intercepted and the window is hidden instead of closed; the process keeps running

- **Drag & drop reordering** (`src/components/variables/VariableTable.tsx`, `src/components/layout/Sidebar.tsx`)
  - Variables can be reordered by dragging the grip handle (visible on row hover) — active only in Custom sort with no search or filter applied; persisted via `reorder_variables`
  - Projects in the sidebar can be dragged to reorder; persisted via `reorder_projects`
  - Uses `@dnd-kit/core` + `@dnd-kit/sortable` (no jQuery dependency)

- **Auto-backup** (`src-tauri/src/commands/backup.rs`, `src/components/settings/SettingsModal.tsx`)
  - New **Backup** section in Settings: enable toggle, interval picker (1 / 3 / 7 / 14 / 30 days), folder picker, and "Back up now" button
  - `backup_vault` Tauri command copies the encrypted SQLite file to the configured folder with a `zvault_backup_YYYYMMDD_HHmmss.db` timestamp
  - Background task runs every hour and triggers an automatic backup if the interval has elapsed
  - Last-backup timestamp persisted to `last_backup.txt` in the app data dir
  - Backup files remain fully encrypted — safe to store anywhere

- **Linux CI pipeline** (`.github/workflows/linux-build.yml`)
  - Builds `.deb` and `AppImage` on Ubuntu 22.04 on every push to main and on PRs
  - Caches Rust build artifacts with `Swatinem/rust-cache`
  - Automatically creates a GitHub Release and attaches the bundles when a `v*` tag is pushed

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

- **Settings modal — new sections & controls** (`src/components/settings/SettingsModal.tsx`)
  - **Appearance** sub-section in Security: Dark / Light theme toggle with Moon / Sun icons
  - **Minimize to tray on close** toggle in Appearance
  - **Backup** section (new tab): enable toggle, interval selector, folder picker, "Back up now" button
  - Password strength meter shown below the new-password field in the change-password form

- **Setup screen** (`src/components/auth/SetupScreen.tsx`)
  - Replaced inline strength bar with the shared `PasswordStrengthMeter` component

- **Version bump** (`src/components/settings/SettingsModal.tsx`, `src/components/layout/StatusBar.tsx`)
  Hardcoded version strings updated to `v0.4.0`.

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

### Backend

- **Soft-delete pattern** (`src-tauri/src/db/migrations.rs`, `src-tauri/src/db/queries.rs`, `src-tauri/src/commands/variables.rs`, `src-tauri/src/commands/projects.rs`)
  - `deleted_at TEXT` column added to both `variables` and `projects` via additive `ALTER TABLE` migrations
  - All list queries filter `WHERE deleted_at IS NULL`; soft-deleted rows are invisible instantly
  - New commands: `restore_variable`, `hard_delete_variable`, `restore_project`, `hard_delete_project`
  - Startup migration hard-deletes any soft-deleted rows older than 1 hour

- **New variable fields** (`src-tauri/src/db/models.rs`, `src-tauri/src/db/queries.rs`)
  - `pinned INTEGER NOT NULL DEFAULT 0`
  - `sensitive INTEGER NOT NULL DEFAULT 0`
  - `group_name TEXT`
  - `value_type TEXT`
  - All added via additive migrations; existing rows get safe defaults

- **AppConfig new fields** (`src-tauri/src/db/models.rs`, `src-tauri/src/db/queries.rs`)
  - `theme` (dark/light), `minimize_to_tray`, `backup_enabled`, `backup_interval_days`, `backup_folder`
  - All stored as key-value rows in `app_config` table; default values applied if row is missing

- **`export_as_format` command** (`src-tauri/src/commands/import_export.rs`)
  - Supports `"json"`, `"yaml"`, `"docker"` output in addition to the existing `.env` writer

- **`pin_variable` command** (`src-tauri/src/commands/variables.rs`)
  - Flips the `pinned` flag; no re-encryption needed

- **`reveal_sensitive_variable` command** (`src-tauri/src/commands/variables.rs`)
  - Decrypts and returns a sensitive variable's value; requires vault to be unlocked (DEK in memory)

- **`backup_vault` command** (`src-tauri/src/commands/backup.rs`)
  - Copies the encrypted SQLite file with a timestamp suffix to the configured backup folder

### Dependencies

- Added `subtle = "2"` for constant-time comparisons.
- Added `@dnd-kit/core@6`, `@dnd-kit/sortable@10`, `@dnd-kit/utilities` for drag & drop reordering.

