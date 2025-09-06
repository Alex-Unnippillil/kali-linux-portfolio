'use client';

import { useState } from 'react';
import ToggleSwitch from '../../../components/ToggleSwitch';
import Toast from '../../../components/ui/Toast';

export default function RemovableMediaPage() {
  const [autoRun, setAutoRun] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [toast, setToast] = useState('');

  const insertDevice = () => {
    if (autoRun) {
      setPromptOpen(true);
    }
  };

  const handleRun = () => {
    setPromptOpen(false);
    setToast('Demo; no binaries executed');
  };

  return (
    <div className="p-4 text-white">
      <div className="flex items-center space-x-2">
        <span className="text-ubt-grey">Auto-run programs when media is inserted</span>
        <ToggleSwitch
          checked={autoRun}
          onChange={setAutoRun}
          ariaLabel="Auto-run programs when media is inserted"
        />
      </div>
      <button
        onClick={insertDevice}
        className="mt-4 px-4 py-2 rounded bg-ub-orange text-white"
      >
        Insert device with autorun
      </button>

      {promptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-ub-cool-grey p-4 rounded space-y-4">
            <p>Autorun program detected. Run it?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleRun}
                className="px-4 py-2 bg-ub-orange text-white rounded"
              >
                Run
              </button>
              <button
                onClick={() => setPromptOpen(false)}
                className="px-4 py-2 bg-ubt-cool-grey text-white rounded"
              >
                Ignore
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

