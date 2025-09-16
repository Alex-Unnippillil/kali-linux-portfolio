"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  group?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandPaletteItem[];
}

interface MatchResult {
  matches: number[];
  score: number;
}

interface RankedCommand {
  command: CommandPaletteItem;
  matches: number[];
  score: number;
}

function fuzzyMatch(text: string, query: string): MatchResult | null {
  if (!text) return null;
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  let searchIndex = 0;
  let score = 0;
  const matches: number[] = [];
  let previousMatch = -1;

  for (let i = 0; i < needle.length; i += 1) {
    const char = needle[i];
    const foundIndex = haystack.indexOf(char, searchIndex);
    if (foundIndex === -1) {
      return null;
    }

    matches.push(foundIndex);

    if (foundIndex === searchIndex) {
      score += 6;
    }
    if (foundIndex === 0 || /[\s_\-./]/.test(haystack[foundIndex - 1] ?? "")) {
      score += 8;
    }
    if (foundIndex === previousMatch + 1) {
      score += 12;
    }

    const distance = foundIndex - searchIndex;
    score += Math.max(1, 5 - distance);

    searchIndex = foundIndex + 1;
    previousMatch = foundIndex;
  }

  const firstMatch = matches[0] ?? 0;
  const lastMatch = matches[matches.length - 1] ?? firstMatch;
  score += Math.max(0, 12 - firstMatch);
  score += Math.max(0, 6 - (haystack.length - lastMatch - 1));

  return { matches, score };
}

function highlightLabel(label: string, matches: number[]): ReactNode {
  if (!matches.length) return label;
  const segments: ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i];
    let end = start;
    while (i + 1 < matches.length && matches[i + 1] === end + 1) {
      i += 1;
      end = matches[i];
    }

    if (start > cursor) {
      segments.push(<span key={`text-${start}`}>{label.slice(cursor, start)}</span>);
    }
    segments.push(
      <mark key={`match-${start}`} className="rounded bg-white/20 px-0.5 text-white">
        {label.slice(start, end + 1)}
      </mark>,
    );
    cursor = end + 1;
  }

  if (cursor < label.length) {
    segments.push(<span key="tail">{label.slice(cursor)}</span>);
  }

  return segments;
}

export default function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const titleId = `${baseId}-title`;
  const instructionsId = `${baseId}-instructions`;
  const resultsId = `${baseId}-results`;

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.replace(/\s+/g, " ");

  const rankedCommands = useMemo(() => {
    if (!normalizedQuery) {
      return commands.map((command) => ({ command, matches: [] as number[], score: 0 }));
    }

    const results: RankedCommand[] = [];
    commands.forEach((command) => {
      const labelMatch = fuzzyMatch(command.label, normalizedQuery);
      const keywordSource = `${command.keywords?.join(" ") ?? ""} ${command.description ?? ""} ${command.group ?? ""}`.trim();
      const keywordMatch = keywordSource ? fuzzyMatch(keywordSource, normalizedQuery) : null;

      if (labelMatch) {
        const extra = keywordMatch ? Math.min(keywordMatch.score, 30) : 0;
        results.push({ command, matches: labelMatch.matches, score: 200 + labelMatch.score + extra });
      } else if (keywordMatch) {
        results.push({ command, matches: [], score: 100 + keywordMatch.score });
      }
    });

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.command.label.localeCompare(b.command.label);
    });

    return results;
  }, [commands, normalizedQuery]);

  const hasResults = rankedCommands.length > 0;
  const activeOptionId = hasResults ? `${listId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery]);

  useEffect(() => {
    if (!hasResults) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((index) => {
      if (index >= rankedCommands.length) {
        return rankedCommands.length - 1;
      }
      return index;
    });
  }, [hasResults, rankedCommands.length]);

  useEffect(() => {
    if (!isOpen || !hasResults) return;
    const list = listRef.current;
    if (!list) return;
    const element = list.querySelector<HTMLElement>(`[data-command-index="${activeIndex}"]`);
    element?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, hasResults, isOpen, rankedCommands]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const executeCommand = useCallback(
    (command: CommandPaletteItem) => {
      if (!command) return;
      onClose();
      setTimeout(() => {
        try {
          command.action();
        } catch (error) {
          console.error("Command execution failed", error);
        }
      }, 0);
    },
    [onClose],
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!hasResults && event.key === "Enter") {
        event.preventDefault();
        return;
      }
      if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
        event.preventDefault();
        if (!hasResults) return;
        setActiveIndex((index) => (index + 1) % rankedCommands.length);
      } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
        event.preventDefault();
        if (!hasResults) return;
        setActiveIndex((index) => (index - 1 + rankedCommands.length) % rankedCommands.length);
      } else if (event.key === "Home") {
        event.preventDefault();
        if (!hasResults) return;
        setActiveIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        if (!hasResults) return;
        setActiveIndex(rankedCommands.length - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const selected = rankedCommands[activeIndex];
        if (selected) {
          executeCommand(selected.command);
        }
      }
    },
    [activeIndex, executeCommand, hasResults, rankedCommands],
  );

  const handleOverlayMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === overlayRef.current) {
        event.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm"
      onMouseDown={handleOverlayMouseDown}
      role="presentation"
    >
      <div className="mx-auto mt-24 w-full max-w-2xl px-4 md:px-0" role="presentation">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={instructionsId}
          className="rounded-2xl border border-white/10 bg-ub-cool-grey text-white shadow-2xl"
        >
          <div className="border-b border-white/10 px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h2 id={titleId} className="text-lg font-semibold">
                Command palette
              </h2>
              <span className="text-xs uppercase tracking-wide text-white/60">Ctrl / Cmd + K</span>
            </div>
            <p id={instructionsId} className="sr-only">
              Type to filter commands. Use the arrow keys to move through the results and press Enter to run the highlighted
              command.
            </p>
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-black/40 px-3 py-2">
              <span aria-hidden="true" className="text-sm text-white/50">
                /
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                type="text"
                placeholder="Search commands…"
                className="w-full bg-transparent text-base text-white placeholder:text-white/50 focus:outline-none"
                role="combobox"
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded={true}
                aria-activedescendant={activeOptionId}
                aria-describedby={`${instructionsId} ${resultsId}`.trim()}
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto" role="presentation">
            <ul ref={listRef} id={listId} role="listbox" aria-label="Command results" className="py-2">
              {rankedCommands.map((item, index) => {
                const { command, matches } = item;
                const optionId = `${listId}-option-${index}`;
                return (
                  <li key={command.id} role="presentation">
                    <button
                      type="button"
                      id={optionId}
                      role="option"
                      aria-selected={index === activeIndex}
                      data-command-index={index}
                      className={`flex w-full items-start justify-between gap-4 px-5 py-3 text-left transition-colors focus:outline-none ${
                        index === activeIndex ? "bg-white/15" : "hover:bg-white/10"
                      }`}
                      onClick={() => executeCommand(command)}
                      onMouseMove={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                    >
                      <span className="flex-1 text-sm">
                        <span className="font-medium text-white">
                          {highlightLabel(command.label, matches)}
                        </span>
                        {command.description && (
                          <span className="mt-1 block text-xs text-white/70">{command.description}</span>
                        )}
                      </span>
                      {command.group && (
                        <span className="text-xs uppercase tracking-wide text-white/40">{command.group}</span>
                      )}
                    </button>
                  </li>
                );
              })}
              {!rankedCommands.length && (
                <li className="px-5 py-4 text-sm text-white/60">No commands found.</li>
              )}
            </ul>
          </div>
          <div className="border-t border-white/10 px-5 py-3 text-xs text-white/60" role="presentation">
            <span id={resultsId} aria-live="polite" role="status">
              {hasResults
                ? `${rankedCommands.length} command${rankedCommands.length === 1 ? "" : "s"} available.`
                : "No matching commands."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
