import React, { useState } from 'react';

export default function PayloadBuilder() {
  const [payload, setPayload] = useState('');
  const [message, setMessage] = useState('');

  const buildPayload = () => {
    setMessage(
      'Execution blocked. The browser\'s Same-Origin Policy and Content Security Policy prevent running arbitrary scripts in this demo.'
    );
  };

  return (
    <div className="mt-4">
      <h3 className="font-bold mb-2">Payload Builder</h3>
      <textarea
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        rows={3}
        className="w-full p-1 text-black mb-2"
        placeholder="Enter JS payload..."
      />
      <button
        type="button"
        onClick={buildPayload}
        className="px-3 py-1 bg-ub-gray-50 text-black rounded"
      >
        Build
      </button>
      {message && <p className="mt-2 text-xs">{message}</p>}
    </div>
  );
}
