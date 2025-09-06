"use client";

import { useShares, toggleShare } from '../../hooks/useShares';

export default function ShareSettings() {
  const shares = useShares();
  return (
    <div className="p-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <h1 className="text-lg font-bold mb-4">Shared Folders</h1>
      {shares.length === 0 ? (
        <p>No shared folders</p>
      ) : (
        <ul className="space-y-2">
          {shares.map((p) => (
            <li key={p} className="flex items-center">
              <span className="flex-1">{p}</span>
              <button
                type="button"
                className="text-ubt-blue underline"
                onClick={() => toggleShare(p)}
              >
                Unshare
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
