import React from 'react';
import {
  getPermissionDetails,
  type PermissionKind,
  type PermissionState,
} from '../../utils/permissionHandler';

interface PermissionDialogProps {
  appTitle: string;
  appIcon?: string;
  requirements: PermissionKind[];
  statuses: Record<PermissionKind, PermissionState>;
  busy?: boolean;
  error?: string | null;
  onGrant: () => void;
  onCancel: () => void;
  onContinue?: () => void;
}

const statusCopy: Record<PermissionState, { label: string; className: string }> = {
  granted: {
    label: 'Granted',
    className: 'text-green-400',
  },
  prompt: {
    label: 'Needs approval',
    className: 'text-yellow-300',
  },
  denied: {
    label: 'Blocked',
    className: 'text-red-400',
  },
  unsupported: {
    label: 'Unsupported',
    className: 'text-red-300',
  },
};

const PermissionDialog: React.FC<PermissionDialogProps> = ({
  appTitle,
  appIcon,
  requirements,
  statuses,
  busy = false,
  error,
  onGrant,
  onCancel,
  onContinue,
}) => {
  const showContinue = typeof onContinue === 'function';
  const disableGrant =
    busy || requirements.every((kind) => statuses[kind] === 'unsupported');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="permission-dialog-title"
        className="w-full max-w-lg rounded-lg bg-ub-cool-grey text-white shadow-xl border border-black/40"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          {appIcon && (
            <img src={appIcon} alt="" className="h-10 w-10 rounded" aria-hidden="true" />
          )}
          <div>
            <h2 id="permission-dialog-title" className="text-lg font-semibold">
              {appTitle} needs your permission
            </h2>
            <p className="text-sm text-white/70">
              Enable the following capabilities to unlock the full experience.
            </p>
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto px-5 py-4 space-y-3">
          <ul className="space-y-3">
            {requirements.map((requirement) => {
              const details = getPermissionDetails(requirement);
              const status = statuses[requirement];
              const statusMeta = statusCopy[status];
              return (
                <li
                  key={requirement}
                  className="flex items-start gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2"
                >
                  <div className="flex-1">
                    <p className="font-medium">{details.title}</p>
                    <p className="text-sm text-white/70">{details.description}</p>
                  </div>
                  <span className={`text-sm font-semibold ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </li>
              );
            })}
          </ul>
          {error && (
            <p className="rounded-md border border-red-500/40 bg-red-900/40 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          >
            Not now
          </button>
          {showContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-md border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
            >
              Open anyway
            </button>
          )}
          <button
            type="button"
            onClick={onGrant}
            disabled={disableGrant}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              disableGrant
                ? 'cursor-not-allowed bg-white/10 text-white/40'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {busy ? 'Requesting…' : 'Allow access'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionDialog;
