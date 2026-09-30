import React, { useCallback, useMemo, useState } from 'react';
import Toast from './ui/Toast';

interface TerminalOutputProps {
  text: string;
  ariaLabel?: string;
  copyButtonLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  unsupportedMessage?: string;
}

const DEFAULT_COPY_LABEL = 'Copy output';
const DEFAULT_SUCCESS_MESSAGE = 'Copied to clipboard';
const DEFAULT_ERROR_MESSAGE = 'Unable to copy to clipboard.';
const DEFAULT_UNSUPPORTED_MESSAGE =
  'Clipboard copy is unavailable in this browser.';

export default function TerminalOutput({
  text,
  ariaLabel,
  copyButtonLabel = DEFAULT_COPY_LABEL,
  successMessage = DEFAULT_SUCCESS_MESSAGE,
  errorMessage = DEFAULT_ERROR_MESSAGE,
  unsupportedMessage = DEFAULT_UNSUPPORTED_MESSAGE,
}: TerminalOutputProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const normalizedText = useMemo(() => text?.trimEnd() ?? '', [text]);

  const closeToast = useCallback(() => setToastMessage(null), []);

  const handleCopy = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setToastMessage(unsupportedMessage);
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedText);
      setToastMessage(successMessage);
    } catch {
      setToastMessage(errorMessage);
    }
  }, [errorMessage, normalizedText, successMessage, unsupportedMessage]);

  return (
    <div className="relative" aria-live="polite">
      <div
        className="bg-black text-green-400 font-mono text-xs p-2 rounded"
        aria-label={ariaLabel}
      >
        <pre className="whitespace-pre-wrap break-words m-0">{normalizedText}</pre>
      </div>
      <button
        type="button"
        className="absolute top-2 right-2 rounded bg-ub-grey px-2 py-1 text-[11px] uppercase tracking-wide text-white hover:bg-ubt-grey focus:outline-none focus:ring-2 focus:ring-yellow-400"
        onClick={handleCopy}
        aria-label={copyButtonLabel}
      >
        {copyButtonLabel}
      </button>
      {toastMessage && (
        <Toast message={toastMessage} onClose={closeToast} />
      )}
    </div>
  );
}
