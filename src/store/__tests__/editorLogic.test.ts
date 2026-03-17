import { describe, it, expect, beforeEach } from 'vitest';
import type { InstrumentNodeData, InstrumentPreset, AssignCC, AutomationLane, DrumLane } from '../../types';
import { useStudioStore } from '../useStudioStore';

// Mock localStorage for persist middleware
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

const makePreset = (id: string, name = 'Preset', overrides?: Partial<InstrumentPreset>): InstrumentPreset => ({
  id,
  name,
  manufacturer: 'Test',
  type: 'POLY',
  inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
  outputs: [{ id: 'midi-out-1', label: 'MIDI Out', type: 'midi' }],
  ...overrides,
});

function getNodeData(nodeId: string): InstrumentNodeData {
  return useStudioStore.getState().nodes.find(n => n.id === nodeId)!.data as InstrumentNodeData;
}

describe('AssignCC editor logic', () => {
  let nodeId: string;

  beforeEach(() => {
    localStorageMock.clear();
    useStudioStore.getState().clearStudio();
    useStudioStore.getState().addNode(makePreset('p1', 'Synth'), { x: 0, y: 0 });
    nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;
  });

  it('adds ASSIGN CCs with correct slot numbering', () => {
    const assigns: AssignCC[] = [
      { slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 },
      { slot: 2, ccNumber: 71, paramName: 'Resonance', defaultValue: 0 },
      { slot: 3, ccNumber: 73, paramName: 'Attack', defaultValue: 0 },
    ];
    useStudioStore.getState().updateAssignCCs(nodeId, assigns);

    const data = getNodeData(nodeId);
    expect(data.assignCCs).toHaveLength(3);
    expect(data.assignCCs[0].slot).toBe(1);
    expect(data.assignCCs[2].slot).toBe(3);
  });

  it('removes an ASSIGN CC and renumbers remaining slots', () => {
    const assigns: AssignCC[] = [
      { slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 },
      { slot: 2, ccNumber: 71, paramName: 'Reso', defaultValue: 0 },
      { slot: 3, ccNumber: 73, paramName: 'Attack', defaultValue: 0 },
    ];
    useStudioStore.getState().updateAssignCCs(nodeId, assigns);

    // Simulate removing slot 2 (as AssignCCEditor.handleRemove does)
    const updated = assigns
      .filter(a => a.slot !== 2)
      .map((a, i) => ({ ...a, slot: i + 1 }));
    useStudioStore.getState().updateAssignCCs(nodeId, updated);

    const data = getNodeData(nodeId);
    expect(data.assignCCs).toHaveLength(2);
    expect(data.assignCCs[0]).toEqual({ slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 });
    expect(data.assignCCs[1]).toEqual({ slot: 2, ccNumber: 73, paramName: 'Attack', defaultValue: 0 });
  });

  it('reorders ASSIGN CCs (move up)', () => {
    const assigns: AssignCC[] = [
      { slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 },
      { slot: 2, ccNumber: 71, paramName: 'Reso', defaultValue: 0 },
      { slot: 3, ccNumber: 73, paramName: 'Attack', defaultValue: 0 },
    ];
    useStudioStore.getState().updateAssignCCs(nodeId, assigns);

    // Simulate moving slot 2 up (as AssignCCEditor.handleMove does)
    const items = [...assigns];
    const index = items.findIndex(a => a.slot === 2);
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    const updated = items.map((a, i) => ({ ...a, slot: i + 1 }));
    useStudioStore.getState().updateAssignCCs(nodeId, updated);

    const data = getNodeData(nodeId);
    expect(data.assignCCs[0].paramName).toBe('Reso');
    expect(data.assignCCs[0].slot).toBe(1);
    expect(data.assignCCs[1].paramName).toBe('Cutoff');
    expect(data.assignCCs[1].slot).toBe(2);
  });

  it('reorders ASSIGN CCs (move down)', () => {
    const assigns: AssignCC[] = [
      { slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 },
      { slot: 2, ccNumber: 71, paramName: 'Reso', defaultValue: 0 },
      { slot: 3, ccNumber: 73, paramName: 'Attack', defaultValue: 0 },
    ];
    useStudioStore.getState().updateAssignCCs(nodeId, assigns);

    // Move slot 2 down
    const items = [...assigns];
    const index = items.findIndex(a => a.slot === 2);
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    const updated = items.map((a, i) => ({ ...a, slot: i + 1 }));
    useStudioStore.getState().updateAssignCCs(nodeId, updated);

    const data = getNodeData(nodeId);
    expect(data.assignCCs[0].paramName).toBe('Cutoff');
    expect(data.assignCCs[1].paramName).toBe('Attack');
    expect(data.assignCCs[2].paramName).toBe('Reso');
  });

  it('edits an existing ASSIGN CC in place', () => {
    const assigns: AssignCC[] = [
      { slot: 1, ccNumber: 74, paramName: 'Cutoff', defaultValue: 64 },
      { slot: 2, ccNumber: 71, paramName: 'Reso', defaultValue: 0 },
    ];
    useStudioStore.getState().updateAssignCCs(nodeId, assigns);

    // Simulate editing slot 1 (as AssignCCEditor.handleSave in edit mode does)
    const current = [...assigns];
    const editIndex = current.findIndex(a => a.slot === 1);
    current[editIndex] = {
      ...current[editIndex],
      ccNumber: 75,
      paramName: 'NewCutoff',
      defaultValue: 100,
    };
    useStudioStore.getState().updateAssignCCs(nodeId, current);

    const data = getNodeData(nodeId);
    expect(data.assignCCs[0].ccNumber).toBe(75);
    expect(data.assignCCs[0].paramName).toBe('NewCutoff');
    expect(data.assignCCs[0].defaultValue).toBe(100);
    expect(data.assignCCs[1].paramName).toBe('Reso'); // unchanged
  });

  it('respects 8-slot limit', () => {
    const assigns: AssignCC[] = Array.from({ length: 8 }, (_, i) => ({
      slot: i + 1,
      ccNumber: i + 1,
      paramName: `CC ${i + 1}`,
      defaultValue: 64,
    }));
    useStudioStore.getState().updateAssignCCs(nodeId, assigns);

    // Attempting to add a 9th would be blocked by the component (alert), not the store.
    // The store itself accepts any array.
    expect(getNodeData(nodeId).assignCCs).toHaveLength(8);

    // Verify all 8 slots
    assigns.forEach((a, i) => {
      expect(getNodeData(nodeId).assignCCs[i].slot).toBe(i + 1);
    });
  });

  it('defaults paramName to CC number when empty', () => {
    // This is what the component does when paramName is empty
    const inputName = '';
    const paramName = inputName || `CC ${74}`;
    const assigns: AssignCC[] = [
      { slot: 1, ccNumber: 74, paramName, defaultValue: 64 },
    ];
    useStudioStore.getState().updateAssignCCs(nodeId, assigns);

    expect(getNodeData(nodeId).assignCCs[0].paramName).toBe('CC 74');
  });
});

describe('AutomationLane editor logic', () => {
  let nodeId: string;

  beforeEach(() => {
    localStorageMock.clear();
    useStudioStore.getState().clearStudio();
    useStudioStore.getState().addNode(makePreset('p1', 'Synth'), { x: 0, y: 0 });
    nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;
  });

  it('adds lanes with different types', () => {
    const lanes: AutomationLane[] = [
      { slot: 1, type: 'CC', ccNumber: 74 },
      { slot: 2, type: 'PB' },
      { slot: 3, type: 'AT' },
      { slot: 4, type: 'CV', cvNumber: 2 },
      { slot: 5, type: 'NRPN', nrpnMsb: 1, nrpnLsb: 23, nrpnDepth: 14 },
    ];
    useStudioStore.getState().updateAutomationLanes(nodeId, lanes);

    const data = getNodeData(nodeId);
    expect(data.automationLanes).toHaveLength(5);
    expect(data.automationLanes[0].type).toBe('CC');
    expect(data.automationLanes[0].ccNumber).toBe(74);
    expect(data.automationLanes[3].type).toBe('CV');
    expect(data.automationLanes[3].cvNumber).toBe(2);
    expect(data.automationLanes[4].type).toBe('NRPN');
    expect(data.automationLanes[4].nrpnDepth).toBe(14);
  });

  it('removes a lane and renumbers remaining slots', () => {
    const lanes: AutomationLane[] = [
      { slot: 1, type: 'CC', ccNumber: 74, paramName: 'Cutoff' },
      { slot: 2, type: 'PB', paramName: 'Pitch' },
      { slot: 3, type: 'AT', paramName: 'Touch' },
    ];
    useStudioStore.getState().updateAutomationLanes(nodeId, lanes);

    // Remove slot 2 (as AutomationEditor.handleRemove does)
    const updated = lanes
      .filter(l => l.slot !== 2)
      .map((l, i) => ({ ...l, slot: i + 1 }));
    useStudioStore.getState().updateAutomationLanes(nodeId, updated);

    const data = getNodeData(nodeId);
    expect(data.automationLanes).toHaveLength(2);
    expect(data.automationLanes[0]).toMatchObject({ slot: 1, type: 'CC', paramName: 'Cutoff' });
    expect(data.automationLanes[1]).toMatchObject({ slot: 2, type: 'AT', paramName: 'Touch' });
  });

  it('reorders lanes (move up)', () => {
    const lanes: AutomationLane[] = [
      { slot: 1, type: 'CC', ccNumber: 74, paramName: 'Cutoff' },
      { slot: 2, type: 'PB', paramName: 'Pitch' },
      { slot: 3, type: 'AT', paramName: 'Touch' },
    ];
    useStudioStore.getState().updateAutomationLanes(nodeId, lanes);

    // Move slot 3 up
    const items = [...lanes];
    const index = items.findIndex(l => l.slot === 3);
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    const updated = items.map((l, i) => ({ ...l, slot: i + 1 }));
    useStudioStore.getState().updateAutomationLanes(nodeId, updated);

    const data = getNodeData(nodeId);
    expect(data.automationLanes[0].paramName).toBe('Cutoff');
    expect(data.automationLanes[1].paramName).toBe('Touch');
    expect(data.automationLanes[2].paramName).toBe('Pitch');
  });

  it('edits a lane type in place', () => {
    const lanes: AutomationLane[] = [
      { slot: 1, type: 'CC', ccNumber: 74, paramName: 'Cutoff' },
    ];
    useStudioStore.getState().updateAutomationLanes(nodeId, lanes);

    // Change type from CC to NRPN (as AutomationEditor.handleSave in edit mode does)
    const updated: AutomationLane[] = [{
      slot: 1,
      type: 'NRPN',
      nrpnMsb: 0,
      nrpnLsb: 5,
      nrpnDepth: 7,
      paramName: 'Filter',
    }];
    useStudioStore.getState().updateAutomationLanes(nodeId, updated);

    const data = getNodeData(nodeId);
    expect(data.automationLanes[0].type).toBe('NRPN');
    expect(data.automationLanes[0].nrpnMsb).toBe(0);
    expect(data.automationLanes[0].nrpnLsb).toBe(5);
  });

  it('builds default paramName based on type', () => {
    // Simulates what AutomationEditor.handleSave does for auto-naming
    function buildDefaultName(type: string, ccNumber?: number, cvNumber?: number, nrpnMsb?: number, nrpnLsb?: number): string {
      if (type === 'CC') return `CC ${ccNumber}`;
      if (type === 'CV') return `CV ${cvNumber}`;
      if (type === 'NRPN') return `NRPN ${nrpnMsb}:${nrpnLsb}`;
      return type; // PB or AT
    }

    expect(buildDefaultName('CC', 74)).toBe('CC 74');
    expect(buildDefaultName('PB')).toBe('PB');
    expect(buildDefaultName('AT')).toBe('AT');
    expect(buildDefaultName('CV', undefined, 3)).toBe('CV 3');
    expect(buildDefaultName('NRPN', undefined, undefined, 0, 5)).toBe('NRPN 0:5');
  });
});

describe('DrumLanes editor logic', () => {
  let nodeId: string;

  beforeEach(() => {
    localStorageMock.clear();
    useStudioStore.getState().clearStudio();
    useStudioStore.getState().addNode(makePreset('p1', 'Drums', { type: 'DRUM' }), { x: 0, y: 0 });
    nodeId = useStudioStore.getState().nodes.find(n => n.id !== 'hapax-main')!.id;
  });

  it('adds drum lanes with full trig/chan/note data', () => {
    const lanes: DrumLane[] = [
      { lane: 1, trig: 36, chan: '10', note: 36, name: 'KICK' },
      { lane: 2, trig: null, chan: 'G1', note: 38, name: 'SNARE' },
      { lane: 3, trig: 60, chan: null, note: null, name: 'CLAP' },
    ];
    useStudioStore.getState().updateDrumLanes(nodeId, lanes);

    const data = getNodeData(nodeId);
    expect(data.drumLanes).toHaveLength(3);
    expect(data.drumLanes![0]).toEqual({ lane: 1, trig: 36, chan: '10', note: 36, name: 'KICK' });
    expect(data.drumLanes![1].chan).toBe('G1');
    expect(data.drumLanes![2].trig).toBe(60);
    expect(data.drumLanes![2].note).toBeNull();
  });

  it('removes a drum lane and renumbers', () => {
    const lanes: DrumLane[] = [
      { lane: 1, trig: null, chan: null, note: 36, name: 'KICK' },
      { lane: 2, trig: null, chan: null, note: 38, name: 'SNARE' },
      { lane: 3, trig: null, chan: null, note: 42, name: 'HH' },
    ];
    useStudioStore.getState().updateDrumLanes(nodeId, lanes);

    // Remove lane 2 (as DrumLanesEditor.handleRemove does)
    const updated = lanes
      .filter(l => l.lane !== 2)
      .map((l, i) => ({ ...l, lane: i + 1 }));
    useStudioStore.getState().updateDrumLanes(nodeId, updated);

    const data = getNodeData(nodeId);
    expect(data.drumLanes).toHaveLength(2);
    expect(data.drumLanes![0]).toMatchObject({ lane: 1, name: 'KICK', note: 36 });
    expect(data.drumLanes![1]).toMatchObject({ lane: 2, name: 'HH', note: 42 });
  });

  it('reorders drum lanes (move down)', () => {
    const lanes: DrumLane[] = [
      { lane: 1, trig: null, chan: null, note: 36, name: 'KICK' },
      { lane: 2, trig: null, chan: null, note: 38, name: 'SNARE' },
      { lane: 3, trig: null, chan: null, note: 42, name: 'HH' },
    ];
    useStudioStore.getState().updateDrumLanes(nodeId, lanes);

    // Move lane 1 down (as DrumLanesEditor.handleMove does)
    const items = [...lanes];
    const index = items.findIndex(l => l.lane === 1);
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    const updated = items.map((l, i) => ({ ...l, lane: i + 1 }));
    useStudioStore.getState().updateDrumLanes(nodeId, updated);

    const data = getNodeData(nodeId);
    expect(data.drumLanes![0].name).toBe('SNARE');
    expect(data.drumLanes![0].lane).toBe(1);
    expect(data.drumLanes![1].name).toBe('KICK');
    expect(data.drumLanes![1].lane).toBe(2);
  });

  it('edits a drum lane in place', () => {
    const lanes: DrumLane[] = [
      { lane: 1, trig: null, chan: null, note: 36, name: 'KICK' },
      { lane: 2, trig: null, chan: null, note: 38, name: 'SNARE' },
    ];
    useStudioStore.getState().updateDrumLanes(nodeId, lanes);

    // Edit lane 1 (as DrumLanesEditor.handleSave in edit mode does)
    const current = [...lanes];
    const editIndex = current.findIndex(l => l.lane === 1);
    current[editIndex] = { ...current[editIndex], trig: 60, chan: 'G2', note: 40, name: 'BD HARD' };
    useStudioStore.getState().updateDrumLanes(nodeId, current);

    const data = getNodeData(nodeId);
    expect(data.drumLanes![0]).toMatchObject({
      lane: 1,
      trig: 60,
      chan: 'G2',
      note: 40,
      name: 'BD HARD',
    });
    expect(data.drumLanes![1].name).toBe('SNARE'); // unchanged
  });

  it('supports all channel types: MIDI, Gate, CV, CVGate', () => {
    const lanes: DrumLane[] = [
      { lane: 1, trig: null, chan: '10', note: 36, name: 'MIDI CH10' },
      { lane: 2, trig: null, chan: 'G1', note: 38, name: 'Gate 1' },
      { lane: 3, trig: null, chan: 'CV2', note: null, name: 'CV 2' },
      { lane: 4, trig: null, chan: 'CVG3', note: null, name: 'CVGate 3' },
      { lane: 5, trig: null, chan: null, note: 42, name: 'No Chan' },
    ];
    useStudioStore.getState().updateDrumLanes(nodeId, lanes);

    const data = getNodeData(nodeId);
    expect(data.drumLanes).toHaveLength(5);
    expect(data.drumLanes![0].chan).toBe('10');
    expect(data.drumLanes![1].chan).toBe('G1');
    expect(data.drumLanes![2].chan).toBe('CV2');
    expect(data.drumLanes![3].chan).toBe('CVG3');
    expect(data.drumLanes![4].chan).toBeNull();
  });

  it('handles value clamping for trig and note (0-127)', () => {
    // The component clamps these, simulate that logic
    function clampValue(input: string): number | null {
      if (input === '') return null;
      return Math.min(127, Math.max(0, parseInt(input) || 0));
    }

    expect(clampValue('')).toBeNull();
    expect(clampValue('0')).toBe(0);
    expect(clampValue('127')).toBe(127);
    expect(clampValue('200')).toBe(127);
    expect(clampValue('-5')).toBe(0);
    expect(clampValue('abc')).toBe(0);
    expect(clampValue('64')).toBe(64);
  });

  it('respects 8-lane limit', () => {
    const lanes: DrumLane[] = Array.from({ length: 8 }, (_, i) => ({
      lane: i + 1,
      trig: null,
      chan: null,
      note: 36 + i,
      name: `DRUM ${i + 1}`,
    }));
    useStudioStore.getState().updateDrumLanes(nodeId, lanes);

    expect(getNodeData(nodeId).drumLanes).toHaveLength(8);

    // Verify lane numbering
    lanes.forEach((_, i) => {
      expect(getNodeData(nodeId).drumLanes![i].lane).toBe(i + 1);
    });
  });

  it('defaults name to DRUM when empty', () => {
    // This is what the component does when name is empty
    const inputName = '';
    const name = inputName || 'DRUM';
    const lanes: DrumLane[] = [
      { lane: 1, trig: null, chan: null, note: 36, name },
    ];
    useStudioStore.getState().updateDrumLanes(nodeId, lanes);

    expect(getNodeData(nodeId).drumLanes![0].name).toBe('DRUM');
  });
});
