import React, { useState, useEffect, useCallback, useRef } from 'react';
import LabMode from '../../LabMode';
import CommandBuilder from '../../CommandBuilder';
import FixturesLoader from '../../FixturesLoader';
import ResultViewer from '../../ResultViewer';
import ExplainerPane from '../../ExplainerPane';
import HelpOverlay from '../../HelpOverlay';
import tutorials from './tutorial';

const tabs = [
  { id: 'repeater', label: 'Repeater' },
  { id: 'suricata', label: 'Suricata Logs' },
  { id: 'zeek', label: 'Zeek Logs' },
  { id: 'sigma', label: 'Sigma Explorer' },
  { id: 'yara', label: 'YARA Tester' },
  { id: 'mitre', label: 'MITRE ATT&CK' },
  { id: 'fixtures', label: 'Fixtures' },
];

export default function SecurityTools() {
  const [active, setActive] = useState('repeater');
  const [query, setQuery] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [fixtureData, setFixtureData] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tutorialApp, setTutorialApp] = useState(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const menuContainerRef = useRef(null);
  const menuButtonRef = useRef(null);

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

  const openTutorial = useCallback(
    (appId, force = false) => {
      const config = tutorials[appId];
      if (!config || !config.steps || config.steps.length === 0) {
        return;
      }
      if (!force) {
        try {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`tutorial:${appId}`);
            if (stored === 'done') {
              return;
            }
          }
        } catch {
          // ignore storage errors
        }
      }
      setTutorialApp(appId);
      setTutorialOpen(true);
    },
    []
  );

  const closeTutorial = useCallback(() => {
    if (tutorialApp && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`tutorial:${tutorialApp}`, 'done');
      } catch {
        // ignore storage errors
      }
    }
    setTutorialOpen(false);
    setTutorialApp(null);
  }, [tutorialApp]);

  useEffect(() => {
    if (!authorized) return;
    openTutorial(active);
  }, [authorized, active, openTutorial]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (event) => {
      const container = menuContainerRef.current;
      if (container && container.contains(event.target)) {
        return;
      }
      setMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus?.();
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [active]);


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

  const activeTutorialConfig = tutorialApp ? tutorials[tutorialApp] : null;
  const overlayVisible = Boolean(tutorialOpen && activeTutorialConfig);
  const handleReplay = useCallback(() => {
    setMenuOpen(false);
    openTutorial(active, true);
  }, [active, openTutorial]);

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
    <LabMode>
      <div className="relative flex h-full w-full overflow-auto bg-ub-dark p-2 text-white">
        <HelpOverlay
          open={overlayVisible}
          title={activeTutorialConfig?.title || ''}
          steps={activeTutorialConfig?.steps || []}
          onClose={closeTutorial}
          finishLabel="Close"
        />
        <div className="flex-1 pr-2">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search all tools"
              className="w-full p-1 text-xs text-black sm:flex-1"
              data-tutorial="global-search"
              aria-label="Search across security tool data"
            />
            <div className="relative self-start sm:self-auto" ref={menuContainerRef}>
              <button
                type="button"
                ref={menuButtonRef}
                onClick={() => setMenuOpen(open => !open)}
                className="rounded bg-ub-cool-grey px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ub-yellow"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-controls="security-tools-menu"
              >
                Menu
              </button>
              {menuOpen && (
                <div
                  id="security-tools-menu"
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-white/10 bg-gray-900 shadow-lg"
                >
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                    role="menuitem"
                  >
                    Replay tutorial
                  </button>
                </div>
              )}
            </div>
          </div>
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
            <div className="mb-2 flex flex-wrap" data-tutorial="tabs">{tabs.map(tabButton)}</div>

            {active === 'repeater' && (
              <div data-tutorial="tab-repeater">
                <CommandBuilder
                  doc="Build a curl command. Output is copy-only and not executed."
                  build={({ target = '', opts = '' }) => `curl ${opts} ${target}`.trim()}
                />
              </div>
            )}

            {active === 'suricata' && (
            <div data-tutorial="tab-suricata">
              <p className="text-xs mb-2">Sample Suricata alerts from local JSON fixture.</p>
              {suricata.map((log, i) => (
                <pre key={i} className="text-xs bg-black p-1 mb-1 overflow-auto">{JSON.stringify(log, null, 2)}</pre>
              ))}
            </div>
          )}

            {active === 'zeek' && (
            <div data-tutorial="tab-zeek">
              <p className="text-xs mb-2">Sample Zeek logs from local JSON fixture.</p>
              {zeek.map((log, i) => (
                <pre key={i} className="text-xs bg-black p-1 mb-1 overflow-auto">{JSON.stringify(log, null, 2)}</pre>
              ))}
            </div>
          )}

            {active === 'sigma' && (
            <div data-tutorial="tab-sigma">
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
            <div data-tutorial="tab-yara">
              <p className="text-xs mb-2">Simplified YARA tester using sample text. Pattern matching is simulated.</p>
              <textarea
                value={yaraRule}
                onChange={e=>setYaraRule(e.target.value)}
                className="w-full h-24 text-black p-1"
                data-tutorial="yara-editor"
                aria-label="YARA rule editor"
              />
              <div className="text-xs mt-2 mb-1">Sample file:</div>
              <textarea
                value={sampleText}
                readOnly
                className="w-full h-24 text-black p-1"
                data-tutorial="yara-sample"
                aria-label="Sample file contents"
              />
              <button onClick={runYara} className="mt-2 px-2 py-1 bg-ub-green text-black text-xs">Scan</button>
              {yaraResult && <div className="mt-2 text-xs">{yaraResult}</div>}
            </div>
          )}

            {active === 'mitre' && (
            <div data-tutorial="tab-mitre">
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
              <div className="flex">
                <div className="w-1/2 pr-2" data-tutorial="fixtures-loader">
                  <FixturesLoader onData={setFixtureData} />
                </div>
                <div className="w-1/2" data-tutorial="fixtures-result">
                  <ResultViewer data={fixtureData} />
                </div>
              </div>
            )}
          </>
        )}
        </div>
        <div data-tutorial="explainer">
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
