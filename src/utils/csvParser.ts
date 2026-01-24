import Papa from 'papaparse';
import type { CCMapping, NRPNMapping, CSVRow } from '../types';

interface ParsedCSVResult {
  manufacturer: string;
  device: string;
  ccMap: CCMapping[];
  nrpnMap: NRPNMapping[];
}

export function parseCSV(file: File): Promise<ParsedCSVResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsed = processCSVData(results.data);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

// Parse CSV from string (for fetched data from midi.guide)
export function parseCSVString(csvString: string): Promise<ParsedCSVResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsed = processCSVData(results.data);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

function processCSVData(rows: CSVRow[]): ParsedCSVResult {
  const ccMap: CCMapping[] = [];
  const nrpnMap: NRPNMapping[] = [];
  let manufacturer = '';
  let device = '';

  // Track unique CC numbers to avoid duplicates
  const seenCC = new Set<string>();
  const seenNRPN = new Set<string>();

  for (const row of rows) {
    // Get manufacturer and device from first valid row
    if (!manufacturer && row.manufacturer) {
      manufacturer = row.manufacturer;
    }
    if (!device && row.device) {
      device = row.device;
    }

    // Parse CC mappings (if cc_msb exists and is not empty)
    const ccMsb = row.cc_msb?.trim();
    if (ccMsb && ccMsb !== '') {
      const ccNumber = parseInt(ccMsb, 10);
      if (!isNaN(ccNumber)) {
        const fullParamName = row.parameter_name?.trim() || 'Unknown';
        const paramName = cleanParamName(row.parameter_name);
        const key = `${ccNumber}-${paramName}`;

        if (!seenCC.has(key)) {
          seenCC.add(key);
          ccMap.push({
            ccNumber,
            paramName,
            fullParamName,
            section: row.section || undefined,
            defaultValue: row.cc_default_value ? parseInt(row.cc_default_value, 10) : undefined,
          });
        }
      }
    }

    // Parse NRPN mappings (if nrpn_msb and nrpn_lsb exist and are not empty)
    const nrpnMsb = row.nrpn_msb?.trim();
    const nrpnLsb = row.nrpn_lsb?.trim();
    if (nrpnMsb && nrpnMsb !== '' && nrpnLsb && nrpnLsb !== '') {
      const msb = parseInt(nrpnMsb, 10);
      const lsb = parseInt(nrpnLsb, 10);
      if (!isNaN(msb) && !isNaN(lsb)) {
        const paramName = cleanParamName(row.parameter_name);
        const key = `${msb}-${lsb}-${paramName}`;

        if (!seenNRPN.has(key)) {
          seenNRPN.add(key);
          nrpnMap.push({
            msb,
            lsb,
            paramName,
            section: row.section || undefined,
            defaultValue: row.nrpn_default_value ? parseInt(row.nrpn_default_value, 10) : undefined,
          });
        }
      }
    }
  }

  // Sort CC map by CC number
  ccMap.sort((a, b) => a.ccNumber - b.ccNumber);

  // Sort NRPN map by MSB then LSB
  nrpnMap.sort((a, b) => {
    if (a.msb !== b.msb) return a.msb - b.msb;
    return a.lsb - b.lsb;
  });

  return { manufacturer, device, ccMap, nrpnMap };
}

// Clean up parameter names for the Hapax format
function cleanParamName(name: string): string {
  if (!name) return 'Unknown';

  // Remove device prefix if present (e.g., "Source: Tune" -> "Tune")
  let cleaned = name.replace(/^[^:]+:\s*/, '');

  // Truncate long names and replace spaces with shorter versions
  cleaned = cleaned
    .replace(/Envelope/g, 'Env')
    .replace(/Oscillator/g, 'Osc')
    .replace(/Parameter/g, 'Param')
    .replace(/Modulation/g, 'Mod')
    .replace(/Frequency/g, 'Freq')
    .replace(/Resonance/g, 'Reso')
    .replace(/Filter/g, 'Flt')
    .replace(/Attack/g, 'Atk')
    .replace(/Decay/g, 'Dcy')
    .replace(/Sustain/g, 'Sus')
    .replace(/Release/g, 'Rel')
    .replace(/Velocity/g, 'Vel')
    .replace(/Level/g, 'Lvl');

  // Replace spaces with nothing or underscore for readability
  cleaned = cleaned.replace(/\s+/g, '');

  // Truncate to max 12 characters (Hapax display limit)
  if (cleaned.length > 12) {
    cleaned = cleaned.substring(0, 12);
  }

  return cleaned || 'Unknown';
}

// Group CC mappings by section for organized output
export function groupBySection(mappings: CCMapping[]): Map<string, CCMapping[]> {
  const grouped = new Map<string, CCMapping[]>();

  for (const mapping of mappings) {
    const section = mapping.section || 'General';
    const existing = grouped.get(section) || [];
    existing.push(mapping);
    grouped.set(section, existing);
  }

  return grouped;
}

// Group NRPN mappings by section for organized output
export function groupNRPNBySection(mappings: NRPNMapping[]): Map<string, NRPNMapping[]> {
  const grouped = new Map<string, NRPNMapping[]>();

  for (const mapping of mappings) {
    const section = mapping.section || 'General';
    const existing = grouped.get(section) || [];
    existing.push(mapping);
    grouped.set(section, existing);
  }

  return grouped;
}
