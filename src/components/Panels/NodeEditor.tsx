import { useCallback, useState } from 'react';
import { X, Download, Plus, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { generateAllDefinitions, downloadFile } from '../../utils/hapaxExport';
import { DEFAULT_DRUM_LANES } from '../../data/defaultNodes';
import type { InstrumentType, AssignCC, AutomationLane, AutomationType, DrumLane, InstrumentNodeData } from '../../types';

export function NodeEditor() {
  const {
    nodes,
    edges,
    selectedNodeId,
    setSelectedNode,
    updateNodeData,
    updateAssignCCs,
    updateAutomationLanes,
    updateDrumLanes,
  } = useStudioStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [newAssignCC, setNewAssignCC] = useState({ ccNumber: 1, paramName: '', defaultValue: 64 });

  const [showAutomationForm, setShowAutomationForm] = useState(false);
  const [editingAutomationSlot, setEditingAutomationSlot] = useState<number | null>(null);
  const [newAutomationLane, setNewAutomationLane] = useState<{
    type: AutomationType;
    ccNumber: number;
    cvNumber: number;
    nrpnMsb: number;
    nrpnLsb: number;
    nrpnDepth: 7 | 14;
    paramName: string;
  }>({ type: 'CC', ccNumber: 0, cvNumber: 1, nrpnMsb: 0, nrpnLsb: 0, nrpnDepth: 7, paramName: '' });

  const [showDrumLaneForm, setShowDrumLaneForm] = useState(false);
  const [editingDrumLane, setEditingDrumLane] = useState<number | null>(null);
  const [newDrumLane, setNewDrumLane] = useState({ trig: '', chan: '', note: '', name: '' });

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

  const handleSaveAutomationLane = useCallback(() => {
    if (!selectedNodeId || !selectedNode) return;

    const data = selectedNode.data as InstrumentNodeData;
    const currentLanes = [...(data.automationLanes || [])];

    const lane: AutomationLane = {
      slot: 0, // will be set below
      type: newAutomationLane.type,
      paramName: newAutomationLane.paramName || undefined,
    };

    if (lane.type === 'CC') {
      lane.ccNumber = newAutomationLane.ccNumber;
      if (!lane.paramName) lane.paramName = `CC ${newAutomationLane.ccNumber}`;
    } else if (lane.type === 'CV') {
      lane.cvNumber = newAutomationLane.cvNumber;
      if (!lane.paramName) lane.paramName = `CV ${newAutomationLane.cvNumber}`;
    } else if (lane.type === 'NRPN') {
      lane.nrpnMsb = newAutomationLane.nrpnMsb;
      lane.nrpnLsb = newAutomationLane.nrpnLsb;
      lane.nrpnDepth = newAutomationLane.nrpnDepth;
      if (!lane.paramName) lane.paramName = `NRPN ${newAutomationLane.nrpnMsb}:${newAutomationLane.nrpnLsb}`;
    } else {
      // PB or AT
      if (!lane.paramName) lane.paramName = lane.type;
    }

    if (editingAutomationSlot !== null) {
      const index = currentLanes.findIndex((l) => l.slot === editingAutomationSlot);
      if (index !== -1) {
        currentLanes[index] = { ...lane, slot: currentLanes[index].slot };
      }
      updateAutomationLanes(selectedNodeId, currentLanes);
    } else {
      if (currentLanes.length >= 64) {
        alert('Maximum 64 automation lanes allowed');
        return;
      }
      lane.slot = currentLanes.length + 1;
      updateAutomationLanes(selectedNodeId, [...currentLanes, lane]);
    }

    setNewAutomationLane({ type: 'CC', ccNumber: 0, cvNumber: 1, nrpnMsb: 0, nrpnLsb: 0, nrpnDepth: 7, paramName: '' });
    setEditingAutomationSlot(null);
    setShowAutomationForm(false);
  }, [selectedNodeId, selectedNode, newAutomationLane, editingAutomationSlot, updateAutomationLanes]);

  const handleRemoveAutomationLane = useCallback(
    (slot: number) => {
      if (!selectedNodeId || !selectedNode) return;

      const data = selectedNode.data as InstrumentNodeData;
      const updated = (data.automationLanes || [])
        .filter((l) => l.slot !== slot)
        .map((l, i) => ({ ...l, slot: i + 1 }));

      updateAutomationLanes(selectedNodeId, updated);
    },
    [selectedNodeId, selectedNode, updateAutomationLanes]
  );

  const handleMoveAutomationLane = useCallback(
    (slot: number, direction: 'up' | 'down') => {
      if (!selectedNodeId || !selectedNode) return;

      const data = selectedNode.data as InstrumentNodeData;
      const currentLanes = [...(data.automationLanes || [])];
      const index = currentLanes.findIndex((l) => l.slot === slot);

      if (direction === 'up' && index > 0) {
        [currentLanes[index - 1], currentLanes[index]] = [currentLanes[index], currentLanes[index - 1]];
      } else if (direction === 'down' && index < currentLanes.length - 1) {
        [currentLanes[index], currentLanes[index + 1]] = [currentLanes[index + 1], currentLanes[index]];
      }

      const updated = currentLanes.map((l, i) => ({ ...l, slot: i + 1 }));
      updateAutomationLanes(selectedNodeId, updated);
    },
    [selectedNodeId, selectedNode, updateAutomationLanes]
  );

  const handleEditAutomationLane = useCallback(
    (lane: AutomationLane) => {
      setNewAutomationLane({
        type: lane.type,
        ccNumber: lane.ccNumber ?? 0,
        cvNumber: lane.cvNumber ?? 1,
        nrpnMsb: lane.nrpnMsb ?? 0,
        nrpnLsb: lane.nrpnLsb ?? 0,
        nrpnDepth: lane.nrpnDepth ?? 7,
        paramName: lane.paramName || '',
      });
      setEditingAutomationSlot(lane.slot);
      setShowAutomationForm(true);
    },
    []
  );

  const handleCancelAutomationEdit = useCallback(() => {
    setNewAutomationLane({ type: 'CC', ccNumber: 0, cvNumber: 1, nrpnMsb: 0, nrpnLsb: 0, nrpnDepth: 7, paramName: '' });
    setEditingAutomationSlot(null);
    setShowAutomationForm(false);
  }, []);

  const handleSaveDrumLane = useCallback(() => {
    if (!selectedNodeId || !selectedNode) return;

    const data = selectedNode.data as InstrumentNodeData;
    const currentLanes = [...(data.drumLanes || [])];

    const lane: DrumLane = {
      lane: 0, // set below
      trig: newDrumLane.trig !== '' ? Math.min(127, Math.max(0, parseInt(newDrumLane.trig) || 0)) : null,
      chan: newDrumLane.chan || null,
      note: newDrumLane.note !== '' ? Math.min(127, Math.max(0, parseInt(newDrumLane.note) || 0)) : null,
      name: newDrumLane.name || 'DRUM',
    };

    if (editingDrumLane !== null) {
      const index = currentLanes.findIndex((l) => l.lane === editingDrumLane);
      if (index !== -1) {
        currentLanes[index] = { ...lane, lane: currentLanes[index].lane };
      }
      updateDrumLanes(selectedNodeId, currentLanes);
    } else {
      if (currentLanes.length >= 8) {
        alert('Maximum 8 drum lanes allowed');
        return;
      }
      lane.lane = currentLanes.length + 1;
      updateDrumLanes(selectedNodeId, [...currentLanes, lane]);
    }

    setNewDrumLane({ trig: '', chan: '', note: '', name: '' });
    setEditingDrumLane(null);
    setShowDrumLaneForm(false);
  }, [selectedNodeId, selectedNode, newDrumLane, editingDrumLane, updateDrumLanes]);

  const handleRemoveDrumLane = useCallback(
    (lane: number) => {
      if (!selectedNodeId || !selectedNode) return;

      const data = selectedNode.data as InstrumentNodeData;
      const updated = (data.drumLanes || [])
        .filter((l) => l.lane !== lane)
        .map((l, i) => ({ ...l, lane: i + 1 }));

      updateDrumLanes(selectedNodeId, updated);
    },
    [selectedNodeId, selectedNode, updateDrumLanes]
  );

  const handleMoveDrumLane = useCallback(
    (lane: number, direction: 'up' | 'down') => {
      if (!selectedNodeId || !selectedNode) return;

      const data = selectedNode.data as InstrumentNodeData;
      const currentLanes = [...(data.drumLanes || [])];
      const index = currentLanes.findIndex((l) => l.lane === lane);

      if (direction === 'up' && index > 0) {
        [currentLanes[index - 1], currentLanes[index]] = [currentLanes[index], currentLanes[index - 1]];
      } else if (direction === 'down' && index < currentLanes.length - 1) {
        [currentLanes[index], currentLanes[index + 1]] = [currentLanes[index + 1], currentLanes[index]];
      }

      const updated = currentLanes.map((l, i) => ({ ...l, lane: i + 1 }));
      updateDrumLanes(selectedNodeId, updated);
    },
    [selectedNodeId, selectedNode, updateDrumLanes]
  );

  const handleEditDrumLane = useCallback(
    (lane: DrumLane) => {
      setNewDrumLane({
        trig: lane.trig !== null ? String(lane.trig) : '',
        chan: lane.chan || '',
        note: lane.note !== null ? String(lane.note) : '',
        name: lane.name,
      });
      setEditingDrumLane(lane.lane);
      setShowDrumLaneForm(true);
    },
    []
  );

  const handleCancelDrumLaneEdit = useCallback(() => {
    setNewDrumLane({ trig: '', chan: '', note: '', name: '' });
    setEditingDrumLane(null);
    setShowDrumLaneForm(false);
  }, []);

  const handleExportSingle = useCallback(() => {
    if (!selectedNodeId) return;

    const definitions = generateAllDefinitions(nodes, edges);

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

        {/* AUTOMATION Lanes Section - not for Hapax */}
        {!data.isHapax && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400">AUTOMATION Lanes (1-64)</h3>
              {(data.automationLanes?.length || 0) < 64 && !showAutomationForm && (
                <button
                  onClick={() => {
                    setEditingAutomationSlot(null);
                    setNewAutomationLane({ type: 'CC', ccNumber: 0, cvNumber: 1, nrpnMsb: 0, nrpnLsb: 0, nrpnDepth: 7, paramName: '' });
                    setShowAutomationForm(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Add/Edit AUTOMATION form */}
            {showAutomationForm && (
              <div className="bg-gray-800 rounded-lg p-3 mb-3 space-y-2">
                <div className="text-xs text-gray-400 font-medium mb-2">
                  {editingAutomationSlot !== null ? `Edit AUTOMATION ${editingAutomationSlot}` : 'Add New AUTOMATION Lane'}
                </div>

                {/* Type selector */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select
                    value={newAutomationLane.type}
                    onChange={(e) => setNewAutomationLane({ ...newAutomationLane, type: e.target.value as AutomationType, paramName: '' })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="CC">CC</option>
                    <option value="PB">PB (Pitch Bend)</option>
                    <option value="AT">AT (Aftertouch)</option>
                    <option value="CV">CV</option>
                    <option value="NRPN">NRPN</option>
                  </select>
                </div>

                {/* Dynamic fields based on type */}
                {newAutomationLane.type === 'CC' && (
                  <>
                    {data.ccMap && data.ccMap.length > 0 ? (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Select CC Parameter</label>
                        <select
                          value={`${newAutomationLane.ccNumber}|${newAutomationLane.paramName}`}
                          onChange={(e) => {
                            const [ccNum, ...nameParts] = e.target.value.split('|');
                            const paramName = nameParts.join('|');
                            setNewAutomationLane({
                              ...newAutomationLane,
                              ccNumber: parseInt(ccNum) || 0,
                              paramName,
                            });
                          }}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                        >
                          <option value="0|">-- Select a CC --</option>
                          {(() => {
                            const filtered = data.ccMap.filter((cc) => cc.ccNumber <= 119);
                            const grouped = new Map<string, typeof data.ccMap>();
                            for (const cc of filtered) {
                              const section = cc.section || 'General';
                              if (!grouped.has(section)) grouped.set(section, []);
                              grouped.get(section)!.push(cc);
                            }
                            const sortedSections = [...grouped.keys()].sort((a, b) => {
                              if (a === 'General') return 1;
                              if (b === 'General') return -1;
                              return a.localeCompare(b);
                            });
                            return sortedSections.map((section) => (
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
                    ) : (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">CC Number (0-119)</label>
                        <input
                          type="number"
                          min={0}
                          max={119}
                          value={newAutomationLane.ccNumber}
                          onChange={(e) => setNewAutomationLane({ ...newAutomationLane, ccNumber: Math.min(119, Math.max(0, parseInt(e.target.value) || 0)) })}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                        />
                      </div>
                    )}
                  </>
                )}

                {(newAutomationLane.type === 'PB' || newAutomationLane.type === 'AT') && (
                  <p className="text-xs text-gray-500">
                    {newAutomationLane.type === 'PB' ? 'Pitch Bend' : 'Aftertouch'} — no additional configuration needed.
                  </p>
                )}

                {newAutomationLane.type === 'CV' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CV Output (1-4)</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={newAutomationLane.cvNumber}
                      onChange={(e) => setNewAutomationLane({ ...newAutomationLane, cvNumber: Math.min(4, Math.max(1, parseInt(e.target.value) || 1)) })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                )}

                {newAutomationLane.type === 'NRPN' && (
                  <>
                    {data.nrpnMap && data.nrpnMap.length > 0 ? (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Select NRPN Parameter</label>
                        <select
                          value={`${newAutomationLane.nrpnMsb}|${newAutomationLane.nrpnLsb}|${newAutomationLane.paramName}`}
                          onChange={(e) => {
                            const [msb, lsb, ...nameParts] = e.target.value.split('|');
                            const paramName = nameParts.join('|');
                            setNewAutomationLane({
                              ...newAutomationLane,
                              nrpnMsb: parseInt(msb) || 0,
                              nrpnLsb: parseInt(lsb) || 0,
                              paramName,
                            });
                          }}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                        >
                          <option value="0|0|">-- Select an NRPN --</option>
                          {(() => {
                            const grouped = new Map<string, typeof data.nrpnMap>();
                            for (const nrpn of data.nrpnMap) {
                              const section = nrpn.section || 'General';
                              if (!grouped.has(section)) grouped.set(section, []);
                              grouped.get(section)!.push(nrpn);
                            }
                            const sortedSections = [...grouped.keys()].sort((a, b) => {
                              if (a === 'General') return 1;
                              if (b === 'General') return -1;
                              return a.localeCompare(b);
                            });
                            return sortedSections.map((section) => (
                              <optgroup key={section} label={section}>
                                {grouped.get(section)!
                                  .sort((a, b) => a.paramName.localeCompare(b.paramName))
                                  .map((nrpn, i) => (
                                    <option key={i} value={`${nrpn.msb}|${nrpn.lsb}|${nrpn.paramName}`}>
                                      {nrpn.paramName} ({nrpn.msb}:{nrpn.lsb})
                                    </option>
                                  ))}
                              </optgroup>
                            ));
                          })()}
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">MSB (0-127)</label>
                          <input
                            type="number"
                            min={0}
                            max={127}
                            value={newAutomationLane.nrpnMsb}
                            onChange={(e) => setNewAutomationLane({ ...newAutomationLane, nrpnMsb: Math.min(127, Math.max(0, parseInt(e.target.value) || 0)) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">LSB (0-127)</label>
                          <input
                            type="number"
                            min={0}
                            max={127}
                            value={newAutomationLane.nrpnLsb}
                            onChange={(e) => setNewAutomationLane({ ...newAutomationLane, nrpnLsb: Math.min(127, Math.max(0, parseInt(e.target.value) || 0)) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Depth</label>
                      <select
                        value={newAutomationLane.nrpnDepth}
                        onChange={(e) => setNewAutomationLane({ ...newAutomationLane, nrpnDepth: parseInt(e.target.value) as 7 | 14 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      >
                        <option value={7}>7-bit</option>
                        <option value={14}>14-bit</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Optional param name for CC / CV (PB/AT auto-set) */}
                {(newAutomationLane.type === 'CC' && !(data.ccMap && data.ccMap.length > 0)) && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Parameter Name</label>
                    <input
                      type="text"
                      value={newAutomationLane.paramName}
                      onChange={(e) => setNewAutomationLane({ ...newAutomationLane, paramName: e.target.value })}
                      placeholder="e.g., Cutoff"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                )}
                {newAutomationLane.type === 'NRPN' && !(data.nrpnMap && data.nrpnMap.length > 0) && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Parameter Name</label>
                    <input
                      type="text"
                      value={newAutomationLane.paramName}
                      onChange={(e) => setNewAutomationLane({ ...newAutomationLane, paramName: e.target.value })}
                      placeholder="e.g., Filter Env"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                )}
                {newAutomationLane.type === 'CV' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Parameter Name</label>
                    <input
                      type="text"
                      value={newAutomationLane.paramName}
                      onChange={(e) => setNewAutomationLane({ ...newAutomationLane, paramName: e.target.value })}
                      placeholder="e.g., Pitch"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAutomationLane}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
                  >
                    {editingAutomationSlot !== null ? 'Save' : 'Add'}
                  </button>
                  <button
                    onClick={handleCancelAutomationEdit}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* List of AUTOMATION lanes */}
            {data.automationLanes && data.automationLanes.length > 0 ? (
              <div className="space-y-1">
                {data.automationLanes.map((lane, index) => (
                  <div
                    key={lane.slot}
                    className="flex items-center justify-between bg-gray-800 rounded px-2 py-1.5 group"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-cyan-400 font-mono text-xs w-4 flex-shrink-0">{lane.slot}</span>
                      <span className={`text-[10px] px-1 py-0.5 rounded font-medium flex-shrink-0 ${
                        lane.type === 'CC' ? 'bg-blue-900/50 text-blue-300' :
                        lane.type === 'PB' ? 'bg-purple-900/50 text-purple-300' :
                        lane.type === 'AT' ? 'bg-pink-900/50 text-pink-300' :
                        lane.type === 'CV' ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-teal-900/50 text-teal-300'
                      }`}>{lane.type}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {lane.type === 'CC' && `${lane.ccNumber}`}
                        {lane.type === 'CV' && `${lane.cvNumber}`}
                        {lane.type === 'NRPN' && `${lane.nrpnMsb}:${lane.nrpnLsb}:${lane.nrpnDepth}`}
                      </span>
                      <span className="text-xs text-gray-300 truncate">{lane.paramName}</span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => handleMoveAutomationLane(lane.slot, 'up')}
                        disabled={index === 0}
                        className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMoveAutomationLane(lane.slot, 'down')}
                        disabled={index === data.automationLanes!.length - 1}
                        className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={() => handleEditAutomationLane(lane)}
                        className="text-gray-500 hover:text-blue-400 p-0.5 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleRemoveAutomationLane(lane.slot)}
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
                No automation lanes. Add up to 64 lanes for Hapax automation routing.
              </p>
            )}
          </div>
        )}

        {/* DRUMLANES Section - only for DRUM type, not Hapax */}
        {!data.isHapax && data.type === 'DRUM' && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400">DRUMLANES (1-8)</h3>
              {(data.drumLanes?.length || 0) < 8 && !showDrumLaneForm && (
                <button
                  onClick={() => {
                    setEditingDrumLane(null);
                    setNewDrumLane({ trig: '', chan: '', note: '', name: '' });
                    setShowDrumLaneForm(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Add/Edit DRUMLANE form */}
            {showDrumLaneForm && (
              <div className="bg-gray-800 rounded-lg p-3 mb-3 space-y-2">
                <div className="text-xs text-gray-400 font-medium mb-2">
                  {editingDrumLane !== null ? `Edit Row ${editingDrumLane}` : 'Add New Drum Lane'}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={newDrumLane.name}
                    onChange={(e) => setNewDrumLane({ ...newDrumLane, name: e.target.value })}
                    placeholder="e.g., KICK"
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Note (0-127)</label>
                    <input
                      type="number"
                      min={0}
                      max={127}
                      value={newDrumLane.note}
                      onChange={(e) => setNewDrumLane({ ...newDrumLane, note: e.target.value })}
                      placeholder="NULL"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">TRIG (0-127)</label>
                    <input
                      type="number"
                      min={0}
                      max={127}
                      value={newDrumLane.trig}
                      onChange={(e) => setNewDrumLane({ ...newDrumLane, trig: e.target.value })}
                      placeholder="NULL"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CHAN</label>
                  <select
                    value={newDrumLane.chan}
                    onChange={(e) => setNewDrumLane({ ...newDrumLane, chan: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="">NULL</option>
                    <optgroup label="MIDI Channel">
                      {Array.from({ length: 16 }, (_, i) => (
                        <option key={`ch-${i + 1}`} value={String(i + 1)}>{i + 1}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Gate">
                      {['G1', 'G2', 'G3', 'G4'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </optgroup>
                    <optgroup label="CV">
                      {['CV1', 'CV2', 'CV3', 'CV4'].map(cv => (
                        <option key={cv} value={cv}>{cv}</option>
                      ))}
                    </optgroup>
                    <optgroup label="CV Gate">
                      {['CVG1', 'CVG2', 'CVG3', 'CVG4'].map(cvg => (
                        <option key={cvg} value={cvg}>{cvg}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDrumLane}
                    disabled={!newDrumLane.name}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-1 px-3 rounded text-sm font-medium transition-colors"
                  >
                    {editingDrumLane !== null ? 'Save' : 'Add'}
                  </button>
                  <button
                    onClick={handleCancelDrumLaneEdit}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* List of drum lanes — sorted descending by lane (Row 8 at top, Row 1 at bottom) */}
            {data.drumLanes && data.drumLanes.length > 0 ? (
              <div className="space-y-1">
                {[...data.drumLanes].sort((a, b) => b.lane - a.lane).map((lane) => {
                  const ascIndex = data.drumLanes!.findIndex((l) => l.lane === lane.lane);
                  return (
                    <div
                      key={lane.lane}
                      className="flex items-center justify-between bg-gray-800 rounded px-2 py-1.5 group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-orange-400 font-mono text-xs w-4 flex-shrink-0">{lane.lane}</span>
                        {lane.note !== null && (
                          <span className="text-xs text-gray-500 flex-shrink-0">N:{lane.note}</span>
                        )}
                        {(lane.trig !== null || lane.chan) && (
                          <span className="text-[10px] text-gray-600 flex-shrink-0">
                            {lane.trig !== null ? `T:${lane.trig}` : ''}{lane.trig !== null && lane.chan ? ' ' : ''}{lane.chan ? `CH:${lane.chan}` : ''}
                          </span>
                        )}
                        <span className="text-xs text-gray-300 truncate">{lane.name}</span>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => handleMoveDrumLane(lane.lane, 'up')}
                          disabled={ascIndex === 0}
                          className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveDrumLane(lane.lane, 'down')}
                          disabled={ascIndex === data.drumLanes!.length - 1}
                          className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={() => handleEditDrumLane(lane)}
                          className="text-gray-500 hover:text-blue-400 p-0.5 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleRemoveDrumLane(lane.lane)}
                          className="text-gray-500 hover:text-red-400 p-0.5 transition-colors"
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                No drum lanes. Add up to 8 lanes for Hapax drum mapping.
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
