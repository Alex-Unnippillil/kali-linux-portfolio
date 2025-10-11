'use client';

import React, { useEffect, useMemo, useState } from 'react';

import type fixturesData from '../../../components/apps/ettercap/fixtures';

type Fixture = (typeof fixturesData)[number];

type FixtureBrowserProps = {
  fixtures: Fixture[];
  selectedId?: string;
  onSelect?: (fixture: Fixture) => void;
  disabled?: boolean;
};

type FilteredFlows = {
  list: Fixture['flows'];
  fallback: boolean;
};

const computeFilteredFlows = (
  fixture: Fixture,
  hostFilter: string,
  protocolFilter: string,
): FilteredFlows => {
  const flows = fixture?.flows ?? [];
  const trimmed = flows.filter((flow) => {
    const matchesHost = hostFilter
      ? [flow.source, flow.destination, flow.info]
          .join(' ')
          .toLowerCase()
          .includes(hostFilter.toLowerCase())
      : true;
    const matchesProtocol =
      protocolFilter === 'All' || flow.protocol === protocolFilter;
    return matchesHost && matchesProtocol;
  });
  const hasFilter = Boolean(hostFilter) || protocolFilter !== 'All';
  return {
    list: trimmed.length ? trimmed : flows,
    fallback: hasFilter && trimmed.length === 0,
  };
};

const FixtureBrowser: React.FC<FixtureBrowserProps> = ({
  fixtures,
  selectedId,
  onSelect,
  disabled = false,
}) => {
  const [currentId, setCurrentId] = useState(
    selectedId || fixtures[0]?.id || '',
  );
  useEffect(() => {
    if (selectedId && selectedId !== currentId) {
      setCurrentId(selectedId);
    }
  }, [selectedId, currentId]);
  useEffect(() => {
    if (!currentId && fixtures[0]) {
      setCurrentId(fixtures[0].id);
    }
  }, [currentId, fixtures]);

  const activeFixture = useMemo<Fixture | undefined>(
    () => fixtures.find((fixture) => fixture.id === currentId) || fixtures[0],
    [currentId, fixtures],
  );

  const [hostFilter, setHostFilter] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('All');

  useEffect(() => {
    setHostFilter('');
    setProtocolFilter('All');
  }, [activeFixture?.id]);

  useEffect(() => {
    if (activeFixture && onSelect) {
      onSelect(activeFixture);
    }
  }, [activeFixture, onSelect]);

  const protocolOptions = useMemo(() => {
    if (!activeFixture) return ['All'];
    const set = new Set(activeFixture.flows.map((flow) => flow.protocol));
    return ['All', ...Array.from(set)];
  }, [activeFixture]);

  const { list: flows, fallback } = useMemo(
    () =>
      activeFixture
        ? computeFilteredFlows(activeFixture, hostFilter, protocolFilter)
        : { list: [], fallback: false },
    [activeFixture, hostFilter, protocolFilter],
  );

  if (!activeFixture) {
    return (
      <section className="p-4 border rounded bg-gray-900 text-white">
        <p>No fixtures loaded.</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Network capture fixtures"
      className="p-4 border rounded bg-gray-900 text-white space-y-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="fixture-select" className="text-sm">
          Fixture
        </label>
        <select
          id="fixture-select"
          className="px-2 py-1 rounded text-black"
          value={activeFixture.id}
          onChange={(event) => setCurrentId(event.target.value)}
          disabled={disabled}
        >
          {fixtures.map((fixture) => (
            <option key={fixture.id} value={fixture.id}>
              {fixture.name}
            </option>
          ))}
        </select>
        {activeFixture.recommendedFlags &&
          activeFixture.recommendedFlags.length > 0 && (
            <div className="text-xs bg-gray-800 text-gray-200 px-2 py-1 rounded">
              Recommended flags: {activeFixture.recommendedFlags.join(' ')}
            </div>
          )}
      </div>
      <p className="text-sm text-gray-200">{activeFixture.summary}</p>
      <div className="text-xs space-y-1">
        <div>
          Source:{' '}
          <a
            href={activeFixture.dataset.url}
            className="text-blue-300 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {activeFixture.dataset.name}
          </a>
        </div>
        <p className="italic text-gray-400">{activeFixture.dataset.citation}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold">Hosts</h3>
          <table className="mt-2 w-full text-left border-collapse">
            <caption className="sr-only">Fixture hosts</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b px-2 py-1">
                  IP
                </th>
                <th scope="col" className="border-b px-2 py-1">
                  MAC
                </th>
              </tr>
            </thead>
            <tbody>
              {activeFixture.hosts.map((host) => (
                <tr key={host.ip}>
                  <td className="px-2 py-1 font-mono">{host.ip}</td>
                  <td className="px-2 py-1 font-mono">{host.mac}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="font-semibold">Flows</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
            <label htmlFor="host-filter" className="sr-only">
              Host filter
            </label>
            <input
              id="host-filter"
              className="px-2 py-1 rounded text-black"
              placeholder="Filter by host or detail"
              value={hostFilter}
              onChange={(event) => setHostFilter(event.target.value)}
              disabled={disabled}
            />
            <label htmlFor="protocol-filter" className="sr-only">
              Protocol filter
            </label>
            <select
              id="protocol-filter"
              className="px-2 py-1 rounded text-black"
              value={protocolFilter}
              onChange={(event) => setProtocolFilter(event.target.value)}
              disabled={disabled}
            >
              {protocolOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          {fallback && (
            <p className="text-xs text-yellow-300 mt-2">
              No flows matched the filters; showing the full capture instead.
            </p>
          )}
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[360px] text-left border-collapse">
              <caption className="sr-only">Fixture flows</caption>
              <thead>
                <tr>
                  <th scope="col" className="border-b px-2 py-1">
                    Time
                  </th>
                  <th scope="col" className="border-b px-2 py-1">
                    Source
                  </th>
                  <th scope="col" className="border-b px-2 py-1">
                    Destination
                  </th>
                  <th scope="col" className="border-b px-2 py-1">
                    Protocol
                  </th>
                  <th scope="col" className="border-b px-2 py-1">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {flows.map((flow, index) => (
                  <tr key={`${flow.timestamp}-${index}`}>
                    <td className="px-2 py-1 font-mono whitespace-nowrap">
                      {flow.timestamp}
                    </td>
                    <td className="px-2 py-1 font-mono">{flow.source}</td>
                    <td className="px-2 py-1 font-mono">{flow.destination}</td>
                    <td className="px-2 py-1">{flow.protocol}</td>
                    <td className="px-2 py-1 text-xs">{flow.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FixtureBrowser;
