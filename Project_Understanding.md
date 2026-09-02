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
  format.ts                  — formatInr/formatNum (en-IN, "—" for null), shared by HistoryRow + Dashboard
  mileageEngine.ts           — chronologicalSort, computeEnrichedEntries (distance/mileage/price-per-
                              liter/cost-per-km), sortHistoryDescending, computeSummary (life-to-date or
                              month scope), computeMonthlyBreakdown, listDistinctMonthsDescending
  odometerValidation.ts      — validateFuelEntryInput: the odometer-sequencing fix (see Project_Plan.md)

src/context/
  FuelEntriesContext.tsx    — React Context + useReducer (LOADED/ADDED/UPDATED/REMOVED); addEntry/
                              updateEntry validate via odometerValidation before writing; exposes
                              enrichedEntries/historyEntries/monthlyBreakdown/distinctMonths and a
                              getSummary(month) selector, all memoized off the raw entries array

src/navigation/
  types.ts                 — RootStackParamList (MainTabs, AddEditEntry), MainTabParamList
                              (DashboardTab, HistoryTab, SettingsTab), typed screen-props aliases
  AppNavigator.tsx           — root native-stack: MainTabs + modal-presented AddEditEntry
  MainTabs.tsx               — bottom tabs: Dashboard / History / Settings

src/screens/
  DashboardScreen.tsx        — scope selector + 8 KPI tiles + all 4 charts, all wired to real data
  HistoryScreen.tsx           — full CRUD: list (newest-first), edit, delete (via ConfirmDialog)
  SettingsScreen.tsx          — placeholder; export/backup land in Phase 5
  AddEditEntryScreen.tsx      — shared add+edit form; inline validation error text on failure

src/components/
  DateField.tsx (+.web.tsx)   — date picker field; native uses @react-native-community/datetimepicker,
                              web uses a raw <input type="date"> (Metro resolves .web.tsx on web)
  HistoryRow.tsx              — one history list row (date/odometer/liters/price/mileage/actions)
  ConfirmDialog.tsx           — custom in-app confirm modal, used instead of Alert.alert/window.confirm
                              (see "Confirmation dialogs" below)
  KpiTile.tsx                 — one dashboard KPI card (icon chip at accentColor+"14" alpha, label, value)
  ScopeSelector.tsx            — horizontal chip row: "All time" + one chip per distinct month (descending)
  ChartEmptyState.tsx          — shared dashed-box empty-state message, used by all 4 chart components
  MileageTrendChart.tsx        — gifted-charts area LineChart, forest-green gradient fill
  LastTwoMonthsCard.tsx        — hand-rolled (not chart-lib) comparison of the 2 most recent months,
                              bar width normalized against LAST_TWO_MONTHS_REFERENCE_KMPL (30)
  MonthComparisonChart.tsx      — gifted-charts grouped BarChart (spend + distance per month, one shared
                              y-axis, matching the original), plus a hand-rolled legend row
  FuelPriceTrendChart.tsx       — gifted-charts LineChart, terracotta

All 4 chart components take `monthly: MonthlyBreakdownEntry[]` (always the context's all-time
`monthlyBreakdown`, never re-scoped by the Dashboard's month selector — confirmed by testing that
switching scope changes the KPI tiles but not the charts).

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

Phase 4 complete: all 4 dashboard charts built with `react-native-gifted-charts` (+ `react-native-svg` + `expo-linear-gradient`, the last needed at runtime for gradient fills though not an obvious direct dependency) and verified end-to-end against a 2-month, 4-entry fixture — mileage trend, last-2-months comparison, grouped spend/distance bars, and fuel price trend all rendering correct values, and confirmed to stay all-time regardless of the KPI scope selector. See `Project_Plan.md` for what's next (Phase 5: export, backup, settings).
