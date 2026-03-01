# Test Coverage Analysis

## Current State

- **5 test files**, **85 tests** total (71 passing, 14 failing)
- Tests cover utility functions well but store and routing logic are undertested
- No component tests exist
- No coverage reporting configured

### Test File Summary

| Module | File | Tests | Status | Quality |
|--------|------|-------|--------|---------|
| CSV Parser | `src/utils/__tests__/csvParser.test.ts` | 22 | All pass | Good |
| Loop Detection | `src/utils/__tests__/loopDetection.test.ts` | 14 | All pass | Very Good |
| Studio Export | `src/utils/__tests__/studioExport.test.ts` | 9 | All pass | Very Good |
| Hapax Export | `src/utils/__tests__/hapaxExport.test.ts` | 34 | **14 fail** | Broken |
| Zustand Store | `src/store/__tests__/useStudioStore.test.ts` | 6 | All pass | Thin |

### Untested Modules

- `src/utils/hapaxRouting.ts` — zero tests
- `src/utils/midiGuideService.ts` — zero tests
- All 11+ React components — zero tests
- Store export (`studioExport.ts` export path) — zero tests

---

## Recommended Improvements

### P1: Fix 14 Failing `hapaxExport` Tests (High Impact, Low Effort)

`findConnectedInstruments` was refactored to use BFS via `traceHapaxRouting()`, which
only follows edges with `data.portType` of `'midi'` or `'usb'`. The existing tests create
edges without `data.portType`, so the BFS never traverses them.

**Fix:** Update the `makeEdge` helper in `hapaxExport.test.ts` to include
`data: { portType: 'midi' }` (or `'usb'` for USB test edges). Also update any tests
that create USB edges to use `portType: 'usb'`.

### P2: Expand Store Tests (High Impact, Medium Effort)

The store has 20+ actions but only 3 are tested. Key gaps:

- **`addNode` / `addNodeFromMidiGuide`** — node creation, ID assignment, preset data inheritance
- **`removeNode`** — edge cleanup, selection clearing, non-removable node protection
- **`addEdge` / `removeEdge`** — edge ID format, color assignment, loop detection trigger
- **`updateNodePortsAndCleanEdges`** — orphaned edge cleanup when ports change
- **`updateNodeData`** — `localOff` change triggers loop re-check
- **`onNodesChange` / `onEdgesChange`** — position/dimension/select/remove handling
- **`checkForLoops`** — state updates (`hasLoop`, `loopEdges`)

### P3: Add `hapaxRouting.ts` Tests (High Impact, Low Effort)

`traceHapaxRouting()` is now a core dependency of the export pipeline but has zero tests.

Scenarios to cover:
- Empty map when no Hapax node exists
- Direct connections (Hapax -> instrument)
- Multi-hop routing (Hapax -> MIDI thru -> instrument)
- Only follows MIDI and USB edges (ignores audio/CV)
- Does not re-enter Hapax on return edges
- Multiple handles reaching the same node
- Disconnected subgraphs are excluded

### P4: Test `studioExport.ts` Export Path (Medium Impact, Low Effort)

Only the parse/import side is tested. Add tests for:
- Output JSON structure (version, timestamp, nodes, edges, customPresets)
- Round-trip: export -> parse produces equivalent data
- Edge serialization preserves `data.portType`

### P5: Add `midiGuideService.ts` Tests (Medium Impact, Low Effort)

Pure functions (easy wins):
- `filterManufacturers` — case-insensitive search, empty query, no matches
- `filterDevices` — same patterns

Async functions (with mocked `fetch`):
- `fetchManufacturers` — successful response, caching, error handling
- `fetchDevices` — successful response, caching, error handling
- `fetchDeviceCSV` — successful response, error handling

### P6: Add Coverage Reporting (Medium Impact, Trivial Effort)

Add to `vitest.config.ts`:
```ts
coverage: {
  provider: 'v8',
  include: ['src/utils/**', 'src/store/**'],
  thresholds: { lines: 80 },
}
```

### P7: Component Tests (Lower Priority, Higher Effort)

Requires `jsdom` environment + ReactFlow test wrappers. Targeted candidates:
- **NodeEditor** — type change to DRUM auto-populates drum lanes
- **StudioCanvas** — connection validation (port type matching, no self-loops)
- **Sidebar** — preset data flows to `addNode` on drag

---

## Quick Reference: What Each Test File Covers

### `csvParser.test.ts` (22 tests)
- `cleanParamName`: prefix removal, abbreviations, truncation, edge cases
- `groupBySection` / `groupNRPNBySection`: grouping, defaults, empty input
- `parseCSVString`: full parse, dedup, sorting, name cleaning

### `loopDetection.test.ts` (14 tests)
- `detectCycle`: empty, linear, 2-node, 3-node, self-loop, disconnected, `localOff` flag
- `wouldCreateCycle`: safe/unsafe additions, indirect paths, empty graph, self-loop

### `studioExport.test.ts` (9 tests)
- `parseStudioData`: valid parse, automationLanes backfill, DrumLane migration,
  missing presets default, version/field/array/JSON errors, edge preservation

### `hapaxExport.test.ts` (34 tests — 14 failing)
- `findConnectedInstruments`: port mapping, CV/Gate combo, analog flags, skip logic
- `generateHapaxDefinition`: header, sections, CC/NRPN/ASSIGN/automation/drum formatting
- `generateAllDefinitions`: multi-instrument, track names, filenames, port suffixes

### `useStudioStore.test.ts` (6 tests)
- `clearStudio`: reset state, reset nodeIdCounter
- `setCustomPresets`: stores presets
- `importStudio`: with/without customPresets, nodeIdCounter sync
