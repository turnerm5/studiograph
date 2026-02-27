import { useCallback, useState } from 'react';
import { X, Plus, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import type { AutomationLane, AutomationType, CCMapping, NRPNMapping } from '../../types';

interface AutomationEditorProps {
  nodeId: string;
  automationLanes: AutomationLane[];
  ccMap: CCMapping[];
  nrpnMap: NRPNMapping[];
}

export function AutomationEditor({ nodeId, automationLanes, ccMap, nrpnMap }: AutomationEditorProps) {
  const updateAutomationLanes = useStudioStore((s) => s.updateAutomationLanes);

  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [newLane, setNewLane] = useState<{
    type: AutomationType;
    ccNumber: number;
    cvNumber: number;
    nrpnMsb: number;
    nrpnLsb: number;
    nrpnDepth: 7 | 14;
    paramName: string;
  }>({ type: 'CC', ccNumber: 0, cvNumber: 1, nrpnMsb: 0, nrpnLsb: 0, nrpnDepth: 7, paramName: '' });

  const resetForm = () => {
    setNewLane({ type: 'CC', ccNumber: 0, cvNumber: 1, nrpnMsb: 0, nrpnLsb: 0, nrpnDepth: 7, paramName: '' });
    setEditingSlot(null);
    setShowForm(false);
  };

  const handleSave = useCallback(() => {
    const currentLanes = [...automationLanes];

    const lane: AutomationLane = {
      slot: 0,
      type: newLane.type,
      paramName: newLane.paramName || undefined,
    };

    if (lane.type === 'CC') {
      lane.ccNumber = newLane.ccNumber;
      if (!lane.paramName) lane.paramName = `CC ${newLane.ccNumber}`;
    } else if (lane.type === 'CV') {
      lane.cvNumber = newLane.cvNumber;
      if (!lane.paramName) lane.paramName = `CV ${newLane.cvNumber}`;
    } else if (lane.type === 'NRPN') {
      lane.nrpnMsb = newLane.nrpnMsb;
      lane.nrpnLsb = newLane.nrpnLsb;
      lane.nrpnDepth = newLane.nrpnDepth;
      if (!lane.paramName) lane.paramName = `NRPN ${newLane.nrpnMsb}:${newLane.nrpnLsb}`;
    } else {
      if (!lane.paramName) lane.paramName = lane.type;
    }

    if (editingSlot !== null) {
      const index = currentLanes.findIndex((l) => l.slot === editingSlot);
      if (index !== -1) {
        currentLanes[index] = { ...lane, slot: currentLanes[index].slot };
      }
      updateAutomationLanes(nodeId, currentLanes);
    } else {
      if (currentLanes.length >= 64) {
        alert('Maximum 64 automation lanes allowed');
        return;
      }
      lane.slot = currentLanes.length + 1;
      updateAutomationLanes(nodeId, [...currentLanes, lane]);
    }

    resetForm();
  }, [nodeId, automationLanes, newLane, editingSlot, updateAutomationLanes]);

  const handleRemove = useCallback(
    (slot: number) => {
      const updated = automationLanes
        .filter((l) => l.slot !== slot)
        .map((l, i) => ({ ...l, slot: i + 1 }));
      updateAutomationLanes(nodeId, updated);
    },
    [nodeId, automationLanes, updateAutomationLanes]
  );

  const handleMove = useCallback(
    (slot: number, direction: 'up' | 'down') => {
      const items = [...automationLanes];
      const index = items.findIndex((l) => l.slot === slot);

      if (direction === 'up' && index > 0) {
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
      } else if (direction === 'down' && index < items.length - 1) {
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
      }

      const updated = items.map((l, i) => ({ ...l, slot: i + 1 }));
      updateAutomationLanes(nodeId, updated);
    },
    [nodeId, automationLanes, updateAutomationLanes]
  );

  const handleEdit = useCallback((lane: AutomationLane) => {
    setNewLane({
      type: lane.type,
      ccNumber: lane.ccNumber ?? 0,
      cvNumber: lane.cvNumber ?? 1,
      nrpnMsb: lane.nrpnMsb ?? 0,
      nrpnLsb: lane.nrpnLsb ?? 0,
      nrpnDepth: lane.nrpnDepth ?? 7,
      paramName: lane.paramName || '',
    });
    setEditingSlot(lane.slot);
    setShowForm(true);
  }, []);

  const handleCancel = useCallback(() => {
    resetForm();
  }, []);

  return (
    <div className="border-t border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">AUTOMATION Lanes (1-64)</h3>
        {automationLanes.length < 64 && !showForm && (
          <button
            onClick={() => {
              setEditingSlot(null);
              setNewLane({ type: 'CC', ccNumber: 0, cvNumber: 1, nrpnMsb: 0, nrpnLsb: 0, nrpnDepth: 7, paramName: '' });
              setShowForm(true);
            }}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Add/Edit AUTOMATION form */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-3 mb-3 space-y-2">
          <div className="text-xs text-gray-400 font-medium mb-2">
            {editingSlot !== null ? `Edit AUTOMATION ${editingSlot}` : 'Add New AUTOMATION Lane'}
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={newLane.type}
              onChange={(e) => setNewLane({ ...newLane, type: e.target.value as AutomationType, paramName: '' })}
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
          {newLane.type === 'CC' && (
            <>
              {ccMap.length > 0 ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Select CC Parameter</label>
                  <select
                    value={`${newLane.ccNumber}|${newLane.paramName}`}
                    onChange={(e) => {
                      const [ccNum, ...nameParts] = e.target.value.split('|');
                      const paramName = nameParts.join('|');
                      setNewLane({
                        ...newLane,
                        ccNumber: parseInt(ccNum) || 0,
                        paramName,
                      });
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="0|">-- Select a CC --</option>
                    {(() => {
                      const filtered = ccMap.filter((cc) => cc.ccNumber <= 119);
                      const grouped = new Map<string, CCMapping[]>();
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
                    value={newLane.ccNumber}
                    onChange={(e) => setNewLane({ ...newLane, ccNumber: Math.min(119, Math.max(0, parseInt(e.target.value) || 0)) })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  />
                </div>
              )}
            </>
          )}

          {(newLane.type === 'PB' || newLane.type === 'AT') && (
            <p className="text-xs text-gray-500">
              {newLane.type === 'PB' ? 'Pitch Bend' : 'Aftertouch'} — no additional configuration needed.
            </p>
          )}

          {newLane.type === 'CV' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">CV Output (1-4)</label>
              <input
                type="number"
                min={1}
                max={4}
                value={newLane.cvNumber}
                onChange={(e) => setNewLane({ ...newLane, cvNumber: Math.min(4, Math.max(1, parseInt(e.target.value) || 1)) })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
            </div>
          )}

          {newLane.type === 'NRPN' && (
            <>
              {nrpnMap.length > 0 ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Select NRPN Parameter</label>
                  <select
                    value={`${newLane.nrpnMsb}|${newLane.nrpnLsb}|${newLane.paramName}`}
                    onChange={(e) => {
                      const [msb, lsb, ...nameParts] = e.target.value.split('|');
                      const paramName = nameParts.join('|');
                      setNewLane({
                        ...newLane,
                        nrpnMsb: parseInt(msb) || 0,
                        nrpnLsb: parseInt(lsb) || 0,
                        paramName,
                      });
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="0|0|">-- Select an NRPN --</option>
                    {(() => {
                      const grouped = new Map<string, NRPNMapping[]>();
                      for (const nrpn of nrpnMap) {
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
                      value={newLane.nrpnMsb}
                      onChange={(e) => setNewLane({ ...newLane, nrpnMsb: Math.min(127, Math.max(0, parseInt(e.target.value) || 0)) })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">LSB (0-127)</label>
                    <input
                      type="number"
                      min={0}
                      max={127}
                      value={newLane.nrpnLsb}
                      onChange={(e) => setNewLane({ ...newLane, nrpnLsb: Math.min(127, Math.max(0, parseInt(e.target.value) || 0)) })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Depth</label>
                <select
                  value={newLane.nrpnDepth}
                  onChange={(e) => setNewLane({ ...newLane, nrpnDepth: parseInt(e.target.value) as 7 | 14 })}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                >
                  <option value={7}>7-bit</option>
                  <option value={14}>14-bit</option>
                </select>
              </div>
            </>
          )}

          {/* Optional param name for CC / CV (PB/AT auto-set) */}
          {(newLane.type === 'CC' && ccMap.length === 0) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Parameter Name</label>
              <input
                type="text"
                value={newLane.paramName}
                onChange={(e) => setNewLane({ ...newLane, paramName: e.target.value })}
                placeholder="e.g., Cutoff"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
            </div>
          )}
          {newLane.type === 'NRPN' && nrpnMap.length === 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Parameter Name</label>
              <input
                type="text"
                value={newLane.paramName}
                onChange={(e) => setNewLane({ ...newLane, paramName: e.target.value })}
                placeholder="e.g., Filter Env"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
            </div>
          )}
          {newLane.type === 'CV' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Parameter Name</label>
              <input
                type="text"
                value={newLane.paramName}
                onChange={(e) => setNewLane({ ...newLane, paramName: e.target.value })}
                placeholder="e.g., Pitch"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm font-medium transition-colors"
            >
              {editingSlot !== null ? 'Save' : 'Add'}
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List of AUTOMATION lanes */}
      {automationLanes.length > 0 ? (
        <div className="space-y-1">
          {automationLanes.map((lane, index) => (
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
                  onClick={() => handleMove(lane.slot, 'up')}
                  disabled={index === 0}
                  className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                  title="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => handleMove(lane.slot, 'down')}
                  disabled={index === automationLanes.length - 1}
                  className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                  title="Move down"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => handleEdit(lane)}
                  className="text-gray-500 hover:text-blue-400 p-0.5 transition-colors"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleRemove(lane.slot)}
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
  );
}
