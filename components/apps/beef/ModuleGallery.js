import React, { useEffect, useMemo, useState } from 'react';
import modulesData from './modules.json';

const demoSequences = {
  alert: [
    '📡 Deploying payload: alert dialog stub',
    '🖥️ Browser executed window.alert("BeEF demo alert!")',
    '✅ Operator saw acknowledgement in the sandboxed iframe',
  ],
  prompt: [
    '📨 Shipping prompt dialog payload',
    '⌨️ Target prompted for demo text input',
    '✅ Input captured locally for review only',
  ],
  confirm: [
    '🔁 Sending confirmation request',
    '🖱️ Target clicked "OK" within the simulated dialog',
    '✅ Confirmation state: accepted (demo)',
  ],
  'get-cookie': [
    '🍪 Enumerating document.cookie …',
    '📄 Captured sample: session=demo-token; secure',
    '✅ Stored locally; nothing transmitted outward',
  ],
  'get-local-storage': [
    '📦 Inspecting localStorage keys',
    '🗂️ Keys discovered: ["theme", "remember_me"]',
    '✅ Values persisted inside demo vault',
  ],
  'get-session-storage': [
    '📦 Inspecting sessionStorage footprint',
    '🗂️ Keys discovered: ["csrf", "analytics"]',
    '✅ Session entries cleared after review',
  ],
  'browser-info': [
    '🔍 Fingerprinting user agent details',
    '🧠 UA string parsed into JSON profile',
    '✅ Profile cached in offline report',
  ],
  'detect-plugins': [
    '🔌 Querying navigator.plugins collection',
    '📊 Plugin count simulated: 3 (PDF, DRM, WebRTC)',
    '✅ Recon result logged locally',
  ],
  geolocation: [
    '📍 Requesting geolocation permission',
    '🗺️ Demo coordinates resolved: 37.7749, -122.4194',
    '✅ Coordinates masked before storage',
  ],
  'play-sound': [
    '🔊 Preparing audio buffer',
    '🎵 Playback started: 440Hz sine wave (simulated)',
    '✅ Audio channel stopped after preview',
  ],
  'change-background': [
    '🎨 Sending style mutation command',
    '🌈 Background toggled to lime accent',
    '✅ DOM style reset queued',
  ],
  'open-tab': [
    '🌐 Crafting window.open payload',
    "🪟 Simulated tab launch to https://example.com",
    '✅ Operator log updated with virtual visit',
  ],
  redirect: [
    '🚦 Injecting location redirect',
    '➡️ Target navigated to https://example.com (simulated)',
    '✅ Original page restored in sandbox',
  ],
  'fetch-url': [
    '🌐 Dispatching fetch request to https://example.com',
    '🧾 Retrieved demo HTML snippet (length: 245 chars)',
    '✅ Response cached in offline log',
  ],
  'port-scan': [
    '🛰️ Initiating virtual port sweep',
    '📡 Ports 22, 80, 443 marked as "open" (demo)',
    '✅ Report saved with simulated latency chart',
  ],
  'network-scan': [
    '🌐 Launching internal network discovery',
    '🖥️ Detected demo hosts: 192.168.0.10, 192.168.0.42',
    '✅ Recon map updated in sandbox',
  ],
  keylogger: [
    '⌨️ Injecting keylogger hook',
    '📝 Capturing demo keystrokes: hunter2',
    '✅ Log encrypted and stored locally only',
  ],
  clipboard: [
    '📋 Requesting clipboard read permission',
    '🧾 Sample clipboard text: "demo payload"',
    '✅ Clipboard buffer cleared after inspection',
  ],
  screenshot: [
    '📷 Preparing canvas renderer',
    '🖼️ Captured 1280x720 frame (simulated)',
    '✅ Image cached inside sandboxed store',
  ],
  'webcam-snapshot': [
    '🎥 Requesting webcam stream',
    '🖼️ Snapshot captured at 640x480 (placeholder)',
    '✅ Media stream stopped and discarded',
  ],
};

const defaultSequence = (moduleName) => [
  `▶️ Running ${moduleName} demo sequence`,
  'ℹ️ Awaiting simulated output …',
  '✅ Demo finished; no data left the browser',
];

export default function ModuleGallery() {
  const modules = modulesData.modules;

  const moduleMap = useMemo(() => {
    return modules.reduce((acc, module) => {
      acc[module.id] = module;
      return acc;
    }, {});
  }, [modules]);

  const groupedByTag = useMemo(() => {
    return modules.reduce((acc, module) => {
      const primaryTag = module.tags?.[0] ?? 'Other';
      if (!acc[primaryTag]) {
        acc[primaryTag] = [];
      }
      acc[primaryTag].push(module);
      return acc;
    }, {});
  }, [modules]);

  const sortedTags = useMemo(
    () => Object.keys(groupedByTag).sort((a, b) => a.localeCompare(b)),
    [groupedByTag],
  );

  const [activeModuleId, setActiveModuleId] = useState(modules[0]?.id ?? null);
  const [displayedLines, setDisplayedLines] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [completedModules, setCompletedModules] = useState({});

  const activeSequence = useMemo(() => {
    if (!activeModuleId) {
      return [];
    }
    const name = moduleMap[activeModuleId]?.name ?? 'Module';
    return demoSequences[activeModuleId] ?? defaultSequence(name);
  }, [activeModuleId, moduleMap]);

  useEffect(() => {
    if (!isRunning || !activeModuleId) {
      return undefined;
    }

    if (displayedLines.length >= activeSequence.length) {
      const completionTimer = setTimeout(() => {
        setIsRunning(false);
      }, 400);
      return () => clearTimeout(completionTimer);
    }

    const timer = setTimeout(() => {
      setDisplayedLines((prev) => {
        if (prev.length >= activeSequence.length) {
          return prev;
        }
        return [...prev, activeSequence[prev.length]];
      });
    }, 450);

    return () => clearTimeout(timer);
  }, [activeSequence, activeModuleId, displayedLines.length, isRunning]);

  useEffect(() => {
    if (!isRunning && activeModuleId && displayedLines.length === activeSequence.length && activeSequence.length > 0) {
      setCompletedModules((prev) => ({ ...prev, [activeModuleId]: true }));
    }
  }, [activeModuleId, activeSequence.length, displayedLines.length, isRunning]);

  const handleRunDemo = (moduleId) => {
    setActiveModuleId(moduleId);
    setDisplayedLines([]);
    setIsRunning(true);
  };

  const activeModule = activeModuleId ? moduleMap[activeModuleId] : null;
  const progress = activeSequence.length
    ? Math.min(100, Math.round((displayedLines.length / activeSequence.length) * 100))
    : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-ubt-grey">
        Explore BeEF module simulations grouped by focus area. Each tile lists the intended output type and links to the real
        documentation. Launch a demo to watch a short, deterministic animation of the simulated result.
      </p>
      <div className="space-y-6">
        {sortedTags.map((tag) => (
          <section key={tag} aria-label={`${tag} modules`} className="space-y-3">
            <header className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{tag}</h3>
              <span className="text-xs uppercase tracking-wide text-ubt-grey">
                {groupedByTag[tag].length} module{groupedByTag[tag].length > 1 ? 's' : ''}
              </span>
            </header>
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {groupedByTag[tag]
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((module) => {
                  const isActive = module.id === activeModuleId;
                  const isComplete = completedModules[module.id];

                  return (
                    <article
                      key={module.id}
                      className="border border-white/10 rounded-md bg-black/40 p-4 shadow-inner backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-white">{module.name}</h4>
                          <p className="text-xs text-ubt-grey">Output: {module.outputType}</p>
                        </div>
                        {isComplete && <span className="text-ub-primary text-xs font-semibold">Done</span>}
                      </div>
                      <p className="mt-2 text-xs text-ubt-grey leading-relaxed">{module.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {module.tags.slice(1).map((moduleTag) => (
                          <span key={moduleTag} className="bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70 rounded">
                            {moduleTag}
                          </span>
                        ))}
                      </div>
                      <pre className="mt-3 overflow-auto rounded bg-black/60 p-2 text-[11px] text-emerald-200">
                        {module.demo}
                      </pre>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleRunDemo(module.id)}
                          className="px-3 py-1 text-xs rounded bg-ub-primary text-white hover:bg-ub-primary/90 disabled:opacity-60"
                          disabled={isRunning && isActive}
                        >
                          {isActive && isRunning ? 'Running…' : 'Run demo'}
                        </button>
                        <a
                          href={module.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-300 hover:text-sky-200"
                        >
                          Docs
                        </a>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
      {activeModule && (
        <div className="rounded-md border border-white/10 bg-black/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-white">{activeModule.name} demo timeline</h4>
              <p className="text-xs text-ubt-grey">{activeModule.outputType} • primary tag: {activeModule.tags[0]}</p>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-ubt-grey">{progress}%</span>
          </div>
          <div className="mt-2 h-2 rounded bg-white/10">
            <div className="h-full rounded bg-ub-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 grid gap-1 text-xs font-mono text-emerald-200">
            {displayedLines.length > 0 ? (
              displayedLines.map((line, index) => <span key={`${line}-${index.toString()}`}>{line}</span>)
            ) : (
              <span className="text-ubt-grey">Run a module to stream its simulation output.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
