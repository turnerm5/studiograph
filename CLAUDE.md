# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StudioGraph is a MIDI studio routing designer — a visual tool for mapping MIDI instrument connections, managing CC/NRPN definitions, and exporting synthesizer configurations for the Squarp Hapax sequencer. Built as a single-page React app with a node-graph canvas.

## Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript check (tsc -b) + Vite production build
npm run lint       # ESLint (flat config, ESLint 9+)
npm run preview    # Preview production build locally
npm run test       # Run tests once (vitest run)
npm run test:watch # Run tests in watch mode (vitest)
```

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **@xyflow/react** (ReactFlow) — node-graph canvas for instrument routing
- **Zustand** — single store at `src/store/useStudioStore.ts` with `persist` middleware
- **Tailwind CSS 4** — dark theme, utility-first styling
- **Vitest 4** — unit testing
- **PapaParse** — CSV parsing for MIDI CC/NRPN data
- **Lucide React** — icon library
- **@vercel/analytics** — usage analytics

## Architecture

### Layout (App.tsx)

Three-column layout, all managed in a single view (no router):

```
┌──────────┬─────────────────────┬────────────┐
│ Sidebar  │   StudioCanvas      │ NodeEditor │
│ (256px)  │   (ReactFlow)       │ (320px,    │
│          │                     │  conditional)│
└──────────┴─────────────────────┴────────────┘
```

- **Sidebar** — instrument library, drag-to-canvas, import/export, midi.guide browser
- **StudioCanvas** — ReactFlow canvas with custom nodes/edges, loop detection overlay
- **NodeEditor** — appears when a node is selected; edit ports, CC maps, NRPN, ASSIGN CCs

### State (Zustand Store)

Single store `useStudioStore` manages:

- **Graph data**: `nodes: Node<InstrumentNodeData>[]`, `edges: StudioEdge[]`
- **Presets**: `customPresets: InstrumentPreset[]`
- **Selection**: `selectedNodeId: string | null`
- **Loop detection**: `hasLoop: boolean`, `loopEdges: string[]` — recomputed via DFS on every edge change

Key actions:
- **Nodes**: `addNode`, `addNodeFromMidiGuide`, `removeNode`, `updateNodeData`, `updateNodeWidth`, `setSelectedNode`, `onNodesChange`
- **Edges**: `addEdge`, `removeEdge`, `onEdgesChange` — edges carry `portType` metadata and are color-coded
- **Ports**: `updateNodePortsAndCleanEdges` — updates ports and removes orphaned edges in one operation
- **MIDI data**: `uploadCCMap`, `clearCCMap`, `updateAssignCCs`, `updateAutomationLanes`, `updateDrumLanes`
- **System**: `checkForLoops`, `importStudio`, `clearStudio`, `setCustomPresets`

Persistence: uses Zustand `persist` middleware with localStorage key `studiograph-studio`. Only `nodes`, `edges`, and `customPresets` are persisted. The `onRehydrateStorage` hook handles migrations (USB port renames, Hapax port backfills, edge ID updates).

### Component Structure

- `src/components/Canvas/` — `StudioCanvas.tsx` (ReactFlow wrapper), `CustomEdge.tsx` (auto-routed edges)
- `src/components/Nodes/` — `InstrumentNode.tsx` (custom ReactFlow node with typed ports)
- `src/components/Panels/` — `NodeEditor.tsx` (right-side property editor), `PortInfo.tsx`, `AssignCCEditor.tsx`, `AutomationEditor.tsx`, `DrumLanesEditor.tsx` (sub-editors)
- `src/components/Sidebar/` — `Sidebar.tsx`, `MidiGuideModal.tsx` (midi.guide browser)

### Type System (src/types/index.ts)

Core domain types:
- **PortType**: `'midi' | 'audio' | 'cv' | 'usb'` — connections are type-validated (same-type only)
- **InstrumentNodeData**: name, manufacturer, channel, type (`POLY`/`DRUM`/`MPE`), ports, ccMap, nrpnMap, assignCCs, automationLanes, drumLanes, iconId, localOff, presetId, width, showCVPorts
- **StudioEdge**: extends ReactFlow `Edge` with `data.portType` and optional `data.routingOffset` — IDs encode the full connection path
- **InstrumentPreset**: sidebar preset template — links to canvas nodes via `presetId` for edit propagation; supports `defaultDrumLanes`
- **CCMapping** / **NRPNMapping**: param names truncated to 12 chars for Hapax; `fullParamName` preserves originals
- **AssignCC**: 8 slots for Hapax ASSIGN encoders
- **AutomationLane**: up to 64 lanes, type-discriminated (`CC`/`PB`/`AT`/`CV`/`NRPN`)
- **DrumLane**: row → trig/chan/note mapping; `chan` supports MIDI channels, groups, CV outputs
- Port colors: MIDI In=green, MIDI Out=blue, Audio In=orange, Audio Out=red, CV In=yellow, CV Out=purple, USB=cyan

### Key Utilities (src/utils/)

- **loopDetection.ts** — DFS cycle detection on the routing graph; respects `localOff` flag to break intentional feedback loops
- **hapaxExport.ts** — generates Hapax `.txt` synth definition files (DRUMLANES, PC, CC, NRPN, ASSIGN, AUTOMATION sections); derives `OUTPORT` from Hapax edge source handles (`midi-a`→A, `midi-b`→B, `midi-c`→C, `midi-d`→D, `usb-host`→USBH, `usb-device`→USBD, plus CV/Gate mappings)
- **hapaxRouting.ts** — BFS routing trace from Hapax node following MIDI/USB edges; `traceHapaxRouting()` returns `Map<nodeId, sourceHandles[]>` used by `InstrumentNode` for port visualization
- **csvParser.ts** — parses midi.guide CSV data into CC/NRPN mappings; truncates param names to 12 chars (Hapax display limit); groups by section
- **studioExport.ts** — JSON save/load for entire studio layouts (versioned, currently v1); handles migration of older formats (backfills `automationLanes`, converts legacy `DrumLane.channel` to `trig`/`chan`, renames USB ports)
- **midiGuideService.ts** — fetches instrument definitions from the pencilresearch/midi GitHub repo

### Data (src/data/)

- **defaultNodes.ts** — `HAPAX_PRESET` (initial Hapax node with 4 MIDI out, USB device/host, 8 CV/Gate ports), `DEFAULT_DRUM_LANES` (auto-populated on DRUM type switch), `PORT_COLORS`, `EDGE_COLORS`

### Node Identity & Linking

- Hapax node has fixed ID `hapax-main` with `isHapax: true`, `isRemovable: false`
- User-added nodes get IDs `node-{counter}` (monotonic integer in module scope)
- Edge IDs encode the full path: `edge-{source}-{sourceHandle}-{target}-{targetHandle}`
- Canvas nodes link back to sidebar presets via `presetId` — edits to a preset in the sidebar propagate to its canvas node

## TypeScript Strictness

The project uses strict TypeScript with `noUnusedLocals` and `noUnusedParameters` enabled. The build (`tsc -b`) will fail on unused variables — prefix intentionally unused params with `_`.
