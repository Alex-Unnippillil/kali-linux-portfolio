import React, { useEffect, useRef, useState } from "react";
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
  const disasmRef = useRef(null);
  const { theme } = useTheme();

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

  return (
    <div
      className="h-full w-full p-4 overflow-auto"
      style={{ backgroundColor: "var(--r2-bg)", color: "var(--r2-text)" }}
    >
      {showGuide && <GuideOverlay onClose={() => setShowGuide(false)} />}
      <div className="flex gap-2 mb-2 flex-wrap items-center">
        <img
          src="/icons/128/radare2.svg"
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
                  {line.addr}: {line.text}
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
    </div>
  );
};

export default Radare2;
