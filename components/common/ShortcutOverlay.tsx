'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';

const formatEvent = (e: KeyboardEvent) => {
  const parts = [
    e.ctrlKey ? 'Ctrl' : '',
    e.altKey ? 'Alt' : '',
    e.shiftKey ? 'Shift' : '',
    e.metaKey ? 'Meta' : '',
    e.key.length === 1 ? e.key.toUpperCase() : e.key,
  ];
  return parts.filter(Boolean).join('+');
};

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

const ShortcutOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { shortcuts } = useKeymap();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const showFeedback = useCallback((type: Feedback['type'], message: string) => {
    setFeedback({ type, message });
    if (feedbackTimeout.current) {
      clearTimeout(feedbackTimeout.current);
    }
    feedbackTimeout.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimeout.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable;
      if (isInput) return;
      const show =
        shortcuts.find((s) => s.description === 'Show keyboard shortcuts')?.keys ||
        '?';
      if (formatEvent(e) === show) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, toggle, shortcuts]);

  useEffect(() => () => {
    if (feedbackTimeout.current) {
      clearTimeout(feedbackTimeout.current);
    }
  }, []);

  const filteredShortcuts = shortcuts;

  const handleExport = () => {
    const data = JSON.stringify(filteredShortcuts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCsv = useCallback(async () => {
    const rows = [
      ['Description', 'Keys'],
      ...filteredShortcuts.map((shortcut) => [
        shortcut.description,
        shortcut.keys,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const copyWithClipboardApi = async () => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== 'function'
      ) {
        return false;
      }

      await navigator.clipboard.writeText(csv);
      return true;
    };

    const copyWithExecCommand = () => {
      if (typeof document === 'undefined') {
        throw new Error('Clipboard API unavailable');
      }

      const textarea = document.createElement('textarea');
      textarea.value = csv;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);

      const selection = document.getSelection();
      const originalRange =
        selection && selection.rangeCount > 0
          ? selection.getRangeAt(0)
          : null;

      textarea.focus();
      textarea.select();

      let successful = false;

      try {
        successful = document.execCommand('copy');
      } finally {
        if (originalRange && selection) {
          selection.removeAllRanges();
          selection.addRange(originalRange);
        }
        document.body.removeChild(textarea);
      }

      if (!successful) {
        throw new Error('execCommand copy failed');
      }
    };

    try {
      const copied = await copyWithClipboardApi();
      if (!copied) {
        copyWithExecCommand();
      }
      const count = filteredShortcuts.length;
      const plural = count === 1 ? '' : 's';
      showFeedback('success', `Copied ${count} shortcut${plural} to clipboard.`);
    } catch (error) {
      showFeedback('error', 'Failed to copy shortcuts to clipboard.');
    }
  }, [filteredShortcuts, showFeedback]);

  if (!open) return null;

  const keyCounts = shortcuts.reduce<Map<string, number>>((map, s) => {
    map.set(s.keys, (map.get(s.keys) || 0) + 1);
    return map;
  }, new Map());
  const conflicts = new Set(
    Array.from(keyCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4 overflow-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-lg w-full space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm underline"
          >
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-2 py-1 bg-gray-700 rounded text-sm"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCopyCsv();
            }}
            className="px-2 py-1 bg-gray-700 rounded text-sm"
          >
            Copy as CSV
          </button>
        </div>
        {feedback && (
          <p
            role="status"
            aria-live="polite"
            className={
              feedback.type === 'success'
                ? 'text-sm text-green-300'
                : 'text-sm text-red-300'
            }
          >
            {feedback.message}
          </p>
        )}
        <ul className="space-y-1">
          {filteredShortcuts.map((s, i) => (
            <li
              key={i}
              data-conflict={conflicts.has(s.keys) ? 'true' : 'false'}
              className={
                conflicts.has(s.keys)
                  ? 'flex justify-between bg-red-600/70 px-2 py-1 rounded'
                  : 'flex justify-between px-2 py-1'
              }
            >
              <span className="font-mono mr-4">{s.keys}</span>
              <span className="flex-1">{s.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ShortcutOverlay;
