import { create } from 'zustand';
import type { Node, Connection, XYPosition } from '@xyflow/react';
import type { InstrumentNodeData, CCMapping, NRPNMapping, InstrumentPreset, PortType, StudioEdge, AssignCC, AutomationLane, DrumLane, Port } from '../types';
import { HAPAX_PRESET, EDGE_COLORS } from '../data/defaultNodes';
import { detectCycle } from '../utils/loopDetection';

interface StudioState {
  nodes: Node<InstrumentNodeData>[];
  edges: StudioEdge[];
  selectedNodeId: string | null;
  hasLoop: boolean;
  loopEdges: string[];

  // Node actions
  addNode: (preset: InstrumentPreset, position: XYPosition) => void;
  addNodeFromMidiGuide: (data: {
    name: string;
    manufacturer: string;
    ccMap: CCMapping[];
    nrpnMap: NRPNMapping[];
    inputs: Port[];
    outputs: Port[];
  }, position: XYPosition) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<InstrumentNodeData>) => void;
  updateNodeWidth: (id: string, width: number) => void;
  setSelectedNode: (id: string | null) => void;
  onNodesChange: (changes: any) => void;

  // Edge actions
  addEdge: (connection: Connection, portType: PortType) => void;
  removeEdge: (id: string) => void;
  onEdgesChange: (changes: any) => void;

  // Port updates
  updateNodePortsAndCleanEdges: (nodeId: string, inputs: Port[], outputs: Port[]) => void;

  // CC Map
  uploadCCMap: (nodeId: string, ccMap: CCMapping[], nrpnMap: NRPNMapping[]) => void;
  clearCCMap: (nodeId: string) => void;
  updateAssignCCs: (nodeId: string, assignCCs: AssignCC[]) => void;
  updateAutomationLanes: (nodeId: string, automationLanes: AutomationLane[]) => void;
  updateDrumLanes: (nodeId: string, drumLanes: DrumLane[]) => void;

  // Loop detection
  checkForLoops: () => void;

  // Import/Export
  importStudio: (nodes: Node<InstrumentNodeData>[], edges: StudioEdge[]) => void;
}

let nodeIdCounter = 0;

const createInitialHapaxNode = (): Node<InstrumentNodeData> => ({
  id: 'hapax-main',
  type: 'instrument',
  position: { x: 400, y: 100 },
  data: {
    name: HAPAX_PRESET.name,
    manufacturer: HAPAX_PRESET.manufacturer,
    channel: 1,
    type: HAPAX_PRESET.type,
    inputs: HAPAX_PRESET.inputs,
    outputs: HAPAX_PRESET.outputs,
    ccMap: [],
    nrpnMap: [],
    assignCCs: [],
    automationLanes: [],
    isHapax: true,
    isRemovable: false,
  },
});

export const useStudioStore = create<StudioState>((set, get) => ({
  nodes: [createInitialHapaxNode()],
  edges: [],
  selectedNodeId: null,
  hasLoop: false,
  loopEdges: [],

  addNode: (preset, position) => {
    const newNode: Node<InstrumentNodeData> = {
      id: `node-${++nodeIdCounter}`,
      type: 'instrument',
      position,
      data: {
        name: preset.name,
        manufacturer: preset.manufacturer,
        channel: 1,
        type: preset.type,
        inputs: preset.inputs,
        outputs: preset.outputs,
        ccMap: preset.ccMap ? [...preset.ccMap] : [],
        nrpnMap: preset.nrpnMap ? [...preset.nrpnMap] : [],
        assignCCs: [],
        automationLanes: [],
        drumLanes: preset.defaultDrumLanes ? [...preset.defaultDrumLanes] : undefined,
        isHapax: preset.isHapax ?? false,
        isRemovable: preset.isRemovable ?? true,
        iconId: preset.iconId,
        presetId: preset.id,
      },
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },

  addNodeFromMidiGuide: (data, position) => {
    const newNode: Node<InstrumentNodeData> = {
      id: `node-${++nodeIdCounter}`,
      type: 'instrument',
      position,
      data: {
        name: data.name,
        manufacturer: data.manufacturer,
        channel: 1,
        type: 'POLY', // Default to POLY, user can change
        inputs: data.inputs,
        outputs: data.outputs,
        ccMap: data.ccMap,
        nrpnMap: data.nrpnMap,
        assignCCs: [],
        automationLanes: [],
        isHapax: false,
        isRemovable: true,
      },
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },

  removeNode: (id) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === id);
    const nodeData = node?.data as InstrumentNodeData | undefined;
    if (nodeData?.isRemovable === false) return;

    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
    get().checkForLoops();
  },

  updateNodeData: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } as InstrumentNodeData } : node
      ),
    }));
    // Re-check loops if localOff changed (affects feedback loop detection)
    if ('localOff' in data) {
      get().checkForLoops();
    }
  },

  updateNodeWidth: (id, width) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              style: { ...node.style, width },
              data: { ...node.data, width } as InstrumentNodeData,
            }
          : node
      ),
    }));
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id });
  },

  onNodesChange: (changes) => {
    set((state) => {
      let newNodes = [...state.nodes];
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          const nodeIndex = newNodes.findIndex((n) => n.id === change.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = {
              ...newNodes[nodeIndex],
              position: change.position,
            };
          }
        } else if (change.type === 'dimensions' && change.dimensions) {
          const nodeIndex = newNodes.findIndex((n) => n.id === change.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = {
              ...newNodes[nodeIndex],
              measured: change.dimensions,
            };
          }
        } else if (change.type === 'select') {
          const nodeIndex = newNodes.findIndex((n) => n.id === change.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = {
              ...newNodes[nodeIndex],
              selected: change.selected,
            };
          }
        } else if (change.type === 'remove') {
          const node = newNodes.find((n) => n.id === change.id);
          const nodeData = node?.data as InstrumentNodeData | undefined;
          if (nodeData?.isRemovable !== false) {
            newNodes = newNodes.filter((n) => n.id !== change.id);
          }
        }
      }
      return { nodes: newNodes };
    });
  },

  addEdge: (connection, portType) => {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (!source || !target || !sourceHandle || !targetHandle) return;

    const newEdge: StudioEdge = {
      id: `edge-${source}-${sourceHandle}-${target}-${targetHandle}`,
      source,
      target,
      sourceHandle,
      targetHandle,
      data: { portType },
      style: {
        stroke: EDGE_COLORS[portType] || EDGE_COLORS.midi,
        strokeWidth: 2,
      },
    };

    set((state) => ({ edges: [...state.edges, newEdge] }));
    get().checkForLoops();
  },

  removeEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
    }));
    get().checkForLoops();
  },

  onEdgesChange: (changes) => {
    set((state) => {
      let newEdges = [...state.edges];
      for (const change of changes) {
        if (change.type === 'remove') {
          newEdges = newEdges.filter((e) => e.id !== change.id);
        } else if (change.type === 'select') {
          const edgeIndex = newEdges.findIndex((e) => e.id === change.id);
          if (edgeIndex !== -1) {
            newEdges[edgeIndex] = {
              ...newEdges[edgeIndex],
              selected: change.selected,
            };
          }
        }
      }
      return { edges: newEdges };
    });
    get().checkForLoops();
  },

  updateNodePortsAndCleanEdges: (nodeId, inputs, outputs) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const nodeData = node.data as InstrumentNodeData;
    const oldPortIds = new Set([
      ...nodeData.inputs.map((p) => p.id),
      ...nodeData.outputs.map((p) => p.id),
    ]);
    const newPortIds = new Set([
      ...inputs.map((p) => p.id),
      ...outputs.map((p) => p.id),
    ]);
    const removedPortIds = [...oldPortIds].filter((id) => !newPortIds.has(id));

    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, inputs, outputs } as InstrumentNodeData }
          : n
      ),
      edges: removedPortIds.length > 0
        ? state.edges.filter((e) => {
            if (e.source === nodeId && removedPortIds.includes(e.sourceHandle!)) return false;
            if (e.target === nodeId && removedPortIds.includes(e.targetHandle!)) return false;
            return true;
          })
        : state.edges,
    }));

    get().checkForLoops();
  },

  uploadCCMap: (nodeId, ccMap, nrpnMap) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ccMap, nrpnMap } as InstrumentNodeData } : node
      ),
    }));
  },

  clearCCMap: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ccMap: [], nrpnMap: [] } as InstrumentNodeData } : node
      ),
    }));
  },

  updateAssignCCs: (nodeId, assignCCs) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, assignCCs } as InstrumentNodeData } : node
      ),
    }));
  },

  updateAutomationLanes: (nodeId, automationLanes) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, automationLanes } as InstrumentNodeData } : node
      ),
    }));
  },

  updateDrumLanes: (nodeId, drumLanes) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, drumLanes } as InstrumentNodeData } : node
      ),
    }));
  },

  checkForLoops: () => {
    const { nodes, edges } = get();
    const { hasCycle, cycleEdges } = detectCycle(nodes as any, edges);
    set({ hasLoop: hasCycle, loopEdges: cycleEdges });
  },

  importStudio: (nodes, edges) => {
    // Update nodeIdCounter to prevent ID collisions
    const maxId = nodes.reduce((max, node) => {
      const match = node.id.match(/^node-(\d+)$/);
      if (match) {
        return Math.max(max, parseInt(match[1], 10));
      }
      return max;
    }, 0);
    nodeIdCounter = maxId;

    // Replace state
    set({
      nodes,
      edges,
      selectedNodeId: null,
      hasLoop: false,
      loopEdges: [],
    });

    // Re-run loop detection
    get().checkForLoops();
  },
}));
