import type { Node, Edge } from '@xyflow/react';
import type { InstrumentNodeData } from '../../types';
import { detectCycle, wouldCreateCycle } from '../loopDetection';

function makeNode(id: string, overrides?: Partial<InstrumentNodeData>): Node<InstrumentNodeData> {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      name: id,
      manufacturer: 'Test',
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

function makeEdge(id: string, source: string, target: string): Edge {
  return { id, source, target };
}

describe('detectCycle', () => {
  it('returns no cycle for empty graph', () => {
    const result = detectCycle([], []);
    expect(result.hasCycle).toBe(false);
    expect(result.cycleEdges).toEqual([]);
  });

  it('returns no cycle for two connected nodes without a loop', () => {
    const nodes = [makeNode('A'), makeNode('B')];
    const edges = [makeEdge('e1', 'A', 'B')];
    const result = detectCycle(nodes, edges);
    expect(result.hasCycle).toBe(false);
  });

  it('detects a simple A→B→A cycle', () => {
    const nodes = [makeNode('A'), makeNode('B')];
    const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'B', 'A')];
    const result = detectCycle(nodes, edges);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleEdges).toContain('e1');
    expect(result.cycleEdges).toContain('e2');
  });

  it('detects a three-node cycle A→B→C→A', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'B', 'C'),
      makeEdge('e3', 'C', 'A'),
    ];
    const result = detectCycle(nodes, edges);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleEdges.length).toBeGreaterThanOrEqual(2);
  });

  it('detects a self-loop', () => {
    const nodes = [makeNode('A')];
    const edges = [makeEdge('e1', 'A', 'A')];
    const result = detectCycle(nodes, edges);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleEdges).toContain('e1');
  });

  it('detects a cycle in a disconnected subgraph', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
    const edges = [
      makeEdge('e1', 'A', 'B'), // disconnected pair
      makeEdge('e2', 'C', 'D'), // cycle subgraph
      makeEdge('e3', 'D', 'C'),
    ];
    const result = detectCycle(nodes, edges);
    expect(result.hasCycle).toBe(true);
  });

  it('returns no cycle when localOff breaks the feedback loop', () => {
    const nodes = [makeNode('A'), makeNode('B', { localOff: true })];
    const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'B', 'A')];
    const result = detectCycle(nodes, edges);
    expect(result.hasCycle).toBe(false);
    expect(result.cycleEdges).toEqual([]);
  });

  it('still detects cycle when localOff node is not in the cycle', () => {
    const nodes = [
      makeNode('A'),
      makeNode('B'),
      makeNode('C', { localOff: true }), // not in cycle
    ];
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'B', 'A'),
      makeEdge('e3', 'A', 'C'), // C is a dead-end, not in the cycle
    ];
    const result = detectCycle(nodes, edges);
    expect(result.hasCycle).toBe(true);
  });

  it('handles a linear chain without cycles', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'B', 'C'),
      makeEdge('e3', 'C', 'D'),
    ];
    const result = detectCycle(nodes, edges);
    expect(result.hasCycle).toBe(false);
  });
});

describe('wouldCreateCycle', () => {
  it('returns true when adding an edge would close a loop', () => {
    const nodes = [makeNode('A'), makeNode('B')];
    const edges = [makeEdge('e1', 'A', 'B')];
    // Adding B→A would create A→B→A
    expect(wouldCreateCycle(nodes, edges, 'B', 'A')).toBe(true);
  });

  it('returns false for a safe edge addition', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges = [makeEdge('e1', 'A', 'B')];
    // Adding B→C does not create a cycle
    expect(wouldCreateCycle(nodes, edges, 'B', 'C')).toBe(false);
  });

  it('returns true for a longer indirect path', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'B', 'C'),
    ];
    // Adding C→A would create A→B→C→A
    expect(wouldCreateCycle(nodes, edges, 'C', 'A')).toBe(true);
  });

  it('returns false on an empty graph', () => {
    expect(wouldCreateCycle([], [], 'A', 'B')).toBe(false);
  });

  it('returns true for a self-loop', () => {
    const nodes = [makeNode('A')];
    // Adding A→A
    expect(wouldCreateCycle(nodes, [], 'A', 'A')).toBe(true);
  });
});
