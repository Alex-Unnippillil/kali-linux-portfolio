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
      className="w-full lg:w-64 shrink-0 space-y-3"
      aria-label="Analysis summary sidebar"
    >
      <div
        className="rounded border p-3 space-y-3"
        style={{
          borderColor: "var(--r2-border)",
          backgroundColor: "var(--r2-surface)",
        }}
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
        <div>
          <p
            className="text-xs uppercase mb-2"
            style={{ color: "var(--r2-muted, #888)" }}
          >
            Quick filters
          </p>
          <div className="flex flex-wrap gap-2">
            {heuristicMatches.map((heuristic) => {
              const isActive = activeHeuristic === heuristic.id;
              return (
                <button
                  key={heuristic.id}
                  type="button"
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    isActive ? "font-semibold" : ""
                  }`}
                  style={{
                    borderColor: "var(--r2-border)",
                    backgroundColor: isActive
                      ? "var(--r2-accent)"
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
          title="Seek to address (Alt+S)"
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
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <GraphView blocks={blocks} theme={theme} />
          </div>
          {sidebar}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 grid md:grid-cols-2 gap-4">
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
              <ul className="text-sm space-y-1">
                {filteredDisasm.map((line) => {
                  const isSelected = currentAddr === line.addr;
                  const isBookmarked = bookmarks.includes(line.addr);
                  return (
                    <li
                      key={line.addr}
                      id={getLineElementId(line.addr)}
                      data-testid="disasm-item"
                      className="cursor-pointer rounded border px-2 py-1 transition-colors"
                      style={{
                        borderColor: isSelected
                          ? "var(--r2-border)"
                          : "transparent",
                        backgroundColor: isSelected
                          ? "var(--r2-accent)"
                          : "transparent",
                        color: isSelected ? "#000" : "var(--r2-text)",
                      }}
                      onClick={() => setCurrentAddr(line.addr)}
                      aria-selected={isSelected}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(line.addr);
                        }}
                        className="mr-1"
                        aria-label={`${
                          isBookmarked ? "Remove bookmark" : "Bookmark address"
                        } ${line.addr}`}
                        title={
                          isBookmarked
                            ? `Remove bookmark for ${line.addr}`
                            : `Bookmark ${line.addr}`
                        }
                      >
                        {isBookmarked ? "★" : "☆"}
                      </button>
                      {line.addr}: {line.text}
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
          {sidebar}
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
    </div>
  );
};

export default Radare2;
