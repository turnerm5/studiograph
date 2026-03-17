import { describe, it, expect, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';
import type { InstrumentNodeData } from '../../types';
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

/**
 * Port-type connection validation logic extracted from StudioCanvas.tsx's isValidConnection.
 * Tests the same-type constraint, self-connection prevention, and port existence checks.
 */
function isValidConnection(
  nodes: Node<InstrumentNodeData>[],
  connection: { source: string; target: string; sourceHandle: string; targetHandle: string }
): boolean {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (!source || !target || !sourceHandle || !targetHandle) return false;
  if (source === target) return false;

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) return false;

  const sourceData = sourceNode.data as InstrumentNodeData;
  const targetData = targetNode.data as InstrumentNodeData;

  const sourcePort = sourceData.outputs.find((p) => p.id === sourceHandle);
  const targetPort = targetData.inputs.find((p) => p.id === targetHandle);
  if (!sourcePort || !targetPort) return false;

  if (sourcePort.type !== targetPort.type) return false;

  return true;
}

describe('Connection Validation (isValidConnection)', () => {
  const hapaxNode = makeNode('hapax-main', 'Hapax', {
    isHapax: true,
    isRemovable: false,
    outputs: [
      { id: 'midi-a', label: 'MIDI A', type: 'midi' },
      { id: 'usb-host', label: 'USB Host', type: 'usb' },
      { id: 'cv-1', label: 'CV 1', type: 'cv' },
    ],
    inputs: [
      { id: 'midi-in-1', label: 'MIDI In 1', type: 'midi' },
      { id: 'cv-in-1', label: 'CV In 1', type: 'cv' },
    ],
  });

  const synthNode = makeNode('node-1', 'Synth', {
    inputs: [
      { id: 'midi-in-1', label: 'MIDI In', type: 'midi' },
      { id: 'usb-device-1', label: 'USB Device', type: 'usb' },
      { id: 'cv-in-1', label: 'CV In', type: 'cv' },
      { id: 'audio-in-1', label: 'Audio In', type: 'audio' },
    ],
    outputs: [
      { id: 'midi-out-1', label: 'MIDI Out', type: 'midi' },
      { id: 'audio-out-1', label: 'Audio Out', type: 'audio' },
    ],
  });

  const mixerNode = makeNode('node-2', 'Mixer', {
    inputs: [
      { id: 'audio-in-1', label: 'Audio In 1', type: 'audio' },
      { id: 'midi-in-1', label: 'MIDI In', type: 'midi' },
    ],
    outputs: [
      { id: 'audio-out-1', label: 'Audio Out', type: 'audio' },
    ],
  });

  const nodes = [hapaxNode, synthNode, mixerNode];

  it('allows MIDI-to-MIDI connections', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'node-1',
      sourceHandle: 'midi-a', targetHandle: 'midi-in-1',
    })).toBe(true);
  });

  it('allows USB-to-USB connections', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'node-1',
      sourceHandle: 'usb-host', targetHandle: 'usb-device-1',
    })).toBe(true);
  });

  it('allows CV-to-CV connections', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'node-1',
      sourceHandle: 'cv-1', targetHandle: 'cv-in-1',
    })).toBe(true);
  });

  it('allows audio-to-audio connections', () => {
    expect(isValidConnection(nodes, {
      source: 'node-1', target: 'node-2',
      sourceHandle: 'audio-out-1', targetHandle: 'audio-in-1',
    })).toBe(true);
  });

  it('rejects MIDI-to-USB cross-type connection', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'node-1',
      sourceHandle: 'midi-a', targetHandle: 'usb-device-1',
    })).toBe(false);
  });

  it('rejects MIDI-to-audio cross-type connection', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'node-1',
      sourceHandle: 'midi-a', targetHandle: 'audio-in-1',
    })).toBe(false);
  });

  it('rejects USB-to-CV cross-type connection', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'node-1',
      sourceHandle: 'usb-host', targetHandle: 'cv-in-1',
    })).toBe(false);
  });

  it('rejects CV-to-MIDI cross-type connection', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'node-1',
      sourceHandle: 'cv-1', targetHandle: 'midi-in-1',
    })).toBe(false);
  });

  it('rejects self-connections', () => {
    expect(isValidConnection(nodes, {
      source: 'node-1', target: 'node-1',
      sourceHandle: 'midi-out-1', targetHandle: 'midi-in-1',
    })).toBe(false);
  });

  it('rejects connections with missing source node', () => {
    expect(isValidConnection(nodes, {
      source: 'nonexistent', target: 'node-1',
      sourceHandle: 'midi-out-1', targetHandle: 'midi-in-1',
    })).toBe(false);
  });

  it('rejects connections with missing target node', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'nonexistent',
      sourceHandle: 'midi-a', targetHandle: 'midi-in-1',
    })).toBe(false);
  });

  it('rejects connections with nonexistent source handle', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'node-1',
      sourceHandle: 'nonexistent-port', targetHandle: 'midi-in-1',
    })).toBe(false);
  });

  it('rejects connections with nonexistent target handle', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'node-1',
      sourceHandle: 'midi-a', targetHandle: 'nonexistent-port',
    })).toBe(false);
  });

  it('rejects connections with empty source', () => {
    expect(isValidConnection(nodes, {
      source: '', target: 'node-1',
      sourceHandle: 'midi-a', targetHandle: 'midi-in-1',
    })).toBe(false);
  });

  it('rejects connections with empty target handle', () => {
    expect(isValidConnection(nodes, {
      source: 'hapax-main', target: 'node-1',
      sourceHandle: 'midi-a', targetHandle: '',
    })).toBe(false);
  });

  it('rejects connecting output to output (wrong direction)', () => {
    // sourceHandle must be in source.outputs, targetHandle must be in target.inputs
    expect(isValidConnection(nodes, {
      source: 'node-1', target: 'node-2',
      sourceHandle: 'midi-in-1', targetHandle: 'midi-in-1',  // midi-in-1 is an input, not an output
    })).toBe(false);
  });
});

describe('Edge replacement behavior (one-cable-per-output)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useStudioStore.getState().clearStudio();
  });

  it('store allows adding multiple edges from same MIDI output', () => {
    // The store itself doesn't enforce one-cable-per-output—that's StudioCanvas.
    // But we can verify edges accumulate.
    const nodes = [
      makeNode('hapax-main', 'Hapax', {
        isHapax: true,
        isRemovable: false,
        outputs: [{ id: 'midi-a', label: 'MIDI A', type: 'midi' }],
      }),
      makeNode('node-1', 'Synth A'),
      makeNode('node-2', 'Synth B'),
    ];
    useStudioStore.getState().importStudio(nodes, []);

    useStudioStore.getState().addEdge(
      { source: 'hapax-main', target: 'node-1', sourceHandle: 'midi-a', targetHandle: 'midi-in-1' },
      'midi',
    );
    useStudioStore.getState().addEdge(
      { source: 'hapax-main', target: 'node-2', sourceHandle: 'midi-a', targetHandle: 'midi-in-1' },
      'midi',
    );

    expect(useStudioStore.getState().edges).toHaveLength(2);
  });

  it('edge ID encodes full connection path for uniqueness', () => {
    useStudioStore.getState().addEdge(
      { source: 'hapax-main', target: 'node-1', sourceHandle: 'midi-a', targetHandle: 'midi-in-1' },
      'midi',
    );

    const edge = useStudioStore.getState().edges[0];
    expect(edge.id).toBe('edge-hapax-main-midi-a-node-1-midi-in-1');
    expect(edge.source).toBe('hapax-main');
    expect(edge.target).toBe('node-1');
    expect(edge.sourceHandle).toBe('midi-a');
    expect(edge.targetHandle).toBe('midi-in-1');
  });
});
