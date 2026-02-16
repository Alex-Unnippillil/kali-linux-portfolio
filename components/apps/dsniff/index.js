import React, { useEffect, useMemo, useRef, useState } from 'react';
import urlsnarfFixture from '../../../public/demo-data/dsniff/urlsnarf.json';
import arpspoofFixture from '../../../public/demo-data/dsniff/arpspoof.json';
import pcapFixture from '../../../public/demo-data/dsniff/pcap.json';
import TerminalOutput from '../../TerminalOutput';

// Simple parser that attempts to extract protocol, host and remaining details
// Each parsed line is also given a synthetic timestamp for display purposes
const parseLines = (text) =>
  text
    .split('\n')
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.trim().split(/\s+/);
      let protocol = parts[0] || '';
      let host = parts[1] || '';
      let rest = parts.slice(2);
      if (protocol === 'ARP' && parts[1] === 'reply') {
        host = parts[2] || '';
        rest = parts.slice(3);
      }
      // use deterministic timestamp based on line index
      const timestamp = new Date(i * 1000).toISOString().split('T')[1].split('.')[0];
      return {
        raw: line,
        protocol,
        host,
        details: rest.join(' '),
        timestamp,

      };
    });

const protocolInfo = {
  HTTP: 'Hypertext Transfer Protocol',
  HTTPS: 'HTTP over TLS/SSL',
  ARP: 'Address Resolution Protocol',
  FTP: 'File Transfer Protocol',
  SSH: 'Secure Shell',
};

const protocolIcons = {
  HTTP: '🌐',
  HTTPS: '🔒',
  ARP: '🔁',
  FTP: '📁',
  SSH: '🔐',
};

const protocolAccents = {
  HTTP: 'from-blue-500/70 via-blue-400/60 to-blue-500/40 text-blue-200',
  HTTPS: 'from-emerald-500/70 via-emerald-400/60 to-emerald-500/40 text-emerald-200',
  ARP: 'from-amber-500/70 via-amber-400/60 to-amber-500/40 text-amber-200',
  FTP: 'from-rose-500/70 via-rose-400/60 to-rose-500/40 text-rose-200',
  SSH: 'from-violet-500/70 via-violet-400/60 to-violet-500/40 text-violet-200',
};

const protocolRisks = {
  HTTP: 'High',
  HTTPS: 'Low',
  ARP: 'Medium',
  FTP: 'High',
  SSH: 'Medium',
};

const riskBadgeStyles = {
  High: 'bg-red-500/20 text-red-200 ring-1 ring-inset ring-red-500/40',
  Medium: 'bg-amber-500/20 text-amber-200 ring-1 ring-inset ring-amber-500/40',
  Low: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/40',
};

const suiteTools = [
  {
    tool: 'arpspoof',
    description: 'Intercept packets on a switched LAN via ARP replies',
    risk: 'Facilitates man-in-the-middle attacks',
    reference: 'https://linux.die.net/man/8/arpspoof',
  },
  {
    tool: 'urlsnarf',
    description: 'Log HTTP requests in a Common Log Format',
    risk: 'Captures web activity and cleartext credentials',
    reference: 'https://linux.die.net/man/8/urlsnarf',
  },
  {
    tool: 'macof',
    description: 'Flood switch tables with random MAC addresses',
    risk: 'May force switches into hub mode exposing traffic',
    reference: 'https://linux.die.net/man/8/macof',
  },
  {
    tool: 'webmitm',
    description: 'Transparent HTTP/SSL proxy for MITM attacks',
    risk: 'Intercepts and modifies encrypted sessions',
    reference: 'https://linux.die.net/man/8/webmitm',
  },
];


const LogRow = ({ log, prefersReduced }) => {
  const rowRef = useRef(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el || prefersReduced) return;
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s ease-in';
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
  }, [prefersReduced]);

  return (
    <tr
      ref={rowRef}
      className="odd:bg-slate-950/40 even:bg-slate-950/70 transition-colors"
    >
      <td className="whitespace-nowrap px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500">
        {log.timestamp}
      </td>
      <td className="px-3 py-2 text-xs font-semibold text-emerald-300">
        <abbr
          title={protocolInfo[log.protocol] || log.protocol}
          className="cursor-help underline decoration-dotted decoration-emerald-400/70"
          tabIndex={0}
        >
          {log.protocol}
        </abbr>
      </td>
      <td className="px-3 py-2 text-sm text-slate-100">{log.host}</td>
      <td className="px-3 py-2 font-mono text-xs leading-5 text-emerald-300">
        {log.details}
      </td>
    </tr>
  );
};

const TimelineItem = ({ log, prefersReduced }) => {
  const itemRef = useRef(null);
  useEffect(() => {
    const el = itemRef.current;
    if (!el || prefersReduced) return;
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s ease-in';
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
  }, [prefersReduced]);

  return (
    <li
      ref={itemRef}
      className="rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-xs leading-5 text-slate-200 shadow-sm"
    >
      <span className="font-semibold text-emerald-300">{log.protocol}</span> {log.host}{' '}
      <span className="text-emerald-200/80">{log.details}</span>
    </li>
  );
};

const Credential = ({ cred }) => {
  const [show, setShow] = useState(false);
  const hidden = cred.password && !show;
  return (
    <span className="mr-2 inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-100 shadow-sm">
      <span aria-hidden>{protocolIcons[cred.protocol] || '❓'}</span>
      <span className="font-medium">{cred.username}</span>
      {cred.password && (
        <>
          <span className="text-slate-500">•</span>
          <span>{hidden ? '***' : cred.password}</span>
          <button
            className="ml-1 rounded px-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 transition hover:text-emerald-200"
            onClick={() => setShow(!show)}
          >
            {hidden ? 'Show' : 'Hide'}
          </button>
        </>
      )}
    </span>
  );
};

const SessionTile = ({ session, onView }) => (
  <div className="group flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/70 p-3 shadow-sm transition hover:border-slate-700 hover:bg-slate-900">
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br text-xl font-semibold ${
        protocolAccents[session.protocol] || 'from-slate-600 via-slate-500 to-slate-600 text-slate-100'
      }`}
      aria-hidden
    >
      {protocolIcons[session.protocol] || '❓'}
    </div>
    <div className="flex-1 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-slate-100">
          {session.protocol} session
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-800/70 text-xs text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            title="Copy session"
            onClick={() =>
              navigator.clipboard?.writeText(
                `${session.src}\t${session.dst}\t${session.protocol}\t${session.info}`,
              )
            }
          >
            📋
          </button>
          <button
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-800/70 text-xs text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            title="View details"
            onClick={onView}
          >
            🔍
          </button>
        </div>
      </div>
      <div className="space-y-1 text-xs leading-relaxed text-slate-300">
        <div className="flex flex-wrap items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
          <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-slate-200 shadow-inner">
            {session.src}
          </span>
          <span className="text-slate-500">→</span>
          <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-slate-200 shadow-inner">
            {session.dst}
          </span>
        </div>
        <div className="rounded-lg bg-slate-950/60 px-3 py-2 font-mono text-[11px] text-emerald-300 shadow-inner">
          {session.info}
        </div>
      </div>
    </div>
  </div>
);

const Dsniff = () => {
  const [urlsnarfLogs, setUrlsnarfLogs] = useState([]);
  const [arpspoofLogs, setArpspoofLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('urlsnarf');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState([]); // { field: 'host' | 'protocol', value: string }
  const [newField, setNewField] = useState('host');
  const [newValue, setNewValue] = useState('');
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [domainSummary, setDomainSummary] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [protocolFilter, setProtocolFilter] = useState([]);
  const [domainSort, setDomainSort] = useState('risk');
  const [highRiskOnly, setHighRiskOnly] = useState(false);

  const { summary: pcapSummary, remediation } = pcapFixture;

  const sampleCommand = 'urlsnarf -i eth0';
  const sampleOutput = urlsnarfFixture.slice(0, 1).join('\n');

  const copySampleCommand = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sampleCommand);
    }
  };

  const copySelectedPacket = () => {
    if (selectedPacket !== null && navigator.clipboard) {
      const pkt = pcapSummary[selectedPacket];
      const text = `${pkt.src}\t${pkt.dst}\t${pkt.protocol}\t${pkt.info}`;
      navigator.clipboard.writeText(text);
    }
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReduced(media.matches);
    handler();
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const urlsnarfData = parseLines(urlsnarfFixture.join('\n'));
    const arpspoofData = parseLines(arpspoofFixture.join('\n'));
    setUrlsnarfLogs(urlsnarfData);
    setArpspoofLogs(arpspoofData);
  }, []);

  useEffect(() => {
    if (!urlsnarfLogs.length) return;

    const domainMap = {};
    urlsnarfLogs.forEach((log) => {
      const path = log.details.split(' ')[0] || '';
      if (!domainMap[log.host])
        domainMap[log.host] = { urls: new Set(), credentials: [], risk: 'Low' };
      domainMap[log.host].urls.add(path);
      if (log.protocol === 'HTTP') domainMap[log.host].risk = 'High';
    });

    pcapSummary.forEach((pkt) => {
      const domain = pkt.dst;
      if (!domainMap[domain])
        domainMap[domain] = { urls: new Set(), credentials: [], risk: 'Low' };
      const pathMatch = pkt.info.match(/\s(\/[^\s]*)/);
      if (pathMatch) domainMap[domain].urls.add(pathMatch[1]);
      const uMatch = pkt.info.match(/username=([^\s]+)/);
      const pMatch = pkt.info.match(/password=([^\s]+)/);
      if (uMatch || pMatch) {
        domainMap[domain].credentials.push({
          protocol: pkt.protocol,
          username: uMatch ? uMatch[1] : '',
          password: pMatch ? pMatch[1] : '',
        });
        domainMap[domain].risk = 'High';
      }
    });

    const summary = Object.entries(domainMap).map(([domain, data]) => ({
      domain,
      urls: Array.from(data.urls),
      credentials: data.credentials,
      risk: data.risk,
    }));
    setDomainSummary(summary);

    if (prefersReduced) {
      setTimeline(urlsnarfLogs);
    } else {
      setTimeline([]);
      urlsnarfLogs.forEach((log, idx) => {
        setTimeout(() => {
          setTimeline((prev) => [...prev, log]);
        }, idx * 1000);
      });
    }
  }, [urlsnarfLogs, prefersReduced, pcapSummary]);

  const addFilter = () => {
    if (newValue.trim()) {
      setFilters([...filters, { field: newField, value: newValue.trim() }]);
      setNewValue('');
    }
  };

  const removeFilter = (idx) => {
    setFilters(filters.filter((_, i) => i !== idx));
  };

  const exportSummary = () => {
    const data = domainSummary.map((d) => ({
      domain: d.domain,
      urls: d.urls,
      credentials: d.credentials.map((c) => ({
        protocol: c.protocol,
        username: c.username,
        password: c.password,
      })),
      risk: d.risk,
    }));
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    }
  };

  const clearAllFilters = () => {
    setSearch('');
    setFilters([]);
    setProtocolFilter([]);
  };

  const logs = activeTab === 'urlsnarf' ? urlsnarfLogs : arpspoofLogs;
  const filteredLogs = logs.filter((log) => {
    const searchMatch = log.raw
      .toLowerCase()
      .includes(search.toLowerCase());
    const filterMatch = filters.every((f) =>
      log[f.field].toLowerCase().includes(f.value.toLowerCase())
    );
    const protocolMatch =
      protocolFilter.length === 0 || protocolFilter.includes(log.protocol);
    return searchMatch && filterMatch && protocolMatch;
  });

  const filteredDomainSummary = useMemo(() => {
    const riskWeight = { High: 3, Medium: 2, Low: 1 };
    const data = highRiskOnly
      ? domainSummary.filter((domain) => domain.risk === 'High')
      : domainSummary;

    return [...data].sort((a, b) => {
      if (domainSort === 'domain') {
        return a.domain.localeCompare(b.domain);
      }

      if (domainSort === 'credentials') {
        return b.credentials.length - a.credentials.length;
      }

      if (domainSort === 'urls') {
        return b.urls.length - a.urls.length;
      }

      const riskDiff = (riskWeight[b.risk] || 0) - (riskWeight[a.risk] || 0);
      if (riskDiff !== 0) return riskDiff;
      return b.credentials.length - a.credentials.length;
    });
  }, [domainSort, domainSummary, highRiskOnly]);

  const dashboardMetrics = useMemo(() => {
    const totalPackets = pcapSummary.length + urlsnarfLogs.length + arpspoofLogs.length;
    const highRiskDomains = domainSummary.filter((domain) => domain.risk === 'High').length;
    const credentialsLeaked = domainSummary.reduce(
      (sum, domain) => sum + domain.credentials.length,
      0,
    );
    const activeFiltersCount = filters.length + protocolFilter.length + (search ? 1 : 0);

    return [
      {
        label: 'Captured events',
        value: totalPackets,
        hint: 'Combined urlsnarf, arpspoof, and pcap fixture entries',
      },
      {
        label: 'High-risk domains',
        value: highRiskDomains,
        hint: 'Domains with cleartext traffic or credential leakage',
      },
      {
        label: 'Credentials exposed',
        value: credentialsLeaked,
        hint: 'Usernames/passwords parsed from packet info',
      },
      {
        label: 'Active filters',
        value: activeFiltersCount,
        hint: 'Search + protocol + advanced field filters',
      },
    ];
  }, [arpspoofLogs.length, domainSummary, filters.length, pcapSummary.length, protocolFilter.length, search, urlsnarfLogs.length]);

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-100 md:text-2xl">dsniff capture console</h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300/90">
              Review simulated urlsnarf and arpspoof captures alongside analyst-friendly summaries and mitigations.
            </p>
          </div>
          <button
            onClick={exportSummary}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 shadow-sm transition hover:border-emerald-400/70 hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <span>Export summary</span>
          </button>
        </div>

        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-inner"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg" aria-hidden>
              ⚠️
            </span>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200/90">
                Lab notice
              </p>
              <p className="leading-relaxed text-amber-100/90">
                For lab use only – simulated traffic
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-3" data-testid="suite-tools">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Suite tools
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/50 shadow-sm">
            <table className="w-full table-fixed text-left text-xs md:text-sm">
              <thead className="bg-slate-900/60 text-[11px] uppercase tracking-[0.25em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tool</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {suiteTools.map((t) => (
                  <tr key={t.tool} className="transition hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-semibold text-emerald-300">{t.tool}</td>
                    <td className="px-4 py-3 text-slate-200">{t.description}</td>
                    <td className="px-4 py-3 text-rose-200/90">{t.risk}</td>
                    <td className="px-4 py-3">
                      <a
                        href={t.reference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ubt-blue underline decoration-dotted underline-offset-4 hover:text-blue-200"
                      >
                        man page ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3" data-testid="triage-dashboard">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Threat triage dashboard
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dashboardMetrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-emerald-300">{metric.value}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{metric.hint}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2" data-testid="how-it-works">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">How it works</h2>
            <svg
              viewBox="0 0 200 80"
              role="img"
              aria-label="Attacker intercepting traffic between victim and server"
              className="mt-4 h-32 w-full"
            >
              <title>dsniff flow</title>
              <desc>Attacker positioned between victim and server capturing HTTP requests</desc>
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0,10 3.5,0 7" fill="#fbbf24" />
                </marker>
              </defs>
              <rect x="10" y="25" width="50" height="30" fill="#1f2937" />
              <text x="35" y="43" fontSize="10" fill="#fff" textAnchor="middle">
                Victim
              </text>
              <rect x="140" y="25" width="50" height="30" fill="#1f2937" />
              <text x="165" y="43" fontSize="10" fill="#fff" textAnchor="middle">
                Server
              </text>
              <rect x="80" y="10" width="40" height="60" fill="#374151" />
              <text x="100" y="43" fontSize="10" fill="#fff" textAnchor="middle">
                Attacker
              </text>
              <line x1="60" y1="40" x2="80" y2="40" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="120" y1="40" x2="140" y2="40" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrow)" />
            </svg>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              Tools like <code>urlsnarf</code> sniff traffic and log requests for analysis.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">Sample command</span>
              <button
                onClick={copySampleCommand}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
              >
                Copy sample command
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-black/60">
              <TerminalOutput text={`${sampleCommand}\n${sampleOutput}`} ariaLabel="sample command output" />
            </div>
          </div>
        </section>

        <section className="space-y-4" data-testid="pcap-demo">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            PCAP credential leakage demo
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {pcapSummary.map((pkt, i) => (
              <SessionTile key={`tile-${i}`} session={pkt} onView={() => setSelectedPacket(i)} />
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/50 shadow-sm">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-900/60 text-[11px] uppercase tracking-[0.25em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Src</th>
                  <th className="px-4 py-3">Dst</th>
                  <th className="px-4 py-3">Protocol</th>
                  <th className="px-4 py-3">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {pcapSummary.map((pkt, i) => (
                  <tr
                    key={i}
                    tabIndex={0}
                    onClick={() => setSelectedPacket(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedPacket(i);
                    }}
                    className={`cursor-pointer transition ${
                      selectedPacket === i
                        ? 'bg-emerald-500/10'
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-100">{pkt.src}</td>
                    <td className="px-4 py-3 text-slate-100">{pkt.dst}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        protocolAccents[pkt.protocol] || 'from-slate-600 via-slate-500 to-slate-600 text-slate-100'
                      } bg-gradient-to-br`}
                      >
                        {pkt.protocol}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs leading-5 text-emerald-300">{pkt.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={copySelectedPacket}
              disabled={selectedPacket === null}
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
            >
              Copy selected row
            </button>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Remediation</h3>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-200">
                {remediation.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-3" data-testid="domain-summary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Parsed credentials/URLs by domain
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="dsniff-domain-sort" className="text-[11px] uppercase tracking-wide text-slate-400">
                Sort by
              </label>
              <select
                id="dsniff-domain-sort"
                value={domainSort}
                onChange={(e) => setDomainSort(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="risk">risk priority</option>
                <option value="credentials">credentials count</option>
                <option value="urls">url count</option>
                <option value="domain">domain name</option>
              </select>
              <button
                onClick={() => setHighRiskOnly((prev) => !prev)}
                aria-pressed={highRiskOnly}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                  highRiskOnly
                    ? 'border-rose-400/70 bg-rose-500/20 text-rose-100'
                    : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500'
                }`}
              >
                High-risk only
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/50 shadow-sm">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-900/60 text-[11px] uppercase tracking-[0.25em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">URLs</th>
                  <th className="px-4 py-3">Credentials</th>
                  <th className="px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredDomainSummary.map((d) => (
                  <tr key={d.domain} className="transition hover:bg-slate-900/40">
                    <td className="px-4 py-3 text-slate-100">{d.domain}</td>
                    <td className="px-4 py-3 text-emerald-300">
                      {d.urls.length ? d.urls.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-100">
                      {d.credentials.length ? (
                        <div className="flex flex-wrap gap-2">
                          {d.credentials.map((c, i) => (
                            <Credential cred={c} key={i} />
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          riskBadgeStyles[d.risk] || 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {d.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredDomainSummary.length && (
              <div className="border-t border-slate-800/80 px-4 py-6 text-center text-xs text-slate-400">
                No domains match the current risk filter.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3" data-testid="capture-timeline">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Capture timeline</h2>
          <ol className="space-y-2 text-xs">
            {timeline.map((log, i) => (
              <TimelineItem key={i} log={log} prefersReduced={prefersReduced} />
            ))}
          </ol>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/60 p-1">
            <button
              className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                activeTab === 'urlsnarf'
                  ? 'bg-slate-800 text-emerald-300'
                  : 'text-slate-300 hover:text-emerald-200'
              }`}
              onClick={() => setActiveTab('urlsnarf')}
            >
              urlsnarf
            </button>
            <button
              className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                activeTab === 'arpspoof'
                  ? 'bg-slate-800 text-emerald-300'
                  : 'text-slate-300 hover:text-emerald-200'
              }`}
              onClick={() => setActiveTab('arpspoof')}
            >
              arpspoof
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(protocolRisks).map(([proto, risk]) => (
              <button
                key={proto}
                className={`inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                  protocolFilter.includes(proto)
                    ? 'bg-slate-800 text-emerald-300'
                    : 'bg-slate-900/60 text-slate-300 hover:text-emerald-200'
                } ${riskBadgeStyles[risk] || ''}`}
                onClick={() =>
                  setProtocolFilter((prev) =>
                    prev.includes(proto)
                      ? prev.filter((p) => p !== proto)
                      : [...prev, proto]
                  )
                }
              >
                {proto}
              </button>
            ))}
          </div>
          <button
            className="rounded-md border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:text-white"
            onClick={clearAllFilters}
          >
            Clear all filters
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label
              id="dsniff-search-label"
              className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              htmlFor="dsniff-search"
            >
              Search logs
            </label>
            <input
              id="dsniff-search"
              type="search"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              placeholder="Filter captured lines"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-labelledby="dsniff-search-label"
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400" id="dsniff-advanced-filter">
              Advanced filter
            </p>
            <div className="mt-1 flex flex-wrap gap-2" aria-labelledby="dsniff-advanced-filter">
              <label className="sr-only" htmlFor="dsniff-filter-field">
                Filter field
              </label>
              <select
                id="dsniff-filter-field"
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="host">host</option>
                <option value="protocol">protocol</option>
              </select>
              <label className="sr-only" htmlFor="dsniff-filter-value">
                Filter value
              </label>
              <input
                id="dsniff-filter-value"
                className="flex-1 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                aria-labelledby="dsniff-advanced-filter"
              />
              <button
                className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:border-emerald-400/70 hover:bg-emerald-500/20"
                onClick={addFilter}
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {filters.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-100"
                >
                  {`${f.field}:${f.value}`}
                  <button
                    className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200 transition hover:text-rose-100"
                    onClick={() => removeFilter(i)}
                    aria-label={`Remove filter ${f.field}:${f.value}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="h-56 overflow-auto rounded-2xl border border-slate-800/80 bg-black/70 text-emerald-300 shadow-inner"
          aria-live="polite"
          role="log"
        >
          {filteredLogs.length ? (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-black/80 text-[11px] uppercase tracking-[0.25em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Protocol</th>
                  <th className="px-3 py-2">Host</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => (
                  <LogRow
                    key={`${log.raw}-${i}`}
                    log={log}
                    prefersReduced={prefersReduced}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No data
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dsniff;

export const displayDsniff = (addFolder, openApp) => (
  <Dsniff addFolder={addFolder} openApp={openApp} />
);
