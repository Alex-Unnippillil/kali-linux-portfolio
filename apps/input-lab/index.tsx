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

  const hasTyped = text.length > 0;
  const derivedStatus =
    status || (hasTyped ? 'Validating…' : 'Waiting for input to validate.');
  const isUnsafeStatus = derivedStatus.startsWith('Error');
  const isSafeStatus = derivedStatus === 'Saved';

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
    <div className="min-h-screen bg-gray-950 px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900/80 p-8 shadow-xl">
          <h1 className="text-3xl font-semibold text-cyan-100">Input Lab</h1>
          <p className="mt-3 text-sm text-cyan-50">
            Observe how browsers report keyboard input, IME composition, and caret
            movement. Every interaction you make with the field below is timestamped
            so you can compare event ordering across devices.
          </p>
          <dl className="mt-6 grid gap-4 text-xs text-cyan-100 sm:grid-cols-3">
            <div className="rounded-lg border border-cyan-500/20 bg-slate-900/60 p-4">
              <dt className="font-semibold uppercase tracking-wide text-cyan-200">
                caret.start
              </dt>
              <dd className="mt-1">
                Selection anchor (cursor) position when the event fired.
              </dd>
            </div>
            <div className="rounded-lg border border-cyan-500/20 bg-slate-900/60 p-4">
              <dt className="font-semibold uppercase tracking-wide text-cyan-200">
                caret.end
              </dt>
              <dd className="mt-1">
                Selection focus position; differs from start when text is highlighted.
              </dd>
            </div>
            <div className="rounded-lg border border-cyan-500/20 bg-slate-900/60 p-4">
              <dt className="font-semibold uppercase tracking-wide text-cyan-200">
                caret.extra
              </dt>
              <dd className="mt-1">
                Additional metadata such as the trigger key or composition data.
              </dd>
            </div>
          </dl>
        </section>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col gap-5 rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6 shadow-lg"
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="input-lab-text"
                className="text-sm font-medium tracking-wide text-cyan-100"
                id="input-lab-text-label"
              >
                <span className="sr-only">Text</span>
                <span aria-hidden="true">Payload input</span>
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
                className="w-full rounded-lg border border-cyan-500/20 bg-slate-950/80 px-3 py-2 text-base text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                aria-label="Text"
                aria-describedby={error ? 'input-lab-error' : undefined}
              />
              {error && (
                <p id="input-lab-error" className="text-sm text-rose-300">
                  {error}
                </p>
              )}
            </div>
            <div role="status" aria-live="polite">
              <div
                className={`rounded-xl border-l-4 px-4 py-3 text-sm transition-colors duration-200 ${
                  isUnsafeStatus
                    ? 'border-rose-500 bg-rose-500/10 text-rose-100'
                    : isSafeStatus
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-100'
                    : 'border-cyan-500 bg-cyan-500/10 text-cyan-100'
                }`}
              >
                <p className="font-semibold uppercase tracking-wide">
                  {isUnsafeStatus
                    ? 'Unsafe payload detected'
                    : isSafeStatus
                    ? 'Payload stored safely'
                    : 'Status pending'}
                </p>
                <p className="mt-1 text-xs text-white/80">
                  {derivedStatus}
                </p>
              </div>
            </div>
          </form>
          <section
            className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
            aria-labelledby="input-lab-sanitizer-guidance"
          >
            <h2
              id="input-lab-sanitizer-guidance"
              className="text-sm font-semibold uppercase tracking-wide text-slate-200"
            >
              Sanitizer guidance
            </h2>
            <p className="text-sm text-slate-300">
              Pair the payload field with your sanitizer of choice and monitor the
              live status callout. Safe states highlight the sanitized result while
              unsafe states flag payloads that need revisions before rendering.
            </p>
            <div className="space-y-3 text-sm">
              <article
                className={`rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 transition ${
                  isSafeStatus ? 'ring-2 ring-emerald-400/60' : 'opacity-70'
                }`}
              >
                <h3 className="font-semibold text-emerald-100">Safe outcome</h3>
                <p className="mt-2 text-emerald-100/80">
                  When the status reads “Saved”, the payload satisfied validation and
                  is stored locally without modification. Use this state to confirm
                  your sanitizer preserved the intended characters.
                </p>
              </article>
              <article
                className={`rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 transition ${
                  isUnsafeStatus ? 'ring-2 ring-rose-400/60' : 'opacity-70'
                }`}
              >
                <h3 className="font-semibold text-rose-100">Unsafe outcome</h3>
                <p className="mt-2 text-rose-100/80">
                  Error states indicate the payload failed validation. Treat the
                  input as unsafe and iterate on your sanitizer or payload until the
                  status returns to a safe state.
                </p>
              </article>
            </div>
          </section>
          <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                Rendered preview
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!isExportDisabled) {
                    exportLog();
                  }
                }}
                className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isExportDisabled}
              >
                Export JSON
              </button>
            </div>
            <pre className="mt-4 max-h-64 flex-1 overflow-y-auto rounded-lg bg-slate-900/80 p-4 text-xs text-emerald-200 shadow-inner">
              <code className="block whitespace-pre-wrap font-mono">
                {isExportDisabled
                  ? 'Interact with the input field to begin logging events.'
                  : JSON.stringify(eventLog, null, 2)}
              </code>
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}

