import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TerminalOutput from './TerminalOutput';
import { copyToClipboard } from '../utils/clipboard';

interface BuilderProps {
  doc: string;
  build: (params: Record<string, string>) => string;
}

type BuilderField = 'target' | 'opts';

export default function CommandBuilder({ doc, build }: BuilderProps) {
  const [params, setParams] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<BuilderField | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        window.clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  const showFeedback = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setFeedback({ message, tone });
    if (feedbackTimer.current) {
      window.clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = window.setTimeout(() => {
      setFeedback(null);
    }, 3000);
  }, []);

  const update = useCallback(
    (key: BuilderField) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setParams(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const command = build(params);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(command);
    showFeedback(ok ? 'Command copied to clipboard.' : 'Copy failed. Please try again.', ok ? 'success' : 'error');
  }, [command, showFeedback]);

  const handlePaste = useCallback(async () => {
    if (!focusedField) {
      showFeedback('Select a field before pasting.', 'error');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.readText) {
      showFeedback('Clipboard paste is not supported in this browser.', 'error');
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      setParams(prev => ({ ...prev, [focusedField]: text }));
      const label = focusedField === 'target' ? 'Target' : 'Options';
      showFeedback(`Pasted into ${label}.`);
    } catch {
      showFeedback('Paste failed. Please try again.', 'error');
    }
  }, [focusedField, showFeedback]);

  const commandSegments = useMemo(() => {
    return command
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }, [command]);

  const segmentClass = useCallback((segment: string) => {
    const base = 'px-2 py-1 rounded border font-mono text-xs';
    if (segment === '|' || segment === '||' || segment === '&&') {
      return `${base} bg-black text-yellow-300 border-yellow-600`;
    }
    if (segment.startsWith('-')) {
      return `${base} bg-blue-900 text-blue-200 border-blue-500`;
    }
    return `${base} bg-gray-800 text-white border-gray-600`;
  }, []);

  return (
    <form className="text-xs" onSubmit={(e) => e.preventDefault()} aria-label="command builder">
      <p className="mb-2" aria-label="inline docs">{doc}</p>
      <label className="block mb-1">
        <span className="mr-1">Target</span>
        <input
          aria-label="target"
          value={params.target || ''}
          onChange={update('target')}
          onFocus={() => setFocusedField('target')}
          onBlur={() => setFocusedField(prev => (prev === 'target' ? null : prev))}
          className="border p-1 text-black w-full font-mono"
        />
      </label>
      <label className="block mb-1">
        <span className="mr-1">Options</span>
        <input
          aria-label="options"
          value={params.opts || ''}
          onChange={update('opts')}
          onFocus={() => setFocusedField('opts')}
          onBlur={() => setFocusedField(prev => (prev === 'opts' ? null : prev))}
          className="border p-1 text-black w-full font-mono"
        />
      </label>
      <div className="mt-2">
        <div className="mb-2" aria-label="command preview">
          <div className="flex flex-wrap items-center gap-2">
            {commandSegments.length > 0 ? (
              commandSegments.map((segment, index) => (
                <div key={`${segment}-${index}`} className="flex items-center gap-2">
                  <span className={segmentClass(segment)}>{segment}</span>
                  {index < commandSegments.length - 1 && (
                    <span className="text-gray-500" aria-hidden="true">
                      ·
                    </span>
                  )}
                </div>
              ))
            ) : (
              <span className="text-gray-400">Command will appear here.</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-1 rounded bg-ub-yellow text-black font-semibold"
            aria-label="Copy command"
          >
            Copy Command
          </button>
          <button
            type="button"
            onClick={handlePaste}
            className="px-2 py-1 rounded bg-ub-cool-grey text-white"
            aria-label={
              focusedField ? `Paste clipboard contents into the ${focusedField === 'target' ? 'target' : 'options'} field` : 'Paste clipboard contents into the selected field'
            }
          >
            Paste into Field
          </button>
        </div>
        <TerminalOutput text={command} ariaLabel="command output" />
        <div aria-live="polite" className="mt-1 min-h-[1rem]">
          {feedback && (
            <p
              className={`text-xs ${feedback.tone === 'success' ? 'text-green-300' : 'text-red-400'}`}
              role="status"
            >
              {feedback.message}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

