import React, { useEffect, useRef, useState } from 'react';
import urlsnarfFixture from '../../../public/demo-data/dsniff/urlsnarf.json';
import arpspoofFixture from '../../../public/demo-data/dsniff/arpspoof.json';
import pcapFixture from '../../../public/demo-data/dsniff/pcap.json';

// Simple parser that attempts to extract protocol, host and remaining details
const parseLines = (text) =>
  text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      let protocol = parts[0] || '';
      let host = parts[1] || '';
      let rest = parts.slice(2);
      if (protocol === 'ARP' && parts[1] === 'reply') {
        host = parts[2] || '';
        rest = parts.slice(3);
      }
      return {
        raw: line,
        protocol,
        host,
        details: rest.join(' '),
      };
    });

const protocolInfo = {
  HTTP: 'Hypertext Transfer Protocol',
  HTTPS: 'HTTP over TLS/SSL',
  ARP: 'Address Resolution Protocol',
  FTP: 'File Transfer Protocol',
  SSH: 'Secure Shell',
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
    <tr ref={rowRef} className="odd:bg-black even:bg-ub-grey">
      <td className="pr-2 text-green-400">
        <abbr
          title={protocolInfo[log.protocol] || log.protocol}
          className="underline decoration-dotted cursor-help"
          tabIndex={0}
        >
          {log.protocol}
        </abbr>
      </td>
      <td className="pr-2 text-white">{log.host}</td>
      <td className="text-green-400">{log.details}</td>
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
    <li ref={itemRef} className="mb-1">
      <span className="text-green-400">{log.protocol}</span> {log.host} {log.details}
    </li>
  );
};

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
  }, [urlsnarfLogs, prefersReduced]);

  const addFilter = () => {
    if (newValue.trim()) {
      setFilters([...filters, { field: newField, value: newValue.trim() }]);
      setNewValue('');
    }
  };

  const removeFilter = (idx) => {
    setFilters(filters.filter((_, i) => i !== idx));
  };

  const exportRedacted = () => {
    const redacted = domainSummary.map((d) => ({
      domain: d.domain,
      urls: d.urls,
      credentials: d.credentials.map((c) => ({
        username: c.username,
        password: c.password ? '***' : '',
      })),
      risk: d.risk,
    }));
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(redacted, null, 2));
    }
  };

  const logs = activeTab === 'urlsnarf' ? urlsnarfLogs : arpspoofLogs;
  const filteredLogs = logs.filter((log) => {
    const searchMatch = log.raw
      .toLowerCase()
      .includes(search.toLowerCase());
    const filterMatch = filters.every((f) =>
      log[f.field].toLowerCase().includes(f.value.toLowerCase())
    );
    return searchMatch && filterMatch;
  });

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-2 overflow-auto">
      <h1 className="text-lg mb-2">dsniff</h1>
      <div className="mb-2 text-yellow-300 text-sm">
        For lab use only – simulated traffic
      </div>
      <div className="mb-4" data-testid="suite-tools">
        <h2 className="font-bold mb-2 text-sm">Suite tools</h2>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-green-400">
              <th className="pr-2">Tool</th>
              <th className="pr-2">Description</th>
              <th className="pr-2">Risk</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {suiteTools.map((t) => (
              <tr key={t.tool} className="odd:bg-black even:bg-ub-grey">
                <td className="pr-2 text-green-400">{t.tool}</td>
                <td className="pr-2 text-white">{t.description}</td>
                <td className="pr-2 text-red-400">{t.risk}</td>
                <td>
                  <a
                    href={t.reference}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-ubt-blue"
                  >
                    man
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-4 flex flex-col md:flex-row gap-4" data-testid="how-it-works">
        <div className="md:w-1/2 bg-black p-2">
          <h2 className="font-bold mb-2 text-sm">How it works</h2>
          <svg
            viewBox="0 0 200 80"
            role="img"
            aria-label="Attacker intercepting traffic between victim and server"
            className="w-full h-32"
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
          <p className="text-xs mt-2">
            Tools like <code>urlsnarf</code> sniff traffic and log requests for analysis.
          </p>
        </div>
        <div className="md:w-1/2 bg-black p-2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">Sample command</span>
            <button
              onClick={copySampleCommand}
              className="px-2 py-1 bg-ub-grey rounded text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              Copy sample command
            </button>
          </div>
          <pre className="text-xs bg-ub-dark p-2 flex-1 overflow-auto" aria-label="sample command output">
            {`${sampleCommand}\n${sampleOutput}`}
          </pre>
        </div>
      </div>
      <div className="mb-4" data-testid="pcap-demo">
        <h2 className="font-bold mb-2 text-sm">PCAP credential leakage demo</h2>
        <table className="w-full text-left text-xs mb-2">
          <thead>
            <tr className="text-green-400">
              <th className="pr-2">Src</th>
              <th className="pr-2">Dst</th>
              <th className="pr-2">Protocol</th>
              <th>Info</th>
            </tr>
          </thead>
          <tbody>
            {pcapSummary.map((pkt, i) => (
              <tr
                key={i}
                tabIndex={0}
                onClick={() => setSelectedPacket(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedPacket(i);
                }}
                className={`cursor-pointer ${
                  selectedPacket === i
                    ? 'bg-ubt-blue'
                    : i % 2 === 0
                    ? 'bg-black'
                    : 'bg-ub-grey'
                }`}
              >
                <td className="pr-2 text-white">{pkt.src}</td>
                <td className="pr-2 text-white">{pkt.dst}</td>
                <td className="pr-2 text-green-400">{pkt.protocol}</td>
                <td className="text-green-400">{pkt.info}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={copySelectedPacket}
          disabled={selectedPacket === null}
          className="mb-2 px-2 py-1 bg-ub-grey rounded text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
        >
          Copy selected row
        </button>
        <div className="bg-black p-2">
          <h3 className="font-bold mb-1 text-sm">Remediation</h3>
          <ul className="list-disc pl-5 text-xs">
            {remediation.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mb-4" data-testid="domain-summary">
        <h2 className="font-bold mb-2 text-sm">
          Parsed credentials/URLs by domain
        </h2>
        <table className="w-full text-left text-xs mb-2">
          <thead>
            <tr className="text-green-400">
              <th className="pr-2">Domain</th>
              <th className="pr-2">URLs</th>
              <th className="pr-2">Credentials</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {domainSummary.map((d) => (
              <tr key={d.domain} className="odd:bg-black even:bg-ub-grey">
                <td className="pr-2 text-white">{d.domain}</td>
                <td className="pr-2 text-green-400">{d.urls.join(', ')}</td>
                <td className="pr-2 text-white">
                  {d.credentials.length
                    ? d.credentials
                        .map((c) => `${c.username || ''}${c.password ? ':' + c.password : ''}`)
                        .join(' | ')
                    : '—'}
                </td>
                <td className={d.risk === 'High' ? 'text-red-400' : 'text-yellow-300'}>
                  {d.risk}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={exportRedacted}
          className="px-2 py-1 bg-ub-grey rounded text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          Export redacted
        </button>
      </div>
      <div className="mb-4" data-testid="capture-timeline">
        <h2 className="font-bold mb-2 text-sm">Capture timeline</h2>
        <ol className="list-decimal pl-5 text-xs">
          {timeline.map((log, i) => (
            <TimelineItem key={i} log={log} prefersReduced={prefersReduced} />
          ))}
        </ol>
      </div>
      <div className="mb-2 flex space-x-2 items-center">
        <button
          className={`px-2 ${
            activeTab === 'urlsnarf' ? 'bg-black text-green-500' : 'bg-ub-grey'
          }`}
          onClick={() => setActiveTab('urlsnarf')}
        >
          urlsnarf
        </button>
        <button
          className={`px-2 ${
            activeTab === 'arpspoof' ? 'bg-black text-green-500' : 'bg-ub-grey'
          }`}
          onClick={() => setActiveTab('arpspoof')}
        >
          arpspoof
        </button>
      </div>
      <div className="mb-2">
        <input
          className="w-full text-black p-1"
          placeholder="Search logs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="mb-2">
        <div className="flex space-x-2 mb-2">
          <select
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            className="text-black"
          >
            <option value="host">host</option>
            <option value="protocol">protocol</option>
          </select>
          <input
            className="flex-1 text-black p-1"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <button
            className="bg-ub-blue text-white px-2"
            onClick={addFilter}
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap">
          {filters.map((f, i) => (
            <span
              key={i}
              className="bg-ub-grey text-white px-2 py-1 mr-1 mb-1"
            >
              {`${f.field}:${f.value}`}
              <button
                className="ml-1 text-red-400"
                onClick={() => removeFilter(i)}
              >
                x
              </button>
            </span>
          ))}
        </div>
      </div>
      <div
        className="bg-black text-green-400 p-2 h-40 overflow-auto"
        aria-live="polite"
        role="log"
      >
        {filteredLogs.length ? (
          <table className="w-full text-left text-sm">
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
          <div>No data</div>
        )}
      </div>
    </div>
  );
};

export default Dsniff;

export const displayDsniff = (addFolder, openApp) => (
  <Dsniff addFolder={addFolder} openApp={openApp} />
);
