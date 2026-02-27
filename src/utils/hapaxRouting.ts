import type { Node, Edge } from '@xyflow/react';
import type { InstrumentNodeData } from '../types';

/**
 * BFS from the Hapax node following MIDI-type edges.
 * Returns a map of nodeId → hapax source handle(s) that reach it.
 */
export function traceHapaxRouting(
  nodes: Node<InstrumentNodeData>[],
  edges: Edge[]
): Map<string, string[]> {
  const hapaxNode = nodes.find((n) => (n.data as InstrumentNodeData).isHapax);
  if (!hapaxNode) return new Map();

  // Build adjacency: source nodeId → [{ target, sourceHandle }]
  // Only include MIDI/USB edges (these carry MIDI routing)
  const midiAdj = new Map<string, { target: string; sourceHandle: string }[]>();
  for (const edge of edges) {
    const portType = (edge.data as { portType?: string } | undefined)?.portType;
    if (portType !== 'midi' && portType !== 'usb') continue;

    const list = midiAdj.get(edge.source) || [];
    list.push({ target: edge.target, sourceHandle: edge.sourceHandle || '' });
    midiAdj.set(edge.source, list);
  }

  // BFS: queue entries are [nodeId, hapaxSourceHandle]
  const result = new Map<string, Set<string>>();
  const visited = new Map<string, Set<string>>(); // nodeId → set of handles already queued
  const queue: [string, string][] = [];

  // Seed with direct Hapax connections
  const hapaxEdges = midiAdj.get(hapaxNode.id) || [];
  for (const { target, sourceHandle } of hapaxEdges) {
    queue.push([target, sourceHandle]);
    const set = visited.get(target) || new Set();
    set.add(sourceHandle);
    visited.set(target, set);
  }

  while (queue.length > 0) {
    const [nodeId, hapaxHandle] = queue.shift()!;

    // Record this node as reachable from hapaxHandle
    const handles = result.get(nodeId) || new Set();
    handles.add(hapaxHandle);
    result.set(nodeId, handles);

    // Follow outgoing MIDI edges from this node (never re-enter the Hapax —
    // return edges back to the Hapax would incorrectly propagate handles)
    const neighbors = midiAdj.get(nodeId) || [];
    for (const { target } of neighbors) {
      if (target === hapaxNode.id) continue;
      const visitedHandles = visited.get(target) || new Set();
      if (!visitedHandles.has(hapaxHandle)) {
        visitedHandles.add(hapaxHandle);
        visited.set(target, visitedHandles);
        queue.push([target, hapaxHandle]);
      }
    }
  }

  // Convert Sets to arrays
  const out = new Map<string, string[]>();
  for (const [nodeId, handles] of result) {
    out.set(nodeId, Array.from(handles));
  }
  return out;
}
