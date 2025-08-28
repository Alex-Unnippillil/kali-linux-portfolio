import React, { useState, useEffect } from 'react';

const tabs = [
  { id: 'repeater', label: 'Repeater' },
  { id: 'suricata', label: 'Suricata Logs' },
  { id: 'zeek', label: 'Zeek Logs' },
  { id: 'sigma', label: 'Sigma Explorer' },
  { id: 'yara', label: 'YARA Tester' },
  { id: 'mitre', label: 'MITRE ATT&CK' },
];

export default function SecurityTools() {
  const [active, setActive] = useState('repeater');
  const [query, setQuery] = useState('');
  const [authorized, setAuthorized] = useState(false);

  // Repeater state
  const [req, setReq] = useState('GET / HTTP/1.1\nHost: example.com\n\n');
  const [res, setRes] = useState('');
  const sendRepeater = () => {
    setRes('HTTP/1.1 200 OK\nContent-Type: text/plain\n\nDemo response from fixture');
  };

  // Logs, rules and fixtures
  const [suricata, setSuricata] = useState([]);
  const [zeek, setZeek] = useState([]);
  const [sigma, setSigma] = useState([]);
  const [mitre, setMitre] = useState({ tactics: [] });
  const [sampleText, setSampleText] = useState('');

  useEffect(() => {
    fetch('/fixtures/suricata.json').then(r => r.json()).then(setSuricata);
    fetch('/fixtures/zeek.json').then(r => r.json()).then(setZeek);
    fetch('/fixtures/sigma.json').then(r => r.json()).then(setSigma);
    fetch('/fixtures/mitre.json').then(r => r.json()).then(setMitre);
    fetch('/fixtures/yara_sample.txt').then(r => r.text()).then(setSampleText);
  }, []);

  const [yaraRule, setYaraRule] = useState('rule Demo { strings: $a = "MALWARE" condition: $a }');
  const [yaraResult, setYaraResult] = useState('');
  const runYara = () => {
    const matched = sampleText.includes('MALWARE');
    setYaraResult(matched ? 'Demo rule matched sample.txt' : 'No matches');
  };

  // Lab access gate
  useEffect(() => {
    try {
      const ok = localStorage.getItem('security-tools-lab-ok');
      setAuthorized(ok === 'true');
    } catch {
      setAuthorized(false);
    }
  }, []);

  const acceptLab = () => {
    try {
      localStorage.setItem('security-tools-lab-ok', 'true');
    } catch {
      // ignore
    }
    setAuthorized(true);
  };

  // Global search results
  const lower = query.toLowerCase();
  const suricataResults = lower ? suricata.filter(log => JSON.stringify(log).toLowerCase().includes(lower)) : [];
  const zeekResults = lower ? zeek.filter(log => JSON.stringify(log).toLowerCase().includes(lower)) : [];
  const sigmaResults = lower ? sigma.filter(rule => JSON.stringify(rule).toLowerCase().includes(lower)) : [];
  const mitreResults = lower
    ? mitre.tactics.flatMap(tac =>
        tac.techniques
          .filter(tech => `${tech.id} ${tech.name}`.toLowerCase().includes(lower))
          .map(tech => ({ tactic: tac.name, ...tech }))
      )
    : [];
  const yaraMatch = lower && sampleText.toLowerCase().includes(lower);
  const hasResults =
    suricataResults.length ||
    zeekResults.length ||
    sigmaResults.length ||
    mitreResults.length ||
    (yaraMatch ? 1 : 0);

  const tabButton = (t) => (
    <button
      key={t.id}
      onClick={() => setActive(t.id)}
      className={`px-2 py-1 text-xs ${active === t.id ? 'bg-ub-yellow text-black' : 'bg-ub-cool-grey text-white'} mr-1 mb-2`}
    >
      {t.label}
    </button>
  );

  if (!authorized) {
    return (
      <div className="w-full h-full bg-ub-dark text-white p-4 flex flex-col items-center justify-center text-center">
        <p className="mb-4 text-sm">
          Security tools are for lab use only. Review{' '}
          <a
            href="https://csrc.nist.gov/publications/detail/sp/800-115/final"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            NIST SP 800-115
          </a>{' '}
          and{' '}
          <a
            href="https://owasp.org/www-project-web-security-testing-guide/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            OWASP Testing Guide
          </a>{' '}
          before proceeding.
        </p>
        <button
          onClick={acceptLab}
          className="px-2 py-1 bg-ub-green text-black text-xs rounded"
        >
          Enter Lab
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-ub-dark text-white p-2 overflow-auto">
      <div className="bg-yellow-400 text-black text-xs p-2 text-center mb-2">
        Test ethically –{' '}
        <a
          href="https://csrc.nist.gov/publications/detail/sp/800-115/final"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          NIST SP 800-115
        </a>{' '}
        |
        {' '}
        <a
          href="https://owasp.org/www-project-web-security-testing-guide/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          OWASP Testing Guide
        </a>{' '}
        – lab use only.
      </div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search all tools"
        className="w-full mb-2 p-1 text-black text-xs"
      />
      {query ? (
        <div className="text-xs">
          {suricataResults.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm font-bold">Suricata</h3>
              {suricataResults.map((log, i) => (
                <pre key={i} className="bg-black p-1 mb-1 overflow-auto">
                  {JSON.stringify(log, null, 2)}
                </pre>
              ))}
            </div>
          )}
          {zeekResults.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm font-bold">Zeek</h3>
              {zeekResults.map((log, i) => (
                <pre key={i} className="bg-black p-1 mb-1 overflow-auto">
                  {JSON.stringify(log, null, 2)}
                </pre>
              ))}
            </div>
          )}
          {sigmaResults.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm font-bold">Sigma</h3>
              {sigmaResults.map(rule => (
                <div key={rule.id} className="mb-2">
                  <h4 className="font-bold">{rule.title}</h4>
                  <pre className="bg-black p-1 overflow-auto">
                    {JSON.stringify(rule, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
          {mitreResults.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm font-bold">MITRE ATT&CK</h3>
              <ul className="list-disc list-inside">
                {mitreResults.map(tech => (
                  <li key={tech.id}>
                    {tech.id} - {tech.name} ({tech.tactic})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {yaraMatch && (
            <div className="mb-2">
              <h3 className="text-sm font-bold">YARA Sample</h3>
              <div>Sample text contains &quot;{query}&quot;</div>
            </div>
          )}
          {!hasResults && <div>No results found.</div>}
        </div>
      ) : (
        <>
          <p className="text-xs mb-2">All tools are static demos using local fixtures. No external network activity occurs.</p>
          <div className="mb-2 flex flex-wrap">{tabs.map(tabButton)}</div>

          {active === 'repeater' && (
            <div>
              <p className="text-xs mb-2">Static Burp-style repeater. Request is not actually sent.</p>
              <textarea value={req} onChange={e=>setReq(e.target.value)} className="w-full h-32 text-black p-1" />
              <button onClick={sendRepeater} className="mt-2 px-2 py-1 bg-ub-green text-black text-xs">Send</button>
              <textarea value={res} readOnly className="w-full h-32 mt-2 text-black p-1" />
            </div>
          )}

          {active === 'suricata' && (
            <div>
              <p className="text-xs mb-2">Sample Suricata alerts from local JSON fixture.</p>
              {suricata.map((log, i) => (
                <pre key={i} className="text-xs bg-black p-1 mb-1 overflow-auto">{JSON.stringify(log, null, 2)}</pre>
              ))}
            </div>
          )}

          {active === 'zeek' && (
            <div>
              <p className="text-xs mb-2">Sample Zeek logs from local JSON fixture.</p>
              {zeek.map((log, i) => (
                <pre key={i} className="text-xs bg-black p-1 mb-1 overflow-auto">{JSON.stringify(log, null, 2)}</pre>
              ))}
            </div>
          )}

          {active === 'sigma' && (
            <div>
              <p className="text-xs mb-2">Static Sigma rules loaded from fixture.</p>
              {sigma.map((rule) => (
                <div key={rule.id} className="mb-2">
                  <h3 className="text-sm font-bold">{rule.title}</h3>
                  <pre className="text-xs bg-black p-1 overflow-auto">{JSON.stringify(rule, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}

          {active === 'yara' && (
            <div>
              <p className="text-xs mb-2">Simplified YARA tester using sample text. Pattern matching is simulated.</p>
              <textarea value={yaraRule} onChange={e=>setYaraRule(e.target.value)} className="w-full h-24 text-black p-1" />
              <div className="text-xs mt-2 mb-1">Sample file:</div>
              <textarea value={sampleText} readOnly className="w-full h-24 text-black p-1" />
              <button onClick={runYara} className="mt-2 px-2 py-1 bg-ub-green text-black text-xs">Scan</button>
              {yaraResult && <div className="mt-2 text-xs">{yaraResult}</div>}
            </div>
          )}

          {active === 'mitre' && (
            <div>
              <p className="text-xs mb-2">Mini MITRE ATT&CK navigator from static data.</p>
              {mitre.tactics.map((tac) => (
                <div key={tac.id} className="mb-2">
                  <h3 className="text-sm font-bold">{tac.name}</h3>
                  <ul className="list-disc list-inside text-xs">
                    {tac.techniques.map((tech) => (
                      <li key={tech.id}>{tech.id} - {tech.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
