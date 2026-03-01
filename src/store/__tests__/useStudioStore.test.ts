import { describe, it, expect, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { InstrumentNodeData, InstrumentPreset, StudioEdge, Port } from '../../types';
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

const makePreset = (id: string, name = 'Preset', overrides?: Partial<InstrumentPreset>): InstrumentPreset => ({
  id,
  name,
  manufacturer: 'Test',
  type: 'POLY',
  inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
  outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
  ...overrides,
});

const makeEdge = (id: string, source: string, target: string, sourceHandle: string, targetHandle: string, portType: 'midi' | 'usb' | 'cv' | 'audio' = 'midi'): StudioEdge => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  data: { portType },
  style: { stroke: '#3b82f6', strokeWidth: 2 },
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

  describe('addNode', () => {
    it('adds a node with correct data from preset', () => {
      const preset = makePreset('synth-1', 'Prophet', {
        manufacturer: 'Sequential',
        type: 'POLY',
        iconId: 'synth',
      });
      useStudioStore.getState().addNode(preset, { x: 100, y: 200 });

      const state = useStudioStore.getState();
      const added = state.nodes.find((n) => n.id !== 'hapax-main');
      expect(added).toBeDefined();
      expect(added!.position).toEqual({ x: 100, y: 200 });
      const data = added!.data as InstrumentNodeData;
      expect(data.name).toBe('Prophet');
      expect(data.manufacturer).toBe('Sequential');
      expect(data.type).toBe('POLY');
      expect(data.channel).toBe(1);
      expect(data.iconId).toBe('synth');
      expect(data.presetId).toBe('synth-1');
      expect(data.isRemovable).toBe(true);
      expect(data.isHapax).toBe(false);
    });

    it('assigns monotonically increasing node IDs', () => {
      useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
      useStudioStore.getState().addNode(makePreset('p2'), { x: 0, y: 0 });
      useStudioStore.getState().addNode(makePreset('p3'), { x: 0, y: 0 });

      const ids = useStudioStore.getState().nodes
        .filter((n) => n.id !== 'hapax-main')
        .map((n) => n.id);
      expect(ids).toEqual(['node-1', 'node-2', 'node-3']);
    });

    it('copies ccMap and nrpnMap from preset', () => {
      const preset = makePreset('p1', 'Synth', {
        ccMap: [{ ccNumber: 74, paramName: 'Cutoff' }],
        nrpnMap: [{ msb: 0, lsb: 1, paramName: 'Shape' }],
      });
      useStudioStore.getState().addNode(preset, { x: 0, y: 0 });

      const added = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main');
      const data = added!.data as InstrumentNodeData;
      expect(data.ccMap).toHaveLength(1);
      expect(data.ccMap[0].ccNumber).toBe(74);
      expect(data.nrpnMap).toHaveLength(1);
      expect(data.nrpnMap[0].msb).toBe(0);
    });

    it('copies defaultDrumLanes from preset', () => {
      const drums = [{ lane: 1, trig: null, chan: null, note: 36, name: 'Kick' }];
      const preset = makePreset('p1', 'Drums', {
        type: 'DRUM',
        defaultDrumLanes: drums,
      });
      useStudioStore.getState().addNode(preset, { x: 0, y: 0 });

      const added = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main');
      const data = added!.data as InstrumentNodeData;
      expect(data.drumLanes).toHaveLength(1);
      expect(data.drumLanes![0].name).toBe('Kick');
    });
  });

  describe('addNodeFromMidiGuide', () => {
    it('creates a node with MIDI guide data', () => {
      const inputs: Port[] = [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }];
      const outputs: Port[] = [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }];

      useStudioStore.getState().addNodeFromMidiGuide(
        {
          name: 'Minilogue',
          manufacturer: 'Korg',
          ccMap: [{ ccNumber: 43, paramName: 'Cutoff' }],
          nrpnMap: [],
          inputs,
          outputs,
        },
        { x: 50, y: 50 },
      );

      const added = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main');
      expect(added).toBeDefined();
      const data = added!.data as InstrumentNodeData;
      expect(data.name).toBe('Minilogue');
      expect(data.manufacturer).toBe('Korg');
      expect(data.type).toBe('POLY');
      expect(data.ccMap).toHaveLength(1);
      expect(data.isRemovable).toBe(true);
    });
  });

  describe('removeNode', () => {
    it('removes a node and its connected edges', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1', 'Synth'),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'hapax-main', 'node-1', 'midi-a', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);

      useStudioStore.getState().removeNode('node-1');

      const state = useStudioStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].id).toBe('hapax-main');
      expect(state.edges).toHaveLength(0);
    });

    it('clears selection when removing selected node', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1'),
      ];
      useStudioStore.getState().importStudio(nodes, []);
      useStudioStore.getState().setSelectedNode('node-1');
      expect(useStudioStore.getState().selectedNodeId).toBe('node-1');

      useStudioStore.getState().removeNode('node-1');
      expect(useStudioStore.getState().selectedNodeId).toBeNull();
    });

    it('refuses to remove non-removable nodes (Hapax)', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1'),
      ];
      useStudioStore.getState().importStudio(nodes, []);

      useStudioStore.getState().removeNode('hapax-main');

      // Hapax should still be there
      expect(useStudioStore.getState().nodes).toHaveLength(2);
      expect(useStudioStore.getState().nodes.find((n) => n.id === 'hapax-main')).toBeDefined();
    });

    it('triggers loop detection after removal', () => {
      // Create a loop: hapax-main → node-1 → node-2 → hapax-main
      const nodes = [
        makeNode('hapax-main', 'Hapax', {
          isHapax: true,
          isRemovable: false,
          outputs: [{ id: 'midi-a', label: 'MIDI A', type: 'midi' }],
          inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
        }),
        makeNode('node-1', 'A', {
          outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
          inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
        }),
        makeNode('node-2', 'B', {
          outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
          inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
        }),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'hapax-main', 'node-1', 'midi-a', 'midi-in-1'),
        makeEdge('e2', 'node-1', 'node-2', 'midi-out-1', 'midi-in-1'),
        makeEdge('e3', 'node-2', 'hapax-main', 'midi-out-1', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);
      expect(useStudioStore.getState().hasLoop).toBe(true);

      // Removing node-1 should break the loop
      useStudioStore.getState().removeNode('node-1');
      expect(useStudioStore.getState().hasLoop).toBe(false);
    });
  });

  describe('updateNodeData', () => {
    it('updates partial node data', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1', 'OldName'),
      ];
      useStudioStore.getState().importStudio(nodes, []);

      useStudioStore.getState().updateNodeData('node-1', { name: 'NewName', channel: 5 });

      const updated = useStudioStore.getState().nodes.find((n) => n.id === 'node-1');
      const data = updated!.data as InstrumentNodeData;
      expect(data.name).toBe('NewName');
      expect(data.channel).toBe(5);
      // Other fields should be preserved
      expect(data.manufacturer).toBe('Test');
    });

    it('triggers loop re-check when localOff changes', () => {
      // Create a cycle: node-1 → node-2 → node-1
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1', 'A'),
        makeNode('node-2', 'B'),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'node-1', 'node-2', 'midi-out-1', 'midi-in-1'),
        makeEdge('e2', 'node-2', 'node-1', 'midi-out-1', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);
      expect(useStudioStore.getState().hasLoop).toBe(true);

      // Setting localOff on node-1 should break the loop
      useStudioStore.getState().updateNodeData('node-1', { localOff: true });
      expect(useStudioStore.getState().hasLoop).toBe(false);
    });
  });

  describe('updateNodeWidth', () => {
    it('updates node width in both style and data', () => {
      useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
      const nodeId = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main')!.id;

      useStudioStore.getState().updateNodeWidth(nodeId, 400);

      const node = useStudioStore.getState().nodes.find((n) => n.id === nodeId)!;
      expect(node.style?.width).toBe(400);
      expect((node.data as InstrumentNodeData).width).toBe(400);
    });
  });

  describe('setSelectedNode', () => {
    it('sets and clears selection', () => {
      useStudioStore.getState().setSelectedNode('node-1');
      expect(useStudioStore.getState().selectedNodeId).toBe('node-1');

      useStudioStore.getState().setSelectedNode(null);
      expect(useStudioStore.getState().selectedNodeId).toBeNull();
    });
  });

  describe('addEdge', () => {
    it('creates edge with correct ID encoding', () => {
      useStudioStore.getState().addEdge(
        { source: 'hapax-main', target: 'node-1', sourceHandle: 'midi-a', targetHandle: 'midi-in-1' },
        'midi',
      );

      const edges = useStudioStore.getState().edges;
      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe('edge-hapax-main-midi-a-node-1-midi-in-1');
      expect(edges[0].data?.portType).toBe('midi');
    });

    it('assigns correct color for each port type', () => {
      useStudioStore.getState().addEdge(
        { source: 'a', target: 'b', sourceHandle: 'h1', targetHandle: 'h2' },
        'midi',
      );
      expect(useStudioStore.getState().edges[0].style?.stroke).toBe('#3b82f6');

      useStudioStore.getState().clearStudio();
      useStudioStore.getState().addEdge(
        { source: 'a', target: 'b', sourceHandle: 'h1', targetHandle: 'h2' },
        'usb',
      );
      expect(useStudioStore.getState().edges[0].style?.stroke).toBe('#06b6d4');
    });

    it('does not add edge with missing connection fields', () => {
      useStudioStore.getState().addEdge(
        { source: '', target: 'node-1', sourceHandle: 'midi-a', targetHandle: 'midi-in-1' },
        'midi',
      );
      expect(useStudioStore.getState().edges).toHaveLength(0);
    });

    it('triggers loop detection after adding edge', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1', 'A'),
        makeNode('node-2', 'B'),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'node-1', 'node-2', 'midi-out-1', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);
      expect(useStudioStore.getState().hasLoop).toBe(false);

      // Adding the return edge should create a loop
      useStudioStore.getState().addEdge(
        { source: 'node-2', target: 'node-1', sourceHandle: 'midi-out-1', targetHandle: 'midi-in-1' },
        'midi',
      );
      expect(useStudioStore.getState().hasLoop).toBe(true);
    });
  });

  describe('removeEdge', () => {
    it('removes an edge by ID', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1'),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'hapax-main', 'node-1', 'midi-a', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);
      expect(useStudioStore.getState().edges).toHaveLength(1);

      useStudioStore.getState().removeEdge('e1');
      expect(useStudioStore.getState().edges).toHaveLength(0);
    });

    it('triggers loop detection after removal', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1', 'A'),
        makeNode('node-2', 'B'),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'node-1', 'node-2', 'midi-out-1', 'midi-in-1'),
        makeEdge('e2', 'node-2', 'node-1', 'midi-out-1', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);
      expect(useStudioStore.getState().hasLoop).toBe(true);

      useStudioStore.getState().removeEdge('e2');
      expect(useStudioStore.getState().hasLoop).toBe(false);
    });
  });

  describe('onNodesChange', () => {
    it('updates node position', () => {
      useStudioStore.getState().onNodesChange([
        { type: 'position', id: 'hapax-main', position: { x: 500, y: 300 } },
      ]);
      const node = useStudioStore.getState().nodes.find((n) => n.id === 'hapax-main');
      expect(node!.position).toEqual({ x: 500, y: 300 });
    });

    it('updates node selection', () => {
      useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
      const nodeId = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main')!.id;

      useStudioStore.getState().onNodesChange([
        { type: 'select', id: nodeId, selected: true },
      ]);
      const node = useStudioStore.getState().nodes.find((n) => n.id === nodeId);
      expect(node!.selected).toBe(true);
    });

    it('prevents removing non-removable nodes', () => {
      useStudioStore.getState().onNodesChange([
        { type: 'remove', id: 'hapax-main' },
      ]);
      // Hapax should still exist
      expect(useStudioStore.getState().nodes.find((n) => n.id === 'hapax-main')).toBeDefined();
    });

    it('allows removing removable nodes', () => {
      useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
      const nodeId = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main')!.id;

      useStudioStore.getState().onNodesChange([
        { type: 'remove', id: nodeId },
      ]);
      expect(useStudioStore.getState().nodes.find((n) => n.id === nodeId)).toBeUndefined();
    });
  });

  describe('onEdgesChange', () => {
    it('removes edges', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1'),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'hapax-main', 'node-1', 'midi-a', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);

      useStudioStore.getState().onEdgesChange([
        { type: 'remove', id: 'e1' },
      ]);
      expect(useStudioStore.getState().edges).toHaveLength(0);
    });

    it('updates edge selection', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1'),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'hapax-main', 'node-1', 'midi-a', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);

      useStudioStore.getState().onEdgesChange([
        { type: 'select', id: 'e1', selected: true },
      ]);
      expect(useStudioStore.getState().edges[0].selected).toBe(true);
    });
  });

  describe('updateNodePortsAndCleanEdges', () => {
    it('updates ports on the node', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1', 'Synth', {
          inputs: [
            { id: 'midi-in-1', label: 'MIDI In 1', type: 'midi' },
            { id: 'midi-in-2', label: 'MIDI In 2', type: 'midi' },
          ],
          outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
        }),
      ];
      useStudioStore.getState().importStudio(nodes, []);

      const newInputs: Port[] = [{ id: 'midi-in-1', label: 'MIDI In 1', type: 'midi' }];
      const newOutputs: Port[] = [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }];
      useStudioStore.getState().updateNodePortsAndCleanEdges('node-1', newInputs, newOutputs);

      const node = useStudioStore.getState().nodes.find((n) => n.id === 'node-1');
      const data = node!.data as InstrumentNodeData;
      expect(data.inputs).toHaveLength(1);
      expect(data.outputs).toHaveLength(1);
    });

    it('removes orphaned edges when ports are removed', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1', 'Synth', {
          inputs: [
            { id: 'midi-in-1', label: 'MIDI In 1', type: 'midi' },
            { id: 'midi-in-2', label: 'MIDI In 2', type: 'midi' },
          ],
          outputs: [],
        }),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'hapax-main', 'node-1', 'midi-a', 'midi-in-1'),
        makeEdge('e2', 'hapax-main', 'node-1', 'midi-b', 'midi-in-2'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);
      expect(useStudioStore.getState().edges).toHaveLength(2);

      // Remove midi-in-2 port
      const newInputs: Port[] = [{ id: 'midi-in-1', label: 'MIDI In 1', type: 'midi' }];
      useStudioStore.getState().updateNodePortsAndCleanEdges('node-1', newInputs, []);

      const remainingEdges = useStudioStore.getState().edges;
      expect(remainingEdges).toHaveLength(1);
      expect(remainingEdges[0].id).toBe('e1');
    });

    it('keeps edges when ports are unchanged', () => {
      const inputs: Port[] = [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }];
      const outputs: Port[] = [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }];
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1', 'Synth', { inputs, outputs }),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'hapax-main', 'node-1', 'midi-a', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);

      useStudioStore.getState().updateNodePortsAndCleanEdges('node-1', inputs, outputs);
      expect(useStudioStore.getState().edges).toHaveLength(1);
    });
  });

  describe('uploadCCMap', () => {
    it('sets CC and NRPN maps on a node', () => {
      useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
      const nodeId = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main')!.id;

      const ccMap = [{ ccNumber: 74, paramName: 'Cutoff' }];
      const nrpnMap = [{ msb: 0, lsb: 1, paramName: 'Shape' }];
      useStudioStore.getState().uploadCCMap(nodeId, ccMap, nrpnMap);

      const data = useStudioStore.getState().nodes.find((n) => n.id === nodeId)!.data as InstrumentNodeData;
      expect(data.ccMap).toEqual(ccMap);
      expect(data.nrpnMap).toEqual(nrpnMap);
    });
  });

  describe('clearCCMap', () => {
    it('clears CC and NRPN maps on a node', () => {
      useStudioStore.getState().addNode(makePreset('p1', 'Synth', {
        ccMap: [{ ccNumber: 74, paramName: 'Cutoff' }],
        nrpnMap: [{ msb: 0, lsb: 1, paramName: 'Shape' }],
      }), { x: 0, y: 0 });
      const nodeId = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main')!.id;

      useStudioStore.getState().clearCCMap(nodeId);

      const data = useStudioStore.getState().nodes.find((n) => n.id === nodeId)!.data as InstrumentNodeData;
      expect(data.ccMap).toEqual([]);
      expect(data.nrpnMap).toEqual([]);
    });
  });

  describe('updateAssignCCs', () => {
    it('sets assign CCs on a node', () => {
      useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
      const nodeId = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main')!.id;

      const assigns = [{ slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 }];
      useStudioStore.getState().updateAssignCCs(nodeId, assigns);

      const data = useStudioStore.getState().nodes.find((n) => n.id === nodeId)!.data as InstrumentNodeData;
      expect(data.assignCCs).toEqual(assigns);
    });
  });

  describe('updateAutomationLanes', () => {
    it('sets automation lanes on a node', () => {
      useStudioStore.getState().addNode(makePreset('p1'), { x: 0, y: 0 });
      const nodeId = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main')!.id;

      const lanes = [{ slot: 1, type: 'CC' as const, ccNumber: 74 }];
      useStudioStore.getState().updateAutomationLanes(nodeId, lanes);

      const data = useStudioStore.getState().nodes.find((n) => n.id === nodeId)!.data as InstrumentNodeData;
      expect(data.automationLanes).toEqual(lanes);
    });
  });

  describe('updateDrumLanes', () => {
    it('sets drum lanes on a node', () => {
      useStudioStore.getState().addNode(makePreset('p1', 'Drums', { type: 'DRUM' }), { x: 0, y: 0 });
      const nodeId = useStudioStore.getState().nodes.find((n) => n.id !== 'hapax-main')!.id;

      const drums = [{ lane: 1, trig: 36, chan: '10', note: 36, name: 'Kick' }];
      useStudioStore.getState().updateDrumLanes(nodeId, drums);

      const data = useStudioStore.getState().nodes.find((n) => n.id === nodeId)!.data as InstrumentNodeData;
      expect(data.drumLanes).toEqual(drums);
    });
  });

  describe('checkForLoops', () => {
    it('sets hasLoop and loopEdges when a cycle exists', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1', 'A'),
        makeNode('node-2', 'B'),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'node-1', 'node-2', 'midi-out-1', 'midi-in-1'),
        makeEdge('e2', 'node-2', 'node-1', 'midi-out-1', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);

      expect(useStudioStore.getState().hasLoop).toBe(true);
      expect(useStudioStore.getState().loopEdges.length).toBeGreaterThan(0);
    });

    it('clears loop state when no cycles exist', () => {
      const nodes = [
        makeNode('hapax-main', 'Hapax', { isHapax: true, isRemovable: false }),
        makeNode('node-1'),
      ];
      const edges: StudioEdge[] = [
        makeEdge('e1', 'hapax-main', 'node-1', 'midi-a', 'midi-in-1'),
      ];
      useStudioStore.getState().importStudio(nodes, edges);

      expect(useStudioStore.getState().hasLoop).toBe(false);
      expect(useStudioStore.getState().loopEdges).toHaveLength(0);
    });
  });
});
