import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import HexEditor from "./HexEditor";
import {
  loadNotes,
  saveNotes,
  loadBookmarks,
  saveBookmarks,
  extractStrings,
} from "./utils";
import GraphView from "../../../apps/radare2/components/GraphView";
import GuideOverlay from "./GuideOverlay";
import { useTheme } from "../../../hooks/useTheme";

const SUSPICIOUS_HEURISTICS = [
  {
    id: "stack-ops",
    label: "Stack Ops",
    description: "Push/pop patterns that may hint at pivots",
    predicate: (line) => /\b(push|pop)\b/i.test(line.text),
  },
  {
    id: "memory-writes",
    label: "Memory Writes",
    description: "MOV operations that alter memory",
    predicate: (line) => /\bmov\b/i.test(line.text),
  },
  {
    id: "exits",
    label: "Return Paths",
    description: "RET or JMP instructions often used in gadgets",
    predicate: (line) => /\b(ret|jmp)\b/i.test(line.text),
  },
];

const getLineElementId = (addr) => `asm-${addr.toLowerCase()}`;

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
  const [activeHeuristic, setActiveHeuristic] = useState(null);
  const disasmRef = useRef(null);
  const { theme } = useTheme();
  const cardSurfaceStyle = useMemo(
    () => ({
      backgroundColor: "var(--r2-surface)",
      border: "1px solid var(--r2-border)",
      boxShadow: "0 18px 45px -30px rgba(0,0,0,0.65)",
    }),
    [],
  );

  const heuristicMatches = useMemo(
    () =>
      SUSPICIOUS_HEURISTICS.map((heuristic) => ({
        ...heuristic,
        matches: disasm.filter((line) => heuristic.predicate(line)),
      })),
    [disasm],
  );

  const activeHeuristicMeta = useMemo(
    () =>
      heuristicMatches.find((heuristic) => heuristic.id === activeHeuristic) ||
      null,
    [activeHeuristic, heuristicMatches],
  );

  const filteredDisasm = useMemo(
    () => (activeHeuristicMeta ? activeHeuristicMeta.matches : disasm),
    [activeHeuristicMeta, disasm],
  );

  const lineWarnings = useMemo(() => {
    const map = new Map();
    disasm.forEach((line) => {
      const matches = SUSPICIOUS_HEURISTICS.filter((heuristic) =>
        heuristic.predicate(line),
      );
      if (matches.length) {
        map.set(line.addr, matches);
      }
    });
    return map;
  }, [disasm]);

  const consoleMessages = useMemo(() => {
    const base = [
      {
        id: "load",
        type: "info",
        label: `Loaded ${disasm.length} instructions for analysis`,
      },
      {
        id: "strings",
        type: strings.length ? "info" : "muted",
        label: strings.length
          ? `${strings.length} printable strings recovered`
          : "No printable strings detected in current window",
      },
    ];

    const warnings = heuristicMatches
      .filter((heuristic) => heuristic.matches.length > 0)
      .map((heuristic) => ({
        id: `heuristic-${heuristic.id}`,
        type: activeHeuristic === heuristic.id ? "active" : "warn",
        label: `${heuristic.label} triggered ${heuristic.matches.length} time${
          heuristic.matches.length === 1 ? "" : "s"
        }`,
      }));

    return [...base, ...warnings];
  }, [
    activeHeuristic,
    disasm.length,
    heuristicMatches,
    strings.length,
  ]);

  const lineIndexByAddr = useMemo(() => {
    const map = new Map();
    disasm.forEach((line, idx) => {
      map.set(line.addr.toLowerCase(), idx);
    });
    return map;
  }, [disasm]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotes(loadNotes(file));
      setBookmarks(loadBookmarks(file));
    }
  }, [file]);

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

  const scrollToAddr = useCallback(
    (addr) => {
      const idx = lineIndexByAddr.get(addr.toLowerCase());
      if (idx === undefined) return;
      const resolvedAddr = disasm[idx]?.addr;
      if (!resolvedAddr) return;
      setCurrentAddr(resolvedAddr);
      if (typeof document !== "undefined") {
        const el = document.getElementById(getLineElementId(resolvedAddr));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    },
    [disasm, lineIndexByAddr],
  );

  const handleSeek = useCallback(() => {
    if (seekAddr) scrollToAddr(seekAddr);
  }, [scrollToAddr, seekAddr]);

  const handleFind = useCallback(() => {
    if (!findTerm) return;
    const match = disasm.find(
      (l) =>
        l.text.toLowerCase().includes(findTerm.toLowerCase()) ||
        l.addr.toLowerCase() === findTerm.toLowerCase(),
    );
    if (match) {
      scrollToAddr(match.addr);
    }
  }, [disasm, findTerm, scrollToAddr]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = (event) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === "s") {
          event.preventDefault();
          handleSeek();
        }
        if (key === "f") {
          event.preventDefault();
          handleFind();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleFind, handleSeek]);

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

  const sidebar = (
    <aside
      className="w-full lg:w-72 shrink-0 space-y-4"
      aria-label="Analysis summary sidebar"
    >
      <div
        className="rounded-xl border p-4 space-y-4 transition-shadow"
        style={cardSurfaceStyle}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Analysis Summary
        </h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-2">
            <dt
              className="text-xs uppercase"
              style={{ color: "var(--r2-muted, #888)" }}
            >
              Process
            </dt>
            <dd data-testid="process-name" className="font-mono">
              {file}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt
              className="text-xs uppercase"
              style={{ color: "var(--r2-muted, #888)" }}
            >
              Bookmarks
            </dt>
            <dd data-testid="bookmark-count" className="font-semibold">
              {bookmarks.length}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt
              className="text-xs uppercase"
              style={{ color: "var(--r2-muted, #888)" }}
            >
              Active Filter
            </dt>
            <dd data-testid="active-filter" className="text-right">
              {activeHeuristicMeta
                ? `${activeHeuristicMeta.label} (${activeHeuristicMeta.matches.length})`
                : "None"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt
              className="text-xs uppercase"
              style={{ color: "var(--r2-muted, #888)" }}
            >
              Selected Addr
            </dt>
            <dd className="font-mono">
              {currentAddr || "--"}
            </dd>
          </div>
        </dl>
        <div className="space-y-2">
          <p
            className="text-xs uppercase"
            style={{ color: "var(--r2-muted, #888)" }}
          >
            Quick filters
          </p>
          <div className="flex flex-wrap gap-2">
            {heuristicMatches.map((heuristic) => {
              const isActive = activeHeuristic === heuristic.id;
              const hasMatches = heuristic.matches.length > 0;
              return (
                <button
                  key={heuristic.id}
                  type="button"
                  className={`px-2 py-1 text-xs rounded border transition-colors focus:outline-none focus-visible:ring ${
                    isActive ? "font-semibold" : ""
                  } ${hasMatches ? "shadow-sm" : ""}`}
                  style={{
                    borderColor: "var(--r2-border)",
                    backgroundColor: isActive
                      ? "var(--r2-accent)"
                      : hasMatches
                      ? "rgba(251, 191, 36, 0.18)"
                      : "var(--r2-surface)",
                    color: isActive ? "#000" : "var(--r2-text)",
                  }}
                  aria-pressed={isActive}
                  title={`${heuristic.label} – ${heuristic.description}`}
                  onClick={() =>
                    setActiveHeuristic((current) =>
                      current === heuristic.id ? null : heuristic.id,
                    )
                  }
                >
                  {heuristic.label} ({heuristic.matches.length})
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div
      className="h-full w-full p-6 overflow-auto"
      style={{ backgroundColor: "var(--r2-bg)", color: "var(--r2-text)" }}
    >
      {showGuide && <GuideOverlay onClose={() => setShowGuide(false)} />}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
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
          aria-label="Seek to address"
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
          title="Seek to address (Alt+S)"
        >
          Seek
        </button>
        <input
          value={findTerm}
          onChange={(e) => setFindTerm(e.target.value)}
          placeholder="find"
          className="px-2 py-1 rounded"
          aria-label="Find instruction"
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
          title="Find next match (Alt+F)"
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
      </div>

      {mode === "graph" ? (
        <div className="flex flex-col xl:flex-row gap-4 items-start">
          <div
            className="flex-1 w-full rounded-xl border p-4"
            style={cardSurfaceStyle}
          >
            <GraphView blocks={blocks} theme={theme} />
          </div>
          {sidebar}
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-4">
            <div
              className="rounded-xl border p-4"
              style={cardSurfaceStyle}
            >
              <HexEditor hex={hex} theme={theme} />
            </div>
            <div
              className="rounded-xl border p-4"
              style={cardSurfaceStyle}
            >
              <header className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  Disassembly
                </h2>
                {currentAddr && (
                  <span
                    className="text-xs px-2 py-1 rounded-full font-mono"
                    style={{
                      backgroundColor: "rgba(96, 165, 250, 0.15)",
                      color: "var(--r2-text)",
                    }}
                  >
                    Active: {currentAddr}
                  </span>
                )}
              </header>
              <div
                ref={disasmRef}
                className="overflow-auto rounded-lg border"
                style={{
                  borderColor: "var(--r2-border)",
                  backgroundColor: "rgba(17, 24, 39, 0.35)",
                  maxHeight: "20rem",
                }}
              >
                <ul
                  className="text-sm space-y-1 p-2 font-mono"
                  role="listbox"
                  aria-label="Disassembly listing"
                >
                  {filteredDisasm.map((line) => {
                    const isSelected = currentAddr === line.addr;
                    const isBookmarked = bookmarks.includes(line.addr);
                    const heuristicsForLine = lineWarnings.get(line.addr) || [];
                    const hasWarning = heuristicsForLine.length > 0;
                    return (
                      <li
                        key={line.addr}
                        id={getLineElementId(line.addr)}
                        data-testid="disasm-item"
                        className="cursor-pointer rounded-md border px-2 py-1 transition-colors"
                        role="option"
                        style={{
                          borderColor: isSelected
                            ? "var(--r2-border)"
                            : hasWarning
                            ? "rgba(251, 191, 36, 0.4)"
                            : "transparent",
                          backgroundColor: isSelected
                            ? "var(--r2-accent)"
                            : hasWarning
                            ? "rgba(251, 191, 36, 0.12)"
                            : "transparent",
                          color: isSelected ? "#000" : "var(--r2-text)",
                        }}
                        onClick={() => setCurrentAddr(line.addr)}
                        aria-selected={isSelected}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark(line.addr);
                              }}
                              className="mr-1"
                              aria-label={`${
                                isBookmarked
                                  ? "Remove bookmark"
                                  : "Bookmark address"
                              } ${line.addr}`}
                              title={
                                isBookmarked
                                  ? `Remove bookmark for ${line.addr}`
                                  : `Bookmark ${line.addr}`
                              }
                            >
                              {isBookmarked ? "★" : "☆"}
                            </button>
                            <span>{line.addr}: </span>
                            <span>{line.text}</span>
                          </div>
                          {hasWarning && (
                            <div className="flex flex-wrap gap-1 text-[10px] uppercase">
                              {heuristicsForLine.map((heuristic) => (
                                <span
                                  key={`${line.addr}-${heuristic.id}`}
                                  className="px-1.5 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: "rgba(251, 191, 36, 0.25)",
                                    color: "var(--r2-text)",
                                  }}
                                >
                                  {heuristic.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {filteredDisasm.length === 0 && (
                    <li className="text-xs italic" data-testid="disasm-empty">
                      No instructions match the selected heuristic.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          {sidebar}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <section
          className="rounded-xl border p-4 space-y-3"
          style={cardSurfaceStyle}
        >
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Console Output
            </h2>
            <span className="text-[10px] uppercase" style={{ color: "var(--r2-muted, #888)" }}>
              Simulated
            </span>
          </header>
          <ul className="space-y-2 text-sm">
            {consoleMessages.map((message) => {
              const isWarning = message.type === "warn";
              const isActive = message.type === "active";
              const isMuted = message.type === "muted";
              return (
                <li
                  key={message.id}
                  className={`rounded-lg border px-3 py-2 ${
                    isActive
                      ? "font-semibold"
                      : ""
                  }`}
                  style={{
                    borderColor: isActive
                      ? "var(--r2-accent)"
                      : isWarning
                      ? "rgba(251, 191, 36, 0.35)"
                      : "transparent",
                    backgroundColor: isActive
                      ? "var(--r2-accent)"
                      : isWarning
                      ? "rgba(251, 191, 36, 0.15)"
                      : isMuted
                      ? "rgba(148, 163, 184, 0.1)"
                      : "rgba(15, 23, 42, 0.3)",
                    color: isActive ? "#000" : "var(--r2-text)",
                  }}
                >
                  {message.label}
                </li>
              );
            })}
          </ul>
        </section>

        {strings.length > 0 && (
          <section
            className="rounded-xl border p-4 space-y-3"
            style={cardSurfaceStyle}
          >
            <header className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Strings
              </h2>
              <span className="text-xs" style={{ color: "var(--r2-muted, #888)" }}>
                Click to jump
              </span>
            </header>
            <ul className="space-y-2 text-sm">
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
          </section>
        )}

        {currentAddr && (
          <section
            className="rounded-xl border p-4 space-y-3"
            style={cardSurfaceStyle}
          >
            <header className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Xrefs
              </h2>
              <span className="text-xs font-mono">{currentAddr}</span>
            </header>
            <p className="text-sm">
              {(xrefs[currentAddr] || []).join(", ") || "None"}
            </p>
            <div className="space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add note"
                className="w-full p-2 rounded"
                aria-label={`Add note for ${currentAddr}`}
                style={{
                  backgroundColor: "var(--r2-surface)",
                  color: "var(--r2-text)",
                  border: "1px solid var(--r2-border)",
                }}
              />
              <button
                onClick={handleAddNote}
                className="px-3 py-1 rounded self-end"
                style={{
                  backgroundColor: "var(--r2-surface)",
                  border: "1px solid var(--r2-border)",
                }}
              >
                Save Note
              </button>
            </div>
          </section>
        )}

        {notes.length > 0 && (
          <section
            className="rounded-xl border p-4 space-y-2 lg:col-span-2 xl:col-span-3"
            style={cardSurfaceStyle}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Notes
            </h2>
            <ul className="space-y-1 text-sm">
              {notes.map((n, i) => (
                <li key={i} className="font-mono">
                  {n.addr}: {n.text}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default Radare2;
