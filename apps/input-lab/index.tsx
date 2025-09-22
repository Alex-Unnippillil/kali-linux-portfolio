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
  const [eventLog, setEventLog] = useState<
    { time: string; type: string; [key: string]: unknown }[]
  >([]);

  const logEvent = (type: string, details: Record<string, unknown> = {}) => {
    setEventLog((prev) => [
      ...prev,
      { time: new Date().toISOString(), type, ...details },
    ]);
  };

  const handleCaret = (
    e: React.SyntheticEvent<HTMLInputElement, Event>,
    extra: Record<string, unknown> = {},
  ) => {
    const { selectionStart, selectionEnd } = e.currentTarget;
    logEvent('caret', { start: selectionStart, end: selectionEnd, ...extra });
  };

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(eventLog, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'input-lab-log.json';
    a.click();
    URL.revokeObjectURL(url);
  };

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
            onCompositionStart={(e) =>
              logEvent('compositionstart', { data: e.data })
            }
            onCompositionUpdate={(e) =>
              logEvent('compositionupdate', { data: e.data })
            }
            onCompositionEnd={(e) =>
              logEvent('compositionend', { data: e.data })
            }
            onSelect={handleCaret}
            onKeyUp={(e) => {
              if (
                [
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'Home',
                  'End',
                ].includes(e.key)
              ) {
                handleCaret(e);
              }
            }}
              onClick={handleCaret}
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              aria-label="Input text"
            />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>
      </form>
      <div role="status" aria-live="polite" className="mt-4 text-sm text-green-400">
        {status}
      </div>
      {eventLog.length > 0 && (
        <pre className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-gray-800 p-2 text-xs">
          {JSON.stringify(eventLog, null, 2)}
        </pre>
      )}
      <button
        type="button"
        onClick={exportLog}
        className="mt-4 rounded bg-blue-600 px-3 py-1 text-sm"
      >
        Export Log
      </button>
    </div>
  );
}

