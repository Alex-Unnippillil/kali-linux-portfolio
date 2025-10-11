import React, { useEffect, useMemo, useRef, useState } from "react";
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

const LAB_KEY = "radare2:lab-enabled";

const ensureFixtures = (initialData) => {
  if (!initialData) return [];
  if (Array.isArray(initialData)) return initialData;
  if (Array.isArray(initialData.fixtures)) return initialData.fixtures;
  if (initialData.fixtures && typeof initialData.fixtures === "object") {
    return Object.values(initialData.fixtures);
  }
  if (initialData.file) return [initialData];
  return [];
};

const getFixtureId = (fixture) =>
  fixture?.id || fixture?.file || fixture?.title || "fixture";

const defaultFixture = {
  id: "fallback",
  title: "Radare2 demo fixture",
  description: "Disassembly preview is unavailable.",
  file: "demo",
  hex: "",
  disasm: [],
  xrefs: {},
  blocks: [],
  analysis: {},
  docLinks: [],
};

const Radare2 = ({ initialData = {} }) => {
  const fixtures = useMemo(() => ensureFixtures(initialData), [initialData]);
  const defaultId = useMemo(() => {
    if (initialData?.defaultFixtureId) return initialData.defaultFixtureId;
    return fixtures.length ? getFixtureId(fixtures[0]) : getFixtureId(defaultFixture);
  }, [initialData, fixtures]);

  const [mode, setMode] = useState("code");
  const [fixtureId, setFixtureId] = useState(defaultId);
  const [seekAddr, setSeekAddr] = useState("");
  const [findTerm, setFindTerm] = useState("");
  const [currentAddr, setCurrentAddr] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [bookmarks, setBookmarks] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const [strings, setStrings] = useState([]);
  const [labEnabled, setLabEnabled] = useState(false);
  const disasmRef = useRef(null);
  const { theme } = useTheme();

  const activeFixture = useMemo(() => {
    if (!fixtures.length) return defaultFixture;
    const candidate = fixtures.find((fx) => getFixtureId(fx) === fixtureId);
    return candidate || fixtures[0];
  }, [fixtures, fixtureId]);

  const {
    title = "Fixture",
    description = "",
    file = "demo",
    hex = "",
    disasm = [],
    xrefs = {},
    blocks = [],
    analysis = {},
    docLinks = [],
    arch,
    format,
    os,
  } = activeFixture;

  const functionIndex = analysis.functions || [];
  const analysisNotes = analysis.notes || [];

  useEffect(() => {
    setFixtureId((prev) => {
      const exists = fixtures.some((fx) => getFixtureId(fx) === prev);
      return exists ? prev : defaultId;
    });
  }, [fixtures, defaultId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setLabEnabled(localStorage.getItem(LAB_KEY) === "true");
    } catch {
      setLabEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (!labEnabled) setMode("code");
  }, [labEnabled]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotes(loadNotes(file));
      setBookmarks(loadBookmarks(file));
    }
    setCurrentAddr(null);
    setNoteText("");
    setSeekAddr("");
    setFindTerm("");
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
    const base = analysis.entrypoint || disasm[0]?.addr || "0x0";
    setStrings(extractStrings(hex, base));
  }, [hex, disasm, analysis]);

  const scrollToAddr = (addr) => {
    if (!addr) return;
    const idx = disasm.findIndex((l) => l.addr?.toLowerCase() === addr.toLowerCase());
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
    const lower = findTerm.toLowerCase();
    const idx = disasm.findIndex(
      (l) =>
        l.text?.toLowerCase().includes(lower) ||
        l.addr?.toLowerCase() === lower,
    );
    if (idx >= 0) {
      setCurrentAddr(disasm[idx].addr);
      const el = document.getElementById(`asm-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleAddNote = () => {
    if (!labEnabled || !currentAddr || !noteText.trim()) return;
    const next = [...notes, { addr: currentAddr, text: noteText.trim() }];
    setNotes(next);
    saveNotes(file, next);
    setNoteText("");
  };

  const toggleBookmark = (addr) => {
    if (!labEnabled) return;
    const next = bookmarks.includes(addr)
      ? bookmarks.filter((a) => a !== addr)
      : [...bookmarks, addr];
    setBookmarks(next);
    saveBookmarks(file, next);
  };

  const toggleLabMode = () => {
    setLabEnabled((prev) => {
      const next = !prev;
      try {
        if (next) {
          localStorage.setItem(LAB_KEY, "true");
        } else {
          localStorage.removeItem(LAB_KEY);
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const metadata = [
    arch ? { label: "Architecture", value: arch } : null,
    format ? { label: "Format", value: format } : null,
    os ? { label: "OS", value: os } : null,
  ].filter(Boolean);

  const fixtureButtons = fixtures.map((fixture) => {
    const id = getFixtureId(fixture);
    const isActive = id === getFixtureId(activeFixture);
    return (
      <button
        key={id}
        onClick={() => setFixtureId(id)}
        className={`w-full rounded px-2 py-1 text-left text-sm ${
          isActive
            ? "bg-ub-yellow text-black"
            : "bg-ub-cool-grey text-white hover:bg-ub-cool-grey/80"
        }`}
        aria-pressed={isActive}
      >
        <div className="font-semibold">{fixture.title || fixture.file}</div>
        {fixture.description && (
          <div className="text-xs opacity-80">{fixture.description}</div>
        )}
      </button>
    );
  });

  return (
    <div
      className="h-full w-full overflow-auto p-4"
      style={{ backgroundColor: "var(--r2-bg)", color: "var(--r2-text)" }}
    >
      {showGuide && <GuideOverlay onClose={() => setShowGuide(false)} />}
      <div className="flex flex-col gap-4 lg:flex-row">
        <aside
          className="flex w-full flex-col gap-3 rounded-lg border border-[var(--r2-border)] bg-[var(--r2-surface)] p-3 text-sm lg:w-72"
          aria-label="Fixture library"
        >
          <div className="flex items-center gap-3">
            <img
              src="/themes/Yaru/apps/radare2.svg"
              alt="Radare2 badge"
              className="h-12 w-12"
            />
            <div>
              <div className="text-base font-semibold">Static fixture sets</div>
              <p className="text-xs opacity-80">
                Pick a dataset to explore disassembly, strings, and control-flow graphs.
              </p>
            </div>
          </div>
          <div className="space-y-2" aria-label="Fixture list">
            {fixtureButtons.length ? fixtureButtons : <div>No fixtures bundled.</div>}
          </div>
          {metadata.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              {metadata.map((item) => (
                <React.Fragment key={item.label}>
                  <dt className="font-semibold uppercase tracking-wide text-[10px] opacity-70">
                    {item.label}
                  </dt>
                  <dd>{item.value}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
          {docLinks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide opacity-70">
                References
              </h3>
              <ul className="mt-1 space-y-1">
                {docLinks.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="flex-1 space-y-4">
          <div
            className="rounded border border-[var(--r2-border)] bg-[var(--r2-surface)] p-3"
            aria-label="Fixture summary"
          >
            <h1 className="text-lg font-semibold">{title}</h1>
            {description && <p className="text-sm opacity-80">{description}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={seekAddr}
              onChange={(e) => setSeekAddr(e.target.value)}
              placeholder="seek 0x..."
              className="rounded px-2 py-1"
              style={{
                backgroundColor: "var(--r2-surface)",
                color: "var(--r2-text)",
                border: "1px solid var(--r2-border)",
              }}
            />
            <button
              onClick={handleSeek}
              className="rounded px-3 py-1"
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
              className="rounded px-2 py-1"
              style={{
                backgroundColor: "var(--r2-surface)",
                color: "var(--r2-text)",
                border: "1px solid var(--r2-border)",
              }}
            />
            <button
              onClick={handleFind}
              className="rounded px-3 py-1"
              style={{
                backgroundColor: "var(--r2-surface)",
                border: "1px solid var(--r2-border)",
              }}
            >
              Find
            </button>
            <button
              onClick={() => setMode((m) => (m === "code" ? "graph" : "code"))}
              className="rounded px-3 py-1"
              style={{
                backgroundColor: "var(--r2-surface)",
                border: "1px solid var(--r2-border)",
                opacity: labEnabled ? 1 : 0.6,
              }}
              disabled={!labEnabled}
              title={labEnabled ? "Toggle graph view" : "Enable lab mode to open graphs"}
            >
              {mode === "code" ? "Graph" : "Code"}
            </button>
            <button
              onClick={() => setShowGuide(true)}
              className="rounded px-3 py-1"
              style={{
                backgroundColor: "var(--r2-surface)",
                border: "1px solid var(--r2-border)",
              }}
            >
              Help
            </button>
          </div>

          {mode === "graph" ? (
            labEnabled ? (
              <GraphView blocks={blocks} theme={theme} />
            ) : (
              <div
                className="rounded border border-dashed border-[var(--r2-border)] bg-[var(--r2-surface)] p-4 text-sm"
                role="status"
              >
                Enable lab mode to inspect the control-flow graph.
              </div>
            )
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,260px)]">
              <div className="grid gap-4 md:grid-cols-2">
                <HexEditor hex={hex} theme={theme} />
                <div
                  ref={disasmRef}
                  className="max-h-72 overflow-auto rounded p-1.5 font-mono"
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
                        key={`${line.addr}-${idx}`}
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
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(line.addr);
                          }}
                          className="mr-1"
                          disabled={!labEnabled}
                          title={
                            labEnabled
                              ? bookmarks.includes(line.addr)
                                ? "Remove bookmark"
                                : "Bookmark address"
                              : "Enable lab mode to bookmark"
                          }
                        >
                          {bookmarks.includes(line.addr) ? "★" : "☆"}
                        </button>
                        {line.addr}: {line.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <nav
                className="space-y-3 rounded border border-[var(--r2-border)] bg-[var(--r2-surface)] p-3"
                aria-label="Fixture navigation"
              >
                <div>
                  <h2 className="text-sm font-semibold">Function index</h2>
                  <ul className="mt-1 space-y-1 text-xs">
                    {(functionIndex.length ? functionIndex : disasm).map((fn, idx) => (
                      <li key={`fn-${fn.addr || idx}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setMode("code");
                            scrollToAddr(fn.addr || fn.text?.split(" ")[0]);
                          }}
                          className="w-full rounded bg-black/20 px-2 py-1 text-left hover:bg-black/30"
                        >
                          <div className="font-semibold">{fn.name || fn.addr || `Line ${idx + 1}`}</div>
                          {fn.summary && <div className="opacity-80">{fn.summary}</div>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                {analysisNotes.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold">Study notes</h2>
                    <ul className="mt-1 list-inside list-disc text-xs">
                      {analysisNotes.map((note, idx) => (
                        <li key={`note-${idx}`}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </nav>
            </div>
          )}

          {strings.length > 0 && (
            <div className="mt-2">
              <h2 className="text-lg">Strings</h2>
              <ul
                className="rounded p-2"
                style={{
                  backgroundColor: "var(--r2-surface)",
                  border: "1px solid var(--r2-border)",
                }}
              >
                {strings.map((s, idx) => (
                  <li key={`${s.addr}-${idx}`}>
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

          <div
            className="space-y-3 rounded border border-[var(--r2-border)] bg-[var(--r2-surface)] p-3"
            aria-label="Lab mode gate"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-sm">
                {labEnabled
                  ? "Lab mode on: bookmarks, notes, and graphs stay on this device."
                  : "Enable lab mode to unlock bookmarks, notes, and the control-flow graph."}
              </div>
              <button
                type="button"
                onClick={toggleLabMode}
                className="w-full rounded bg-ub-yellow px-3 py-1 text-sm font-semibold text-black md:w-auto"
              >
                {labEnabled ? "Disable lab mode" : "Enable lab mode"}
              </button>
            </div>
            {!labEnabled && (
              <p className="text-xs opacity-80">
                Lab mode is a local training aid. No binaries are executed and all edits remain in browser storage.
              </p>
            )}
          </div>

          {labEnabled && currentAddr && (
            <div className="mt-2">
              <h2 className="text-lg">Xrefs for {currentAddr}</h2>
              <p className="mb-2 text-sm">
                {(xrefs[currentAddr] || []).join(", ") || "None"}
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add note"
                className="w-full rounded p-2"
                style={{
                  backgroundColor: "var(--r2-surface)",
                  color: "var(--r2-text)",
                  border: "1px solid var(--r2-border)",
                }}
              />
              <button
                onClick={handleAddNote}
                className="mt-2 rounded px-3 py-1"
                style={{
                  backgroundColor: "var(--r2-surface)",
                  border: "1px solid var(--r2-border)",
                }}
              >
                Save Note
              </button>
            </div>
          )}

          {labEnabled && notes.length > 0 && (
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
      </div>
    </div>
  );
};

export default Radare2;
