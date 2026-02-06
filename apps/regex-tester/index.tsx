"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface MatchGroup {
  index: number;
  start: number;
  end: number;
  text: string;
  name?: string;
}

interface MatchResult {
  id: string;
  matchIndex: number;
  start: number;
  end: number;
  text: string;
  groups: MatchGroup[];
}

interface GroupNode extends MatchGroup {
  children: GroupNode[];
}

interface SummaryState {
  matches: number;
  groups: number;
  duration: number;
}

interface MatchPreview {
  index: number;
  snippet: string;
  groups: number;
}

const FRAME_TIME_BUDGET = 8; // milliseconds of work per frame

function sanitizeFlags(flags: string): string {
  const filtered = flags.replace(/[^a-z]/gi, "").split("");
  const unique: string[] = [];
  filtered.forEach((flag) => {
    if (!unique.includes(flag)) {
      unique.push(flag);
    }
  });
  if (!unique.includes("g")) unique.push("g");
  if (!unique.includes("d")) unique.push("d");
  return unique.join("");
}

function computeMatches(
  pattern: string,
  flags: string,
  text: string
): { matches: MatchResult[]; error: string | null } {
  if (!pattern) {
    return { matches: [], error: null };
  }

  let regex: RegExp;
  const normalizedFlags = sanitizeFlags(flags);

  try {
    regex = new RegExp(pattern, normalizedFlags);
  } catch (error) {
    return { matches: [], error: (error as Error).message };
  }

  const results: MatchResult[] = [];
  let matchIndex = 0;

  for (const match of text.matchAll(regex)) {
    if (match.index == null) {
      continue;
    }

    const full = match[0];
    const start = match.index;
    const end = start + full.length;
    const rawIndices = (match as any).indices as
      | (Array<[number, number]> & {
          groups?: Record<string, [number, number]> | undefined;
        })
      | undefined;

    const namedMap = new Map<string, string>();
    if (rawIndices?.groups) {
      Object.entries(rawIndices.groups).forEach(([name, range]) => {
        if (range) {
          namedMap.set(`${range[0]},${range[1]}`, name);
        }
      });
    }

    const groups: MatchGroup[] = [];
    if (rawIndices) {
      for (let i = 1; i < rawIndices.length; i += 1) {
        const range = rawIndices[i] as [number, number] | undefined;
        if (!range) continue;
        const [groupStart, groupEnd] = range;
        if (groupStart < 0 || groupEnd < 0) continue;
        groups.push({
          index: i,
          start: groupStart - start,
          end: groupEnd - start,
          text: text.slice(groupStart, groupEnd),
          name: namedMap.get(`${groupStart},${groupEnd}`),
        });
      }
    }

    results.push({
      id: `${start}-${end}-${matchIndex}`,
      matchIndex,
      start,
      end,
      text: full,
      groups,
    });

    if (full.length === 0) {
      regex.lastIndex = start + 1;
    }

    matchIndex += 1;
  }

  return { matches: results, error: null };
}

function buildGroupHierarchy(groups: MatchGroup[]): GroupNode[] {
  if (!groups.length) return [];

  const sorted = [...groups].sort((a, b) => {
    if (a.start === b.start) {
      return b.end - a.end;
    }
    return a.start - b.start;
  });

  const stack: GroupNode[] = [];
  const roots: GroupNode[] = [];

  sorted.forEach((group) => {
    const node: GroupNode = { ...group, children: [] };
    while (stack.length && group.start >= stack[stack.length - 1].end) {
      stack.pop();
    }
    if (!stack.length) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  });

  return roots;
}

function renderSegment(
  matchText: string,
  start: number,
  end: number,
  children: GroupNode[]
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  let cursor = start;

  children.forEach((child) => {
    if (child.start > cursor) {
      fragment.appendChild(
        document.createTextNode(matchText.slice(cursor, child.start))
      );
    }
    fragment.appendChild(renderGroup(matchText, child));
    cursor = child.end;
  });

  if (cursor < end) {
    fragment.appendChild(document.createTextNode(matchText.slice(cursor, end)));
  }

  return fragment;
}

function renderGroup(matchText: string, group: GroupNode): HTMLElement {
  const span = document.createElement("span");
  const paletteIndex = ((group.index - 1) % 6) + 1;
  span.className = `regex-group regex-group-${paletteIndex}`;
  span.dataset.groupIndex = String(group.index);
  span.dataset.label = group.name ?? `#${group.index}`;
  if (group.name) {
    span.dataset.groupName = group.name;
    span.title = `Group ${group.name}`;
  } else {
    span.title = `Group ${group.index}`;
  }

  if (group.start === group.end) {
    span.classList.add("regex-group-empty");
  }

  span.appendChild(renderSegment(matchText, group.start, group.end, group.children));
  return span;
}

function buildMatchFragment(match: MatchResult): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const roots = buildGroupHierarchy(match.groups);
  if (!roots.length) {
    fragment.appendChild(document.createTextNode(match.text));
    return fragment;
  }
  fragment.appendChild(renderSegment(match.text, 0, match.text.length, roots));
  return fragment;
}

function truncate(text: string, limit = 42): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

type HighlightJob = {
  cancel: () => void;
};

function useHighlight(
  ref: React.RefObject<HTMLDivElement>
): (text: string, matches: MatchResult[]) => Promise<number> {
  const jobRef = useRef<HighlightJob | null>(null);

  useEffect(() => {
    return () => {
      jobRef.current?.cancel();
    };
  }, []);

  return useCallback(
    (text: string, matches: MatchResult[]) => {
      if (typeof document === "undefined") {
        return Promise.resolve(0);
      }

      const element = ref.current;
      if (!element) {
        return Promise.resolve(0);
      }

      jobRef.current?.cancel();

      const root = document.createElement("span");
      root.className = "regex-output-root";
      root.textContent = text;
      element.replaceChildren(root);

      if (!matches.length) {
        const noop = Promise.resolve(0);
        jobRef.current = null;
        return noop;
      }

      const totalLength = text.length;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      walker.currentNode = root;
      let pointerNode = walker.nextNode() as Text | null;
      let pointerIndex = 0;

      const sortedMatches = matches.slice().sort((a, b) => a.start - b.start);
      const maxPerFrame = Math.max(
        1,
        Math.min(128, Math.ceil(sortedMatches.length / 4))
      );

      let resolvePromise: (value: number) => void = () => undefined;
      let settled = false;

      const promise = new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });

      const finalize = (duration: number) => {
        if (settled) return;
        settled = true;
        resolvePromise(duration);
        jobRef.current = null;
      };

      const findBoundary = (target: number): { node: Node; offset: number } => {
        if (target >= totalLength) {
          return { node: root, offset: root.childNodes.length };
        }

        while (pointerNode) {
          const value = pointerNode.nodeValue ?? "";
          const length = value.length;
          const startIndex = pointerIndex;
          const endIndex = startIndex + length;

          if (target < endIndex) {
            if (target === startIndex) {
              return { node: pointerNode, offset: 0 };
            }
            const split = pointerNode.splitText(target - startIndex);
            pointerIndex = target;
            pointerNode = split;
            walker.currentNode = split;
            return { node: split, offset: 0 };
          }

          if (target === endIndex) {
            pointerIndex = endIndex;
            pointerNode = walker.nextNode() as Text | null;
            if (pointerNode) {
              walker.currentNode = pointerNode;
              return { node: pointerNode, offset: 0 };
            }
            break;
          }

          pointerIndex = endIndex;
          pointerNode = walker.nextNode() as Text | null;
          if (pointerNode) {
            walker.currentNode = pointerNode;
          }
        }

        return { node: root, offset: root.childNodes.length };
      };

      const applyMatch = (match: MatchResult) => {
        const startBoundary = findBoundary(match.start);
        const endBoundary = findBoundary(match.end);

        const referenceNode =
          endBoundary.node === root
            ? root.childNodes[endBoundary.offset] ?? null
            : endBoundary.node;

        const nodesToRemove: Node[] = [];
        let current: Node | null = startBoundary.node;
        while (current && current !== referenceNode) {
          const next = current.nextSibling;
          nodesToRemove.push(current);
          current = next;
        }

        const mark = document.createElement("mark");
        mark.className = "regex-match";
        mark.dataset.index = String(match.matchIndex + 1);
        mark.dataset.groups = String(match.groups.length);
        mark.dataset.start = String(match.start);
        mark.dataset.end = String(match.end);
        if (!match.text.length) {
          mark.classList.add("regex-match-empty");
        }

        if (referenceNode) {
          root.insertBefore(mark, referenceNode);
        } else {
          root.appendChild(mark);
        }

        nodesToRemove.forEach((node) => {
          if (node.parentNode === root) {
            root.removeChild(node);
          }
        });

        const fragment = buildMatchFragment(match);
        if (!fragment.childNodes.length) {
          const placeholder = document.createElement("span");
          placeholder.className = "regex-zero-width";
          placeholder.setAttribute("aria-hidden", "true");
          placeholder.textContent = "▏";
          mark.appendChild(placeholder);
        } else {
          mark.appendChild(fragment);
        }
      };

      const startTime = performance.now();
      let cursor = 0;
      let frameId: number;

      const processFrame = () => {
        const frameStart = performance.now();
        let processed = 0;
        while (cursor < sortedMatches.length && processed < maxPerFrame) {
          applyMatch(sortedMatches[cursor]);
          cursor += 1;
          processed += 1;
          if (performance.now() - frameStart > FRAME_TIME_BUDGET) {
            break;
          }
        }

        if (cursor < sortedMatches.length) {
          frameId = requestAnimationFrame(processFrame);
        } else {
          finalize(Math.max(0, performance.now() - startTime));
        }
      };

      frameId = requestAnimationFrame(processFrame);

      jobRef.current = {
        cancel: () => {
          cancelAnimationFrame(frameId);
          finalize(Math.max(0, performance.now() - startTime));
        },
      };

      return promise;
    },
    [ref]
  );
}

const RegexTesterApp: React.FC = () => {
  const [pattern, setPattern] = useState("error");
  const [flags, setFlags] = useState("gi");
  const [input, setInput] = useState(
    [
      "Paste logs or payloads here to test your pattern.",
      "Try capturing groups with (?<name>...) syntax.",
      "Matches render live with group highlights.",
    ].join("\n")
  );
  const [summary, setSummary] = useState<SummaryState>({
    matches: 0,
    groups: 0,
    duration: 0,
  });
  const [previews, setPreviews] = useState<MatchPreview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const displayRef = useRef<HTMLDivElement>(null);
  const highlight = useHighlight(displayRef);
  const pendingFrame = useRef<number | null>(null);
  const evaluationId = useRef(0);

  const runEvaluation = useCallback(() => {
    const currentId = ++evaluationId.current;

    const start = performance.now();
    const { matches, error: compileError } = computeMatches(
      pattern,
      flags,
      input
    );
    const computeDuration = performance.now() - start;

    if (compileError) {
      setError(compileError);
      setSummary({ matches: 0, groups: 0, duration: Number(computeDuration.toFixed(2)) });
      setPreviews([]);
      highlight(input, []);
      return;
    }

    setError(null);
    const groupsCount = matches.reduce(
      (acc, match) => acc + match.groups.length,
      0
    );
    const topMatches = matches.slice(0, 8).map((match) => ({
      index: match.matchIndex + 1,
      snippet: truncate(match.text),
      groups: match.groups.length,
    }));

    highlight(input, matches).then((paintDuration) => {
      if (evaluationId.current !== currentId) {
        return;
      }
      const totalDuration = Number(
        (computeDuration + paintDuration).toFixed(2)
      );
      setSummary({
        matches: matches.length,
        groups: groupsCount,
        duration: totalDuration,
      });
      setPreviews(topMatches);
    });
  }, [flags, highlight, input, pattern]);

  useEffect(() => {
    if (pendingFrame.current) {
      cancelAnimationFrame(pendingFrame.current);
    }
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      runEvaluation();
    });

    return () => {
      if (pendingFrame.current) {
        cancelAnimationFrame(pendingFrame.current);
        pendingFrame.current = null;
      }
    };
  }, [pattern, flags, input, runEvaluation]);

  const summaryLabel = useMemo(() => {
    const matchLabel = summary.matches === 1 ? "match" : "matches";
    const groupLabel = summary.groups === 1 ? "group" : "groups";
    return `${summary.matches} ${matchLabel} • ${summary.groups} ${groupLabel} • ${summary.duration.toFixed(2)} ms`;
  }, [summary]);

  return (
    <div className="regex-tester" aria-live="polite">
      <header className="regex-header">
        <h1 className="regex-title">Regex Live Tester</h1>
        <p className="regex-subtitle">
          Evaluate JavaScript regular expressions with incremental highlighting
          for matches and capturing groups. Updates are throttled with
          requestAnimationFrame to keep large inputs responsive.
        </p>
      </header>

      <section className="regex-controls" aria-label="Pattern configuration">
        <div className="regex-field">
          <label htmlFor="regex-pattern">Pattern</label>
          <input
            id="regex-pattern"
            name="pattern"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="Enter regex, e.g. (?<code>ERR\\d{3})"
            autoComplete="off"
          />
        </div>
        <div className="regex-field">
          <label htmlFor="regex-flags">Flags</label>
          <input
            id="regex-flags"
            name="flags"
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
            placeholder="Flags such as gimuy"
            autoComplete="off"
          />
        </div>
      </section>

      <section className="regex-input" aria-label="Test input">
        <label htmlFor="regex-source" className="sr-only">
          Test input
        </label>
        <textarea
          id="regex-source"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          spellCheck={false}
          aria-label="Regex test input"
        />
      </section>

      <section className="regex-summary" data-testid="regex-summary" data-duration={summary.duration} data-matches={summary.matches} data-groups={summary.groups}>
        <div className="summary-line">{summaryLabel}</div>
        {error && (
          <div className="summary-error" role="alert">
            {error}
          </div>
        )}
        {!error && previews.length > 0 && (
          <ul className="summary-list">
            {previews.map((match) => (
              <li key={match.index}>
                <span className="summary-index">#{match.index}</span>
                <span className="summary-snippet">{match.snippet}</span>
                <span className="summary-groups">
                  {match.groups}{" "}
                  {match.groups === 1 ? "group" : "groups"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="regex-preview" aria-label="Regex highlight preview">
        <div ref={displayRef} className="regex-output" role="region" aria-live="polite" />
      </section>

      <style jsx>{`
        .regex-tester {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          height: 100%;
          padding: 1rem;
        }

        .regex-header {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .regex-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .regex-subtitle {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .regex-controls {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .regex-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 220px;
          flex: 1;
        }

        .regex-field label {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.65);
        }

        .regex-field input {
          background: rgba(10, 18, 36, 0.85);
          border: 1px solid rgba(0, 136, 255, 0.35);
          color: inherit;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-family: "Fira Code", "Source Code Pro", monospace;
        }

        .regex-field input:focus {
          outline: none;
          border-color: rgba(0, 212, 255, 0.8);
          box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.25);
        }

        .regex-input textarea {
          width: 100%;
          min-height: 200px;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          resize: vertical;
          font-family: "Fira Code", "Source Code Pro", monospace;
          line-height: 1.4;
          background: rgba(8, 16, 24, 0.85);
          border: 1px solid rgba(0, 120, 255, 0.35);
          color: inherit;
        }

        .regex-input textarea:focus {
          outline: none;
          border-color: rgba(0, 212, 255, 0.8);
          box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.25);
        }

        .regex-summary {
          background: rgba(6, 12, 24, 0.8);
          border: 1px solid rgba(0, 100, 255, 0.3);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .summary-line {
          font-weight: 600;
        }

        .summary-error {
          color: #ff6b6b;
        }

        .summary-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0.35rem;
        }

        .summary-list li {
          display: flex;
          gap: 0.5rem;
          align-items: baseline;
          font-family: "Fira Code", "Source Code Pro", monospace;
          background: rgba(0, 136, 255, 0.08);
          border-radius: 0.5rem;
          padding: 0.35rem 0.5rem;
        }

        .summary-index {
          color: rgba(0, 212, 255, 0.9);
          font-weight: 600;
        }

        .summary-snippet {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summary-groups {
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.85rem;
        }

        .regex-preview {
          flex: 1;
          min-height: 200px;
          background: rgba(4, 10, 18, 0.8);
          border-radius: 0.75rem;
          border: 1px solid rgba(0, 90, 255, 0.35);
          padding: 0.75rem 1rem;
          overflow: auto;
        }

        .regex-output {
          white-space: pre-wrap;
          font-family: "Fira Code", "Source Code Pro", monospace;
          line-height: 1.5;
        }

        .regex-match {
          background: rgba(0, 168, 255, 0.2);
          border-bottom: 2px solid rgba(0, 200, 255, 0.55);
          padding: 0 0.05rem;
          position: relative;
          border-radius: 0.25rem;
        }

        .regex-match::after {
          content: attr(data-index);
          position: absolute;
          top: -1.1rem;
          left: 0;
          font-size: 0.65rem;
          color: rgba(0, 212, 255, 0.8);
        }

        .regex-match-empty {
          border-bottom-style: dotted;
        }

        .regex-zero-width {
          display: inline-block;
          width: 0.4rem;
          text-align: center;
          color: rgba(0, 212, 255, 0.8);
        }

        .regex-group {
          background: rgba(255, 255, 255, 0.08);
          border: 1px dashed rgba(255, 255, 255, 0.35);
          border-radius: 0.25rem;
          padding: 0 0.1rem;
          position: relative;
        }

        .regex-group::before {
          content: attr(data-label);
          position: absolute;
          top: -1.05rem;
          left: 0;
          font-size: 0.6rem;
          color: rgba(255, 255, 255, 0.65);
          background: rgba(4, 10, 18, 0.9);
          padding: 0 0.25rem;
          border-radius: 0.25rem;
          white-space: nowrap;
        }

        .regex-group.regex-group-empty {
          border-style: dotted;
        }

        .regex-group-1 {
          background: rgba(255, 214, 0, 0.18);
          border-color: rgba(255, 214, 0, 0.55);
        }

        .regex-group-2 {
          background: rgba(154, 230, 180, 0.18);
          border-color: rgba(154, 230, 180, 0.55);
        }

        .regex-group-3 {
          background: rgba(255, 179, 186, 0.2);
          border-color: rgba(255, 179, 186, 0.55);
        }

        .regex-group-4 {
          background: rgba(196, 181, 253, 0.2);
          border-color: rgba(196, 181, 253, 0.55);
        }

        .regex-group-5 {
          background: rgba(250, 214, 165, 0.2);
          border-color: rgba(250, 214, 165, 0.55);
        }

        .regex-group-6 {
          background: rgba(178, 235, 242, 0.2);
          border-color: rgba(178, 235, 242, 0.55);
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @media (max-width: 640px) {
          .regex-tester {
            padding: 0.75rem;
          }
          .regex-match::after,
          .regex-group::before {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default RegexTesterApp;
