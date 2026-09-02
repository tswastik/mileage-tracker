# Mileage Tracker — Codebase Understanding

Standalone Expo/React Native app (SDK 57, TypeScript strict, no backend). Local-only persistence via `expo-sqlite`. See `Project_Plan.md` for the full rebuild rationale and phased build order.

## Layout

```
App.tsx                — font loading (Work Sans + IBM Plex Sans) + DB warm-up behind a splash
                          gate, wraps SafeAreaProvider > FuelEntriesProvider > NavigationContainer
index.ts                — registerRootComponent(App)

src/constants/
  theme.ts               — colors/fonts/radii/spacing tokens (single source of truth)
  analytics.ts            — chart/KPI color map, LAST_TWO_MONTHS_REFERENCE_KMPL

src/types/
  fuelEntry.ts             — FuelEntry, FuelEntryInput, EnrichedFuelEntry
  analytics.ts             — SummaryStats, MonthlyBreakdownEntry

src/db/
  database.ts              — singleton getDatabase(); creates fuel_entries table (WAL mode) on first open
  fuelEntryRepository.ts    — CRUD only, no business rules: listAll/getById/create/update/remove

src/context/
  FuelEntriesContext.tsx    — React Context + useReducer; currently loads entries on mount
                              (LOADED action only). CRUD/validation wiring lands in Phase 2.

src/navigation/
  types.ts                 — RootStackParamList (MainTabs, AddEditEntry), MainTabParamList
                              (DashboardTab, HistoryTab, SettingsTab), typed screen-props aliases
  AppNavigator.tsx           — root native-stack: MainTabs + modal-presented AddEditEntry
  MainTabs.tsx               — bottom tabs: Dashboard / History / Settings

src/screens/
  DashboardScreen.tsx, HistoryScreen.tsx, SettingsScreen.tsx, AddEditEntryScreen.tsx
                              — placeholders as of Phase 1; real content lands in Phases 2-5

reference/legacy-prototype/  — the original FastAPI+MongoDB+React web prototype this app replaces,
                              kept for logic reference only, never executed
```

## Data model

`fuel_entries` table: `id, date (YYYY-MM-DD text), odometer_km, liters, total_price_inr, station, notes, created_at`. No vehicle table — single vehicle assumed throughout (v1 scope decision).

## Conventions

- Repository layer is pure CRUD; business rules (mileage formulas, odometer-sequencing validation) live in `src/utils/` and are called from `FuelEntriesContext`, not from the repository or the DB layer.
- All dates are parsed/formatted as local calendar dates (never `new Date(dateOnlyString)`, which parses as UTC and can shift a day depending on timezone) — see `src/utils/dateFormat.ts` once it lands in Phase 2.
- Chronological ordering for all mileage math is `(date, createdAt)` ascending — same tie-break rule used everywhere entries need sorting.

## Known formula asymmetry (intentional, preserved from the original)

`avgPricePerLiter` is computed from **all** entries in a scope (spend ÷ liters), while `avgMileageKmpl` and `avgCostPerKm` are computed only from entries that have a computed distance (i.e., excluding the very first entry, or any entry whose odometer was rejected before the validation fix). This asymmetry is preserved for numeric consistency with the original prototype's dashboard.

## Status

Phase 1 complete: project scaffolded, SQLite table creates on boot, navigation shell (3 tabs + modal add/edit screen) renders with placeholder content, theme/font system in place. See `Project_Plan.md` for what's next.
