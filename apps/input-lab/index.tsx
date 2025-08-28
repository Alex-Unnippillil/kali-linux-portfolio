'use client';

import React, { useEffect, useState } from 'react';
import { z } from 'zod';

const SAVE_KEY = 'input-lab:text';

const schema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export default function InputLab() {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // Load saved text on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(SAVE_KEY);
    if (saved) setText(saved);
  }, []);

  // Validate and autosave
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handle = setTimeout(() => {
      const result = schema.safeParse({ text });
      if (!result.success) {
        const msg = result.error.issues[0].message;
        setError(msg);
        setStatus(`Error: ${msg}`);
        return;
      }
      setError('');
      window.localStorage.setItem(SAVE_KEY, text);
      setStatus('Saved');
    }, 500);
    return () => clearTimeout(handle);
  }, [text]);

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <h1 className="mb-4 text-2xl">Input Lab</h1>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <label htmlFor="input-lab-text" className="mb-1 block text-sm font-medium">
            Text
          </label>
          <input
            id="input-lab-text"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
          />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>
      </form>
      <div role="status" aria-live="polite" className="mt-4 text-sm text-green-400">
        {status}
      </div>
    </div>
  );
}

