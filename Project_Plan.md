# Mileage Tracker — Project Plan

## Context

`D:\Personal\Self Learning\App\Mileage Tracker` originally held a web-app prototype (FastAPI + MongoDB + React), preserved under `reference/legacy-prototype/`. This repo rebuilds it as a standalone Expo/React Native mobile app: single-user petrol fill-up tracker with auto-computed mileage and a dashboard. Local-only storage via `expo-sqlite` — no backend, no auth, no cloud sync.

Reading the prototype in full surfaced three bugs fixed in this rebuild (not ported):
1. A non-increasing odometer reading was silently accepted and poisoned the *next* entry's mileage calc as a bad baseline (cascading corruption).
2. Editing an entry had zero validation at all.
3. One date formatter had a UTC-vs-local off-by-one bug.

Every other formula/behavior is reproduced exactly, including a deliberate-looking asymmetry in the aggregate math: `avgPricePerLiter` uses all entries in scope, while `avgMileageKmpl`/`avgCostPerKm` use only entries that have a computed distance.

## Mileage Ccalculation Formula

Subtract your initial odometer reading from your final reading to get the total distance traveled, then use the formula below:

Mileage (km/L) = Total Distance Traveled (km) ÷ Petrol Refilled (Liters)

Step-by-Step Mathematical Example:

Initial Odometer Reading: 12,500 km
Final Odometer Reading  : 12,650 km
Total Distance Traveled :    150 km (12,650 minus 12,500)

Petrol Refilled to Top Up 3.75 Liters

Final Calculation : 150 km ÷ 3.75 Liters = 40 km/L

## Key decisions

- **Stack**: Expo SDK 57, TypeScript strict, React Navigation (native-stack root + bottom-tabs), React Context + `useReducer` for state, no backend.
- **Storage**: `expo-sqlite`, single `fuel_entries` table, repository pattern (dumb CRUD, no business rules in the DB layer).
- **Navigation**: bottom tabs — Dashboard, History, Settings — plus a modal-presented `AddEditEntry` stack screen shared by add and edit flows.
- **Charts**: `react-native-gifted-charts` + `react-native-svg` (SVG-only, ships inside Expo Go, no custom dev client needed).
- **Fonts**: Work Sans (headings/numbers) + IBM Plex Sans (body) via `@expo-google-fonts/*`.
- **Theme**: centralized tokens in `src/constants/theme.ts` — bone white `#F9F8F6`, forest green `#2E5339`, terracotta `#C05746`, blue `#3D5A80`.
- **Scope for v1**: single vehicle, INR/km/L only. CSV export + JSON backup/restore in scope. Multi-vehicle, predicted-refuel alerts, maintenance log stay backlog. (Multi-vehicle moved out of backlog into Phase 6 — see below.)

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
- [x] Phase 4 — Charts
- [x] Phase 5 — Export, backup, settings, polish
- [x] Phase 6 — Multiple vehicles
- [x] Phase 7 — Fuel cost calculator

Phase 6/7 verification: confirmed end-to-end via `expo start --web` — the migration correctly created a default "My Vehicle" on an existing (pre-vehicle-support) database with no data loss; adding a second vehicle ("Activa", two-wheeler) and logging an entry with a *lower* odometer than the first vehicle's was accepted without triggering the odometer-sequencing rejection, proving entries are properly scoped per vehicle end to end (History, KPIs, and charts all confirmed isolated per vehicle); deleting an empty vehicle worked and correctly fell back to selecting another vehicle; deleting a vehicle with entries is correctly blocked (no delete control shown). The Fuel Cost Calculator was checked against the exact worked example added above (150 km ÷ 40 km/L → 3.75 L → ₹375 at ₹100/L) and matched precisely. Backup/restore's new v2 format (with the v1-backward-compatibility path) could not be exercised on web, same `expo-file-system`-has-no-web-implementation limitation as Phase 5 — still needs an on-device check, and this time it's particularly important since it's a real schema migration running against this device's actual previously-logged data.

Small deliberate deviation from the original in Phase 3: the "Scope" KPI tile shows a formatted month label (e.g. "Sep 2026") instead of the original's raw "YYYY-MM" string — a display-only polish, not a calculation change, so it doesn't affect the numeric-parity goal.

Phase 4 notes: charting library is `react-native-gifted-charts` (+ `react-native-svg`, `expo-linear-gradient` — the latter is a runtime dependency of gifted-charts' area/gradient fills, not obvious from its own package.json, and had to be added after an "Uncaught: Gradient package was not found" error surfaced in testing). The mileage trend chart bridges null-mileage months by omitting that data point entirely (rather than using a `connectNulls` flag, which this library doesn't expose) — the line naturally connects the nearest valid points either side, producing the same visual bridge as the original. The grouped bar chart shares one y-axis for both spend and distance series, same as the original (flagged as a possible design flaw during research, but not one of the 3 named bugs, so left as-is rather than redesigned).

Phase 5 notes: CSV export (`exportService.ts`) and JSON backup/restore (`backupService.ts`, versioned `{version, exportedAt, entries}` envelope) use `expo-file-system`'s new `File`/`Directory`/`Paths` API — confirmed via `docs.expo.dev/versions/v57.0.0` that `.write()`/`.text()`/`.create()`/`File.pickFileAsync()` are the correct current method names. **This API has no web implementation at all** (unlike `expo-sqlite`, which does) — it throws an unhelpful internal error (`this.validatePath is not a function`) on web, so a small `assertFileSystemSupported()` guard now turns that into a clear "needs a phone or emulator" message instead. This is the one Phase-5 area that genuinely could not be verified end-to-end in this session (no Android device was available) — the code is written directly against the documented API and follows the same patterns already proven working (try/catch + inline error, `Sharing.isAvailableAsync()` guard), but an on-device Expo Go check of all three actions (export, backup, restore) is still worth doing before relying on it. Restore is destructive (replaces all entries) and validates the entire backup up front, before deleting anything, so a bad file can't leave the DB half-cleared.

App icon/splash branding was left at Expo's default template assets — treated as deferred polish (matching how Remindly's own branding pass came after its core functionality, not during it), not something this session did initially. Revisit if/when the app is ready for a real device build.

## Icon/splash branding

Replaced Expo's default template assets with a user-supplied icon (fuel pump + circular-arrow + km/L speedometer, glossy green squircle). Generated the full set from that one source image with Pillow (`icon.png` padded to a clean 1024×1024 square; `android-icon-foreground.png` scaled to ~68% and centered on a transparent canvas so it survives Android's adaptive-icon mask cropping; `favicon.png`; `splash-icon.png` scaled to ~55% and centered transparently, now wired into the `expo-splash-screen` config plugin with `backgroundColor: "#F9F8F6"` matching the app's theme). Dropped the separate `backgroundImage`/`monochromeImage` adaptive-icon layers rather than ship anything low-quality: a flat `backgroundColor` alone is standard and sufficient, and an attempted automated monochrome (Android 13+ themed-icon) silhouette via edge detection came out blank on this glossy, photographic-style source — Android just falls back to the normal adaptive icon without one, which is a normal, unremarkable state for an app to be in.

**Important**: none of this is visible while testing through Expo Go — Expo Go always shows its own icon and its own splash screen; the app's `icon`/`adaptiveIcon`/`expo-splash-screen` config only take effect in a real native build (EAS Build, or a local prebuild). Config validated via `npx expo config --type public` (resolves cleanly) and a web export (bundles cleanly); the actual on-device appearance can only be confirmed by a real build, which hasn't happened yet.

## On-device Android verification (post-Phase-5)

Tested live on a physical Android phone via Expo Go. Found and fixed one real bug: the Dashboard, History, and Settings screens all draw their own header (title + "+ Log refuel" button) with `headerShown: false` on both the tab and root navigators, so nothing accounted for the status bar inset — the header, and critically the "+ Log refuel" button, rendered underneath/behind the status bar and was unreliable to tap. Fixed by wrapping each of those three screens' root element in `SafeAreaView` (`react-native-safe-area-context`, `edges={['top']}`) instead of a plain `View`/`ScrollView` — content now starts below the status bar, which itself is untouched. `AddEditEntryScreen` never had this problem since it's presented with a real native-stack header, which already insets correctly. Confirmed fixed on-device after the change.

Also confirmed working on-device during this pass: navigation between all three tabs, the "+ Log refuel" button (now reliably tappable), and the overall look and feel. Export/backup/restore, the native date picker, and `Alert.alert` paths (see Phase 5 notes above) still haven't been explicitly re-confirmed on this device — worth a follow-up pass. Export and backup/restore were separately confirmed working on-device before Phase 6 started.

## Phase 6: multiple vehicles

**Use case**: a user with, say, a two-wheeler and a four-wheeler switches between them at the top of the Dashboard/History screens, and every number — KPIs, charts, history — reflects only the selected vehicle's entries.

**Why this needs care, not just a new column**: the odometer-sequencing validation and the whole mileage engine (`computeEnrichedEntries`, distance = this odometer − previous odometer) assume one continuous, ever-increasing odometer sequence. Two vehicles have two completely independent odometer sequences. Mixing them would silently produce nonsense distances (e.g. a four-wheeler's 45,000 km reading "distance" from a two-wheeler's 12,000 km reading). So every place that currently operates on "all entries" must instead operate on "all entries for the selected vehicle" — this is the one rule this phase cannot get wrong.

**Data model**:
- New `vehicles` table: `id, name, type ('two_wheeler' | 'four_wheeler'), created_at`.
- New `app_settings` key-value table (`key TEXT PRIMARY KEY, value TEXT`) — holds `selected_vehicle_id`, so the active vehicle survives an app restart. Generic on purpose, so future settings don't need their own bespoke table.
- `fuel_entries` gains a `vehicle_id` column via `ALTER TABLE` (guarded by checking `PRAGMA table_info(fuel_entries)` first, so it only runs once, ever — no versioned migration framework here, same as the rest of this codebase).
- **Migration for existing data** (this device already has real logged entries): on first boot with the new schema, if `vehicles` is empty, insert one default vehicle ("My Vehicle", four-wheeler) and backfill every `fuel_entries` row with `vehicle_id IS NULL` to that vehicle's id. Nothing existing is lost or reassigned incorrectly.

**Scoping rule, applied everywhere**: `FuelEntriesContext` loads all vehicles and all entries (across every vehicle) once, then derives `vehicleEntries = entries.filter(e => e.vehicleId === selectedVehicleId)` — and *every* existing derived value (`enrichedEntries`, `historyEntries`, `monthlyBreakdown`, `distinctMonths`, `getSummary`) is recomputed from `vehicleEntries`, not `entries`. `addEntry`/`updateEntry` stamp the selected vehicle onto new entries and validate odometer sequencing only against that vehicle's own entries.

**Vehicle management** (deliberately minimal for v1):
- Switching and adding live in a `VehicleSelector` chip row at the top of Dashboard and History (mirrors `ScopeSelector`'s look) — a chip per vehicle (🏍️ two-wheeler / 🚗 four-wheeler) plus a "+ Add vehicle" chip opening a small modal (name + type).
- Renaming is out of scope for v1 (not requested).
- Deleting lives in Settings, and is only allowed for a vehicle with **zero** logged entries — no cascade-delete of a vehicle's history. This avoids a genuinely destructive, hard-to-undo operation for a feature that wasn't asked for; a vehicle logged in error can still be removed before anything's recorded against it.

**Backup format bump**: a backup now needs to carry vehicle identity too, or a restored file would have entries with no vehicle to belong to. Bumps to `{version: 2, exportedAt, vehicles, entries}`. Restoring a `version: 1` file (from before this phase) still works — its entries get assigned to one freshly-created default vehicle, same as the on-device migration above. CSV export stays scoped to the currently-selected vehicle's history (it already reads from context, so this falls out automatically) — worth knowing that CSV and JSON-backup now have different scopes (one vehicle vs. everything) on purpose.

## Phase 7: fuel cost calculator

A fourth bottom tab, "Calculator" — a completely standalone screen with no database or context involvement, matching the ask: a one-time, throwaway calculation, not something that gets saved. Three inputs (Total Distance in km, Mileage in km/L, Fuel Price in ₹/L), a "Calculate Fuel Cost" button, and three results: Total Trip Distance (echoes the input), Fuel Needed (`distance ÷ mileage`, liters), and Estimated Cost (`fuel needed × price`, ₹). Local component state only.
