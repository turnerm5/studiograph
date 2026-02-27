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

    // Backfill missing Hapax output ports for older save files
    if (nodeData.isHapax) {
      const outputIds = new Set(nodeData.outputs.map((p) => p.id));
      if (!outputIds.has('midi-d')) {
        const idx = nodeData.outputs.findIndex((p) => p.id === 'midi-c');
        if (idx !== -1) nodeData.outputs.splice(idx + 1, 0, { id: 'midi-d', label: 'MIDI D', type: 'midi' });
      }

      // USB redesign: remove usb-device input, rename usb-device-out → usb-device in outputs
      nodeData.inputs = nodeData.inputs.filter((p) => p.id !== 'usb-device');
      const usbDeviceOutIdx = nodeData.outputs.findIndex((p) => p.id === 'usb-device-out');
      if (usbDeviceOutIdx !== -1) {
        nodeData.outputs[usbDeviceOutIdx] = { id: 'usb-device', label: 'USB Device', type: 'usb' };
      }
      // Backfill usb-device output if neither usb-device nor usb-device-out exists
      const updatedOutputIds = new Set(nodeData.outputs.map((p) => p.id));
      if (!updatedOutputIds.has('usb-device')) {
        const idx = nodeData.outputs.findIndex((p) => p.id === 'usb-host');
        if (idx !== -1) nodeData.outputs.splice(idx + 1, 0, { id: 'usb-device', label: 'USB Device', type: 'usb' });
      }
    } else {
      // Instrument nodes: rename usb-in-N → usb-device-N, usb-out-N → usb-host-N
      nodeData.inputs = nodeData.inputs.map((p) => {
        const match = p.id.match(/^usb-in-(\d+)$/);
        if (match) return { ...p, id: `usb-device-${match[1]}`, label: p.label.replace('USB In', 'USB Device') };
        return p;
      });
      nodeData.outputs = nodeData.outputs.map((p) => {
        const match = p.id.match(/^usb-out-(\d+)$/);
        if (match) return { ...p, id: `usb-host-${match[1]}`, label: p.label.replace('USB Out', 'USB Host') };
        return p;
      });
    }

    return { ...node, data: nodeData };
  });

  // Migrate edges: rename USB handles and rebuild IDs
  let edges = (data.edges as StudioEdge[]).map((edge) => {
    let { sourceHandle, targetHandle } = edge;
    let changed = false;

    // Rename usb-device-out → usb-device (Hapax output)
    if (sourceHandle === 'usb-device-out') { sourceHandle = 'usb-device'; changed = true; }
    // Rename usb-out-N → usb-host-N (instrument output)
    if (sourceHandle && /^usb-out-\d+$/.test(sourceHandle)) {
      sourceHandle = sourceHandle.replace('usb-out-', 'usb-host-');
      changed = true;
    }
    // Rename usb-in-N → usb-device-N (instrument input)
    if (targetHandle && /^usb-in-\d+$/.test(targetHandle)) {
      targetHandle = targetHandle.replace('usb-in-', 'usb-device-');
      changed = true;
    }

    if (!changed) return edge;

    return {
      ...edge,
      sourceHandle,
      targetHandle,
      id: `edge-${edge.source}-${sourceHandle}-${edge.target}-${targetHandle}`,
    };
  });

  // Remove edges that targeted the deleted Hapax usb-device input
  const hapaxId = nodes.find((n) => (n.data as InstrumentNodeData).isHapax)?.id;
  if (hapaxId) {
    edges = edges.filter((e) => !(e.target === hapaxId && e.targetHandle === 'usb-device'));
  }

  // Migrate custom presets: same port ID renames as instrument nodes
  const migratedPresets = customPresets.map((preset: InstrumentPreset) => {
    let changed = false;
    const inputs = preset.inputs.map((p) => {
      const match = p.id.match(/^usb-in-(\d+)$/);
      if (match) { changed = true; return { ...p, id: `usb-device-${match[1]}`, label: p.label.replace('USB In', 'USB Device') }; }
      return p;
    });
    const outputs = preset.outputs.map((p) => {
      const match = p.id.match(/^usb-out-(\d+)$/);
      if (match) { changed = true; return { ...p, id: `usb-host-${match[1]}`, label: p.label.replace('USB Out', 'USB Host') }; }
      return p;
    });
    return changed ? { ...preset, inputs, outputs } : preset;
  });

  return {
    version: data.version,
    exportedAt: data.exportedAt || '',
    nodes,
    edges,
    customPresets: migratedPresets,
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
