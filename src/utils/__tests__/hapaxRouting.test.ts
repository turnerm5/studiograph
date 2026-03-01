import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import type { InstrumentNodeData } from '../../types';
import { traceHapaxRouting } from '../hapaxRouting';

function makeNode(id: string, overrides?: Partial<InstrumentNodeData>): Node<InstrumentNodeData> {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      name: 'Test',
      manufacturer: 'Test',
      channel: 1,
      type: 'POLY',
      inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
      outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
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
    outputs: [
      { id: 'midi-a', label: 'MIDI A', type: 'midi' },
      { id: 'midi-b', label: 'MIDI B', type: 'midi' },
      { id: 'usb-host', label: 'USB Host', type: 'usb' },
      { id: 'cv-1', label: 'CV 1', type: 'cv' },
    ],
  });
}

function makeEdge(source: string, target: string, sourceHandle: string, portType: 'midi' | 'usb' | 'cv' | 'audio' = 'midi'): Edge {
  return {
    id: `edge-${source}-${sourceHandle}-${target}`,
    source,
    target,
    sourceHandle,
    data: { portType },
  };
}

describe('traceHapaxRouting', () => {
  it('returns empty map when no Hapax node exists', () => {
    const nodes = [makeNode('node-1'), makeNode('node-2')];
    const edges = [makeEdge('node-1', 'node-2', 'midi-out-1')];
    const result = traceHapaxRouting(nodes, edges);
    expect(result.size).toBe(0);
  });

  it('returns empty map when Hapax has no outgoing edges', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const result = traceHapaxRouting(nodes, []);
    expect(result.size).toBe(0);
  });

  it('traces direct MIDI connections from Hapax', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('hapax-main', 'node-1', 'midi-a')];
    const result = traceHapaxRouting(nodes, edges);

    expect(result.size).toBe(1);
    expect(result.get('node-1')).toEqual(['midi-a']);
  });

  it('traces direct USB connections from Hapax', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('hapax-main', 'node-1', 'usb-host', 'usb')];
    const result = traceHapaxRouting(nodes, edges);

    expect(result.size).toBe(1);
    expect(result.get('node-1')).toEqual(['usb-host']);
  });

  it('traces through intermediary nodes (multi-hop)', () => {
    // Hapax → MIDI thru box → Synth
    const nodes = [makeHapaxNode(), makeNode('thru-box'), makeNode('synth')];
    const edges = [
      makeEdge('hapax-main', 'thru-box', 'midi-a'),
      makeEdge('thru-box', 'synth', 'midi-out-1'),
    ];
    const result = traceHapaxRouting(nodes, edges);

    // Both the thru box and the synth should be reachable
    expect(result.size).toBe(2);
    expect(result.get('thru-box')).toEqual(['midi-a']);
    expect(result.get('synth')).toEqual(['midi-a']);
  });

  it('ignores audio edges (only follows MIDI and USB)', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('hapax-main', 'node-1', 'audio-out-1', 'audio')];
    const result = traceHapaxRouting(nodes, edges);
    expect(result.size).toBe(0);
  });

  it('ignores CV edges (only follows MIDI and USB)', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [makeEdge('hapax-main', 'node-1', 'cv-1', 'cv')];
    const result = traceHapaxRouting(nodes, edges);
    expect(result.size).toBe(0);
  });

  it('does not re-enter the Hapax node on return edges', () => {
    // Hapax → node-1 → Hapax (return edge should be ignored for propagation)
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [
      makeEdge('hapax-main', 'node-1', 'midi-a'),
      makeEdge('node-1', 'hapax-main', 'midi-out-1'),
    ];
    const result = traceHapaxRouting(nodes, edges);

    // Only node-1 should be reachable, not hapax-main (itself)
    expect(result.size).toBe(1);
    expect(result.has('node-1')).toBe(true);
    expect(result.has('hapax-main')).toBe(false);
  });

  it('handles multiple handles reaching the same node', () => {
    // Hapax sends both midi-a and midi-b to node-1 (via different paths)
    const nodes = [makeHapaxNode(), makeNode('node-1')];
    const edges = [
      makeEdge('hapax-main', 'node-1', 'midi-a'),
      makeEdge('hapax-main', 'node-1', 'midi-b'),
    ];
    const result = traceHapaxRouting(nodes, edges);

    expect(result.size).toBe(1);
    const handles = result.get('node-1')!.sort();
    expect(handles).toEqual(['midi-a', 'midi-b']);
  });

  it('traces multiple instruments on different ports', () => {
    const nodes = [makeHapaxNode(), makeNode('synth-1'), makeNode('synth-2')];
    const edges = [
      makeEdge('hapax-main', 'synth-1', 'midi-a'),
      makeEdge('hapax-main', 'synth-2', 'midi-b'),
    ];
    const result = traceHapaxRouting(nodes, edges);

    expect(result.size).toBe(2);
    expect(result.get('synth-1')).toEqual(['midi-a']);
    expect(result.get('synth-2')).toEqual(['midi-b']);
  });

  it('excludes disconnected subgraphs (not reachable from Hapax)', () => {
    const nodes = [makeHapaxNode(), makeNode('node-1'), makeNode('node-2'), makeNode('island')];
    const edges = [
      makeEdge('hapax-main', 'node-1', 'midi-a'),
      // island is not connected to Hapax at all
      makeEdge('node-2', 'island', 'midi-out-1'),
    ];
    const result = traceHapaxRouting(nodes, edges);

    expect(result.size).toBe(1);
    expect(result.has('node-1')).toBe(true);
    expect(result.has('island')).toBe(false);
    expect(result.has('node-2')).toBe(false);
  });

  it('handles long chain: Hapax → A → B → C', () => {
    const nodes = [makeHapaxNode(), makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [
      makeEdge('hapax-main', 'a', 'midi-a'),
      makeEdge('a', 'b', 'midi-out-1'),
      makeEdge('b', 'c', 'midi-out-1'),
    ];
    const result = traceHapaxRouting(nodes, edges);

    expect(result.size).toBe(3);
    expect(result.get('a')).toEqual(['midi-a']);
    expect(result.get('b')).toEqual(['midi-a']);
    expect(result.get('c')).toEqual(['midi-a']);
  });

  it('propagates different handles independently through branches', () => {
    // Hapax → midi-a → A → C; Hapax → midi-b → B → C
    const nodes = [makeHapaxNode(), makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [
      makeEdge('hapax-main', 'a', 'midi-a'),
      makeEdge('hapax-main', 'b', 'midi-b'),
      makeEdge('a', 'c', 'midi-out-1'),
      makeEdge('b', 'c', 'midi-out-1'),
    ];
    const result = traceHapaxRouting(nodes, edges);

    expect(result.size).toBe(3);
    const cHandles = result.get('c')!.sort();
    expect(cHandles).toEqual(['midi-a', 'midi-b']);
  });

  it('handles nodes with no outgoing edges (terminal nodes)', () => {
    const nodes = [makeHapaxNode(), makeNode('terminal', { outputs: [] })];
    const edges = [makeEdge('hapax-main', 'terminal', 'midi-a')];
    const result = traceHapaxRouting(nodes, edges);

    expect(result.size).toBe(1);
    expect(result.get('terminal')).toEqual(['midi-a']);
  });
});
