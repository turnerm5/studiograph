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
  channel: number;      // MIDI channel (1-16)
  note: number;         // MIDI note number
  lane: number;         // Lane number for display
  name: string;         // Name of the drum sound
}

export interface AssignCC {
  slot: number;       // 1-8
  ccNumber: number;
  paramName: string;
  defaultValue: number;
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
  drumLanes?: DrumLane[]; // For DRUM type - maps notes to drum sounds
  isHapax?: boolean;
  isRemovable?: boolean;
  width?: number;  // Custom width set by user resizing
  iconId?: string; // Icon identifier for display
  localOff?: boolean; // Local Off prevents MIDI feedback loops
}

export type InstrumentNode = Node<InstrumentNodeData>;

export interface StudioEdge extends Edge {
  data?: {
    portType: PortType;
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
  drumLanes?: DrumLane[];
}
