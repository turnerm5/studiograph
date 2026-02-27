import { cleanParamName, groupBySection, groupNRPNBySection, parseCSVString } from '../csvParser';
import type { CCMapping, NRPNMapping } from '../../types';

describe('cleanParamName', () => {
  it('removes device prefix', () => {
    expect(cleanParamName('Source: Tune')).toBe('Tune');
  });

  it('applies abbreviations', () => {
    expect(cleanParamName('Oscillator Frequency')).toBe('OscFreq');
  });

  it('strips whitespace', () => {
    expect(cleanParamName('Osc Pitch')).toBe('OscPitch');
  });

  it('truncates to 12 characters', () => {
    const result = cleanParamName('A Very Long Parameter Name');
    expect(result.length).toBeLessThanOrEqual(12);
  });

  it('applies multiple abbreviations in one name', () => {
    expect(cleanParamName('Filter Resonance')).toBe('FltReso');
  });

  it('returns Unknown for empty input', () => {
    expect(cleanParamName('')).toBe('Unknown');
  });

  it('returns Unknown for whitespace-only after cleaning', () => {
    // The prefix removal regex "^[^:]+:\s*" would match "foo: " leaving ""
    // But plain whitespace "   " doesn't match the prefix pattern, whitespace is stripped later
    // After stripping, it becomes "" → "Unknown"
    expect(cleanParamName('  :  ')).toBe('Unknown');
  });

  it('passes through already short names unchanged', () => {
    expect(cleanParamName('Cutoff')).toBe('Cutoff');
  });

  it('abbreviates Attack/Decay/Sustain/Release (ADSR)', () => {
    expect(cleanParamName('Attack')).toBe('Atk');
    expect(cleanParamName('Decay')).toBe('Dcy');
    expect(cleanParamName('Sustain')).toBe('Sus');
    expect(cleanParamName('Release')).toBe('Rel');
  });

  it('abbreviates Envelope', () => {
    expect(cleanParamName('Envelope Attack')).toBe('EnvAtk');
  });

  it('abbreviates Velocity and Level', () => {
    expect(cleanParamName('Velocity')).toBe('Vel');
    expect(cleanParamName('Level')).toBe('Lvl');
  });
});

describe('groupBySection', () => {
  it('groups CC mappings by section field', () => {
    const mappings: CCMapping[] = [
      { ccNumber: 74, paramName: 'Cutoff', section: 'Filter' },
      { ccNumber: 71, paramName: 'Reso', section: 'Filter' },
      { ccNumber: 5, paramName: 'Porta', section: 'Global' },
    ];
    const grouped = groupBySection(mappings);
    expect(grouped.get('Filter')).toHaveLength(2);
    expect(grouped.get('Global')).toHaveLength(1);
  });

  it('groups mappings without section under "General"', () => {
    const mappings: CCMapping[] = [
      { ccNumber: 1, paramName: 'ModWheel' },
    ];
    const grouped = groupBySection(mappings);
    expect(grouped.get('General')).toHaveLength(1);
  });

  it('returns empty map for empty input', () => {
    const grouped = groupBySection([]);
    expect(grouped.size).toBe(0);
  });
});

describe('groupNRPNBySection', () => {
  it('groups NRPN mappings by section field', () => {
    const mappings: NRPNMapping[] = [
      { msb: 0, lsb: 1, paramName: 'Osc1', section: 'Oscillator' },
      { msb: 0, lsb: 2, paramName: 'Osc2', section: 'Oscillator' },
      { msb: 1, lsb: 0, paramName: 'FltCut', section: 'Filter' },
    ];
    const grouped = groupNRPNBySection(mappings);
    expect(grouped.get('Oscillator')).toHaveLength(2);
    expect(grouped.get('Filter')).toHaveLength(1);
  });

  it('defaults to "General" for mappings without section', () => {
    const mappings: NRPNMapping[] = [
      { msb: 0, lsb: 1, paramName: 'Param1' },
    ];
    const grouped = groupNRPNBySection(mappings);
    expect(grouped.get('General')).toHaveLength(1);
  });

  it('returns empty map for empty input', () => {
    const grouped = groupNRPNBySection([]);
    expect(grouped.size).toBe(0);
  });
});

describe('parseCSVString', () => {
  it('parses a valid midi.guide CSV into ccMap and nrpnMap', async () => {
    const csv = [
      'manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage',
      'Moog,Sub37,Filter,Cutoff,,74,,0,127,64,,,,,,,,',
      'Moog,Sub37,Filter,Resonance,,71,,0,127,0,,,,,,,,',
      'Moog,Sub37,Oscillator,Osc Shape,,,,,,0,42,0,127,64,,,,',
    ].join('\n');

    const result = await parseCSVString(csv);
    expect(result.manufacturer).toBe('Moog');
    expect(result.device).toBe('Sub37');
    expect(result.ccMap).toHaveLength(2);
    expect(result.nrpnMap).toHaveLength(1);
  });

  it('deduplicates repeated CC numbers with same param name', async () => {
    const csv = [
      'manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage',
      'Moog,Sub37,Filter,Cutoff,,74,,0,127,64,,,,,,,,',
      'Moog,Sub37,Filter,Cutoff,,74,,0,127,64,,,,,,,,',
    ].join('\n');

    const result = await parseCSVString(csv);
    expect(result.ccMap).toHaveLength(1);
  });

  it('sorts CCs by number ascending', async () => {
    const csv = [
      'manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage',
      'Moog,Sub37,,Reso,,71,,0,127,,,,,,,,,',
      'Moog,Sub37,,Cutoff,,74,,0,127,,,,,,,,,',
      'Moog,Sub37,,ModWheel,,1,,0,127,,,,,,,,,',
    ].join('\n');

    const result = await parseCSVString(csv);
    expect(result.ccMap[0].ccNumber).toBe(1);
    expect(result.ccMap[1].ccNumber).toBe(71);
    expect(result.ccMap[2].ccNumber).toBe(74);
  });

  it('sorts NRPNs by MSB then LSB', async () => {
    const csv = [
      'manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage',
      'Test,Dev,,ParamB,,,,,,,1,10,0,127,,,,',
      'Test,Dev,,ParamA,,,,,,,0,42,0,127,,,,',
      'Test,Dev,,ParamC,,,,,,,1,5,0,127,,,,',
    ].join('\n');

    const result = await parseCSVString(csv);
    expect(result.nrpnMap[0].msb).toBe(0);
    expect(result.nrpnMap[1].msb).toBe(1);
    expect(result.nrpnMap[1].lsb).toBe(5);
    expect(result.nrpnMap[2].msb).toBe(1);
    expect(result.nrpnMap[2].lsb).toBe(10);
  });

  it('cleans parameter names in parsed output', async () => {
    const csv = [
      'manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage',
      'Test,Dev,,Filter Resonance,,74,,0,127,,,,,,,,,',
    ].join('\n');

    const result = await parseCSVString(csv);
    expect(result.ccMap[0].paramName).toBe('FltReso');
    expect(result.ccMap[0].fullParamName).toBe('Filter Resonance');
  });
});
