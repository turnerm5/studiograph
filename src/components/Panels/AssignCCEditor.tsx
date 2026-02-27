import { useCallback, useState } from 'react';
import { X, Plus, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import type { AssignCC, CCMapping } from '../../types';

interface AssignCCEditorProps {
  nodeId: string;
  assignCCs: AssignCC[];
  ccMap: CCMapping[];
}

export function AssignCCEditor({ nodeId, assignCCs, ccMap }: AssignCCEditorProps) {
  const updateAssignCCs = useStudioStore((s) => s.updateAssignCCs);

  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [newAssignCC, setNewAssignCC] = useState({ ccNumber: 1, paramName: '', defaultValue: 64 });

  const handleRemove = useCallback(
    (slot: number) => {
      const updated = assignCCs
        .filter((a) => a.slot !== slot)
        .map((a, i) => ({ ...a, slot: i + 1 }));
      updateAssignCCs(nodeId, updated);
    },
    [nodeId, assignCCs, updateAssignCCs]
  );

  const handleMove = useCallback(
    (slot: number, direction: 'up' | 'down') => {
      const items = [...assignCCs];
      const index = items.findIndex((a) => a.slot === slot);

      if (direction === 'up' && index > 0) {
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
      } else if (direction === 'down' && index < items.length - 1) {
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
      }

      const updated = items.map((a, i) => ({ ...a, slot: i + 1 }));
      updateAssignCCs(nodeId, updated);
    },
    [nodeId, assignCCs, updateAssignCCs]
  );

  const handleEdit = useCallback((assign: AssignCC) => {
    setNewAssignCC({
      ccNumber: assign.ccNumber,
      paramName: assign.paramName,
      defaultValue: assign.defaultValue,
    });
    setEditingSlot(assign.slot);
    setShowForm(true);
  }, []);

  const handleSave = useCallback(() => {
    const currentAssigns = [...assignCCs];

    if (editingSlot !== null) {
      const index = currentAssigns.findIndex((a) => a.slot === editingSlot);
      if (index !== -1) {
        currentAssigns[index] = {
          ...currentAssigns[index],
          ccNumber: newAssignCC.ccNumber,
          paramName: newAssignCC.paramName || `CC ${newAssignCC.ccNumber}`,
          defaultValue: newAssignCC.defaultValue,
        };
      }
      updateAssignCCs(nodeId, currentAssigns);
    } else {
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
      updateAssignCCs(nodeId, [...currentAssigns, newAssign]);
    }

    setNewAssignCC({ ccNumber: 1, paramName: '', defaultValue: 64 });
    setEditingSlot(null);
    setShowForm(false);
  }, [nodeId, assignCCs, newAssignCC, editingSlot, updateAssignCCs]);

  const handleCancel = useCallback(() => {
    setNewAssignCC({ ccNumber: 1, paramName: '', defaultValue: 64 });
    setEditingSlot(null);
    setShowForm(false);
  }, []);

  return (
    <div className="border-t border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">ASSIGN Parameters (1-8)</h3>
        {assignCCs.length < 8 && !showForm && (
          <button
            onClick={() => {
              setEditingSlot(null);
              setNewAssignCC({ ccNumber: 1, paramName: '', defaultValue: 64 });
              setShowForm(true);
            }}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Add/Edit ASSIGN form */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-3 mb-3 space-y-2">
          <div className="text-xs text-gray-400 font-medium mb-2">
            {editingSlot !== null ? `Edit ASSIGN ${editingSlot}` : 'Add New ASSIGN'}
          </div>
          {/* Show dropdown if CC map exists */}
          {ccMap.length > 0 ? (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Select Parameter</label>
                <select
                  value={`${newAssignCC.ccNumber}|${newAssignCC.paramName}`}
                  onChange={(e) => {
                    const [ccNum, ...nameParts] = e.target.value.split('|');
                    const paramName = nameParts.join('|');
                    const cc = ccMap.find(c => c.ccNumber === parseInt(ccNum) && c.paramName === paramName);
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
                    const grouped = new Map<string, CCMapping[]>();
                    for (const cc of ccMap) {
                      const section = cc.section || 'General';
                      if (!grouped.has(section)) {
                        grouped.set(section, []);
                      }
                      grouped.get(section)!.push(cc);
                    }

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
              onClick={handleSave}
              disabled={!newAssignCC.paramName}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-1 px-3 rounded text-sm font-medium transition-colors"
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

      {/* List of ASSIGN CCs */}
      {assignCCs.length > 0 ? (
        <div className="space-y-1">
          {assignCCs.map((assign, index) => (
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
                <button
                  onClick={() => handleMove(assign.slot, 'up')}
                  disabled={index === 0}
                  className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                  title="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => handleMove(assign.slot, 'down')}
                  disabled={index === assignCCs.length - 1}
                  className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                  title="Move down"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => handleEdit(assign)}
                  className="text-gray-500 hover:text-blue-400 p-0.5 transition-colors"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleRemove(assign.slot)}
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
  );
}
