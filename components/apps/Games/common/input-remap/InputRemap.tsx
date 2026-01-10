import React, { useEffect, useMemo, useState } from 'react';

interface Props {
  mapping: Record<string, string>;
  setKey: (action: string, key: string) => string[] | null;
  actions: Record<string, string>;
  conflictActions?: string[];
}

const InputRemap: React.FC<Props> = ({
  mapping,
  setKey,
  actions,
  conflictActions = [],
}) => {
  const [waiting, setWaiting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const capture = (action: string) => {
    setWaiting(action);
    setMessage(`Listening for new key for ${action}`);
  };

  useEffect(() => {
    if (!waiting) return undefined;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const conflicts = setKey(waiting, e.key) || [];
      if (conflicts.length > 0) {
        setMessage(`Conflict with ${conflicts.join(', ')}`);
      } else {
        setMessage(`Set ${waiting} to ${e.key}`);
      }
      setWaiting(null);
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [waiting, setKey]);

  const conflictSet = useMemo(
    () => new Set(conflictActions),
    [conflictActions],
  );

  return (
    <div className="space-y-3">
      <dl className="space-y-3">
        {Object.keys(actions).map((action) => {
          const hasConflict = conflictSet.has(action);
          const conflictId = hasConflict ? `${action}-conflict` : undefined;
          return (
            <div
              key={action}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <dt className="capitalize text-sm font-medium">
                {action}
                <span className="block text-xs font-normal text-gray-300">
                  Default: {actions[action]}
                </span>
              </dt>
              <dd>
                <button
                  type="button"
                  onClick={() => capture(action)}
                  className={`px-2 py-1 rounded focus:outline-none focus:ring font-mono min-w-[6rem] text-sm ${
                    hasConflict
                      ? 'bg-amber-700/80 ring-2 ring-amber-400'
                      : 'bg-gray-700'
                  }`}
                  aria-describedby={conflictId}
                >
                  {waiting === action ? 'Press key…' : mapping[action] || actions[action]}
                </button>
                {hasConflict && (
                  <p
                    id={conflictId}
                    className="mt-1 text-xs text-amber-300"
                  >
                    Shares a key with another action.
                  </p>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {message && (
        <div className="text-sm text-amber-200" role="status" aria-live="polite">
          {message}
        </div>
      )}
    </div>
  );
};

export default InputRemap;
