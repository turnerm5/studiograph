import { useCallback, useState } from 'react';
import { X, Plus, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import type { DrumLane } from '../../types';

interface DrumLanesEditorProps {
  nodeId: string;
  drumLanes: DrumLane[];
}

export function DrumLanesEditor({ nodeId, drumLanes }: DrumLanesEditorProps) {
  const updateDrumLanes = useStudioStore((s) => s.updateDrumLanes);

  const [showForm, setShowForm] = useState(false);
  const [editingLane, setEditingLane] = useState<number | null>(null);
  const [newLane, setNewLane] = useState({ trig: '', chan: '', note: '', name: '' });

  const resetForm = () => {
    setNewLane({ trig: '', chan: '', note: '', name: '' });
    setEditingLane(null);
    setShowForm(false);
  };

  const handleSave = useCallback(() => {
    const currentLanes = [...drumLanes];

    const lane: DrumLane = {
      lane: 0,
      trig: newLane.trig !== '' ? Math.min(127, Math.max(0, parseInt(newLane.trig) || 0)) : null,
      chan: newLane.chan || null,
      note: newLane.note !== '' ? Math.min(127, Math.max(0, parseInt(newLane.note) || 0)) : null,
      name: newLane.name || 'DRUM',
    };

    if (editingLane !== null) {
      const index = currentLanes.findIndex((l) => l.lane === editingLane);
      if (index !== -1) {
        currentLanes[index] = { ...lane, lane: currentLanes[index].lane };
      }
      updateDrumLanes(nodeId, currentLanes);
    } else {
      if (currentLanes.length >= 8) {
        alert('Maximum 8 drum lanes allowed');
        return;
      }
      lane.lane = currentLanes.length + 1;
      updateDrumLanes(nodeId, [...currentLanes, lane]);
    }

    resetForm();
  }, [nodeId, drumLanes, newLane, editingLane, updateDrumLanes]);

  const handleRemove = useCallback(
    (laneNum: number) => {
      const updated = drumLanes
        .filter((l) => l.lane !== laneNum)
        .map((l, i) => ({ ...l, lane: i + 1 }));
      updateDrumLanes(nodeId, updated);
    },
    [nodeId, drumLanes, updateDrumLanes]
  );

  const handleMove = useCallback(
    (laneNum: number, direction: 'up' | 'down') => {
      const items = [...drumLanes];
      const index = items.findIndex((l) => l.lane === laneNum);

      if (direction === 'up' && index > 0) {
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
      } else if (direction === 'down' && index < items.length - 1) {
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
      }

      const updated = items.map((l, i) => ({ ...l, lane: i + 1 }));
      updateDrumLanes(nodeId, updated);
    },
    [nodeId, drumLanes, updateDrumLanes]
  );

  const handleEdit = useCallback((lane: DrumLane) => {
    setNewLane({
      trig: lane.trig !== null ? String(lane.trig) : '',
      chan: lane.chan || '',
      note: lane.note !== null ? String(lane.note) : '',
      name: lane.name,
    });
    setEditingLane(lane.lane);
    setShowForm(true);
  }, []);

  const handleCancel = useCallback(() => {
    resetForm();
  }, []);

  return (
    <div className="border-t border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">DRUMLANES (1-8)</h3>
        {drumLanes.length < 8 && !showForm && (
          <button
            onClick={() => {
              setEditingLane(null);
              setNewLane({ trig: '', chan: '', note: '', name: '' });
              setShowForm(true);
            }}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Add/Edit DRUMLANE form */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-3 mb-3 space-y-2">
          <div className="text-xs text-gray-400 font-medium mb-2">
            {editingLane !== null ? `Edit Row ${editingLane}` : 'Add New Drum Lane'}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={newLane.name}
              onChange={(e) => setNewLane({ ...newLane, name: e.target.value })}
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
                value={newLane.note}
                onChange={(e) => setNewLane({ ...newLane, note: e.target.value })}
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
                value={newLane.trig}
                onChange={(e) => setNewLane({ ...newLane, trig: e.target.value })}
                placeholder="NULL"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CHAN</label>
            <select
              value={newLane.chan}
              onChange={(e) => setNewLane({ ...newLane, chan: e.target.value })}
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
              onClick={handleSave}
              disabled={!newLane.name}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-1 px-3 rounded text-sm font-medium transition-colors"
            >
              {editingLane !== null ? 'Save' : 'Add'}
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

      {/* List of drum lanes — sorted descending by lane (Row 8 at top, Row 1 at bottom) */}
      {drumLanes.length > 0 ? (
        <div className="space-y-1">
          {[...drumLanes].sort((a, b) => b.lane - a.lane).map((lane) => {
            const ascIndex = drumLanes.findIndex((l) => l.lane === lane.lane);
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
                    onClick={() => handleMove(lane.lane, 'up')}
                    disabled={ascIndex === 0}
                    className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors"
                    title="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMove(lane.lane, 'down')}
                    disabled={ascIndex === drumLanes.length - 1}
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
                    onClick={() => handleRemove(lane.lane)}
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
  );
}
