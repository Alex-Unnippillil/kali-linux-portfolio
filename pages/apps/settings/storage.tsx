'use client';

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import {
  DEFAULT_RETENTION_DAYS,
  getRetentionDays,
  setRetentionDays,
} from '../../../utils/files/trash';

const MIN_DAYS = 1;
const MAX_DAYS = 365;

const clampDays = (value: number) =>
  Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.round(value)));

export default function StorageSettingsPage() {
  const [draft, setDraft] = useState(DEFAULT_RETENTION_DAYS);
  const [saved, setSaved] = useState(DEFAULT_RETENTION_DAYS);

  useEffect(() => {
    const current = getRetentionDays();
    setDraft(current);
    setSaved(current);
  }, []);

  const apply = (value: number) => {
    const clamped = clampDays(value);
    setRetentionDays(clamped);
    window.dispatchEvent(new Event('trash-retention-change'));
    setDraft(clamped);
    setSaved(clamped);
  };

  const handleSlider = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10);
    setDraft(clampDays(value));
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10);
    setDraft(Number.isNaN(value) ? draft : clampDays(value));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    apply(draft);
  };

  const reset = () => apply(DEFAULT_RETENTION_DAYS);

  return (
    <div className="w-full h-full overflow-auto bg-ub-cool-grey text-white p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Storage &amp; Trash</h1>
        <p className="text-sm text-gray-300">
          Control how long trashed windows and files are kept before automatic cleanup.
        </p>
      </header>

      <section className="rounded border border-black border-opacity-30 bg-black bg-opacity-20 p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Retention policy</h2>
          <p className="text-xs text-gray-300">
            Items stay in Trash for the selected number of days before being purged. Undo history
            follows the same schedule.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={MIN_DAYS}
              max={MAX_DAYS}
              value={draft}
              onChange={handleSlider}
              className="ubuntu-slider flex-1"
              aria-label="Trash retention in days"
            />
            <input
              type="number"
              min={MIN_DAYS}
              max={MAX_DAYS}
              value={draft}
              onChange={handleInput}
              className="w-20 rounded bg-black bg-opacity-30 p-2 text-right"
              aria-label="Trash retention days"
            />
            <span className="text-sm text-gray-300">days</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-300">
            <span>Min {MIN_DAYS} day</span>
            <span>•</span>
            <span>Max {MAX_DAYS} days</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-ub-orange text-white hover:bg-ub-orange/80 focus:outline-none focus:ring-2 focus:ring-ub-orange"
            >
              Save retention
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded border border-ub-orange text-ub-orange hover:bg-ub-orange/20 focus:outline-none focus:ring-2 focus:ring-ub-orange"
            >
              Reset to {DEFAULT_RETENTION_DAYS} days
            </button>
            {draft !== saved && (
              <span className="text-xs text-yellow-300">Unsaved changes</span>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-2 text-sm text-gray-300">
        <p>
          Emptying Trash manually always removes items immediately, but you can undo the last empty
          from the Trash history panel. Automatic purges also respect this retention window, so
          keeping a longer history may reserve more local storage.
        </p>
        <p>
          Retention applies to both desktop windows and virtual files. Restored items return to their
          original folders when metadata is available.
        </p>
      </section>
    </div>
  );
}
