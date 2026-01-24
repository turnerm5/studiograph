import { useCallback, useRef, useState } from 'react';
import { X, Upload, Trash2, FileText, Download, Plus, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { parseCSV } from '../../utils/csvParser';
import { generateAllDefinitions, downloadFile } from '../../utils/hapaxExport';
import type { InstrumentType, AssignCC, InstrumentNodeData } from '../../types';

export function NodeEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    nodes,
    edges,
    selectedNodeId,
    setSelectedNode,
    updateNodeData,
    uploadCCMap,
    clearCCMap,
    updateAssignCCs,
  } = useStudioStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [newAssignCC, setNewAssignCC] = useState({ ccNumber: 1, paramName: '', defaultValue: 64 });

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
        updateNodeData(selectedNodeId, { type: e.target.value as InstrumentType });
      }
    },
    [selectedNodeId, updateNodeData]
  );

  const handleLocalOffChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNodeId) {
        updateNodeData(selectedNodeId, { localOff: e.target.checked });
      }
    },
    [selectedNodeId, updateNodeData]
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedNodeId) return;

      try {
        const result = await parseCSV(file);
        uploadCCMap(selectedNodeId, result.ccMap, result.nrpnMap);

        // Optionally update name and manufacturer from CSV
        if (result.device && !selectedNode?.data.name.includes(result.device)) {
          updateNodeData(selectedNodeId, {
            name: result.device,
            manufacturer: result.manufacturer || (selectedNode?.data as InstrumentNodeData).manufacturer,
          });
        }

        alert(`Loaded ${result.ccMap.length} CC mappings and ${result.nrpnMap.length} NRPN mappings.`);
      } catch (error) {
        alert(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [selectedNodeId, selectedNode, uploadCCMap, updateNodeData]
  );

  const handleClearCCMap = useCallback(() => {
    if (selectedNodeId) {
      clearCCMap(selectedNodeId);
    }
  }, [selectedNodeId, clearCCMap]);

  const handleRemoveAssignCC = useCallback(
    (slot: number) => {
      if (!selectedNodeId || !selectedNode) return;

      const data = selectedNode.data as InstrumentNodeData;
      const currentAssigns = data.assignCCs || [];
      const updated = currentAssigns
        .filter((a) => a.slot !== slot)
        .map((a, i) => ({ ...a, slot: i + 1 }));

      updateAssignCCs(selectedNodeId, updated);
    },
    [selectedNodeId, selectedNode, updateAssignCCs]
  );

  const handleMoveAssignCC = useCallback(
    (slot: number, direction: 'up' | 'down') => {
      if (!selectedNodeId || !selectedNode) return;

      const data = selectedNode.data as InstrumentNodeData;
      const currentAssigns = [...(data.assignCCs || [])];
      const index = currentAssigns.findIndex((a) => a.slot === slot);

      if (direction === 'up' && index > 0) {
        [currentAssigns[index - 1], currentAssigns[index]] = [currentAssigns[index], currentAssigns[index - 1]];
      } else if (direction === 'down' && index < currentAssigns.length - 1) {
        [currentAssigns[index], currentAssigns[index + 1]] = [currentAssigns[index + 1], currentAssigns[index]];
      }

      // Renumber slots
      const updated = currentAssigns.map((a, i) => ({ ...a, slot: i + 1 }));
      updateAssignCCs(selectedNodeId, updated);
    },
    [selectedNodeId, selectedNode, updateAssignCCs]
  );

  const handleEditAssignCC = useCallback(
    (assign: AssignCC) => {
      setNewAssignCC({
        ccNumber: assign.ccNumber,
        paramName: assign.paramName,
        defaultValue: assign.defaultValue,
      });
      setEditingSlot(assign.slot);
      setShowAssignForm(true);
    },
    []
  );

  const handleSaveAssignCC = useCallback(() => {
    if (!selectedNodeId || !selectedNode) return;

    const data = selectedNode.data as InstrumentNodeData;
    const currentAssigns = [...(data.assignCCs || [])];

    if (editingSlot !== null) {
      // Update existing
      const index = currentAssigns.findIndex((a) => a.slot === editingSlot);
      if (index !== -1) {
        currentAssigns[index] = {
          ...currentAssigns[index],
          ccNumber: newAssignCC.ccNumber,
          paramName: newAssignCC.paramName || `CC ${newAssignCC.ccNumber}`,
          defaultValue: newAssignCC.defaultValue,
        };
      }
      updateAssignCCs(selectedNodeId, currentAssigns);
    } else {
      // Add new
      if (currentAssigns.length >= 8) {
        alert('Maximum 8 ASSIGN CCs allowed');
        return;
      }
      const newAssign: AssignCC = {
        slot: currentAssigns.length + 1,
        ccNumber: newAssignCC.ccNumber,
        paramName: newAssignCC.paramName || `CC ${newAssignCC.ccNumber}`,
        defaultValue: newAssignCC.defaultValue,
      };
      updateAssignCCs(selectedNodeId, [...currentAssigns, newAssign]);
    }

    setNewAssignCC({ ccNumber: 1, paramName: '', defaultValue: 64 });
    setEditingSlot(null);
    setShowAssignForm(false);
  }, [selectedNodeId, selectedNode, newAssignCC, editingSlot, updateAssignCCs]);

  const handleCancelAssignEdit = useCallback(() => {
    setNewAssignCC({ ccNumber: 1, paramName: '', defaultValue: 64 });
    setEditingSlot(null);
    setShowAssignForm(false);
  }, []);

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

        {/* Divider - CC Definitions - not for Hapax */}
        {!data.isHapax && (
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">CC Definitions</h3>

            {/* Upload CSV */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="
                w-full bg-gray-800 hover:bg-gray-700 border border-gray-600
                text-white py-2 px-4 rounded-lg font-medium
                flex items-center justify-center gap-2 transition-colors
              "
            >
              <Upload size={16} />
              Upload CSV
            </button>

            {/* CC Map Status */}
            {data.ccMap && data.ccMap.length > 0 && (
              <div className="mt-3 bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <FileText size={16} />
                    <span className="text-sm font-medium">CC Map Loaded</span>
                  </div>
                  <button
                    onClick={handleClearCCMap}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title="Clear CC Map"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  {data.ccMap.length} CC mappings
                  {data.nrpnMap && data.nrpnMap.length > 0 && `, ${data.nrpnMap.length} NRPN mappings`}
                </div>

                {/* Preview first few CCs */}
                <div className="mt-2 max-h-24 overflow-y-auto">
                  {data.ccMap.slice(0, 5).map((cc, i) => (
                    <div key={i} className="text-xs text-gray-500 font-mono">
                      CC {cc.ccNumber}: {cc.paramName}
                    </div>
                  ))}
                  {data.ccMap.length > 5 && (
                    <div className="text-xs text-gray-600 mt-1">
                      ... and {data.ccMap.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ASSIGN CCs Section - not for Hapax */}
        {!data.isHapax && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400">ASSIGN Parameters (1-8)</h3>
              {(data.assignCCs?.length || 0) < 8 && !showAssignForm && (
                <button
                  onClick={() => {
                    setEditingSlot(null);
                    setNewAssignCC({ ccNumber: 1, paramName: '', defaultValue: 64 });
                    setShowAssignForm(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Add/Edit ASSIGN form */}
            {showAssignForm && (
              <div className="bg-gray-800 rounded-lg p-3 mb-3 space-y-2">
                <div className="text-xs text-gray-400 font-medium mb-2">
                  {editingSlot !== null ? `Edit ASSIGN ${editingSlot}` : 'Add New ASSIGN'}
                </div>
                {/* Show dropdown if CC map exists */}
                {data.ccMap && data.ccMap.length > 0 ? (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Select Parameter</label>
                      <select
                        value={`${newAssignCC.ccNumber}|${newAssignCC.paramName}`}
                        onChange={(e) => {
                          const [ccNum, ...nameParts] = e.target.value.split('|');
                          const paramName = nameParts.join('|');
                          const cc = data.ccMap.find(c => c.ccNumber === parseInt(ccNum) && c.paramName === paramName);
                          setNewAssignCC({
                            ...newAssignCC,
                            ccNumber: parseInt(ccNum) || 0,
                            paramName: paramName,
                            defaultValue: cc?.defaultValue || 64
                          });
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      >
                        <option value="0|">-- Select a CC --</option>
                        {(() => {
                          // Group CC mappings by section
                          const grouped = new Map<string, typeof data.ccMap>();
                          for (const cc of data.ccMap) {
                            const section = cc.section || 'General';
                            if (!grouped.has(section)) {
                              grouped.set(section, []);
                            }
                            grouped.get(section)!.push(cc);
                          }

                          // Sort sections alphabetically, with "General" at the end
                          const sortedSections = [...grouped.keys()].sort((a, b) => {
                            if (a === 'General') return 1;
                            if (b === 'General') return -1;
                            return a.localeCompare(b);
                          });

                          return sortedSections.map(section => (
                            <optgroup key={section} label={section}>
                              {grouped.get(section)!
                                .sort((a, b) => (a.fullParamName || a.paramName).localeCompare(b.fullParamName || b.paramName))
                                .map((cc, i) => (
                                  <option key={i} value={`${cc.ccNumber}|${cc.paramName}`}>
                                    {cc.fullParamName || cc.paramName} (CC {cc.ccNumber})
                                  </option>
                                ))}
                            </optgroup>
                          ));
                        })()}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Default Value</label>
                      <input
                        type="number"
                        min={0}
                        max={127}
                        value={newAssignCC.defaultValue}
                        onChange={(e) => setNewAssignCC({ ...newAssignCC, defaultValue: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-yellow-500 mb-2">
                      Upload a CC map to select from available parameters, or enter manually:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">CC #</label>
                        <input
                          type="number"
                          min={0}
                          max={127}
                          value={newAssignCC.ccNumber}
                          onChange={(e) => setNewAssignCC({ ...newAssignCC, ccNumber: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Default</label>
                        <input
                          type="number"
                          min={0}
                          max={127}
                          value={newAssignCC.defaultValue}
                          onChange={(e) => setNewAssignCC({ ...newAssignCC, defaultValue: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Parameter Name</label>
                      <input
                        type="text"
                        value={newAssignCC.paramName}
                        onChange={(e) => setNewAssignCC({ ...newAssignCC, paramName: e.target.value })}
                        placeholder="e.g., Cutoff"
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAssignCC}
                    disabled={!newAssignCC.paramName}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-1 px-3 rounded text-sm font-medium transition-colors"
                  >
                    {editingSlot !== null ? 'Save' : 'Add'}
                  </button>
                  <button
                    onClick={handleCancelAssignEdit}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* List of ASSIGN CCs */}
            {data.assignCCs && data.assignCCs.length > 0 ? (
              <div className="space-y-1">
                {data.assignCCs.map((assign, index) => (
                  <div
                    key={assign.slot}
                    className="flex items-center justify-between bg-gray-800 rounded px-2 py-1.5 group"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-purple-400 font-mono text-xs w-4 flex-shrink-0">{assign.slot}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">CC {assign.ccNumber}</span>
                      <span className="text-xs text-gray-300 truncate">{assign.paramName}</span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {/* Move up */}
                      <button
                        onClick={() => handleMoveAssignCC(assign.slot, 'up')}
                        disabled={index === 0}
                        className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      {/* Move down */}
                      <button
                        onClick={() => handleMoveAssignCC(assign.slot, 'down')}
                        disabled={index === data.assignCCs!.length - 1}
                        className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => handleEditAssignCC(assign)}
                        className="text-gray-500 hover:text-blue-400 p-0.5 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleRemoveAssignCC(assign.slot)}
                        className="text-gray-500 hover:text-red-400 p-0.5 transition-colors"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                No ASSIGN parameters. Add up to 8 CCs for Hapax encoder mapping.
              </p>
            )}
          </div>
        )}

        {/* Port Info */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Ports</h3>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500">Inputs:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.inputs.map((port) => (
                  <span
                    key={port.id}
                    className={`
                      text-[10px] px-1.5 py-0.5 rounded
                      ${port.type === 'midi' ? 'bg-green-900/50 text-green-300' : ''}
                      ${port.type === 'audio' ? 'bg-orange-900/50 text-orange-300' : ''}
                      ${port.type === 'cv' ? 'bg-yellow-900/50 text-yellow-300' : ''}
                    `}
                  >
                    {port.label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Outputs:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.outputs.map((port) => (
                  <span
                    key={port.id}
                    className={`
                      text-[10px] px-1.5 py-0.5 rounded
                      ${port.type === 'midi' ? 'bg-blue-900/50 text-blue-300' : ''}
                      ${port.type === 'audio' ? 'bg-red-900/50 text-red-300' : ''}
                      ${port.type === 'cv' ? 'bg-purple-900/50 text-purple-300' : ''}
                    `}
                  >
                    {port.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
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
