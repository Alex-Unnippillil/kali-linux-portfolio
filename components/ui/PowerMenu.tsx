"use client";
import { useState } from 'react';

interface Action {
  id: string;
  label: string;
}

const actions: Action[] = [
  { id: 'Lock', label: 'Lock (simulation)' },
  { id: 'Log Out', label: 'Log Out (simulation)' },
  { id: 'Suspend', label: 'Suspend (simulation)' },
  { id: 'Restart', label: 'Restart (simulation)' },
  { id: 'Shutdown', label: 'Shutdown (simulation)' },
];

export default function PowerMenu() {
  const [confirm, setConfirm] = useState<Action | null>(null);

  return (
    <div className="border-t border-ubt-cool-grey mt-2 pt-2">
      {actions.map((action) => (
        <button
          key={action.id}
          className="w-full flex justify-between px-4 py-1 hover:bg-ubt-grey hover:bg-opacity-10"
          onClick={() => setConfirm(action)}
        >
          <span>{action.id}</span>
          <span className="text-xs text-ubt-grey">simulation</span>
        </button>
      ))}
      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div className="bg-ub-cool-grey p-4 rounded shadow text-center">
            <p className="mb-4">{`Simulate ${confirm.id}?`}</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-2 py-1 bg-gray-700 rounded"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="px-2 py-1 bg-ub-orange rounded"
                onClick={() => {
                  setConfirm(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
