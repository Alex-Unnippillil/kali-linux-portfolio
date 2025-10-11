'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type {
  CommandScenario,
  LabFixturesData,
  ResultCard,
  WordlistFixture,
} from '../lib/fixtures';
import { buildSafeCommand } from '../lib/fixtures';

interface Props {
  fixtures: LabFixturesData;
}

const renderWordlist = (wordlist: WordlistFixture) => (
  <li key={wordlist.id} className="rounded border border-white/10 p-3">
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{wordlist.name}</h3>
        <span className="text-[11px] uppercase tracking-wide text-blue-200">
          {wordlist.source}
        </span>
      </div>
      <p className="text-xs text-gray-200">{wordlist.description}</p>
      <div className="text-[11px] text-gray-300">
        Fixture: <code>{wordlist.fixturePath}</code>
      </div>
      <a
        href={wordlist.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-ub-accent underline"
      >
        Dataset source
      </a>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-gray-100">
          Preview entries ({wordlist.entries.length})
        </summary>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-gray-200 sm:grid-cols-3">
          {wordlist.entries.map((entry) => (
            <li key={entry} className="rounded bg-black/40 px-1 py-0.5">
              {entry}
            </li>
          ))}
        </ul>
      </details>
    </div>
  </li>
);

const LabPanels: React.FC<Props> = ({ fixtures }) => {
  const [scenarioId, setScenarioId] = useState<string>(
    fixtures.commands[0]?.id ?? ''
  );
  const [wordlistId, setWordlistId] = useState<string | undefined>(
    fixtures.commands[0]?.wordlistId
  );

  useEffect(() => {
    const scenario = fixtures.commands.find((item) => item.id === scenarioId);
    if (scenario) {
      setWordlistId(scenario.wordlistId);
    }
  }, [scenarioId, fixtures.commands]);

  const scenario: CommandScenario | undefined = useMemo(
    () => fixtures.commands.find((item) => item.id === scenarioId),
    [fixtures.commands, scenarioId]
  );

  const commandPreview = useMemo(() => {
    if (!scenario) return '';
    return buildSafeCommand(scenario, fixtures.wordlists, wordlistId);
  }, [scenario, fixtures.wordlists, wordlistId]);

  const wordlistOptions = useMemo(
    () =>
      fixtures.wordlists.map((w) => ({
        id: w.id,
        label: w.name,
      })),
    [fixtures.wordlists]
  );

  const relatedResults = useMemo(() => {
    if (!scenario) return fixtures.results;
    const scoped = fixtures.results.filter(
      (result) => result.relatedCommand === scenario.id
    );
    return scoped.length > 0 ? scoped : fixtures.results;
  }, [fixtures.results, scenario]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-950 text-white">
      <div className="flex-1 space-y-6 overflow-y-auto p-4 text-sm">
        <section>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Wordlist fixtures</h2>
            <span className="text-[11px] uppercase tracking-wide text-gray-300">
              Lab only
            </span>
          </header>
          <p className="text-xs text-gray-200">
            Curated excerpts keep the keyspace small for workshops. Download the
            fixtures locally or reference them via the safe command builder.
          </p>
          <ul className="mt-3 space-y-3">
            {fixtures.wordlists.map(renderWordlist)}
          </ul>
        </section>

        <section>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Safe command builder</h2>
            <span className="text-[11px] uppercase tracking-wide text-gray-300">
              Simulation
            </span>
          </header>
          {fixtures.commands.length === 0 ? (
            <p className="text-xs text-gray-300">No scenarios available.</p>
          ) : (
            <div className="space-y-3 text-xs">
              <label className="flex flex-col gap-1">
                <span>Scenario</span>
                <select
                  value={scenarioId}
                  onChange={(event) => setScenarioId(event.target.value)}
                  className="rounded bg-gray-800 p-2 text-sm text-white"
                >
                  {fixtures.commands.map((command) => (
                    <option key={command.id} value={command.id}>
                      {command.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span>Wordlist</span>
                <select
                  value={wordlistId}
                  onChange={(event) => setWordlistId(event.target.value)}
                  className="rounded bg-gray-800 p-2 text-sm text-white"
                >
                  {wordlistOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {scenario && (
                <div className="space-y-2">
                  <p className="text-gray-200">{scenario.description}</p>
                  <code className="block overflow-x-auto rounded bg-black/60 p-3 text-[11px] text-green-200">
                    {commandPreview}
                  </code>
                  <ul className="space-y-1 text-[11px] text-gray-300">
                    {scenario.notes.map((note, index) => (
                      <li key={index} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Result interpretation</h2>
            <span className="text-[11px] uppercase tracking-wide text-gray-300">
              Guidance
            </span>
          </header>
          <p className="text-xs text-gray-200">
            Compare expected console output against the interpretation cards to
            reinforce what each stage communicates during a run.
          </p>
          <div className="mt-3 space-y-4">
            {relatedResults.map((result: ResultCard) => (
              <details
                key={result.id}
                className="overflow-hidden rounded border border-white/10 bg-black/40"
              >
                <summary className="cursor-pointer bg-white/5 px-3 py-2 text-sm font-semibold">
                  {result.title}
                </summary>
                <div className="space-y-3 px-3 py-3 text-xs text-gray-100">
                  <p className="text-gray-200">{result.summary}</p>
                  <pre className="max-h-56 overflow-auto rounded bg-black/70 p-3 text-[11px] text-green-200">
                    {result.output}
                  </pre>
                  <ul className="space-y-1 text-[11px] text-gray-300">
                    {result.interpretation.map((line, index) => (
                      <li key={index} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LabPanels;
