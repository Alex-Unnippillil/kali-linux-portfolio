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

  const tabButton = (t) => (
    <button
      key={t.id}
      onClick={() => setActive(t.id)}
      className={`px-2 py-1 text-xs ${active === t.id ? 'bg-ub-yellow text-black' : 'bg-ub-cool-grey text-white'} mr-1 mb-2`}
    >
      {t.label}
    </button>
  );

  return (
    <div className="w-full h-full bg-ub-dark text-white p-2 overflow-auto">
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
    </div>
  );
}
