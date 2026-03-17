import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadFile, exportAllDefinitions } from '../hapaxExport';
import { exportStudio, parseStudioImport } from '../studioExport';
import type { Node } from '@xyflow/react';
import type { InstrumentNodeData, StudioEdge } from '../../types';

// Mock DOM APIs
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

function setupDOMMocks() {
  const mockAnchor = {
    href: '',
    download: '',
    click: mockClick,
  };

  vi.stubGlobal('document', {
    createElement: vi.fn(() => mockAnchor),
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild,
    },
  });

  vi.stubGlobal('URL', {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  });

  vi.stubGlobal('Blob', class MockBlob {
    content: unknown[];
    options: { type: string };
    constructor(content: unknown[], options: { type: string }) {
      this.content = content;
      this.options = options;
    }
  });

  return mockAnchor;
}

describe('downloadFile', () => {
  let mockAnchor: { href: string; download: string; click: typeof mockClick };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAnchor = setupDOMMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates blob, triggers download, and cleans up', () => {
    downloadFile('test.txt', 'Hello, World!');

    // Blob created
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

    // Anchor configured correctly
    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockAnchor.download).toBe('test.txt');

    // Anchor appended, clicked, removed
    expect(mockAppendChild).toHaveBeenCalledTimes(1);
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(mockRemoveChild).toHaveBeenCalledTimes(1);

    // URL revoked
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('passes correct content to Blob', () => {
    downloadFile('output.txt', 'CC 74 Cutoff');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blobCall = (mockCreateObjectURL.mock.calls[0] as any[])[0];
    expect(blobCall.content).toEqual(['CC 74 Cutoff']);
    expect(blobCall.options.type).toBe('text/plain');
  });
});

describe('exportAllDefinitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDOMMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 0 when no instruments are connected', () => {
    const hapax: Node<InstrumentNodeData> = {
      id: 'hapax-main',
      type: 'instrument',
      position: { x: 0, y: 0 },
      data: {
        name: 'Hapax',
        manufacturer: 'Squarp',
        channel: 1,
        type: 'POLY',
        inputs: [],
        outputs: [{ id: 'midi-a', label: 'MIDI A', type: 'midi' }],
        ccMap: [],
        nrpnMap: [],
        assignCCs: [],
        automationLanes: [],
        isHapax: true,
        isRemovable: false,
      },
    };

    const result = exportAllDefinitions([hapax], []);
    expect(result).toBe(0);
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('triggers one download per connected instrument', () => {
    const hapax: Node<InstrumentNodeData> = {
      id: 'hapax-main',
      type: 'instrument',
      position: { x: 0, y: 0 },
      data: {
        name: 'Hapax',
        manufacturer: 'Squarp',
        channel: 1,
        type: 'POLY',
        inputs: [],
        outputs: [
          { id: 'midi-a', label: 'MIDI A', type: 'midi' },
          { id: 'midi-b', label: 'MIDI B', type: 'midi' },
        ],
        ccMap: [],
        nrpnMap: [],
        assignCCs: [],
        automationLanes: [],
        isHapax: true,
        isRemovable: false,
      },
    };

    const synth1: Node<InstrumentNodeData> = {
      id: 'node-1',
      type: 'instrument',
      position: { x: 0, y: 0 },
      data: {
        name: 'Synth A',
        manufacturer: 'Test',
        channel: 1,
        type: 'POLY',
        inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
        outputs: [],
        ccMap: [],
        nrpnMap: [],
        assignCCs: [],
        automationLanes: [],
        isHapax: false,
        isRemovable: true,
      },
    };

    const synth2: Node<InstrumentNodeData> = {
      id: 'node-2',
      type: 'instrument',
      position: { x: 0, y: 0 },
      data: {
        name: 'Synth B',
        manufacturer: 'Test',
        channel: 2,
        type: 'POLY',
        inputs: [{ id: 'midi-in-1', label: 'MIDI In', type: 'midi' }],
        outputs: [],
        ccMap: [],
        nrpnMap: [],
        assignCCs: [],
        automationLanes: [],
        isHapax: false,
        isRemovable: true,
      },
    };

    const edges: StudioEdge[] = [
      {
        id: 'e1', source: 'hapax-main', target: 'node-1',
        sourceHandle: 'midi-a', targetHandle: 'midi-in-1',
        data: { portType: 'midi' },
      },
      {
        id: 'e2', source: 'hapax-main', target: 'node-2',
        sourceHandle: 'midi-b', targetHandle: 'midi-in-1',
        data: { portType: 'midi' },
      },
    ];

    const result = exportAllDefinitions([hapax, synth1, synth2], edges);
    expect(result).toBe(2);
    expect(mockClick).toHaveBeenCalledTimes(2);
  });
});

describe('exportStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDOMMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports JSON with correct structure', () => {
    const nodes: Node<InstrumentNodeData>[] = [{
      id: 'hapax-main',
      type: 'instrument',
      position: { x: 0, y: 0 },
      data: {
        name: 'Hapax',
        manufacturer: 'Squarp',
        channel: 1,
        type: 'POLY',
        inputs: [],
        outputs: [],
        ccMap: [],
        nrpnMap: [],
        assignCCs: [],
        automationLanes: [],
        isHapax: true,
        isRemovable: false,
      },
    }];

    exportStudio(nodes, [], []);

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blobArg = (mockCreateObjectURL.mock.calls[0] as any[])[0];
    expect(blobArg.options.type).toBe('application/json');

    // Verify the content is valid JSON with expected fields
    const json = JSON.parse(blobArg.content[0]);
    expect(json.version).toBe(1);
    expect(json.exportedAt).toBeDefined();
    expect(json.nodes).toHaveLength(1);
    expect(json.edges).toHaveLength(0);
    expect(json.customPresets).toHaveLength(0);
  });

  it('uses date-stamped filename', () => {
    const mockAnchor = setupDOMMocks();
    const nodes: Node<InstrumentNodeData>[] = [];

    exportStudio(nodes, [], []);

    expect(mockAnchor.download).toMatch(/^StudioGraph_Export_\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('parseStudioImport', () => {
  it('reads file and parses studio data', async () => {
    const studioData = {
      version: 1,
      exportedAt: '2025-01-01T00:00:00.000Z',
      nodes: [{
        id: 'hapax-main',
        type: 'instrument',
        position: { x: 0, y: 0 },
        data: {
          name: 'Hapax',
          manufacturer: 'Squarp',
          channel: 1,
          type: 'POLY',
          inputs: [{ id: 'midi-in-1', label: 'MIDI In 1', type: 'midi' }],
          outputs: [
            { id: 'midi-a', label: 'MIDI A', type: 'midi' },
            { id: 'midi-b', label: 'MIDI B', type: 'midi' },
            { id: 'midi-c', label: 'MIDI C', type: 'midi' },
            { id: 'midi-d', label: 'MIDI D', type: 'midi' },
            { id: 'usb-host', label: 'USB Host', type: 'usb' },
            { id: 'usb-device', label: 'USB Device', type: 'usb' },
          ],
          ccMap: [],
          nrpnMap: [],
          assignCCs: [],
          automationLanes: [],
          isHapax: true,
          isRemovable: false,
        },
      }],
      edges: [],
      customPresets: [],
    };

    const json = JSON.stringify(studioData);

    class MockFileReader {
      result: string | null = null;
      onload: ((event: { target: { result: string } }) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        setTimeout(() => {
          this.result = json;
          if (this.onload) {
            this.onload({ target: { result: json } });
          }
        }, 0);
      }
    }

    vi.stubGlobal('FileReader', MockFileReader);

    const mockFile = {} as File;
    const result = await parseStudioImport(mockFile);

    expect(result.version).toBe(1);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('hapax-main');

    vi.unstubAllGlobals();
  });

  it('rejects on FileReader error', async () => {
    class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror();
          }
        }, 0);
      }
    }

    vi.stubGlobal('FileReader', MockFileReader);

    const mockFile = {} as File;
    await expect(parseStudioImport(mockFile)).rejects.toThrow('Failed to read file');

    vi.unstubAllGlobals();
  });

  it('rejects on invalid JSON', async () => {
    class MockFileReader {
      result: string | null = null;
      onload: ((event: { target: { result: string } }) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: 'not valid json' } });
          }
        }, 0);
      }
    }

    vi.stubGlobal('FileReader', MockFileReader);

    const mockFile = {} as File;
    await expect(parseStudioImport(mockFile)).rejects.toThrow();

    vi.unstubAllGlobals();
  });
});
