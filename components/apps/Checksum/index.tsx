'use client';

import React, { useState } from 'react';
import FormError from '../../ui/FormError';

const ChecksumApp: React.FC = () => {
  const [text, setText] = useState('');
  const [checksum, setChecksum] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!text) return;
    setLoading(true);
    setError('');
    setChecksum('');
    try {
      const res = await fetch('/api/checksum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        throw new Error('Failed');
      }
      const body = await res.json();
      setChecksum(body.checksum || '');
    } catch {
      setError(
        'Checksum service unavailable. Please try again later or contact support.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <textarea
        aria-label="Input text"
        className="w-full rounded bg-gray-800 p-2 text-white"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to checksum"
      />
      <div className="flex items-center gap-2">
        <button
          className="rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
          onClick={handleGenerate}
          disabled={!text || loading}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
        {checksum && (
          <span className="break-all">{checksum}</span>
        )}
      </div>
      {error && <FormError className="mt-4">{error}</FormError>}
    </div>
  );
};

export default ChecksumApp;
export const displayChecksum = () => <ChecksumApp />;

