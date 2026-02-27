import type { Node } from '@xyflow/react';
import type { InstrumentNodeData, InstrumentPreset, StudioEdge } from '../types';

export interface StudioExport {
  version: 1;
  exportedAt: string;
  nodes: Node<InstrumentNodeData>[];
  edges: StudioEdge[];
  customPresets: InstrumentPreset[];
}

/**
 * Export studio settings to a JSON file
 */
export function exportStudio(
  nodes: Node<InstrumentNodeData>[],
  edges: StudioEdge[],
  customPresets: InstrumentPreset[]
): void {
  const exportData: StudioExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    nodes,
    edges,
    customPresets,
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const filename = `StudioGraph_Export_${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate and migrate parsed studio JSON data
 */
export function parseStudioData(json: string): StudioExport {
  const data = JSON.parse(json);

  // Validate structure
  if (!data.version || !data.nodes || !data.edges) {
    throw new Error('Invalid file format: missing required fields');
  }

  if (data.version !== 1) {
    throw new Error(`Unsupported file version: ${data.version}`);
  }

  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error('Invalid file format: nodes and edges must be arrays');
  }

  // Ensure customPresets is an array (may be missing in older exports)
  const customPresets = Array.isArray(data.customPresets) ? data.customPresets : [];

  // Backfill automationLanes for older save files and migrate DrumLane data
  const nodes = (data.nodes as Node<InstrumentNodeData>[]).map((node) => {
    const nodeData = { ...node.data, automationLanes: node.data.automationLanes || [], showCVPorts: node.data.showCVPorts ?? false };

    // Migrate old DrumLane format (had `channel` field, no `trig`/`chan`)
    if (nodeData.drumLanes && Array.isArray(nodeData.drumLanes)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodeData.drumLanes = (nodeData.drumLanes as any[]).map((lane) => ({
        lane: lane.lane ?? lane.channel ?? 1,
        trig: lane.trig ?? null,
        chan: lane.chan ?? null,
        note: lane.note ?? null,
        name: lane.name || '',
      }));
    }

    return { ...node, data: nodeData };
  });

  return {
    version: data.version,
    exportedAt: data.exportedAt || '',
    nodes,
    edges: data.edges,
    customPresets,
  };
}

/**
 * Parse and validate an imported studio file
 */
export function parseStudioImport(file: File): Promise<StudioExport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        resolve(parseStudioData(json));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
