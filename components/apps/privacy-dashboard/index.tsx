import React, { useEffect, useMemo, useState } from 'react';
import {
  PassAuditEntry,
  clearAuditLog,
  getAuditLog,
  subscribeToAuditLog,
} from '../../../utils/passClient';

const formatTimestamp = (value: number) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return new Date(value).toString();
  }
};

const PrivacyDashboard: React.FC = () => {
  const [entries, setEntries] = useState<PassAuditEntry[]>([]);

  useEffect(() => {
    setEntries(getAuditLog());
    const unsubscribe = subscribeToAuditLog((log) => setEntries(log));
    return unsubscribe;
  }, []);

  const hasEntries = entries.length > 0;
  const entryCountLabel = useMemo(
    () => `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`,
    [entries.length],
  );

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto bg-ub-cool-grey p-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Autofill audit log</h1>
          <p className="text-sm text-gray-200">
            Review every time a stored credential was inserted into another app. Entries are kept
            locally in your browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => clearAuditLog()}
          disabled={!hasEntries}
          className="rounded border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500"
        >
          Clear log
        </button>
      </header>

      <section className="rounded border border-gray-700 bg-gray-900 p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-gray-300">
          <span>
            Keyboard shortcuts: <kbd className="rounded bg-gray-800 px-1">Ctrl</kbd> +{' '}
            <kbd className="rounded bg-gray-800 px-1">Shift</kbd> +{' '}
            <kbd className="rounded bg-gray-800 px-1">U</kbd> for usernames,{' '}
            <kbd className="rounded bg-gray-800 px-1">P</kbd> for passwords.
          </span>
          <span>{entryCountLabel}</span>
        </div>
      </section>

      {!hasEntries ? (
        <p className="rounded border border-gray-700 bg-gray-900 p-6 text-sm text-gray-200">
          No autofill activity has been recorded yet. Approve a request from the browser or
          terminal to populate this log.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-800 text-xs uppercase tracking-wide text-gray-300">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Time
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Credential
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Field
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Destination
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-gray-200">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="block font-medium text-white">{entry.itemLabel}</span>
                    <span className="block text-xs text-gray-400">{entry.itemId}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-200">
                    {entry.secretField}
                  </td>
                  <td className="px-3 py-2">
                    <span className="block text-white">{entry.targetAppId}</span>
                    {entry.targetLabel ? (
                      <span className="block text-xs text-gray-400">{entry.targetLabel}</span>
                    ) : null}
                    <span className="block text-xs text-gray-500">{entry.targetField}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PrivacyDashboard;
export const displayPrivacyDashboard = () => <PrivacyDashboard />;

