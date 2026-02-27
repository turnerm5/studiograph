import type { InstrumentPreset, DrumLane } from '../types';

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
    { id: 'cv-in-1', label: 'CV In 1', type: 'cv' },
    { id: 'cv-in-2', label: 'CV In 2', type: 'cv' },
  ],
  outputs: [
    { id: 'midi-a', label: 'MIDI A', type: 'midi' },
    { id: 'midi-b', label: 'MIDI B', type: 'midi' },
    { id: 'midi-c', label: 'MIDI C', type: 'midi' },
    { id: 'usb-host', label: 'USB Host', type: 'midi' },
    { id: 'cv-1', label: 'CV 1', type: 'cv' },
    { id: 'cv-2', label: 'CV 2', type: 'cv' },
    { id: 'cv-3', label: 'CV 3', type: 'cv' },
    { id: 'cv-4', label: 'CV 4', type: 'cv' },
    { id: 'gate-1', label: 'Gate 1', type: 'cv' },
    { id: 'gate-2', label: 'Gate 2', type: 'cv' },
    { id: 'gate-3', label: 'Gate 3', type: 'cv' },
    { id: 'gate-4', label: 'Gate 4', type: 'cv' },
  ],
};

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
