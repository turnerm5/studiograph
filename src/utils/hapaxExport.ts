import type { Node, Edge } from '@xyflow/react';
import type { InstrumentNodeData, HapaxDefinition, AutomationLane } from '../types';
import { groupBySection, groupNRPNBySection } from './csvParser';
import { traceHapaxRouting } from './hapaxRouting';

interface ConnectedInstrument {
  node: Node<InstrumentNodeData>;
  hapaxPort: string;
  isAnalog: boolean;
}

const HAPAX_PORT_MAP: Record<string, { outPort: string; isAnalog: boolean }> = {
  'midi-a': { outPort: 'A', isAnalog: false },
  'midi-b': { outPort: 'B', isAnalog: false },
  'midi-c': { outPort: 'C', isAnalog: false },
  'midi-d': { outPort: 'D', isAnalog: false },
  'usb-host': { outPort: 'USBH', isAnalog: false },
  'usb-device': { outPort: 'USBD', isAnalog: false },
  'cv-1': { outPort: 'CV1', isAnalog: true },
  'cv-2': { outPort: 'CV2', isAnalog: true },
  'cv-3': { outPort: 'CV3', isAnalog: true },
  'cv-4': { outPort: 'CV4', isAnalog: true },
  'gate-1': { outPort: 'G1', isAnalog: true },
  'gate-2': { outPort: 'G2', isAnalog: true },
  'gate-3': { outPort: 'G3', isAnalog: true },
  'gate-4': { outPort: 'G4', isAnalog: true },
};

// Find all instruments connected to the Hapax's MIDI outputs
export function findConnectedInstruments(
  nodes: Node<InstrumentNodeData>[],
  edges: Edge[]
): ConnectedInstrument[] {
  const hapaxNode = nodes.find((n) => {
    const data = n.data as InstrumentNodeData;
    return data.isHapax;
  });
  if (!hapaxNode) return [];

  const raw: ConnectedInstrument[] = [];

  // Use BFS trace to find all MIDI-reachable nodes (direct + downstream)
  const routing = traceHapaxRouting(nodes, edges);

  for (const [nodeId, handles] of routing) {
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode) continue;
    const targetData = targetNode.data as InstrumentNodeData;
    if (targetData.isHapax) continue;

    for (const handle of handles) {
      const portInfo = HAPAX_PORT_MAP[handle];
      if (!portInfo) continue;
      raw.push({ node: targetNode, hapaxPort: portInfo.outPort, isAnalog: portInfo.isAnalog });
    }
  }

  // Also add direct CV/Gate connections (these are always direct from Hapax)
  for (const edge of edges) {
    if (edge.source !== hapaxNode.id) continue;
    const sourceHandle = edge.sourceHandle || '';
    const portInfo = HAPAX_PORT_MAP[sourceHandle];
    if (!portInfo || !portInfo.isAnalog) continue;

    const targetNode = nodes.find((n) => n.id === edge.target);
    if (targetNode) {
      const targetData = targetNode.data as InstrumentNodeData;
      if (!targetData.isHapax) {
        // Only add if not already present from BFS (BFS only follows MIDI/USB)
        const alreadyHas = raw.some(
          (r) => r.node.id === targetNode.id && r.hapaxPort === portInfo.outPort
        );
        if (!alreadyHas) {
          raw.push({ node: targetNode, hapaxPort: portInfo.outPort, isAnalog: true });
        }
      }
    }
  }

  // CV+Gate combination: merge cv-N + gate-N to same target into CVGx
  const grouped = new Map<string, ConnectedInstrument[]>();
  for (const inst of raw) {
    const list = grouped.get(inst.node.id) || [];
    list.push(inst);
    grouped.set(inst.node.id, list);
  }

  const result: ConnectedInstrument[] = [];
  for (const instruments of grouped.values()) {
    const cvEntries = instruments.filter(i => /^CV\d$/.test(i.hapaxPort));
    const gateEntries = instruments.filter(i => /^G\d$/.test(i.hapaxPort));
    const others = instruments.filter(i => !/^CV\d$/.test(i.hapaxPort) && !/^G\d$/.test(i.hapaxPort));
    result.push(...others);

    const matchedCV = new Set<string>();
    const matchedGate = new Set<string>();

    for (const cv of cvEntries) {
      const n = cv.hapaxPort.replace('CV', '');
      const gate = gateEntries.find(g => g.hapaxPort === `G${n}`);
      if (gate) {
        result.push({ node: cv.node, hapaxPort: `CVG${n}`, isAnalog: true });
        matchedCV.add(cv.hapaxPort);
        matchedGate.add(gate.hapaxPort);
      }
    }

    for (const cv of cvEntries) {
      if (!matchedCV.has(cv.hapaxPort)) result.push(cv);
    }
    for (const gate of gateEntries) {
      if (!matchedGate.has(gate.hapaxPort)) result.push(gate);
    }
  }

  return result;
}

function formatAutomationLane(lane: AutomationLane): string {
  switch (lane.type) {
    case 'CC':
      return `CC:${lane.ccNumber ?? 0}`;
    case 'PB':
      return 'PB:';
    case 'AT':
      return 'AT:';
    case 'CV':
      return `CV:${lane.cvNumber ?? 1}`;
    case 'NRPN':
      return `NRPN:${lane.nrpnMsb ?? 0}:${lane.nrpnLsb ?? 0}:${lane.nrpnDepth ?? 7}`;
  }
}

// Generate a single Hapax definition file content
export function generateHapaxDefinition(definition: HapaxDefinition): string {
  const lines: string[] = [];

  // Header
  const headerName = `${definition.manufacturer.toUpperCase()} ${definition.name.toUpperCase()}`;
  lines.push(`############# ${headerName} #############`);
  lines.push('VERSION 1');
  lines.push(`TRACKNAME ${definition.trackName}`);
  lines.push(`TYPE ${definition.type}`);
  lines.push(`OUTPORT ${definition.outPort}`);
  lines.push(`OUTCHAN ${definition.outChannel}`);
  lines.push('INPORT NULL');
  lines.push('INCHAN NULL');
  lines.push('MAXRATE NULL');
  lines.push('');

  // DRUMLANES section
  lines.push('[DRUMLANES]');
  if (definition.type === 'DRUM' && definition.drumLanes && definition.drumLanes.length > 0) {
    // Sort by lane number descending (higher lanes first, matching Hapax format)
    const sortedLanes = [...definition.drumLanes].sort((a, b) => b.lane - a.lane);
    for (const lane of sortedLanes) {
      const row = lane.lane;
      const trig = lane.trig !== null && lane.trig !== undefined ? lane.trig : 'NULL';
      const chan = lane.chan || 'NULL';
      const note = lane.note !== null && lane.note !== undefined ? lane.note : 'NULL';
      lines.push(`${row}:${trig}:${chan}:${note} ${lane.name}`);
    }
  }
  lines.push('[/DRUMLANES]');
  lines.push('');

  // PC section (empty for now)
  lines.push('[PC]');
  lines.push('[/PC]');
  lines.push('');

  // CC section
  lines.push('[CC]');
  if (definition.ccMappings.length > 0) {
    const grouped = groupBySection(definition.ccMappings);
    for (const [section, mappings] of grouped) {
      lines.push(`# ${section}`);
      for (const mapping of mappings) {
        lines.push(`${mapping.ccNumber} ${mapping.paramName}`);
      }
      lines.push('');
    }
  }
  lines.push('[/CC]');
  lines.push('');

  // NRPN section
  lines.push('[NRPN]');
  if (definition.nrpnMappings.length > 0) {
    const grouped = groupNRPNBySection(definition.nrpnMappings);
    for (const [section, mappings] of grouped) {
      lines.push(`# ${section}`);
      for (const mapping of mappings) {
        lines.push(`${mapping.msb}:${mapping.lsb}:7 ${mapping.paramName}`);
      }
      lines.push('');
    }
  }
  lines.push('[/NRPN]');
  lines.push('');

  // ASSIGN section
  lines.push('[ASSIGN]');
  if (definition.assignCCs && definition.assignCCs.length > 0) {
    for (const assign of definition.assignCCs) {
      lines.push(`${assign.ccNumber} ${assign.paramName} ${assign.defaultValue}`);
    }
  }
  lines.push('[/ASSIGN]');
  lines.push('');

  // AUTOMATION section
  lines.push('[AUTOMATION]');
  if (definition.automationLanes && definition.automationLanes.length > 0) {
    for (const lane of definition.automationLanes) {
      lines.push(formatAutomationLane(lane));
    }
  }
  lines.push('[/AUTOMATION]');
  lines.push('');

  // COMMENT section
  lines.push('[COMMENT]');
  lines.push(`${definition.manufacturer} ${definition.name}`);
  lines.push('Generated by StudioGraph');
  lines.push('[/COMMENT]');

  return lines.join('\n');
}

// Generate definitions for all connected instruments
export function generateAllDefinitions(
  nodes: Node<InstrumentNodeData>[],
  edges: Edge[]
): { nodeId: string; filename: string; content: string }[] {
  const connected = findConnectedInstruments(nodes, edges);
  const definitions: { nodeId: string; filename: string; content: string }[] = [];

  // Count connections per node for filename/trackname dedup
  const nodeConnectionCount = new Map<string, number>();
  for (const { node } of connected) {
    nodeConnectionCount.set(node.id, (nodeConnectionCount.get(node.id) || 0) + 1);
  }

  for (const { node, hapaxPort, isAnalog } of connected) {
    const data = node.data as InstrumentNodeData;
    const hasMultiple = (nodeConnectionCount.get(node.id) || 0) > 1;

    // Create a clean track name (no spaces, short), with port suffix for multi-connection
    const baseName = data.name.replace(/\s+/g, '');
    const trackName = hasMultiple
      ? `${baseName}_${hapaxPort}`.substring(0, 12)
      : baseName.substring(0, 12);

    const definition: HapaxDefinition = {
      name: data.name,
      manufacturer: data.manufacturer,
      trackName,
      type: data.type,
      outPort: hapaxPort,
      outChannel: isAnalog ? 'NULL' : data.channel,
      ccMappings: data.ccMap,
      nrpnMappings: data.nrpnMap,
      assignCCs: data.assignCCs || [],
      automationLanes: data.automationLanes || [],
      drumLanes: data.drumLanes,
    };

    const content = generateHapaxDefinition(definition);
    const sanitized = data.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = hasMultiple
      ? `${sanitized}_${hapaxPort}.txt`
      : `${sanitized}.txt`;

    definitions.push({ nodeId: node.id, filename, content });
  }

  return definitions;
}

// Trigger download of a single file
export function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export all definitions as separate downloads
export function exportAllDefinitions(
  nodes: Node<InstrumentNodeData>[],
  edges: Edge[]
): number {
  const definitions = generateAllDefinitions(nodes, edges);

  for (const { filename, content } of definitions) {
    downloadFile(filename, content);
  }

  return definitions.length;
}
