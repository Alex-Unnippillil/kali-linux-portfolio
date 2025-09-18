'use client';

import { useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import ExplainView from './components/ExplainView';

type MatchInfo = {
  match: string;
  index: number;
  groups: (string | undefined)[];
  namedGroups: Record<string, string | undefined>;
};

type EvaluationResult =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | {
      status: 'ready' | 'success';
      regex: RegExp;
      normalizedFlags: string;
      matches: MatchInfo[];
    };

const DEFAULT_PATTERN = String.raw`^(?<word>[A-Za-z]+)-(\d+)$`;
const DEFAULT_FLAGS = 'g';
const DEFAULT_TEST_TEXT = String.raw`server-01
alpha-10
beta-7`;

const formatMatchValue = (value: string | undefined): string => {
  if (value === undefined) {
    return '—';
  }

  return value
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
};

const RegexTesterPane: React.FC = () => {
  const [pattern, setPattern] = useState<string>(DEFAULT_PATTERN);
  const [flags, setFlags] = useState<string>(DEFAULT_FLAGS);
  const [testText, setTestText] = useState<string>(DEFAULT_TEST_TEXT);

  const evaluation = useMemo<EvaluationResult>(() => {
    if (!pattern) {
      return { status: 'idle' };
    }

    try {
      const regex = new RegExp(pattern, flags);
      if (!testText) {
        return { status: 'ready', regex, normalizedFlags: regex.flags, matches: [] };
      }

      const iteratorRegex = regex.global ? regex : new RegExp(pattern, `${regex.flags}g`);
      const matches = Array.from(testText.matchAll(iteratorRegex)).map((match) => ({
        match: match[0],
        index: match.index ?? 0,
        groups: match.slice(1),
        namedGroups: { ...(match.groups ?? {}) },
      }));

      return { status: 'success', regex, normalizedFlags: regex.flags, matches };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid pattern';
      return { status: 'error', message };
    }
  }, [pattern, flags, testText]);

  const explainFlags =
    evaluation.status === 'success' || evaluation.status === 'ready'
      ? evaluation.normalizedFlags
      : flags;

  return (
    <div className="grid h-full gap-4 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100">
        <header>
          <h1 className="text-2xl font-semibold text-slate-100">Regex tester</h1>
          <p className="text-sm text-slate-400">
            Try JavaScript-compatible regular expressions without executing commands or sending any
            requests.
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="regex-pattern" className="block text-sm font-medium text-slate-200">
              Pattern
            </label>
            <input
              id="regex-pattern"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-slate-100 focus:border-sky-400 focus:outline-none"
              placeholder="Enter a regex pattern"
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-slate-500">
              Use JavaScript syntax. Do not include surrounding <code>/</code> delimiters.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
            <div>
              <label htmlFor="regex-flags" className="block text-sm font-medium text-slate-200">
                Flags
              </label>
              <input
                id="regex-flags"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-slate-100 focus:border-sky-400 focus:outline-none"
                placeholder="Example: gimsv"
                value={flags}
                onChange={(event) => setFlags(event.target.value)}
                spellCheck={false}
              />
              <p className="mt-1 text-xs text-slate-500">Duplicates will raise an error.</p>
            </div>
            {evaluation.status === 'success' || evaluation.status === 'ready' ? (
              <div className="rounded border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-300">
                <p className="font-semibold text-sky-200">Normalized regex</p>
                <code className="mt-1 block font-mono text-emerald-200">{evaluation.regex.toString()}</code>
                <p className="mt-1 text-slate-400">
                  Flags resolved to <span className="font-semibold text-slate-200">{evaluation.normalizedFlags || 'none'}</span>.
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <label htmlFor="regex-test-text" className="block text-sm font-medium text-slate-200">
              Test string
            </label>
            <textarea
              id="regex-test-text"
              className="mt-1 h-40 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-slate-100 focus:border-sky-400 focus:outline-none"
              placeholder="Paste the content you want to test"
              value={testText}
              onChange={(event) => setTestText(event.target.value)}
            />
          </div>
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Matches</h2>
            <p className="text-xs text-slate-500">
              Evaluate your pattern against the test string. Results update automatically as you type.
            </p>
          </div>

          {evaluation.status === 'idle' ? (
            <p className="text-sm text-slate-400">Enter a pattern to begin.</p>
          ) : evaluation.status === 'error' ? (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              <p className="font-semibold">Invalid regular expression</p>
              <p className="mt-1 whitespace-pre-wrap text-red-100">{evaluation.message}</p>
            </div>
          ) : !testText ? (
            <p className="text-sm text-slate-400">Add a test string to search for matches.</p>
          ) : evaluation.matches.length === 0 ? (
            <p className="text-sm text-slate-400">No matches found.</p>
          ) : (
            <div className="space-y-2">
              {evaluation.matches.map((match, index) => (
                <div key={`${match.index}-${match.match}-${index}`} className="rounded border border-slate-700 bg-slate-800/60 p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-sky-200">Match {index + 1}</span>
                    <span>Index {match.index}</span>
                  </div>
                  <code className="mt-2 block rounded bg-slate-900 px-2 py-1 font-mono text-emerald-200">
                    {formatMatchValue(match.match)}
                  </code>

                  {match.groups.length ? (
                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      {match.groups.map((value, groupIndex) => (
                        <div key={groupIndex} className="flex items-center justify-between gap-4">
                          <span>Group {groupIndex + 1}</span>
                          <code className="rounded bg-slate-900 px-1 py-0.5 font-mono text-emerald-200">
                            {formatMatchValue(value)}
                          </code>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {Object.keys(match.namedGroups).length ? (
                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      {Object.entries(match.namedGroups).map(([name, value]) => (
                        <div key={name} className="flex items-center justify-between gap-4">
                          <span>Group "{name}"</span>
                          <code className="rounded bg-slate-900 px-1 py-0.5 font-mono text-emerald-200">
                            {formatMatchValue(value)}
                          </code>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="min-h-0">
        <ExplainView pattern={pattern} flags={explainFlags} />
      </div>
    </div>
  );
};

const RegexTesterApp: React.FC = () => {
  const counterRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = `${Date.now()}-${counterRef.current}`;
    const tabLabel = `Tester ${counterRef.current}`;
    counterRef.current += 1;

    return { id, title: tabLabel, content: <RegexTesterPane /> };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-950 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default RegexTesterApp;
