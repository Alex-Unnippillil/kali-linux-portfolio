import type { ShortcutEntry } from '../keymapRegistry';

interface ShortcutRowProps {
  shortcut: ShortcutEntry;
  capturing: boolean;
  onStartCapture: () => void;
  onReset: () => void;
}

const ShortcutRow = ({
  shortcut,
  capturing,
  onStartCapture,
  onReset,
}: ShortcutRowProps) => {
  const { action, description, keys, conflict, conflictsWith, isDefault } = shortcut;
  const displayKeys = capturing ? 'Press keys…' : keys || 'Not set';

  return (
    <li
      className={`flex flex-col gap-2 px-3 py-2 text-sm transition-colors sm:flex-row sm:items-center sm:gap-4 ${
        conflict ? 'bg-red-900/30' : ''
      }`}
      data-conflict={conflict ? 'true' : 'false'}
    >
      <div className="flex-1">
        <p className="font-medium">{action}</p>
        {description && (
          <p className="mt-1 text-xs text-ubt-grey" aria-live="polite">
            {description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ubt-grey">
          {conflict && (
            <span className="rounded bg-red-900/60 px-2 py-0.5 text-red-100">
              Conflicts with {conflictsWith.length} other action
              {conflictsWith.length > 1 ? 's' : ''}
            </span>
          )}
          {!isDefault && !conflict && (
            <span className="rounded bg-ub-orange/20 px-2 py-0.5 text-ub-orange">
              Custom
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <code
          className={`rounded border px-2 py-1 font-mono text-xs ${
            capturing
              ? 'border-ub-orange text-ub-orange animate-pulse'
              : 'border-gray-700 text-white'
          }`}
          aria-live={capturing ? 'polite' : undefined}
        >
          {displayKeys}
        </code>
        <button
          type="button"
          onClick={() => {
            if (!capturing) onStartCapture();
          }}
          disabled={capturing}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            capturing
              ? 'cursor-wait bg-ub-orange/40 text-white'
              : 'bg-ub-orange text-white hover:bg-ub-orange/90'
          }`}
        >
          {capturing ? 'Listening…' : 'Rebind'}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={isDefault}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            isDefault
              ? 'cursor-not-allowed bg-gray-700/60 text-gray-400'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          Reset
        </button>
      </div>
    </li>
  );
};

export default ShortcutRow;
