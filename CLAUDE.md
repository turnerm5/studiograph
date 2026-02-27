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
```

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **@xyflow/react** (ReactFlow) — node-graph canvas for instrument routing
- **Zustand** — single store at `src/store/useStudioStore.ts`
- **Tailwind CSS 4** — dark theme, utility-first styling
- **PapaParse** — CSV parsing for MIDI CC/NRPN data
- **Lucide React** — icon library

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
- **Selection**: `selectedNodeId: string | null`
- **Loop detection**: `hasLoop: boolean`, `loopEdges: string[]` — recomputed via DFS on every edge change

Key actions:
- **Nodes**: `addNode`, `addNodeFromMidiGuide`, `removeNode`, `updateNodeData`, `updateNodeWidth`, `setSelectedNode`, `onNodesChange`
- **Edges**: `addEdge`, `removeEdge`, `onEdgesChange` — edges carry `portType` metadata and are color-coded
- **Ports**: `updateNodePortsAndCleanEdges` — updates ports and removes orphaned edges in one operation
- **MIDI data**: `uploadCCMap`, `clearCCMap`, `updateAssignCCs`, `updateAutomationLanes`, `updateDrumLanes`
- **System**: `checkForLoops`, `importStudio`

### Component Structure

- `src/components/Canvas/` — `StudioCanvas.tsx` (ReactFlow wrapper), `CustomEdge.tsx` (auto-routed edges)
- `src/components/Nodes/` — `InstrumentNode.tsx` (custom ReactFlow node with typed ports)
- `src/components/Panels/` — `NodeEditor.tsx` (right-side property editor)
- `src/components/Sidebar/` — `Sidebar.tsx`, `MidiGuideModal.tsx` (midi.guide browser)

### Type System (src/types/index.ts)

Core domain types:
- **PortType**: `'midi' | 'audio' | 'cv'` — connections are type-validated (MIDI↔MIDI only, etc.)
- **InstrumentNodeData**: name, manufacturer, channel, type (`POLY`/`DRUM`/`MPE`), ports, ccMap, nrpnMap, assignCCs, automationLanes, drumLanes, iconId, localOff, presetId, width
- **StudioEdge**: extends ReactFlow `Edge` with `data.portType` — IDs encode the full connection path
- **InstrumentPreset**: sidebar preset template — links to canvas nodes via `presetId` for edit propagation
- **CCMapping** / **NRPNMapping**: param names truncated to 12 chars for Hapax; `fullParamName` preserves originals
- **AssignCC**: 8 slots for Hapax ASSIGN encoders
- **AutomationLane**: up to 64 lanes, type-discriminated (`CC`/`PB`/`AT`/`CV`/`NRPN`)
- **DrumLane**: row → trig/chan/note mapping; `chan` supports MIDI channels, groups, CV outputs
- Port colors: MIDI In=green, MIDI Out=blue, Audio In=orange, Audio Out=red, CV=yellow

### Key Utilities (src/utils/)

- **loopDetection.ts** — DFS cycle detection on the routing graph; respects `localOff` flag to break intentional feedback loops
- **hapaxExport.ts** — generates Hapax `.txt` synth definition files (DRUMLANES, PC, CC, NRPN, ASSIGN, AUTOMATION sections); derives `OUTPORT` from Hapax edge source handles (`midi-a`→A, `midi-b`→B, `midi-c`→C, `usb-host`→USBH)
- **csvParser.ts** — parses midi.guide CSV data into CC/NRPN mappings; truncates param names to 12 chars (Hapax display limit); groups by section
- **studioExport.ts** — JSON save/load for entire studio layouts (versioned, currently v1); handles migration of older formats (backfills `automationLanes`, converts legacy `DrumLane.channel` to `trig`/`chan`)
- **midiGuideService.ts** — fetches instrument definitions from the pencilresearch/midi GitHub repo

### Data (src/data/)

- **defaultNodes.ts** — preset instruments (Hapax, Digitakt II, Digitone II, etc.) with pre-configured ports and CC maps

### Node Identity & Linking

- Hapax node has fixed ID `hapax-main` with `isHapax: true`, `isRemovable: false`
- User-added nodes get IDs `node-{counter}` (monotonic integer in module scope)
- Edge IDs encode the full path: `edge-{source}-{sourceHandle}-{target}-{targetHandle}`
- Canvas nodes link back to sidebar presets via `presetId` — edits to a preset in the sidebar propagate to its canvas node

## TypeScript Strictness

The project uses strict TypeScript with `noUnusedLocals` and `noUnusedParameters` enabled. The build (`tsc -b`) will fail on unused variables — prefix intentionally unused params with `_`.
