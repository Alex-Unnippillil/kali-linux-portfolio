import React, { useEffect, useMemo, useRef, useState } from 'react';

import modulesFixture from './modules.json';

const hooksFixture = [
  {
    id: 'hook-1',
    label: 'Training Portal - Chrome 114',
    lastCheckInSeconds: 42,
    risk: 'Medium',
    vector: 'Phishing landing page',
    tags: ['Win10 Lab', 'Chrome'],
  },
  {
    id: 'hook-2',
    label: 'Intranet Wiki - Firefox 118',
    lastCheckInSeconds: 123,
    risk: 'Low',
    vector: 'Drive-by demo',
    tags: ['Ubuntu Lab', 'Firefox'],
  },
  {
    id: 'hook-3',
    label: 'Helpdesk Tablet - Chromium 115',
    lastCheckInSeconds: 12,
    risk: 'High',
    vector: 'USB drop simulation',
    tags: ['Android Lab', 'Chromium'],
  },
];

const scenarioWalkthrough = [
  {
    id: 'phase-recon',
    title: 'Reconnaissance',
    description:
      'Review lab telemetry and validate that every hook originated from approved training hosts before interacting.',
    hint: 'Use the hook list filters to locate compliant devices.',
  },
  {
    id: 'phase-delivery',
    title: 'Delivery',
    description:
      'Launch low-risk notification modules first to illustrate BeEF capability progression without disruptive effects.',
    hint: 'Look for modules marked Low risk to begin the sequence.',
  },
  {
    id: 'phase-post',
    title: 'Post-Exploitation',
    description:
      'Record simulated findings and archive expected outputs to the command log for the training recap.',
    hint: 'Command composer history keeps every deterministic run.',
  },
];

const expectedOutputs = {
  alert: 'Alert displayed with static training copy.',
  prompt: 'Prompt collected demo input: "demo".',
  confirm: 'Confirm dialog captured affirmative response.',
  'get-cookie': 'Cookies enumerated: training_session=mock.',
  'get-local-storage': 'localStorage keys: ["lab-theme", "lab-progress"].',
  'get-session-storage': 'sessionStorage keys: ["exerciseId"].',
  'browser-info': 'User agent parsed for browser fingerprint.',
  'detect-plugins': 'Detected 2 plugins exposed to the DOM.',
  geolocation: 'Geolocation request blocked inside lab sandbox.',
  'play-sound': 'Audio element instantiated (muted in sandbox).',
  'change-background': 'Document background changed to lime.',
  'open-tab': 'New tab simulated to https://example.com.',
  redirect: 'Location redirect suppressed for safety.',
  'fetch-url': 'Fetch response simulated with 200 OK.',
  'port-scan': 'Port scan simulated with closed ports only.',
  'network-scan': 'Network discovery returns lab placeholder hosts.',
  keylogger: 'Keylogger disabled—training string substituted.',
  clipboard: 'Clipboard read yields "training buffer".',
  screenshot: 'Screenshot call replaced with static overlay.',
  'webcam-snapshot': 'Webcam request stubbed—no hardware accessed.',
};

const moduleRiskMapping = {
  alert: 'Low',
  prompt: 'Low',
  confirm: 'Low',
  'get-cookie': 'Medium',
  'get-local-storage': 'Medium',
  'get-session-storage': 'Medium',
  'browser-info': 'Medium',
  'detect-plugins': 'Medium',
  geolocation: 'Medium',
  'play-sound': 'Low',
  'change-background': 'Low',
  'open-tab': 'Medium',
  redirect: 'Medium',
  'fetch-url': 'Medium',
  'port-scan': 'High',
  'network-scan': 'High',
  keylogger: 'High',
  clipboard: 'High',
  screenshot: 'High',
  'webcam-snapshot': 'High',
};

const riskTone = {
  Low: {
    chip: 'border-kali-primary/50 bg-kali-primary/10 text-kali-primary shadow-[0_0_12px_rgba(15,148,210,0.3)]',
    label: 'Low',
    description: 'Minimal impact demonstration',
  },
  Medium: {
    chip: 'border-kali-accent/60 bg-kali-accent/15 text-kali-accent shadow-[0_0_12px_rgba(26,220,170,0.35)]',
    label: 'Medium',
    description: 'Observe carefully in guided lab',
  },
  High: {
    chip: 'border-kali-error/70 bg-kali-error/15 text-kali-error shadow-[0_0_18px_rgba(255,77,109,0.4)]',
    label: 'High',
    description: 'Critical capability—log results',
  },
};

const formatLastSeen = (seconds) => {
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (remainder === 0) {
    return `${minutes}m ago`;
  }

  return `${minutes}m ${remainder}s ago`;
};

const useTypewriter = (text, key) => {
  const [rendered, setRendered] = useState('');

  useEffect(() => {
    setRendered('');
    if (!text) {
      return () => {};
    }

    let frame = 0;
    const chars = Array.from(text);
    const interval = window.setInterval(() => {
      frame += 1;
      setRendered((prev) => prev + (chars[frame - 1] ?? ''));
      if (frame >= chars.length) {
        window.clearInterval(interval);
      }
    }, 24);

    return () => {
      window.clearInterval(interval);
    };
  }, [text, key]);

  return rendered;
};

export default function BeefLabDashboard() {
  const [labEnabled, setLabEnabled] = useState(false);
  const [labAcknowledged, setLabAcknowledged] = useState(false);
  const [selectedHook, setSelectedHook] = useState(hooksFixture[0]?.id ?? '');
  const [selectedModuleId, setSelectedModuleId] = useState(modulesFixture.modules[0]?.id ?? '');
  const [parameters, setParameters] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const moduleButtonRefs = useRef([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('beef-lab-mode');
      if (saved === 'enabled') {
        setLabEnabled(true);
        setLabAcknowledged(true);
      }
    } catch {
      // ignore persistence errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('beef-lab-mode', labEnabled ? 'enabled' : 'disabled');
    } catch {
      // ignore persistence errors
    }
  }, [labEnabled]);

  const moduleCards = useMemo(() => {
    return modulesFixture.modules.map((module) => {
      const risk = moduleRiskMapping[module.id] ?? 'Medium';
      return {
        ...module,
        risk,
        riskMeta: riskTone[risk],
        expected: expectedOutputs[module.id] ?? 'Deterministic result recorded for the lab log.',
      };
    });
  }, []);

  const selectedModule = moduleCards.find((mod) => mod.id === selectedModuleId) ?? moduleCards[0];
  const previewText = useTypewriter(selectedModule?.expected ?? '', selectedModule?.id);

  const enableLab = () => {
    if (!labAcknowledged) {
      return;
    }
    setLabEnabled(true);
  };

  const resetLab = () => {
    setLabEnabled(false);
    setLabAcknowledged(false);
    setParameters('');
    setCommandHistory([]);
  };

  const onComposerSubmit = (event) => {
    event.preventDefault();
    if (!selectedModule || !labEnabled) {
      return;
    }

    setCommandHistory((prev) => [
      {
        id: `${selectedHook}:${selectedModule.id}:${Date.now()}`,
        hookId: selectedHook,
        module: selectedModule,
        parameters: parameters.trim() || 'No parameters supplied',
        timestamp: new Date().toLocaleTimeString(),
        preview: selectedModule.expected,
      },
      ...prev,
    ]);
    setParameters('');
  };

  const handleModuleKeyDown = (event, index) => {
    const { key } = event;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown') {
      return;
    }

    event.preventDefault();
    const columnCount = window.matchMedia('(min-width: 1024px)').matches ? 3 : 1;
    let nextIndex = index;

    if (key === 'ArrowRight') {
      nextIndex = (index + 1) % moduleCards.length;
    } else if (key === 'ArrowLeft') {
      nextIndex = (index - 1 + moduleCards.length) % moduleCards.length;
    } else if (key === 'ArrowDown') {
      nextIndex = Math.min(index + columnCount, moduleCards.length - 1);
    } else if (key === 'ArrowUp') {
      nextIndex = Math.max(index - columnCount, 0);
    }

    moduleButtonRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div
        role="alert"
        className="rounded-xl border border-kali-border/70 bg-[color:var(--kali-overlay)] p-4 text-sm text-kali-text shadow-[0_14px_32px_rgba(15,148,210,0.16)]"
      >
        <p className="font-semibold text-kali-accent">
          Training reminder: BeEF capabilities are simulated. No network traffic leaves this environment.
        </p>
        <p className="mt-2 text-kali-text/80">
          Lab mode prevents unsafe actions until you acknowledge the acceptable-use policy below. Scenario walkthroughs guide you
          through an end-to-end demonstration.
        </p>
      </div>

      {!labEnabled && (
        <section
          aria-labelledby="beef-lab-gate"
          className="rounded-2xl border border-kali-accent/60 bg-[color:var(--kali-panel)] p-6 shadow-[0_18px_44px_rgba(15,148,210,0.22)]"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="beef-lab-gate" className="text-lg font-semibold text-kali-text">
                Lab mode is locked
              </h2>
              <p className="mt-1 text-sm text-kali-text/75">
                Confirm that you understand this walkthrough is strictly for approved training. All payloads are deterministic and
                remain inside the browser sandbox.
              </p>
            </div>
            <button
              type="button"
              onClick={resetLab}
              className="rounded-full border border-kali-border/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-kali-text/70 transition hover:border-kali-accent/60 hover:text-kali-accent"
            >
              Reset state
            </button>
          </div>
          <div className="mt-4 flex items-start gap-3 text-sm text-kali-text/80">
            <input
              id="beef-lab-acknowledge"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-kali-border/70 bg-[color:var(--kali-overlay)] text-kali-accent focus:ring-kali-accent"
              checked={labAcknowledged}
              onChange={(event) => setLabAcknowledged(event.target.checked)}
              aria-labelledby="beef-lab-acknowledge-label"
            />
            <label id="beef-lab-acknowledge-label" htmlFor="beef-lab-acknowledge" className="cursor-pointer">
              I understand this BeEF lab is self-contained, recorded for instruction, and should never target production systems.
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={enableLab}
              className="rounded-lg bg-kali-accent px-4 py-2 text-sm font-semibold text-kali-inverse shadow-[0_0_18px_rgba(26,220,170,0.45)] transition hover:bg-[color:color-mix(in_srgb,var(--color-accent)_85%,var(--kali-panel))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
            >
              Enable lab mode
            </button>
            <p className="text-xs text-kali-text/60">
              Access unlocks hook controls, module explorer, and the guided command composer.
            </p>
          </div>
        </section>
      )}

      <section
        aria-label="Scenario walkthrough"
        className="grid gap-4 md:grid-cols-3"
      >
        {scenarioWalkthrough.map((step, index) => (
          <article
            key={step.id}
            className="relative rounded-2xl border border-kali-border/60 bg-[color:var(--kali-panel)] p-4 shadow-[0_16px_38px_rgba(15,148,210,0.18)] transition hover:shadow-[0_22px_46px_rgba(26,220,170,0.28)] focus-within:ring-2 focus-within:ring-kali-accent/60"
          >
            <span className="absolute -top-3 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-kali-accent/60 bg-[color:var(--kali-overlay)] text-xs font-semibold uppercase tracking-[0.2em] text-kali-accent shadow-[0_0_18px_rgba(26,220,170,0.3)]">
              {index + 1}
            </span>
            <h3 className="text-sm font-semibold text-kali-text">{step.title}</h3>
            <p className="mt-2 text-sm text-kali-text/75">{step.description}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-kali-accent">Lab tip</p>
            <p className="mt-1 text-xs text-kali-text/65">{step.hint}</p>
          </article>
        ))}
      </section>

      <section
        aria-labelledby="hooked-clients-heading"
        className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-kali-border/70 bg-[color:var(--kali-panel)] p-4 shadow-[0_18px_44px_rgba(15,148,210,0.18)]">
            <header className="flex items-center justify-between">
              <div>
                <h2 id="hooked-clients-heading" className="text-base font-semibold text-kali-text">
                  Hooked clients
                </h2>
                <p className="text-xs text-kali-text/70">
                  {hooksFixture.length} simulated browsers connected • Keyboard navigation supported
                </p>
              </div>
              {labEnabled ? (
                <span className="rounded-full border border-kali-accent/60 bg-kali-accent/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-kali-accent shadow-[0_0_12px_rgba(26,220,170,0.35)]">
                  Lab enabled
                </span>
              ) : (
                <span className="rounded-full border border-kali-border/60 bg-[color:var(--kali-overlay)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-kali-text/70">
                  Locked
                </span>
              )}
            </header>
            <ul role="list" aria-label="Hooked clients" className="mt-4 flex flex-col gap-3">
              {hooksFixture.map((hook) => (
                <li key={hook.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedHook(hook.id)}
                    className={`group w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)] ${
                      selectedHook === hook.id
                        ? 'border-kali-accent/70 bg-kali-accent/15 shadow-[0_0_24px_rgba(26,220,170,0.35)]'
                        : 'border-kali-border/60 bg-[color:var(--kali-overlay)] hover:border-kali-accent/50 hover:bg-kali-accent/10'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-kali-text">{hook.label}</p>
                        <p className="text-xs text-kali-text/65">
                          Last check-in {formatLastSeen(hook.lastCheckInSeconds)} • {hook.vector}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${riskTone[hook.risk].chip}`}>
                        {hook.risk} risk
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-kali-text/60">
                      {hook.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-kali-border/50 bg-[color:var(--kali-overlay)] px-3 py-1 text-kali-text/70 shadow-inner"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-kali-border/70 bg-[color:var(--kali-panel)] p-4 shadow-[0_18px_44px_rgba(15,148,210,0.18)]">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-kali-text">Command composer</h2>
                <p className="text-xs text-kali-text/70">Craft simulated runs. Output is captured for the recap log.</p>
              </div>
              <button
                type="button"
                onClick={resetLab}
                className="rounded-lg border border-kali-border/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-kali-text/60 transition hover:border-kali-accent/60 hover:text-kali-accent"
              >
                Reset lab
              </button>
            </header>
            <form className="mt-4 flex flex-col gap-4" onSubmit={onComposerSubmit}>
              <div className="flex flex-col gap-2 text-sm text-kali-text/80">
                <label id="beef-target-hook-label" htmlFor="beef-target-hook" className="text-sm text-kali-text/80">
                  Target hook
                </label>
                <select
                  id="beef-target-hook"
                  value={selectedHook}
                  onChange={(event) => setSelectedHook(event.target.value)}
                  className="rounded-lg border border-kali-border/70 bg-[color:var(--kali-overlay)] px-3 py-2 text-sm text-kali-text focus:border-kali-accent focus:outline-none focus:ring-2 focus:ring-kali-accent/60"
                  disabled={!labEnabled}
                  aria-labelledby="beef-target-hook-label"
                >
                  {hooksFixture.map((hook) => (
                    <option key={hook.id} value={hook.id}>
                      {hook.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 text-sm text-kali-text/80">
                <label id="beef-module-select-label" htmlFor="beef-module-select" className="text-sm text-kali-text/80">
                  Module
                </label>
                <select
                  id="beef-module-select"
                  value={selectedModule?.id}
                  onChange={(event) => setSelectedModuleId(event.target.value)}
                  className="rounded-lg border border-kali-border/70 bg-[color:var(--kali-overlay)] px-3 py-2 text-sm text-kali-text focus:border-kali-accent focus:outline-none focus:ring-2 focus:ring-kali-accent/60"
                  disabled={!labEnabled}
                  aria-labelledby="beef-module-select-label"
                >
                  {moduleCards.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 text-sm text-kali-text/80">
                <label id="beef-command-parameters-label" htmlFor="beef-command-parameters" className="text-sm text-kali-text/80">
                  Parameters
                </label>
                <textarea
                  id="beef-command-parameters"
                  value={parameters}
                  onChange={(event) => setParameters(event.target.value)}
                  placeholder='ex: {"message": "Training alert"}'
                  className="min-h-[96px] rounded-lg border border-kali-border/70 bg-[color:var(--kali-overlay)] px-3 py-2 text-sm text-kali-text placeholder:text-kali-text/40 focus:border-kali-accent focus:outline-none focus:ring-2 focus:ring-kali-accent/60"
                  disabled={!labEnabled}
                  aria-labelledby="beef-command-parameters-label"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-kali-primary px-4 py-2 text-sm font-semibold text-kali-inverse shadow-[0_0_18px_rgba(15,148,210,0.45)] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_85%,var(--kali-panel))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
                disabled={!labEnabled}
              >
                Run command
              </button>
            </form>
            <div className="mt-4 rounded-xl border border-kali-border/60 bg-[color:var(--kali-overlay)] p-3 text-xs text-kali-text/70">
              <p className="font-semibold uppercase tracking-[0.3em] text-kali-text/60">Preview</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-kali-text transition-all">
                {labEnabled ? previewText : 'Enable lab mode to preview deterministic command responses.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-kali-border/70 bg-[color:var(--kali-panel)] p-4 shadow-[0_18px_44px_rgba(15,148,210,0.18)]">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-kali-text">Module explorer</h2>
                <p className="text-xs text-kali-text/70">Browse fixtures sourced from BeEF documentation.</p>
              </div>
            </header>
            <ul role="list" aria-label="Module explorer" className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {moduleCards.map((module, index) => {
                const moduleLabelId = `beef-module-${module.id}-label`;
                return (
                  <li key={module.id} className="h-full">
                    <button
                      type="button"
                      ref={(element) => {
                        moduleButtonRefs.current[index] = element;
                      }}
                      onKeyDown={(event) => handleModuleKeyDown(event, index)}
                      onClick={() => setSelectedModuleId(module.id)}
                      aria-labelledby={moduleLabelId}
                      className={`flex h-full flex-col justify-between rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)] ${
                        selectedModule?.id === module.id
                          ? 'border-kali-primary/70 bg-kali-primary/10 shadow-[0_0_26px_rgba(15,148,210,0.4)]'
                          : 'border-kali-border/60 bg-[color:var(--kali-overlay)] hover:border-kali-primary/50 hover:bg-kali-primary/10'
                      }`}
                    >
                      <div>
                        <p id={moduleLabelId} className="text-sm font-semibold text-kali-text">
                          {module.name}
                        </p>
                        <p className="mt-1 text-xs text-kali-text/70">{module.description}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-kali-text/60">
                        <span className={`rounded-full border px-3 py-1 ${module.riskMeta.chip}`}>{module.risk} risk</span>
                        <span className="rounded-full border border-kali-border/60 bg-[color:var(--kali-overlay)] px-3 py-1">
                          Expected: {module.expected.split(':')[0] ?? 'Deterministic'}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-kali-text/60">
              All modules run client-side with animations only—no fetch requests are triggered.
            </p>
          </div>

          <div className="rounded-2xl border border-kali-border/70 bg-[color:var(--kali-panel)] p-4 shadow-[0_18px_44px_rgba(15,148,210,0.18)]">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-kali-text">Command history</h2>
                <p className="text-xs text-kali-text/70">Latest entries appear first. Entries animate when recorded.</p>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-kali-text/60">
                {commandHistory.length} entries
              </span>
            </header>
            <ul role="list" aria-label="Command history" className="mt-4 flex flex-col gap-3">
              {commandHistory.length === 0 && (
                <li className="rounded-xl border border-dashed border-kali-border/60 bg-[color:var(--kali-overlay)] px-4 py-6 text-center text-sm text-kali-text/60">
                  Run a command to populate the history log. Results render instantly with animated previews.
                </li>
              )}
              {commandHistory.map((entry) => (
                <li
                  key={entry.id}
                  className="animate-[fadeIn_0.35s_ease] rounded-xl border border-kali-border/70 bg-[color:var(--kali-overlay)] p-4 shadow-[0_0_20px_rgba(15,148,210,0.18)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-kali-text/60">
                    <span className="font-semibold uppercase tracking-[0.3em] text-kali-text/75">{entry.timestamp}</span>
                    <span className="rounded-full border border-kali-border/60 bg-kali-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-kali-accent">
                      {entry.module.risk} risk
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-kali-text">{entry.module.name}</p>
                  <p className="mt-1 text-xs text-kali-text/65">Hook: {hooksFixture.find((hook) => hook.id === entry.hookId)?.label ?? entry.hookId}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.3em] text-kali-text/60">Parameters</p>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-kali-border/60 bg-[color:var(--kali-panel)] p-3 text-sm text-kali-text/75">
                    {entry.parameters}
                  </pre>
                  <p className="mt-3 text-xs uppercase tracking-[0.3em] text-kali-text/60">Expected output</p>
                  <p className="mt-1 text-sm text-kali-text/70">{entry.preview}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

