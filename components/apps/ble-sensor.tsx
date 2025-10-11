import React, { useEffect, useMemo, useState } from 'react';
import {
  getBleDataset,
  getBleDatasetTags,
  listBleDatasets,
  searchBleDatasets,
  BleDataset,
} from '../../utils/bleDatasets';

const BleSensor: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>(() => {
    const all = listBleDatasets();
    return all.length > 0 ? all[0].id : '';
  });

  const tagOptions = useMemo(() => getBleDatasetTags(), []);
  const filteredDatasets = useMemo(
    () => searchBleDatasets(search, selectedTags),
    [search, selectedTags]
  );

  const selectedDataset = useMemo(() => {
    if (selectedId) {
      const match = filteredDatasets.find((dataset) => dataset.id === selectedId);
      if (match) {
        return match;
      }
      const fallback = getBleDataset(selectedId);
      if (fallback) {
        return fallback;
      }
    }
    return filteredDatasets[0];
  }, [filteredDatasets, selectedId]);

  useEffect(() => {
    if (
      filteredDatasets.length > 0 &&
      !filteredDatasets.some((dataset) => dataset.id === selectedId)
    ) {
      setSelectedId(filteredDatasets[0].id);
    }
  }, [filteredDatasets, selectedId]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag]
    );
  };

  const renderDatasetCard = (dataset: BleDataset) => (
    <button
      key={dataset.id}
      type="button"
      onClick={() => setSelectedId(dataset.id)}
      className={`w-full rounded border px-3 py-2 text-left transition-colors ${
        dataset.id === selectedId
          ? 'border-blue-500 bg-blue-500/20'
          : 'border-gray-700 bg-gray-900/40 hover:border-blue-500/70'
      }`}
    >
      <p className="text-sm font-semibold text-white">{dataset.label}</p>
      <p className="text-xs text-gray-300">{dataset.deviceType}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">
        {dataset.location}
      </p>
      <div className="mt-2 flex flex-wrap gap-[6px]">
        {dataset.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-gray-800 px-2 py-[2px] text-[10px] uppercase tracking-wide text-gray-300"
          >
            {tag}
          </span>
        ))}
        {dataset.tags.length > 3 && (
          <span className="rounded-full bg-gray-800 px-2 py-[2px] text-[10px] uppercase tracking-wide text-gray-300">
            +{dataset.tags.length - 3}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-black p-4 text-white">
      <header>
        <h1 className="text-xl font-semibold">BLE Sensor Inspector</h1>
        <p className="mt-1 text-sm text-gray-300">
          Explore curated Bluetooth Low Energy datasets that showcase realistic GATT
          service layouts with descriptive telemetry.
        </p>
      </header>

      <div className="rounded border border-blue-500/40 bg-blue-900/30 p-3 text-sm text-blue-100">
        <p className="font-semibold uppercase tracking-wide text-blue-200">
          Read-only simulation
        </p>
        <p className="mt-1">
          Device data is sourced from curated training captures. Interactions are limited
          to browsing metadata—no pairing, writes, or deletions are available in this
          desktop build.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden md:grid md:grid-cols-5">
        <aside className="flex flex-col gap-4 md:col-span-2">
          <div>
            <label htmlFor="ble-search" className="block text-xs uppercase tracking-wide text-gray-400">
              Search catalog
            </label>
            <input
              id="ble-search"
              type="text"
              aria-label="Search BLE datasets"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by name, location, or service"
              className="mt-1 w-full rounded border border-gray-700 bg-gray-900/70 p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Filter by tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tagOptions.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-[6px] text-xs transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-500/20 text-blue-200'
                        : 'border-gray-700 bg-gray-900/40 text-gray-300 hover:border-blue-500/70'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
              {(search || selectedTags.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSelectedTags([]);
                  }}
                  className="rounded-full border border-gray-700 bg-transparent px-3 py-[6px] text-xs text-gray-400 transition-colors hover:border-blue-500/70 hover:text-blue-200"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto rounded border border-gray-700 bg-gray-900/30 p-2">
            {filteredDatasets.length === 0 ? (
              <p className="text-sm text-gray-400">
                No datasets match the current filters. Adjust your search or tag
                selection to continue exploring the catalog.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredDatasets.map((dataset) => renderDatasetCard(dataset))}
              </div>
            )}
          </div>
        </aside>

        <section className="flex flex-1 flex-col overflow-hidden rounded border border-gray-700 bg-gray-900/40 p-4 md:col-span-3">
          {!selectedDataset ? (
            <p className="text-sm text-gray-400">
              Select a dataset from the catalog to view its services, characteristic
              values, and supporting documentation.
            </p>
          ) : (
            <div className="flex h-full flex-col gap-4 overflow-hidden">
              <div>
                <p className="text-2xl font-semibold text-white">
                  {selectedDataset.label}
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {selectedDataset.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm text-gray-300 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Manufacturer</p>
                  <p className="text-white">{selectedDataset.manufacturer}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Device type</p>
                  <p className="text-white">{selectedDataset.deviceType}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Location</p>
                  <p className="text-white">{selectedDataset.location}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Last seen</p>
                  <p className="text-white">{selectedDataset.lastSeen}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedDataset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-blue-600/20 px-3 py-1 text-xs uppercase tracking-wide text-blue-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Analyst highlights
                </h2>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-gray-200">
                  {selectedDataset.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </div>

              <div className="flex-1 overflow-auto">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  GATT services
                </h2>
                <div className="mt-2 space-y-3">
                  {selectedDataset.services.map((service) => (
                    <article
                      key={service.uuid}
                      className="rounded border border-gray-700 bg-black/40 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-white">
                            {service.name}
                          </p>
                          <p className="text-sm text-gray-300">{service.description}</p>
                        </div>
                        <span className="text-xs text-gray-500">{service.uuid}</span>
                      </div>
                      <ul className="mt-3 space-y-2">
                        {service.characteristics.map((characteristic) => (
                          <li
                            key={characteristic.uuid}
                            className="rounded bg-gray-900/60 px-3 py-2"
                          >
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                              <span className="text-sm font-medium text-white">
                                {characteristic.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {characteristic.uuid}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-emerald-300">
                              {characteristic.value}
                            </p>
                            {characteristic.description && (
                              <p className="mt-1 text-xs text-gray-300">
                                {characteristic.description}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Source material
                </h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-300">
                  {selectedDataset.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-300 transition-colors hover:text-blue-200"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default BleSensor;
export const displayBleSensor = () => <BleSensor />;
