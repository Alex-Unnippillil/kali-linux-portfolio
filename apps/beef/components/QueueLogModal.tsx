'use client';

import React from 'react';
import type { QueueItem } from '../state/queueStore';

interface QueueLogModalProps {
  item: QueueItem;
  onClose: () => void;
}

const formatTimestamp = (value: number) => {
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return `${value}`;
  }
};

export default function QueueLogModal({ item, onClose }: QueueLogModalProps) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Failure details for ${item.command}`}
        className="w-[min(32rem,90vw)] rounded border border-gray-700 bg-ub-cool-grey shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-lg font-semibold">Failure log</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-gray-300 transition hover:bg-black/30 hover:text-white"
          >
            Close
          </button>
        </header>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 text-sm">
          {item.failures.length === 0 ? (
            <p className="text-gray-300">No failures recorded for this command.</p>
          ) : (
            <ul className="space-y-3">
              {item.failures.map((failure) => (
                <li
                  key={failure.id}
                  className="rounded border border-gray-700 bg-black/30 p-3"
                >
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Attempt {failure.attempt}</span>
                    <span>{formatTimestamp(failure.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-gray-100">{failure.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
