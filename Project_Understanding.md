# Mileage Tracker — Codebase Understanding

A standalone Expo/React Native mobile app (SDK 57, TypeScript strict) for logging petrol fill-ups and tracking mileage across one or more vehicles. Single user, no auth, no backend — everything lives in a local SQLite database on the device. It's a rebuild of an older FastAPI+MongoDB+React web prototype (preserved under `reference/legacy-prototype/`); see `Project_Plan.md` for the full rebuild rationale, the bugs that were deliberately fixed, and the phased build history.

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
    fuelEntry.ts              FuelEntry, FuelEntryInput, FuelEntryRecord, EnrichedFuelEntry, RestorePayload
    vehicle.ts                 Vehicle, VehicleInput, VehicleType
    trip.ts                     Trip, TripCheckpoint, StartTripInput, CheckpointInput, TripSummary,
                                FuelType, TripStatus, CheckpointKind
    analytics.ts                SummaryStats, MonthlyBreakdownEntry

  constants/                — static values, no logic
    theme.ts                  color/font/radius/spacing design tokens
    analytics.ts                KPI/chart color map, the 30 km/L reference constant
    vehicles.ts                 vehicle type → icon/label maps
    fuel.ts                     trip fuel type → icon/label maps (petrol/diesel)

  db/                       — SQLite access, no business rules
    database.ts                singleton DB connection + schema + the multi-vehicle migration
    fuelEntryRepository.ts      CRUD functions over the fuel_entries table
    vehicleRepository.ts         CRUD functions over the vehicles table
    settingsRepository.ts        get/set for the app_settings key-value table (currently just
                                the selected vehicle id)
    tripRepository.ts             CRUD functions over the trips table
    tripCheckpointRepository.ts    CRUD functions over the trip_checkpoints table

  utils/                    — pure functions: business logic and formatting
    dateFormat.ts              local-safe date parsing/formatting, plus full-datetime helpers
    format.ts                   number/currency display formatting
    mileageEngine.ts             all the mileage/analytics math (regular fuel log)
    odometerValidation.ts        the odometer-sequencing validation fix (regular fuel log)
    tripEngine.ts                 trip checkpoint validation + trip summary math (fully separate
                                from mileageEngine.ts/odometerValidation.ts — see below)
    platformGuards.ts            web-vs-native capability checks

  context/
    FuelEntriesContext.tsx     the app's single source of truth for fuel entries + vehicles:
                                state + CRUD + selectors
    TripsContext.tsx             separate source of truth for trips + checkpoints; reads
                                selectedVehicleId from FuelEntriesContext to scope by vehicle,
                                but never touches fuel_entries

  navigation/
    types.ts                   typed route/param definitions
    AppNavigator.tsx             root stack navigator
    MainTabs.tsx                 bottom tab navigator (5 tabs)

  screens/                  — one file per screen, wired to the context
    DashboardScreen.tsx
    HistoryScreen.tsx
    TripsScreen.tsx
    FuelCostCalculatorScreen.tsx
    SettingsScreen.tsx
    AddEditEntryScreen.tsx
    TripDetailScreen.tsx

  components/               — reusable presentational pieces
    DateField.tsx (+.web.tsx)
    DateTimeField.tsx (+.web.tsx)
    HistoryRow.tsx
    ConfirmDialog.tsx
    KpiTile.tsx
    ScopeSelector.tsx
    VehicleSelector.tsx
    AddVehicleDialog.tsx
    EmptyVehiclesPrompt.tsx
    StartTripDialog.tsx
    AddCheckpointDialog.tsx
    ChartEmptyState.tsx
    MileageTrendChart.tsx
    LastTwoMonthsCard.tsx
    MonthComparisonChart.tsx
    FuelPriceTrendChart.tsx

  export/
    exportService.ts           CSV export (scoped to whichever vehicle is selected)

  backup/
    backupService.ts            JSON backup/restore (covers every vehicle; trips are not
                                included — see "Known behaviors" below)

reference/legacy-prototype/  — the original web prototype, kept for logic reference, never executed
```

## Architecture: how data flows

```
SQLite (vehicles table, fuel_entries table, app_settings table)
    │  raw CRUD, snake_case rows
    ▼
vehicleRepository.ts / fuelEntryRepository.ts / settingsRepository.ts
    │  Vehicle[] / FuelEntry[] (camelCase domain objects)
    ▼
FuelEntriesContext  ──►  filters to vehicleEntries = entries for the selected vehicle only,
    │                     then runs mileageEngine over JUST that vehicle's entries:
    │                     - enrichedEntries   (chronological, with computed distance/mileage/etc.)
    │                     - historyEntries    (same, newest-first, for the History screen)
    │                     - monthlyBreakdown  (per-month aggregates, for the charts)
    │                     - distinctMonths    (for the scope selector)
    │                     - getSummary(month) (KPI numbers for a given scope)
    ▼
Screens (Dashboard / History / Calculator / Settings / AddEditEntry)
    │  read via useFuelEntries(), never touch the repository or SQLite directly
    ▼
Components (KpiTile, HistoryRow, VehicleSelector, the 4 charts, etc.) — purely presentational,
    take data as props (except FuelCostCalculatorScreen, which has no context dependency at all)
```

A second, fully independent pipeline runs alongside the one above for trips:

```
SQLite (trips table, trip_checkpoints table)
    │  raw CRUD, snake_case rows
    ▼
tripRepository.ts / tripCheckpointRepository.ts
    │  Trip[] / TripCheckpoint[] (camelCase domain objects)
    ▼
TripsContext  ──►  reads selectedVehicleId FROM FuelEntriesContext (its only coupling to it) to
    │               compute vehicleTrips, then runs tripEngine over just that vehicle's trips:
    │               - activeTrip / closedTrips
    │               - getCheckpoints(tripId) / getSummary(tripId) (via computeTripSummary)
    ▼
TripsScreen / TripDetailScreen
    │  read via useTrips(), never touch fuel_entries, mileageEngine, or FuelEntriesContext's
    │  mutating methods (addEntry/updateEntry/etc.) at all
    ▼
Components (StartTripDialog, AddCheckpointDialog, DateTimeField, the reused KpiTile)
```

Four invariants worth knowing:
- **The repository never runs business logic.** Mileage math and odometer validation live in `src/utils/` and are called from the context, not the DB layer. `fuelEntryRepository.ts`/`vehicleRepository.ts`/`tripRepository.ts`/`tripCheckpointRepository.ts` are all dumb CRUD.
- **Charts always read `monthlyBreakdown`, never a scoped summary.** The Dashboard's month/life-to-date selector only changes the 8 KPI tiles; the 4 charts always show full history for the selected vehicle. This was verified by testing, not just intended.
- **Every vehicle has its own independent odometer sequence, and nothing is ever allowed to compare across vehicles.** `FuelEntriesContext` filters `entries` down to `vehicleEntries` (the selected vehicle only) *before* handing anything to `mileageEngine` or `odometerValidation`. Get this filtering wrong anywhere and distances/mileage would silently mix two vehicles' odometers into nonsense numbers — this was the single biggest risk when multi-vehicle support was added, and was specifically tested for (see `Project_Plan.md`'s Phase 6 verification note).
- **Trips are fully separate from the regular fuel log, by deliberate design, not an oversight.** `TripsContext` never calls `FuelEntriesContext.addEntry` and never writes to `fuel_entries`; a trip's fuel purchases (mid-trip top-ups and the end-of-trip refuel) live only in `trip_checkpoints` and never appear on the Dashboard/History/exports for the regular fuel log. This was a deliberate choice confirmed with the user (not assumed), and specifically verified: after completing a full trip with real fuel purchases logged at its stops, the Dashboard for that same vehicle still showed zero refuels and ₹0 spent. See "Known behaviors" below.

## Module-by-module reference

### Root files

- **`App.tsx`** — Loads Work Sans + IBM Plex Sans via `@expo-google-fonts/*`, and separately "warms up" the database (`getDatabase()`) so the schema (and the multi-vehicle migration) has run before any screen renders. Both gate the native splash screen (`expo-splash-screen`), which only hides once fonts are loaded *and* the DB is ready; until then, renders a local `LoadingScreen` (icon + app name) instead of `null` — see "Icon/splash branding" below for why. Once ready, renders `SafeAreaProvider > FuelEntriesProvider > NavigationContainer > AppNavigator`.
- **`index.ts`** — Standard Expo entry point, unmodified from the template (`registerRootComponent(App)`).
- **`app.json`** — App name "Mileage Tracker", Android package `com.tswastik.mileagetracker`, `userInterfaceStyle: light`. Custom branding (see "Icon/splash branding" below): `icon.png`, `android-icon-foreground.png` + a flat `adaptiveIcon.backgroundColor`, `favicon.png`, and `splash-icon.png` wired into the `expo-splash-screen` plugin's own config object (not the legacy top-level `splash` key). `plugins` lists only what's actually used: `expo-sqlite`, the community date-time-picker, `expo-sharing`, `expo-font`, `expo-splash-screen`.
- **`metro.config.js`** — See "Web platform notes" below; without this, `expo-sqlite` fails to bundle for web at all.
- **`eas.json`** — Minimal: just a `development` build profile (internal distribution, Android APK). No preview/production profiles set up yet.

### `src/types/` — domain types

- **`fuelEntry.ts`**
  - `FuelEntry` — one row's worth of data as the app uses it: `id, vehicleId, date, odometerKm, liters, totalPriceInr, station, notes, createdAt`.
  - `FuelEntryInput` — `Omit<FuelEntry, 'id' | 'createdAt' | 'vehicleId'>`, i.e. exactly what the Add/Edit form submits. The vehicle is never chosen per-entry in the UI — it's implied by whichever vehicle is currently selected — so it's deliberately not part of this type.
  - `FuelEntryRecord` — `Omit<FuelEntry, 'id' | 'createdAt'>`, i.e. a `FuelEntryInput` stamped with `vehicleId`. This is what the repository's `create`/`update` actually persist; the context is responsible for turning an `Input` into a `Record` by adding the vehicle id.
  - `EnrichedFuelEntry` — a `FuelEntry` plus the four computed fields: `distanceKm`, `mileageKmpl`, `pricePerLiter`, `costPerKm` (each `number | null`).
  - `RestorePayload` — the shape `FuelEntriesContext.importBackup` consumes: `{ vehicles: VehicleInput[], entries: Array<FuelEntryInput & { vehicleIndex: number }> }`. Entries reference which vehicle they belong to by *position* in the `vehicles` array, not by any id from the backup file — those ids stop meaning anything once everything is recreated fresh on restore. `backupService.ts` is responsible for producing this shape from a raw backup file.
- **`vehicle.ts`**
  - `VehicleType` — `'two_wheeler' | 'four_wheeler'`.
  - `Vehicle` — `{ id, name, type, createdAt }`.
  - `VehicleInput` — `Omit<Vehicle, 'id' | 'createdAt'>`.
- **`analytics.ts`**
  - `SummaryStats` — the shape of one scope's (life-to-date or one month's) KPI numbers: `scope` (display label), `totalSpent`, `totalLiters`, `totalDistanceKm`, `avgMileageKmpl`, `avgCostPerKm`, `avgPricePerLiter`, `entryCount`.
  - `MonthlyBreakdownEntry` — the same shape minus `avgCostPerKm` and with `scope` replaced by `month` (`"YYYY-MM"`) — this is what feeds every chart.
- **`trip.ts`**
  - `FuelType` — `'petrol' | 'diesel'`. `TripStatus` — `'active' | 'closed'`. `CheckpointKind` — `'start' | 'waypoint' | 'end'`.
  - `Trip` — `{ id, vehicleId, fuelType, status, createdAt, closedAt }` (`closedAt: string | null`, set once when the trip is ended).
  - `TripCheckpoint` — `{ id, tripId, kind, dateTime, odometerKm, location, liters, costInr, createdAt }` (`liters`/`costInr` are `number | null` — a plain waypoint with no refuel leaves both null).
  - `StartTripInput` — `{ fuelType, dateTime, odometerKm, location }`, what `StartTripDialog` submits.
  - `CheckpointInput` — `{ dateTime, odometerKm, location, liters, costInr }`, what `AddCheckpointDialog` submits for both a mid-trip stop and the end-of-trip checkpoint.
  - `TripSummary` — `{ totalDistanceKm, totalLiters, totalCost, tripMileageKmpl, costPerKm, pricePerLiter }`, all `number | null` except the two totals — the shape `computeTripSummary` returns and `TripDetailScreen`'s KPI tiles read.

### `src/constants/` — static tokens

- **`theme.ts`** — the single source of truth for colors, fonts, corner radii, and spacing. Colors follow the original prototype's "Organic & Earthy" palette: `background` (bone white `#F9F8F6`), `textPrimary`/`textMuted`, `border`, `forestGreen` (primary/brand), `terracotta` (secondary accent), `blue` (tertiary accent), plus hover variants. `fonts` maps semantic names (`heading`, `headingBold`, `body`, `bodyMedium`, `bodySemiBold`) to the actual loaded font family strings. Every screen and component imports from here rather than hardcoding hex values or font names.
- **`analytics.ts`** — `LAST_TWO_MONTHS_REFERENCE_KMPL = 30` (the fixed reference the last-2-months bar width is normalized against) and `kpiColors`, mapping each of the 8 KPI tiles to one of the theme's accent colors.
- **`vehicles.ts`** — `VEHICLE_TYPE_ICON` (🏍️/🚗) and `VEHICLE_TYPE_LABEL` ("Two-wheeler"/"Four-wheeler"), keyed by `VehicleType`. Used by `VehicleSelector`, `AddVehicleDialog`, `AddEditEntryScreen`'s vehicle badge, and `SettingsScreen`'s vehicle list.
- **`fuel.ts`** — `FUEL_TYPE_ICON` (⛽ petrol / 🛢️ diesel) and `FUEL_TYPE_LABEL` ("Petrol"/"Diesel"), keyed by `FuelType`. Used by `StartTripDialog`'s fuel-type toggle and the fuel-type badge on `TripsScreen`/`TripDetailScreen`. Deliberately its own file rather than added to `vehicles.ts` — it's a trip concept, not a vehicle one.

### `src/db/` — SQLite access layer

- **`database.ts`** — Exposes one function, `getDatabase()`, which lazily opens `mileage-tracker.db` via `expo-sqlite`'s `openDatabaseAsync`, runs the base schema (`fuel_entries`, `vehicles`, `app_settings` tables, `PRAGMA journal_mode = WAL`), and then runs `migrateVehicleSupport()`. That migration is additive and idempotent, safe to run on every boot (this app has no versioned migration framework — see `Project_Plan.md`):
  1. Checks `PRAGMA table_info(fuel_entries)` for a `vehicle_id` column; adds it via `ALTER TABLE` only if missing.
  2. Counts `fuel_entries` rows with `vehicle_id IS NULL`. If there are none, **stops here** — a genuinely fresh install gets no auto-created vehicle at all.
  3. If there *are* orphaned rows (real pre-multi-vehicle data on this device), reuses the first existing vehicle as a fallback, or — only in this branch — creates one default vehicle ("My Vehicle", four-wheeler) to hold them, then backfills every orphaned row onto it.
  This is how a device with real pre-multi-vehicle data (dates, odometers, everything) gets a working default vehicle with zero data loss, entirely automatically — without silently naming a vehicle on behalf of a brand new user who has no existing data to rescue. The whole `dbPromise` (schema + migration) is memoized at module scope, so every caller shares one connection and this only actually runs once per process.
- **`fuelEntryRepository.ts`** — The only file that writes raw SQL for fuel entries. A private `FuelEntryRow` interface mirrors the table's snake_case columns (including `vehicle_id`); `rowToFuelEntry()` maps a row to the camelCase `FuelEntry` type. Exposes `listAll()` (every vehicle's entries, ascending by date/created_at — filtering to one vehicle is the context's job, not this layer's), `getById(id)`, `create(input: FuelEntryRecord)`, `update(id, input: FuelEntryRecord)`, `remove(id)`. No validation, no mileage math, no vehicle-scoping — purely persistence.
- **`vehicleRepository.ts`** — `listAll()` (ascending by id), `create(input: VehicleInput)`, `remove(id)`. Same dumb-CRUD philosophy; the "can't delete a vehicle with entries" rule lives in the context, not here.
- **`settingsRepository.ts`** — A thin wrapper over the generic `app_settings` key-value table: `getSelectedVehicleId()` / `setSelectedVehicleId(id)`. Deliberately generic (a `key`/`value` table, not a bespoke single-purpose one) so future settings don't need their own table each.
- **`tripRepository.ts`** — `listAll()` (every vehicle's trips, ascending by `created_at`; vehicle-scoping is `TripsContext`'s job, same split as `fuelEntryRepository.ts`), `create(vehicleId, fuelType)` (inserts with `status: 'active'`, `closedAt: null`), `close(id)` (sets `status: 'closed'` and `closed_at` to now, returns the new `closedAt` string), `remove(id)`. A private `TripRow` interface + `rowToTrip()` mirror the same snake_case-row-to-camelCase-domain-object pattern as `fuelEntryRepository.ts`.
- **`tripCheckpointRepository.ts`** — `listAll()` (every trip's checkpoints, ascending by `date_time` then `id` — the tie-break matters because a mid-trip stop and its own `created_at` can share a timestamp with rapid manual entry), `create(tripId, kind, input: CheckpointInput)`, `removeForTrip(tripId)` (bulk-deletes every checkpoint belonging to one trip; used only by `cancelTrip`, never by `close`, since a closed trip's checkpoints are its permanent record). Same dumb-CRUD philosophy — validation lives in `tripEngine.ts`/`TripsContext`.

### `src/utils/` — business logic and formatting

- **`dateFormat.ts`** — All date handling funnels through here, using `date-fns`'s `parseISO`/`format` instead of the JS `Date` constructor on a bare `"YYYY-MM-DD"` string (which parses as UTC and can display the wrong day depending on the device's timezone — a real bug in the original prototype). Exports `todayLocalISODate()`, `formatDisplayDate()` (`"dd MMM yyyy"`), `formatMonthLabel()` (`"YYYY-MM"` → `"MMM yyyy"`), `toDateOnlyString(date)`, and `parseDateOnly(iso)`.
- **`format.ts`** — Two number-formatting helpers shared by `HistoryRow`, the Dashboard, and the calculator: `formatInr(n)` (`"₹1,234"`, or `"—"` for null/NaN) and `formatNum(n, suffix, decimals)` (locale-formatted with an optional suffix, same null handling). Both use `en-IN` locale formatting (Indian digit grouping) with no minimum fraction digits, matching the original.
- **`mileageEngine.ts`** — The core analytics module. Every function here is vehicle-agnostic on purpose — it just operates on whatever entry list it's handed — and it's the *caller's* job (always `FuelEntriesContext`) to pass in only one vehicle's entries. In order of what's in the file:
  - `chronologicalSort(entries)` — generic sort by `(date, createdAt)` ascending; this exact ordering rule is used everywhere entries need to be sequenced.
  - `computeEnrichedEntries(entries)` — the heart of the app. Walks the chronologically-sorted list once, tracking the previous entry's odometer reading, and computes each entry's `distanceKm`, `mileageKmpl`, `pricePerLiter`, `costPerKm` (all null-guarded — the first entry has no distance baseline, and every division checks its denominator is `> 0` first). Distance/mileage assume this entry's odometer is `>` the previous one, which is now always true because `odometerValidation.ts` enforces it at write time.
  - `sortHistoryDescending(entries)` — re-sorts an already-enriched list newest-first, for the History screen.
  - `computeSummary(enriched, month)` — the KPI numbers for one scope (`month = null` means life-to-date). Filters the *already-enriched* list by `date.startsWith(month)` — meaning scope filtering happens after the global chronological mileage computation, so a month's first entry can still carry a valid distance computed against the previous month's last entry. Reproduces the original's deliberate formula asymmetry: `totalSpent`/`totalLiters`/`entryCount` use every entry in scope, `avgMileageKmpl`/`avgCostPerKm` use only the subset with a computed distance, and `avgPricePerLiter` uses the all-entries totals (not the distance-having subset) — see "Known behaviors" below.
  - `computeMonthlyBreakdown(enriched)` — calls `computeSummary` once per distinct month (ascending), for the charts.
  - `listDistinctMonthsDescending(enriched)` — feeds the `ScopeSelector` dropdown/chip list.
- **`odometerValidation.ts`** — `validateFuelEntryInput(input, allEntries, editingId?)`. Field checks (`liters > 0`, `totalPriceInr > 0`, `odometerKm >= 0`), then finds the input's true chronological neighbors within `allEntries` (excluding the entry being edited, if any) and rejects unless `odometerKm` falls between the previous entry's and next entry's odometer readings. Doesn't know about vehicles at all — the caller must pass only the relevant vehicle's entries as `allEntries`, or this silently validates against the wrong vehicle's odometers. This is the fix for the original's cascading-corruption bug — see "Known behaviors" below.
- **`platformGuards.ts`** — `assertFileSystemSupported()`, called at the top of every export/backup function. `expo-file-system`'s new File/Directory API has no web implementation at all; this throws a clear, actionable error ("...need a phone or emulator...") instead of letting an internal error like `this.validatePath is not a function` reach the user.
- **`tripEngine.ts`** — The trip counterpart to `mileageEngine.ts`/`odometerValidation.ts`, and completely independent of both (no shared code, no shared state) — see "Known behaviors" below for why they're kept separate rather than unified.
  - `validateCheckpointInput(input, previousCheckpoint)` — rejects a negative odometer reading; rejects an odometer reading lower than the immediately previous checkpoint's (named in the error message); requires `liters` and `costInr` to be supplied together or both left blank (never just one); requires both to be `> 0` when supplied. Unlike `odometerValidation.ts`, this only ever checks against the single *previous* checkpoint — a trip's checkpoints are entered strictly in order as the trip happens, so there's no backfilling-between-two-dates case to handle.
  - `computeTripSummary(checkpoints)` — takes a trip's checkpoints (chronological) and returns a `TripSummary`. Distance is `latest.odometerKm - start.odometerKm` (null if not positive); `totalLiters`/`totalCost` sum every checkpoint's `liters`/`costInr` (nulls treated as 0); `tripMileageKmpl = distance / totalLiters`, `costPerKm = totalCost / distance`, `pricePerLiter = totalCost / totalLiters` (each null-guarded on its denominator). Deliberately uses whichever checkpoint is *last* in the array, not specifically one with `kind === 'end'` — this is what lets an **active** (not yet closed) trip show a live, always-correct "distance so far" using the exact same formula a closed trip's final summary uses, rather than needing a separate in-progress code path.

### `src/context/FuelEntriesContext.tsx` — application state

A single React Context + `useReducer`, provided once at the app root (`FuelEntriesProvider` in `App.tsx`) and consumed everywhere via the `useFuelEntries()` hook. This is the *only* place screens should get or mutate fuel-entry or vehicle data — no screen calls a repository or `mileageEngine` directly.

- **State**: `{ vehicles: Vehicle[], entries: FuelEntry[] (every vehicle's), selectedVehicleId: number | null, loading: boolean }`.
- **Reducer actions**: `LOADED`/`RESTORED` (full replace of vehicles+entries+selection — used on initial mount and after a backup restore), `ENTRY_ADDED`/`ENTRY_UPDATED`/`ENTRY_REMOVED`, `VEHICLE_ADDED` (also selects the new vehicle), `VEHICLE_REMOVED` (falls back to another vehicle if the removed one was selected), `VEHICLE_SELECTED`.
- **On mount**: loads vehicles, all entries, and the persisted selected-vehicle-id (from `settingsRepository`) together. If the persisted id doesn't match any loaded vehicle (e.g. it was deleted in a previous session), falls back to the first vehicle.
- **`vehicleEntries`** (internal, memoized) — `entries.filter(e => e.vehicleId === selectedVehicleId)`. Every derived value below is computed from this, never from the raw `entries`.
- **Mutating methods**:
  - `addEntry`/`updateEntry` — stamp the entry with the correct vehicle id (`selectedVehicleId` for a new entry; the *existing* entry's own `vehicleId` for an edit, so an edit can never silently move an entry to a different vehicle), validate against `vehicleEntries`/same-vehicle entries only, then write. Throw a plain `Error` on failure so callers can `try/catch` and show it inline.
  - `deleteEntry` — unchanged from before multi-vehicle support.
  - `selectVehicle(id)` — updates state and persists the choice via `settingsRepository`.
  - `addVehicle(input)` — creates it, auto-selects it (so adding a vehicle immediately switches to logging for it), and persists the selection.
  - `deleteVehicle(id)` — refuses (throws) if that vehicle has *any* entries — no cascade-delete, ever. If the deleted vehicle was selected, falls back to another vehicle (or `null` if none remain) and persists that.
  - `importBackup(payload: RestorePayload)` — the most involved method. Every vehicle's entries are validated **independently**, as their own odometer sequence, against an in-memory accumulator only — no DB writes happen during validation. Only once the *entire* backup (every vehicle) is confirmed valid does it delete every existing entry and vehicle and recreate everything from the payload, then select the first restored vehicle. A corrupt or hand-edited backup can never leave the database half-cleared.
- **Derived/memoized values**, all recomputed only when `vehicleEntries` changes: `enrichedEntries`, `historyEntries`, `monthlyBreakdown`, `distinctMonths`, and the `getSummary(month)` selector function. Also exposes `vehicles`, `selectedVehicleId`, and `selectedVehicle` (the resolved `Vehicle` object, or `undefined`) directly.

### `src/context/TripsContext.tsx` — trip state

A second, independent React Context + `useReducer`, nested inside `FuelEntriesProvider` in `App.tsx` (so `useFuelEntries()` is available to it) and consumed via `useTrips()`. Its *only* dependency on `FuelEntriesContext` is reading `selectedVehicleId` to scope trips by vehicle — it never calls any of `FuelEntriesContext`'s mutating methods and never reads/writes `fuel_entries`.

- **State**: `{ trips: Trip[] (every vehicle's), checkpoints: TripCheckpoint[] (every trip's), loading: boolean }`.
- **Reducer actions**: `LOADED` (initial full load), `TRIP_STARTED` (appends the new trip + its start checkpoint), `CHECKPOINT_ADDED` (appends a waypoint), `TRIP_CLOSED` (marks a trip closed, appends its end checkpoint), `TRIP_CANCELED` (removes a trip and all its checkpoints from state).
- **On mount**: loads every trip and every checkpoint together via one `Promise.all`.
- **Derived (memoized)**: `vehicleTrips` (`trips` filtered to `selectedVehicleId`), `activeTrip` (the one `vehicleTrips` entry with `status === 'active'`, or `undefined` — there can only ever be one per vehicle, enforced by `startTrip` below), `closedTrips` (the rest, sorted newest-closed-first).
- **`getCheckpoints(tripId)` / `getSummary(tripId)`** — selector functions (not raw state) so screens ask for exactly the trip they're rendering; `getSummary` calls `computeTripSummary` from `tripEngine.ts`.
- **Mutating methods**, each throwing a plain `Error` on a business-rule violation so the calling dialog can catch and display it inline:
  - `startTrip(input)` — refuses if no vehicle is selected, refuses if the vehicle already has an active trip (one trip at a time per vehicle), refuses a negative odometer reading. Creates the `Trip` row then its `start` checkpoint.
  - `addCheckpoint(tripId, input)` — validates against the trip's own last checkpoint via `validateCheckpointInput`, then inserts a `waypoint` checkpoint.
  - `endTrip(tripId, input)` — requires both `liters` and `costInr` to be present (a trip can't be closed without recording the refuel that ends it), validates the same way as `addCheckpoint`, inserts an `end` checkpoint, then calls `tripRepository.close`.
  - `cancelTrip(tripId)` — only allowed while the trip has just its start checkpoint (`checkpoints.length <= 1`); otherwise throws, directing the user to end the trip instead. Deletes the trip and its checkpoint(s) outright — this is the one place trip data is ever hard-deleted, and only for a trip that never really got underway.

### `src/navigation/`

- **`types.ts`** — `RootStackParamList` (`MainTabs`, `AddEditEntry: { entryId?: number }`, `TripDetail: { tripId: number }`), `MainTabParamList` (`DashboardTab`, `HistoryTab`, `TripsTab`, `CalculatorTab`, `SettingsTab`), and typed prop aliases (`DashboardTabScreenProps`, `TripsTabScreenProps`, `TripDetailScreenProps`, etc.) built with React Navigation's `CompositeScreenProps` so each screen gets both its tab and stack navigation props correctly typed.
- **`AppNavigator.tsx`** — Root `createNativeStackNavigator`. `MainTabs` is the initial route (no header). `AddEditEntry` is pushed on top as a **modal** presentation, with its header title switching between "Log Refuel" and "Edit Refuel" based on whether `route.params?.entryId` is set — one screen handles both add and edit. `TripDetail` is a normal pushed screen (not modal), titled "Trip", styled to match `AddEditEntry`'s header (same background/title font/tint).
- **`MainTabs.tsx`** — `createBottomTabNavigator` with five tabs, in order: Dashboard ⛽, History 📋, Trips 🧳, Calculator 🧮, Settings ⚙️. Emoji icons via a small local `TabIcon` helper, active tint set to the forest-green theme color.

### `src/screens/`

- **`DashboardScreen.tsx`** — If `vehicles.length === 0`, renders just the header title and `EmptyVehiclesPrompt`, nothing else. Otherwise, the main view: a header with "+ Log refuel", then `VehicleSelector`, then the rest scoped to whichever vehicle is selected: `selectedMonth` (`string | null`) local state driving `summary` via `getSummary(selectedMonth)`, a 2-column grid of 8 `KpiTile`s, then all 4 chart components (always fed `monthlyBreakdown`, not `summary`). Root element is a `SafeAreaView` (`edges={['top']}`) — see "Status bar / safe area" below.
- **`HistoryScreen.tsx`** — Same `vehicles.length === 0` early-return pattern as Dashboard. Otherwise: header, then `VehicleSelector`, then `historyEntries` (newest-first, already scoped to the selected vehicle) in a `FlatList` of `HistoryRow`s. Edit navigates to `AddEditEntry` with `entryId`; delete sets a `pendingDelete` entry in local state, which drives a `ConfirmDialog` — nothing is deleted until the dialog is confirmed. Has its own (no-*entries*, as opposed to no-*vehicles*) empty state and its own "+ Log refuel" entry point. Root element is a `SafeAreaView` (`edges={['top']}`).
- **`FuelCostCalculatorScreen.tsx`** — Fully standalone: no context, no persistence, three local-state inputs (distance, mileage, fuel price), a "Calculate fuel cost" button, and a result card (Total trip distance, Fuel needed = distance ÷ mileage, Estimated cost = fuel needed × price). Explicitly "not saved anywhere, not tied to a vehicle" per the screen's own subtitle.
- **`SettingsScreen.tsx`** — Four cards: **Vehicles** (list with entry counts; a "Delete" link appears only for a vehicle with zero entries, backed by a `ConfirmDialog`), **Export** (CSV, labeled with the currently-selected vehicle's name, scoped to `historyEntries`), **Backup** (backup covers every vehicle — `writeAndShareBackup(vehicles, entries)` — and restore, which is two-step: `pickAndReadBackup()` first, then a `ConfirmDialog` naming exactly how many vehicles/entries will be replaced by how many, only calling `importBackup()` on confirmation), **About** (app name, vehicle count, entry count). A single `runAction(actionName, fn)` helper tracks a `busy` flag (disables buttons, swaps in an `ActivityIndicator`) and catches errors into a shared inline `error` message. Root element is a `SafeAreaView` (`edges={['top']}`).
- **`AddEditEntryScreen.tsx`** — Shared form for both flows. Reads `route.params?.entryId`; if present, looks up the existing entry via `getEntryById` and pre-fills every field. Shows a small non-editable "🏍️/🚗 Logging for {vehicle name}" badge at the top — the entry's own vehicle when editing, the currently-selected vehicle when adding — since there's no per-entry vehicle picker in the form by design (the vehicle is chosen globally via `VehicleSelector`, not per entry). Client-side checks (all fields present, numeric fields actually numeric) run before calling `addEntry`/`updateEntry`; a thrown validation error (from `odometerValidation`, surfaced through the context) is caught and shown as inline red text above the submit button.
- **`TripsScreen.tsx`** — If `vehicles.length === 0`, renders `EmptyVehiclesPrompt` only, same pattern as Dashboard/History. Otherwise: `VehicleSelector`, then either an `ActiveTripCard` (if `activeTrip` exists — tapping it navigates to `TripDetail`) or a "+ Start a trip" button that opens `StartTripDialog`, then a list of `ClosedTripRow`s for `closedTrips` (each also navigating to `TripDetail` on tap). `ActiveTripCard` and `ClosedTripRow` are top-level function components in this file (siblings of `TripsScreen`, not nested inside it) that take `trip`/`checkpoints`/`summary`/`onPress` as plain props — deliberately, since a component *nested* inside `TripsScreen`'s body would get a new function identity on every render and force React to remount it each time, even though it would still technically work today (hoisting means the JSX reference to it type-checks even written before its declaration).
- **`TripDetailScreen.tsx`** — Reads `route.params.tripId`, looks it up in `vehicleTrips`, and reads its `checkpoints`/`summary` via `useTrips()`. Shows a fuel-type badge (⛽/🛢️) and a status badge (Active/Closed), six `KpiTile`s reusing the exact same component the Dashboard uses (Distance, Trip mileage, Total fuel, Total cost, Cost/km, Avg ₹/L), then a "Stops" card listing every checkpoint (via a local `CheckpointRow`: kind label Start/Stop/End, date+time, location, odometer, and liters·cost when present). If the trip `isActive`: "+ Add a stop" (opens `AddCheckpointDialog` with `isEnding=false`), "End trip" (opens it with `isEnding=true`), and — only while `checkpoints.length <= 1` — a "Cancel this trip" link (opens `ConfirmDialog`), matching `TripsContext.cancelTrip`'s own restriction exactly so the UI never offers an action the context would reject.

### `src/components/`

- **`DateField.tsx` / `DateField.web.tsx`** — A labeled date-only field. The native version wraps `@react-native-community/datetimepicker`'s `<DateTimePicker>` behind a `Pressable` that toggles its visibility (spinner display on iOS, default on Android), using `onValueChange`/`onDismiss` rather than the library's now-deprecated single `onChange` prop (which fires for every event type — set, dismiss, neutral-button — multiplexed through `event.type`; the split callbacks are more direct and are what surfaced the deprecation warning on-device that prompted this). The `.web.tsx` variant (which Metro picks automatically on web, since that library has no web build) renders a plain `<input type="date">` styled to match the theme.
- **`HistoryRow.tsx`** — One row in the History list: date, odometer/liters/price line, price-per-liter/distance/station line, and a mileage figure on the right (colored forest-green if present, muted "—" if not) with Edit/Delete text actions.
- **`ConfirmDialog.tsx`** — A custom `Modal`-based confirmation dialog (title, message, Cancel/Confirm buttons), used everywhere a destructive action needs confirmation (delete entry, delete vehicle, restore backup). See "Known behaviors" for why this exists instead of `Alert.alert`.
- **`KpiTile.tsx`** — One Dashboard KPI card: a small icon chip (background = `accentColor` at ~8% alpha, via a `"14"` hex suffix — same technique the original web app used), an uppercase muted label, and a bold value.
- **`ScopeSelector.tsx`** — A horizontal scrollable row of chips: "All time" plus one chip per distinct month (descending, scoped to the selected vehicle), the active one filled forest-green.
- **`VehicleSelector.tsx`** — A horizontal scrollable row of chips, one per vehicle (icon by type + name, active one filled forest-green), plus a trailing dashed "+ Add vehicle" chip that opens `AddVehicleDialog`. Rendered at the top of both `DashboardScreen` and `HistoryScreen`.
- **`AddVehicleDialog.tsx`** — A small `Modal` form (name text input + a two-button type toggle, two-wheeler/four-wheeler with icons), Cancel/Add buttons. Visually matches `ConfirmDialog`'s card-on-backdrop style. Local-only validation (name required).
- **`EmptyVehiclesPrompt.tsx`** — The onboarding empty state shown by `DashboardScreen`/`HistoryScreen`/`TripsScreen` whenever `vehicles.length === 0` (a fresh install, or every vehicle deleted): an icon, "Add your first vehicle" headline, explanatory subtext, and its own "+ Add a vehicle" button that opens its own `AddVehicleDialog` instance (same self-contained pattern as `VehicleSelector`, not shared state).
- **`DateTimeField.tsx` / `DateTimeField.web.tsx`** — The trip counterpart to `DateField`, for the one thing trips need that the regular fuel log doesn't: a full date **and** time. On Android (no native combined date+time picker), the native version chains a date picker into a time picker in sequence, both using `onValueChange`/`onDismiss`; on iOS it's a single `mode="datetime"` step. The `.web.tsx` variant uses `<input type="datetime-local">`, converting its value via `new Date(year, month-1, day, hour, minute)` field construction rather than parsing the raw string, to avoid the same UTC-vs-local ambiguity `dateFormat.ts` was written to avoid — same pattern as `DateField.web.tsx`.
- **`StartTripDialog.tsx`** — A `Modal` form: a petrol/diesel toggle (icons/labels from `constants/fuel.ts`), a `DateTimeField`, an odometer input, and an optional location field. Calls `useTrips().startTrip()` on submit; a thrown error (no vehicle selected, an active trip already exists, negative odometer) is shown inline.
- **`AddCheckpointDialog.tsx`** — A `Modal` form shared by both "Add a stop" and "End trip", taking `{ visible, tripId, isEnding, onClose }`. `isEnding` drives the title ("Add a stop" vs "End trip"), whether liters/cost are optional or required, and whether submit calls `addCheckpoint` or `endTrip`. Same `DateTimeField` + odometer + location fields as `StartTripDialog`, plus liters/cost.
- **`ChartEmptyState.tsx`** — A small dashed-border box with a centered message, reused by all 4 chart components for their respective empty states.
- **`MileageTrendChart.tsx`** — `react-native-gifted-charts` `LineChart` in area mode: forest-green line and gradient fill (35%→2% opacity), curved. Months with a null `avgMileageKmpl` are omitted from the data entirely rather than plotted as zero — since gifted-charts has no `connectNulls` flag, dropping the point makes the line connect straight across the gap to the next valid point, the same visual effect the original achieved differently.
- **`LastTwoMonthsCard.tsx`** — *Not* a chart-library component — hand-rolled `View`s, matching the original. Shows the two most recent months' mileage and spend, with a horizontal bar whose width is `min(100, avgMileageKmpl / 30 * 100)%` (so both months commonly hit 100% width if mileage exceeds the 30 km/L reference — that's the original's formula, not a bug).
- **`MonthComparisonChart.tsx`** — `react-native-gifted-charts` grouped `BarChart`: two bars per month (spend in terracotta, distance in blue) sharing one y-axis, exactly as the original did (flagged during research as a possibly-awkward design choice, but not one of the three named bugs, so left as-is). A hand-rolled legend row sits below the chart.
- **`FuelPriceTrendChart.tsx`** — `react-native-gifted-charts` `LineChart` (not area), terracotta, plotting `avgPricePerLiter` per month. Doesn't filter nulls (matching the original) because `avgPricePerLiter` can't actually be null for any month with at least one entry, given liters is always validated `> 0`.

### `src/export/exportService.ts`

`buildEntriesCsv(entries)` builds a CSV string (10 columns: date through notes, values properly quote-escaped) from a list of `EnrichedFuelEntry`. `exportEntriesAsCsv(entries, vehicleName?)` writes it to a temp file via `expo-file-system`'s `File`/`Paths.cache` and shares it via `expo-sharing` (guarded by `Sharing.isAvailableAsync()`), after checking `assertFileSystemSupported()`. `vehicleName`, when given, is slugified into the filename (e.g. `mileage-tracker-export-activa-...csv`) so exports from different vehicles don't collide/overwrite each other on the device.

### `src/backup/backupService.ts`

Full-fidelity JSON backup, separate from the CSV report above, and — since multi-vehicle support — the only place backup/restore code actually lives; `FuelEntriesContext.importBackup` does the writing, this module only reads/writes files and shapes the data.

- `writeAndShareBackup(vehicles, entries)` wraps everything in a versioned envelope `{ version: 2, exportedAt, vehicles, entries }` (bumped from `version: 1`, which had no `vehicles` array or `vehicleId` on entries at all), writes it under a `backups/` subdirectory of `Paths.document`, and shares it.
- `pickAndReadBackup(): Promise<RestorePayload>` opens the system file picker (`File.pickFileAsync`), reads and JSON-parses the result, validates its shape with a type guard (`isBackupPayload`) that accepts *either* a `version: 1` or `version: 2` payload, and normalizes both into the same `RestorePayload` shape:
  - **`version: 2`**: builds an old-vehicle-id → array-index map, strips ids/timestamps from vehicles and entries, and rewrites each entry's `vehicleId` as a `vehicleIndex` into the (also-stripped) `vehicles` array.
  - **`version: 1`** (a backup taken before this phase existed): synthesizes a single default vehicle (`{ name: 'My Vehicle', type: 'four_wheeler' }`) and assigns every entry to `vehicleIndex: 0` — the exact same fallback the on-device schema migration uses for pre-existing data, so an old backup restores just as cleanly as an old device upgrades.

Both are pure — no UI code; `SettingsScreen` handles the busy state, errors, and confirmation.

## Data model

Five SQLite tables:

**`vehicles`**

| Column | Type | Notes |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | |
| `name` | `TEXT` | user-chosen, e.g. "Activa" |
| `type` | `TEXT` | `'two_wheeler'` \| `'four_wheeler'` |
| `created_at` | `TEXT` | ISO timestamp |

**`fuel_entries`**

| Column | Type | Notes |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | |
| `vehicle_id` | `INTEGER` | added via migration (see `database.ts` above); every entry belongs to exactly one vehicle |
| `date` | `TEXT` | `YYYY-MM-DD`, always parsed/formatted as a local calendar date |
| `odometer_km` | `REAL` | |
| `liters` | `REAL` | always `> 0` (enforced) |
| `total_price_inr` | `REAL` | always `> 0` (enforced) |
| `station` | `TEXT` | optional, default `''` |
| `notes` | `TEXT` | optional, default `''` |
| `created_at` | `TEXT` | ISO timestamp, set once on insert, used as the tie-break for same-date entries |

Index on `(date, created_at)` matches the sort order used throughout the app — note this index is *not* per-vehicle; the app relies on `FuelEntriesContext` filtering by `vehicleId` before it ever needs date-ordering, not on the database doing it.

**`app_settings`** — generic `key TEXT PRIMARY KEY, value TEXT` table. Currently holds one row, `selected_vehicle_id`, but designed to hold future settings without new tables.

**`trips`**

| Column | Type | Notes |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | |
| `vehicle_id` | `INTEGER` | which vehicle this trip belongs to; not a foreign key to `fuel_entries` in any way |
| `fuel_type` | `TEXT` | `'petrol'` \| `'diesel'`, default `'petrol'` |
| `status` | `TEXT` | `'active'` \| `'closed'`, default `'active'` |
| `created_at` | `TEXT` | ISO timestamp, set on insert |
| `closed_at` | `TEXT` \| `NULL` | set once, when the trip is ended |

**`trip_checkpoints`**

| Column | Type | Notes |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | |
| `trip_id` | `INTEGER` | which trip this checkpoint belongs to |
| `kind` | `TEXT` | `'start'` \| `'waypoint'` \| `'end'` |
| `date_time` | `TEXT` | full ISO datetime (unlike `fuel_entries.date`, which is date-only) |
| `odometer_km` | `REAL` | |
| `location` | `TEXT` | optional, default `''` |
| `liters` | `REAL` \| `NULL` | present only if fuel was purchased at this stop |
| `cost_inr` | `REAL` \| `NULL` | present only if fuel was purchased at this stop; always non-null exactly when `liters` is |
| `created_at` | `TEXT` | ISO timestamp, set once on insert |

Index on `(trip_id, date_time)`. Entirely separate from `fuel_entries`/`vehicles`' own indexing — there is no join, view, or shared query anywhere between the two table pairs.

## Known behaviors (read before changing the math)

**The odometer-sequencing fix.** The original prototype accepted a non-increasing odometer reading silently, then used that bad value as the baseline for the *next* entry's distance calculation — a cascading corruption bug. Here, `odometerValidation.ts` checks every create/edit against the entry's real chronological neighbors (by date, **within the same vehicle**) before anything is written, so a bad reading can never be persisted. This also means historical backfilling (inserting an older entry between two existing dates) is validated correctly against both real neighbors, not just the most recent entry.

**The `avgPricePerLiter` asymmetry.** This looks like a bug but is intentional and preserved from the original: `avgPricePerLiter` divides total spend by total liters across *every* entry in scope, while `avgMileageKmpl` and `avgCostPerKm` only use entries that have a computed distance (i.e., not the very first entry ever logged for that vehicle). If you're debugging "why don't these two ratios agree," this is why — don't "fix" it without checking `Project_Plan.md` first.

**Confirmation dialogs use a custom `Modal`, not `Alert.alert`/`window.confirm`.** Discovered during testing: react-native-web silently no-ops `Alert.alert`'s buttons, and `window.confirm` is suppressed in at least one sandboxed browser context this app was tested in. `ConfirmDialog.tsx` works identically on every platform and happens to also match the original prototype's own inline confirmation pattern more closely than a native popup would.

**Web platform notes.** `expo-sqlite` *does* work on web, but only because `metro.config.js` adds `.wasm` as a Metro asset extension and sets `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` response headers — both required by its `wa-sqlite` web backend. Without that config, the app fails to bundle for web at all. `expo-file-system`'s new File/Directory API, by contrast, has **no** web implementation whatsoever — `platformGuards.ts` turns that into a clear message rather than a raw internal error. Practically: `expo start --web` is a genuine, fully-functional testing surface for everything except export/backup/restore, which need an Android/iOS device or emulator via Expo Go.

**Status bar / safe area.** `DashboardScreen`, `HistoryScreen`, and `SettingsScreen` each draw their own header because both the tab navigator (`MainTabs.tsx`) and the root stack (`AppNavigator.tsx`) run with `headerShown: false` for the tab group — nothing else inserts a status-bar-aware header for them. All three wrap their root element in `SafeAreaView` from `react-native-safe-area-context` with `edges={['top']}` (never `react-native`'s own `SafeAreaView`, which doesn't handle Android reliably) so content starts below the status bar without touching the status bar itself. Found and fixed after on-device Android testing surfaced the header — and critically, the "+ Log refuel" button — rendering under/behind the status bar, making the button unreliable to tap.

**No vehicle is ever auto-created for a fresh install.** Early Phase 6 always inserted a "My Vehicle" default the first time the app booted, whether or not there was any existing data to justify it — including for a brand new user with zero history. Fixed: `migrateVehicleSupport()` in `database.ts` now only creates a fallback vehicle when there's real orphaned data (`fuel_entries` rows with `vehicle_id IS NULL`) that needs a home; a genuinely empty database stays at zero vehicles. `DashboardScreen`/`HistoryScreen` handle that state explicitly via `EmptyVehiclesPrompt` rather than assuming a vehicle always exists — every other screen/component that reads `selectedVehicleId`/`selectedVehicle` already tolerated `null`/`undefined` from Phase 6 (KPIs show `—`/`0`, `addEntry` throws a catchable error), so this was purely a matter of not calling the auto-create step unconditionally, plus giving the zero-vehicle state a real UI instead of leaving it to render an empty dashboard.

**No cascade-delete for vehicles, ever.** `deleteVehicle` refuses outright if the vehicle has any logged entries. There is no "delete this vehicle and all its history" path anywhere in the app — the only way a vehicle's entries go away is deleting them individually first. This was a deliberate scope cut, not a missing feature: it avoids a genuinely destructive, hard-to-undo operation that wasn't asked for.

**Icon/splash branding is invisible in Expo Go — except the JS loading screen.** The `assets/` icon set (`icon.png`, `android-icon-foreground.png`, `favicon.png`, `splash-icon.png`) and the `expo-splash-screen` plugin config in `app.json` only take effect in a real native build (EAS Build or a local prebuild) — Expo Go always shows its own icon, and its own bundling/progress screen while it fetches the JS bundle from Metro, regardless of what the app configures. Neither of those is a bug to "fix." What *is* fully in this app's control, and *does* show correctly in Expo Go: `App.tsx` renders a small `LoadingScreen` component (icon + app name, on the theme's bone-white background, using the system default font since custom fonts aren't guaranteed loaded yet) while `!fontsLoaded || !dbReady`, instead of returning `null`. Before this, that gate was a blank flash between Expo Go's own splash and the Dashboard — this closes that gap with something actually branded. The adaptive icon deliberately has no `backgroundImage` or `monochromeImage` layer — just a flat `backgroundColor` — since an attempted automated Android-13-themed-icon silhouette from the (glossy, photographic-style) source image came out blank, and shipping nothing is better than shipping a broken-looking asset; Android falls back to the normal adaptive icon without one, which is unremarkable and common.

**Trips are fully separate from the regular fuel log — this was a deliberate design choice, made with the user, not an accident of implementation order.** Before building Phase 8, the question "should a trip's fuel purchases also post to the regular Dashboard/History?" was put to the user directly, and the answer was "fully separate system." Concretely: `TripsContext` never imports or calls anything from `FuelEntriesContext` except reading `selectedVehicleId`; `trip_checkpoints.liters`/`cost_inr` never get copied into `fuel_entries`; CSV export and JSON backup/restore only ever touch `fuel_entries`/`vehicles` and know nothing about trips. This means a trip's fuel purchases genuinely don't count toward the Dashboard's spend/mileage KPIs or show up in History/exports — confirmed by testing a full trip (start → mid-trip refuel → end) with real liters/cost at each fuel stop and observing the Dashboard for that same vehicle still read zero refuels, ₹0 spent, throughout. If a future request wants trip fuel to *also* count toward the main KPIs, that requires a deliberate new bridge (e.g. `TripsContext` calling `addEntry` on `endTrip`) — it will not happen by itself, and doing so would need to guard against double-counting a trip's checkpoints against the vehicle's own odometer sequence in `odometerValidation.ts`, which knows nothing about trips today.

**Trip checkpoints validate only against the immediately previous checkpoint, not full backfill support.** `odometerValidation.ts` (regular fuel log) checks a candidate entry against both its previous *and* next chronological neighbor, because a fuel log entry can be backfilled anywhere in the timeline. `tripEngine.ts`'s `validateCheckpointInput` only checks against the previous checkpoint, because a trip is always built forward in real time as it happens (start, then stops, then end, in that order) — there is no "insert a stop between two existing stops" flow in the UI, so the simpler one-sided check is correct here and not a missing feature.

**`SplashScreen.hideAsync()` must fire on the *loading* screen's layout, not the final app's.** The first version of `LoadingScreen` above rendered correctly but was never actually seen: the native splash (opaque, managed by `expo-splash-screen`) only got hidden once `SafeAreaProvider`'s `onLayout` fired — and that provider doesn't mount until `fontsLoaded && dbReady` are already both true, i.e. after loading has already finished. So the native splash stayed up (covering `LoadingScreen`, which was rendering invisibly underneath it) for the entire loading window, then dropped away the instant everything was ready — the app appeared to jump straight from Expo Go's own splash to a fully-loaded Dashboard. Fixed by moving the `SplashScreen.hideAsync()` call to `LoadingScreen`'s own `onLayout` instead, so the native splash comes down as soon as *that* screen has painted a frame, actually revealing it. General lesson: whichever component's `onLayout` calls `hideAsync()` is the one that determines what the native splash uncovers — it must be the first thing you want the user to see, not the last.

## Status

All 5 core-build phases plus Phase 6 (multiple vehicles), Phase 7 (fuel cost calculator), and Phase 8 (Fuel Trip Summary / Trips) are complete. Full CRUD, the odometer-sequencing fix (now per-vehicle), the analytics engine, all 4 dashboard charts, CSV export, JSON backup/restore (now vehicle-aware, with v1-backup backward compatibility), vehicle add/switch/delete, the standalone calculator, and the fully-separate trip-tracking system (start/add stop/end/cancel, live and closed trip summaries) are all built. Everything has been verified end-to-end via `expo start --web`, including the on-device-data migration path (confirmed on a real pre-existing database that entries survive and land on a correctly-created default vehicle), vehicle isolation (confirmed that a second vehicle's much-lower odometer reading is accepted without triggering the first vehicle's sequencing rule), and Phase 8's own math and isolation guarantees (a full trip's figures matched the spec's worked example — 500 km / 20 km/L / 25 L / ₹2,500 / ₹5/km / ₹100/L — exactly, and the regular Dashboard/History for that vehicle stayed at zero refuels/₹0 throughout). What still needs an on-device Expo Go pass: backup/restore's v2 format specifically (file-system APIs don't work on web at all), the native date and date-time pickers, and a general regression now that there are 5 tabs, vehicle-switching UI, and the trips flow all in play. Custom app icon/splash branding is in place and config-validated, but — being a native-build-only concern — can't be seen in Expo Go and hasn't been confirmed in an actual build yet. See `Project_Plan.md` for the full build history and the remaining backlog (predicted-refuel alerts, maintenance log).
