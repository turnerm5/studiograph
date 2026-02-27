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

## Built With

- [React](https://react.dev) + TypeScript
- [ReactFlow](https://reactflow.dev) — node-graph canvas
- [Zustand](https://zustand.docs.pmnd.rs) — state management
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Vite](https://vite.dev) — build tooling
- [PapaParse](https://www.papaparse.com) — CSV parsing for MIDI specs
