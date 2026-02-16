'use client';

import React, { useEffect, useState } from 'react';
import { z } from 'zod';

const SAVE_KEY = 'input-lab:text';
const MAX_LOG_ENTRIES = 250;

type EventEntry = {
  time: string;
  type: string;
  [key: string]: unknown;
};

const schema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export default function InputLab() {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [eventLog, setEventLog] = useState<EventEntry[]>([]);
  const [isLoggingPaused, setIsLoggingPaused] = useState(false);
  const [eventFilter, setEventFilter] = useState('all');

  const hasTyped = text.length > 0;
  const derivedStatus =
    status || (hasTyped ? 'Validating…' : 'Waiting for input to validate.');
  const isUnsafeStatus = derivedStatus.startsWith('Error');
  const isSafeStatus = derivedStatus === 'Saved';
  const eventTypes = Array.from(new Set(eventLog.map((event) => event.type)));
  const visibleEvents =
    eventFilter === 'all'
      ? eventLog
      : eventLog.filter((event) => event.type === eventFilter);
  const compositionEvents = eventLog.filter((event) =>
    event.type.startsWith('composition'),
  ).length;
  const caretEvents = eventLog.filter((event) => event.type === 'caret').length;
  const keyboardEvents = eventLog.filter((event) => event.type === 'keydown').length;
  const latestEvent = eventLog[eventLog.length - 1];

  const logEvent = (type: string, details: Record<string, unknown> = {}) => {
    if (isLoggingPaused) return;

    setEventLog((prev) => [
      ...prev.slice(-(MAX_LOG_ENTRIES - 1)),
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

  const isExportDisabled = visibleEvents.length === 0;

  const statusTone = isUnsafeStatus
    ? 'border-[color:color-mix(in_srgb,var(--kali-blue),#ff4d6d_55%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,rgba(255,77,109,0.22))] text-[color:var(--kali-text)]'
    : isSafeStatus
    ? 'border-[color:var(--kali-terminal-green)] bg-[color:color-mix(in_srgb,var(--kali-terminal-green),transparent_82%)] text-[color:var(--kali-terminal-text)]'
    : 'border-[color:var(--kali-blue)] bg-[color:color-mix(in_srgb,var(--kali-blue),transparent_86%)] text-[color:var(--kali-text)] motion-safe:animate-pulse motion-reduce:animate-none';

  return (
    <div className="min-h-screen bg-kali-background px-4 py-10 text-kali-text">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-kali-surface/90 p-8 text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(140%_120%_at_50%_-30%,rgba(80,157,255,0.38),rgba(25,48,108,0.16)_45%,transparent)]" />
          <h1 className="text-3xl font-semibold text-kali-control">Input Lab</h1>
          <p className="mt-3 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
            Observe how browsers report keyboard input, IME composition, and caret
            movement. Every interaction you make with the field below is timestamped
            so you can compare event ordering across devices.
          </p>
          <dl className="mt-6 grid gap-4 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_82%,transparent)] sm:grid-cols-3">
            <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border),transparent_30%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] p-4 backdrop-blur">
              <dt className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_94%,transparent)]">
                caret.start
              </dt>
              <dd className="mt-1">
                Selection anchor (cursor) position when the event fired.
              </dd>
            </div>
            <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border),transparent_30%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] p-4 backdrop-blur">
              <dt className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_94%,transparent)]">
                caret.end
              </dt>
              <dd className="mt-1">
                Selection focus position; differs from start when text is highlighted.
              </dd>
            </div>
            <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border),transparent_30%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] p-4 backdrop-blur">
              <dt className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_94%,transparent)]">
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
            className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-kali-surface/80 p-6 text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur"
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="input-lab-text"
                className="text-sm font-medium tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_92%,transparent)]"
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
                onKeyDown={(e) =>
                  logEvent('keydown', {
                    key: e.key,
                    ctrl: e.ctrlKey,
                    alt: e.altKey,
                    shift: e.shiftKey,
                    meta: e.metaKey,
                  })
                }
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
                className="w-full rounded-lg border border-[color:color-mix(in_srgb,var(--kali-panel-border),transparent_25%)] bg-kali-background/80 px-3 py-2 text-base text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:border-kali-control focus:outline-none focus:ring-2 focus:ring-kali-control/40"
                aria-label="Text"
                aria-describedby={error ? 'input-lab-error' : undefined}
              />
              {error && (
                <p id="input-lab-error" className="text-sm text-[color:color-mix(in_srgb,var(--kali-blue),#ff4d6d_55%)]">
                  {error}
                </p>
              )}
            </div>
            <div role="status" aria-live="polite">
              <div
                className={`rounded-xl border-l-4 px-4 py-3 text-sm transition-colors duration-300 ${statusTone}`}
              >
                <p className="font-semibold uppercase tracking-wide">
                  {isUnsafeStatus
                    ? 'Unsafe payload detected'
                    : isSafeStatus
                    ? 'Payload stored safely'
                    : 'Status pending'}
                </p>
                <p className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_88%,transparent)]">
                  {derivedStatus}
                </p>
              </div>
            </div>
          </form>
          <section
            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-kali-surface/80 p-6 text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur"
            aria-labelledby="input-lab-sanitizer-guidance"
          >
            <h2
              id="input-lab-sanitizer-guidance"
              className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_92%,transparent)]"
            >
              Sanitizer guidance
            </h2>
            <p className="text-sm text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
              Pair the payload field with your sanitizer of choice and monitor the
              live status callout. Safe states highlight the sanitized result while
              unsafe states flag payloads that need revisions before rendering.
            </p>
            <div className="space-y-3 text-sm">
              <article
                className={`rounded-xl border border-[color:color-mix(in_srgb,var(--kali-terminal-green),transparent_75%)] bg-[color:color-mix(in_srgb,var(--kali-terminal-green),transparent_88%)] p-4 text-[color:var(--kali-terminal-text)] transition ${
                  isSafeStatus
                    ? 'shadow-[0_0_0_1px_color-mix(in_srgb,var(--kali-terminal-green),transparent_65%)]'
                    : 'opacity-70'
                }`}
              >
                <h3 className="font-semibold">Safe outcome</h3>
                <p className="mt-2 text-[color:color-mix(in_srgb,var(--kali-terminal-text),transparent_25%)]">
                  When the status reads “Saved”, the payload satisfied validation and
                  is stored locally without modification. Use this state to confirm
                  your sanitizer preserved the intended characters.
                </p>
              </article>
              <article
                className={`rounded-xl border border-[color:color-mix(in_srgb,var(--kali-blue),#ff4d6d_45%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,rgba(255,77,109,0.2))] p-4 text-[color:var(--kali-text)] transition ${
                  isUnsafeStatus
                    ? 'shadow-[0_0_0_1px_color-mix(in_srgb,var(--kali-blue),#ff4d6d_45%)]'
                    : 'opacity-70'
                }`}
              >
                <h3 className="font-semibold">Unsafe outcome</h3>
                <p className="mt-2 text-[color:color-mix(in_srgb,var(--kali-text)_88%,transparent)]">
                  Error states indicate the payload failed validation. Treat the
                  input as unsafe and iterate on your sanitizer or payload until the
                  status returns to a safe state.
                </p>
              </article>
            </div>
          </section>
          <section className="flex flex-col rounded-2xl border border-white/10 bg-kali-background/70 p-6 text-[color:var(--kali-text)] shadow-inner shadow-black/40 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[color:color-mix(in_srgb,var(--kali-text)_88%,transparent)]">
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Rendered preview
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoggingPaused((prev) => !prev)}
                  className="rounded-lg border border-white/10 bg-kali-panel px-3 py-1 text-sm font-medium text-[color:var(--kali-text)] transition hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                  aria-pressed={isLoggingPaused}
                >
                  {isLoggingPaused ? 'Resume logging' : 'Pause logging'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEventLog([]);
                    setEventFilter('all');
                  }}
                  className="rounded-lg border border-white/10 bg-kali-panel px-3 py-1 text-sm font-medium text-[color:var(--kali-text)] transition hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={eventLog.length === 0}
                >
                  Clear log
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isExportDisabled) {
                      exportLog();
                    }
                  }}
                  className="rounded-lg border border-white/10 bg-kali-control px-3 py-1 text-sm font-medium text-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isExportDisabled}
                >
                  Export JSON
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_88%,transparent)] sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-kali-surface/70 px-3 py-2">
                Total events: <span className="font-semibold text-kali-control">{eventLog.length}</span>
              </div>
              <div className="rounded-lg border border-white/10 bg-kali-surface/70 px-3 py-2">
                Composition / Caret / Keydown: <span className="font-semibold text-kali-control">{compositionEvents} / {caretEvents} / {keyboardEvents}</span>
              </div>
              <div className="rounded-lg border border-white/10 bg-kali-surface/70 px-3 py-2 sm:col-span-2">
                Last event: <span className="font-semibold text-kali-control">{latestEvent ? `${latestEvent.type} @ ${new Date(latestEvent.time).toLocaleTimeString()}` : 'No events yet'}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <label htmlFor="input-lab-event-filter" className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_82%,transparent)]">
                Filter events
              </label>
              <select
                id="input-lab-event-filter"
                value={eventFilter}
                onChange={(event) => setEventFilter(event.target.value)}
                className="rounded-lg border border-white/10 bg-kali-panel px-2 py-1 text-sm text-[color:var(--kali-text)] focus:border-kali-control focus:outline-none focus:ring-2 focus:ring-kali-control/40"
              >
                <option value="all">All events</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <pre className="mt-4 max-h-64 flex-1 overflow-y-auto rounded-lg border border-[color:color-mix(in_srgb,var(--kali-terminal-green),transparent_80%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,var(--kali-terminal-green)_12%)] p-4 text-xs text-[color:var(--kali-terminal-text)] shadow-inner shadow-black/40">
              <code className="block whitespace-pre-wrap font-mono text-[color:var(--kali-terminal-green)]">
                {isExportDisabled
                  ? 'Interact with the input field to begin logging events.'
                  : JSON.stringify(visibleEvents, null, 2)}
              </code>
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
