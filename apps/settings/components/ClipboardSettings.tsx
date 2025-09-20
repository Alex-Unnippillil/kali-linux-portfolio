"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../../../hooks/useSettings";
import {
  PASTE_MODE_METADATA,
  type PasteMode,
  loadTrackingParameterLists,
  saveTrackingParameterLists,
  resetTrackingParameterLists,
} from "../../../utils/clipboard/sanitize";

const parseList = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const joinList = (values: string[]) => values.join("\n");

const ClipboardSettings = () => {
  const { pasteMode, setPasteMode } = useSettings();
  const [queryList, setQueryList] = useState("");
  const [hashList, setHashList] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const statusTimer = useRef<number | null>(null);

  useEffect(() => {
    const lists = loadTrackingParameterLists();
    setQueryList(joinList(lists.query));
    setHashList(joinList(lists.hash));
  }, []);

  useEffect(() => () => {
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
  }, []);

  const showStatus = (message: string) => {
    setStatus(message);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(null), 3200);
  };

  const handleSave = () => {
    const normalized = saveTrackingParameterLists({
      query: parseList(queryList),
      hash: parseList(hashList),
    });
    setQueryList(joinList(normalized.query));
    setHashList(joinList(normalized.hash));
    showStatus("Tracking filters saved");
  };

  const handleReset = () => {
    const defaults = resetTrackingParameterLists();
    setQueryList(joinList(defaults.query));
    setHashList(joinList(defaults.hash));
    showStatus("Restored defaults");
  };

  const modeOptions = useMemo(
    () => Object.entries(PASTE_MODE_METADATA) as Array<[PasteMode, { label: string; description: string }]>,
    [],
  );

  return (
    <div className="flex h-full flex-col overflow-auto bg-ub-cool-grey text-ubt-grey">
      <header className="border-b border-gray-900 px-6 py-4">
        <h1 className="text-2xl font-semibold text-white">Clipboard &amp; Paste</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-300">
          Choose how paste behaves across the desktop and control which tracking parameters are stripped when cleaning URLs.
        </p>
      </header>
      <main className="flex-1 space-y-8 px-6 py-6">
        <section>
          <h2 className="text-xl font-semibold text-white">Default paste mode</h2>
          <p className="mt-1 text-sm text-gray-300">
            The default applies whenever you press <kbd className="rounded bg-gray-800 px-1 py-0.5 text-xs">Ctrl</kbd>
            +<kbd className="rounded bg-gray-800 px-1 py-0.5 text-xs">V</kbd> or tap the Paste button. Use the paste menu to override it case by case.
          </p>
          <div role="radiogroup" aria-label="Default paste mode" className="mt-4 space-y-3">
            {modeOptions.map(([mode, meta]) => (
              <label
                key={mode}
                className={`flex cursor-pointer items-start gap-3 rounded border border-gray-800 bg-gray-900/70 p-4 transition hover:border-ub-orange ${
                  pasteMode === mode ? "ring-2 ring-ub-orange" : ""
                }`}
              >
                <input
                  type="radio"
                  name="paste-mode"
                  value={mode}
                  checked={pasteMode === mode}
                  onChange={() => setPasteMode(mode)}
                  className="mt-1"
                />
                <div>
                  <div className="text-base font-medium text-white">{meta.label}</div>
                  <p className="mt-1 text-sm text-gray-300">{meta.description}</p>
                </div>
              </label>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-white">Tracking parameter filters</h2>
          <p className="mt-1 text-sm text-gray-300">
            Clean URL removes any query or hash parameters you list here. Add one parameter per line to keep it readable.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              <span className="mb-2 font-semibold text-white">Query parameters</span>
              <textarea
                value={queryList}
                onChange={(event) => setQueryList(event.target.value)}
                spellCheck={false}
                className="min-h-[180px] rounded border border-gray-800 bg-gray-900 p-3 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
                aria-label="Query parameters to strip"
              />
              <span className="mt-2 text-xs text-gray-400">Example: utm_source, fbclid, gclid</span>
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-2 font-semibold text-white">Hash parameters</span>
              <textarea
                value={hashList}
                onChange={(event) => setHashList(event.target.value)}
                spellCheck={false}
                className="min-h-[180px] rounded border border-gray-800 bg-gray-900 p-3 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
                aria-label="Hash parameters to strip"
              />
              <span className="mt-2 text-xs text-gray-400">Useful for sites that encode campaign data after the # sign.</span>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-white hover:bg-ub-orange/90 focus:outline-none focus:ring-2 focus:ring-ub-orange"
            >
              Save filters
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-ub-orange"
            >
              Restore defaults
            </button>
            {status && <span className="text-sm text-ub-orange">{status}</span>}
          </div>
        </section>
        <section className="rounded border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
          <h3 className="text-lg font-semibold text-white">How sanitization behaves</h3>
          <ul className="mt-2 list-inside list-disc space-y-2">
            <li>
              Terminal prompts for confirmation whenever sanitization changes clipboard contents so you can cancel unexpected edits.
            </li>
            <li>
              Editors surface an undo banner when content is altered, letting you revert with a single click.
            </li>
            <li>
              The paste menu mirrors these options and always respects the default you choose here.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default ClipboardSettings;
