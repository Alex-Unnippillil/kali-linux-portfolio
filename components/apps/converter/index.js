import React, { useEffect, useMemo, useRef } from 'react';
import UnitConverter from './UnitConverter';
import Base64Converter from './Base64Converter';
import HashConverter from './HashConverter';
import TemperatureConverter from './TemperatureConverter';
import usePersistentState from '../../../hooks/usePersistentState';

const tabs = [
  {
    id: 'unit',
    label: 'Unit',
    description: 'Convert distance, weight, digital storage and more.',
    component: <UnitConverter />,
  },
  {
    id: 'temperature',
    label: 'Temperature',
    description: 'Fast Celsius, Fahrenheit, and Kelvin conversion.',
    component: <TemperatureConverter />,
  },
  {
    id: 'base64',
    label: 'Base64',
    description: 'Encode and decode text safely in browser.',
    component: <Base64Converter />,
  },
  {
    id: 'hash',
    label: 'Hash',
    description: 'Generate deterministic checksum hashes.',
    component: <HashConverter />,
  },
];

const Converter = () => {
  const [tab, setTab] = usePersistentState('converter-tab', 'unit');
  const [search, setSearch] = usePersistentState('converter-tab-search', '');
  const tabRefs = useRef({});

  const visibleTabs = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return tabs;
    }

    return tabs.filter((entry) => (
      entry.label.toLowerCase().includes(normalized)
      || entry.description.toLowerCase().includes(normalized)
    ));
  }, [search]);

  useEffect(() => {
    if (!visibleTabs.length) {
      return;
    }
    const tabStillVisible = visibleTabs.some((entry) => entry.id === tab);
    if (!tabStillVisible) {
      setTab(visibleTabs[0].id);
    }
  }, [tab, setTab, visibleTabs]);

  const activeTab = visibleTabs.find((entry) => entry.id === tab) || visibleTabs[0];

  const focusTabByOffset = (currentTabId, offset) => {
    const currentIndex = visibleTabs.findIndex((entry) => entry.id === currentTabId);
    if (currentIndex === -1) {
      return;
    }
    const nextIndex = (currentIndex + offset + visibleTabs.length) % visibleTabs.length;
    const nextTabId = visibleTabs[nextIndex].id;
    const nextTab = tabRefs.current[nextTabId];
    setTab(nextTabId);
    if (nextTab) {
      nextTab.focus();
    }
  };

  return (
    <div className="converter-container h-full w-full p-4 overflow-y-auto bg-ub-cool-grey text-white">
      <label className="flex flex-col mb-4 gap-1">
        <span className="text-sm text-gray-300">Find conversion tool</span>
        <input
          type="search"
          className="rounded bg-gray-800 border border-gray-600 p-2"
          placeholder="Search by tool name or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search converter tools"
        />
      </label>
      <div className="flex flex-wrap mb-4 gap-2 border-b border-gray-600 pb-2" role="tablist" aria-label="Converter tools">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab?.id === t.id}
            tabIndex={activeTab?.id === t.id ? 0 : -1}
            ref={(node) => {
              tabRefs.current[t.id] = node;
            }}
            className={`px-3 py-2 rounded transition-colors ${activeTab?.id === t.id ? 'bg-gray-200 text-black' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setTab(t.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                focusTabByOffset(t.id, 1);
              }

              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                focusTabByOffset(t.id, -1);
              }
            }}
            title={t.description}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab ? (
        <>
          <p className="mb-3 text-sm text-gray-300">{activeTab.description}</p>
          {activeTab.component}
        </>
      ) : (
        <div className="rounded border border-gray-600 bg-gray-800 p-3 text-sm text-gray-300">
          No converter tool matched your search.
        </div>
      )}
      <style jsx>{`
        .converter-container {
          container-type: inline-size;
        }
      `}</style>
    </div>
  );
};

const displayConverter = () => <Converter />;

export default Converter;
export { displayConverter };
