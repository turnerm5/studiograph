import type { InstrumentPreset, DrumLane } from '../types';

// Default drum lanes for Digitakt II (8 tracks, Auto-Channel mode)
export const DIGITAKT_II_DRUM_LANES: DrumLane[] = [
  { lane: 1, trig: null, chan: null, note: 0, name: 'KICK' },
  { lane: 2, trig: null, chan: null, note: 1, name: 'RIM' },
  { lane: 3, trig: null, chan: null, note: 2, name: 'SNARE' },
  { lane: 4, trig: null, chan: null, note: 3, name: 'CLOSED HH' },
  { lane: 5, trig: null, chan: null, note: 4, name: 'OPEN HH' },
  { lane: 6, trig: null, chan: null, note: 5, name: 'CLAP' },
  { lane: 7, trig: null, chan: null, note: 6, name: 'PERC 1' },
  { lane: 8, trig: null, chan: null, note: 7, name: 'PERC 2' },
];

// Default drum lanes for auto-populating when type switches to DRUM
export const DEFAULT_DRUM_LANES: DrumLane[] = [
  { lane: 1, trig: null, chan: null, note: 0, name: 'KICK' },
  { lane: 2, trig: null, chan: null, note: 1, name: 'RIM' },
  { lane: 3, trig: null, chan: null, note: 2, name: 'SNARE' },
  { lane: 4, trig: null, chan: null, note: 3, name: 'CLSD HH' },
  { lane: 5, trig: null, chan: null, note: 4, name: 'OPEN HH' },
  { lane: 6, trig: null, chan: null, note: 5, name: 'CLAP' },
  { lane: 7, trig: null, chan: null, note: 6, name: 'PERC 1' },
  { lane: 8, trig: null, chan: null, note: 7, name: 'PERC 2' },
];

export const HAPAX_PRESET: InstrumentPreset = {
  id: 'hapax',
  name: 'Hapax',
  manufacturer: 'Squarp',
  type: 'POLY',
  isHapax: true,
  isRemovable: false,
  inputs: [
    { id: 'midi-in-1', label: 'MIDI In 1', type: 'midi' },
    { id: 'midi-in-2', label: 'MIDI In 2', type: 'midi' },
    { id: 'usb-device', label: 'USB Device', type: 'midi' },
  ],
  outputs: [
    { id: 'midi-a', label: 'MIDI A', type: 'midi' },
    { id: 'midi-b', label: 'MIDI B', type: 'midi' },
    { id: 'midi-c', label: 'MIDI C', type: 'midi' },
    { id: 'usb-host', label: 'USB Host', type: 'midi' },
  ],
};

export const DIGITAKT_II_PRESET: InstrumentPreset = {
  id: 'digitakt-ii',
  name: 'Digitakt II',
  manufacturer: 'Elektron',
  type: 'DRUM',
  isRemovable: true,
  inputs: [
    { id: 'midi-in', label: 'MIDI In', type: 'midi' },
    { id: 'audio-in-l', label: 'In L', type: 'audio' },
    { id: 'audio-in-r', label: 'In R', type: 'audio' },
  ],
  outputs: [
    { id: 'midi-out', label: 'MIDI Out', type: 'midi' },
    { id: 'midi-thru', label: 'MIDI Thru', type: 'midi' },
    { id: 'audio-out-l', label: 'Out L', type: 'audio' },
    { id: 'audio-out-r', label: 'Out R', type: 'audio' },
    { id: 'audio-hp', label: 'Phones', type: 'audio' },
  ],
  defaultDrumLanes: DIGITAKT_II_DRUM_LANES,
};

export const DIGITONE_II_PRESET: InstrumentPreset = {
  id: 'digitone-ii',
  name: 'Digitone II',
  manufacturer: 'Elektron',
  type: 'POLY',
  isRemovable: true,
  inputs: [
    { id: 'midi-in', label: 'MIDI In', type: 'midi' },
    { id: 'audio-in-l', label: 'In L', type: 'audio' },
    { id: 'audio-in-r', label: 'In R', type: 'audio' },
  ],
  outputs: [
    { id: 'midi-out', label: 'MIDI Out', type: 'midi' },
    { id: 'midi-thru', label: 'MIDI Thru', type: 'midi' },
    { id: 'audio-out-l', label: 'Out L', type: 'audio' },
    { id: 'audio-out-r', label: 'Out R', type: 'audio' },
    { id: 'audio-hp', label: 'Phones', type: 'audio' },
  ],
};

export const NOVATION_SUMMIT_PRESET: InstrumentPreset = {
  id: 'novation-summit',
  name: 'Summit',
  manufacturer: 'Novation',
  type: 'POLY',
  isRemovable: true,
  inputs: [
    { id: 'midi-in', label: 'MIDI In', type: 'midi' },
    { id: 'audio-in-l', label: 'In L', type: 'audio' },
    { id: 'audio-in-r', label: 'In R', type: 'audio' },
  ],
  outputs: [
    { id: 'midi-out', label: 'MIDI Out', type: 'midi' },
    { id: 'audio-out-l', label: 'Out L', type: 'audio' },
    { id: 'audio-out-r', label: 'Out R', type: 'audio' },
    { id: 'audio-hp', label: 'Phones', type: 'audio' },
  ],
};

export const MICROCOSM_PRESET: InstrumentPreset = {
  id: 'hologram-microcosm',
  name: 'Microcosm',
  manufacturer: 'Hologram',
  type: 'POLY',
  isRemovable: true,
  inputs: [
    { id: 'midi-in', label: 'MIDI In', type: 'midi' },
    { id: 'audio-in-l', label: 'In L', type: 'audio' },
    { id: 'audio-in-r', label: 'In R', type: 'audio' },
  ],
  outputs: [
    { id: 'midi-thru', label: 'MIDI Thru', type: 'midi' },
    { id: 'audio-out-l', label: 'Out L', type: 'audio' },
    { id: 'audio-out-r', label: 'Out R', type: 'audio' },
  ],
};

export const UA_VOLT_PRESET: InstrumentPreset = {
  id: 'ua-volt',
  name: 'Volt',
  manufacturer: 'Universal Audio',
  type: 'POLY',
  isRemovable: true,
  inputs: [
    { id: 'midi-in', label: 'MIDI In', type: 'midi' },
    { id: 'audio-in-1', label: 'In 1', type: 'audio' },
    { id: 'audio-in-2', label: 'In 2', type: 'audio' },
    { id: 'audio-in-3', label: 'In 3', type: 'audio' },
    { id: 'audio-in-4', label: 'In 4', type: 'audio' },
  ],
  outputs: [
    { id: 'midi-out', label: 'MIDI Out', type: 'midi' },
    { id: 'audio-mon-l', label: 'Mon L', type: 'audio' },
    { id: 'audio-mon-r', label: 'Mon R', type: 'audio' },
    { id: 'audio-out-1', label: 'Out 1', type: 'audio' },
    { id: 'audio-out-2', label: 'Out 2', type: 'audio' },
    { id: 'audio-out-3', label: 'Out 3', type: 'audio' },
    { id: 'audio-out-4', label: 'Out 4', type: 'audio' },
  ],
};

export const YAMAHA_MONITORS_PRESET: InstrumentPreset = {
  id: 'yamaha-monitors',
  name: 'Monitors',
  manufacturer: 'Yamaha',
  type: 'POLY',
  isRemovable: true,
  inputs: [
    { id: 'audio-in-l', label: 'In L', type: 'audio' },
    { id: 'audio-in-r', label: 'In R', type: 'audio' },
  ],
  outputs: [],
};

export const OCTATRACK_PRESET: InstrumentPreset = {
  id: 'octatrack',
  name: 'Octatrack',
  manufacturer: 'Elektron',
  type: 'POLY',
  isRemovable: true,
  inputs: [
    { id: 'midi-in', label: 'MIDI In', type: 'midi' },
    { id: 'audio-in-a', label: 'In A', type: 'audio' },
    { id: 'audio-in-b', label: 'In B', type: 'audio' },
    { id: 'audio-in-c', label: 'In C', type: 'audio' },
    { id: 'audio-in-d', label: 'In D', type: 'audio' },
  ],
  outputs: [
    { id: 'midi-out', label: 'MIDI Out', type: 'midi' },
    { id: 'audio-cue-l', label: 'Cue L', type: 'audio' },
    { id: 'audio-cue-r', label: 'Cue R', type: 'audio' },
    { id: 'audio-out-l', label: 'Out L', type: 'audio' },
    { id: 'audio-out-r', label: 'Out R', type: 'audio' },
  ],
};

export const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  DIGITAKT_II_PRESET,
  DIGITONE_II_PRESET,
  OCTATRACK_PRESET,
  NOVATION_SUMMIT_PRESET,
  MICROCOSM_PRESET,
  UA_VOLT_PRESET,
  YAMAHA_MONITORS_PRESET,
];

// Port colors - different for input vs output, and by type
export const PORT_COLORS = {
  midi: {
    input: { bg: '#22c55e', border: '#16a34a' },   // Green for MIDI input
    output: { bg: '#3b82f6', border: '#1d4ed8' },  // Blue for MIDI output
  },
  audio: {
    input: { bg: '#f97316', border: '#ea580c' },   // Orange for Audio input
    output: { bg: '#ef4444', border: '#dc2626' },  // Red for Audio output
  },
  cv: {
    input: { bg: '#eab308', border: '#ca8a04' },   // Yellow for CV input
    output: { bg: '#a855f7', border: '#9333ea' },  // Purple for CV output
  },
};

// Edge colors by type
export const EDGE_COLORS = {
  midi: '#3b82f6',  // Blue
  audio: '#ef4444', // Red
  cv: '#eab308',    // Yellow
};
