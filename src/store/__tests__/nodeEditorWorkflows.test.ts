import { describe, it, expect, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { InstrumentNodeData, InstrumentPreset } from '../../types';
import { useStudioStore } from '../useStudioStore';
import { DEFAULT_DRUM_LANES } from '../../data/defaultNodes';

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

const makePreset = (id: string, name = 'Preset', overrides?: Partial<InstrumentPreset>): InstrumentPreset => ({
  id,
  name,
  manufacturer: 'Test',
  type: 'POLY',
  inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
  outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
  ...overrides,
});

describe('NodeEditor type switching workflows', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useStudioStore.getState().clearStudio();
  });

  /**
   * Simulates what NodeEditor.handleTypeChange does:
   * 1. Updates node type via updateNodeData
   * 2. If switching to DRUM and no drumLanes exist, auto-populates with DEFAULT_DRUM_LANES
   */
  function simulateTypeSwitch(nodeId: string, newType: 'POLY' | 'DRUM' | 'MPE') {
    const { updateNodeData, updateDrumLanes, nodes } = useStudioStore.getState();
    updateNodeData(nodeId, { type: newType });

    if (newType === 'DRUM') {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const data = node.data as InstrumentNodeData;
        if (!data.drumLanes || data.drumLanes.length === 0) {
          updateDrumLanes(nodeId, [...DEFAULT_DRUM_LANES]);
        }
      }
    }
  }

  it('auto-populates drum lanes when switching POLY to DRUM', () => {
    useStudioStore.getState().addNode(makePreset('p1', 'TR-8S'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    simulateTypeSwitch(nodeId, 'DRUM');

    const data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.type).toBe('DRUM');
    expect(data.drumLanes).toHaveLength(8);
    expect(data.drumLanes![0].name).toBe('KICK');
    expect(data.drumLanes![7].name).toBe('PERC 2');
  });

  it('does not overwrite existing drum lanes when switching to DRUM', () => {
    useStudioStore.getState().addNode(makePreset('p1', 'Custom Drums'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    // Pre-populate custom drum lanes
    const customLanes = [
      { lane: 1, trig: null, chan: null, note: 36, name: 'BD' },
      { lane: 2, trig: null, chan: null, note: 38, name: 'SD' },
    ];
    useStudioStore.getState().updateDrumLanes(nodeId, customLanes);

    simulateTypeSwitch(nodeId, 'DRUM');

    const data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.drumLanes).toHaveLength(2);
    expect(data.drumLanes![0].name).toBe('BD');
    expect(data.drumLanes![1].name).toBe('SD');
  });

  it('does not populate drum lanes when switching to POLY', () => {
    useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    simulateTypeSwitch(nodeId, 'POLY');

    const data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.drumLanes).toBeUndefined();
  });

  it('does not populate drum lanes when switching to MPE', () => {
    useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    simulateTypeSwitch(nodeId, 'MPE');

    const data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.drumLanes).toBeUndefined();
  });

  it('handles round-trip POLY → DRUM → POLY → DRUM', () => {
    useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    // Switch to DRUM — drum lanes get populated
    simulateTypeSwitch(nodeId, 'DRUM');
    let data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.drumLanes).toHaveLength(8);

    // Switch back to POLY — drum lanes remain (store doesn't clear them)
    simulateTypeSwitch(nodeId, 'POLY');
    data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.type).toBe('POLY');
    expect(data.drumLanes).toHaveLength(8);

    // Switch back to DRUM — existing lanes should NOT be overwritten
    simulateTypeSwitch(nodeId, 'DRUM');
    data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.drumLanes).toHaveLength(8);
  });
});

describe('NodeEditor channel clamping', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useStudioStore.getState().clearStudio();
  });

  /**
   * Simulates what NodeEditor.handleChannelChange does:
   * Clamps channel to 1-16 range
   */
  function simulateChannelChange(nodeId: string, inputValue: string) {
    const channel = Math.min(16, Math.max(1, parseInt(inputValue) || 1));
    useStudioStore.getState().updateNodeData(nodeId, { channel });
  }

  it('clamps channel to 1 when input is 0', () => {
    useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    simulateChannelChange(nodeId, '0');

    const data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.channel).toBe(1);
  });

  it('clamps channel to 16 when input exceeds max', () => {
    useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    simulateChannelChange(nodeId, '99');

    const data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.channel).toBe(16);
  });

  it('defaults to 1 when input is not a number', () => {
    useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    simulateChannelChange(nodeId, 'abc');

    const data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.channel).toBe(1);
  });

  it('allows valid channel 10', () => {
    useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    simulateChannelChange(nodeId, '10');

    const data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.channel).toBe(10);
  });

  it('clamps negative values to 1', () => {
    useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    simulateChannelChange(nodeId, '-5');

    const data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.channel).toBe(1);
  });
});

describe('NodeEditor localOff toggle', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useStudioStore.getState().clearStudio();
  });

  it('toggles localOff and re-checks loops', () => {
    const makeTestNode = (id: string, name: string, overrides?: Partial<InstrumentNodeData>): Node<InstrumentNodeData> => ({
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

    // Create cycle: A → B → A
    const nodes = [
      makeTestNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
      makeTestNode('node-1', 'A'),
      makeTestNode('node-2', 'B'),
    ];
    const edges = [
      { id: 'e1', source: 'node-1', target: 'node-2', sourceHandle: 'midi-out-1', targetHandle: 'midi-in-1', data: { portType: 'midi' as const } },
      { id: 'e2', source: 'node-2', target: 'node-1', sourceHandle: 'midi-out-1', targetHandle: 'midi-in-1', data: { portType: 'midi' as const } },
    ];
    useStudioStore.getState().importStudio(nodes, edges);
    expect(useStudioStore.getState().hasLoop).toBe(true);

    // Enable localOff on node-1 (simulates checkbox toggle in NodeEditor)
    useStudioStore.getState().updateNodeData('node-1', { localOff: true });
    expect(useStudioStore.getState().hasLoop).toBe(false);

    // Disable localOff — loop should return
    useStudioStore.getState().updateNodeData('node-1', { localOff: false });
    expect(useStudioStore.getState().hasLoop).toBe(true);
  });
});

describe('NodeEditor showCVPorts toggle', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useStudioStore.getState().clearStudio();
  });

  it('updates showCVPorts on node data', () => {
    useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
    const nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;

    useStudioStore.getState().updateNodeData(nodeId, { showCVPorts: true });

    const data = useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
    expect(data.showCVPorts).toBe(true);
  });
});
