import { describe, it, expect, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { InstrumentNodeData, InstrumentPreset, StudioEdge } from '../../types';
import { useStudioStore } from '../../store/useStudioStore';
import { parseCSVString } from '../csvParser';
import { generateAllDefinitions } from '../hapaxExport';
import { parseStudioData } from '../studioExport';

// Mock localStorage for persist middleware
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

const makeNode = (id: string, name = 'Test', overrides?: Partial<InstrumentNodeData>): Node<InstrumentNodeData> => ({
  id,
  type: 'instrument',
  position: { x: 0, y: 0 },
  data: {
    name,
    manufacturer: 'Test',
    channel: 1,
    type: 'POLY',
    inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
    outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
    ccMap: [],
    nrpnMap: [],
    assignCCs: [],
    automationLanes: [],
    isHapax: false,
    isRemovable: true,
    ...overrides,
  },
});

const makeHapaxNode = (): Node<InstrumentNodeData> => makeNode('hapax-main', 'Hapax', {
  isHapax: true,
  isRemovable: false,
  outputs: [
    { id: 'midi-a', label: 'MIDI A', type: 'midi' },
    { id: 'midi-b', label: 'MIDI B', type: 'midi' },
    { id: 'usb-host', label: 'USB Host', type: 'usb' },
    { id: 'cv-1', label: 'CV 1', type: 'cv' },
    { id: 'gate-1', label: 'Gate 1', type: 'cv' },
  ],
  inputs: [{ id: 'midi-in-1', label: 'MIDI In 1', type: 'midi' }],
});

const makeEdge = (source: string, target: string, sourceHandle: string, targetHandle: string, portType: 'midi' | 'usb' | 'cv' | 'audio' = 'midi'): StudioEdge => ({
  id: `edge-${source}-${sourceHandle}-${target}-${targetHandle}`,
  source,
  target,
  sourceHandle,
  targetHandle,
  data: { portType },
  style: { stroke: '#3b82f6', strokeWidth: 2 },
});

describe('Integration: CSV import → store → Hapax export', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useStudioStore.getState().clearStudio();
  });

  const SAMPLE_CSV = `manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage
Korg,Minilogue,Filter,Cutoff,Filter cutoff frequency,43,,0,127,64,,,,,,,,
Korg,Minilogue,Filter,Resonance,Filter resonance,44,,0,127,0,,,,,,,,
Korg,Minilogue,Oscillator,VCO1 Pitch,VCO 1 pitch,34,,0,127,64,,,,,,,,
Korg,Minilogue,LFO,LFO Rate,LFO rate,24,,0,127,64,,,,,,,,`;

  it('parses CSV, creates node via store, connects to Hapax, and generates valid definition', async () => {
    // Step 1: Parse CSV
    const parsed = await parseCSVString(SAMPLE_CSV);
    expect(parsed.manufacturer).toBe('Korg');
    expect(parsed.device).toBe('Minilogue');
    expect(parsed.ccMap).toHaveLength(4);
    expect(parsed.ccMap[0].ccNumber).toBe(24); // sorted by CC number

    // Step 2: Add node to store via addNodeFromMidiGuide
    useStudioStore.getState().addNodeFromMidiGuide(
      {
        name: parsed.device,
        manufacturer: parsed.manufacturer,
        ccMap: parsed.ccMap,
        nrpnMap: parsed.nrpnMap,
        inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
        outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
      },
      { x: 200, y: 300 },
    );

    const state = useStudioStore.getState();
    const synthNode = state.nodes.find(n => n.id !== 'hapax-main');
    expect(synthNode).toBeDefined();
    const synthData = synthNode!.data as InstrumentNodeData;
    expect(synthData.name).toBe('Minilogue');
    expect(synthData.ccMap).toHaveLength(4);

    // Step 3: Connect to Hapax MIDI A
    useStudioStore.getState().addEdge(
      { source: 'hapax-main', target: synthNode!.id, sourceHandle: 'midi-a', targetHandle: 'midi-in-1' },
      'midi',
    );

    // Step 4: Generate Hapax definition
    const { nodes, edges } = useStudioStore.getState();
    const definitions = generateAllDefinitions(nodes, edges);

    expect(definitions).toHaveLength(1);
    expect(definitions[0].filename).toBe('Minilogue.txt');

    const content = definitions[0].content;
    expect(content).toContain('KORG MINILOGUE');
    expect(content).toContain('TRACKNAME Minilogue');
    expect(content).toContain('OUTPORT A');
    expect(content).toContain('OUTCHAN 1');
    expect(content).toContain('TYPE POLY');

    // CC section should have all 4 CCs organized by section
    expect(content).toContain('[CC]');
    expect(content).toContain('# Filter');
    expect(content).toContain('43 Cutoff');
    expect(content).toContain('44 Reso'); // "Resonance" abbreviated to "Reso"
    expect(content).toContain('# Oscillator');
    expect(content).toContain('34 VCO1Pitch');
    expect(content).toContain('# LFO');
    expect(content).toContain('24 LFORate');
    expect(content).toContain('[/CC]');
  });

  it('handles CSV with NRPN data and generates NRPN section', async () => {
    const csvWithNRPN = `manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage
DSI,Prophet 6,Oscillators,Osc Shape,Shape,,,,,,0,1,0,127,64,,,`;

    const parsed = await parseCSVString(csvWithNRPN);
    expect(parsed.nrpnMap).toHaveLength(1);
    expect(parsed.nrpnMap[0].msb).toBe(0);
    expect(parsed.nrpnMap[0].lsb).toBe(1);

    // Create a connected node and generate
    const nodes = [
      makeHapaxNode(),
      makeNode('node-1', 'Prophet 6', {
        manufacturer: 'DSI',
        channel: 3,
        nrpnMap: parsed.nrpnMap,
      }),
    ];
    const edges = [makeEdge('hapax-main', 'node-1', 'midi-b', 'midi-in-1')];
    const definitions = generateAllDefinitions(nodes, edges);

    expect(definitions).toHaveLength(1);
    expect(definitions[0].content).toContain('OUTPORT B');
    expect(definitions[0].content).toContain('OUTCHAN 3');
    expect(definitions[0].content).toContain('[NRPN]');
    expect(definitions[0].content).toContain('0:1:7 OscShape');
    expect(definitions[0].content).toContain('[/NRPN]');
  });

  it('end-to-end: DRUM type node with drum lanes exports DRUMLANES section', () => {
    const nodes = [
      makeHapaxNode(),
      makeNode('node-1', 'TR-8S', {
        manufacturer: 'Roland',
        channel: 10,
        type: 'DRUM',
        drumLanes: [
          { lane: 1, trig: null, chan: '10', note: 36, name: 'KICK' },
          { lane: 2, trig: null, chan: '10', note: 38, name: 'SNARE' },
          { lane: 3, trig: 60, chan: 'G1', note: null, name: 'CLAP' },
        ],
      }),
    ];
    const edges = [makeEdge('hapax-main', 'node-1', 'midi-a', 'midi-in-1')];
    const definitions = generateAllDefinitions(nodes, edges);

    const content = definitions[0].content;
    expect(content).toContain('TYPE DRUM');
    expect(content).toContain('[DRUMLANES]');
    // Drum lanes sorted descending by lane number
    expect(content).toContain('3:60:G1:NULL CLAP');
    expect(content).toContain('2:NULL:10:38 SNARE');
    expect(content).toContain('1:NULL:10:36 KICK');
    expect(content).toContain('[/DRUMLANES]');
  });

  it('end-to-end: ASSIGN and AUTOMATION sections', () => {
    const nodes = [
      makeHapaxNode(),
      makeNode('node-1', 'Bass Station', {
        manufacturer: 'Novation',
        channel: 2,
        assignCCs: [
          { slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 },
          { slot: 2, ccNumber: 71, paramName: 'Resonance', defaultValue: 0 },
        ],
        automationLanes: [
          { slot: 1, type: 'CC', ccNumber: 74 },
          { slot: 2, type: 'PB' },
          { slot: 3, type: 'AT' },
          { slot: 4, type: 'CV', cvNumber: 2 },
          { slot: 5, type: 'NRPN', nrpnMsb: 1, nrpnLsb: 23, nrpnDepth: 14 },
        ],
      }),
    ];
    const edges = [makeEdge('hapax-main', 'node-1', 'midi-a', 'midi-in-1')];
    const definitions = generateAllDefinitions(nodes, edges);

    const content = definitions[0].content;
    expect(content).toContain('[ASSIGN]');
    expect(content).toContain('74 Cutoff 64');
    expect(content).toContain('71 Resonance 0');
    expect(content).toContain('[/ASSIGN]');

    expect(content).toContain('[AUTOMATION]');
    expect(content).toContain('CC:74');
    expect(content).toContain('PB:');
    expect(content).toContain('AT:');
    expect(content).toContain('CV:2');
    expect(content).toContain('NRPN:1:23:14');
    expect(content).toContain('[/AUTOMATION]');
  });
});

describe('Integration: Studio export → import round-trip', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useStudioStore.getState().clearStudio();
  });

  it('preserves full node data through JSON export/import', () => {
    // Set up a studio with connected nodes
    const hapax = makeHapaxNode();
    const synth = makeNode('node-1', 'Prophet', {
      manufacturer: 'Sequential',
      channel: 5,
      type: 'POLY',
      ccMap: [{ ccNumber: 74, paramName: 'Cutoff', section: 'Filter' }],
      nrpnMap: [{ msb: 0, lsb: 1, paramName: 'Shape' }],
      assignCCs: [{ slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 }],
      automationLanes: [{ slot: 1, type: 'CC', ccNumber: 74 }],
    });
    const nodes = [hapax, synth];
    const edges = [makeEdge('hapax-main', 'node-1', 'midi-a', 'midi-in-1')];
    const presets: InstrumentPreset[] = [{
      id: 'prophet-preset',
      name: 'Prophet',
      manufacturer: 'Sequential',
      type: 'POLY',
      inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
      outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
    }];

    // Serialize
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      nodes,
      edges,
      customPresets: presets,
    };
    const json = JSON.stringify(exportData);

    // Deserialize
    const imported = parseStudioData(json);

    expect(imported.nodes).toHaveLength(2);
    expect(imported.edges).toHaveLength(1);
    expect(imported.customPresets).toHaveLength(1);

    const importedSynth = imported.nodes.find(n => n.id === 'node-1')!;
    const data = importedSynth.data as InstrumentNodeData;
    expect(data.name).toBe('Prophet');
    expect(data.manufacturer).toBe('Sequential');
    expect(data.channel).toBe(5);
    expect(data.ccMap).toHaveLength(1);
    expect(data.nrpnMap).toHaveLength(1);
    expect(data.assignCCs).toHaveLength(1);
    expect(data.automationLanes).toHaveLength(1);

    // Import into store and verify Hapax export still works
    useStudioStore.getState().importStudio(imported.nodes, imported.edges, imported.customPresets);
    const { nodes: storeNodes, edges: storeEdges } = useStudioStore.getState();
    const definitions = generateAllDefinitions(storeNodes, storeEdges);
    expect(definitions).toHaveLength(1);
    expect(definitions[0].content).toContain('SEQUENTIAL PROPHET');
    expect(definitions[0].content).toContain('74 Cutoff');
  });

  it('handles multi-hop routing through intermediary nodes', () => {
    // Hapax → Thru Box → Synth (synth is reachable via MIDI chain)
    const hapax = makeHapaxNode();
    const thruBox = makeNode('node-1', 'MIDI Thru', {
      inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
      outputs: [
        { id: 'midi-out-1', label: 'MIDI Out 1', type: 'midi' },
        { id: 'midi-out-2', label: 'MIDI Out 2', type: 'midi' },
      ],
    });
    const synth = makeNode('node-2', 'Synth', {
      manufacturer: 'Moog',
      channel: 1,
      ccMap: [{ ccNumber: 74, paramName: 'Cutoff' }],
    });

    const nodes = [hapax, thruBox, synth];
    const edges = [
      makeEdge('hapax-main', 'node-1', 'midi-a', 'midi-in-1'),
      makeEdge('node-1', 'node-2', 'midi-out-1', 'midi-in-1'),
    ];

    const definitions = generateAllDefinitions(nodes, edges);

    // Both nodes should get definitions (multi-hop routing)
    const thruDef = definitions.find(d => d.nodeId === 'node-1');
    const synthDef = definitions.find(d => d.nodeId === 'node-2');

    expect(thruDef).toBeDefined();
    expect(thruDef!.content).toContain('OUTPORT A');

    expect(synthDef).toBeDefined();
    expect(synthDef!.content).toContain('OUTPORT A');
    expect(synthDef!.content).toContain('MOOG SYNTH');
    expect(synthDef!.content).toContain('74 Cutoff');
  });
});
