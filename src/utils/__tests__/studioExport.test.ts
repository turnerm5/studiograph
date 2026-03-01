import type { Node } from '@xyflow/react';
import type { InstrumentNodeData, InstrumentPreset, StudioEdge } from '../../types';
import { parseStudioData } from '../studioExport';
import type { StudioExport } from '../studioExport';

function makeValidExport(overrides?: Partial<StudioExport>): StudioExport {
  return {
    version: 1,
    exportedAt: '2025-01-01T00:00:00.000Z',
    nodes: [
      {
        id: 'hapax-main',
        position: { x: 0, y: 0 },
        data: {
          name: 'Hapax',
          manufacturer: 'Squarp',
          channel: 1,
          type: 'POLY',
          inputs: [],
          outputs: [],
          ccMap: [],
          nrpnMap: [],
          assignCCs: [],
          automationLanes: [],
          isHapax: true,
          isRemovable: false,
        },
      },
    ] as Node<InstrumentNodeData>[],
    edges: [] as StudioEdge[],
    customPresets: [],
    ...overrides,
  };
}

describe('parseStudioData', () => {
  it('parses valid v1 JSON correctly', () => {
    const exportData = makeValidExport();
    const result = parseStudioData(JSON.stringify(exportData));

    expect(result.version).toBe(1);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
    expect(result.customPresets).toHaveLength(0);
    expect(result.nodes[0].id).toBe('hapax-main');
  });

  it('backfills missing automationLanes to empty array', () => {
    const exportData = makeValidExport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (exportData.nodes[0].data as any).automationLanes;
    const result = parseStudioData(JSON.stringify(exportData));

    expect(result.nodes[0].data.automationLanes).toEqual([]);
  });

  it('migrates legacy DrumLane channel format to trig/chan fields', () => {
    const exportData = makeValidExport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (exportData.nodes[0].data as any).drumLanes = [
      { channel: 3, note: 36, name: 'Kick' },
    ];
    const result = parseStudioData(JSON.stringify(exportData));

    const lane = result.nodes[0].data.drumLanes![0];
    expect(lane.lane).toBe(3); // falls back to channel value
    expect(lane.trig).toBeNull();
    expect(lane.chan).toBeNull();
    expect(lane.note).toBe(36);
    expect(lane.name).toBe('Kick');
  });

  it('defaults missing customPresets to empty array', () => {
    const exportData = makeValidExport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (exportData as any).customPresets;
    const result = parseStudioData(JSON.stringify(exportData));

    expect(result.customPresets).toEqual([]);
  });

  it('throws error for unsupported version', () => {
    const exportData = makeValidExport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (exportData as any).version = 2;

    expect(() => parseStudioData(JSON.stringify(exportData))).toThrow(
      'Unsupported file version: 2'
    );
  });

  it('throws error for missing required fields', () => {
    expect(() => parseStudioData(JSON.stringify({ version: 1 }))).toThrow(
      'missing required fields'
    );
  });

  it('throws error for non-array nodes', () => {
    expect(() =>
      parseStudioData(JSON.stringify({ version: 1, nodes: 'not-an-array', edges: [] }))
    ).toThrow('nodes and edges must be arrays');
  });

  it('throws error for malformed JSON', () => {
    expect(() => parseStudioData('not valid json {{{')).toThrow();
  });

  it('preserves edges from valid export', () => {
    const exportData = makeValidExport({
      edges: [
        { id: 'e1', source: 'hapax-main', target: 'node-1', data: { portType: 'midi' } },
      ] as StudioEdge[],
    });
    const result = parseStudioData(JSON.stringify(exportData));

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].id).toBe('e1');
  });

  it('backfills showCVPorts to false when missing', () => {
    const exportData = makeValidExport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (exportData.nodes[0].data as any).showCVPorts;
    const result = parseStudioData(JSON.stringify(exportData));
    expect(result.nodes[0].data.showCVPorts).toBe(false);
  });

  it('migrates Hapax usb-device-out to usb-device in outputs', () => {
    const exportData = makeValidExport();
    exportData.nodes[0].data.outputs = [
      { id: 'midi-a', label: 'MIDI A', type: 'midi' },
      { id: 'midi-b', label: 'MIDI B', type: 'midi' },
      { id: 'midi-c', label: 'MIDI C', type: 'midi' },
      { id: 'midi-d', label: 'MIDI D', type: 'midi' },
      { id: 'usb-host', label: 'USB Host', type: 'usb' },
      { id: 'usb-device-out', label: 'USB Device', type: 'usb' },
    ];
    const result = parseStudioData(JSON.stringify(exportData));
    const outputs = result.nodes[0].data.outputs;
    expect(outputs.find(p => p.id === 'usb-device')).toBeDefined();
    expect(outputs.find(p => p.id === 'usb-device-out')).toBeUndefined();
  });

  it('backfills missing midi-d on Hapax node', () => {
    const exportData = makeValidExport();
    exportData.nodes[0].data.outputs = [
      { id: 'midi-a', label: 'MIDI A', type: 'midi' },
      { id: 'midi-b', label: 'MIDI B', type: 'midi' },
      { id: 'midi-c', label: 'MIDI C', type: 'midi' },
      { id: 'usb-host', label: 'USB Host', type: 'usb' },
      { id: 'usb-device', label: 'USB Device', type: 'usb' },
    ];
    const result = parseStudioData(JSON.stringify(exportData));
    const outputIds = result.nodes[0].data.outputs.map(p => p.id);
    expect(outputIds).toContain('midi-d');
  });

  it('renames usb-in-N to usb-device-N on instrument nodes', () => {
    const exportData = makeValidExport();
    exportData.nodes.push({
      id: 'node-1',
      position: { x: 100, y: 100 },
      data: {
        name: 'Synth',
        manufacturer: 'Test',
        channel: 1,
        type: 'POLY',
        inputs: [{ id: 'usb-in-1', label: 'USB In 1', type: 'usb' }],
        outputs: [{ id: 'usb-out-1', label: 'USB Out 1', type: 'usb' }],
        ccMap: [],
        nrpnMap: [],
        assignCCs: [],
        automationLanes: [],
        isHapax: false,
        isRemovable: true,
      },
    } as Node<InstrumentNodeData>);
    const result = parseStudioData(JSON.stringify(exportData));
    const instrumentNode = result.nodes.find(n => n.id === 'node-1')!;
    expect(instrumentNode.data.inputs[0].id).toBe('usb-device-1');
    expect(instrumentNode.data.outputs[0].id).toBe('usb-host-1');
  });

  it('migrates edge source/target handles for USB renames', () => {
    const exportData = makeValidExport({
      edges: [
        {
          id: 'edge-hapax-main-usb-device-out-node-1-usb-in-1',
          source: 'hapax-main',
          target: 'node-1',
          sourceHandle: 'usb-device-out',
          targetHandle: 'usb-in-1',
          data: { portType: 'usb' },
        },
      ] as StudioEdge[],
    });
    const result = parseStudioData(JSON.stringify(exportData));
    const edge = result.edges[0];
    expect(edge.sourceHandle).toBe('usb-device');
    expect(edge.targetHandle).toBe('usb-device-1');
    expect(edge.id).toContain('usb-device');
  });

  it('migrates custom presets with old USB port names', () => {
    const exportData = makeValidExport({
      customPresets: [
        {
          id: 'p1',
          name: 'Old Synth',
          manufacturer: 'Test',
          type: 'POLY',
          inputs: [{ id: 'usb-in-1', label: 'USB In 1', type: 'usb' }],
          outputs: [{ id: 'usb-out-1', label: 'USB Out 1', type: 'usb' }],
        },
      ] as InstrumentPreset[],
    });
    const result = parseStudioData(JSON.stringify(exportData));
    expect(result.customPresets[0].inputs[0].id).toBe('usb-device-1');
    expect(result.customPresets[0].outputs[0].id).toBe('usb-host-1');
  });

  it('removes edges targeting deleted Hapax usb-device input', () => {
    const exportData = makeValidExport({
      edges: [
        {
          id: 'edge-node-1-usb-out-hapax-usb-device',
          source: 'node-1',
          target: 'hapax-main',
          sourceHandle: 'usb-out-1',
          targetHandle: 'usb-device',
          data: { portType: 'usb' },
        },
      ] as StudioEdge[],
    });
    const result = parseStudioData(JSON.stringify(exportData));
    expect(result.edges).toHaveLength(0);
  });
});

describe('round-trip: export data → parseStudioData', () => {
  it('preserves node data through serialization round-trip', () => {
    const original = makeValidExport();
    original.nodes.push({
      id: 'node-1',
      position: { x: 200, y: 300 },
      data: {
        name: 'Prophet',
        manufacturer: 'Sequential',
        channel: 3,
        type: 'POLY',
        inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
        outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
        ccMap: [{ ccNumber: 74, paramName: 'Cutoff', section: 'Filter' }],
        nrpnMap: [{ msb: 0, lsb: 42, paramName: 'Shape' }],
        assignCCs: [{ slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 }],
        automationLanes: [{ slot: 1, type: 'CC', ccNumber: 74 }],
        isHapax: false,
        isRemovable: true,
      },
    } as Node<InstrumentNodeData>);

    const json = JSON.stringify(original);
    const parsed = parseStudioData(json);

    expect(parsed.version).toBe(1);
    expect(parsed.nodes).toHaveLength(2);

    const synth = parsed.nodes.find(n => n.id === 'node-1')!;
    expect(synth.position).toEqual({ x: 200, y: 300 });
    expect(synth.data.name).toBe('Prophet');
    expect(synth.data.channel).toBe(3);
    expect(synth.data.ccMap).toHaveLength(1);
    expect(synth.data.nrpnMap).toHaveLength(1);
    expect(synth.data.assignCCs).toHaveLength(1);
    expect(synth.data.automationLanes).toHaveLength(1);
  });

  it('preserves edges with portType through round-trip', () => {
    const original = makeValidExport({
      edges: [
        {
          id: 'edge-hapax-main-midi-a-node-1-midi-in-1',
          source: 'hapax-main',
          target: 'node-1',
          sourceHandle: 'midi-a',
          targetHandle: 'midi-in-1',
          data: { portType: 'midi' },
        },
      ] as StudioEdge[],
    });

    const parsed = parseStudioData(JSON.stringify(original));
    expect(parsed.edges).toHaveLength(1);
    expect(parsed.edges[0].data?.portType).toBe('midi');
    expect(parsed.edges[0].sourceHandle).toBe('midi-a');
    expect(parsed.edges[0].targetHandle).toBe('midi-in-1');
  });

  it('preserves custom presets through round-trip', () => {
    const original = makeValidExport({
      customPresets: [
        {
          id: 'preset-1',
          name: 'My Synth',
          manufacturer: 'Acme',
          type: 'POLY',
          inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
          outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
          iconId: 'synth',
        },
      ] as InstrumentPreset[],
    });

    const parsed = parseStudioData(JSON.stringify(original));
    expect(parsed.customPresets).toHaveLength(1);
    expect(parsed.customPresets[0].name).toBe('My Synth');
    expect(parsed.customPresets[0].iconId).toBe('synth');
  });
});
