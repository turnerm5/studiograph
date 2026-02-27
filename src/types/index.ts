import type { Node, Edge } from '@xyflow/react';

export type PortType = 'midi' | 'audio' | 'cv';

export interface Port {
  id: string;
  label: string;
  type: PortType;
}

export interface CCMapping {
  ccNumber: number;
  paramName: string;        // Cleaned/abbreviated for Hapax export
  fullParamName?: string;   // Original full name for display
  section?: string;
  defaultValue?: number;
}

export interface NRPNMapping {
  msb: number;
  lsb: number;
  paramName: string;
  section?: string;
  defaultValue?: number;
}

export type InstrumentType = 'POLY' | 'DRUM' | 'MPE';

export interface DrumLane {
  lane: number;         // Row number (1-8), maps to ROW in Hapax export
  trig: number | null;  // TRIG (0-127) or null
  chan: string | null;   // CHAN: "1"-"16", "G1"-"G4", "CV1"-"CV4", "CVG1"-"CVG4", or null
  note: number | null;  // Note number (0-127) or null
  name: string;         // Drum sound name
}

export interface AssignCC {
  slot: number;       // 1-8
  ccNumber: number;
  paramName: string;
  defaultValue: number;
}

export type AutomationType = 'CC' | 'PB' | 'AT' | 'CV' | 'NRPN';

export interface AutomationLane {
  slot: number;         // 1-64
  type: AutomationType;
  ccNumber?: number;    // 0-119, for CC type
  cvNumber?: number;    // 1-4, for CV type
  nrpnMsb?: number;    // 0-127, for NRPN type
  nrpnLsb?: number;    // 0-127, for NRPN type
  nrpnDepth?: 7 | 14;  // NRPN bit depth
  paramName?: string;   // Display name
}

export interface InstrumentNodeData extends Record<string, unknown> {
  name: string;
  manufacturer: string;
  channel: number;
  type: InstrumentType;
  inputs: Port[];
  outputs: Port[];
  ccMap: CCMapping[];
  nrpnMap: NRPNMapping[];
  assignCCs: AssignCC[];  // Up to 8 CCs for ASSIGN section
  automationLanes: AutomationLane[];  // Up to 64 automation lanes
  drumLanes?: DrumLane[]; // For DRUM type - maps notes to drum sounds
  isHapax?: boolean;
  isRemovable?: boolean;
  width?: number;  // Custom width set by user resizing
  iconId?: string; // Icon identifier for display
  localOff?: boolean; // Local Off prevents MIDI feedback loops
  presetId?: string; // Links canvas node to sidebar preset for edit propagation
  showCVPorts?: boolean; // Toggle visibility of CV/Gate ports (for Hapax)
}

export type InstrumentNode = Node<InstrumentNodeData>;

export interface StudioEdge extends Edge {
  data?: {
    portType: PortType;
    routingOffset?: number;
  };
}

export interface InstrumentPreset {
  id: string;
  name: string;
  manufacturer: string;
  type: InstrumentType;
  inputs: Port[];
  outputs: Port[];
  isHapax?: boolean;
  isRemovable?: boolean;
  defaultDrumLanes?: DrumLane[];  // Default drum lanes for DRUM type presets
  iconId?: string;  // Icon identifier for sidebar display
  ccMap?: CCMapping[];  // Pre-loaded CC mappings (from midi.guide)
  nrpnMap?: NRPNMapping[];  // Pre-loaded NRPN mappings (from midi.guide)
}

// CSV row structure from the complex format
export interface CSVRow {
  manufacturer: string;
  device: string;
  section: string;
  parameter_name: string;
  parameter_description: string;
  cc_msb: string;
  cc_lsb: string;
  cc_min_value: string;
  cc_max_value: string;
  cc_default_value: string;
  nrpn_msb: string;
  nrpn_lsb: string;
  nrpn_min_value: string;
  nrpn_max_value: string;
  nrpn_default_value: string;
  orientation: string;
  notes: string;
  usage: string;
}

// Export definition structure
export interface HapaxDefinition {
  name: string;
  manufacturer: string;
  trackName: string;
  type: InstrumentType;
  outPort: string;
  outChannel: number;
  ccMappings: CCMapping[];
  nrpnMappings: NRPNMapping[];
  assignCCs: AssignCC[];
  automationLanes: AutomationLane[];
  drumLanes?: DrumLane[];
}
