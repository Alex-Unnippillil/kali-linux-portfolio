import { useMemo } from 'react';
import { useSettings } from '../../../../hooks/useSettings';

const formatLabel = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase());

const formatValue = (value: unknown): string => {
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (typeof value === 'number') return value.toString();
  return `${value ?? ''}`;
};

export default function SettingsHistoryPage() {
  const { history, undoHistoryEntry } = useSettings();
  const entries = useMemo(() => history.slice(0, 50), [history]);

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <header className="px-6 py-4 border-b border-gray-900">
        <h1 className="text-2xl font-semibold text-white">Settings history</h1>
        <p className="text-ubt-grey text-sm mt-1">
          Review the most recent configuration changes. Undo is available while entries remain active.
        </p>
      </header>
      <section className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <p className="text-ubt-grey text-center mt-8">
            No changes recorded yet. Adjust a setting to see it appear here.
          </p>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="bg-ub-darkgrey/80 border border-gray-900 rounded-md p-4 shadow-inner"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{entry.summary}</p>
                    <p className="text-xs text-ubt-grey">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void undoHistoryEntry(entry.id)}
                    disabled={entry.undone}
                    className={`self-start md:self-auto px-3 py-1 rounded border transition-colors text-sm ${
                      entry.undone
                        ? 'bg-gray-800 text-ubt-grey border-gray-700 cursor-not-allowed'
                        : 'bg-ub-orange text-white border-transparent hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-orange'
                    }`}
                    aria-disabled={entry.undone}
                  >
                    {entry.undone ? 'Undone' : 'Undo change'}
                  </button>
                </div>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm">
                  {Object.entries(entry.changes).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <dt className="text-ubt-grey whitespace-nowrap">
                        {formatLabel(key)}
                      </dt>
                      <dd className="text-white text-right break-all flex-1">
                        {formatValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {entry.undone && (
                  <p className="text-xs text-ubt-grey mt-3">
                    Reverted {entry.undoneAt ? new Date(entry.undoneAt).toLocaleString() : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
