import React, { useEffect, useId, useRef, useState } from 'react';

interface TerminalOutputProps {
  text: string;
  ariaLabel?: string;
  className?: string;
}

const SR_MODE_STORAGE_KEY = 'terminal-output-sr-mode';
const BATCH_DELAY = 400;
const FOCUS_MESSAGE =
  'Screen reader mode is on. New terminal output will be announced as grouped updates.';

export default function TerminalOutput({
  text,
  ariaLabel,
  className = '',
}: TerminalOutputProps) {
  const instructionsId = useId();
  const [showInstructions, setShowInstructions] = useState(false);
  const [srEnabled, setSrEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SR_MODE_STORAGE_KEY) === 'on';
  });
  const [liveMessage, setLiveMessage] = useState('');
  const previousTextRef = useRef(text);
  const pendingAnnouncementRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lines = React.useMemo(() => text.split('\n'), [text]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SR_MODE_STORAGE_KEY, srEnabled ? 'on' : 'off');
  }, [srEnabled]);

  useEffect(() => {
    const prevText = previousTextRef.current;

    if (!srEnabled) {
      previousTextRef.current = text;
      pendingAnnouncementRef.current = '';
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      setLiveMessage('');
      return;
    }

    let delta = '';
    if (text.length >= prevText.length && text.startsWith(prevText)) {
      delta = text.slice(prevText.length);
    } else {
      delta = text;
    }

    previousTextRef.current = text;

    const cleanedDelta = delta
      .split('\n')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join('\n');

    if (!cleanedDelta) {
      return;
    }

    if (pendingAnnouncementRef.current) {
      pendingAnnouncementRef.current += '\n';
    }
    pendingAnnouncementRef.current += cleanedDelta;

    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        setLiveMessage((prev) => {
          const nextMessage = pendingAnnouncementRef.current;
          pendingAnnouncementRef.current = '';
          flushTimerRef.current = null;
          if (!nextMessage) return prev;
          return nextMessage;
        });
      }, BATCH_DELAY);
    }
  }, [text, srEnabled]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  const copyLine = async (line: string) => {
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      // ignore
    }
  };

  const handleFocus = () => {
    if (!srEnabled) return;
    setLiveMessage((prev) => {
      if (prev.startsWith(FOCUS_MESSAGE)) {
        return `${FOCUS_MESSAGE} `;
      }
      return FOCUS_MESSAGE;
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-green-200">
        <button
          type="button"
          onClick={() => setShowInstructions((value) => !value)}
          className="rounded border border-green-500 px-2 py-1 text-xs text-green-100 hover:bg-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-400"
          aria-expanded={showInstructions}
          aria-controls={instructionsId}
        >
          {showInstructions ? 'Hide screen reader help' : 'Show screen reader help'}
        </button>
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            className="h-3 w-3 accent-green-500"
            checked={srEnabled}
            onChange={(event) => setSrEnabled(event.target.checked)}
          />
          <span>Enable screen reader announcements</span>
        </label>
      </div>
      {showInstructions && (
        <div
          id={instructionsId}
          className="rounded border border-green-600 bg-black/60 p-2 text-[11px] text-green-100"
        >
          <p className="mb-1">
            Enable the announcements toggle to hear batched terminal updates. Focus this
            area with Tab or by clicking so your screen reader receives new output.
          </p>
          <p className="mb-0">
            Use the copy button after each line to copy command output without leaving the
            terminal window.
          </p>
        </div>
      )}
      <div
        className="bg-black text-green-400 font-mono text-xs p-2 rounded"
        aria-label={ariaLabel}
        aria-describedby={showInstructions ? instructionsId : undefined}
        tabIndex={0}
        onFocus={handleFocus}
      >
        {lines.map((line, idx) => (
          <div key={`${idx}-${line}`} className="flex items-start">
            <span className="flex-1 whitespace-pre-wrap">{line}</span>
            <button
              className="ml-2 text-gray-400 hover:text-white focus:text-white focus:outline-none"
              onClick={() => copyLine(line)}
              aria-label={`Copy line ${idx + 1}`}
              type="button"
            >
              📋
            </button>
          </div>
        ))}
        <div role="status" aria-live="polite" className="sr-only">
          {liveMessage}
        </div>
      </div>
    </div>
  );
}
