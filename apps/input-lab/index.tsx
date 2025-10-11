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

  const isExportDisabled = eventLog.length === 0;

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <section className="mb-8 rounded-lg border border-cyan-500/30 bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-cyan-100">Input Lab</h1>
        <p className="mt-3 text-sm text-cyan-50">
          Observe how browsers report keyboard input, IME composition, and caret
          movement. Every interaction you make with the field below is timestamped
          so you can compare event ordering across devices.
        </p>
        <dl className="mt-4 grid gap-3 text-xs text-cyan-100 sm:grid-cols-3">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-cyan-200">
              caret.start
            </dt>
            <dd>Selection anchor (cursor) position when the event fired.</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-cyan-200">
              caret.end
            </dt>
            <dd>Selection focus position; differs from start when text is highlighted.</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-cyan-200">
              caret.extra
            </dt>
            <dd>Additional metadata such as the trigger key or composition data.</dd>
          </div>
        </dl>
      </section>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <label
            htmlFor="input-lab-text"
            className="mb-1 block text-sm font-medium"
            id="input-lab-text-label"
          >
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
            aria-labelledby="input-lab-text-label"
          />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>
      </form>
      <div role="status" aria-live="polite" className="mt-4 text-sm text-green-400">
        {status}
      </div>
      <section className="mt-6 rounded-lg border border-gray-800 bg-black/40 p-4 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Event log
          </h2>
          <button
            type="button"
            onClick={() => {
              if (!isExportDisabled) {
                exportLog();
              }
            }}
            className="rounded bg-blue-600 px-3 py-1 text-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isExportDisabled}
          >
            Export JSON
          </button>
        </div>
        <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-gray-900/70 p-3 text-xs text-green-200 font-mono">
          {isExportDisabled
            ? 'Interact with the input field to begin logging events.'
            : JSON.stringify(eventLog, null, 2)}
        </pre>
      </section>
    </div>
  );
}

