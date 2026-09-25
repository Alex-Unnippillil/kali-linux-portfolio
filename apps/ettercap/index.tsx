'use client';

import React, { useEffect, useMemo, useState } from 'react';
import FilterEditor from './components/FilterEditor';
import LogPane, { LogEntry } from './components/LogPane';
import NetworkTopology from './components/NetworkTopology';
import CaptureShowcase, { CaptureEntry } from './components/CaptureShowcase';

const MODES = ['Unified', 'Sniff', 'ARP'] as const;

const MODE_DESCRIPTIONS: Record<(typeof MODES)[number], string> = {
  Unified: 'Blend passive sniffing with MITM tools to demo full Ettercap workflows.',
  Sniff: 'Listen quietly to traffic without altering packets in transit.',
  ARP: 'Simulate ARP poisoning to observe how host traffic can be intercepted.',
};

type ScenarioId = 'credential-harvest' | 'dns-spoof' | 'rogue-gateway';

type Scenario = {
  id: ScenarioId;
  label: string;
  summary: string;
  labBanner: string;
  caution: string;
  advisory: string;
  nodes: React.ComponentProps<typeof NetworkTopology>['nodes'];
  links: React.ComponentProps<typeof NetworkTopology>['links'];
  flows: React.ComponentProps<typeof NetworkTopology>['flows'];
  captureEntries: CaptureEntry[];
  captureFilters: string[];
};

const SCENARIOS: Scenario[] = [
  {
    id: 'credential-harvest',
    label: 'Credential Harvest',
    summary:
      'Demonstrate how cleartext credentials leak through ARP poisoning when Ettercap proxies an internal login portal.',
    labBanner: 'Lab mode: Credential interception sequence active',
    caution: 'Never replay captured credentials outside of isolated lab ranges.',
    advisory:
      'Focus on HTTP payloads and authentication posts. The flow diagram highlights each interception touchpoint.',
    nodes: [
      {
        id: 'victim',
        label: 'Victim workstation',
        description: 'Employee desktop coerced into routing traffic through the MITM host via forged ARP replies.',
        x: 70,
        y: 210,
        role: 'client',
      },
      {
        id: 'ettercap',
        label: 'Ettercap node',
        description: 'Simulated attacker pivot running Ettercap to forward traffic while siphoning credentials.',
        x: 210,
        y: 120,
        role: 'attacker',
      },
      {
        id: 'gateway',
        label: 'Corp gateway',
        description: 'Default gateway that should terminate HTTP but now accepts relayed frames from the MITM.',
        x: 340,
        y: 210,
        role: 'infrastructure',
      },
      {
        id: 'portal',
        label: 'Intranet login',
        description: 'Legacy web portal left on HTTP for training. Use captures to build remediation tasks.',
        x: 340,
        y: 70,
        role: 'service',
      },
    ],
    links: [
      { id: 'victim-ettercap', source: 'victim', target: 'ettercap', label: 'Forged ARP route', emphasis: 'alert' },
      { id: 'ettercap-gateway', source: 'ettercap', target: 'gateway', label: 'Relayed frames', emphasis: 'alert' },
      { id: 'gateway-portal', source: 'gateway', target: 'portal', label: 'Original destination', emphasis: 'normal' },
      { id: 'ettercap-portal', source: 'ettercap', target: 'portal', label: 'Credential tap', emphasis: 'alert' },
    ],
    flows: [
      {
        id: 'cred-1',
        title: 'Stage ARP poisoning',
        description:
          'Broadcast spoofed responses so the victim trusts the attacker MAC and forwards every frame through the MITM node.',
        impact: 'Victim traffic rerouted to Ettercap host',
      },
      {
        id: 'cred-2',
        title: 'Capture login posts',
        description:
          'Inspect HTTP POST bodies in the canned captures to view usernames and passwords before TLS upgrades.',
        impact: 'Sensitive credentials harvested for analysis',
      },
      {
        id: 'cred-3',
        title: 'Relay to maintain stealth',
        description:
          'Forward sanitized requests to keep the user session alive, mimicking how attackers stay undetected.',
        impact: 'User remains unaware while attacker collects data',
      },
    ],
    captureFilters: ['Credentials', 'MITM', 'HTTP'],
    captureEntries: [
      {
        id: 'cred-entry-1',
        protocol: 'HTTP',
        summary: 'Captured POST request to /login.php',
        detail:
          '09:21:14 POST /login.php HTTP/1.1\nHost: intranet.lan\nContent-Type: application/x-www-form-urlencoded\nusername=analyst&password=Winter2024!',
        highlightPhrases: ['username=analyst', 'password=Winter2024!'],
        tags: ['Credentials', 'HTTP'],
        explanation:
          'Credentials arrive in cleartext because the training portal still uses HTTP. Highlighted fields show exactly what Ettercap can siphon.',
      },
      {
        id: 'cred-entry-2',
        protocol: 'ARP',
        summary: 'Forged reply announcing attacker as gateway',
        detail: '09:21:10 ARP Reply 192.168.56.1 is-at 52:54:00:12:34:56 (spoofed) -> 192.168.56.42',
        highlightPhrases: ['is-at 52:54:00:12:34:56', 'spoofed'],
        tags: ['MITM'],
        explanation:
          'Review the MAC binding change to understand how the victim becomes dependent on the attacker for routing.',
      },
      {
        id: 'cred-entry-3',
        protocol: 'HTTP',
        summary: 'Session cookie relayed downstream',
        detail:
          '09:21:15 HTTP/1.1 302 Found\nSet-Cookie: PHPSESSID=3f8f1c8f2b1\nLocation: /dashboard.php',
        highlightPhrases: ['Set-Cookie: PHPSESSID=3f8f1c8f2b1'],
        tags: ['HTTP', 'MITM'],
        explanation:
          'Even redirect responses can leak session IDs. Use the filter editor to craft drop rules for sensitive cookies.',
      },
    ],
  },
  {
    id: 'dns-spoof',
    label: 'DNS Spoof',
    summary: 'Redirect clients to a staged phishing site using Ettercap DNS spoofing features.',
    labBanner: 'Lab mode: DNS manipulation with safe landing page',
    caution: 'Never point spoofed records at live phishing kits.',
    advisory:
      'Observe how DNS replies and HTTPS downgrade prompts appear in the capture timeline to train analysts on detection cues.',
    nodes: [
      { id: 'client', label: 'Client device', description: 'Workstation requesting intranet DNS records.', x: 80, y: 210, role: 'client' },
      {
        id: 'spoof',
        label: 'Spoofing host',
        description: 'Ettercap host injecting forged DNS answers while proxying responses.',
        x: 210,
        y: 130,
        role: 'attacker',
      },
      {
        id: 'dns',
        label: 'Authoritative DNS',
        description: 'Legitimate DNS server whose responses are being overridden locally.',
        x: 340,
        y: 210,
        role: 'infrastructure',
      },
      {
        id: 'landing',
        label: 'Phishing landing',
        description: 'Safe demo site used to show how unsuspecting users are redirected.',
        x: 340,
        y: 80,
        role: 'service',
      },
    ],
    links: [
      { id: 'client-spoof', source: 'client', target: 'spoof', label: 'DNS query', emphasis: 'alert' },
      { id: 'spoof-dns', source: 'spoof', target: 'dns', label: 'Intercepted request', emphasis: 'alert' },
      { id: 'spoof-landing', source: 'spoof', target: 'landing', label: 'Spoofed response', emphasis: 'alert' },
      { id: 'dns-client', source: 'dns', target: 'client', label: 'Legit fallback', emphasis: 'normal' },
    ],
    flows: [
      {
        id: 'dns-1',
        title: 'Craft DNS responses',
        description: 'Use Ettercap\'s dns_spoof plugin to reply faster than the legitimate DNS server.',
        impact: 'Client resolves to attacker-controlled IP',
      },
      {
        id: 'dns-2',
        title: 'Serve cloned HTTPS notice',
        description: 'Canned capture shows downgrade attempts prompting users to accept invalid certificates.',
        impact: 'Users trained to spot certificate warnings',
      },
      {
        id: 'dns-3',
        title: 'Monitor exfil indicators',
        description: 'Inspect HTTP requests destined for the phishing server to understand what data might leave.',
        impact: 'Response plans built from known artifact trail',
      },
    ],
    captureFilters: ['DNS', 'TLS', 'Alerts'],
    captureEntries: [
      {
        id: 'dns-entry-1',
        protocol: 'DNS',
        summary: 'Spoofed A record for vpn.corp',
        detail: '14:02:03 DNS Answer vpn.corp A 172.19.0.77 (spoofed by Ettercap)',
        highlightPhrases: ['vpn.corp', '172.19.0.77'],
        tags: ['DNS', 'Alerts'],
        explanation:
          'Use this entry to practice detection of unauthorized DNS records pointing to rogue infrastructure.',
      },
      {
        id: 'dns-entry-2',
        protocol: 'TLS',
        summary: 'Certificate warning served to client',
        detail:
          '14:02:05 TLS Alert Level: warning Description: unknown_ca\nClient presented with mismatched certificate prompt.',
        highlightPhrases: ['Alert Level: warning', 'unknown_ca'],
        tags: ['TLS', 'Alerts'],
        explanation:
          'Highlight emphasises the TLS alert so trainees learn how browsers signal tampered connections.',
      },
      {
        id: 'dns-entry-3',
        protocol: 'HTTP',
        summary: 'Victim POSTs data to phishing form',
        detail:
          '14:02:12 POST /collect.php HTTP/1.1\nHost: portal-copy.local\nserial=4821&auth_token=demo-token',
        highlightPhrases: ['auth_token=demo-token'],
        tags: ['DNS', 'HTTP'],
        explanation:
          'Even demo landing pages can collect tokens. Build drop rules to prevent outbound POSTs to spoofed hosts.',
      },
    ],
  },
  {
    id: 'rogue-gateway',
    label: 'Rogue Gateway',
    summary: 'Simulate an attacker advertising a rogue default gateway to divert traffic en masse.',
    labBanner: 'Lab mode: Gateway takeover walkthrough',
    caution: 'Do not bridge this configuration to corporate VLANs.',
    advisory:
      'Track how broadcast traffic and DHCP options change once the rogue gateway comes online in the simulation.',
    nodes: [
      { id: 'fleet', label: 'Client fleet', description: 'Group of lab endpoints inheriting rogue routes.', x: 70, y: 210, role: 'client' },
      {
        id: 'rogue',
        label: 'Rogue gateway',
        description: 'Emulated device advertising DHCP/ICMP redirects to hijack flows.',
        x: 210,
        y: 110,
        role: 'attacker',
      },
      {
        id: 'uplink',
        label: 'Uplink router',
        description: 'Legitimate router expected to service the subnet.',
        x: 340,
        y: 210,
        role: 'infrastructure',
      },
      {
        id: 'siem',
        label: 'SIEM tap',
        description: 'Monitoring node verifying mirrored packets for analyst review.',
        x: 340,
        y: 80,
        role: 'service',
      },
    ],
    links: [
      { id: 'fleet-rogue', source: 'fleet', target: 'rogue', label: 'DHCP offer', emphasis: 'alert' },
      { id: 'rogue-uplink', source: 'rogue', target: 'uplink', label: 'Forwarded traffic', emphasis: 'alert' },
      { id: 'rogue-siem', source: 'rogue', target: 'siem', label: 'Mirror stream', emphasis: 'normal' },
      { id: 'uplink-fleet', source: 'uplink', target: 'fleet', label: 'Legitimate route', emphasis: 'normal' },
    ],
    flows: [
      {
        id: 'rogue-1',
        title: 'Broadcast rogue DHCP',
        description: 'Monitor DHCP Offer packets that push clients to use the rogue gateway IP.',
        impact: 'Clients adopt attacker-controlled route',
      },
      {
        id: 'rogue-2',
        title: 'Inspect ICMP redirects',
        description: 'Look for ICMP redirect messages validating how the rogue gateway cements its position.',
        impact: 'Routing tables poisoned with attacker MAC',
      },
      {
        id: 'rogue-3',
        title: 'Validate monitoring coverage',
        description: 'Ensure mirrored traffic reaches the SIEM tap so detection teams can triage the incident.',
        impact: 'SOC visibility maintained during attack drill',
      },
    ],
    captureFilters: ['DHCP', 'ICMP', 'Visibility'],
    captureEntries: [
      {
        id: 'rogue-entry-1',
        protocol: 'DHCP',
        summary: 'Offer from rogue gateway',
        detail:
          '19:44:03 DHCP Offer from 192.168.88.200\nOption 3 (Router): 192.168.88.200\nOption 66 (TFTP): rogue-gw.lab',
        highlightPhrases: ['Router): 192.168.88.200', 'Option 66'],
        tags: ['DHCP'],
        explanation:
          'DHCP options expose the rogue gateway address. Analysts can practice writing filters to quarantine these offers.',
      },
      {
        id: 'rogue-entry-2',
        protocol: 'ICMP',
        summary: 'Redirect reinforcing rogue path',
        detail: '19:44:05 ICMP Redirect to 192.168.88.1 via 192.168.88.200 (rogue gateway)',
        highlightPhrases: ['ICMP Redirect', '192.168.88.200'],
        tags: ['ICMP', 'Visibility'],
        explanation:
          'The redirect proves clients are being pointed away from the legitimate router. Pair with SIEM alerts to measure readiness.',
      },
      {
        id: 'rogue-entry-3',
        protocol: 'SPAN',
        summary: 'Mirror feed to SIEM tap',
        detail: '19:44:08 SPAN Mirror -> siem-tap.lab status=OK packets=128 (demo stream)',
        highlightPhrases: ['siem-tap.lab', 'packets=128'],
        tags: ['Visibility'],
        explanation:
          'Shows mirrored packets reaching monitoring. Use this to verify blue-team tooling stays intact during exercises.',
      },
    ],
  },
];

type TimelineStatus = 'done' | 'current' | 'pending';
type StatusTone = 'success' | 'warning' | 'error';
type TimelineStep = {
  title: string;
  description: string;
  status: TimelineStatus;
};

const STATUS_TONE_MAP: Record<TimelineStatus, StatusTone> = {
  done: 'success',
  current: 'warning',
  pending: 'error',
};

const STATUS_STYLE: Record<StatusTone, { dot: string; card: string; heading: string; description: string }> = {
  success: {
    dot: 'bg-[color:var(--color-success)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-success)_35%,transparent)]',
    card:
      'border-[color:color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-success)_12%,transparent)]',
    heading: 'text-[color:var(--kali-text)]',
    description: 'text-[color:color-mix(in_srgb,var(--color-success)_70%,var(--kali-text))]',
  },
  warning: {
    dot: 'bg-[color:var(--color-warning)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-warning)_40%,transparent)]',
    card:
      'border-[color:color-mix(in_srgb,var(--color-warning)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-warning)_15%,transparent)]',
    heading: 'text-[color:var(--kali-text)]',
    description: 'text-[color:color-mix(in_srgb,var(--color-warning)_75%,var(--kali-text))]',
  },
  error: {
    dot: 'bg-[color:var(--color-danger)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-danger)_40%,transparent)]',
    card:
      'border-[color:color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger)_12%,transparent)]',
    heading: 'text-[color:var(--kali-text)]',
    description: 'text-[color:color-mix(in_srgb,var(--color-danger)_75%,var(--kali-text))]',
  },
};

const METRIC_BADGE_CLASS =
  'rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-3 py-1 font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))]';

const ACCENT_SUBHEADING_TEXT = 'text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]';

export default function EttercapPage() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('credential-harvest');
  const [mode, setMode] = useState<(typeof MODES)[number]>('Unified');
  const [started, setStarted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [captureFilters, setCaptureFilters] = useState<string[]>([]);

  const scenario = useMemo(() => SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0], [scenarioId]);
  const availableFilters = scenario.captureFilters;

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const levels: LogEntry['level'][] = ['info', 'warn', 'error'];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const message = `Sample ${level} message ${new Date().toLocaleTimeString()}`;
      setLogs((l) => [...l, { id: Date.now(), level, message }]);
    }, 2000);
    return () => clearInterval(id);
  }, [started]);

  useEffect(() => {
    setCaptureFilters([]);
  }, [scenarioId]);

  const hasLogs = logs.length > 0;
  const logMilestoneReached = logs.length >= 4;

  const toggleCaptureFilter = (filter: string) => {
    setCaptureFilters((prev) => (prev.includes(filter) ? prev.filter((item) => item !== filter) : [...prev, filter]));
  };

  const clearCaptureFilters = () => setCaptureFilters([]);

  const timeline = useMemo<TimelineStep[]>(
    () => [
      {
        title: 'Select operation mode',
        description: MODE_DESCRIPTIONS[mode],
        status: 'done',
      },
      {
        title: 'Choose training scenario',
        description: scenario.summary,
        status: 'done',
      },
      {
        title: 'Initiate MITM workflow',
        description: started
          ? 'Simulation is broadcasting crafted ARP replies to represent the attack path.'
          : 'Launch the demo to simulate ARP poisoning and packet interception.',
        status: started ? (hasLogs ? 'done' : 'current') : 'pending',
      },
      {
        title: 'Review topology & flows',
        description: started
          ? 'Animated nodes and flow cards illuminate the rerouted traffic path for this scenario.'
          : 'Start the demo to view the animated topology, tooltips, and flow guidance.',
        status: started ? (logMilestoneReached ? 'done' : 'current') : 'pending',
      },
      {
        title: 'Inspect canned captures',
        description:
          captureFilters.length > 0
            ? `Filters active: ${captureFilters.join(', ')} — compare highlighted strings to plan mitigations.`
            : 'Toggle filters and callouts to rehearse your analysis workflow with curated packets.',
        status: hasLogs ? (captureFilters.length > 0 ? 'current' : 'done') : started ? 'current' : 'pending',
      },
      {
        title: 'Plan containment & response',
        description:
          'Apply drop/replace rules in the filter editor to design mitigations before touching production networks.',
        status: started && hasLogs ? 'current' : 'pending',
      },
    ],
    [captureFilters, hasLogs, logMilestoneReached, mode, scenario.summary, started],
  );

  const metricBadges = useMemo(
    () => [
      {
        label: 'Mode',
        value: mode,
      },
      {
        label: 'Scenario',
        value: scenario.label,
      },
      {
        label: 'State',
        value: started ? 'Running' : 'Idle',
      },
      {
        label: 'Logs',
        value: `${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`,
      },
      {
        label: 'Active filters',
        value: captureFilters.length > 0 ? `${captureFilters.length} selected` : 'All visible',
      },
    ],
    [captureFilters.length, logs.length, mode, scenario.label, started],
  );

  return (
    <div className="p-4 space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--kali-text)]">Ettercap Simulation Console</h1>
            <p className={`mt-1 text-sm ${ACCENT_SUBHEADING_TEXT}`}>
              Walk through a safe, local‑only reenactment of Ettercap workflows while keeping real infrastructure untouched.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Mode selection">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                title={MODE_DESCRIPTIONS[m]}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] ${
                  mode === m
                    ? 'border-[color:color-mix(in_srgb,var(--color-primary)_55%,transparent)] bg-[color:var(--color-primary)] text-[color:var(--kali-text)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]'
                    : 'border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color:var(--kali-panel)] text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))] hover:border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--color-primary)_12%)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="flex flex-wrap gap-2" aria-label="Scenario selection">
          <legend className="sr-only">Select Ettercap training scenario</legend>
          {SCENARIOS.map((item) => {
            const isActive = scenarioId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setScenarioId(item.id)}
                title={item.summary}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] ${
                  isActive
                    ? 'border-[color:color-mix(in_srgb,var(--color-primary)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_15%,var(--kali-panel))] text-[color:var(--kali-text)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]'
                    : 'border-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] bg-[color:var(--kali-panel)] text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))] hover:border-[color:color-mix(in_srgb,var(--color-primary)_32%,transparent)]'
                }`}
                aria-pressed={isActive}
              >
                {item.label}
              </button>
            );
          })}
        </fieldset>

        <p className={`text-xs leading-relaxed ${ACCENT_SUBHEADING_TEXT}`}>{scenario.summary}</p>

        <div className="grid gap-3 lg:grid-cols-2" role="presentation">
          <div
            className="flex flex-col gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--kali-panel))] p-3 text-sm text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]"
            role="note"
          >
            <p className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_85%,var(--kali-text))]">
              {scenario.labBanner}
            </p>
            <p className="leading-relaxed">{scenario.advisory}</p>
          </div>
          <div
            className="flex flex-col gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--color-danger)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger)_18%,var(--kali-panel))] p-3 text-sm text-[color:color-mix(in_srgb,var(--color-danger)_70%,var(--kali-text))]"
            role="alert"
          >
            <p className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-danger)_85%,var(--kali-text))]">
              Caution
            </p>
            <p className="leading-relaxed">{scenario.caution}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-[color:var(--color-primary)] px-4 py-2 text-[color:var(--kali-text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_92%,var(--kali-panel))] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setStarted(true)}
              disabled={started}
            >
              {started ? 'Demo running' : 'Start demo'}
            </button>
            <button
              type="button"
              className="rounded border border-[color:color-mix(in_srgb,var(--color-danger)_70%,transparent)] px-4 py-2 text-[color:color-mix(in_srgb,var(--color-danger)_85%,var(--kali-text))] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-danger)_18%,var(--kali-panel))] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setStarted(false)}
              disabled={!started}
            >
              Stop demo
            </button>
          </div>
          <span className={`text-xs uppercase tracking-wide ${ACCENT_SUBHEADING_TEXT}`}>Simulation controls</span>
        </div>
      </header>

      <section aria-live="polite" className="space-y-2">
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${ACCENT_SUBHEADING_TEXT}`}>Operational metrics</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {metricBadges.map((badge) => (
            <span
              key={badge.label}
              className={METRIC_BADGE_CLASS}
            >
              {badge.label}:{' '}
              <span className="ml-1 capitalize text-[color:var(--kali-text)]">{badge.value}</span>
            </span>
          ))}
        </div>
      </section>

      <NetworkTopology
        nodes={scenario.nodes}
        links={scenario.links}
        flows={scenario.flows}
        scenarioLabel={scenario.label}
        mode={mode}
        started={started}
      />

      <CaptureShowcase
        entries={scenario.captureEntries}
        availableFilters={availableFilters}
        activeFilters={captureFilters}
        onToggleFilter={toggleCaptureFilter}
        onClearFilters={clearCaptureFilters}
        scenarioLabel={scenario.label}
      />

      <section className="space-y-3">
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${ACCENT_SUBHEADING_TEXT}`}>Attack workflow timeline</h2>
        <ol className="space-y-4 border-l border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] pl-4">
          {timeline.map((step) => {
            const tone = STATUS_TONE_MAP[step.status];
            const palette = STATUS_STYLE[tone];

            return (
              <li key={step.title} className="relative">
                <span
                  className={`absolute -left-[22px] top-2 h-3 w-3 rounded-full ${palette.dot} ${
                    step.status === 'current'
                      ? 'animate-pulse shadow-[0_0_0_6px_color-mix(in_srgb,var(--color-warning)_18%,transparent)]'
                      : ''
                  }`}
                  aria-hidden
                />
                <div className={`rounded-lg border p-3 text-sm ${palette.card}`}>
                  <p className={`font-semibold ${palette.heading}`}>{step.title}</p>
                  <p className={`mt-1 text-xs leading-relaxed ${palette.description}`}>{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {started && <LogPane logs={logs} />}

      <h1 className="text-xl font-bold">Ettercap Filter Editor</h1>
      <div className="mb-4 rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--kali-panel))] p-4 text-sm text-[color:color-mix(in_srgb,var(--color-primary)_35%,var(--kali-text))]">
        <h2 className="text-base font-semibold text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))]">Need a refresher?</h2>
        <p className="mt-2 text-[color:color-mix(in_srgb,var(--color-primary)_25%,var(--kali-text))]">
          Ettercap filters let you drop or rewrite packets using simple commands like
          <code className="mx-1 rounded bg-[color:color-mix(in_srgb,var(--color-primary)_24%,var(--kali-panel))] px-1 py-0.5 text-xs text-[color:var(--kali-text)]">
            drop
          </code>
          and
          <code className="mx-1 rounded bg-[color:color-mix(in_srgb,var(--color-primary)_24%,var(--kali-panel))] px-1 py-0.5 text-xs text-[color:var(--kali-text)]">
            replace
          </code>
          Combine them with patterns to experiment safely in this simulation before
          deploying changes on a real lab network.
        </p>
        <a
          href="https://www.ettercap-project.org/documentation/etterfilter/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center text-[color:color-mix(in_srgb,var(--color-primary)_78%,var(--kali-text))] underline transition hover:text-[color:var(--kali-text)]"
        >
          Read the Etterfilter guide
        </a>
      </div>
      <FilterEditor />
    </div>
  );
}
