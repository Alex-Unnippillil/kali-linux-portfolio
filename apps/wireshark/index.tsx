'use client';

import React, { useMemo, useState } from 'react';
import LabMode from '../../components/LabMode';
import PcapViewer from './components/PcapViewer';
import fixtures from './fixtures';

const WiresharkPage: React.FC = () => {
  const [showLegend, setShowLegend] = useState(true);
  const [fixtureId, setFixtureId] = useState(() => fixtures[0]?.id ?? '');
  const [presetFilter, setPresetFilter] = useState('');

  const activeFixture = useMemo(
    () => fixtures.find((fixture) => fixture.id === fixtureId) ?? fixtures[0],
    [fixtureId]
  );

  return (
    <LabMode>
      <div className="h-full w-full flex flex-col lg:flex-row">
        <aside className="lg:w-80 bg-ub-dark text-white border-b border-gray-800 lg:border-b-0 lg:border-r overflow-y-auto">
          <div className="p-4 space-y-4 text-xs">
            <div>
              <h2 className="text-sm font-semibold text-yellow-300">Capture scenarios</h2>
              <ul className="mt-2 space-y-2">
                {fixtures.map((fixture) => (
                  <li key={fixture.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFixtureId(fixture.id);
                        setPresetFilter('');
                      }}
                      className={`w-full text-left rounded px-2 py-1 ${
                        fixture.id === activeFixture?.id
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-900 text-gray-200'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{fixture.title}</span>
                      <span className="block text-[11px] text-gray-300 leading-snug">
                        {fixture.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {activeFixture && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-yellow-300">Lab notes</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200">
                  {activeFixture.callouts.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                <div>
                  <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Recommended display filters
                  </h4>
                  <ul className="mt-1 space-y-1">
                    {activeFixture.filters
                      .filter((preset) => preset.target === 'display')
                      .map((preset) => (
                        <li key={preset.expression} className="rounded border border-gray-800 bg-gray-900 p-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{preset.label}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPresetFilter(preset.expression);
                              }}
                              className="px-2 py-0.5 text-[11px] bg-gray-700 rounded"
                            >
                              Apply
                            </button>
                          </div>
                          <p className="mt-1 text-gray-300 leading-snug">{preset.explanation}</p>
                          <code className="mt-1 inline-block rounded bg-black px-2 py-1 text-[11px] text-green-300">
                            {preset.expression}
                          </code>
                        </li>
                      ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Dataset sources</h4>
                  <ul className="mt-1 list-disc list-inside text-blue-300 space-y-1">
                    {activeFixture.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {source.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </aside>
        <div className="flex-1 flex flex-col">
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="ml-4 mt-2 mb-2 w-max px-2 py-1 text-xs bg-gray-700 text-white rounded"
            aria-pressed={showLegend}
            aria-label="Toggle protocol color legend"
          >
            {showLegend ? 'Hide' : 'Show'} Legend
          </button>
          <div className="flex-1 min-h-0">
            <PcapViewer
              showLegend={showLegend}
              initialPackets={activeFixture?.packets ?? []}
              readOnly
              presetFilter={presetFilter}
              onFilterChange={setPresetFilter}
            />
          </div>
        </div>
      </div>
    </LabMode>
  );
};

export default WiresharkPage;
