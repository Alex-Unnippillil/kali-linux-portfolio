import React from 'react';
import type { FileSafetyModalProps } from '../hooks/useFileSafetyPrompt';

const backdropClasses =
  'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4';

const panelClasses =
  'w-full max-w-md rounded-lg bg-gray-900 text-white shadow-lg border border-gray-700';

const headerClasses = 'px-4 pt-4 pb-2 text-lg font-semibold';
const bodyClasses = 'px-4 pb-4 text-sm space-y-3';
const footerClasses = 'px-4 pb-4 flex justify-end gap-2';

const listClasses = 'list-disc list-inside space-y-1 text-left';

export default function FileSafetyModal({
  open,
  fileName,
  risk,
  onProceed,
  onCancel,
}: FileSafetyModalProps) {
  if (!open || !risk) return null;

  return (
    <div role="dialog" aria-modal="true" className={backdropClasses}>
      <div className={panelClasses}>
        <div className={headerClasses}>Potentially risky file detected</div>
        <div className={bodyClasses}>
          <p className="font-medium">{fileName || 'Unknown file'}</p>
          <p>
            This file appears to contain executable content. Opening it may run code on your
            device. Only continue if you trust the source.
          </p>
          <div>
            <p className="font-semibold">Why this was flagged</p>
            <ul className={listClasses}>
              {risk.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className={footerClasses}>
          <button
            type="button"
            onClick={onCancel}
            className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-500"
          >
            Proceed anyway
          </button>
        </div>
      </div>
    </div>
  );
}
