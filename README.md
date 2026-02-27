# StudioGraph

A visual MIDI studio designer for planning instrument routing, managing CC/NRPN definitions, and exporting synthesizer configurations for the Squarp Hapax sequencer.

## Features

- **Visual routing canvas** — drag-and-drop instruments onto a node graph and connect MIDI, audio, and CV ports with type-safe wiring
- **Loop detection** — real-time DFS-based cycle detection warns about MIDI feedback loops, with support for intentional Local Off breaks
- **midi.guide integration** — browse and import CC/NRPN definitions from the [midi.guide](https://midi.guide) database directly into your instruments
- **Hapax export** — generate `.txt` synth definition files with DRUMLANES, PC, CC, NRPN, and ASSIGN sections ready for your Hapax
- **Studio save/load** — export and import your entire studio layout as JSON
- **Preset instruments** — ships with preconfigured Hapax, Digitakt II, Digitone II, and more

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to start designing your studio.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Internal Data Model

All application state lives in a single Zustand store (`src/store/useStudioStore.ts`). The store holds two primary collections — **nodes** and **edges** — which together form the studio routing graph.

### Nodes (`Node<InstrumentNodeData>[]`)

Each instrument on the canvas is a ReactFlow `Node` whose `data` payload is an `InstrumentNodeData` object:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Instrument display name |
| `manufacturer` | `string` | Manufacturer name |
| `channel` | `number` | MIDI channel (1–16) |
| `type` | `'POLY' \| 'DRUM' \| 'MPE'` | Hapax track type |
| `inputs` | `Port[]` | Input port definitions |
| `outputs` | `Port[]` | Output port definitions |
| `ccMap` | `CCMapping[]` | CC parameter mappings |
| `nrpnMap` | `NRPNMapping[]` | NRPN parameter mappings |
| `assignCCs` | `AssignCC[]` | Up to 8 Hapax ASSIGN slots |
| `automationLanes` | `AutomationLane[]` | Up to 64 automation lane configs |
| `drumLanes` | `DrumLane[]` (optional) | Drum pad → note/channel mappings (DRUM type only) |
| `isHapax` | `boolean` (optional) | Marks the central Hapax sequencer node |
| `isRemovable` | `boolean` (optional) | `false` prevents deletion (Hapax node) |
| `width` | `number` (optional) | User-set node width from resize handle |
| `iconId` | `string` (optional) | Icon key into the icon map (e.g. `'drum'`, `'piano'`) |
| `localOff` | `boolean` (optional) | Breaks feedback loops in cycle detection |
| `presetId` | `string` (optional) | Links canvas node back to its sidebar preset for edit propagation |

Node IDs follow the pattern `hapax-main` for the fixed Hapax node and `node-{counter}` for user-added instruments. The counter is a monotonically increasing integer tracked in module scope.

### Ports

Each node has `inputs` and `outputs` arrays of `Port` objects:

```ts
{ id: string, label: string, type: 'midi' | 'audio' | 'cv' }
```

Port IDs are used as ReactFlow handle IDs (e.g. `midi-a`, `midi-in`, `audio-out-1`). Connections are type-validated — a MIDI output can only connect to a MIDI input.

### Edges (`StudioEdge[]`)

Edges extend ReactFlow's `Edge` with port type metadata:

```ts
{ id, source, target, sourceHandle, targetHandle, data: { portType: 'midi' | 'audio' | 'cv' } }
```

Edge IDs encode the full connection: `edge-{sourceNodeId}-{sourceHandle}-{targetNodeId}-{targetHandle}`. Edge colors are determined by port type (green for MIDI, orange for audio, yellow for CV).

### CC Mappings

Each `CCMapping` stores a single MIDI CC parameter definition:

```ts
{ ccNumber: number, paramName: string, fullParamName?: string, section?: string, defaultValue?: number }
```

`paramName` is truncated to 12 characters (Hapax display limit). `fullParamName` preserves the original untruncated name for the UI. `section` groups parameters under headings in the Hapax export.

### NRPN Mappings

```ts
{ msb: number, lsb: number, paramName: string, section?: string, defaultValue?: number }
```

Exported as `{msb}:{lsb}:7 {paramName}` in the Hapax definition format (7-bit depth default).

### ASSIGN CCs

Up to 8 slots mapping CC numbers to the Hapax's ASSIGN encoders:

```ts
{ slot: number, ccNumber: number, paramName: string, defaultValue: number }
```

### Automation Lanes

Up to 64 lanes, each with a type discriminator:

```ts
{ slot: number, type: 'CC' | 'PB' | 'AT' | 'CV' | 'NRPN', ccNumber?, cvNumber?, nrpnMsb?, nrpnLsb?, nrpnDepth?, paramName? }
```

Exported as `CC:74`, `PB:`, `AT:`, `CV:2`, or `NRPN:0:42:7` depending on type.

### Drum Lanes

For `DRUM` type instruments, each lane maps a row to a trigger/channel/note:

```ts
{ lane: number, trig: number | null, chan: string | null, note: number | null, name: string }
```

`chan` accepts MIDI channels (`"1"`–`"16"`), Hapax groups (`"G1"`–`"G4"`), CV outputs (`"CV1"`–`"CV4"`), or CV groups (`"CVG1"`–`"CVG4"`). Exported as `{row}:{trig}:{chan}:{note} {name}` with nulls becoming `NULL`.

### Loop Detection State

The store tracks `hasLoop: boolean` and `loopEdges: string[]`. These are recomputed via DFS (`src/utils/loopDetection.ts`) whenever edges change. Nodes with `localOff: true` break cycles — the algorithm skips outgoing edges from those nodes.

---

## Serialization Formats

### Studio Export (JSON)

The full studio layout is saved/loaded as a versioned JSON file:

```json
{
  "version": 1,
  "exportedAt": "2026-02-27T...",
  "nodes": [ ... ],
  "edges": [ ... ],
  "customPresets": [ ... ]
}
```

On import, older files are migrated: missing `automationLanes` arrays are backfilled, and legacy `DrumLane` objects (which used a `channel` field instead of `trig`/`chan`) are converted to the current schema.

### Hapax Export (`.txt`)

Each instrument connected to a Hapax MIDI output generates a Hapax synth definition file. The connection's source handle determines `OUTPORT` (`midi-a` → `A`, `midi-b` → `B`, `midi-c` → `C`, `usb-host` → `USBH`). File structure:

```
############# MANUFACTURER NAME #############
VERSION 1
TRACKNAME <name, max 12 chars, no spaces>
TYPE <POLY|DRUM|MPE>
OUTPORT <A|B|C|USBH>
OUTCHAN <1-16>

[DRUMLANES]
<row>:<trig>:<chan>:<note> <name>
[/DRUMLANES]

[PC]
[/PC]

[CC]
# <section>
<ccNumber> <paramName>
[/CC]

[NRPN]
<msb>:<lsb>:7 <paramName>
[/NRPN]

[ASSIGN]
<ccNumber> <paramName> <defaultValue>
[/ASSIGN]

[AUTOMATION]
<type>:<value>
[/AUTOMATION]

[COMMENT]
<manufacturer> <name>
Generated by StudioGraph
[/COMMENT]
```

---

## Built With

- [React](https://react.dev) + TypeScript
- [ReactFlow](https://reactflow.dev) — node-graph canvas
- [Zustand](https://zustand.docs.pmnd.rs) — state management
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Vite](https://vite.dev) — build tooling
- [PapaParse](https://www.papaparse.com) — CSV parsing for MIDI specs
