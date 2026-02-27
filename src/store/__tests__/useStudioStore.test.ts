import { describe, it, expect, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { InstrumentNodeData, InstrumentPreset } from '../../types';
import { useStudioStore } from '../useStudioStore';

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

const makeNode = (id: string, name = 'Test'): Node<InstrumentNodeData> => ({
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
  },
});

const makePreset = (id: string, name = 'Preset'): InstrumentPreset => ({
  id,
  name,
  manufacturer: 'Test',
  type: 'POLY',
  inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
  outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
});

describe('useStudioStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset store to initial state
    useStudioStore.getState().clearStudio();
  });

  describe('clearStudio', () => {
    it('resets to initial state', () => {
      const { importStudio, setCustomPresets } = useStudioStore.getState();

      // Set up some state
      importStudio(
        [makeNode('hapax-main'), makeNode('node-3'), makeNode('node-7')],
        [{ id: 'edge-1', source: 'hapax-main', target: 'node-3', sourceHandle: 'midi-a', targetHandle: 'midi-in-1', data: { portType: 'midi' } }],
      );
      setCustomPresets([makePreset('p1')]);

      // Verify non-empty state
      expect(useStudioStore.getState().nodes.length).toBe(3);
      expect(useStudioStore.getState().edges.length).toBe(1);
      expect(useStudioStore.getState().customPresets.length).toBe(1);

      // Clear
      useStudioStore.getState().clearStudio();

      const state = useStudioStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].id).toBe('hapax-main');
      expect(state.edges).toHaveLength(0);
      expect(state.customPresets).toHaveLength(0);
      expect(state.selectedNodeId).toBeNull();
      expect(state.hasLoop).toBe(false);
      expect(state.loopEdges).toHaveLength(0);
    });

    it('resets nodeIdCounter so next node gets node-1', () => {
      const { importStudio, clearStudio, addNode } = useStudioStore.getState();

      // Import nodes with high IDs
      importStudio(
        [makeNode('hapax-main'), makeNode('node-10')],
        [],
      );

      clearStudio();

      // Add a new node — should be node-1, not node-11
      addNode(makePreset('p1'), { x: 0, y: 0 });
      const ids = useStudioStore.getState().nodes.map((n) => n.id);
      expect(ids).toContain('node-1');
    });
  });

  describe('setCustomPresets', () => {
    it('stores presets in state', () => {
      const presets = [makePreset('a', 'Alpha'), makePreset('b', 'Beta')];
      useStudioStore.getState().setCustomPresets(presets);
      expect(useStudioStore.getState().customPresets).toEqual(presets);
    });
  });

  describe('importStudio', () => {
    it('sets customPresets when provided', () => {
      const presets = [makePreset('x')];
      const nodes = [makeNode('hapax-main'), makeNode('node-2')];

      useStudioStore.getState().importStudio(nodes, [], presets);

      const state = useStudioStore.getState();
      expect(state.nodes).toHaveLength(2);
      expect(state.customPresets).toEqual(presets);
    });

    it('preserves existing customPresets when not provided', () => {
      useStudioStore.getState().setCustomPresets([makePreset('keep')]);
      useStudioStore.getState().importStudio([makeNode('hapax-main')], []);

      expect(useStudioStore.getState().customPresets).toHaveLength(1);
      expect(useStudioStore.getState().customPresets[0].id).toBe('keep');
    });
  });

  describe('syncNodeIdCounter on import', () => {
    it('syncs counter so next addNode gets max+1', () => {
      const nodes = [makeNode('hapax-main'), makeNode('node-5'), makeNode('node-10')];
      useStudioStore.getState().importStudio(nodes, []);

      useStudioStore.getState().addNode(makePreset('p'), { x: 0, y: 0 });
      const ids = useStudioStore.getState().nodes.map((n) => n.id);
      expect(ids).toContain('node-11');
    });
  });
});
