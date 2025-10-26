import React, { useCallback, useMemo, useState } from 'react';
import Modal from '../../base/Modal';
import { copyToClipboard } from '../../../utils/clipboard';

export interface CrashSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  crashId: string;
  title?: string;
}

const useCopyState = () => {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const trigger = useCallback(async (value: string) => {
    const success = await copyToClipboard(value);
    setStatus(success ? 'copied' : 'error');
    setTimeout(() => setStatus('idle'), 2000);
    return success;
  }, []);

  return { status, trigger } as const;
};

const CrashSummary: React.FC<CrashSummaryProps> = ({
  isOpen,
  onClose,
  summary,
  crashId,
  title = 'Crash report ready',
}) => {
  const summaryCopy = useCopyState();
  const idCopy = useCopyState();

  const combined = useMemo(
    () => `Crash ID: ${crashId}\n\n${summary}`.trim(),
    [crashId, summary],
  );

  const handleCopySummary = useCallback(() => summaryCopy.trigger(combined), [combined, summaryCopy]);
  const handleCopyId = useCallback(() => idCopy.trigger(crashId), [crashId, idCopy]);

  const renderCopyHint = (status: 'idle' | 'copied' | 'error') => {
    if (status === 'copied') return <span className="text-green-400 text-sm" role="status">Copied</span>;
    if (status === 'error') return <span className="text-red-400 text-sm" role="status">Copy failed</span>;
    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/60"
          aria-hidden="true"
          onClick={onClose}
        />
        <div className="relative z-10 max-w-2xl w-full mx-4 rounded-lg bg-gray-900 text-gray-100 shadow-xl">
          <div className="flex items-start justify-between border-b border-gray-700 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold" id="crash-summary-heading">{title}</h2>
              <p className="text-sm text-gray-300">Share the crash ID and summary with the maintainer.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-300 hover:text-white focus:outline-none"
              aria-label="Close crash summary dialog"
            >
              ✕
            </button>
          </div>
          <div className="px-5 py-4 space-y-4" aria-labelledby="crash-summary-heading">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Crash ID</h3>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="flex-1 rounded bg-gray-800 px-3 py-2 text-sm break-words">{crashId}</code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium"
                >
                  Copy ID
                </button>
                {renderCopyHint(idCopy.status)}
              </div>
            </section>
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Summary</h3>
              <div className="mt-2 rounded border border-gray-700 bg-gray-800/70 max-h-72 overflow-y-auto">
                <pre className="whitespace-pre-wrap break-words px-3 py-2 text-sm text-gray-100">
                  {summary}
                </pre>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium"
                >
                  Copy summary
                </button>
                {renderCopyHint(summaryCopy.status)}
              </div>
            </section>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-700 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CrashSummary;
