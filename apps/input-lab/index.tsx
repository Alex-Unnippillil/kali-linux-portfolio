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
  const statusTone = isUnsafeStatus
    ? 'critical'
    : isSafeStatus
    ? 'success'
    : 'neutral';
  const shouldPulse = isUnsafeStatus || isSafeStatus;

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
    <>
      <div className="input-lab min-h-screen bg-[var(--kali-bg)] px-4 py-10 text-kali-text">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <section className="input-lab-panel relative overflow-hidden rounded-2xl p-8 shadow-kali-panel">
            <h1 className="text-3xl font-semibold tracking-tight">Input Lab</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_82%,var(--color-muted)_18%)]">
            Observe how browsers report keyboard input, IME composition, and caret
            movement. Every interaction you make with the field below is timestamped
            so you can compare event ordering across devices.
          </p>
          <dl className="mt-6 grid gap-4 text-xs sm:grid-cols-3">
            <div className="input-lab-card rounded-xl p-4">
              <dt className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-control-accent)_80%,var(--color-text)_20%)]">
                caret.start
              </dt>
              <dd className="mt-1 text-[color:color-mix(in_srgb,var(--color-text)_78%,var(--color-muted)_22%)]">
                Selection anchor (cursor) position when the event fired.
              </dd>
            </div>
            <div className="input-lab-card rounded-xl p-4">
              <dt className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-control-accent)_80%,var(--color-text)_20%)]">
                caret.end
              </dt>
              <dd className="mt-1 text-[color:color-mix(in_srgb,var(--color-text)_78%,var(--color-muted)_22%)]">
                Selection focus position; differs from start when text is highlighted.
              </dd>
            </div>
            <div className="input-lab-card rounded-xl p-4">
              <dt className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-control-accent)_80%,var(--color-text)_20%)]">
                caret.extra
              </dt>
              <dd className="mt-1 text-[color:color-mix(in_srgb,var(--color-text)_78%,var(--color-muted)_22%)]">
                Additional metadata such as the trigger key or composition data.
              </dd>
            </div>
          </dl>
        </section>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="input-lab-control-surface flex flex-col gap-5 rounded-2xl p-6 shadow-kali-panel"
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="input-lab-text"
                className="text-sm font-medium tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_86%,var(--color-muted)_14%)]"
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
                className="input-lab-input w-full rounded-lg px-3 py-2 text-base text-kali-text placeholder:text-[color:color-mix(in_srgb,var(--color-text)_35%,var(--color-muted)_65%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                aria-label="Text"
                aria-describedby={error ? 'input-lab-error' : undefined}
              />
              {error && (
                <p
                  id="input-lab-error"
                  className="text-sm font-medium text-[color:color-mix(in_srgb,var(--color-text)_55%,var(--color-control-accent)_45%)]"
                >
                  {error}
                </p>
              )}
            </div>
            <div role="status" aria-live="polite">
              <div
                className={`input-lab-status rounded-xl px-4 py-3 text-sm transition-[background,box-shadow,color] duration-200 ${
                  shouldPulse ? 'kali-pulse' : ''
                }`}
                data-tone={statusTone}
              >
                <p className="font-semibold uppercase tracking-wide">
                  {isUnsafeStatus
                    ? 'Unsafe payload detected'
                    : isSafeStatus
                    ? 'Payload stored safely'
                    : 'Status pending'}
                </p>
                <p className="tone-description mt-1 text-xs">
                  {derivedStatus}
                </p>
              </div>
            </div>
          </form>
          <section
            className="input-lab-control-surface flex flex-col gap-4 rounded-2xl p-6"
            aria-labelledby="input-lab-sanitizer-guidance"
          >
            <h2
              id="input-lab-sanitizer-guidance"
              className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_88%,var(--color-muted)_12%)]"
            >
              Sanitizer guidance
            </h2>
            <p className="text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_80%,var(--color-muted)_20%)]">
              Pair the payload field with your sanitizer of choice and monitor the
              live status callout. Safe states highlight the sanitized result while
              unsafe states flag payloads that need revisions before rendering.
            </p>
            <div className="space-y-3 text-sm">
              <article
                className={`input-lab-card relative overflow-hidden rounded-xl p-4 transition-all ${
                  isSafeStatus ? 'kali-pulse' : ''
                }`}
                data-active={isSafeStatus}
                data-state="success"
              >
                <h3 className="font-semibold tracking-wide">Safe outcome</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_78%,var(--color-muted)_22%)]">
                  When the status reads “Saved”, the payload satisfied validation and
                  is stored locally without modification. Use this state to confirm
                  your sanitizer preserved the intended characters.
                </p>
              </article>
              <article
                className={`input-lab-card relative overflow-hidden rounded-xl p-4 transition-all ${
                  isUnsafeStatus ? 'kali-pulse' : ''
                }`}
                data-active={isUnsafeStatus}
                data-state="critical"
              >
                <h3 className="font-semibold tracking-wide">Unsafe outcome</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_78%,var(--color-muted)_22%)]">
                  Error states indicate the payload failed validation. Treat the
                  input as unsafe and iterate on your sanitizer or payload until the
                  status returns to a safe state.
                </p>
              </article>
            </div>
          </section>
          <section className="input-lab-control-surface flex flex-col rounded-2xl p-6 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[color:color-mix(in_srgb,var(--color-text)_82%,var(--color-muted)_18%)]">
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Rendered preview
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!isExportDisabled) {
                    exportLog();
                  }
                }}
                className="input-lab-action rounded-lg px-3 py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isExportDisabled}
              >
                Export JSON
              </button>
            </div>
            <pre className="input-lab-code mt-4 max-h-64 flex-1 overflow-y-auto rounded-xl p-4 text-xs leading-relaxed">
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
      <style jsx global>{`
        .input-lab-panel {
          background: color-mix(in srgb, var(--kali-panel) 92%, transparent);
          border: 1px solid color-mix(in srgb, var(--kali-panel-border) 80%, transparent);
          box-shadow: 0 24px 48px rgba(3, 10, 18, 0.55);
          backdrop-filter: blur(18px);
        }

        .input-lab-card {
          background: color-mix(in srgb, var(--kali-panel-highlight) 90%, transparent);
          border: 1px solid color-mix(in srgb, var(--kali-panel-border) 65%, transparent);
          color: color-mix(in srgb, var(--color-text) 90%, var(--color-muted) 10%);
        }

        .input-lab-card[data-state='success'] {
          border-color: color-mix(in srgb, var(--color-terminal) 60%, transparent);
          background: color-mix(in srgb, var(--color-terminal) 10%, var(--kali-panel-highlight) 90%);
          color: color-mix(in srgb, var(--color-terminal) 80%, var(--color-text) 20%);
        }

        .input-lab-card[data-state='critical'] {
          border-color: color-mix(in srgb, var(--color-inverse) 35%, var(--color-control-accent) 65%);
          background: color-mix(in srgb, var(--color-inverse) 18%, var(--kali-panel-highlight) 82%);
          color: color-mix(in srgb, var(--color-text) 72%, var(--color-inverse) 28%);
        }

        .input-lab-card[data-active='false'] {
          opacity: 0.72;
        }

        .input-lab-card[data-active='true'] {
          opacity: 1;
        }

        .input-lab-control-surface {
          background: color-mix(in srgb, var(--kali-panel) 96%, transparent);
          border: 1px solid color-mix(in srgb, var(--kali-panel-border) 80%, transparent);
          backdrop-filter: blur(22px);
        }

        .input-lab-input {
          background: color-mix(in srgb, var(--kali-bg-solid) 86%, transparent);
          border: 1px solid color-mix(in srgb, var(--kali-panel-border) 85%, transparent);
          transition: border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease;
        }

        .input-lab-input:focus-visible {
          border-color: color-mix(in srgb, var(--color-control-accent) 85%, transparent);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-control-accent) 35%, transparent);
        }

        .input-lab-status {
          border-inline-start: 4px solid color-mix(in srgb, var(--color-control-accent) 65%, transparent);
          background: color-mix(in srgb, var(--color-control-accent) 14%, var(--kali-panel) 86%);
          color: color-mix(in srgb, var(--color-control-accent) 75%, var(--color-text) 25%);
          box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-control-accent) 18%, transparent);
        }

        .input-lab-status[data-tone='success'] {
          border-inline-start-color: color-mix(in srgb, var(--color-terminal) 70%, transparent);
          background: color-mix(in srgb, var(--color-terminal) 14%, var(--kali-panel) 86%);
          color: color-mix(in srgb, var(--color-terminal) 80%, var(--color-text) 20%);
        }

        .input-lab-status[data-tone='critical'] {
          border-inline-start-color: color-mix(in srgb, var(--color-inverse) 42%, var(--color-control-accent) 58%);
          background: color-mix(in srgb, var(--color-inverse) 22%, var(--kali-panel) 78%);
          color: color-mix(in srgb, var(--color-text) 72%, var(--color-inverse) 28%);
        }

        .input-lab-status .tone-description {
          color: color-mix(in srgb, var(--color-text) 82%, var(--color-muted) 18%);
        }

        .input-lab-code {
          background: color-mix(in srgb, var(--kali-panel) 95%, transparent);
          border: 1px solid color-mix(in srgb, var(--kali-panel-border) 88%, transparent);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
          color: color-mix(in srgb, var(--color-terminal) 65%, var(--color-text) 35%);
        }

        .input-lab-action {
          border: 1px solid color-mix(in srgb, var(--kali-panel-border) 70%, transparent);
          background: color-mix(in srgb, var(--color-control-accent) 22%, var(--kali-panel) 78%);
          color: color-mix(in srgb, var(--color-text) 92%, var(--color-control-accent) 8%);
          transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease,
            box-shadow var(--motion-fast) ease;
        }

        .input-lab-action:hover:not(:disabled),
        .input-lab-action:focus-visible {
          border-color: color-mix(in srgb, var(--color-control-accent) 72%, transparent);
          background: color-mix(in srgb, var(--color-control-accent) 32%, var(--kali-panel) 68%);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-control-accent) 35%, transparent);
        }

        .input-lab-action:disabled {
          color: color-mix(in srgb, var(--color-text) 55%, var(--color-muted) 45%);
        }

        .kali-pulse {
          animation: kaliPulse var(--motion-medium) ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .kali-pulse {
            animation: none !important;
          }
        }

        @keyframes kaliPulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-control-accent) 28%, transparent);
          }

          50% {
            box-shadow: 0 0 0 14px color-mix(in srgb, var(--color-control-accent) 0%, transparent);
          }
        }
      `}</style>
    </>
  );
}

