'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import discoveryFixture from '../../../data/printers/discovery.json';
import driversFixture from '../../../data/printers/drivers.json';
import { QRPreview } from '../qr';

type DiscoveryStatus = 'online' | 'offline' | 'standby';

type TabKey = 'discover' | 'manual' | 'drivers';

interface DiscoveryPrinter {
  id: string;
  name: string;
  ip: string;
  mac: string;
  model: string;
  location: string;
  status: DiscoveryStatus;
  queueDepth: number;
  capabilities?: string[];
  portal?: string;
  recommendedDriver?: string;
}

interface DiscoveryFixture {
  subnet: string;
  portalBase?: string;
  printers: DiscoveryPrinter[];
}

interface DriverInfo {
  id: string;
  name: string;
  vendor: string;
  version: string;
  models: string[];
  features: string[];
  signedFor: string[];
  portal: string;
  releaseNotes: string;
}

interface DriverFixture {
  drivers: DriverInfo[];
}

interface PendingPrinter {
  id: string;
  name: string;
  ip: string;
  model: string;
  location: string;
  status?: DiscoveryStatus;
  queueDepth?: number;
  capabilities?: string[];
  portal?: string;
  recommendedDriver?: string;
  queue?: string;
  source: 'manual' | 'discovery';
}

interface ManagedPrinter extends PendingPrinter {
  driverId: string;
  driverName: string;
  driverVersion: string;
  vendor: string;
  portal: string;
}

const discoveryData = discoveryFixture as DiscoveryFixture;
const driverData = driversFixture as DriverFixture;
const driverCatalog = driverData.drivers;
const portalBase = (discoveryData.portalBase ?? 'https://print.local').replace(/\/$/, '');

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'printer';

const PrintersApp = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('discover');
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [discovered, setDiscovered] = useState<DiscoveryPrinter[]>([]);
  const [pending, setPending] = useState<PendingPrinter | null>(null);
  const [manualError, setManualError] = useState('');
  const [message, setMessage] = useState('');
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [managedPrinters, setManagedPrinters] = useState<ManagedPrinter[]>([]);
  const [previewPrinter, setPreviewPrinter] = useState<ManagedPrinter | null>(null);

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const driversByModel = useMemo(() => {
    const map = new Map<string, DriverInfo[]>();
    for (const driver of driverCatalog) {
      for (const model of driver.models) {
        const list = map.get(model) ?? [];
        list.push(driver);
        map.set(model, list);
      }
    }
    return map;
  }, [driverCatalog]);

  const driverById = useMemo(() => {
    const map = new Map<string, DriverInfo>();
    for (const driver of driverCatalog) {
      map.set(driver.id, driver);
    }
    return map;
  }, [driverCatalog]);

  const allModels = useMemo(() => {
    const models = new Set<string>();
    for (const driver of driverCatalog) {
      for (const model of driver.models) models.add(model);
    }
    return Array.from(models).sort((a, b) => a.localeCompare(b));
  }, [driverCatalog]);

  const [manualForm, setManualForm] = useState({
    name: '',
    ip: '',
    location: '',
    model: allModels[0] ?? '',
    queue: '',
  });

  useEffect(() => {
    setManualForm((form) => {
      if (form.model || allModels.length === 0) return form;
      return { ...form, model: allModels[0] };
    });
  }, [allModels]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setMessage(''), 6000);
  }, [message]);

  const handleScan = () => {
    if (scanState === 'scanning') return;
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);

    setScanState('scanning');
    setScanProgress(5);
    setDiscovered([]);
    setMessage(`Scanning ${discoveryData.subnet} for printers…`);

    progressTimerRef.current = setInterval(() => {
      setScanProgress((current) => {
        const next = current + 18;
        return next >= 95 ? 95 : next;
      });
    }, 180);

    completionTimerRef.current = setTimeout(() => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setDiscovered(discoveryData.printers);
      setScanProgress(100);
      setScanState('done');
      setLastScan(new Date().toISOString());
      setMessage(`Discovered ${discoveryData.printers.length} printers.`);
    }, 1200);
  };

  const manualMatches = useMemo(() => {
    if (!manualForm.model) return [];
    return driversByModel.get(manualForm.model) ?? [];
  }, [driversByModel, manualForm.model]);

  const handleManualChange =
    (field: keyof typeof manualForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setManualForm((form) => ({ ...form, [field]: value }));
    };

  const submitManual = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualForm.name.trim() || !manualForm.ip.trim() || !manualForm.model) {
      setManualError('Name, IP, and model are required.');
      return;
    }

    setManualError('');
    const name = manualForm.name.trim();
    const ip = manualForm.ip.trim();
    const queue = manualForm.queue.trim() || slugify(name);
    const location = manualForm.location.trim() || 'Unassigned';
    const recommended = manualMatches[0];
    const portal = `${portalBase}/queues/${queue}`;

    setPending({
      id: `manual-${queue}`,
      name,
      ip,
      model: manualForm.model,
      location,
      status: 'online',
      queueDepth: 0,
      capabilities: recommended?.features,
      portal,
      recommendedDriver: recommended?.id,
      queue,
      source: 'manual',
    });
    setActiveTab('drivers');
    setMessage(`Select a driver to finish provisioning ${name}.`);
  };

  const startDriverSelection = (printer: DiscoveryPrinter) => {
    const queue = printer.portal?.split('/').pop() || slugify(printer.name);
    setPending({
      id: printer.id,
      name: printer.name,
      ip: printer.ip,
      model: printer.model,
      location: printer.location,
      status: printer.status,
      queueDepth: printer.queueDepth,
      capabilities: printer.capabilities,
      portal: printer.portal,
      recommendedDriver: printer.recommendedDriver,
      queue,
      source: 'discovery',
    });
    setActiveTab('drivers');
    setMessage(`Select a driver to finish provisioning ${printer.name}.`);
  };

  const driverSelection = useMemo(() => {
    if (!pending) {
      return { recommended: [] as DriverInfo[], others: driverCatalog };
    }
    const recommendedSet = new Map<string, DriverInfo>();
    const matches = driversByModel.get(pending.model) ?? [];
    for (const driver of matches) recommendedSet.set(driver.id, driver);
    if (pending.recommendedDriver) {
      const explicit = driverCatalog.find((d) => d.id === pending.recommendedDriver);
      if (explicit) recommendedSet.set(explicit.id, explicit);
    }
    const recommended = Array.from(recommendedSet.values());
    const others = driverCatalog.filter((driver) => !recommendedSet.has(driver.id));
    return { recommended, others };
  }, [pending, driversByModel, driverCatalog]);

  const finalizeDriver = (driver: DriverInfo) => {
    if (!pending) return;
    const queue = pending.queue ?? slugify(pending.name);
    const portal = pending.portal ?? `${portalBase}/queues/${queue}`;
    const capabilities = pending.capabilities?.length
      ? pending.capabilities
      : driver.features;
    const managed: ManagedPrinter = {
      ...pending,
      driverId: driver.id,
      driverName: driver.name,
      driverVersion: driver.version,
      vendor: driver.vendor,
      portal,
      capabilities,
      queue,
    };

    setManagedPrinters((current) => {
      const filtered = current.filter((item) => item.id !== managed.id);
      return [...filtered, managed].sort((a, b) => a.name.localeCompare(b.name));
    });
    setPending(null);
    setActiveTab('discover');
    setPreviewPrinter(managed);
    setMessage(`${managed.name} is ready to print.`);
    if (pending.source === 'manual') {
      setManualForm({ name: '', ip: '', location: '', model: allModels[0] ?? '', queue: '' });
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'discover', label: 'Discovery' },
    { key: 'manual', label: 'Manual add' },
    { key: 'drivers', label: 'Driver catalog' },
  ];

  const renderDiscoverTab = () => (
    <div className="space-y-4" role="tabpanel" aria-labelledby="printers-tab-discover">
      <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-white/70">
        <p>Scan the subnet for broadcasted IPP printers and SNMP responders.</p>
        <p className="mt-2 text-xs text-white/60">
          Discovery probes {discoveryData.subnet} using mock mDNS, SNMP, and IPP requests.
        </p>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full bg-blue-500 transition-[width] duration-200 ease-out"
            style={{ width: `${scanProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/60">
          <span>
            {scanState === 'scanning'
              ? `Scanning… ${scanProgress}%`
              : scanState === 'done'
              ? 'Discovery complete'
              : 'Idle'}
          </span>
          <span>{discovered.length ? `${discovered.length} device(s) found` : 'No devices yet'}</span>
        </div>
      </div>
      <ul className="space-y-3">
        {discovered.map((printer) => {
          const managed = managedPrinters.some((item) => item.id === printer.id);
          const statusColor =
            printer.status === 'online'
              ? 'text-green-400'
              : printer.status === 'standby'
              ? 'text-amber-300'
              : 'text-white/60';
          return (
            <li
              key={printer.id}
              className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-base font-semibold text-white">{printer.name}</p>
                  <p className="text-xs text-white/60">
                    {printer.ip} • {printer.model}
                  </p>
                  <p className="text-xs text-white/60">{printer.location}</p>
                  {printer.capabilities?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {printer.capabilities.map((capability) => (
                        <span
                          key={capability}
                          className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white"
                        >
                          {capability}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-semibold ${statusColor}`}>
                    {printer.status === 'online'
                      ? 'Online'
                      : printer.status === 'standby'
                      ? 'Standby'
                      : 'Offline'}
                  </span>
                  <span className="text-[11px] text-white/60">Queue depth: {printer.queueDepth}</span>
                  <button
                    type="button"
                    onClick={() => startDriverSelection(printer)}
                    disabled={managed}
                    className={`rounded px-3 py-1 text-xs font-semibold ${
                      managed
                        ? 'cursor-not-allowed bg-blue-900/40 text-white/50'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                  >
                    {managed ? 'Managed' : 'Add printer'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {scanState === 'done' && discovered.length === 0 && (
        <p className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          No printers responded to the mock scan.
        </p>
      )}
    </div>
  );

  const renderManualTab = () => (
    <div className="space-y-4" role="tabpanel" aria-labelledby="printers-tab-manual">
      <form onSubmit={submitManual} className="space-y-4 text-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-white" htmlFor="manual-name">
            <span className="text-sm font-medium">Printer name</span>
            <input
              id="manual-name"
              value={manualForm.name}
              onChange={handleManualChange('name')}
              className="rounded border border-white/20 bg-black/40 p-2 text-white"
              placeholder="Purple Lab Printer"
            />
          </label>
          <label className="flex flex-col gap-1 text-white" htmlFor="manual-ip">
            <span className="text-sm font-medium">IP address</span>
            <input
              id="manual-ip"
              value={manualForm.ip}
              onChange={handleManualChange('ip')}
              className="rounded border border-white/20 bg-black/40 p-2 text-white"
              placeholder="10.0.5.200"
            />
          </label>
          <label className="flex flex-col gap-1 text-white" htmlFor="manual-location">
            <span className="text-sm font-medium">Location</span>
            <input
              id="manual-location"
              value={manualForm.location}
              onChange={handleManualChange('location')}
              className="rounded border border-white/20 bg-black/40 p-2 text-white"
              placeholder="Blue team lab"
            />
          </label>
          <label className="flex flex-col gap-1 text-white" htmlFor="manual-model">
            <span className="text-sm font-medium">Model</span>
            <select
              id="manual-model"
              value={manualForm.model}
              onChange={handleManualChange('model')}
              className="rounded border border-white/20 bg-black/40 p-2 text-white"
            >
              {allModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-white" htmlFor="manual-queue">
          <span className="text-sm font-medium">Queue name</span>
          <input
            id="manual-queue"
            value={manualForm.queue}
            onChange={handleManualChange('queue')}
            className="rounded border border-white/20 bg-black/40 p-2 text-white"
            placeholder="ops-floor"
          />
          <span className="text-xs text-white/60">
            Queue slug preview: {manualForm.queue.trim() || slugify(manualForm.name || 'new-queue')}
          </span>
        </label>
        {manualError && <p className="text-sm text-red-300">{manualError}</p>}
        <p className="text-xs text-white/60">
          Driver recommendations update automatically based on the selected model.
        </p>
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Continue to drivers
        </button>
      </form>
      {manualMatches.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-xs text-white/70">
          <p className="mb-2 text-sm font-semibold text-white">Matching drivers</p>
          <ul className="space-y-2">
            {manualMatches.map((driver) => (
              <li key={driver.id}>
                <span className="font-semibold text-white">{driver.name}</span> · {driver.vendor}
                <div className="mt-1 flex flex-wrap gap-1">
                  {driver.features.map((feature) => (
                    <span
                      key={feature}
                      className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderDriversTab = () => (
    <div className="space-y-4" role="tabpanel" aria-labelledby="printers-tab-drivers">
      <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-white/70">
        {pending ? (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-base font-semibold text-white">{pending.name}</p>
                <p className="text-xs text-white/60">
                  {pending.ip} • {pending.model}
                </p>
                <p className="text-xs text-white/60">Location: {pending.location}</p>
              </div>
              <div className="text-right text-xs text-white/60">
                <p>Status: {pending.status ?? 'pending'}</p>
                <p>Queue: {pending.queue ?? slugify(pending.name)}</p>
              </div>
            </div>
            <p className="text-xs text-white/60">
              {driverSelection.recommended.length
                ? 'Select a recommended driver below to finish setup.'
                : 'No direct match was found. Use the catalog to select a compatible driver.'}
            </p>
          </div>
        ) : (
          <p>
            Choose a printer from discovery or manual add to highlight recommended drivers. You can
            still browse the full catalog below.
          </p>
        )}
      </div>
      {pending && driverSelection.recommended.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
            Recommended drivers
          </h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {driverSelection.recommended.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                highlight
                pendingModel={pending?.model}
                onSelect={() => finalizeDriver(driver)}
              />
            ))}
          </div>
        </section>
      )}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Driver catalog</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {(pending ? driverSelection.others : driverCatalog).map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              pendingModel={pending?.model}
              disabled={!pending}
              onSelect={() => finalizeDriver(driver)}
            />
          ))}
        </div>
        {!pending && (
          <p className="text-xs text-white/60">
            Select a printer to enable installation controls.
          </p>
        )}
      </section>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Printer provisioning</h1>
          <p className="text-xs text-white/70">Subnet {discoveryData.subnet}</p>
        </div>
        <button
          type="button"
          onClick={handleScan}
          disabled={scanState === 'scanning'}
          className={`rounded px-4 py-2 text-sm font-semibold ${
            scanState === 'scanning'
              ? 'cursor-wait bg-blue-900/60 text-white/70'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          {scanState === 'scanning' ? 'Scanning…' : 'Run discovery'}
        </button>
      </header>
      {message && (
        <div className="bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200">{message}</div>
      )}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex flex-1 flex-col border-b border-white/10 md:border-b-0 md:border-r">
          <div
            className="flex gap-1 border-b border-white/10 px-4 py-2"
            role="tablist"
            aria-label="Printer setup"
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                id={`printers-tab-${tab.key}`}
                role="tab"
                type="button"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded px-3 py-1 text-sm font-semibold ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto px-4 py-4">
            {activeTab === 'discover' && renderDiscoverTab()}
            {activeTab === 'manual' && renderManualTab()}
            {activeTab === 'drivers' && renderDriversTab()}
          </div>
        </div>
        <aside className="flex w-full flex-col gap-4 overflow-auto px-4 py-4 text-sm text-white/70 md:w-80">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">Managed printers</h2>
            {managedPrinters.length === 0 ? (
              <p className="text-xs text-white/60">No printers have been provisioned yet.</p>
            ) : (
              <ul className="space-y-3">
                {managedPrinters.map((printer) => (
                  <li
                    key={printer.id}
                    className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white/70"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-base font-semibold text-white">{printer.name}</p>
                        <p className="text-xs text-white/60">
                          {printer.ip} • {printer.model}
                        </p>
                        <p className="text-xs text-white/60">
                          Driver: {printer.driverName} ({printer.driverVersion})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewPrinter(printer)}
                        className="self-start rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                      >
                        Generate test page
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-white/50">
                      Portal:{' '}
                      <a
                        href={printer.portal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 underline"
                      >
                        {printer.portal}
                      </a>
                    </p>
                    {printer.capabilities?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {printer.capabilities.map((capability) => (
                          <span
                            key={capability}
                            className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-1 rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white/60">
            <p className="text-sm font-semibold text-white">Discovery log</p>
            <p>Last scan: {lastScan ? new Date(lastScan).toLocaleString() : 'Not run yet'}</p>
            <p>Subnet: {discoveryData.subnet}</p>
            <p>Driver packages available: {driverCatalog.length}</p>
          </section>
        </aside>
      </div>
      {previewPrinter && (
        <PrintPreviewModal
          printer={previewPrinter}
          driver={driverById.get(previewPrinter.driverId)}
          onClose={() => setPreviewPrinter(null)}
        />
      )}
    </div>
  );
};

interface DriverCardProps {
  driver: DriverInfo;
  highlight?: boolean;
  disabled?: boolean;
  pendingModel?: string;
  onSelect: () => void;
}

const DriverCard = ({ driver, highlight, disabled, pendingModel, onSelect }: DriverCardProps) => {
  const containerClasses = [
    'rounded-lg border p-4 text-sm transition-colors',
    highlight ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-black/30',
  ].join(' ');
  return (
    <article className={containerClasses} aria-label={`${driver.name} driver`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-white">{driver.name}</h4>
          <p className="text-xs text-white/60">
            {driver.vendor} · v{driver.version}
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-wide text-white/50">{driver.id}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {driver.features.map((feature) => (
          <span
            key={feature}
            className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white"
          >
            {feature}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-white/60 leading-relaxed">{driver.releaseNotes}</p>
      <p className="mt-2 text-xs text-white/60">
        Supports: {driver.models.join(', ')}
        {pendingModel ? ` • Matched to ${pendingModel}` : ''}
      </p>
      <p className="mt-1 text-xs text-white/60">Certified for: {driver.signedFor.join(', ')}</p>
      <div className="mt-3 flex items-center justify-between">
        <a
          href={driver.portal}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-300 underline"
        >
          Driver portal
        </a>
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          className={`rounded px-3 py-1 text-xs font-semibold ${
            disabled
              ? 'cursor-not-allowed bg-blue-900/50 text-white/60'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          Install {driver.name}
        </button>
      </div>
    </article>
  );
};

interface PrintPreviewModalProps {
  printer: ManagedPrinter;
  driver?: DriverInfo;
  onClose: () => void;
}

const PrintPreviewModal = ({ printer, driver, onClose }: PrintPreviewModalProps) => {
  const generatedAt = new Date().toLocaleString();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
    >
      <div className="max-h-full w-full max-w-5xl overflow-hidden rounded-lg bg-[#10131c] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 id="print-preview-title" className="text-lg font-semibold text-white">
              Print test page
            </h2>
            <p className="text-xs text-white/60">
              {printer.name} • {printer.ip} • Driver {printer.driverName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-white/10 px-3 py-1 text-sm font-semibold text-white hover:bg-white/20"
          >
            Close preview
          </button>
        </div>
        <div className="grid gap-4 p-6 lg:grid-cols-[2fr,1fr]">
          <div className="flex justify-center">
            <div
              className="relative w-full max-w-[680px] bg-white text-black shadow-2xl"
              style={{ aspectRatio: '8.5 / 11' }}
            >
              <div className="absolute inset-0 border border-gray-300" aria-hidden="true" />
              <div className="absolute inset-0" style={{ margin: '0.5in' }}>
                <div className="flex h-full flex-col">
                  <header className="border-b border-gray-200 pb-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Kali Print System</p>
                    <h3 className="mt-1 text-2xl font-semibold text-gray-900">
                      Calibration test page
                    </h3>
                    <p className="text-xs text-gray-600">
                      Queue: {printer.queue ?? slugify(printer.name)} • Driver {printer.driverName} v
                      {printer.driverVersion}
                    </p>
                  </header>
                  <div className="flex flex-1 flex-col justify-between py-6 text-sm leading-relaxed text-gray-800">
                    <div className="space-y-4">
                      <p>
                        The QR code below links to the secure printer portal so you can release and
                        audit this test job.
                      </p>
                      <div className="flex flex-wrap items-center gap-6">
                        <QRPreview
                          value={printer.portal}
                          label={`${printer.name} portal`}
                          size={144}
                          className="items-start"
                        />
                        <div className="space-y-2 text-xs text-gray-600">
                          <p>
                            <span className="font-semibold text-gray-700">Portal:</span> {printer.portal}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-700">Capabilities:</span>{' '}
                            {printer.capabilities?.join(', ') || 'Standard IPP'}
                          </p>
                          {driver && (
                            <p>
                              <span className="font-semibold text-gray-700">Driver package:</span>{' '}
                              {driver.vendor} {driver.version}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <footer className="border-t border-gray-200 pt-4 text-xs text-gray-500">
                      Generated {generatedAt} •{' '}
                      {driver?.releaseNotes || 'Includes calibration bars and grayscale ramps.'}
                    </footer>
                  </div>
                </div>
              </div>
              <div
                className="pointer-events-none absolute inset-0 border-2 border-dashed border-gray-400"
                style={{ margin: '0.75in' }}
                aria-hidden="true"
              />
            </div>
          </div>
          <aside className="space-y-3 text-sm text-white/70">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white">Next steps</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-white/70">
                <li>Scan the QR code or open the portal to release the calibration job.</li>
                <li>Verify margins align with the dashed guides before approving labels.</li>
                <li>Confirm SNMP status updates in the monitoring console.</li>
              </ol>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-white/70">
              <p className="font-semibold text-white">Driver metadata</p>
              {driver ? (
                <div className="mt-2 space-y-2">
                  <p>
                    {driver.name} · {driver.vendor}
                  </p>
                  <p>Certified for: {driver.signedFor.join(', ')}</p>
                  <p>Models: {driver.models.join(', ')}</p>
                </div>
              ) : (
                <p className="mt-2">Generic IPP metadata applied.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PrintersApp;

