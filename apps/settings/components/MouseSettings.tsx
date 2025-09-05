"use client";

import { useSettings } from "../../../hooks/useSettings";

const CURSOR_THEMES = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
];

const CURSOR_SIZES = [24, 32, 48];

export default function MouseSettings() {
  const { cursor, setCursor, cursorSize, setCursorSize } = useSettings();
  const url = `/cursors/${cursor}/${cursorSize}/left_ptr.png`;
  const previewStyle: React.CSSProperties = {
    cursor: `url(${url}) ${cursorSize / 2} ${cursorSize / 2}, auto`,
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-ubt-grey">Cursor Theme:</label>
        <select
          value={cursor}
          onChange={(e) => setCursor(e.target.value)}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          {CURSOR_THEMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-ubt-grey">Size:</label>
        <div className="flex gap-2">
          {CURSOR_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setCursorSize(s)}
              className={`px-3 py-1 rounded ${
                cursorSize === s
                  ? "bg-ub-orange text-white"
                  : "bg-ub-cool-grey text-ubt-grey"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div
        className="mt-4 p-4 border border-ubt-cool-grey rounded bg-ub-cool-grey"
        style={previewStyle}
        aria-label="Cursor preview"
      >
        Hover to preview
      </div>
    </div>
  );
}
