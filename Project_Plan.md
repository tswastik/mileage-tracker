# Mileage Tracker — Project Plan

## Context

`D:\Personal\Self Learning\App\Mileage Tracker` originally held a web-app prototype (FastAPI + MongoDB + React), preserved under `reference/legacy-prototype/`. This repo rebuilds it as a standalone Expo/React Native mobile app: single-user petrol fill-up tracker with auto-computed mileage and a dashboard. Local-only storage via `expo-sqlite` — no backend, no auth, no cloud sync.

Reading the prototype in full surfaced three bugs fixed in this rebuild (not ported):
1. A non-increasing odometer reading was silently accepted and poisoned the *next* entry's mileage calc as a bad baseline (cascading corruption).
2. Editing an entry had zero validation at all.
3. One date formatter had a UTC-vs-local off-by-one bug.

Every other formula/behavior is reproduced exactly, including a deliberate-looking asymmetry in the aggregate math: `avgPricePerLiter` uses all entries in scope, while `avgMileageKmpl`/`avgCostPerKm` use only entries that have a computed distance.

## Key decisions

- **Stack**: Expo SDK 57, TypeScript strict, React Navigation (native-stack root + bottom-tabs), React Context + `useReducer` for state, no backend.
- **Storage**: `expo-sqlite`, single `fuel_entries` table, repository pattern (dumb CRUD, no business rules in the DB layer).
- **Navigation**: bottom tabs — Dashboard, History, Settings — plus a modal-presented `AddEditEntry` stack screen shared by add and edit flows.
- **Charts**: `react-native-gifted-charts` + `react-native-svg` (SVG-only, ships inside Expo Go, no custom dev client needed).
- **Fonts**: Work Sans (headings/numbers) + IBM Plex Sans (body) via `@expo-google-fonts/*`.
- **Theme**: centralized tokens in `src/constants/theme.ts` — bone white `#F9F8F6`, forest green `#2E5339`, terracotta `#C05746`, blue `#3D5A80`.
- **Scope for v1**: single vehicle, INR/km/L only. CSV export + JSON backup/restore in scope. Multi-vehicle, predicted-refuel alerts, maintenance log stay backlog.

## Odometer-sequencing fix

`src/utils/odometerValidation.ts`, called from `FuelEntriesContext` on both add and edit (not from the repository, which stays pure CRUD):
1. Field checks: `liters > 0`, `totalPriceInr > 0`, `odometerKm >= 0`.
2. Sort all *other* entries chronologically by `(date, createdAt)`.
3. Find the true `prevEntry` (last one with `date <= input.date`) and `nextEntry` (first one with `date > input.date`).
4. Reject unless `odometerKm >= prevEntry.odometerKm` and `odometerKm <= nextEntry.odometerKm` (when those neighbors exist).

Because both create and edit validate against each entry's actual real chronological neighbors at write time, a bad reading can never be persisted or corrupt a later calculation. This also correctly supports backfilling a historical entry between two existing dates.

## Build order (5 phases, one commit each)

1. **Scaffold, DB, nav shell** — repo bootstrap, `database.ts`/`fuelEntryRepository.ts`/`types/fuelEntry.ts`, theme, font loading, navigation with placeholder screens, doc pair started.
2. **Add/Edit + History + validation** — `dateFormat.ts`, `odometerValidation.ts`, enrichment half of `mileageEngine.ts`, full `FuelEntriesContext`, `DateField`, `AddEditEntryScreen`, `HistoryScreen`/`HistoryRow`.
3. **Analytics + Dashboard KPIs** — finish `mileageEngine.ts` (summary/monthly/distinct-months), `KpiTile`, `ScopeSelector`, Dashboard KPI section.
4. **Charts** — all 4 chart components with empty states, wired to full-history monthly breakdown (not the KPI scope).
5. **Export, backup, settings, polish** — `exportService.ts` (CSV), `backupService.ts` (JSON), `SettingsScreen`, app icon/splash, finish this doc pair.

## Verification

Update: `expo-sqlite`'s web target actually works — it just needs `metro.config.js` to treat `.wasm` as an asset and set `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` headers (added in Phase 1 once this was discovered). With that in place, `expo start --web` is a genuinely useful full-app testing surface, not just a layout smoke test — confirmed end-to-end for Phase 2's add/edit/delete/validation flows. Native `Alert.alert`/`window.confirm` are unreliable across environments (react-native-web doesn't act on `Alert.alert`, and some automated/sandboxed browser contexts suppress native `confirm()` dialogs), so destructive confirmations use a custom in-app `ConfirmDialog` component instead — this also better matches the original prototype's own inline `AlertDialog` pattern rather than a native browser popup. An Android emulator or physical device via Expo Go is still the right place for a final regression pass (real touch/native-picker behavior), but is no longer the *only* way to test DB-backed flows.

## Status

- [x] Phase 1 — scaffold, DB, nav shell
- [x] Phase 2 — Add/Edit + History + validation
- [x] Phase 3 — Analytics + Dashboard KPIs
- [ ] Phase 4 — Charts
- [ ] Phase 5 — Export, backup, settings, polish

Small deliberate deviation from the original in Phase 3: the "Scope" KPI tile shows a formatted month label (e.g. "Sep 2026") instead of the original's raw "YYYY-MM" string — a display-only polish, not a calculation change, so it doesn't affect the numeric-parity goal.
