'use client';

import React from 'react';
import usePackageStore from '../../hooks/usePackageStore';

const PIN_ICON = '📌';
const LAB_ICON = '🧪';
const QUEUE_ICON = '📝';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
      {children}
    </h2>
  );
}

export default function PackageManagerApp() {
  const {
    packages,
    selectedPackage,
    selectedId,
    setSelectedId,
    setVersion,
    pins,
    pinVersion,
    clearPin,
    queue,
    toggleQueued,
    plan,
  } = usePackageStore();

  const isPinned = selectedPackage ? Boolean(pins[selectedPackage.id]) : false;
  const pinnedVersion = selectedPackage ? pins[selectedPackage.id] : undefined;
  const selectedVersion = selectedPackage?.selectedVersion ?? '';
  const queued = selectedPackage ? queue.includes(selectedPackage.id) : false;

  const handleVersionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedPackage) return;
    setVersion(selectedPackage.id, event.target.value);
  };

  const togglePin = () => {
    if (!selectedPackage) return;
    if (isPinned) {
      clearPin(selectedPackage.id);
    } else {
      pinVersion(selectedPackage.id, selectedVersion);
    }
  };

  const togglePlan = () => {
    if (!selectedPackage) return;
    toggleQueued(selectedPackage.id);
  };

  const planForSelection = selectedPackage
    ? plan.find((item) => item.id === selectedPackage.id)
    : undefined;

  return (
    <div className="flex h-full w-full bg-gray-900 text-white">
      <aside className="flex w-64 flex-col border-r border-gray-800 bg-gray-950/70">
        <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Packages
        </div>
        <ul className="flex-1 overflow-y-auto">
          {packages.map((pkg) => {
            const active = pkg.id === selectedId;
            const pkgPinned = Boolean(pkg.pinnedVersion);
            return (
              <li key={pkg.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(pkg.id)}
                  className={`w-full px-4 py-3 text-left transition-colors duration-150 ${
                    active ? 'bg-gray-800/80' : 'hover:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{pkg.name}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {pkg.queued && (
                        <span aria-label="Queued for dry run" title="Queued for dry run">
                          {QUEUE_ICON}
                        </span>
                      )}
                      {pkgPinned && (
                        <span
                          className="flex items-center gap-1 text-green-400"
                          aria-label={`Pinned to ${pkg.pinnedVersion}`}
                          title={`Pinned to ${pkg.pinnedVersion}`}
                        >
                          <span aria-hidden="true">{PIN_ICON}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{pkg.summary}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {selectedPackage ? (
          <div className="space-y-6">
            <header>
              <p className="text-xs uppercase tracking-wide text-gray-400">{selectedPackage.category}</p>
              <h1 className="text-2xl font-semibold">{selectedPackage.name}</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-300">{selectedPackage.summary}</p>
            </header>

            <section className="grid gap-6 md:grid-cols-2">
              <div>
                <SectionTitle>Version</SectionTitle>
                <select
                  value={selectedVersion}
                  onChange={handleVersionChange}
                  className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-ub-orange focus:outline-none"
                >
                  {selectedPackage.versions.map((ver) => (
                    <option key={ver.version} value={ver.version}>
                      {ver.version}
                      {ver.releaseDate ? ` — ${ver.releaseDate}` : ''}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-300">
                  <button
                    type="button"
                    onClick={togglePin}
                    className={`rounded px-3 py-1 font-medium transition-colors ${
                      isPinned
                        ? 'bg-gray-800 text-green-400 hover:bg-gray-700'
                        : 'bg-ub-orange text-black hover:bg-ub-orange/80'
                    }`}
                  >
                    {isPinned ? 'Unpin version' : 'Pin this version'}
                  </button>
                  <button
                    type="button"
                    onClick={togglePlan}
                    className={`rounded px-3 py-1 font-medium transition-colors ${
                      queued
                        ? 'bg-gray-800 text-ub-orange hover:bg-gray-700'
                        : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    }`}
                  >
                    {queued ? 'Remove from plan' : 'Add to plan'}
                  </button>
                  {isPinned ? (
                    <span className="flex items-center gap-1 text-green-400" aria-live="polite">
                      <span aria-hidden="true">{PIN_ICON}</span>
                      Pinned to {pinnedVersion}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400">
                      <span aria-hidden="true">{LAB_ICON}</span>
                      Previewing {selectedVersion || 'latest'}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-300">
                <SectionTitle>Package metadata</SectionTitle>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {selectedPackage.size && (
                    <>
                      <dt className="text-gray-400">Size</dt>
                      <dd>{selectedPackage.size}</dd>
                    </>
                  )}
                  {selectedPackage.maintainer && (
                    <>
                      <dt className="text-gray-400">Maintainer</dt>
                      <dd>{selectedPackage.maintainer}</dd>
                    </>
                  )}
                  {selectedPackage.homepage && (
                    <>
                      <dt className="text-gray-400">Homepage</dt>
                      <dd>
                        <a
                          href={selectedPackage.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ub-orange hover:underline"
                        >
                          {selectedPackage.homepage.replace(/^https?:\/\//, '')}
                        </a>
                      </dd>
                    </>
                  )}
                  {selectedPackage.dependencies?.length ? (
                    <>
                      <dt className="text-gray-400">Dependencies</dt>
                      <dd>{selectedPackage.dependencies.join(', ')}</dd>
                    </>
                  ) : null}
                </dl>
                {selectedPackage.description && (
                  <p className="mt-3 text-xs text-gray-400">{selectedPackage.description}</p>
                )}
              </div>
            </section>

            <section>
              <SectionTitle>Release notes</SectionTitle>
              <div className="space-y-3">
                {selectedPackage.versions.map((ver) => {
                  const isActive = ver.version === selectedVersion;
                  const isPinnedVersion = pinnedVersion === ver.version;
                  return (
                    <div
                      key={ver.version}
                      className={`rounded border px-3 py-3 text-sm transition-colors ${
                        isActive ? 'border-ub-orange bg-gray-800/70' : 'border-gray-800 bg-gray-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{ver.version}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {ver.releaseDate && <span>{ver.releaseDate}</span>}
                          {isPinnedVersion && (
                            <span className="flex items-center gap-1 text-green-400">
                              <span aria-hidden="true">{PIN_ICON}</span>
                              Pinned
                            </span>
                          )}
                        </div>
                      </div>
                      {ver.notes && <p className="mt-2 text-xs text-gray-300">{ver.notes}</p>}
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <SectionTitle>Dry run preview</SectionTitle>
              {planForSelection ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">
                    Commands are simulated and never leave the browser. Pinned versions override
                    dropdown selections when present.
                  </p>
                  <div className="rounded border border-gray-800 bg-black/50 p-3 font-mono text-xs text-green-400">
                    {planForSelection.commands.map((cmd, index) => (
                      <div key={index}>{cmd}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Select or queue a package to preview the dry run.</p>
              )}
            </section>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-300">Select a package from the list to view its details.</p>
          </div>
        )}
      </main>

      <aside className="hidden w-80 border-l border-gray-800 bg-gray-950/80 p-5 xl:block">
        <div className="flex items-center justify-between">
          <SectionTitle>Plan summary</SectionTitle>
          <span className="text-xs text-gray-500">Dry run only</span>
        </div>
        {plan.length === 0 ? (
          <p className="text-xs text-gray-400">
            The selected package is previewed automatically. Queue additional packages to stage a
            multi-tool dry run.
          </p>
        ) : (
          <ul className="space-y-4">
            {plan.map((item) => (
              <li key={item.id} className="rounded border border-gray-800 bg-gray-900/60 p-4 text-sm">
                <div className="flex items-center justify-between font-semibold">
                  <span>{item.name}</span>
                  <span
                    className={`flex items-center gap-1 text-xs ${
                      item.pinned ? 'text-green-400' : 'text-gray-400'
                    }`}
                    aria-label={item.pinned ? `Pinned to ${item.version}` : `Preview ${item.version}`}
                    title={item.pinned ? `Pinned to ${item.version}` : `Preview ${item.version}`}
                  >
                    <span aria-hidden="true">{item.pinned ? PIN_ICON : LAB_ICON}</span>
                    {item.version}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">{item.summary}</p>
                <div className="mt-3 space-y-1 rounded border border-gray-800 bg-black/50 p-2 font-mono text-[11px] text-green-400">
                  {item.commands.map((cmd, index) => (
                    <div key={index}>{cmd}</div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
