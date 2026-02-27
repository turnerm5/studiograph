import { useState, useCallback, useRef } from 'react';
import {
  Music, Plus, X, Edit2, Trash2, Globe,
  Drum, Piano, Guitar, Mic, Speaker, Radio,
  Waves, Sliders, CircuitBoard, Cpu, Box, Disc,
  Volume2, Headphones, Cable, Zap, Save, FolderOpen,
  type LucideIcon
} from 'lucide-react';
import { MidiGuideModal } from './MidiGuideModal';
import { useStudioStore } from '../../store/useStudioStore';
import { exportStudio, parseStudioImport } from '../../utils/studioExport';
import type { InstrumentPreset, InstrumentNodeData, Port, PortType, CCMapping, NRPNMapping } from '../../types';

// Available icons for instruments
const AVAILABLE_ICONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: 'music', icon: Music, label: 'Music' },
  { id: 'drum', icon: Drum, label: 'Drum' },
  { id: 'piano', icon: Piano, label: 'Piano' },
  { id: 'guitar', icon: Guitar, label: 'Guitar' },
  { id: 'mic', icon: Mic, label: 'Microphone' },
  { id: 'speaker', icon: Speaker, label: 'Speaker' },
  { id: 'radio', icon: Radio, label: 'Radio' },
  { id: 'waves', icon: Waves, label: 'Waves' },
  { id: 'sliders', icon: Sliders, label: 'Sliders' },
  { id: 'circuit', icon: CircuitBoard, label: 'Circuit' },
  { id: 'cpu', icon: Cpu, label: 'CPU' },
  { id: 'box', icon: Box, label: 'Box' },
  { id: 'disc', icon: Disc, label: 'Disc' },
  { id: 'volume', icon: Volume2, label: 'Volume' },
  { id: 'headphones', icon: Headphones, label: 'Headphones' },
  { id: 'cable', icon: Cable, label: 'Cable' },
  { id: 'zap', icon: Zap, label: 'Zap' },
];

const getIconComponent = (iconId: string | undefined): LucideIcon => {
  const found = AVAILABLE_ICONS.find(i => i.id === iconId);
  return found?.icon || Music;
};

interface InstrumentCardProps {
  preset: InstrumentPreset;
  isCustom?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function InstrumentCard({ preset, isCustom, onEdit, onDelete }: InstrumentCardProps) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/studiograph-preset', JSON.stringify(preset));
    event.dataTransfer.effectAllowed = 'move';
  };

  const midiInputs = preset.inputs.filter(p => p.type === 'midi').length;
  const midiOutputs = preset.outputs.filter(p => p.type === 'midi' && !p.id.includes('thru')).length;
  const midiThrus = preset.outputs.filter(p => p.type === 'midi' && p.id.includes('thru')).length;
  const audioInputs = preset.inputs.filter(p => p.type === 'audio').length;
  const audioOutputs = preset.outputs.filter(p => p.type === 'audio').length;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="
        bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-grab
        hover:border-blue-500 hover:bg-gray-750 transition-colors
        active:cursor-grabbing relative group
      "
    >
      {/* Edit button always visible on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
          title="Edit"
        >
          <Edit2 size={12} />
        </button>
        {isCustom && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {(() => {
          const IconComponent = getIconComponent(preset.iconId);
          return <IconComponent size={18} className="text-blue-400" />;
        })()}
        <div>
          <div className="text-sm font-medium text-white">{preset.name}</div>
          <div className="text-xs text-gray-400">{preset.manufacturer}</div>
        </div>
      </div>
      <div className="mt-2 flex gap-1 flex-wrap">
        {midiInputs > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded">
            {midiInputs} MIDI In
          </span>
        )}
        {midiOutputs > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded">
            {midiOutputs} MIDI Out
          </span>
        )}
        {midiThrus > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-cyan-900/50 text-cyan-300 rounded">
            {midiThrus} MIDI Thru
          </span>
        )}
        {audioInputs > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-orange-900/50 text-orange-300 rounded">
            {audioInputs} Audio In
          </span>
        )}
        {audioOutputs > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-red-900/50 text-red-300 rounded">
            {audioOutputs} Audio Out
          </span>
        )}
      </div>
    </div>
  );
}

interface InstrumentFormProps {
  onClose: () => void;
  onSave: (preset: InstrumentPreset) => void;
  initialPreset?: InstrumentPreset;
  isEditing?: boolean;
}

function InstrumentForm({ onClose, onSave, initialPreset, isEditing }: InstrumentFormProps) {
  const [name, setName] = useState(initialPreset?.name || '');
  const [manufacturer, setManufacturer] = useState(initialPreset?.manufacturer || '');
  const [iconId, setIconId] = useState(initialPreset?.iconId || 'music');
  const [midiIn, setMidiIn] = useState(initialPreset?.inputs.filter(p => p.type === 'midi').length || 1);
  const [midiOut, setMidiOut] = useState(initialPreset?.outputs.filter(p => p.type === 'midi' && !p.id.includes('thru')).length || 1);
  const [midiThru, setMidiThru] = useState(initialPreset?.outputs.filter(p => p.type === 'midi' && p.id.includes('thru')).length || 0);
  const [audioIn, setAudioIn] = useState(initialPreset?.inputs.filter(p => p.type === 'audio').length || 2);
  const [audioOut, setAudioOut] = useState(initialPreset?.outputs.filter(p => p.type === 'audio').length || 2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const inputs: Port[] = [];
    const outputs: Port[] = [];

    // Add MIDI inputs
    for (let i = 0; i < midiIn; i++) {
      inputs.push({
        id: `midi-in-${i + 1}`,
        label: midiIn === 1 ? 'MIDI In' : `MIDI In ${i + 1}`,
        type: 'midi' as PortType,
      });
    }

    // Add Audio inputs
    if (audioIn === 2) {
      inputs.push({ id: 'audio-in-l', label: 'In L', type: 'audio' as PortType });
      inputs.push({ id: 'audio-in-r', label: 'In R', type: 'audio' as PortType });
    } else {
      for (let i = 0; i < audioIn; i++) {
        inputs.push({
          id: `audio-in-${i + 1}`,
          label: `In ${i + 1}`,
          type: 'audio' as PortType,
        });
      }
    }

    // Add MIDI outputs
    for (let i = 0; i < midiOut; i++) {
      outputs.push({
        id: `midi-out-${i + 1}`,
        label: midiOut === 1 ? 'MIDI Out' : `MIDI Out ${i + 1}`,
        type: 'midi' as PortType,
      });
    }

    // Add MIDI Thru outputs
    for (let i = 0; i < midiThru; i++) {
      outputs.push({
        id: `midi-thru-${i + 1}`,
        label: midiThru === 1 ? 'MIDI Thru' : `MIDI Thru ${i + 1}`,
        type: 'midi' as PortType,
      });
    }

    // Add Audio outputs
    if (audioOut === 2) {
      outputs.push({ id: 'audio-out-l', label: 'Out L', type: 'audio' as PortType });
      outputs.push({ id: 'audio-out-r', label: 'Out R', type: 'audio' as PortType });
    } else {
      for (let i = 0; i < audioOut; i++) {
        outputs.push({
          id: `audio-out-${i + 1}`,
          label: `Out ${i + 1}`,
          type: 'audio' as PortType,
        });
      }
    }

    const preset: InstrumentPreset = {
      id: initialPreset?.id || `custom-${Date.now()}`,
      name,
      manufacturer,
      type: initialPreset?.type || 'POLY',
      isRemovable: true,
      inputs,
      outputs,
      iconId,
      // Preserve existing data from initial preset
      ccMap: initialPreset?.ccMap,
      nrpnMap: initialPreset?.nrpnMap,
      defaultDrumLanes: initialPreset?.defaultDrumLanes,
    };

    onSave(preset);
    onClose();
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          {isEditing ? 'Edit Instrument' : 'New Instrument'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            placeholder="e.g., Prophet 6"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Manufacturer</label>
          <input
            type="text"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            required
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            placeholder="e.g., Sequential"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Icon</label>
          <div className="grid grid-cols-6 gap-1">
            {AVAILABLE_ICONS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setIconId(id)}
                className={`
                  p-2 rounded transition-colors
                  ${iconId === id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }
                `}
                title={label}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">MIDI In</label>
            <input
              type="number"
              min={0}
              max={4}
              value={midiIn}
              onChange={(e) => setMidiIn(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">MIDI Out</label>
            <input
              type="number"
              min={0}
              max={4}
              value={midiOut}
              onChange={(e) => setMidiOut(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">MIDI Thru</label>
            <input
              type="number"
              min={0}
              max={4}
              value={midiThru}
              onChange={(e) => setMidiThru(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Audio In</label>
            <input
              type="number"
              min={0}
              max={8}
              value={audioIn}
              onChange={(e) => setAudioIn(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Audio Out</label>
            <input
              type="number"
              min={0}
              max={8}
              value={audioOut}
              onChange={(e) => setAudioOut(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
        >
          {isEditing ? 'Save Changes' : 'Add Instrument'}
        </button>
      </form>
    </div>
  );
}

export function Sidebar() {
  const [showNewForm, setShowNewForm] = useState(false);
  const [showMidiGuide, setShowMidiGuide] = useState(false);
  const [customPresets, setCustomPresets] = useState<InstrumentPreset[]>([]);
  const [editingPreset, setEditingPreset] = useState<InstrumentPreset | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const { nodes, edges, importStudio, updateNodePortsAndCleanEdges } = useStudioStore();

  const handleExport = useCallback(() => {
    exportStudio(nodes as any, edges, customPresets);
  }, [nodes, edges, customPresets]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseStudioImport(file);
      importStudio(data.nodes, data.edges);
      setCustomPresets(data.customPresets);
      alert(`Imported ${data.nodes.length} instruments and ${data.customPresets.length} presets.`);
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset file input
    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  }, [importStudio]);

  const handleAddCustomPreset = (preset: InstrumentPreset) => {
    setCustomPresets([...customPresets, preset]);
  };

  const handleAddFromMidiGuide = useCallback((data: {
    name: string;
    manufacturer: string;
    ccMap: CCMapping[];
    nrpnMap: NRPNMapping[];
    inputs: Port[];
    outputs: Port[];
  }) => {
    // Add as a draggable preset in the sidebar
    const preset: InstrumentPreset & { ccMap?: CCMapping[]; nrpnMap?: NRPNMapping[] } = {
      id: `midiGuide-${Date.now()}`,
      name: data.name,
      manufacturer: data.manufacturer,
      type: 'POLY',
      isRemovable: true,
      inputs: data.inputs,
      outputs: data.outputs,
      iconId: 'music',
      // Store CC/NRPN data for when it's dragged onto canvas
      ccMap: data.ccMap,
      nrpnMap: data.nrpnMap,
    };
    setCustomPresets(prev => [...prev, preset as InstrumentPreset]);
  }, []);

  const handleEditPreset = (preset: InstrumentPreset) => {
    setEditingPreset(preset);
    setShowNewForm(false);
  };

  const handleSaveEditedPreset = (preset: InstrumentPreset) => {
    // Find canvas nodes created from this preset
    const matchedNodes = nodes.filter(
      (n) => (n.data as InstrumentNodeData).presetId === preset.id
    );

    if (matchedNodes.length > 0) {
      // Compute how many edges would be disconnected across all matched nodes
      const newPortIds = new Set([
        ...preset.inputs.map((p) => p.id),
        ...preset.outputs.map((p) => p.id),
      ]);

      let affectedEdgeCount = 0;
      for (const node of matchedNodes) {
        const nodeData = node.data as InstrumentNodeData;
        const oldPortIds = [
          ...nodeData.inputs.map((p) => p.id),
          ...nodeData.outputs.map((p) => p.id),
        ];
        const removedPortIds = oldPortIds.filter((id) => !newPortIds.has(id));
        if (removedPortIds.length > 0) {
          affectedEdgeCount += edges.filter((e) => {
            if (e.source === node.id && removedPortIds.includes(e.sourceHandle!)) return true;
            if (e.target === node.id && removedPortIds.includes(e.targetHandle!)) return true;
            return false;
          }).length;
        }
      }

      if (affectedEdgeCount > 0) {
        if (!confirm(`Updating ${preset.name} will disconnect ${affectedEdgeCount} connection(s) on the canvas. Continue?`)) {
          return;
        }
      }

      // Update all matched canvas nodes
      for (const node of matchedNodes) {
        updateNodePortsAndCleanEdges(node.id, preset.inputs, preset.outputs);
      }
    }

    setCustomPresets(customPresets.map(p => p.id === preset.id ? preset : p));
    setEditingPreset(null);
  };

  const handleDeletePreset = (presetId: string) => {
    if (confirm('Delete this instrument?')) {
      setCustomPresets(customPresets.filter(p => p.id !== presetId));
    }
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">StudioGraph</h1>
          <div className="flex gap-1">
            <button
              onClick={handleExport}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              title="Save Studio"
            >
              <Save size={16} />
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              title="Load Studio"
            >
              <FolderOpen size={16} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Drag instruments onto the canvas</p>
      </div>

      {/* Add New Buttons */}
      <div className="px-4 pt-4 space-y-2">
        <button
          onClick={() => setShowMidiGuide(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Globe size={16} />
          Browse midi.guide
        </button>
        <button
          onClick={() => { setShowNewForm(!showNewForm); setEditingPreset(null); }}
          className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Custom Instrument
        </button>
      </div>

      {/* Instrument Presets */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {showNewForm && (
          <InstrumentForm
            onClose={() => setShowNewForm(false)}
            onSave={handleAddCustomPreset}
          />
        )}

        {editingPreset && (
          <InstrumentForm
            onClose={() => setEditingPreset(null)}
            onSave={handleSaveEditedPreset}
            initialPreset={editingPreset}
            isEditing
          />
        )}

        {/* Custom Instruments */}
        {customPresets.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Custom
            </h2>
            {customPresets.map((preset) => (
              <InstrumentCard
                key={preset.id}
                preset={preset}
                isCustom
                onEdit={() => handleEditPreset(preset)}
                onDelete={() => handleDeletePreset(preset.id)}
              />
            ))}
          </>
        )}

        {/* Empty state when no instruments */}
        {customPresets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No instruments yet</p>
            <p className="text-xs mt-1">Browse midi.guide or add a custom instrument</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 mb-2">Connection Colors</h3>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500"></span>
            <span className="text-gray-400">MIDI</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500"></span>
            <span className="text-gray-400">Audio</span>
          </div>
        </div>
      </div>

      {/* midi.guide Modal */}
      <MidiGuideModal
        isOpen={showMidiGuide}
        onClose={() => setShowMidiGuide(false)}
        onAddInstrument={handleAddFromMidiGuide}
      />
    </div>
  );
}
