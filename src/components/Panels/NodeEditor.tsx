import { useCallback } from 'react';
import { X, Download } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { generateAllDefinitions, downloadFile } from '../../utils/hapaxExport';
import { DEFAULT_DRUM_LANES } from '../../data/defaultNodes';
import type { InstrumentType, InstrumentNodeData } from '../../types';
import { PortInfo } from './PortInfo';
import { AssignCCEditor } from './AssignCCEditor';
import { AutomationEditor } from './AutomationEditor';
import { DrumLanesEditor } from './DrumLanesEditor';

export function NodeEditor() {
  const {
    nodes,
    edges,
    selectedNodeId,
    setSelectedNode,
    updateNodeData,
    updateDrumLanes,
  } = useStudioStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleClose = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNodeId) {
        updateNodeData(selectedNodeId, { name: e.target.value });
      }
    },
    [selectedNodeId, updateNodeData]
  );

  const handleManufacturerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNodeId) {
        updateNodeData(selectedNodeId, { manufacturer: e.target.value });
      }
    },
    [selectedNodeId, updateNodeData]
  );

  const handleChannelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNodeId) {
        const channel = Math.min(16, Math.max(1, parseInt(e.target.value) || 1));
        updateNodeData(selectedNodeId, { channel });
      }
    },
    [selectedNodeId, updateNodeData]
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (selectedNodeId) {
        const newType = e.target.value as InstrumentType;
        updateNodeData(selectedNodeId, { type: newType });
        // Auto-populate drum lanes when switching to DRUM
        if (newType === 'DRUM' && selectedNode) {
          const nodeData = selectedNode.data as InstrumentNodeData;
          if (!nodeData.drumLanes || nodeData.drumLanes.length === 0) {
            updateDrumLanes(selectedNodeId, [...DEFAULT_DRUM_LANES]);
          }
        }
      }
    },
    [selectedNodeId, selectedNode, updateNodeData, updateDrumLanes]
  );

  const handleLocalOffChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNodeId) {
        updateNodeData(selectedNodeId, { localOff: e.target.checked });
      }
    },
    [selectedNodeId, updateNodeData]
  );

  const handleExportSingle = useCallback(() => {
    if (!selectedNodeId) return;

    const definitions = generateAllDefinitions(nodes as any, edges);

    // Find definition for this specific node by ID
    const def = definitions.find((d) => d.nodeId === selectedNodeId);

    if (def) {
      downloadFile(def.filename, def.content);
      alert(`Exported ${def.filename}`);
    } else {
      alert('This instrument is not connected to the Hapax. Connect it to a Hapax MIDI output first.');
    }
  }, [selectedNodeId, nodes, edges]);

  if (!selectedNode) {
    return null;
  }

  const data = selectedNode.data as InstrumentNodeData;

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Edit Instrument</h2>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={data.name}
            onChange={handleNameChange}
            disabled={data.isHapax}
            className="
              w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
              text-white text-sm focus:outline-none focus:border-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        </div>

        {/* Manufacturer */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Manufacturer</label>
          <input
            type="text"
            value={data.manufacturer}
            onChange={handleManufacturerChange}
            disabled={data.isHapax}
            className="
              w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
              text-white text-sm focus:outline-none focus:border-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        </div>

        {/* MIDI Channel - not for Hapax */}
        {!data.isHapax && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">MIDI Channel</label>
            <input
              type="number"
              min={1}
              max={16}
              value={data.channel}
              onChange={handleChannelChange}
              className="
                w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                text-white text-sm focus:outline-none focus:border-blue-500
              "
            />
          </div>
        )}

        {/* Type - not for Hapax */}
        {!data.isHapax && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
            <select
              value={data.type}
              onChange={handleTypeChange}
              className="
                w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                text-white text-sm focus:outline-none focus:border-blue-500
              "
            >
              <option value="POLY">POLY</option>
              <option value="DRUM">DRUM</option>
              <option value="MPE">MPE</option>
            </select>
          </div>
        )}

        {/* Local Off - not for Hapax */}
        {!data.isHapax && (
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-400">Local Off</label>
              <p className="text-xs text-gray-500">Prevents MIDI feedback loops</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.localOff || false}
                onChange={handleLocalOffChange}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600 peer-checked:after:bg-white"></div>
            </label>
          </div>
        )}

        {/* ASSIGN CCs Section - not for Hapax */}
        {!data.isHapax && (
          <AssignCCEditor
            nodeId={selectedNodeId!}
            assignCCs={data.assignCCs || []}
            ccMap={data.ccMap}
          />
        )}

        {/* AUTOMATION Lanes Section - not for Hapax */}
        {!data.isHapax && (
          <AutomationEditor
            nodeId={selectedNodeId!}
            automationLanes={data.automationLanes || []}
            ccMap={data.ccMap}
            nrpnMap={data.nrpnMap}
          />
        )}

        {/* DRUMLANES Section - only for DRUM type, not Hapax */}
        {!data.isHapax && data.type === 'DRUM' && (
          <DrumLanesEditor
            nodeId={selectedNodeId!}
            drumLanes={data.drumLanes || []}
          />
        )}

        {/* Port Info */}
        <PortInfo inputs={data.inputs} outputs={data.outputs} />
      </div>

      {/* Export Button - Fixed at bottom */}
      {!data.isHapax && (
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleExportSingle}
            className="
              w-full bg-purple-600 hover:bg-purple-700 text-white
              py-2 px-4 rounded-lg font-medium
              flex items-center justify-center gap-2
              transition-colors
            "
          >
            <Download size={18} />
            Export Hapax Definition
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Must be connected to Hapax MIDI output
          </p>
        </div>
      )}
    </div>
  );
}
