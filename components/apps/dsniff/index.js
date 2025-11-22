import React, { useEffect, useMemo, useState } from 'react';
import urlsnarfFixture from '../../../public/demo-data/dsniff/urlsnarf.json';
import arpspoofFixture from '../../../public/demo-data/dsniff/arpspoof.json';
import pcapFixture from '../../../public/demo-data/dsniff/pcap.json';

const severityBadgeStyles = {
  high: 'bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/40',
  medium: 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/40',
  low: 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/40',
};

const severityLabels = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const highlightJson = (payload) => {
  const json = JSON.stringify(payload, null, 2);
  const escaped = escapeHtml(json);
  return escaped
    .replace(/(&quot;.*?&quot;)(?=\s*:)/g, '<span class="text-sky-300">$1</span>')
    .replace(/: (&quot;.*?&quot;)/g, ': <span class="text-emerald-200">$1</span>')
    .replace(/\b(true|false|null)\b/g, '<span class="text-amber-200">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="text-rose-200">$1</span>');
};

const parseFixtures = () => {
  const urlsnarfRecords = urlsnarfFixture.map((line, index) => {
    const [protocol = 'HTTP', host = '', path = '/'] = line.split(/\s+/);
    return {
      id: `url-${index}`,
      dataset: 'urlsnarf',
      protocol,
      endpoint: `${host}${path || ''}`.trim(),
      detail: `Captured ${protocol} request targeting ${host}${path || ''}`.trim(),
      severity: protocol === 'HTTP' ? 'high' : 'medium',
      raw: line,
    };
  });

  const arpspoofRecords = arpspoofFixture.map((line, index) => {
    const parts = line.split(/\s+/);
    const target = parts[2] ?? '';
    const mac = parts[4] ?? '';
    return {
      id: `arp-${index}`,
      dataset: 'arpspoof',
      protocol: 'ARP',
      endpoint: target,
      detail: mac ? `Broadcast claims ${target} is at ${mac}` : line,
      severity: 'medium',
      raw: line,
    };
  });

  const { summary: pcapSummary = [] } = pcapFixture;
  const pcapRecords = pcapSummary.map((row, index) => ({
    id: `pcap-${index}`,
    dataset: 'pcap',
    protocol: row.protocol || 'HTTP',
    endpoint: `${row.src ?? 'unknown'} → ${row.dst ?? 'unknown'}`,
    detail: row.info || 'Captured packet metadata',
    severity: row.protocol === 'HTTPS' ? 'low' : 'high',
    raw: JSON.stringify(row),
  }));

  return [...urlsnarfRecords, ...arpspoofRecords, ...pcapRecords];
};

const TabButton = ({ id, label, description, isActive, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(id)}
    className={`flex flex-1 flex-col gap-1 rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
      isActive
        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100 focus:ring-emerald-400'
        : 'border-white/10 bg-white/5 text-slate-100/80 hover:border-emerald-400/50 hover:text-emerald-100 focus:ring-emerald-400'
    }`}
    aria-pressed={isActive}
  >
    <span className="text-sm font-semibold uppercase tracking-wide">{label}</span>
    <span className="text-xs text-slate-300/80">{description}</span>
  </button>
);

const Step = ({ index, title, description, severity, guidance, warning }) => (
  <li className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner lg:flex-row lg:items-start">
    <div className="flex items-center gap-3">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-base font-semibold text-emerald-200"
        aria-hidden
      >
        {index + 1}
      </span>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
              severityBadgeStyles[severity] || severityBadgeStyles.medium
            }`}
            aria-label={`Severity ${severityLabels[severity] || severity}`}
          >
            {severityLabels[severity] || severity}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-200/90">{description}</p>
        {guidance ? (
          <p className="text-xs text-emerald-200/90">{guidance}</p>
        ) : null}
      </div>
    </div>
    {warning ? (
      <div
        className="mt-3 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs text-amber-100 lg:ml-auto lg:mt-0 lg:max-w-sm"
        role="alert"
      >
        <p className="font-semibold uppercase tracking-wide text-amber-200/80">
          Warning
        </p>
        <p className="leading-relaxed text-amber-100/90">{warning}</p>
      </div>
    ) : null}
  </li>
);

const ChipButton = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
      active
        ? 'border-emerald-400/70 bg-emerald-400/20 text-emerald-100 focus:ring-emerald-400'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-emerald-400/60 hover:text-emerald-100 focus:ring-emerald-400'
    }`}
    aria-pressed={active}
  >
    {label}
  </button>
);

const CommandField = ({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  description,
  type = 'text',
}) => (
  <label className="flex flex-col gap-1 text-xs text-slate-200/90">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/90">
      {label}
    </span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={label}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-400"
    />
    {description ? (
      <span className="text-[11px] text-slate-400">{description}</span>
    ) : null}
  </label>
);

const ToggleField = ({ label, checked, onChange, disabled, description }) => (
  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200/90">
    <input
      type="checkbox"
      className="h-4 w-4 rounded border border-slate-500 bg-slate-800 text-emerald-400 focus:ring-emerald-400"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      disabled={disabled}
      aria-label={label}
    />
    <div className="flex flex-col">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/90">
        {label}
      </span>
      {description ? (
        <span className="text-[11px] text-slate-400">{description}</span>
      ) : null}
    </div>
  </label>
);

const DsniffLab = () => {
  const [activeTab, setActiveTab] = useState('command');
  const [labMode, setLabMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProtocols, setSelectedProtocols] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [urlsnarfOptions, setUrlsnarfOptions] = useState({
    interface: 'eth0',
    output: 'captures/urlsnarf.log',
    verbose: true,
    keepHeaders: true,
  });
  const [arpspoofOptions, setArpspoofOptions] = useState({
    interface: 'eth0',
    target: '192.168.0.10',
    gateway: '192.168.0.1',
    repeat: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('lab-mode');
      setLabMode(stored === 'true');
    } catch {
      setLabMode(false);
    }
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const records = useMemo(() => parseFixtures(), []);

  const protocols = useMemo(() => {
    const set = new Set(records.map((record) => record.protocol));
    return Array.from(set).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    const lowered = searchTerm.trim().toLowerCase();
    const active = new Set(selectedProtocols);
    return records.filter((record) => {
      const matchesProtocol = active.size === 0 || active.has(record.protocol);
      const matchesSearch =
        !lowered ||
        record.endpoint.toLowerCase().includes(lowered) ||
        record.detail.toLowerCase().includes(lowered) ||
        record.dataset.toLowerCase().includes(lowered);
      return matchesProtocol && matchesSearch;
    });
  }, [records, searchTerm, selectedProtocols]);

  const { remediation = [] } = pcapFixture;

  const walkthroughSteps = useMemo(() => {
    const firstHttp = records.find((record) => record.dataset === 'urlsnarf');
    const credentialLeak = records.find((record) =>
      record.dataset === 'pcap' && record.detail.toLowerCase().includes('password'),
    );
    return [
      {
        id: 'collect',
        title: 'Collect cleartext requests',
        description:
          firstHttp?.detail ||
          'urlsnarf fixtures highlight how HTTP requests appear during a capture session.',
        severity: 'medium',
        guidance:
          'Confirm the capture interface aligns with the monitored segment before replaying commands.',
      },
      {
        id: 'triage',
        title: 'Triaging captured credentials',
        description:
          credentialLeak?.detail ||
          'Review captured packets for parameters that include usernames or passwords.',
        severity: 'high',
        guidance: 'Mark credential findings for privileged escalation workflows.',
        warning:
          'These fixtures demonstrate a credential leak. Treat the workflow as sensitive and share only in lab environments.',
      },
      {
        id: 'remediate',
        title: 'Remediation playbook',
        description:
          remediation.length
            ? 'Apply layered defenses from the recommended mitigation list.'
            : 'Document findings and push follow-up controls such as HTTPS, MFA, and network monitoring.',
        severity: 'low',
        guidance:
          remediation.length
            ? remediation.join(' • ')
            : 'Plan layered defenses: encryption, credential hygiene, and traffic monitoring.',
      },
    ];
  }, [records, remediation]);

  const copyToClipboard = (label, value) => {
    if (!value) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setStatusMessage('Clipboard unavailable');
      return;
    }
    navigator.clipboard
      .writeText(value)
      .then(() => setStatusMessage(`${label} copied to clipboard`))
      .catch(() => setStatusMessage('Clipboard unavailable'));
  };

  const toggleProtocol = (protocol) => {
    setSelectedProtocols((prev) => {
      if (prev.includes(protocol)) {
        return prev.filter((entry) => entry !== protocol);
      }
      return [...prev, protocol];
    });
  };

  const enableLabMode = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('lab-mode', 'true');
      } catch {
        /* ignore */
      }
    }
    setLabMode(true);
  };

  const disableLabMode = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('lab-mode');
      } catch {
        /* ignore */
      }
    }
    setLabMode(false);
  };

  const urlsnarfCommand = useMemo(() => {
    const segments = ['urlsnarf'];
    if (urlsnarfOptions.interface) segments.push(`-i ${urlsnarfOptions.interface}`);
    if (urlsnarfOptions.verbose) segments.push('-v');
    if (urlsnarfOptions.keepHeaders) segments.push('-n');
    if (urlsnarfOptions.output) segments.push(`-w ${urlsnarfOptions.output}`);
    return segments.join(' ');
  }, [urlsnarfOptions]);

  const arpspoofCommand = useMemo(() => {
    const segments = ['arpspoof'];
    if (arpspoofOptions.interface) segments.push(`-i ${arpspoofOptions.interface}`);
    if (arpspoofOptions.target) segments.push(`-t ${arpspoofOptions.target}`);
    if (arpspoofOptions.gateway) segments.push(arpspoofOptions.gateway);
    if (arpspoofOptions.repeat) segments.push('--repeat');
    return segments.join(' ');
  }, [arpspoofOptions]);

  const jsonPreview = useMemo(() => highlightJson(filteredRecords), [filteredRecords]);

  return (
    <div className="flex h-full w-full overflow-auto bg-[color-mix(in_srgb,var(--kali-panel)_92%,#020617_95%)] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
            dsniff laboratory
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">
            Traffic capture and credential triage
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-200/90">
            Explore simulated urlsnarf and arpspoof captures in a safe lab. Use the command builders to rehearse workflows,
            inspect captured datasets, and follow the guided remediation storyline—all sourced from offline fixtures.
          </p>
        </header>

        <div
          className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 text-sm shadow-inner sm:flex-row sm:items-center sm:justify-between ${
            labMode
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
              : 'border-amber-400/40 bg-amber-500/10 text-amber-100'
          }`}
          role="status"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em]">
              Lab mode {labMode ? 'enabled' : 'off'}
            </p>
            <p className="text-sm leading-relaxed">
              {labMode
                ? 'Interactive builders are unlocked. All actions remain offline and scoped to demo data.'
                : 'Enable lab mode to unlock interactive command builders while keeping every action simulated.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={labMode ? disableLabMode : enableLabMode}
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/40 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-400"
            >
              {labMode ? 'Disable lab mode' : 'Enable lab mode'}
            </button>
            <span className="hidden text-xs text-slate-200/80 sm:block">Offline fixtures preloaded</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row" role="tablist" aria-label="dsniff views">
          <TabButton
            id="command"
            label="Command builder"
            description="Compose urlsnarf and arpspoof invocations"
            isActive={activeTab === 'command'}
            onSelect={setActiveTab}
          />
          <TabButton
            id="captured"
            label="Captured data"
            description="Inspect fixture datasets with filters"
            isActive={activeTab === 'captured'}
            onSelect={setActiveTab}
          />
          <TabButton
            id="interpret"
            label="Interpretations"
            description="Follow the guided remediation walkthrough"
            isActive={activeTab === 'interpret'}
            onSelect={setActiveTab}
          />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl" role="tabpanel">
          {activeTab === 'command' ? (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <header className="space-y-1">
                    <h2 className="text-lg font-semibold text-white">urlsnarf builder</h2>
                    <p className="text-xs text-slate-300/90">
                      Adjust capture options and copy the assembled command for lab rehearsals.
                    </p>
                  </header>
                  <div className="grid gap-4">
                    <CommandField
                      label="Interface"
                      value={urlsnarfOptions.interface}
                      onChange={(value) =>
                        setUrlsnarfOptions((prev) => ({ ...prev, interface: value }))
                      }
                      disabled={!labMode}
                      placeholder="eth0"
                      description="Network interface to monitor"
                    />
                    <CommandField
                      label="Output file"
                      value={urlsnarfOptions.output}
                      onChange={(value) =>
                        setUrlsnarfOptions((prev) => ({ ...prev, output: value }))
                      }
                      disabled={!labMode}
                      placeholder="captures/urlsnarf.log"
                      description="Logs remain inside the sandbox"
                    />
                    <ToggleField
                      label="Verbose logging"
                      checked={urlsnarfOptions.verbose}
                      onChange={(checked) =>
                        setUrlsnarfOptions((prev) => ({ ...prev, verbose: checked }))
                      }
                      disabled={!labMode}
                      description="Include HTTP method and response code"
                    />
                    <ToggleField
                      label="Preserve headers"
                      checked={urlsnarfOptions.keepHeaders}
                      onChange={(checked) =>
                        setUrlsnarfOptions((prev) => ({ ...prev, keepHeaders: checked }))
                      }
                      disabled={!labMode}
                      description="Show host and user-agent metadata"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                        Built command
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('urlsnarf command', urlsnarfCommand)}
                        className="inline-flex items-center rounded-md border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/70 p-3 font-mono text-sm text-emerald-200">
                      {urlsnarfCommand}
                    </pre>
                  </div>
                </section>
                <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <header className="space-y-1">
                    <h2 className="text-lg font-semibold text-white">arpspoof builder</h2>
                    <p className="text-xs text-slate-300/90">
                      Configure the simulated man-in-the-middle posture. Settings persist locally in lab mode.
                    </p>
                  </header>
                  <div className="grid gap-4">
                    <CommandField
                      label="Interface"
                      value={arpspoofOptions.interface}
                      onChange={(value) =>
                        setArpspoofOptions((prev) => ({ ...prev, interface: value }))
                      }
                      disabled={!labMode}
                      placeholder="eth0"
                      description="Switch to the appropriate VLAN in live exercises"
                    />
                    <CommandField
                      label="Target host"
                      value={arpspoofOptions.target}
                      onChange={(value) =>
                        setArpspoofOptions((prev) => ({ ...prev, target: value }))
                      }
                      disabled={!labMode}
                      placeholder="192.168.0.10"
                      description="Victim IP to poison"
                    />
                    <CommandField
                      label="Gateway"
                      value={arpspoofOptions.gateway}
                      onChange={(value) =>
                        setArpspoofOptions((prev) => ({ ...prev, gateway: value }))
                      }
                      disabled={!labMode}
                      placeholder="192.168.0.1"
                      description="Network gateway observed in fixtures"
                    />
                    <ToggleField
                      label="Repeat broadcasts"
                      checked={arpspoofOptions.repeat}
                      onChange={(checked) =>
                        setArpspoofOptions((prev) => ({ ...prev, repeat: checked }))
                      }
                      disabled={!labMode}
                      description="Send updates periodically to hold MITM position"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                        Built command
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('arpspoof command', arpspoofCommand)}
                        className="inline-flex items-center rounded-md border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/70 p-3 font-mono text-sm text-emerald-200">
                      {arpspoofCommand}
                    </pre>
                  </div>
                </section>
              </div>
              <div
                className="rounded-2xl border border-slate-400/40 bg-slate-400/10 p-4 text-xs text-slate-100"
                role="alert"
              >
                <p className="font-semibold uppercase tracking-wide text-slate-200">
                  Simulation notice
                </p>
                <p className="leading-relaxed text-slate-100/90">
                  Commands execute against fixtures only. The builders do not initiate any live network changes, keeping the
                  experience safe for offline review and classroom walkthroughs.
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === 'captured' ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <label className="flex flex-col gap-1 text-xs text-slate-200/90" htmlFor="dsniff-search">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/90">
                      Search captures
                    </span>
                    <input
                      id="dsniff-search"
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search host, dataset, or detail"
                      aria-label="Search captures"
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Protocol filters">
                    <ChipButton
                      label="All protocols"
                      active={selectedProtocols.length === 0}
                      onClick={() => setSelectedProtocols([])}
                    />
                    {protocols.map((protocol) => (
                      <ChipButton
                        key={protocol}
                        label={protocol}
                        active={selectedProtocols.includes(protocol)}
                        onClick={() => toggleProtocol(protocol)}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-xs text-slate-200/90"
                  role="note"
                >
                  <p className="font-semibold uppercase tracking-wide text-slate-200/80">
                    Offline fixture summary
                  </p>
                  <p className="mt-2 leading-relaxed text-slate-200/80">
                    {records.length} records loaded across urlsnarf, arpspoof, and PCAP summaries. Filters run entirely in the
                    browser for offline readiness.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/70">
                <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  <thead className="bg-black/60 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Dataset</th>
                      <th className="px-4 py-3">Protocol</th>
                      <th className="px-4 py-3">Endpoint</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3 text-right">Risk</th>
                      <th className="px-4 py-3 text-right">Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredRecords.length ? (
                      filteredRecords.map((record) => (
                        <tr key={record.id} className="transition hover:bg-white/5">
                          <td className="px-4 py-3 font-semibold uppercase tracking-wide text-slate-200/90">
                            {record.dataset}
                          </td>
                          <td className="px-4 py-3 text-slate-200/80">{record.protocol}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-emerald-200/90">
                            {record.endpoint}
                          </td>
                          <td className="px-4 py-3 text-slate-200/80">{record.detail}</td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                severityBadgeStyles[record.severity] || severityBadgeStyles.medium
                              }`}
                              aria-label={`Risk ${severityLabels[record.severity] || record.severity}`}
                            >
                              {severityLabels[record.severity] || record.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`${record.dataset} record`, record.raw)}
                              className="inline-flex items-center rounded-md border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                              Copy
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={6}>
                          No captures match the filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200/80">
                      JSON preview
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard('filtered dataset', JSON.stringify(filteredRecords, null, 2))
                      }
                      className="inline-flex items-center rounded-md border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre
                    className="mt-3 max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/80 p-4 text-xs leading-relaxed text-slate-100"
                  >
                    <code
                      className="block whitespace-pre text-left"
                      dangerouslySetInnerHTML={{ __html: jsonPreview }}
                    />
                  </pre>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-xs text-slate-200/90">
                  <p className="font-semibold uppercase tracking-wide text-slate-200/80">
                    Fixture highlights
                  </p>
                  <ul className="mt-3 space-y-2 list-disc pl-5">
                    <li>Dataset sources never leave the browser, keeping the lab fully offline.</li>
                    <li>Filter chips support protocol-focused drills for HTTP, HTTPS, and ARP traffic.</li>
                    <li>Use the copy controls to drop snippets into runbooks or slide decks.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'interpret' ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200/90">
                <p className="font-semibold uppercase tracking-[0.3em] text-slate-200/70">
                  Guided walkthrough
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-200/80">
                  Step through the credential exposure narrative. Each milestone mirrors how defenders triage captures while the
                  warnings reinforce safe handling guidelines for lab operators.
                </p>
              </div>
              <ol className="space-y-4" role="list">
                {walkthroughSteps.map((step, index) => (
                  <Step key={step.id} index={index} {...step} />
                ))}
              </ol>
              {remediation.length ? (
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <p className="font-semibold uppercase tracking-wide text-emerald-200/80">
                    Recommended remediation sequence
                  </p>
                  <ol className="mt-3 space-y-2 list-decimal pl-5">
                    {remediation.map((item, index) => (
                      <li key={index} className="leading-relaxed text-emerald-100/90">
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {statusMessage}
        </div>
      </div>
    </div>
  );
};

export default DsniffLab;

export const displayDsniff = (addFolder, openApp) => <DsniffLab addFolder={addFolder} openApp={openApp} />;
