# Mileage Tracker — Codebase Understanding

Standalone Expo/React Native app (SDK 57, TypeScript strict, no backend). Local-only persistence via `expo-sqlite`. See `Project_Plan.md` for the full rebuild rationale and phased build order.

## Layout

```
App.tsx                — font loading (Work Sans + IBM Plex Sans) + DB warm-up behind a splash
                          gate, wraps SafeAreaProvider > FuelEntriesProvider > NavigationContainer
index.ts                — registerRootComponent(App)
metro.config.js         — adds .wasm as an asset ext + COOP/COEP headers, required for
                          expo-sqlite's web (wa-sqlite) target to bundle and run at all

src/constants/
  theme.ts               — colors/fonts/radii/spacing tokens (single source of truth)
  analytics.ts            — chart/KPI color map, LAST_TWO_MONTHS_REFERENCE_KMPL

src/types/
  fuelEntry.ts             — FuelEntry, FuelEntryInput, EnrichedFuelEntry
  analytics.ts             — SummaryStats, MonthlyBreakdownEntry

src/db/
  database.ts              — singleton getDatabase(); creates fuel_entries table (WAL mode) on first open
  fuelEntryRepository.ts    — CRUD only, no business rules: listAll/getById/create/update/remove

src/utils/
  dateFormat.ts             — local-safe date-fns parse/format (fixes the original's UTC off-by-one)
  mileageEngine.ts           — chronologicalSort, computeEnrichedEntries (distance/mileage/price-per-
                              liter/cost-per-km), sortHistoryDescending
  odometerValidation.ts      — validateFuelEntryInput: the odometer-sequencing fix (see Project_Plan.md)

src/context/
  FuelEntriesContext.tsx    — React Context + useReducer (LOADED/ADDED/UPDATED/REMOVED); addEntry/
                              updateEntry validate via odometerValidation before writing; exposes
                              enrichedEntries (ascending) and historyEntries (descending) selectors

src/navigation/
  types.ts                 — RootStackParamList (MainTabs, AddEditEntry), MainTabParamList
                              (DashboardTab, HistoryTab, SettingsTab), typed screen-props aliases
  AppNavigator.tsx           — root native-stack: MainTabs + modal-presented AddEditEntry
  MainTabs.tsx               — bottom tabs: Dashboard / History / Settings

src/screens/
  DashboardScreen.tsx        — placeholder text + "+ Log refuel" entry point; KPIs/charts land in Phases 3-4
  HistoryScreen.tsx           — full CRUD: list (newest-first), edit, delete (via ConfirmDialog)
  SettingsScreen.tsx          — placeholder; export/backup land in Phase 5
  AddEditEntryScreen.tsx      — shared add+edit form; inline validation error text on failure

src/components/
  DateField.tsx (+.web.tsx)   — date picker field; native uses @react-native-community/datetimepicker,
                              web uses a raw <input type="date"> (Metro resolves .web.tsx on web)
  HistoryRow.tsx              — one history list row (date/odometer/liters/price/mileage/actions)
  ConfirmDialog.tsx           — custom in-app confirm modal, used instead of Alert.alert/window.confirm
                              (see "Confirmation dialogs" below)

reference/legacy-prototype/  — the original FastAPI+MongoDB+React web prototype this app replaces,
                              kept for logic reference only, never executed
```

## Data model

`fuel_entries` table: `id, date (YYYY-MM-DD text), odometer_km, liters, total_price_inr, station, notes, created_at`. No vehicle table — single vehicle assumed throughout (v1 scope decision).

## Conventions

- Repository layer is pure CRUD; business rules (mileage formulas, odometer-sequencing validation) live in `src/utils/` and are called from `FuelEntriesContext`, not from the repository or the DB layer.
- All dates are parsed/formatted as local calendar dates (never `new Date(dateOnlyString)`, which parses as UTC and can shift a day depending on timezone) — see `src/utils/dateFormat.ts`.
- Chronological ordering for all mileage math is `(date, createdAt)` ascending — same tie-break rule used everywhere entries need sorting.

## Confirmation dialogs

Destructive actions (currently just delete) use the custom `src/components/ConfirmDialog.tsx` modal, not `Alert.alert` or `window.confirm`. Discovered during Phase 2 testing: react-native-web doesn't act on `Alert.alert`'s buttons at all (silent no-op), and `window.confirm` is suppressed by at least one sandboxed browser context this app was tested in. A custom in-app modal works identically everywhere and is closer to the original prototype's own inline `AlertDialog` confirmation anyway (not a native browser popup).

## Known formula asymmetry (intentional, preserved from the original)

`avgPricePerLiter` is computed from **all** entries in a scope (spend ÷ liters), while `avgMileageKmpl` and `avgCostPerKm` are computed only from entries that have a computed distance (i.e., excluding the very first entry, or any entry whose odometer was rejected before the validation fix). This asymmetry is preserved for numeric consistency with the original prototype's dashboard.

## Status

Phase 2 complete: add/edit/delete fully wired to SQLite, odometer-sequencing validation confirmed working (rejects a decreasing/conflicting reading on both create and edit), mileage/distance/price-per-liter/cost-per-km all compute correctly, History lists newest-first. Verified end-to-end via `expo start --web`. See `Project_Plan.md` for what's next (Phase 3: analytics engine + Dashboard KPIs).
