"use client";

import { useEffect, useState } from "react";
import {
  readAutostart,
  saveAutostartEntry,
  AutostartEntry,
} from "../../lib/autostart";

const AutostartManager: React.FC = () => {
  const [entries, setEntries] = useState<AutostartEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readAutostart()
      .then((items) => setEntries(items))
      .finally(() => setLoading(false));
  }, []);

  const updateEntry = (index: number, change: Partial<AutostartEntry>) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...change } as AutostartEntry;
      return next;
    });
  };

  const handleSave = async (entry: AutostartEntry) => {
    await saveAutostartEntry(entry);
  };

  if (loading) {
    return <div>Loading autostart entries...</div>;
  }

  if (!entries.length) {
    return <div>No autostart entries found.</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Autostart Manager</h2>
      <ul className="space-y-2">
        {entries.map((entry, index) => (
          <li key={entry.file} className="flex items-center gap-2">
            <span className="flex-1">{entry.name}</span>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                aria-label="Enabled"
                checked={entry.enabled}
                onChange={(e) =>
                  updateEntry(index, { enabled: e.target.checked })
                }
              />
              <span>Enabled</span>
            </label>
            <label className="flex items-center gap-1">
              <span>Delay</span>
              <input
                type="number"
                aria-label="Delay"
                min={0}
                className="w-20 border rounded px-1"
                value={entry.delay}
                onChange={(e) =>
                  updateEntry(index, { delay: Number(e.target.value) })
                }
              />
            </label>
            <button
              className="px-2 py-1 border rounded"
              onClick={() => handleSave(entry)}
            >
              Save
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AutostartManager;

