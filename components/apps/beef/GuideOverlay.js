import React, { useState } from 'react';

const STORAGE_KEY = 'beefHelpDismissed';

export default function GuideOverlay({ onClose }) {
  const [dontShow, setDontShow] = useState(false);

  const handleClose = () => {
    if (dontShow) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch (e) {
        // ignore storage errors
      }
    }
    onClose();
  };

  return (
    <div
      className="absolute inset-0 bg-black bg-opacity-75 text-white flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-md p-4 bg-gray-800 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-2">BeEF Workflow</h2>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          <li>Use <strong>Refresh</strong> to load hooked browsers.</li>
          <li>Select a browser from the list to target.</li>
          <li>Enter a <strong>Module ID</strong> and click <strong>Run Module</strong> to execute it.</li>
          <li>View the module output below the controls.</li>
        </ul>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
          />
            <span>Don&apos;t show again</span>
          </label>
        <button
          onClick={handleClose}
          className="mt-4 px-3 py-1 bg-gray-700 rounded focus:outline-none focus:ring"
          autoFocus
        >
          Got it
        </button>
      </div>
    </div>
  );
}
