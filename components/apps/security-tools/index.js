import React, { useState, useEffect } from 'react';
import LabMode from '../../LabMode';
import CommandBuilder from '../../CommandBuilder';
import FixturesLoader from '../../FixturesLoader';
import ResultViewer from '../../ResultViewer';
import ExplainerPane from '../../ExplainerPane';

const tabs = [
  { id: 'repeater', label: 'Repeater' },
  { id: 'suricata', label: 'Suricata Logs' },
  { id: 'zeek', label: 'Zeek Logs' },
  { id: 'sigma', label: 'Sigma Explorer' },
  { id: 'yara', label: 'YARA Tester' },
  { id: 'mitre', label: 'MITRE ATT&CK' },
  { id: 'fixtures', label: 'Fixtures' },
];

const catalogMeta = {
  repeater: {
    status: 'Stable simulation',
    dataset: 'Generated commands – no live targets',
    warning: 'Commands are never sent; copy output if you want to study syntax.',
  },
  suricata: {
    status: 'Fixture demo',
    dataset: 'fixtures/suricata.json (local sample alerts)',
    warning: 'Logs never leave the browser. Use them to rehearse alert triage.',
  },
  zeek: {
    status: 'Fixture demo',
    dataset: 'fixtures/zeek.json (local session summaries)',
    warning: 'Packets are not captured live; review flow metadata safely.',
  },
  sigma: {
    status: 'Fixture demo',
    dataset: 'fixtures/sigma.json (static detection rules)',
    warning: 'Rules are read-only. Adapt copies for your own lab stack.',
  },
  yara: {
    status: 'Preview',
    dataset: 'fixtures/yara_sample.txt (embedded sample file)',
    warning: 'Pattern checks run against demo text and cannot touch the host OS.',
  },
  mitre: {
    status: 'Fixture demo',
    dataset: 'fixtures/mitre.json (ATT&CK tactics/techniques snapshot)',
    warning: 'Navigator is informational only; no integration with live tooling.',
  },
  fixtures: {
    status: 'Fixture loader',
    dataset: 'Upload local JSON and inspect in Result Viewer (in-browser only)',
    warning: 'Files stay in-memory; refresh clears all imported artifacts.',
  },
};

export default function SecurityTools() {
  const [active, setActive] = useState('repeater');
  const [query, setQuery] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [fixtureData, setFixtureData] = useState([]);
  const [acknowledged, setAcknowledged] = useState(false);

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

  const toolSummary = (id) => {
    const meta = catalogMeta[id];
    if (!meta) return null;
    return (
      <section
        className="mb-3 w-full rounded border border-white/20 bg-black/30 p-3 text-xs"
        aria-label={`${tabs.find(t => t.id === id)?.label ?? 'Tool'} catalog summary`}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-sm font-semibold">Status: {meta.status}</h2>
          <span className="rounded bg-ub-yellow px-2 py-0.5 text-[11px] font-semibold text-black">Training Lab Only</span>
        </div>
        <p className="mt-2 leading-snug"><span className="font-semibold">Dataset:</span> {meta.dataset}</p>
        <p className="mt-1 text-[11px] text-ub-peach/90" role="note">{meta.warning}</p>
      </section>
    );
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
        <p className="mb-3 text-sm font-semibold">Security simulators require an explicit acknowledgement.</p>
        <p className="mb-3 text-xs">
          Review the lab policies and only continue if you are in a controlled training environment. Nothing here triggers real
          scans.
        </p>
        <ul className="mb-4 list-disc space-y-1 text-left text-xs">
          <li>Outputs come from static datasets – never from production targets.</li>
          <li>Do not paste sensitive client or production data into the fixtures.</li>
          <li>
            Enable Lab Mode after entering to unlock the catalog. The yellow banner controls read-only simulations.
          </li>
        </ul>
        <div className="mb-4 flex items-center gap-2 text-left text-xs">
          <input
            id="lab-ack"
            type="checkbox"
            checked={acknowledged}
            onChange={e => setAcknowledged(e.target.checked)}
          />
          <label htmlFor="lab-ack" className="cursor-pointer">
            I understand the simulations are for educational use and remain isolated.
          </label>
        </div>
        <p className="mb-4 text-xs">
          Reference{' '}
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
          for live engagements.
        </p>
        <button
          onClick={acceptLab}
          className="px-2 py-1 bg-ub-green text-black text-xs rounded disabled:opacity-40"
          disabled={!acknowledged}
        >
          Enter Lab and continue to Lab Mode banner
        </button>
      </div>
    );
  }

  return (
    <LabMode>
      <div className="flex h-full w-full flex-col gap-3 overflow-hidden bg-ub-dark p-2 text-white lg:flex-row">
        <div className="flex-1 space-y-2 overflow-y-auto pr-0 lg:pr-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all tools"
            className="w-full rounded border border-black/20 bg-white p-1 text-xs text-black"
            aria-label="Search tools"
          />
          {query ? (
            <div className="space-y-3 text-xs">
              {suricataResults.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-sm font-bold">Suricata</h3>
                  {suricataResults.map((log, i) => (
                    <pre key={i} className="mb-1 overflow-x-auto overflow-y-hidden bg-black p-1">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  ))}
                </div>
              )}
              {zeekResults.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-sm font-bold">Zeek</h3>
                  {zeekResults.map((log, i) => (
                    <pre key={i} className="mb-1 overflow-x-auto overflow-y-hidden bg-black p-1">
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
                      <pre className="overflow-x-auto overflow-y-hidden bg-black p-1">
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
              <p className="text-xs mb-2">All tools are static demos. No external traffic.</p>
              <div className="mb-2 flex flex-wrap gap-2">{tabs.map(tabButton)}</div>

              {active === 'repeater' && (
                <div>
                  {toolSummary('repeater')}
                  <CommandBuilder
                    doc="Build a curl command. Output is copy-only and not executed."
                    build={({ target = '', opts = '' }) => `curl ${opts} ${target}`.trim()}
                  />
                </div>
              )}

              {active === 'suricata' && (
                <div>
                  {toolSummary('suricata')}
                  <p className="text-xs mb-2">Sample Suricata alerts from local JSON fixture.</p>
                  {suricata.map((log, i) => (
                    <pre key={i} className="mb-1 overflow-x-auto overflow-y-hidden bg-black p-1 text-xs">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  ))}
                </div>
              )}

              {active === 'zeek' && (
                <div>
                  {toolSummary('zeek')}
                  <p className="text-xs mb-2">Sample Zeek logs from local JSON fixture.</p>
                  {zeek.map((log, i) => (
                    <pre key={i} className="mb-1 overflow-x-auto overflow-y-hidden bg-black p-1 text-xs">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  ))}
                </div>
              )}

              {active === 'sigma' && (
                <div>
                  {toolSummary('sigma')}
                  <p className="text-xs mb-2">Static Sigma rules loaded from fixture.</p>
                  {sigma.map((rule) => (
                    <div key={rule.id} className="mb-2">
                      <h3 className="text-sm font-bold">{rule.title}</h3>
                      <pre className="overflow-x-auto overflow-y-hidden bg-black p-1 text-xs">
                        {JSON.stringify(rule, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {active === 'yara' && (
                <div>
                  {toolSummary('yara')}
                  <p className="text-xs mb-2">Simplified YARA tester using sample text. Pattern matching is simulated.</p>
                  <textarea
                    value={yaraRule}
                    onChange={e=>setYaraRule(e.target.value)}
                    className="h-24 w-full p-1 text-black"
                    aria-label="Edit YARA rule"
                  />
                  <div className="text-xs mt-2 mb-1">Sample file:</div>
                  <textarea
                    value={sampleText}
                    readOnly
                    className="h-24 w-full p-1 text-black"
                    aria-label="Sample file contents"
                  />
                  <button onClick={runYara} className="mt-2 bg-ub-green px-2 py-1 text-xs text-black">Scan</button>
                  {yaraResult && <div className="mt-2 text-xs">{yaraResult}</div>}
                </div>
              )}

              {active === 'mitre' && (
                <div>
                  {toolSummary('mitre')}
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

              {active === 'fixtures' && (
                <div className="flex flex-col gap-3 lg:flex-row">
                  {toolSummary('fixtures')}
                  <div className="w-full pr-0 lg:w-1/2 lg:pr-2">
                    <FixturesLoader onData={setFixtureData} />
                  </div>
                  <div className="w-full lg:w-1/2">
                    <ResultViewer data={fixtureData} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="min-w-0 flex-shrink-0 overflow-hidden lg:w-64">
          <ExplainerPane
            lines={["Use this lab to explore static security data."]}
            resources={[
              { label: 'NIST SP 800-115', url: 'https://csrc.nist.gov/publications/detail/sp/800-115/final' },
              { label: 'OWASP Testing Guide', url: 'https://owasp.org/www-project-web-security-testing-guide/' },
            ]}
          />
        </div>
      </div>
    </LabMode>
  );
}
