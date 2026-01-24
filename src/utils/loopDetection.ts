import type { Node, Edge } from '@xyflow/react';
import type { InstrumentNodeData } from '../types';

interface CycleResult {
  hasCycle: boolean;
  cycleEdges: string[];
}

export function detectCycle(nodes: Node<InstrumentNodeData>[], edges: Edge[]): CycleResult {
  // Build adjacency list
  const adjacency = new Map<string, { nodeId: string; edgeId: string }[]>();
  const nodeMap = new Map<string, Node<InstrumentNodeData>>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    const neighbors = adjacency.get(edge.source) || [];
    neighbors.push({ nodeId: edge.target, edgeId: edge.id });
    adjacency.set(edge.source, neighbors);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycleEdges: string[] = [];
  const cycleNodes: string[] = [];
  const parentEdge = new Map<string, string>();
  const parentNode = new Map<string, string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const { nodeId: neighborId, edgeId } of neighbors) {
      if (!visited.has(neighborId)) {
        parentEdge.set(neighborId, edgeId);
        parentNode.set(neighborId, nodeId);
        if (dfs(neighborId)) {
          return true;
        }
      } else if (recursionStack.has(neighborId)) {
        // Cycle detected - trace back to find all edges and nodes in the cycle
        cycleEdges.push(edgeId);
        cycleNodes.push(nodeId);

        // Trace back through the cycle
        let current = nodeId;
        while (current !== neighborId) {
          const edge = parentEdge.get(current);
          if (edge) {
            cycleEdges.push(edge);
          }
          const parent = parentNode.get(current);
          if (parent) {
            cycleNodes.push(parent);
            current = parent;
          } else {
            break;
          }
        }
        cycleNodes.push(neighborId);

        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        // Check if any node in the cycle has Local Off enabled
        // If so, the feedback loop is broken
        const hasLocalOff = cycleNodes.some(nodeId => {
          const node = nodeMap.get(nodeId);
          return node?.data?.localOff === true;
        });

        if (hasLocalOff) {
          // Loop is broken by Local Off - don't report as feedback loop
          return { hasCycle: false, cycleEdges: [] };
        }

        return { hasCycle: true, cycleEdges };
      }
    }
  }

  return { hasCycle: false, cycleEdges: [] };
}

// Simplified version that just checks if a new connection would create a cycle
export function wouldCreateCycle(
  _nodes: Node[],
  edges: Edge[],
  newSource: string,
  newTarget: string
): boolean {
  // Check if there's already a path from target to source
  // If so, adding source -> target would create a cycle
  const visited = new Set<string>();
  const queue = [newTarget];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === newSource) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    // Find all nodes that current can reach
    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return false;
}
