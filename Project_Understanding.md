# Mileage Tracker — Codebase Understanding

A standalone Expo/React Native mobile app (SDK 57, TypeScript strict) for logging petrol fill-ups and tracking mileage. Single vehicle, single user, no auth, no backend — everything lives in a local SQLite database on the device. It's a rebuild of an older FastAPI+MongoDB+React web prototype (preserved under `reference/legacy-prototype/`); see `Project_Plan.md` for the full rebuild rationale, the bugs that were deliberately fixed, and the phased build history.

This document explains what's actually in the codebase and how the pieces fit together.

## Project structure

```
App.tsx                     — app entry: font loading, DB warm-up, provider/navigation wiring
index.ts                    — registerRootComponent(App)
app.json                    — Expo config (name, bundle id, icon/splash assets, plugins)
metro.config.js             — Metro bundler config (see "Web platform notes" below)
eas.json                    — EAS Build config (development profile only)
tsconfig.json                — extends expo/tsconfig.base, strict mode

src/
  types/                    — plain TypeScript interfaces, no runtime code
    fuelEntry.ts              FuelEntry, FuelEntryInput, EnrichedFuelEntry
    analytics.ts               SummaryStats, MonthlyBreakdownEntry

  constants/                — static values, no logic
    theme.ts                  color/font/radius/spacing design tokens
    analytics.ts                KPI/chart color map, the 30 km/L reference constant

  db/                       — SQLite access, no business rules
    database.ts                singleton DB connection + schema
    fuelEntryRepository.ts      CRUD functions over the fuel_entries table

  utils/                    — pure functions: business logic and formatting
    dateFormat.ts              local-safe date parsing/formatting
    format.ts                   number/currency display formatting
    mileageEngine.ts             all the mileage/analytics math
    odometerValidation.ts        the odometer-sequencing validation fix
    platformGuards.ts            web-vs-native capability checks

  context/
    FuelEntriesContext.tsx     the app's single source of truth: state + CRUD + selectors

  navigation/
    types.ts                   typed route/param definitions
    AppNavigator.tsx             root stack navigator
    MainTabs.tsx                 bottom tab navigator

  screens/                  — one file per screen, wired to the context
    DashboardScreen.tsx
    HistoryScreen.tsx
    SettingsScreen.tsx
    AddEditEntryScreen.tsx

  components/               — reusable presentational pieces
    DateField.tsx (+.web.tsx)
    HistoryRow.tsx
    ConfirmDialog.tsx
    KpiTile.tsx
    ScopeSelector.tsx
    ChartEmptyState.tsx
    MileageTrendChart.tsx
    LastTwoMonthsCard.tsx
    MonthComparisonChart.tsx
    FuelPriceTrendChart.tsx

  export/
    exportService.ts           CSV export

  backup/
    backupService.ts            JSON backup/restore

reference/legacy-prototype/  — the original web prototype, kept for logic reference, never executed
```

## Architecture: how data flows

```
SQLite (fuel_entries table)
    │  raw CRUD, snake_case rows
    ▼
fuelEntryRepository.ts  ──►  FuelEntry[] (camelCase domain objects)
    │
    ▼
FuelEntriesContext  ──►  runs mileageEngine over the raw list on every change:
    │                     - enrichedEntries   (chronological, with computed distance/mileage/etc.)
    │                     - historyEntries    (same, newest-first, for the History screen)
    │                     - monthlyBreakdown  (per-month aggregates, for the charts)
    │                     - distinctMonths    (for the scope selector)
    │                     - getSummary(month) (KPI numbers for a given scope)
    ▼
Screens (Dashboard / History / Settings / AddEditEntry)
    │  read via useFuelEntries(), never touch the repository or SQLite directly
    ▼
Components (KpiTile, HistoryRow, the 4 charts, etc.) — purely presentational, take data as props
```

Two invariants worth knowing:
- **The repository never runs business logic.** Mileage math and odometer validation live in `src/utils/` and are called from the context, not the DB layer. `fuelEntryRepository.ts` is dumb CRUD.
- **Charts always read `monthlyBreakdown`, never a scoped summary.** The Dashboard's month/life-to-date selector only changes the 8 KPI tiles; the 4 charts always show full history. This was verified by testing, not just intended.

## Module-by-module reference

### Root files

- **`App.tsx`** — Loads Work Sans + IBM Plex Sans via `@expo-google-fonts/*`, and separately "warms up" the database (`getDatabase()`) so the schema exists before any screen renders. Both gate a splash screen (`expo-splash-screen`) that only hides once fonts are loaded *and* the DB is ready. Renders `SafeAreaProvider > FuelEntriesProvider > NavigationContainer > AppNavigator`.
- **`index.ts`** — Standard Expo entry point, unmodified from the template (`registerRootComponent(App)`).
- **`app.json`** — App name "Mileage Tracker", Android package `com.tswastik.mileagetracker`, `userInterfaceStyle: light`. Icon/splash/adaptive-icon images are still Expo's default template assets — custom branding is deferred (see `Project_Plan.md`). `plugins` lists only what's actually used: `expo-sqlite`, the community date-time-picker, `expo-sharing`, `expo-font`, `expo-splash-screen`.
- **`metro.config.js`** — See "Web platform notes" below; without this, `expo-sqlite` fails to bundle for web at all.
- **`eas.json`** — Minimal: just a `development` build profile (internal distribution, Android APK). No preview/production profiles set up yet.

### `src/types/` — domain types

- **`fuelEntry.ts`**
  - `FuelEntry` — one row's worth of data as the app uses it: `id, date, odometerKm, liters, totalPriceInr, station, notes, createdAt`.
  - `FuelEntryInput` — `Omit<FuelEntry, 'id' | 'createdAt'>`, i.e. what a form submits (id and createdAt are assigned on write).
  - `EnrichedFuelEntry` — a `FuelEntry` plus the four computed fields: `distanceKm`, `mileageKmpl`, `pricePerLiter`, `costPerKm` (each `number | null`).
- **`analytics.ts`**
  - `SummaryStats` — the shape of one scope's (life-to-date or one month's) KPI numbers: `scope` (display label), `totalSpent`, `totalLiters`, `totalDistanceKm`, `avgMileageKmpl`, `avgCostPerKm`, `avgPricePerLiter`, `entryCount`.
  - `MonthlyBreakdownEntry` — the same shape minus `avgCostPerKm` and with `scope` replaced by `month` (`"YYYY-MM"`) — this is what feeds every chart.

### `src/constants/` — static tokens

- **`theme.ts`** — the single source of truth for colors, fonts, corner radii, and spacing. Colors follow the original prototype's "Organic & Earthy" palette: `background` (bone white `#F9F8F6`), `textPrimary`/`textMuted`, `border`, `forestGreen` (primary/brand), `terracotta` (secondary accent), `blue` (tertiary accent), plus hover variants. `fonts` maps semantic names (`heading`, `headingBold`, `body`, `bodyMedium`, `bodySemiBold`) to the actual loaded font family strings. Every screen and component imports from here rather than hardcoding hex values or font names.
- **`analytics.ts`** — `LAST_TWO_MONTHS_REFERENCE_KMPL = 30` (the fixed reference the last-2-months bar width is normalized against) and `kpiColors`, mapping each of the 8 KPI tiles to one of the theme's accent colors.

### `src/db/` — SQLite access layer

- **`database.ts`** — Exposes one function, `getDatabase()`, which lazily opens `mileage-tracker.db` via `expo-sqlite`'s `openDatabaseAsync` and runs the schema (`PRAGMA journal_mode = WAL`, `CREATE TABLE IF NOT EXISTS fuel_entries (...)`, an index on `(date, created_at)`) exactly once. The resulting promise is memoized at module scope, so every caller across the app shares the same connection and the schema only runs once per process.
- **`fuelEntryRepository.ts`** — The only file that writes raw SQL. A private `FuelEntryRow` interface mirrors the table's snake_case columns; `rowToFuelEntry()` maps a row to the camelCase `FuelEntry` type. Exposes `listAll()` (ascending by date/created_at), `getById(id)`, `create(input)`, `update(id, input)`, `remove(id)` — all parameterized queries via `db.getAllAsync`/`getFirstAsync`/`runAsync`. No validation, no mileage math — purely persistence.

### `src/utils/` — business logic and formatting

- **`dateFormat.ts`** — All date handling funnels through here, using `date-fns`'s `parseISO`/`format` instead of the JS `Date` constructor on a bare `"YYYY-MM-DD"` string (which parses as UTC and can display the wrong day depending on the device's timezone — a real bug in the original prototype). Exports `todayLocalISODate()`, `formatDisplayDate()` (`"dd MMM yyyy"`), `formatMonthLabel()` (`"YYYY-MM"` → `"MMM yyyy"`), `toDateOnlyString(date)`, and `parseDateOnly(iso)`.
- **`format.ts`** — Two number-formatting helpers shared by `HistoryRow` and the Dashboard: `formatInr(n)` (`"₹1,234"`, or `"—"` for null/NaN) and `formatNum(n, suffix, decimals)` (locale-formatted with an optional suffix, same null handling). Both use `en-IN` locale formatting (Indian digit grouping) with no minimum fraction digits, matching the original.
- **`mileageEngine.ts`** — The core analytics module. In order of what's in the file:
  - `chronologicalSort(entries)` — generic sort by `(date, createdAt)` ascending; this exact ordering rule is used everywhere entries need to be sequenced.
  - `computeEnrichedEntries(entries)` — the heart of the app. Walks the chronologically-sorted list once, tracking the previous entry's odometer reading, and computes each entry's `distanceKm`, `mileageKmpl`, `pricePerLiter`, `costPerKm` (all null-guarded — the first entry has no distance baseline, and every division checks its denominator is `> 0` first). Distance/mileage assume this entry's odometer is `>` the previous one, which is now always true because `odometerValidation.ts` enforces it at write time.
  - `sortHistoryDescending(entries)` — re-sorts an already-enriched list newest-first, for the History screen.
  - `computeSummary(enriched, month)` — the KPI numbers for one scope (`month = null` means life-to-date). Filters the *already-enriched* list by `date.startsWith(month)` — meaning scope filtering happens after the global chronological mileage computation, so a month's first entry can still carry a valid distance computed against the previous month's last entry. Reproduces the original's deliberate formula asymmetry: `totalSpent`/`totalLiters`/`entryCount` use every entry in scope, `avgMileageKmpl`/`avgCostPerKm` use only the subset with a computed distance, and `avgPricePerLiter` uses the all-entries totals (not the distance-having subset) — see "Known behaviors" below.
  - `computeMonthlyBreakdown(enriched)` — calls `computeSummary` once per distinct month (ascending), for the charts.
  - `listDistinctMonthsDescending(enriched)` — feeds the `ScopeSelector` dropdown/chip list.
- **`odometerValidation.ts`** — `validateFuelEntryInput(input, allEntries, editingId?)`. Field checks (`liters > 0`, `totalPriceInr > 0`, `odometerKm >= 0`), then finds the input's true chronological neighbors (excluding the entry being edited, if any) and rejects unless `odometerKm` falls between the previous entry's and next entry's odometer readings. This is the fix for the original's cascading-corruption bug — see "Known behaviors" below.
- **`platformGuards.ts`** — `assertFileSystemSupported()`, called at the top of every export/backup function. `expo-file-system`'s new File/Directory API has no web implementation at all; this throws a clear, actionable error ("...need a phone or emulator...") instead of letting an internal error like `this.validatePath is not a function` reach the user.

### `src/context/FuelEntriesContext.tsx` — application state

A single React Context + `useReducer`, provided once at the app root (`FuelEntriesProvider` in `App.tsx`) and consumed everywhere via the `useFuelEntries()` hook. This is the *only* place screens should get or mutate fuel-entry data — no screen calls the repository or `mileageEngine` directly.

- **State**: `{ entries: FuelEntry[], loading: boolean }` — the raw, unenriched list as loaded from SQLite.
- **Reducer actions**: `LOADED` (full replace, used on initial mount and after a backup restore), `ADDED`, `UPDATED`, `REMOVED`.
- **Mutating methods** (`addEntry`, `updateEntry`, `deleteEntry`, `importBackup`) all call `odometerValidation` before touching the repository, and throw a plain `Error` on failure so callers can `try/catch` and show it inline. `importBackup` is the most involved: it validates the *entire* incoming backup against an in-memory accumulator first (no DB writes at all during validation), and only deletes the existing entries and re-creates the backup's entries once the whole file is confirmed valid — a corrupt or hand-edited backup can never leave the database half-cleared.
- **Derived/memoized values**, all recomputed only when `state.entries` changes: `enrichedEntries`, `historyEntries`, `monthlyBreakdown`, `distinctMonths`, and the `getSummary(month)` selector function. Every screen that needs computed numbers reads one of these rather than calling `mileageEngine` itself.

### `src/navigation/`

- **`types.ts`** — `RootStackParamList` (`MainTabs`, `AddEditEntry: { entryId?: number }`), `MainTabParamList` (`DashboardTab`, `HistoryTab`, `SettingsTab`), and typed prop aliases (`DashboardTabScreenProps`, etc.) built with React Navigation's `CompositeScreenProps` so each screen gets both its tab and stack navigation props correctly typed.
- **`AppNavigator.tsx`** — Root `createNativeStackNavigator`. `MainTabs` is the initial route (no header). `AddEditEntry` is pushed on top as a **modal** presentation, with its header title switching between "Log Refuel" and "Edit Refuel" based on whether `route.params?.entryId` is set — one screen handles both add and edit.
- **`MainTabs.tsx`** — `createBottomTabNavigator` with three tabs (Dashboard ⛽, History 📋, Settings ⚙️), emoji icons via a small local `TabIcon` helper, active tint set to the forest-green theme color.

### `src/screens/`

- **`DashboardScreen.tsx`** — The main view. Holds `selectedMonth` (`string | null`) as local state, derives `summary` via `getSummary(selectedMonth)`, and renders: a header with a "+ Log refuel" button, `ScopeSelector`, a 2-column grid of 8 `KpiTile`s, then all 4 chart components (always fed `monthlyBreakdown`, not `summary`). Root element is a `SafeAreaView` (`edges={['top']}`) — see "Status bar / safe area" below.
- **`HistoryScreen.tsx`** — Renders `historyEntries` (newest-first) in a `FlatList` of `HistoryRow`s. Edit navigates to `AddEditEntry` with `entryId`; delete sets a `pendingDelete` entry in local state, which drives a `ConfirmDialog` — nothing is deleted until the dialog is confirmed. Has its own empty state and its own "+ Log refuel" entry point. Root element is a `SafeAreaView` (`edges={['top']}`).
- **`SettingsScreen.tsx`** — Three cards: Export (CSV), Backup (backup/restore), About (app name + entry count). A single `runAction(actionName, fn)` helper tracks a `busy` flag (used to disable buttons and swap in an `ActivityIndicator`) and catches errors into a shared inline `error` message. Restore is two-step: `pickAndReadBackup()` first, then a `ConfirmDialog` naming exactly how many entries will be replaced by how many, and only calls `importBackup()` on confirmation. Root element is a `SafeAreaView` (`edges={['top']}`).
- **`AddEditEntryScreen.tsx`** — Shared form for both flows. Reads `route.params?.entryId`; if present, looks up the existing entry via `getEntryById` and pre-fills every field. Client-side checks (all fields present, numeric fields actually numeric) run before calling `addEntry`/`updateEntry`; a thrown validation error (from `odometerValidation`, surfaced through the context) is caught and shown as inline red text above the submit button.

### `src/components/`

- **`DateField.tsx` / `DateField.web.tsx`** — A labeled date-only field. The native version wraps `@react-native-community/datetimepicker`'s `<DateTimePicker>` behind a `Pressable` that toggles its visibility (spinner display on iOS, default on Android). The `.web.tsx` variant (which Metro picks automatically on web, since that library has no web build) renders a plain `<input type="date">` styled to match the theme.
- **`HistoryRow.tsx`** — One row in the History list: date, odometer/liters/price line, price-per-liter/distance/station line, and a mileage figure on the right (colored forest-green if present, muted "—" if not) with Edit/Delete text actions.
- **`ConfirmDialog.tsx`** — A custom `Modal`-based confirmation dialog (title, message, Cancel/Confirm buttons), used everywhere a destructive action needs confirmation. See "Known behaviors" for why this exists instead of `Alert.alert`.
- **`KpiTile.tsx`** — One Dashboard KPI card: a small icon chip (background = `accentColor` at ~8% alpha, via a `"14"` hex suffix — same technique the original web app used), an uppercase muted label, and a bold value.
- **`ScopeSelector.tsx`** — A horizontal scrollable row of chips: "All time" plus one chip per distinct month (descending), the active one filled forest-green.
- **`ChartEmptyState.tsx`** — A small dashed-border box with a centered message, reused by all 4 chart components for their respective empty states.
- **`MileageTrendChart.tsx`** — `react-native-gifted-charts` `LineChart` in area mode: forest-green line and gradient fill (35%→2% opacity), curved. Months with a null `avgMileageKmpl` are omitted from the data entirely rather than plotted as zero — since gifted-charts has no `connectNulls` flag, dropping the point makes the line connect straight across the gap to the next valid point, the same visual effect the original achieved differently.
- **`LastTwoMonthsCard.tsx`** — *Not* a chart-library component — hand-rolled `View`s, matching the original. Shows the two most recent months' mileage and spend, with a horizontal bar whose width is `min(100, avgMileageKmpl / 30 * 100)%` (so both months commonly hit 100% width if mileage exceeds the 30 km/L reference — that's the original's formula, not a bug).
- **`MonthComparisonChart.tsx`** — `react-native-gifted-charts` grouped `BarChart`: two bars per month (spend in terracotta, distance in blue) sharing one y-axis, exactly as the original did (flagged during research as a possibly-awkward design choice, but not one of the three named bugs, so left as-is). A hand-rolled legend row sits below the chart.
- **`FuelPriceTrendChart.tsx`** — `react-native-gifted-charts` `LineChart` (not area), terracotta, plotting `avgPricePerLiter` per month. Doesn't filter nulls (matching the original) because `avgPricePerLiter` can't actually be null for any month with at least one entry, given liters is always validated `> 0`.

### `src/export/exportService.ts`

`buildEntriesCsv(entries)` builds a CSV string (10 columns: date through notes, values properly quote-escaped) from a list of `EnrichedFuelEntry`. `exportEntriesAsCsv(entries)` writes it to a temp file via `expo-file-system`'s `File`/`Paths.cache` and shares it via `expo-sharing` (guarded by `Sharing.isAvailableAsync()`), after checking `assertFileSystemSupported()`.

### `src/backup/backupService.ts`

Full-fidelity JSON backup, separate from the CSV report above. `writeAndShareBackup(entries)` wraps the raw `FuelEntry[]` in a versioned envelope `{ version: 1, exportedAt, entries }`, writes it under a `backups/` subdirectory of `Paths.document`, and shares it. `pickAndReadBackup()` opens the system file picker (`File.pickFileAsync`), reads and JSON-parses the result, validates its shape with a type guard (`isBackupPayload`), and returns the entries stripped of `id`/`createdAt` (ready to feed into `FuelEntriesContext.importBackup`). Both are pure — no UI code; `SettingsScreen` handles the busy state, errors, and confirmation.

## Data model

Single SQLite table, `fuel_entries`:

| Column | Type | Notes |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | |
| `date` | `TEXT` | `YYYY-MM-DD`, always parsed/formatted as a local calendar date |
| `odometer_km` | `REAL` | |
| `liters` | `REAL` | always `> 0` (enforced) |
| `total_price_inr` | `REAL` | always `> 0` (enforced) |
| `station` | `TEXT` | optional, default `''` |
| `notes` | `TEXT` | optional, default `''` |
| `created_at` | `TEXT` | ISO timestamp, set once on insert, used as the tie-break for same-date entries |

No `vehicles` table — single vehicle is assumed everywhere (a v1 scope decision, not an oversight). Index on `(date, created_at)` matches the sort order used throughout the app.

## Known behaviors (read before changing the math)

**The odometer-sequencing fix.** The original prototype accepted a non-increasing odometer reading silently, then used that bad value as the baseline for the *next* entry's distance calculation — a cascading corruption bug. Here, `odometerValidation.ts` checks every create/edit against the entry's real chronological neighbors (by date) before anything is written, so a bad reading can never be persisted. This also means historical backfilling (inserting an older entry between two existing dates) is validated correctly against both real neighbors, not just the most recent entry.

**The `avgPricePerLiter` asymmetry.** This looks like a bug but is intentional and preserved from the original: `avgPricePerLiter` divides total spend by total liters across *every* entry in scope, while `avgMileageKmpl` and `avgCostPerKm` only use entries that have a computed distance (i.e., not the very first entry ever logged). If you're debugging "why don't these two ratios agree," this is why — don't "fix" it without checking `Project_Plan.md` first.

**Confirmation dialogs use a custom `Modal`, not `Alert.alert`/`window.confirm`.** Discovered during testing: react-native-web silently no-ops `Alert.alert`'s buttons, and `window.confirm` is suppressed in at least one sandboxed browser context this app was tested in. `ConfirmDialog.tsx` works identically on every platform and happens to also match the original prototype's own inline confirmation pattern more closely than a native popup would.

**Web platform notes.** `expo-sqlite` *does* work on web, but only because `metro.config.js` adds `.wasm` as a Metro asset extension and sets `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` response headers — both required by its `wa-sqlite` web backend. Without that config, the app fails to bundle for web at all. `expo-file-system`'s new File/Directory API, by contrast, has **no** web implementation whatsoever — `platformGuards.ts` turns that into a clear message rather than a raw internal error. Practically: `expo start --web` is a genuine, fully-functional testing surface for everything except export/backup/restore, which need an Android/iOS device or emulator via Expo Go.

**Status bar / safe area.** `DashboardScreen`, `HistoryScreen`, and `SettingsScreen` each draw their own header (a title plus, on Dashboard/History, a "+ Log refuel" button) because both the tab navigator (`MainTabs.tsx`) and the root stack (`AppNavigator.tsx`) run with `headerShown: false` for the tab group — nothing else inserts a status-bar-aware header for them. All three wrap their root element in `SafeAreaView` from `react-native-safe-area-context` with `edges={['top']}` (never `react-native`'s own `SafeAreaView`, which doesn't handle Android reliably) so content starts below the status bar without touching the status bar itself. Found and fixed after on-device Android testing surfaced the header — and critically, the "+ Log refuel" button — rendering under/behind the status bar, making the button unreliable to tap. `AddEditEntryScreen` never needed this: it's pushed with a real native-stack header (`headerShown` true for that one route), which insets correctly on its own.

## Status

All 5 build phases are complete (scaffold/DB/nav → add/edit/history/validation → analytics/KPIs → charts → export/backup/settings), plus one on-device fix since (the status-bar overlap above). Everything except export/backup/restore has been verified end-to-end via `expo start --web`; navigation, the "+ Log refuel" flow, and general look-and-feel have since been confirmed on a physical Android device via Expo Go too. Export/backup/restore, the native date picker, and `Alert.alert` paths still haven't been explicitly re-confirmed on-device. App icon/splash branding is still Expo's default template assets. See `Project_Plan.md` for the full build history and the out-of-scope backlog (multi-vehicle, predicted-refuel alerts, maintenance log).
