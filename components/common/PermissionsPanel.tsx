import React from 'react';
import usePermissions, {
  PermissionDetail,
  PermissionStateValue,
} from '../../hooks/usePermissions';

const STATUS_LABELS: Record<PermissionStateValue, string> = {
  granted: 'Granted',
  denied: 'Blocked',
  prompt: 'Prompt',
  unknown: 'Unknown',
};

const STATUS_CLASSES: Record<PermissionStateValue, string> = {
  granted: 'bg-emerald-500/80 text-emerald-100',
  denied: 'bg-red-600/80 text-red-100',
  prompt: 'bg-amber-500/80 text-amber-100',
  unknown: 'bg-slate-600/80 text-slate-200',
};

const ActionButton: React.FC<{
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ disabled, busy, onClick, children }) => (
  <button
    type="button"
    className="px-3 py-1 rounded bg-ubt-blue text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed"
    disabled={disabled || busy}
    onClick={() => {
      if (!disabled && !busy) onClick();
    }}
  >
    {busy ? 'Working…' : children}
  </button>
);

const PermissionCard: React.FC<{ permission: PermissionDetail }> = ({ permission }) => {
  const status = permission.supported ? permission.state : 'unknown';
  const statusLabel = STATUS_LABELS[status];
  const statusClass = STATUS_CLASSES[status];

  const unsupportedMessage =
    'This browser does not expose the necessary APIs. Buttons are disabled to avoid inconsistent behaviour.';

  return (
    <li className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-3" data-permission={permission.key}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{permission.label}</h3>
          <p className="text-sm text-slate-200/80 max-w-xl">{permission.description}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      <p className="text-xs text-slate-200/80">
        {permission.supported ? 'Need details?' : unsupportedMessage}{' '}
        <a
          href={permission.docUrl}
          target="_blank"
          rel="noreferrer"
          className="text-ubt-blue underline"
        >
          Read the docs
        </a>
      </p>
      <div className="flex flex-wrap gap-2">
        <ActionButton
          disabled={!permission.canRequest || !permission.supported}
          busy={permission.requesting}
          onClick={() => {
            void permission.request();
          }}
        >
          Request access
        </ActionButton>
        <ActionButton
          disabled={!permission.canRevoke || !permission.supported}
          busy={permission.revoking}
          onClick={() => {
            void permission.revoke();
          }}
        >
          Revoke
        </ActionButton>
      </div>
      {permission.error ? <p className="text-xs text-red-300">{permission.error}</p> : null}
    </li>
  );
};

const PermissionsPanel: React.FC = () => {
  const { permissions } = usePermissions();

  return (
    <section
      aria-labelledby="permissions-panel-heading"
      className="space-y-4 rounded-xl border border-white/10 bg-ub-grey p-5 text-white"
    >
      <div className="space-y-2">
        <h2 id="permissions-panel-heading" className="text-lg font-semibold">
          Device permissions
        </h2>
        <p className="text-sm text-slate-100/80">
          Check browser support, view current permission states, and quickly toggle access for hardware integrations. We send a
          desktop-style notification whenever states change so you have an audit trail.
        </p>
      </div>
      <ul className="space-y-4">
        {permissions.map(permission => (
          <PermissionCard key={permission.key} permission={permission} />
        ))}
      </ul>
    </section>
  );
};

export default PermissionsPanel;
