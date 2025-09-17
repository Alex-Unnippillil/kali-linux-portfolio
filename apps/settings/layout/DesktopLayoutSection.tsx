"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  collectWindowGroups,
  listLayouts,
  removeLayout,
  restoreLayout,
  saveLayout,
  type LayoutRecord,
} from "@/src/wm/persistence";

const formatDate = (timestamp: number) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "Unknown date";
  }
};

const countWindows = (layout: LayoutRecord) =>
  layout.layout.groups.reduce((acc, group) => acc + group.windows.length, 0);

export default function DesktopLayoutSection() {
  const [layouts, setLayouts] = useState<LayoutRecord[]>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLayouts(listLayouts());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStatus(null);
      setError(null);
      if (typeof window === "undefined") {
        setError("Layouts are only available in the browser.");
        return;
      }
      const groups = collectWindowGroups();
      if (!groups.length) {
        setError("Open at least one window to capture a layout.");
        return;
      }
      setIsSaving(true);
      try {
        const record = saveLayout({ name, groups });
        if (!record) {
          setError("Failed to capture layout.");
          return;
        }
        setName("");
        setStatus(`Saved layout "${record.name}" with ${countWindows(record)} window${
          countWindows(record) === 1 ? "" : "s"
        }.`);
        refresh();
      } catch (err) {
        console.error("Failed to save layout", err);
        setError("Unexpected error while saving layout.");
      } finally {
        setIsSaving(false);
      }
    },
    [name, refresh],
  );

  const handleRestore = useCallback(async (layout: LayoutRecord) => {
    if (typeof window === "undefined") return;
    setStatus(null);
    setError(null);
    setRestoringId(layout.id);
    try {
      const restored = await restoreLayout({ layout });
      if (restored) {
        setStatus(`Restored layout "${layout.name}".`);
      } else {
        setError("Unable to restore the selected layout.");
      }
    } catch (err) {
      console.error("Failed to restore layout", err);
      setError("Unexpected error while restoring layout.");
    } finally {
      setRestoringId(null);
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    removeLayout(id);
    setStatus(null);
    setError(null);
    refresh();
  }, [refresh]);

  const sortedLayouts = useMemo(
    () => layouts.slice().sort((a, b) => b.savedAt - a.savedAt),
    [layouts],
  );

  return (
    <section className="flex flex-col gap-6 p-6 text-ubt-grey">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Desktop layouts</h2>
        <p className="text-sm text-gray-300">
          Capture your current arrangement of windows and reopen them later with a single click.
        </p>
      </header>

      <form onSubmit={handleSave} className="flex flex-wrap gap-3 items-center">
        <label htmlFor="layout-name" className="sr-only">
          Layout name
        </label>
        <input
          id="layout-name"
          name="layout-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Pen-test workspace"
          className="min-w-[12rem] flex-1 rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-white focus:border-ub-orange focus:outline-none focus:ring-2 focus:ring-ub-orange"
        />
        <button
          type="submit"
          className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-black transition hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50"
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save layout"}
        </button>
        <button
          type="button"
          onClick={refresh}
          className="rounded border border-ubt-cool-grey px-3 py-2 text-sm text-white transition hover:bg-ub-grey focus:outline-none focus:ring-2 focus:ring-ubt-cool-grey"
        >
          Refresh list
        </button>
      </form>

      {status && (
        <p className="text-sm text-emerald-400" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {sortedLayouts.length === 0 ? (
          <p className="text-sm text-gray-300">
            No saved layouts yet. Arrange a few windows and hit “Save layout” to get started.
          </p>
        ) : (
          sortedLayouts.map((layout) => {
            const windowsLabel = `${countWindows(layout)} window${countWindows(layout) === 1 ? "" : "s"}`;
            return (
              <article
                key={layout.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded border border-ubt-cool-grey bg-ub-grey/20 px-4 py-3"
              >
                <div>
                  <h3 className="text-base font-semibold text-white">{layout.name}</h3>
                  <p className="text-xs text-gray-300">
                    {windowsLabel} • Saved {formatDate(layout.savedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRestore(layout)}
                    disabled={restoringId === layout.id}
                    className="rounded bg-ub-orange px-3 py-2 text-sm font-semibold text-black transition hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50"
                  >
                    {restoringId === layout.id ? "Restoring…" : "Restore"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(layout.id)}
                    className="rounded border border-red-500 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
