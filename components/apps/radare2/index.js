import React, { useEffect, useRef, useState } from "react";
import HexEditor from "./HexEditor";
import {
  loadNotes,
  saveNotes,
  loadBookmarks,
  saveBookmarks,
  extractStrings,
  loadAnnotations,
  persistAnnotations,
  loadAnnotationSnapshot,
  snapshotToAnnotations,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  annotationsEqual,
  normalizeAnnotations,
  createAnnotationExport,
} from "./utils";
import GraphView from "../../../apps/radare2/components/GraphView";
import GuideOverlay from "./GuideOverlay";
import { useTheme } from "../../../hooks/useTheme";
import AnnotationManager from "./AnnotationManager";

const Radare2 = ({ initialData = {} }) => {
  const {
    file = "demo",
    hex = "",
    disasm = [],
    xrefs = {},
    blocks = [],
  } = initialData;
  const [mode, setMode] = useState("code");
  const [seekAddr, setSeekAddr] = useState("");
  const [findTerm, setFindTerm] = useState("");
  const [currentAddr, setCurrentAddr] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [bookmarks, setBookmarks] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const [strings, setStrings] = useState([]);
  const [history, setHistory] = useState(() =>
    createHistory(normalizeAnnotations(initialData.annotations || {})),
  );
  const [editing, setEditing] = useState({ addr: null, field: null });
  const [draft, setDraft] = useState("");
  const [showManager, setShowManager] = useState(false);
  const disasmRef = useRef(null);
  const { theme } = useTheme();

  const annotations = history.present || {};

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotes(loadNotes(file));
      setBookmarks(loadBookmarks(file));
      const stored = loadAnnotations(file);
      if (stored && Object.keys(stored).length) {
        setHistory(createHistory(stored));
      } else {
        const snapshot = loadAnnotationSnapshot(file);
        const snapshotAnnotations = snapshotToAnnotations(snapshot);
        if (Object.keys(snapshotAnnotations).length) {
          setHistory(createHistory(snapshotAnnotations));
        } else if (initialData.annotations) {
          setHistory(
            createHistory(normalizeAnnotations(initialData.annotations || {})),
          );
        } else {
          setHistory(createHistory({}));
        }
      }
    }
  }, [file, initialData.annotations]);

  useEffect(() => {
    try {
      if (
        typeof window !== "undefined" &&
        !localStorage.getItem("r2HelpDismissed")
      ) {
        setShowGuide(true);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  useEffect(() => {
    const base = disasm[0]?.addr || "0x0";
    setStrings(extractStrings(hex, base));
  }, [hex, disasm]);

  const commitAnnotations = (updater, meta) => {
    setHistory((prev) => {
      const nextAnnotations = normalizeAnnotations(updater(prev.present || {}));
      if (annotationsEqual(prev.present, nextAnnotations)) return prev;
      const nextHistory = pushHistory(prev, nextAnnotations, meta);
      persistAnnotations(file, disasm, nextHistory.present);
      return nextHistory;
    });
  };

  const handleUndo = () => {
    setHistory((prev) => {
      const next = undoHistory(prev);
      if (next === prev || annotationsEqual(prev.present, next.present)) {
        return prev;
      }
      persistAnnotations(file, disasm, next.present);
      return next;
    });
  };

  const handleRedo = () => {
    setHistory((prev) => {
      const next = redoHistory(prev);
      if (next === prev || annotationsEqual(prev.present, next.present)) {
        return prev;
      }
      persistAnnotations(file, disasm, next.present);
      return next;
    });
  };

  const updateAnnotation = (addr, partial) => {
    commitAnnotations(
      (current) => {
        const nextValue = {
          ...(current[addr] || {}),
          ...partial,
        };
        const normalized = normalizeAnnotations({ [addr]: nextValue });
        const clone = { ...current };
        if (normalized[addr]) {
          clone[addr] = normalized[addr];
        } else {
          delete clone[addr];
        }
        return clone;
      },
      { type: "update", addr },
    );
  };

  const clearAnnotation = (addr) => {
    commitAnnotations(
      (current) => {
        if (!current[addr]) return current;
        const next = { ...current };
        delete next[addr];
        return next;
      },
      { type: "remove", addr },
    );
  };

  const resolveConflict = (label) => {
    commitAnnotations(
      (current) => {
        const entries = Object.entries(current).filter(
          ([, value]) => (value.label || "") === label,
        );
        if (entries.length < 2) return current;
        const sorted = entries.sort((a, b) => {
          const parse = (value) => {
            if (typeof value !== "string") return Number.MAX_SAFE_INTEGER;
            const normalizedAddr = value.toLowerCase().startsWith("0x")
              ? value
              : `0x${value}`;
            const parsed = Number.parseInt(normalizedAddr, 16);
            return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
          };
          return parse(a[0]) - parse(b[0]);
        });
        const next = { ...current };
        sorted.forEach(([addr], idx) => {
          if (idx === 0) return;
          next[addr] = {
            ...next[addr],
            label: `${label}_${addr.replace(/^0x/, "")}`,
          };
        });
        return next;
      },
      { type: "resolve", label },
    );
  };

  const clearAllAnnotations = () => {
    commitAnnotations(() => ({}), { type: "clear" });
  };

  const scrollToAddr = (addr) => {
    const idx = disasm.findIndex(
      (l) => l.addr.toLowerCase() === addr.toLowerCase(),
    );
    if (idx >= 0) {
      setCurrentAddr(disasm[idx].addr);
      const el = document.getElementById(`asm-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSeek = () => {
    if (seekAddr) scrollToAddr(seekAddr);
  };

  const handleFind = () => {
    if (!findTerm) return;
    const idx = disasm.findIndex(
      (l) =>
        l.text.toLowerCase().includes(findTerm.toLowerCase()) ||
        l.addr.toLowerCase() === findTerm.toLowerCase(),
    );
    if (idx >= 0) {
      setCurrentAddr(disasm[idx].addr);
      const el = document.getElementById(`asm-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleAddNote = () => {
    if (!currentAddr || !noteText.trim()) return;
    const next = [...notes, { addr: currentAddr, text: noteText.trim() }];
    setNotes(next);
    saveNotes(file, next);
    setNoteText("");
  };

  const toggleBookmark = (addr) => {
    const next = bookmarks.includes(addr)
      ? bookmarks.filter((a) => a !== addr)
      : [...bookmarks, addr];
    setBookmarks(next);
    saveBookmarks(file, next);
  };

  const beginEdit = (addr, field) => {
    const value = annotations[addr]?.[field] || "";
    setDraft(value);
    setEditing({ addr, field });
  };

  const commitEdit = (addr, field, value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      const otherField = field === "label" ? "comment" : "label";
      const otherValue = annotations[addr]?.[otherField];
      if (!otherValue) {
        clearAnnotation(addr);
      } else {
        updateAnnotation(addr, { [field]: "" });
      }
    } else {
      updateAnnotation(addr, { [field]: trimmed });
    }
    setEditing({ addr: null, field: null });
    setDraft("");
  };

  const cancelEdit = () => {
    setEditing({ addr: null, field: null });
    setDraft("");
  };

  const handleExportAnnotations = () => {
    if (typeof window === "undefined") return;
    const payload = createAnnotationExport(file, disasm, annotations);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const safeName = file ? file.replace(/[^a-z0-9._-]/gi, "_") : "disassembly";
    anchor.download = `${safeName}.annotations.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="h-full w-full p-4 overflow-auto"
      style={{ backgroundColor: "var(--r2-bg)", color: "var(--r2-text)" }}
    >
      {showGuide && <GuideOverlay onClose={() => setShowGuide(false)} />}
      <div className="flex gap-2 mb-2 flex-wrap items-center">
        <img
          src="/themes/Yaru/apps/radare2.svg"
          alt="Radare2 badge"
          className="w-12 h-12"
        />
        <input
          value={seekAddr}
          onChange={(e) => setSeekAddr(e.target.value)}
          placeholder="seek 0x..."
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            color: "var(--r2-text)",
            border: "1px solid var(--r2-border)",
          }}
        />
        <button
          onClick={handleSeek}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          Seek
        </button>
        <input
          value={findTerm}
          onChange={(e) => setFindTerm(e.target.value)}
          placeholder="find"
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            color: "var(--r2-text)",
            border: "1px solid var(--r2-border)",
          }}
        />
        <button
          onClick={handleFind}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          Find
        </button>
        <button
          onClick={() => setMode((m) => (m === "code" ? "graph" : "code"))}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          {mode === "code" ? "Graph" : "Code"}
        </button>
        <button
          onClick={() => setShowGuide(true)}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          Help
        </button>
        <button
          onClick={handleUndo}
          disabled={!history.past.length}
          className="px-3 py-1 rounded disabled:opacity-60"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          Undo
        </button>
        <button
          onClick={handleRedo}
          disabled={!history.future.length}
          className="px-3 py-1 rounded disabled:opacity-60"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          Redo
        </button>
        <button
          onClick={() => setShowManager(true)}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          Manage Annotations
        </button>
        <button
          onClick={handleExportAnnotations}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          Export Annotations
        </button>
      </div>

      {mode === "graph" ? (
        <GraphView blocks={blocks} theme={theme} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <HexEditor hex={hex} theme={theme} />
          <div
            ref={disasmRef}
            className="overflow-auto rounded max-h-64 p-1.5 font-mono"
            style={{
              backgroundColor: "var(--r2-surface)",
              border: "1px solid var(--r2-border)",
              backgroundImage:
                "repeating-linear-gradient(to right, transparent, transparent calc(8ch - 1px), var(--r2-border) calc(8ch - 1px), var(--r2-border) 8ch)",
              backgroundOrigin: "content-box",
              backgroundClip: "content-box",
            }}
          >
            <ul className="text-sm">
              {disasm.map((line, idx) => (
                <li
                  key={line.addr}
                  id={`asm-${idx}`}
                  className="cursor-pointer"
                  style={{
                    backgroundColor:
                      currentAddr === line.addr
                        ? "var(--r2-accent)"
                        : "transparent",
                    color:
                      currentAddr === line.addr ? "#000" : "var(--r2-text)",
                  }}
                  onClick={() => setCurrentAddr(line.addr)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(line.addr);
                    }}
                    className="mr-1"
                  >
                    {bookmarks.includes(line.addr) ? "★" : "☆"}
                  </button>
                  <div className="inline-flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <div className="flex items-center gap-2">
                      {editing.addr === line.addr && editing.field === "label" ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={(e) => commitEdit(line.addr, "label", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              commitEdit(line.addr, "label", draft);
                            } else if (e.key === "Escape") {
                              cancelEdit();
                            }
                          }}
                          className="px-1 rounded text-sm"
                          style={{
                            backgroundColor: "var(--r2-surface)",
                            border: "1px solid var(--r2-border)",
                            color: "var(--r2-text)",
                          }}
                          aria-label={`Rename ${line.addr}`}
                        />
                      ) : (
                        <span className="font-semibold">
                          {annotations[line.addr]?.label || line.addr}
                        </span>
                      )}
                      <span className="text-xs opacity-80">{line.text}</span>
                    </div>
                    <div className="flex gap-2 mt-1 sm:mt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          beginEdit(line.addr, "label");
                        }}
                        className="text-xs underline"
                      >
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          beginEdit(line.addr, "comment");
                        }}
                        className="text-xs underline"
                      >
                        Comment
                      </button>
                      {annotations[line.addr] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearAnnotation(line.addr);
                          }}
                          className="text-xs underline text-red-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  {editing.addr === line.addr && editing.field === "comment" ? (
                    <textarea
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={(e) => commitEdit(line.addr, "comment", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          cancelEdit();
                        }
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          commitEdit(line.addr, "comment", draft);
                        }
                      }}
                      className="mt-2 w-full rounded p-1 text-sm"
                      rows={2}
                      style={{
                        backgroundColor: "var(--r2-surface)",
                        border: "1px solid var(--r2-border)",
                        color: "var(--r2-text)",
                      }}
                      aria-label={`Comment on ${line.addr}`}
                    />
                  ) : (
                    annotations[line.addr]?.comment && (
                      <p className="mt-1 text-xs italic opacity-80">
                        ; {annotations[line.addr].comment}
                      </p>
                    )
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {strings.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg">Strings</h2>
          <ul
            className="rounded p-2"
            style={{
              backgroundColor: "var(--r2-surface)",
              border: "1px solid var(--r2-border)",
            }}
          >
            {strings.map((s) => (
              <li key={s.addr}>
                <button
                  onClick={() => scrollToAddr(s.addr)}
                  className="underline"
                >
                  {s.addr}: {s.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {currentAddr && (
        <div className="mt-4">
          <h2 className="text-lg">Xrefs for {currentAddr}</h2>
          <p className="mb-2">
            {(xrefs[currentAddr] || []).join(", ") || "None"}
          </p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add note"
            className="w-full p-2 rounded"
            style={{
              backgroundColor: "var(--r2-surface)",
              color: "var(--r2-text)",
              border: "1px solid var(--r2-border)",
            }}
          />
          <button
            onClick={handleAddNote}
            className="mt-2 px-3 py-1 rounded"
            style={{
              backgroundColor: "var(--r2-surface)",
              border: "1px solid var(--r2-border)",
            }}
          >
            Save Note
          </button>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg">Notes</h2>
          <ul
            className="rounded p-2"
            style={{
              backgroundColor: "var(--r2-surface)",
              border: "1px solid var(--r2-border)",
            }}
          >
            {notes.map((n, i) => (
              <li key={i}>
                {n.addr}: {n.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showManager && (
        <AnnotationManager
          annotations={annotations}
          disasm={disasm}
          onUpdate={updateAnnotation}
          onResolve={resolveConflict}
          onClear={clearAnnotation}
          onClearAll={clearAllAnnotations}
          onClose={() => setShowManager(false)}
        />
      )}
    </div>
  );
};

export default Radare2;
