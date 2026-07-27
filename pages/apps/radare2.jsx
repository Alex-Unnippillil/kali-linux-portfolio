'use client';

import { useEffect, useMemo, useState } from 'react';
import { radare2Datasets } from '../../apps/radare2/data/cannedDatasets';

const themeTokens = {
  '--r2-bg': '#0b101b',
  '--r2-surface': 'rgba(17, 27, 45, 0.96)',
  '--r2-border': 'rgba(56, 189, 248, 0.25)',
  '--r2-text': '#e2f1ff',
  '--r2-muted': 'rgba(148, 163, 184, 0.7)',
  '--r2-accent': '#38bdf8',
  '--r2-highlight': '#f97316',
  '--r2-branch': '#facc15',
  '--r2-fallthrough': '#4ade80',
};

const severityStyles = {
  info: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  medium: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  high: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
};

const classNames = (...classes) => classes.filter(Boolean).join(' ');

const edgeColors = {
  call: 'var(--r2-accent)',
  conditional: 'var(--r2-branch)',
  fallthrough: 'var(--r2-fallthrough)',
};

const markerId = (type) => `arrow-${type}`;

const GraphCanvas = ({ nodes, edges, selectedAddress, onSelect, labMode }) => {
  return (
    <div className="relative flex flex-col rounded-lg border border-[color:var(--r2-border)] bg-[color:var(--r2-surface)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-[color:var(--r2-text)]">Control-flow graph</h2>
        <span className="text-xs uppercase text-[color:var(--r2-muted)]">Interactive nodes</span>
      </div>
      <div className="relative flex-1">
        <svg
          viewBox="0 0 420 220"
          className="h-64 w-full lg:h-full"
          role="img"
          aria-label="Control-flow graph for the selected dataset"
        >
          <defs>
            {Object.entries(edgeColors).map(([type, color]) => (
              <marker
                key={type}
                id={markerId(type)}
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
              </marker>
            ))}
          </defs>
          {edges.map((edge) => {
            const from = nodes.find((node) => node.id === edge.from);
            const to = nodes.find((node) => node.id === edge.to);
            if (!from || !to) return null;
            const color = edgeColors[edge.type] || 'var(--r2-border)';
            return (
              <g key={`${edge.from}-${edge.to}-${edge.type}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={color}
                  strokeWidth={selectedAddress === from.address ? 3 : 2}
                  markerEnd={`url(#${markerId(edge.type)})`}
                  opacity={labMode ? 0.85 : 0.5}
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 6}
                  className="text-[10px] fill-[color:var(--r2-muted)]"
                >
                  {edge.description}
                </text>
              </g>
            );
          })}
          {nodes.map((node) => {
            const selected = selectedAddress === node.address;
            const radius = selected ? 28 : 24;
            const labelParts = node.label.split(' ');
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                role="button"
                tabIndex={labMode ? 0 : -1}
                aria-pressed={selected}
                aria-label={`${node.label} at ${node.address}`}
                onClick={() => labMode && onSelect(node.address)}
                onKeyDown={(event) => {
                  if (!labMode) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(node.address);
                  }
                }}
                style={{ cursor: labMode ? 'pointer' : 'not-allowed' }}
              >
                <circle
                  r={radius}
                  fill={selected ? 'var(--r2-highlight)' : 'var(--r2-surface)'}
                  stroke={selected ? 'var(--r2-accent)' : 'var(--r2-border)'}
                  strokeWidth={selected ? 3 : 2}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={selected ? '#0b101b' : 'var(--r2-text)'}
                  fontSize="10"
                  fontWeight="600"
                >
                  {labelParts.map((part, index) => (
                    <tspan key={`${node.id}-${part}-${index}`} x="0" dy={index === 0 ? 0 : 12}>
                      {part}
                    </tspan>
                  ))}
                </text>
                <title>{node.summary}</title>
              </g>
            );
          })}
        </svg>
        {!labMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-center text-sm text-white">
            <div className="max-w-xs space-y-2">
              <p className="font-semibold uppercase tracking-wide">Lab mode disabled</p>
              <p>Enable lab mode to interact with the graph and follow cross-references.</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[color:var(--r2-muted)]">
        <span className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-[color:var(--r2-accent)]" aria-hidden="true" />
          call edge
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-[color:var(--r2-branch)]" aria-hidden="true" />
          conditional
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-[color:var(--r2-fallthrough)]" aria-hidden="true" />
          fallthrough
        </span>
      </div>
    </div>
  );
};

const HexView = ({ hexdump, selectedAddress, onSelect }) => (
  <div className="flex-1 overflow-auto rounded-lg border border-[color:var(--r2-border)] bg-[color:var(--r2-surface)]" role="list" aria-label="Hexdump">
    {hexdump.map((row) => {
      const selected = selectedAddress === row.address;
      return (
        <button
          key={row.address}
          type="button"
          onClick={() => onSelect(row.address)}
          className={classNames(
            'flex w-full items-center gap-4 border-b border-[color:var(--r2-border)] px-4 py-2 text-left font-mono text-xs transition',
            selected ? 'bg-[color:var(--r2-highlight)]/20 text-[color:var(--r2-text)]' : 'hover:bg-[color:var(--r2-highlight)]/10',
          )}
          data-selected={selected}
        >
          <span className="w-24 text-[color:var(--r2-muted)]">{row.address}</span>
          <span className="flex-1 text-[color:var(--r2-text)]">{row.bytes.join(' ')}</span>
          <span className="w-24 text-[color:var(--r2-muted)]">{row.ascii}</span>
          {row.description && (
            <span className="hidden text-[color:var(--r2-muted)] md:inline">{row.description}</span>
          )}
        </button>
      );
    })}
  </div>
);

const DisassemblyView = ({ disassembly, selectedAddress, onSelect, labMode }) => (
  <div
    className="flex-1 overflow-auto rounded-lg border border-[color:var(--r2-border)] bg-[color:var(--r2-surface)]"
    role="list"
    aria-label="Disassembly"
  >
    {disassembly.map((line) => {
      const selected = selectedAddress === line.address;
      return (
        <div key={line.address} className="border-b border-[color:var(--r2-border)]">
          <button
            type="button"
            onClick={() => onSelect(line.address)}
            className={classNames(
              'flex w-full items-center gap-3 px-4 py-2 text-left font-mono text-xs transition',
              selected ? 'bg-[color:var(--r2-highlight)]/20 text-[color:var(--r2-text)]' : 'hover:bg-[color:var(--r2-highlight)]/10',
            )}
            aria-pressed={selected}
          >
            <span className="w-24 text-[color:var(--r2-muted)]">{line.address}</span>
            <span className="min-w-[70px] text-sky-300">{line.mnemonic}</span>
            <span className="flex-1 text-emerald-300">{line.operands || ''}</span>
            {line.comment && (
              <span className="hidden flex-1 text-[color:var(--r2-muted)] md:inline">; {line.comment}</span>
            )}
          </button>
          {Array.isArray(line.xrefs) && line.xrefs.length > 0 && (
            <div className="flex flex-wrap gap-3 px-4 pb-3 text-[11px] text-[color:var(--r2-muted)]">
              {line.xrefs.map((xref) => (
                <button
                  key={`${line.address}-${xref.target}`}
                  type="button"
                  onClick={() => labMode && onSelect(xref.target)}
                  className={classNames(
                    'rounded border border-[color:var(--r2-border)] px-2 py-1 transition',
                    labMode
                      ? 'bg-black/20 text-[color:var(--r2-text)] hover:border-[color:var(--r2-accent)]'
                      : 'cursor-not-allowed opacity-60',
                  )}
                  aria-label={`Follow ${xref.type} to ${xref.target}`}
                  aria-disabled={!labMode}
                >
                  {xref.type} → {xref.target}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const TutorialOverlay = ({ steps, stepIndex, onClose, onPrevious, onNext }) => {
  const current = steps[stepIndex];
  if (!current) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
      <div
        className="max-w-lg rounded-xl border border-[color:var(--r2-border)] bg-[color:var(--r2-surface)] p-6 text-[color:var(--r2-text)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="radare2-tutorial-title"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--r2-muted)]">Guided overlay</p>
        <h2 id="radare2-tutorial-title" className="mt-2 text-lg font-semibold">{current.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--r2-text)]/80">{current.body}</p>
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[color:var(--r2-border)] px-3 py-1 text-xs uppercase tracking-wide text-[color:var(--r2-text)] hover:border-[color:var(--r2-accent)]"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              disabled={stepIndex === 0}
              className="rounded border border-[color:var(--r2-border)] px-3 py-1 text-xs uppercase tracking-wide disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded bg-[color:var(--r2-accent)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0b101b]"
            >
              {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Radare2Lab = () => {
  const [datasetId, setDatasetId] = useState(radare2Datasets[0]?.id ?? '');
  const dataset = useMemo(
    () => radare2Datasets.find((entry) => entry.id === datasetId) ?? radare2Datasets[0],
    [datasetId],
  );
  const [activeView, setActiveView] = useState('hexdump');
  const [selectedAddress, setSelectedAddress] = useState(dataset?.defaultFocus ?? '');
  const [labMode, setLabMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    setSelectedAddress(dataset?.defaultFocus ?? '');
    setActiveView('hexdump');
    setLabMode(false);
    setShowTutorial(true);
    setTutorialStep(0);
  }, [dataset]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setShowTutorial(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const activeDisassemblyLine = useMemo(
    () => dataset?.disassembly.find((line) => line.address === selectedAddress),
    [dataset, selectedAddress],
  );
  const outgoingRefs = activeDisassemblyLine?.xrefs ?? [];
  const incomingRefs = useMemo(() => {
    if (!dataset) return [];
    return dataset.disassembly.filter((line) =>
      (line.xrefs ?? []).some((xref) => xref.target === selectedAddress),
    );
  }, [dataset, selectedAddress]);

  const handleSelectAddress = (address) => {
    if (!address) return;
    setSelectedAddress(address);
  };

  const handleGraphSelect = (address) => {
    if (!labMode) return;
    setSelectedAddress(address);
    setActiveView('disassembly');
  };

  const statusMessage = useMemo(() => {
    if (!dataset) return 'No dataset loaded';
    const label = dataset.references[selectedAddress];
    if (label) {
      return `${selectedAddress} · ${label}`;
    }
    if (selectedAddress) {
      return `${selectedAddress} ready`;
    }
    return 'Navigate the dataset';
  }, [dataset, selectedAddress]);

  if (!dataset) {
    return (
      <div className="flex h-full items-center justify-center bg-black/40 text-white">
        Unable to load datasets.
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-[color:var(--r2-bg)] text-[color:var(--r2-text)]" style={themeTokens}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--r2-border)] px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-wide text-[color:var(--r2-text)]">Radare2 Lab</h1>
          <p className="mt-1 text-sm text-[color:var(--r2-muted)]">Simulated reverse-engineering workspace with offline captures.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[color:var(--r2-border)] px-3 py-1 text-xs uppercase tracking-[0.2em]">Offline data</span>
          <label className="text-xs uppercase text-[color:var(--r2-muted)]">
            Dataset
            <select
              className="ml-2 rounded border border-[color:var(--r2-border)] bg-[color:var(--r2-surface)] px-2 py-1 text-sm text-[color:var(--r2-text)] focus:border-[color:var(--r2-accent)] focus:outline-none"
              value={datasetId}
              onChange={(event) => setDatasetId(event.target.value)}
            >
              {radare2Datasets.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setLabMode((value) => !value)}
            className={classNames(
              'rounded border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
              labMode
                ? 'border-[color:var(--r2-accent)] bg-[color:var(--r2-accent)] text-[#0b101b]'
                : 'border-[color:var(--r2-border)] bg-[color:var(--r2-surface)] text-[color:var(--r2-text)] hover:border-[color:var(--r2-accent)]',
            )}
            aria-pressed={labMode}
          >
            {labMode ? 'Lab mode active' : 'Enable lab mode'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowTutorial(true);
              setTutorialStep(0);
            }}
            className="rounded border border-[color:var(--r2-border)] px-3 py-1 text-xs uppercase tracking-wide text-[color:var(--r2-text)] hover:border-[color:var(--r2-accent)]"
          >
            Tutorial
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <section className="flex min-h-[320px] flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex rounded border border-[color:var(--r2-border)] bg-[color:var(--r2-surface)] p-1 text-xs uppercase tracking-wide" role="tablist" aria-label="Code views">
              {['hexdump', 'disassembly'].map((view) => (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  aria-selected={activeView === view}
                  className={classNames(
                    'rounded px-3 py-1 transition',
                    activeView === view
                      ? 'bg-[color:var(--r2-accent)] text-[#0b101b]'
                      : 'text-[color:var(--r2-text)] hover:bg-[color:var(--r2-highlight)]/10',
                  )}
                  onClick={() => setActiveView(view)}
                >
                  {view}
                </button>
              ))}
            </div>
            <div className="text-xs text-[color:var(--r2-muted)]">Entry {dataset.entry}</div>
          </div>
          {activeView === 'hexdump' ? (
            <HexView
              hexdump={dataset.hexdump}
              selectedAddress={selectedAddress}
              onSelect={handleSelectAddress}
            />
          ) : (
            <DisassemblyView
              disassembly={dataset.disassembly}
              selectedAddress={selectedAddress}
              onSelect={handleSelectAddress}
              labMode={labMode}
            />
          )}
          <div className="rounded-lg border border-[color:var(--r2-border)] bg-[color:var(--r2-surface)] p-4 text-xs text-[color:var(--r2-text)]">
            <h3 className="text-sm font-semibold text-[color:var(--r2-text)]">Cross-references</h3>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-[color:var(--r2-muted)]">Outgoing</p>
                <ul className="mt-1 space-y-1">
                  {outgoingRefs.length === 0 && (
                    <li className="text-[color:var(--r2-muted)]">No outgoing references</li>
                  )}
                  {outgoingRefs.map((xref) => (
                    <li key={`${selectedAddress}-${xref.target}`}>
                      <button
                        type="button"
                        onClick={() => labMode && handleSelectAddress(xref.target)}
                        className={classNames(
                          'rounded border px-2 py-1 font-mono text-[11px]',
                          labMode
                            ? 'border-[color:var(--r2-border)] text-[color:var(--r2-text)] hover:border-[color:var(--r2-accent)]'
                            : 'cursor-not-allowed border-dashed border-[color:var(--r2-border)] text-[color:var(--r2-muted)]',
                        )}
                        aria-disabled={!labMode}
                      >
                        {xref.target} ({xref.type})
                      </button>
                      {xref.description && (
                        <p className="mt-1 text-[color:var(--r2-muted)]">{xref.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[color:var(--r2-muted)]">Incoming</p>
                <ul className="mt-1 space-y-1">
                  {incomingRefs.length === 0 && (
                    <li className="text-[color:var(--r2-muted)]">No incoming references</li>
                  )}
                  {incomingRefs.map((line) => (
                    <li key={`incoming-${line.address}`}>
                      <button
                        type="button"
                        onClick={() => handleSelectAddress(line.address)}
                        className="rounded border border-[color:var(--r2-border)] px-2 py-1 font-mono text-[11px] text-[color:var(--r2-text)] hover:border-[color:var(--r2-accent)]"
                      >
                        {line.address} ({line.mnemonic})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
        <section className="flex min-h-[320px] flex-col gap-4">
          <GraphCanvas
            nodes={dataset.graph.nodes}
            edges={dataset.graph.edges}
            selectedAddress={selectedAddress}
            onSelect={handleGraphSelect}
            labMode={labMode}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-[color:var(--r2-border)] bg-[color:var(--r2-surface)] p-4 text-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--r2-text)]">Metadata</h2>
              <dl className="mt-3 space-y-2 text-[color:var(--r2-muted)]">
                <div className="flex justify-between gap-2">
                  <dt>Binary</dt>
                  <dd className="font-mono text-[color:var(--r2-text)]">{dataset.fileName}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Architecture</dt>
                  <dd>{dataset.architecture}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Format</dt>
                  <dd>{dataset.format}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Compiler</dt>
                  <dd>{dataset.compiler}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Release</dt>
                  <dd>{dataset.release}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-[color:var(--r2-text)]/75">{dataset.description}</p>
              <div className="mt-3 space-y-1 text-xs text-[color:var(--r2-text)]">
                <p className="font-semibold uppercase tracking-wide">Security flags</p>
                <ul className="space-y-1">
                  {dataset.security.map((flag) => (
                    <li key={flag} className="flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-[color:var(--r2-accent)]" aria-hidden="true" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-[color:var(--r2-border)] bg-[color:var(--r2-surface)] p-4 text-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--r2-text)]">Findings</h2>
              <ul className="space-y-3">
                {dataset.findings.map((finding) => (
                  <li
                    key={finding.id}
                    className={classNames(
                      'rounded border px-3 py-2 text-xs',
                      severityStyles[finding.severity] ?? severityStyles.info,
                    )}
                  >
                    <p className="font-semibold text-[color:var(--r2-text)]">{finding.title}</p>
                    <p className="mt-1 text-[color:var(--r2-text)]/80">{finding.detail}</p>
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-2 rounded border border-[color:var(--r2-border)] px-2 py-1 font-mono text-[11px] text-[color:var(--r2-text)] hover:border-[color:var(--r2-accent)]"
                      onClick={() => handleSelectAddress(finding.address)}
                    >
                      Focus {finding.address}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-lg border border-[color:var(--r2-border)] bg-[color:var(--r2-surface)] p-4 text-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--r2-text)]">Address metadata</h2>
            <p className="mt-1 text-[color:var(--r2-muted)]">{statusMessage}</p>
          </div>
        </section>
      </div>
      <div
        className="sr-only"
        aria-live="polite"
      >
        {statusMessage}
      </div>
      {showTutorial && (
        <TutorialOverlay
          steps={dataset.tutorial}
          stepIndex={tutorialStep}
          onClose={() => setShowTutorial(false)}
          onPrevious={() => setTutorialStep((value) => Math.max(0, value - 1))}
          onNext={() => {
            if (tutorialStep === dataset.tutorial.length - 1) {
              setShowTutorial(false);
            } else {
              setTutorialStep((value) => Math.min(dataset.tutorial.length - 1, value + 1));
            }
          }}
        />
      )}
    </div>
  );
};

export default Radare2Lab;
