'use client';

import React, { useState } from 'react';
import FilterEditor from './components/FilterEditor';

export default function EttercapPage() {
  const [showModal, setShowModal] = useState(false);
  const [captureEnabled, setCaptureEnabled] = useState(false);

  const handleEnableClick = () => {
    setShowModal(true);
  };

  const confirmEnable = () => {
    setCaptureEnabled(true);
    setShowModal(false);
  };

  return (
    <div className="relative p-4">
      <h1 className="mb-4 text-xl font-bold">Ettercap Filter Editor</h1>
      <button
        type="button"
        className="mb-4 border px-2 py-1"
        onClick={handleEnableClick}
        disabled={captureEnabled}
      >
        {captureEnabled ? 'Packet Capture Enabled' : 'Enable Packet Capture'}
      </button>
      <FilterEditor />
      {showModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="w-72 rounded bg-white p-4 text-black">
            <p className="mb-4 text-sm">
              Enabling packet capture may impact network performance and could
              expose sensitive information. Do you want to proceed?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="border px-2 py-1"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="border px-2 py-1"
                onClick={confirmEnable}
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

