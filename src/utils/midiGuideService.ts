// Service to fetch MIDI CC/NRPN data from midi.guide GitHub repository
// Repository: https://github.com/pencilresearch/midi

const GITHUB_API_BASE = 'https://api.github.com/repos/pencilresearch/midi/contents';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/pencilresearch/midi/main';

export interface MidiGuideManufacturer {
  name: string;
  path: string;
}

export interface MidiGuideDevice {
  name: string;
  manufacturer: string;
  csvUrl: string;
}

interface GitHubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

// Cache for manufacturers and devices
let manufacturersCache: MidiGuideManufacturer[] | null = null;
const devicesCache: Map<string, MidiGuideDevice[]> = new Map();

// Fetch list of all manufacturers
export async function fetchManufacturers(): Promise<MidiGuideManufacturer[]> {
  if (manufacturersCache) {
    return manufacturersCache;
  }

  try {
    const response = await fetch(GITHUB_API_BASE);
    if (!response.ok) {
      throw new Error(`Failed to fetch manufacturers: ${response.status}`);
    }

    const data = await response.json();

    // Filter to only directories (manufacturers)
    const manufacturers: MidiGuideManufacturer[] = (data as GitHubContentItem[])
      .filter((item) => item.type === 'dir')
      .map((item) => ({
        name: item.name,
        path: item.path,
      }))
      .sort((a: MidiGuideManufacturer, b: MidiGuideManufacturer) =>
        a.name.localeCompare(b.name)
      );

    manufacturersCache = manufacturers;
    return manufacturers;
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    throw error;
  }
}

// Fetch list of devices for a manufacturer
export async function fetchDevices(manufacturer: string): Promise<MidiGuideDevice[]> {
  const cached = devicesCache.get(manufacturer);
  if (cached) {
    return cached;
  }

  try {
    const encodedManufacturer = encodeURIComponent(manufacturer);
    const response = await fetch(`${GITHUB_API_BASE}/${encodedManufacturer}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch devices for ${manufacturer}: ${response.status}`);
    }

    const data = await response.json();

    // Filter to only CSV files and extract device name
    const devices: MidiGuideDevice[] = (data as GitHubContentItem[])
      .filter((item) => item.type === 'file' && item.name.endsWith('.csv'))
      .map((item) => {
        // Remove .csv extension to get device name
        const deviceName = item.name.replace(/\.csv$/, '');
        return {
          name: deviceName,
          manufacturer,
          csvUrl: `${GITHUB_RAW_BASE}/${manufacturer}/${encodeURIComponent(item.name)}`,
        };
      })
      .sort((a: MidiGuideDevice, b: MidiGuideDevice) =>
        a.name.localeCompare(b.name)
      );

    devicesCache.set(manufacturer, devices);
    return devices;
  } catch (error) {
    console.error(`Error fetching devices for ${manufacturer}:`, error);
    throw error;
  }
}

// Fetch and parse CSV for a specific device
export async function fetchDeviceCSV(device: MidiGuideDevice): Promise<string> {
  try {
    const response = await fetch(device.csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV for ${device.name}: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching CSV for ${device.name}:`, error);
    throw error;
  }
}

// Search manufacturers by name
export function filterManufacturers(
  manufacturers: MidiGuideManufacturer[],
  query: string
): MidiGuideManufacturer[] {
  const lowerQuery = query.toLowerCase();
  return manufacturers.filter(m =>
    m.name.toLowerCase().includes(lowerQuery)
  );
}

// Search devices by name
export function filterDevices(
  devices: MidiGuideDevice[],
  query: string
): MidiGuideDevice[] {
  const lowerQuery = query.toLowerCase();
  return devices.filter(d =>
    d.name.toLowerCase().includes(lowerQuery)
  );
}
