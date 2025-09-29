"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  loadHexBookmarks,
  saveHexBookmarks,
} from "../../../components/apps/radare2/utils";

type Selection = [number | null, number | null];

interface HexViewProps {
  hex: string;
  theme: string;
  file: string;
  baseAddress?: string;
  onBookmarkSelect?: (addr: string) => void;
}

interface Cell {
  label: string;
  start: number;
  end: number;
}

const COLUMN_OPTIONS = [8, 16, 24, 32];
const WORD_SIZES = [1, 2, 4];
const ROW_HEIGHT = 24;

const formatAddress = (base: number, offset: number) =>
  `0x${(base + offset).toString(16)}`;

const chunk = <T,>(arr: T[], size: number): T[][] => {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const sanitizeHex = (hex: string) => hex.replace(/[^0-9a-fA-F]/g, "");

const toBytes = (hex: string) => sanitizeHex(hex).match(/.{1,2}/g) || [];

const HexView: React.FC<HexViewProps> = ({
  hex,
  theme,
  file,
  baseAddress = "0x0",
  onBookmarkSelect,
}) => {
  const [bytes, setBytes] = useState<string[]>(() => toBytes(hex));
  const [patches, setPatches] = useState<{ offset: number; value: string }[]>(
    [],
  );
  const [selection, setSelection] = useState<Selection>([null, null]);
  const [liveMessage, setLiveMessage] = useState("");
  const [columns, setColumns] = useState(16);
  const [wordSize, setWordSize] = useState(1);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const miniMapRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useRef(false);
  const visibleRef = useRef(true);
  const colorsRef = useRef({
    surface: "#374151",
    accent: "#fbbf24",
    text: "#ffffff",
    border: "#4b5563",
  });
  const patchesRef = useRef<{ offset: number; value: string }[]>([]);

  const base = useMemo(() => parseInt(baseAddress, 16) || 0, [baseAddress]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const style = getComputedStyle(document.documentElement);
    colorsRef.current = {
      surface: style.getPropertyValue("--r2-surface").trim() || "#374151",
      accent: style.getPropertyValue("--r2-accent").trim() || "#fbbf24",
      text: style.getPropertyValue("--r2-text").trim() || "#ffffff",
      border: style.getPropertyValue("--r2-border").trim() || "#4b5563",
    };
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      prefersReduced.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const layoutPrefix = `r2-hex-layout-${file || "default"}`;
    try {
      const storedColumns = window.localStorage.getItem(
        `${layoutPrefix}-columns`,
      );
      const storedWord = window.localStorage.getItem(
        `${layoutPrefix}-word`,
      );
      if (storedColumns) {
        const parsed = parseInt(storedColumns, 10);
        if (!Number.isNaN(parsed) && parsed > 0) setColumns(parsed);
      }
      if (storedWord) {
        const parsed = parseInt(storedWord, 10);
        if (!Number.isNaN(parsed) && parsed > 0) setWordSize(parsed);
      }
    } catch {
      /* ignore layout persistence errors */
    }
  }, [file]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const layoutPrefix = `r2-hex-layout-${file || "default"}`;
    try {
      window.localStorage.setItem(
        `${layoutPrefix}-columns`,
        columns.toString(),
      );
    } catch {
      /* ignore persistence errors */
    }
  }, [columns, file]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const layoutPrefix = `r2-hex-layout-${file || "default"}`;
    try {
      window.localStorage.setItem(`${layoutPrefix}-word`, wordSize.toString());
    } catch {
      /* ignore persistence errors */
    }
  }, [wordSize, file]);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof Worker === "function") {
      try {
        workerRef.current = new Worker(
          new URL(
            "../../../components/apps/radare2/hexWorker.js",
            import.meta.url,
          ),
        );
        workerRef.current.onmessage = (e: MessageEvent) => {
          const { type, bytes: nextBytes = [], patches: nextPatches = [] } =
            e.data || {};
          if (type === "bytes") {
            setBytes(nextBytes);
            setPatches(nextPatches);
            patchesRef.current = nextPatches;
          } else if (type === "export") {
            const blob = new Blob([JSON.stringify(nextPatches, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "patches.json";
            a.click();
            URL.revokeObjectURL(url);
          }
        };
        return () => workerRef.current?.terminate();
      } catch (error) {
        workerRef.current = null;
      }
    }
    return undefined;
  }, []);

  useEffect(() => {
    const handleVis = () => {
      const isVisible = document.visibilityState === "visible";
      visibleRef.current = isVisible;
      if (workerRef.current) {
        workerRef.current.postMessage({ type: isVisible ? "resume" : "pause" });
      }
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, []);

  useEffect(() => {
    if (workerRef.current && visibleRef.current) {
      workerRef.current.postMessage({ type: "hex", hex });
    } else {
      setBytes(toBytes(hex));
      setPatches([]);
      patchesRef.current = [];
    }
  }, [hex]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const loaded = await loadHexBookmarks(file);
      if (!cancelled) {
        setBookmarks(Array.isArray(loaded) ? loaded.map((n) => Number(n)) : []);
        setBookmarksLoaded(true);
      }
    };
    setBookmarksLoaded(false);
    load();
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (!bookmarksLoaded) return;
    saveHexBookmarks(file, bookmarks).catch(() => {
      /* ignore persistence errors */
    });
  }, [bookmarks, file, bookmarksLoaded]);

  useEffect(() => {
    let raf: number | undefined;
    const draw = () => {
      const canvas = miniMapRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const len = bytes.length || 1;
      ctx.fillStyle = colorsRef.current.surface;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (selection[0] !== null && selection[1] !== null) {
        const start = Math.min(selection[0], selection[1]);
        const end = Math.max(selection[0], selection[1]);
        const startRatio = start / len;
        const endRatio = (end + 1) / len;
        ctx.fillStyle = colorsRef.current.accent;
        ctx.fillRect(
          startRatio * canvas.width,
          0,
          (endRatio - startRatio) * canvas.width,
          canvas.height,
        );
      }
    };
    if (prefersReduced.current) draw();
    else if (visibleRef.current) raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf ?? 0);
  }, [bytes, selection]);

  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [];
    const step = Math.max(1, wordSize);
    for (let i = 0; i < bytes.length; i += step) {
      const group = bytes.slice(i, i + step);
      if (!group.length) continue;
      out.push({
        label: group.join("").toUpperCase(),
        start: i,
        end: i + group.length - 1,
      });
    }
    return out;
  }, [bytes, wordSize]);

  const rows = useMemo(() => chunk(cells, Math.max(1, columns)), [cells, columns]);

  const selectionBounds = useMemo(() => {
    if (selection[0] === null || selection[1] === null) return null;
    const start = Math.min(selection[0], selection[1]);
    const end = Math.max(selection[0], selection[1]);
    return { start, end };
  }, [selection]);

  const selectionStart = selectionBounds?.start ?? null;
  const addBookmarkDisabled =
    selectionStart === null || bookmarks.includes(selectionStart);

  const selectionAddress =
    selectionStart === null ? null : formatAddress(base, selectionStart);

  const handleMouseDown = (cell: Cell) => {
    setSelection([cell.start, cell.end]);
    setLiveMessage(`Selected bytes ${cell.start} to ${cell.end}`);
  };

  const handleMouseEnter = (cell: Cell) => {
    if (selection[0] !== null) {
      const anchor = selection[0];
      const newStart = Math.min(anchor, cell.start);
      const newEnd = Math.max(anchor, cell.end);
      setSelection([newStart, newEnd]);
      setLiveMessage(`Selecting bytes ${newStart} to ${newEnd}`);
    }
  };

  const handleMiniMapClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = miniMapRef.current;
    if (!canvas || !containerRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / canvas.width;
    const bytesPerRow = Math.max(1, columns * wordSize);
    const targetByte = Math.floor(bytes.length * ratio);
    const row = Math.floor(targetByte / bytesPerRow);
    containerRef.current.scrollTop = row * ROW_HEIGHT;
  };

  const handleEdit = (cell: Cell) => {
    if (typeof window === "undefined") return;
    const width = cell.end - cell.start + 1;
    const promptValue = window.prompt(
      `Enter ${width * 2}-char hex value`,
      cell.label,
    );
    if (!promptValue) return;
    const sanitized = sanitizeHex(promptValue);
    if (sanitized.length !== width * 2) {
      setLiveMessage("Invalid word length");
      return;
    }
    const values = sanitized.match(/.{1,2}/g) || [];
    if (workerRef.current) {
      values.forEach((value, idx) =>
        workerRef.current?.postMessage({
          type: "patch",
          offset: cell.start + idx,
          value,
        }),
      );
    } else {
      setBytes((prev) => {
        const next = [...prev];
        values.forEach((value, idx) => {
          if (cell.start + idx < next.length) {
            next[cell.start + idx] = value.toUpperCase();
          }
        });
        return next;
      });
      const nextPatches = [...patchesRef.current];
      values.forEach((value, idx) => {
        const offset = cell.start + idx;
        const existingIdx = nextPatches.findIndex((p) => p.offset === offset);
        const upper = value.toUpperCase();
        if (existingIdx >= 0) nextPatches[existingIdx] = { offset, value: upper };
        else nextPatches.push({ offset, value: upper });
      });
      patchesRef.current = nextPatches;
      setPatches(nextPatches);
    }
    setLiveMessage(`Patched bytes ${cell.start} to ${cell.end}`);
  };

  const handleExport = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "export" });
    } else {
      const blob = new Blob([JSON.stringify(patchesRef.current, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "patches.json";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleAddBookmark = () => {
    if (selectionStart === null) return;
    setBookmarks((prev) => {
      if (prev.includes(selectionStart)) return prev;
      const next = [...prev, selectionStart].sort((a, b) => a - b);
      setLiveMessage(`Bookmarked ${formatAddress(base, selectionStart)}`);
      return next;
    });
  };

  const handleRemoveBookmark = (offset: number) => {
    setBookmarks((prev) => prev.filter((o) => o !== offset));
    setLiveMessage(`Removed bookmark ${formatAddress(base, offset)}`);
  };

  const handleBookmarkNavigate = (offset: number) => {
    const addr = formatAddress(base, offset);
    setSelection([offset, offset]);
    onBookmarkSelect?.(addr);
    setLiveMessage(`Navigated to ${addr}`);
  };

  return (
    <div className="mb-6" aria-label="hex editor">
      <div className="flex gap-3 flex-wrap items-center mb-3">
        <label className="text-sm flex items-center gap-1">
          <span>Columns</span>
          <select
            aria-label="Columns"
            value={columns}
            onChange={(e) => setColumns(parseInt(e.target.value, 10) || 16)}
            className="px-2 py-1 rounded"
            style={{
              backgroundColor: "var(--r2-surface)",
              color: "var(--r2-text)",
              border: "1px solid var(--r2-border)",
            }}
          >
            {COLUMN_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex items-center gap-1">
          <span>Word size</span>
          <select
            aria-label="Word size"
            value={wordSize}
            onChange={(e) => setWordSize(parseInt(e.target.value, 10) || 1)}
            className="px-2 py-1 rounded"
            style={{
              backgroundColor: "var(--r2-surface)",
              color: "var(--r2-text)",
              border: "1px solid var(--r2-border)",
            }}
          >
            {WORD_SIZES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={handleAddBookmark}
          disabled={addBookmarkDisabled}
          className="px-3 py-1 rounded disabled:opacity-50"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
            color: "var(--r2-text)",
          }}
        >
          {selectionAddress
            ? `Add Bookmark ${selectionAddress}`
            : "Add Bookmark"}
        </button>
      </div>
      <div className="flex gap-2">
        <div
          ref={containerRef}
          className="overflow-auto p-2 rounded max-h-64 flex-1"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          <div className="text-xs font-mono">
            {rows.map((row, rowIdx) => (
              <div
                key={`row-${rowIdx}`}
                className="flex mb-1"
                data-testid="hex-row"
              >
                {row.map((cell, colIdx) => {
                  const selected =
                    !!selectionBounds &&
                    selectionBounds.start <= cell.end &&
                    selectionBounds.end >= cell.start;
                  const hasBookmark = bookmarks.includes(cell.start);
                  const marginLeft =
                    columns % 2 === 0 && colIdx === columns / 2 ? "0.5rem" :
                    undefined;
                  return (
                    <button
                      key={cell.start}
                      type="button"
                      onMouseDown={() => handleMouseDown(cell)}
                      onMouseEnter={() => handleMouseEnter(cell)}
                      onDoubleClick={() => handleEdit(cell)}
                      data-testid="hex-cell"
                      className="w-10 h-7 flex items-center justify-center rounded focus:outline-none focus-visible:ring-2 relative"
                      style={{
                        backgroundColor: selected
                          ? "var(--r2-accent)"
                          : "var(--r2-surface)",
                        color: selected ? "#000" : "var(--r2-text)",
                        "--tw-ring-color": "var(--r2-accent)",
                        marginLeft,
                      }}
                    >
                      {cell.label}
                      {hasBookmark && (
                        <span
                          aria-hidden
                          className="absolute text-[10px] top-0.5 right-0.5"
                        >
                          ★
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <canvas
          ref={miniMapRef}
          width={64}
          height={64}
          onClick={handleMiniMapClick}
          className="rounded cursor-pointer"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
          aria-label="hex mini map"
        />
      </div>
      <div className="mt-2 flex gap-2 flex-wrap">
        <button
          onClick={handleExport}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
            color: "var(--r2-text)",
          }}
        >
          Export Patches
        </button>
      </div>
      {bookmarks.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Hex Bookmarks</h3>
          <ul
            className="rounded p-2 space-y-1"
            style={{
              backgroundColor: "var(--r2-surface)",
              border: "1px solid var(--r2-border)",
            }}
            aria-label="hex bookmarks"
          >
            {bookmarks.map((offset) => {
              const addr = formatAddress(base, offset);
              return (
                <li key={offset} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBookmarkNavigate(offset)}
                    className="underline"
                  >
                    {addr}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveBookmark(offset)}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: "var(--r2-surface)",
                      border: "1px solid var(--r2-border)",
                      color: "var(--r2-text)",
                    }}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
};

export default HexView;

