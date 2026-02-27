import type { Node } from '@xyflow/react';
import type { InstrumentNodeData, StudioEdge } from '../../types';
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
});
