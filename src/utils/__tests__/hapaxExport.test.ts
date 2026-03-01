import type { Node, Edge } from '@xyflow/react';
import type { InstrumentNodeData, HapaxDefinition } from '../../types';
import { findConnectedInstruments, generateHapaxDefinition, generateAllDefinitions } from '../hapaxExport';

function makeNode(id: string, overrides?: Partial<InstrumentNodeData>): Node<InstrumentNodeData> {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      name: 'TestSynth',
      manufacturer: 'TestMfr',
      channel: 1,
      type: 'POLY',
      inputs: [],
      outputs: [],
      ccMap: [],
      nrpnMap: [],
      assignCCs: [],
      automationLanes: [],
      ...overrides,
    },
  };
}

function makeHapaxNode(): Node<InstrumentNodeData> {
  return makeNode('hapax-main', {
    name: 'Hapax',
    manufacturer: 'Squarp',
    isHapax: true,
    isRemovable: false,
  });
}

function makeEdge(id: string, source: string, target: string, sourceHandle?: string, portType: 'midi' | 'usb' | 'cv' = 'midi'): Edge {
  return { id, source, target, sourceHandle, data: { portType } };
}

function minimalDefinition(overrides?: Partial<HapaxDefinition>): HapaxDefinition {
  return {
    name: 'TestSynth',
    manufacturer: 'TestMfr',
    trackName: 'TestSynth',
    type: 'POLY',
    outPort: 'A',
    outChannel: 1,
    ccMappings: [],
    nrpnMappings: [],
    assignCCs: [],
    automationLanes: [],
    ...overrides,
  };
}

describe('findConnectedInstruments', () => {
  it('finds instrument connected to Hapax midi-a', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'midi-a')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].hapaxPort).toBe('A');
    expect(result[0].node.id).toBe('node-1');
  });

  it('maps midi-b to port B', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'midi-b')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result[0].hapaxPort).toBe('B');
  });

  it('maps midi-c to port C', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'midi-c')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result[0].hapaxPort).toBe('C');
  });

  it('maps midi-d to port D', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'midi-d')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result[0].hapaxPort).toBe('D');
  });

  it('maps usb-host to port USBH', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'usb-host', 'usb')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result[0].hapaxPort).toBe('USBH');
  });

  it('maps cv-1 to port CV1 with isAnalog', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'cv-1', 'cv')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].hapaxPort).toBe('CV1');
    expect(result[0].isAnalog).toBe(true);
  });

  it('skips edges not originating from Hapax', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1'), makeNode('node-2')];
    const edges = [makeEdge('e1', 'node-1', 'node-2', 'midi-a')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(0);
  });

  it('returns empty when no Hapax node exists', () => {
    const nodes = [makeNode('node-1'), makeNode('node-2')];
    const edges = [makeEdge('e1', 'node-1', 'node-2', 'midi-a')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(0);
  });

  it('finds multiple connected instruments', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1'), makeNode('node-2')];
    const edges = [
      makeEdge('e1', 'hapax-main', 'node-1', 'midi-a'),
      makeEdge('e2', 'hapax-main', 'node-2', 'midi-b'),
    ];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(2);
  });

  it('maps usb-device to port USBD', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'usb-device', 'usb')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].hapaxPort).toBe('USBD');
    expect(result[0].isAnalog).toBe(false);
  });

  it('maps gate-2 to port G2 with isAnalog', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'gate-2', 'cv')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].hapaxPort).toBe('G2');
    expect(result[0].isAnalog).toBe(true);
  });

  it('combines cv-1 + gate-1 to same target into CVG1', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [
      makeEdge('e1', 'hapax-main', 'node-1', 'cv-1', 'cv'),
      makeEdge('e2', 'hapax-main', 'node-1', 'gate-1', 'cv'),
    ];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].hapaxPort).toBe('CVG1');
    expect(result[0].isAnalog).toBe(true);
  });

  it('does not combine cv-1 + gate-2 (different N)', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [
      makeEdge('e1', 'hapax-main', 'node-1', 'cv-1', 'cv'),
      makeEdge('e2', 'hapax-main', 'node-1', 'gate-2', 'cv'),
    ];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(2);
    const ports = result.map(r => r.hapaxPort).sort();
    expect(ports).toEqual(['CV1', 'G2']);
  });

  it('does not combine cv + gate going to different targets', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1'), makeNode('node-2')];
    const edges = [
      makeEdge('e1', 'hapax-main', 'node-1', 'cv-1', 'cv'),
      makeEdge('e2', 'hapax-main', 'node-2', 'gate-1', 'cv'),
    ];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(2);
    expect(result.find(r => r.node.id === 'node-1')?.hapaxPort).toBe('CV1');
    expect(result.find(r => r.node.id === 'node-2')?.hapaxPort).toBe('G1');
  });

  it('sets isAnalog false for MIDI ports', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'midi-a')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result[0].isAnalog).toBe(false);
  });

  it('skips unrecognized handles', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'unknown-port')];
    const result = findConnectedInstruments(nodes, edges);
    expect(result).toHaveLength(0);
  });
});

describe('generateHapaxDefinition', () => {
  it('produces correct header for minimal POLY instrument', () => {
    const output = generateHapaxDefinition(minimalDefinition());
    expect(output).toContain('TESTMFR TESTSYNTH');
    expect(output).toContain('VERSION 1');
    expect(output).toContain('TRACKNAME TestSynth');
    expect(output).toContain('TYPE POLY');
    expect(output).toContain('OUTPORT A');
    expect(output).toContain('OUTCHAN 1');
  });

  it('includes empty section markers', () => {
    const output = generateHapaxDefinition(minimalDefinition());
    expect(output).toContain('[DRUMLANES]');
    expect(output).toContain('[/DRUMLANES]');
    expect(output).toContain('[PC]');
    expect(output).toContain('[/PC]');
    expect(output).toContain('[CC]');
    expect(output).toContain('[/CC]');
    expect(output).toContain('[NRPN]');
    expect(output).toContain('[/NRPN]');
    expect(output).toContain('[ASSIGN]');
    expect(output).toContain('[/ASSIGN]');
    expect(output).toContain('[AUTOMATION]');
    expect(output).toContain('[/AUTOMATION]');
  });

  it('renders CC mappings grouped by section', () => {
    const def = minimalDefinition({
      ccMappings: [
        { ccNumber: 74, paramName: 'FltCutoff', section: 'Filter' },
        { ccNumber: 71, paramName: 'FltReso', section: 'Filter' },
        { ccNumber: 5, paramName: 'Portamento', section: 'Global' },
      ],
    });
    const output = generateHapaxDefinition(def);
    expect(output).toContain('# Filter');
    expect(output).toContain('74 FltCutoff');
    expect(output).toContain('71 FltReso');
    expect(output).toContain('# Global');
    expect(output).toContain('5 Portamento');
  });

  it('renders NRPN mappings with msb:lsb:7 format', () => {
    const def = minimalDefinition({
      nrpnMappings: [
        { msb: 0, lsb: 42, paramName: 'OscShape', section: 'Oscillator' },
      ],
    });
    const output = generateHapaxDefinition(def);
    expect(output).toContain('# Oscillator');
    expect(output).toContain('0:42:7 OscShape');
  });

  it('renders ASSIGN CCs', () => {
    const def = minimalDefinition({
      assignCCs: [
        { slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 },
        { slot: 2, ccNumber: 71, paramName: 'Reso', defaultValue: 0 },
      ],
    });
    const output = generateHapaxDefinition(def);
    expect(output).toContain('74 Cutoff 64');
    expect(output).toContain('71 Reso 0');
  });

  it('renders automation lanes with type-specific formats', () => {
    const def = minimalDefinition({
      automationLanes: [
        { slot: 1, type: 'CC', ccNumber: 74 },
        { slot: 2, type: 'PB' },
        { slot: 3, type: 'AT' },
        { slot: 4, type: 'CV', cvNumber: 2 },
        { slot: 5, type: 'NRPN', nrpnMsb: 1, nrpnLsb: 42, nrpnDepth: 7 },
      ],
    });
    const output = generateHapaxDefinition(def);
    expect(output).toContain('CC:74');
    expect(output).toContain('PB:');
    expect(output).toContain('AT:');
    expect(output).toContain('CV:2');
    expect(output).toContain('NRPN:1:42:7');
  });

  it('renders DRUM lanes sorted descending by lane number', () => {
    const def = minimalDefinition({
      type: 'DRUM',
      drumLanes: [
        { lane: 1, trig: 36, chan: '10', note: 36, name: 'Kick' },
        { lane: 3, trig: 42, chan: '10', note: 42, name: 'HiHat' },
        { lane: 2, trig: 38, chan: '10', note: 38, name: 'Snare' },
      ],
    });
    const output = generateHapaxDefinition(def);
    const drumSection = output.split('[DRUMLANES]')[1].split('[/DRUMLANES]')[0];
    const lines = drumSection.trim().split('\n');
    // Lane 3 first, then 2, then 1
    expect(lines[0]).toContain('3:42:10:42 HiHat');
    expect(lines[1]).toContain('2:38:10:38 Snare');
    expect(lines[2]).toContain('1:36:10:36 Kick');
  });

  it('handles null trig/chan/note in drum lanes', () => {
    const def = minimalDefinition({
      type: 'DRUM',
      drumLanes: [
        { lane: 1, trig: null, chan: null, note: null, name: 'Empty' },
      ],
    });
    const output = generateHapaxDefinition(def);
    expect(output).toContain('1:NULL:NULL:NULL Empty');
  });

  it('includes COMMENT section with manufacturer and name', () => {
    const output = generateHapaxDefinition(minimalDefinition());
    expect(output).toContain('[COMMENT]');
    expect(output).toContain('TestMfr TestSynth');
    expect(output).toContain('Generated by StudioGraph');
  });

  it('renders OUTCHAN NULL for analog definitions', () => {
    const def = minimalDefinition({ outChannel: 'NULL', outPort: 'CV1' });
    const output = generateHapaxDefinition(def);
    expect(output).toContain('OUTCHAN NULL');
    expect(output).toContain('OUTPORT CV1');
  });
});

describe('generateAllDefinitions', () => {
  it('generates definitions for all Hapax-connected instruments', () => {
    const nodes = [
      makeHapaxNode(),
      makeNode('node-1', { name: 'Synth One', manufacturer: 'Mfr' }),
      makeNode('node-2', { name: 'Synth Two', manufacturer: 'Mfr' }),
    ];
    const edges = [
      makeEdge('e1', 'hapax-main', 'node-1', 'midi-a'),
      makeEdge('e2', 'hapax-main', 'node-2', 'midi-b'),
    ];
    const result = generateAllDefinitions(nodes, edges);
    expect(result).toHaveLength(2);
    expect(result[0].nodeId).toBe('node-1');
    expect(result[1].nodeId).toBe('node-2');
  });

  it('cleans track name: removes spaces, truncates to 12 chars', () => {
    const nodes = [
      makeHapaxNode(),
      makeNode('node-1', { name: 'Very Long Synth Name Here' }),
    ];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'midi-a')];
    const result = generateAllDefinitions(nodes, edges);
    const content = result[0].content;
    // "VeryLongSynthNameHere" → truncated to 12 → "VeryLongSynt"
    expect(content).toContain('TRACKNAME VeryLongSynt');
  });

  it('generates sanitized filenames', () => {
    const nodes = [
      makeHapaxNode(),
      makeNode('node-1', { name: 'My Synth! #2' }),
    ];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'midi-a')];
    const result = generateAllDefinitions(nodes, edges);
    expect(result[0].filename).toBe('My_Synth___2.txt');
  });

  it('returns empty for no connected instruments', () => {
    const nodes = [makeHapaxNode()];
    const result = generateAllDefinitions(nodes, []);
    expect(result).toHaveLength(0);
  });

  it('sets OUTCHAN NULL for analog connections', () => {
    const nodes = [
      makeHapaxNode(),
      makeNode('node-1', { name: 'Synth', channel: 5 }),
    ];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'cv-1', 'cv')];
    const result = generateAllDefinitions(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('OUTCHAN NULL');
    expect(result[0].content).toContain('OUTPORT CV1');
  });

  it('appends port suffix to filename when node has multiple connections', () => {
    const nodes = [
      makeHapaxNode(),
      makeNode('node-1', { name: 'MySynth' }),
    ];
    const edges = [
      makeEdge('e1', 'hapax-main', 'node-1', 'midi-a'),
      makeEdge('e2', 'hapax-main', 'node-1', 'cv-1', 'cv'),
    ];
    const result = generateAllDefinitions(nodes, edges);
    expect(result).toHaveLength(2);
    const filenames = result.map(r => r.filename).sort();
    expect(filenames).toEqual(['MySynth_A.txt', 'MySynth_CV1.txt']);
  });

  it('appends port suffix to track name when node has multiple connections', () => {
    const nodes = [
      makeHapaxNode(),
      makeNode('node-1', { name: 'MySynth' }),
    ];
    const edges = [
      makeEdge('e1', 'hapax-main', 'node-1', 'midi-a'),
      makeEdge('e2', 'hapax-main', 'node-1', 'cv-1', 'cv'),
    ];
    const result = generateAllDefinitions(nodes, edges);
    const midiDef = result.find(r => r.filename.includes('_A'));
    const cvDef = result.find(r => r.filename.includes('_CV1'));
    expect(midiDef?.content).toContain('TRACKNAME MySynth_A');
    expect(cvDef?.content).toContain('TRACKNAME MySynth_CV');
  });

  it('does not append port suffix for single-connection nodes', () => {
    const nodes = [
      makeHapaxNode(),
      makeNode('node-1', { name: 'MySynth' }),
    ];
    const edges = [makeEdge('e1', 'hapax-main', 'node-1', 'midi-a')];
    const result = generateAllDefinitions(nodes, edges);
    expect(result[0].filename).toBe('MySynth.txt');
    expect(result[0].content).toContain('TRACKNAME MySynth');
  });
});
