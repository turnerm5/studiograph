import { useState, useEffect, useCallback } from 'react';
import { X, Search, ChevronRight, Loader2, Download, ExternalLink } from 'lucide-react';
import {
  fetchManufacturers,
  fetchDevices,
  fetchDeviceCSV,
  filterManufacturers,
  filterDevices,
  type MidiGuideManufacturer,
  type MidiGuideDevice,
} from '../../utils/midiGuideService';
import { parseCSVString } from '../../utils/csvParser';
import type { CCMapping, NRPNMapping, Port } from '../../types';

interface MidiGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddInstrument: (instrument: {
    name: string;
    manufacturer: string;
    ccMap: CCMapping[];
    nrpnMap: NRPNMapping[];
    inputs: Port[];
    outputs: Port[];
  }) => void;
}

type Step = 'manufacturers' | 'devices' | 'preview';

export function MidiGuideModal({ isOpen, onClose, onAddInstrument }: MidiGuideModalProps) {
  const [step, setStep] = useState<Step>('manufacturers');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [manufacturers, setManufacturers] = useState<MidiGuideManufacturer[]>([]);
  const [devices, setDevices] = useState<MidiGuideDevice[]>([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState<MidiGuideManufacturer | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<MidiGuideDevice | null>(null);

  // Parsed data for preview
  const [previewData, setPreviewData] = useState<{
    ccMap: CCMapping[];
    nrpnMap: NRPNMapping[];
  } | null>(null);

  // Audio port toggles
  const [includeAudioIn, setIncludeAudioIn] = useState(false);
  const [includeAudioOut, setIncludeAudioOut] = useState(false);

  // Load manufacturers on open
  useEffect(() => {
    if (isOpen && manufacturers.length === 0) {
      loadManufacturers();
    }
  }, [isOpen]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStep('manufacturers');
      setSearchQuery('');
      setSelectedManufacturer(null);
      setSelectedDevice(null);
      setPreviewData(null);
      setError(null);
      setIncludeAudioIn(false);
      setIncludeAudioOut(false);
    }
  }, [isOpen]);

  const loadManufacturers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchManufacturers();
      setManufacturers(data);
    } catch (err) {
      setError('Failed to load manufacturers. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async (manufacturer: MidiGuideManufacturer) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDevices(manufacturer.name);
      setDevices(data);
      setSelectedManufacturer(manufacturer);
      setStep('devices');
      setSearchQuery('');
    } catch (err) {
      setError(`Failed to load devices for ${manufacturer.name}.`);
    } finally {
      setLoading(false);
    }
  };

  const loadDevicePreview = async (device: MidiGuideDevice) => {
    setLoading(true);
    setError(null);
    try {
      const csvText = await fetchDeviceCSV(device);
      const parsed = await parseCSVString(csvText);
      setPreviewData({
        ccMap: parsed.ccMap,
        nrpnMap: parsed.nrpnMap,
      });
      setSelectedDevice(device);
      setStep('preview');
    } catch (err) {
      setError(`Failed to load data for ${device.name}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInstrument = useCallback(() => {
    if (!selectedDevice || !previewData) return;

    const inputs: Port[] = [
      { id: 'midi-in', label: 'MIDI In', type: 'midi' },
    ];
    const outputs: Port[] = [
      { id: 'midi-out', label: 'MIDI Out', type: 'midi' },
    ];

    if (includeAudioIn) {
      inputs.push(
        { id: 'audio-in-l', label: 'In L', type: 'audio' },
        { id: 'audio-in-r', label: 'In R', type: 'audio' },
      );
    }
    if (includeAudioOut) {
      outputs.push(
        { id: 'audio-out-l', label: 'Out L', type: 'audio' },
        { id: 'audio-out-r', label: 'Out R', type: 'audio' },
      );
    }

    onAddInstrument({
      name: selectedDevice.name,
      manufacturer: selectedDevice.manufacturer,
      ccMap: previewData.ccMap,
      nrpnMap: previewData.nrpnMap,
      inputs,
      outputs,
    });

    onClose();
  }, [selectedDevice, previewData, onAddInstrument, onClose, includeAudioIn, includeAudioOut]);

  const handleBack = () => {
    if (step === 'devices') {
      setStep('manufacturers');
      setSelectedManufacturer(null);
      setDevices([]);
      setSearchQuery('');
    } else if (step === 'preview') {
      setStep('devices');
      setSelectedDevice(null);
      setPreviewData(null);
    }
  };

  // Filter based on search
  const filteredManufacturers = searchQuery
    ? filterManufacturers(manufacturers, searchQuery)
    : manufacturers;

  const filteredDevices = searchQuery
    ? filterDevices(devices, searchQuery)
    : devices;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== 'manufacturers' && (
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-white transition-colors mr-2"
              >
                <ChevronRight size={20} className="rotate-180" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-white">
              {step === 'manufacturers' && 'Browse midi.guide'}
              {step === 'devices' && selectedManufacturer?.name}
              {step === 'preview' && selectedDevice?.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search (for manufacturers and devices steps) */}
        {step !== 'preview' && (
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={step === 'manufacturers' ? 'Search manufacturers...' : 'Search devices...'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-blue-400" />
              <span className="ml-2 text-gray-400">Loading...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg m-2">
              <p className="text-red-300 text-sm">{error}</p>
              <button
                onClick={() => {
                  if (step === 'manufacturers') loadManufacturers();
                  else if (step === 'devices' && selectedManufacturer) loadDevices(selectedManufacturer);
                }}
                className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Manufacturers List */}
          {step === 'manufacturers' && !loading && !error && (
            <div className="space-y-0.5">
              {filteredManufacturers.map((m) => (
                <button
                  key={m.name}
                  onClick={() => loadDevices(m)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-gray-200 text-sm flex items-center justify-between group transition-colors"
                >
                  <span>{m.name}</span>
                  <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400" />
                </button>
              ))}
              {filteredManufacturers.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  No manufacturers found
                </p>
              )}
            </div>
          )}

          {/* Devices List */}
          {step === 'devices' && !loading && !error && (
            <div className="space-y-0.5">
              {filteredDevices.map((d) => (
                <button
                  key={d.name}
                  onClick={() => loadDevicePreview(d)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 text-gray-200 text-sm flex items-center justify-between group transition-colors"
                >
                  <span>{d.name}</span>
                  <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400" />
                </button>
              ))}
              {filteredDevices.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  No devices found
                </p>
              )}
            </div>
          )}

          {/* Preview */}
          {step === 'preview' && !loading && !error && previewData && (
            <div className="p-2 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-400">{previewData.ccMap.length}</div>
                  <div className="text-xs text-gray-400">CC Mappings</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-yellow-400">{previewData.nrpnMap.length}</div>
                  <div className="text-xs text-gray-400">NRPN Mappings</div>
                </div>
              </div>

              {/* CC Preview */}
              {previewData.ccMap.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">CC Parameters (Preview)</h4>
                  <div className="bg-gray-800 rounded-lg p-2 max-h-40 overflow-y-auto">
                    {previewData.ccMap.slice(0, 10).map((cc, i) => (
                      <div key={i} className="text-xs text-gray-300 py-0.5 font-mono">
                        CC {cc.ccNumber}: {cc.fullParamName || cc.paramName}
                        {cc.section && <span className="text-gray-500 ml-2">({cc.section})</span>}
                      </div>
                    ))}
                    {previewData.ccMap.length > 10 && (
                      <div className="text-xs text-gray-500 mt-1">
                        ... and {previewData.ccMap.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Link to midi.guide */}
              <a
                href={`https://midi.guide/d/${selectedDevice?.manufacturer.toLowerCase()}/${selectedDevice?.name.toLowerCase().replace(/\s+/g, '-')}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
              >
                <ExternalLink size={12} />
                View on midi.guide
              </a>

              {/* Audio Port Toggles */}
              <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase">Audio Ports</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAudioIn}
                    onChange={(e) => setIncludeAudioIn(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-600 accent-orange-500 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">Stereo Audio In</span>
                  <span className="text-xs text-gray-500">(In L, In R)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAudioOut}
                    onChange={(e) => setIncludeAudioOut(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-600 accent-red-500 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">Stereo Audio Out</span>
                  <span className="text-xs text-gray-500">(Out L, Out R)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && previewData && (
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleAddInstrument}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Download size={18} />
              Add {selectedDevice?.name}
            </button>
          </div>
        )}

        {/* Attribution */}
        <div className="px-4 pb-3 text-center">
          <p className="text-[10px] text-gray-600">
            Data from <a href="https://midi.guide" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-400">midi.guide</a> (CC BY-SA 4.0)
          </p>
        </div>
      </div>
    </div>
  );
}
