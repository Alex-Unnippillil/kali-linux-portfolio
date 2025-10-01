import { ReactNode, useEffect, useState } from 'react';
import { PermissionType, PermissionDecision } from '../../types/permissions';
import type { PermissionPromptReason } from '../../hooks/usePermissionPrompt';

interface PermissionPromptProps {
  open: boolean;
  permissionType: PermissionType;
  title: string;
  summary: string;
  reasons: PermissionPromptReason[];
  preview?: ReactNode;
  confirmLabel?: string;
  declineLabel?: string;
  onDecision: (decision: PermissionDecision, remember: boolean) => void;
}

const friendlyPermissionName: Record<PermissionType, string> = {
  'clipboard-read': 'Clipboard access',
  'clipboard-write': 'Clipboard write access',
  bluetooth: 'Bluetooth access',
  notifications: 'Notifications',
};

const PermissionPrompt = ({
  open,
  permissionType,
  title,
  summary,
  reasons,
  preview,
  confirmLabel = 'Allow access',
  declineLabel = 'Not now',
  onDecision,
}: PermissionPromptProps) => {
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (open) {
      setRemember(false);
    }
  }, [open]);

  if (!open) return null;

  const friendly = friendlyPermissionName[permissionType];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${friendly} permission prompt`}
        className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {friendly}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Dismiss permission prompt"
            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-800 hover:text-white"
            onClick={() => onDecision('denied', false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-200">{summary}</p>
        {preview && (
          <div className="mt-4 rounded-md border border-gray-700 bg-black/40 p-3 text-sm text-gray-200">
            {preview}
          </div>
        )}
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Why we need this
          </h3>
          <ul className="mt-2 space-y-3 text-sm">
            {reasons.map((reason, index) => (
              <li key={`${reason.title}-${index}`} className="rounded bg-gray-800/60 p-3">
                <p className="font-medium text-white">{reason.title}</p>
                <p className="mt-1 text-gray-300">{reason.description}</p>
              </li>
            ))}
          </ul>
        </div>
        <label className="mt-5 flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
            aria-label="Remember this choice"
          />
          Remember this choice
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
            onClick={() => onDecision('denied', remember)}
          >
            {declineLabel}
          </button>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            onClick={() => onDecision('granted', remember)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionPrompt;
