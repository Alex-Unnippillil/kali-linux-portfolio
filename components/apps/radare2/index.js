import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import SimulationBanner from "../SimulationBanner";
import Tabs from "./components/Tabs";
import InspectorSidebar from "./components/InspectorSidebar";
import DisassemblyPanel from "./components/DisassemblyPanel";
import OverviewPanel from "./components/OverviewPanel";
import NotesPanel from "./components/NotesPanel";
import { formatAddress, normalizeAddress } from "./addressUtils";

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

const TAB_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "disassembly", label: "Disassembly" },
  { id: "hex", label: "Hex" },
  { id: "graph", label: "Graph" },
  { id: "notes", label: "Notes" },
];

const Radare2 = ({ initialData = {} }) => {
  const {
    file = "demo",
    hex = "",
    disasm = [],
    xrefs = {},
    blocks = [],
  } = initialData;
  const [activeTab, setActiveTab] = useState("overview");
  const [currentAddr, setCurrentAddr] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const [strings, setStrings] = useState([]);
  const [activeHeuristic, setActiveHeuristic] = useState(null);
  const [patches, setPatches] = useState([]);
  const { theme } = useTheme();

  const themeTokens = useMemo(() => {
    const themeMarker = theme ?? "default";
    if (typeof window === "undefined") {
      return {
        bg: "var(--kali-bg)",
        panel: "var(--kali-panel)",
        border: "var(--kali-border)",
        accent: "var(--kali-blue)",
        text: "var(--kali-text)",
        highlight: "var(--kali-panel-highlight)",
        muted: "var(--kali-panel-border)",
        accentForeground:
          themeMarker === "light" ? "var(--kali-bg)" : "var(--kali-bg-solid)",
      };
    }

    const style = getComputedStyle(document.documentElement);
    const readToken = (token, fallback) => {
      const value = style.getPropertyValue(token).trim();
      return value || fallback;
    };

    return {
      bg: readToken("--kali-bg", "rgba(9, 15, 23, 0.9)"),
      panel: readToken("--kali-panel", "rgba(17, 27, 36, 0.92)"),
      border: readToken("--kali-border", "rgba(15, 148, 210, 0.18)"),
      accent: readToken("--kali-blue", "#0f94d2"),
      text: readToken("--kali-text", "#f5faff"),
      highlight: readToken("--kali-panel-highlight", "rgba(15, 148, 210, 0.06)"),
      muted: readToken("--kali-panel-border", "rgba(148, 163, 184, 0.65)"),
      accentForeground:
        themeMarker === "light"
          ? readToken("--kali-bg", "rgba(9, 15, 23, 0.9)")
          : readToken("--kali-bg-solid", "#0b121a"),
    };
  }, [theme]);

  const warningPalette = useMemo(() => {
    const borderColor = themeTokens.border;
    const panelColor = themeTokens.panel;
    const accentColor = themeTokens.accent;

    return {
      border: `color-mix(in srgb, ${accentColor} 35%, ${borderColor})`,
      surface: `color-mix(in srgb, ${borderColor} 35%, ${panelColor})`,
      overlay: `color-mix(in srgb, ${accentColor} 18%, transparent)`,
      badge: `color-mix(in srgb, ${accentColor} 24%, ${panelColor})`,
    };
  }, [themeTokens.accent, themeTokens.border, themeTokens.panel]);

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
    const normalized = formatAddress(base) || base;
    setStrings(extractStrings(hex, normalized));
  }, [hex, disasm]);

  const scrollToAddr = useCallback(
    (addr) => {
      const normalized = normalizeAddress(addr) || addr;
      const idx = lineIndexByAddr.get(normalized.toLowerCase());
      if (idx === undefined) return;
      const resolvedAddr = disasm[idx]?.addr;
      if (!resolvedAddr) return;
      setCurrentAddr(resolvedAddr);
      setSelectedLine(disasm[idx]);
      if (typeof document !== "undefined") {
        const el = document.getElementById(getLineElementId(resolvedAddr));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    },
    [disasm, lineIndexByAddr],
  );

  const handleAddNote = (addr, text) => {
    const next = [...notes, { addr, text }];
    setNotes(next);
    saveNotes(file, next);
  };

  const toggleBookmark = (addr) => {
    const next = bookmarks.includes(addr)
      ? bookmarks.filter((a) => a !== addr)
      : [...bookmarks, addr];
    setBookmarks(next);
    saveBookmarks(file, next);
  };

  const baseAddr = disasm[0]?.addr || "0x0";
  const activeFilterLabel = activeHeuristicMeta
    ? `${activeHeuristicMeta.label} (${activeHeuristicMeta.matches.length})`
    : "None";

  return (
    <div
      className="h-full w-full p-6 overflow-auto"
      style={{ backgroundColor: themeTokens.bg, color: themeTokens.text }}
    >
      {showGuide && <GuideOverlay onClose={() => setShowGuide(false)} />}
      <SimulationBanner toolName="Radare2" />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <img
          src="/themes/Yaru/apps/radare2.svg"
          alt="Radare2 badge"
          className="w-12 h-12"
        />
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">Radare2 Workspace</h1>
          <span className="text-xs opacity-70">
            Simulated analysis on {file}
          </span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowGuide(true)}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: themeTokens.panel,
            color: themeTokens.text,
            border: `1px solid ${themeTokens.border}`,
          }}
        >
          Help
        </button>
      </div>

      <Tabs tabs={TAB_ITEMS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-4 flex flex-col xl:flex-row gap-4 items-start">
        <main className="flex-1 space-y-4">
          {activeTab === "overview" && (
            <OverviewPanel
              consoleMessages={consoleMessages}
              strings={strings}
              onJump={scrollToAddr}
              xrefs={xrefs}
              currentAddr={currentAddr}
              themeTokens={themeTokens}
              warningPalette={warningPalette}
            />
          )}
          {activeTab === "disassembly" && (
            <DisassemblyPanel
              filteredDisasm={filteredDisasm}
              currentAddr={currentAddr}
              selectedLine={selectedLine}
              onSelectAddr={setCurrentAddr}
              onSelectLine={setSelectedLine}
              bookmarks={bookmarks}
              toggleBookmark={toggleBookmark}
              activeHeuristic={activeHeuristic}
              setActiveHeuristic={setActiveHeuristic}
              heuristicMatches={heuristicMatches}
              lineWarnings={lineWarnings}
              warningPalette={warningPalette}
              themeTokens={themeTokens}
              lineIndexByAddr={lineIndexByAddr}
              onScrollToAddr={scrollToAddr}
              lineIdForAddr={getLineElementId}
            />
          )}
          {activeTab === "hex" && (
            <div id="tab-panel-hex" role="tabpanel">
              <HexEditor
                hex={hex}
                theme={theme}
                file={file}
                baseAddress={baseAddr}
                onPatchesChange={setPatches}
                onSelectAddress={scrollToAddr}
              />
            </div>
          )}
          {activeTab === "graph" && (
            <div id="tab-panel-graph" role="tabpanel">
              <div
                className="rounded-xl border p-4"
                style={{
                  backgroundColor: themeTokens.panel,
                  border: `1px solid ${themeTokens.border}`,
                }}
              >
                <GraphView blocks={blocks} theme={theme} />
              </div>
            </div>
          )}
          {activeTab === "notes" && (
            <NotesPanel
              currentAddr={currentAddr}
              notes={notes}
              onAddNote={handleAddNote}
              themeTokens={themeTokens}
            />
          )}
        </main>

        <InspectorSidebar
          file={file}
          selectedAddress={currentAddr}
          selectedLine={selectedLine}
          bookmarkCount={bookmarks.length}
          patchCount={patches.length}
          activeFilter={activeFilterLabel}
        />
      </div>
    </div>
  );
};

export default Radare2;
