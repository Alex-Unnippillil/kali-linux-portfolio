import React, { useState, useEffect, useMemo } from 'react';
import LabMode from '../../LabMode';
import CommandBuilder from '../../CommandBuilder';
import FixturesLoader from '../../FixturesLoader';
import ResultViewer from '../../ResultViewer';
import ExplainerPane from '../../ExplainerPane';

const SCRIPT_SNIPPETS = [
  {
    id: 'panel-log',
    label: 'DOM ready logger',
    code: `document.addEventListener('DOMContentLoaded', () => {\n  const panel = document.querySelector('[data-panel]');\n  console.log('CSP lab inline script', panel);\n});`,
  },
  {
    id: 'menu-toggle',
    label: 'Menu toggle helper',
    code: `const menu = document.querySelector('[data-menu]');\nif (menu) {\n  menu.classList.toggle('is-open');\n}`,
  },
  {
    id: 'custom',
    label: 'Custom snippet',
    code: '',
  },
];

const HASH_ALGORITHMS = ['SHA-256', 'SHA-384', 'SHA-512'];

const DIRECTIVE_OPTIONS = [
  { id: 'script-src', label: 'script-src' },
  { id: 'style-src', label: 'style-src' },
];

const BUILT_IN_SOURCES = [
  { value: "'self'", label: "'self' (current origin)" },
  { value: "'unsafe-inline'", label: "'unsafe-inline' (not recommended)" },
  { value: "'unsafe-eval'", label: "'unsafe-eval' (avoid in production)" },
];

const HASH_PREFIX = {
  'SHA-256': 'sha256',
  'SHA-384': 'sha384',
  'SHA-512': 'sha512',
};

const tabs = [
  { id: 'repeater', label: 'Repeater' },
  { id: 'suricata', label: 'Suricata Logs' },
  { id: 'zeek', label: 'Zeek Logs' },
  { id: 'sigma', label: 'Sigma Explorer' },
  { id: 'yara', label: 'YARA Tester' },
  { id: 'mitre', label: 'MITRE ATT&CK' },
  { id: 'csp', label: 'CSP Helper' },
  { id: 'fixtures', label: 'Fixtures' },
];

export default function SecurityTools() {
  const [active, setActive] = useState('repeater');
  const [query, setQuery] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [fixtureData, setFixtureData] = useState([]);

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

  const [directives, setDirectives] = useState({
    "default-src": ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
  });
  const [selectedDirective, setSelectedDirective] = useState('script-src');
  const [selectedSnippet, setSelectedSnippet] = useState(SCRIPT_SNIPPETS[0].id);
  const [customSnippet, setCustomSnippet] = useState('');
  const [mode, setMode] = useState('nonce');
  const [algorithm, setAlgorithm] = useState('SHA-256');
  const [generatedValue, setGeneratedValue] = useState('');
  const [generatorStatus, setGeneratorStatus] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [policyCopyFeedback, setPolicyCopyFeedback] = useState('');
  const [customSource, setCustomSource] = useState('');

  const snippetText = useMemo(() => {
    if (selectedSnippet === 'custom') {
      return customSnippet;
    }
    const match = SCRIPT_SNIPPETS.find((item) => item.id === selectedSnippet);
    return match ? match.code : '';
  }, [customSnippet, selectedSnippet]);

  const policyString = useMemo(
    () =>
      Object.entries(directives)
        .map(([directive, values]) =>
          values.length ? `${directive} ${values.join(' ')}` : directive,
        )
        .join('; '),
    [directives],
  );

  useEffect(() => {
    if (!copyFeedback) return;
    const timer = setTimeout(() => setCopyFeedback(''), 2000);
    return () => clearTimeout(timer);
  }, [copyFeedback]);

  useEffect(() => {
    if (!policyCopyFeedback) return;
    const timer = setTimeout(() => setPolicyCopyFeedback(''), 2000);
    return () => clearTimeout(timer);
  }, [policyCopyFeedback]);

  const updateDirective = (directive, updater) => {
    setDirectives((prev) => {
      const current = prev[directive] || [];
      const updated = updater(current);
      return { ...prev, [directive]: updated };
    });
  };

  const hasSource = (directive, source) =>
    (directives[directive] || []).includes(source);

  const toggleSource = (directive, source) => {
    updateDirective(directive, (current) =>
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source],
    );
  };

  const addCustomSource = () => {
    const trimmed = customSource.trim();
    if (!trimmed) return;
    updateDirective(selectedDirective, (current) =>
      current.includes(trimmed) ? current : [...current, trimmed],
    );
    setCustomSource('');
  };

  const removeSource = (directive, source) => {
    updateDirective(directive, (current) =>
      current.filter((item) => item !== source),
    );
  };

  const toBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return window.btoa(binary);
    }
    if (typeof globalThis !== 'undefined' && typeof globalThis.btoa === 'function') {
      return globalThis.btoa(binary);
    }
    return '';
  };

  const applyGeneratedValue = (formatted, type, prefix) => {
    setGeneratedValue(formatted);
    setGeneratorStatus(`Added ${formatted} to ${selectedDirective}.`);
    setCopyFeedback('');
    updateDirective(selectedDirective, (current) => {
      const filtered = current.filter((item) => {
        if (type === 'nonce') {
          return !item.startsWith("'nonce-");
        }
        return prefix ? !item.startsWith(`'${prefix}-`) : true;
      });
      return [...filtered, formatted];
    });
  };

  const generateNonce = () => {
    if (typeof window === 'undefined' || !window.crypto?.getRandomValues) {
      setGeneratorStatus('Crypto API unavailable in this environment.');
      return;
    }
    const random = new Uint8Array(16);
    window.crypto.getRandomValues(random);
    const base64 = toBase64(random.buffer);
    if (!base64) {
      setGeneratorStatus('Failed to encode nonce.');
      return;
    }
    applyGeneratedValue(`'nonce-${base64}'`, 'nonce');
  };

  const generateHash = async () => {
    if (!snippetText) {
      setGeneratorStatus('Provide a script snippet before hashing.');
      return;
    }
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      setGeneratorStatus('Crypto.subtle is unavailable in this environment.');
      return;
    }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(snippetText);
      const digest = await window.crypto.subtle.digest(algorithm, data);
      const base64 = toBase64(digest);
      if (!base64) {
        setGeneratorStatus('Failed to encode hash.');
        return;
      }
      const prefix = HASH_PREFIX[algorithm] || 'sha256';
      applyGeneratedValue(`'${prefix}-${base64}'`, 'hash', prefix);
    } catch (err) {
      setGeneratorStatus('Hash generation failed.');
    }
  };

  const runGenerator = () => {
    if (mode === 'nonce') {
      generateNonce();
    } else {
      generateHash();
    }
  };

  const copyGenerated = () => {
    if (!generatedValue) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyFeedback('Clipboard API unavailable.');
      return;
    }
    navigator.clipboard
      .writeText(generatedValue)
      .then(() => setCopyFeedback('Copied value to clipboard.'))
      .catch(() => setCopyFeedback('Copy failed.'));
  };

  const copyPolicy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setPolicyCopyFeedback('Clipboard API unavailable.');
      return;
    }
    navigator.clipboard
      .writeText(`Content-Security-Policy: ${policyString}`)
      .then(() => setPolicyCopyFeedback('Policy copied.'))
      .catch(() => setPolicyCopyFeedback('Copy failed.'));
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
    <LabMode>
      <div className="w-full h-full bg-ub-dark text-white p-2 overflow-auto flex">
        <div className="flex-1 pr-2">
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
                <CommandBuilder
                  doc="Build a curl command. Output is copy-only and not executed."
                  build={({ target = '', opts = '' }) => `curl ${opts} ${target}`.trim()}
                />
              </div>
            )}

            {active === 'csp' && (
              <div className="space-y-4 text-xs">
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="bg-black bg-opacity-40 p-3 rounded border border-gray-700">
                    <h3 className="text-sm font-bold mb-2">Directive Editor</h3>
                    <label className="block mb-2">
                      <span className="mr-2">Directive</span>
                      <select
                        value={selectedDirective}
                        onChange={(e) => setSelectedDirective(e.target.value)}
                        className="bg-ub-cool-grey text-white p-1 rounded"
                      >
                        {DIRECTIVE_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="space-y-2 mb-3">
                      {BUILT_IN_SOURCES.map((source) => (
                        <label key={source.value} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={hasSource(selectedDirective, source.value)}
                            onChange={() => toggleSource(selectedDirective, source.value)}
                          />
                          <span>{source.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mb-3">
                      <label className="block mb-1">Add custom source</label>
                      <div className="flex gap-2">
                        <input
                          value={customSource}
                          onChange={(e) => setCustomSource(e.target.value)}
                          className="flex-1 p-1 text-black rounded"
                          placeholder="https://cdn.example.com"
                        />
                        <button
                          type="button"
                          onClick={addCustomSource}
                          className="px-2 py-1 bg-ub-green text-black rounded"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Sources</h4>
                      <ul className="space-y-1">
                        {(directives[selectedDirective] || []).map((source) => (
                          <li
                            key={source}
                            className="flex items-center justify-between bg-ub-cool-grey bg-opacity-70 px-2 py-1 rounded"
                          >
                            <span className="break-all">{source}</span>
                            <button
                              type="button"
                              onClick={() => removeSource(selectedDirective, source)}
                              className="text-red-300 hover:text-red-200"
                              aria-label={`Remove ${source}`}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section className="bg-black bg-opacity-40 p-3 rounded border border-gray-700">
                    <h3 className="text-sm font-bold mb-2">Inline Script Helper</h3>
                    <label className="block mb-2">
                      <span className="mr-2">Snippet</span>
                      <select
                        value={selectedSnippet}
                        onChange={(e) => setSelectedSnippet(e.target.value)}
                        className="bg-ub-cool-grey text-white p-1 rounded"
                      >
                        {SCRIPT_SNIPPETS.map((snippet) => (
                          <option key={snippet.id} value={snippet.id}>
                            {snippet.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      value={snippetText}
                      onChange={(e) => {
                        if (selectedSnippet === 'custom') {
                          setCustomSnippet(e.target.value);
                        }
                      }}
                      readOnly={selectedSnippet !== 'custom'}
                      className="w-full h-32 p-2 text-black rounded font-mono"
                      aria-label="inline script snippet"
                    />
                    {selectedSnippet !== 'custom' && (
                      <p className="mt-1 text-[11px] text-gray-300">
                        Switch to the custom option to edit the snippet text.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name="csp-mode"
                          value="nonce"
                          checked={mode === 'nonce'}
                          onChange={(e) => setMode(e.target.value)}
                        />
                        Nonce
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name="csp-mode"
                          value="hash"
                          checked={mode === 'hash'}
                          onChange={(e) => setMode(e.target.value)}
                        />
                        Hash
                      </label>
                      {mode === 'hash' && (
                        <select
                          value={algorithm}
                          onChange={(e) => setAlgorithm(e.target.value)}
                          className="bg-ub-cool-grey text-white p-1 rounded"
                        >
                          {HASH_ALGORITHMS.map((alg) => (
                            <option key={alg} value={alg}>
                              {alg}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={runGenerator}
                        className="px-2 py-1 bg-ub-green text-black rounded"
                      >
                        Generate
                      </button>
                    </div>
                    {generatorStatus && (
                      <div className="mt-2 text-[11px] text-green-300" role="status" aria-live="polite">
                        {generatorStatus}
                      </div>
                    )}
                    {generatedValue && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          value={generatedValue}
                          readOnly
                          className="flex-1 p-1 text-black rounded font-mono"
                        />
                        <button
                          type="button"
                          onClick={copyGenerated}
                          className="px-2 py-1 bg-ub-cool-grey text-white rounded"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                    {copyFeedback && (
                      <div className="mt-1 text-[11px]" role="status" aria-live="polite">
                        {copyFeedback}
                      </div>
                    )}
                  </section>
                </div>
                <section className="bg-black bg-opacity-40 p-3 rounded border border-gray-700">
                  <h3 className="text-sm font-bold mb-2">Policy Preview</h3>
                  <pre className="bg-black bg-opacity-40 p-2 rounded overflow-auto whitespace-pre-wrap font-mono">
                    {`Content-Security-Policy: ${policyString}`}
                  </pre>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={copyPolicy}
                      className="px-2 py-1 bg-ub-green text-black rounded"
                    >
                      Copy header
                    </button>
                    {policyCopyFeedback && (
                      <span className="text-[11px]" role="status" aria-live="polite">
                        {policyCopyFeedback}
                      </span>
                    )}
                  </div>
                </section>
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

            {active === 'fixtures' && (
              <div className="flex">
                <div className="w-1/2 pr-2">
                  <FixturesLoader onData={setFixtureData} />
                </div>
                <div className="w-1/2">
                  <ResultViewer data={fixtureData} />
                </div>
              </div>
            )}
          </>
        )}
        </div>
        <ExplainerPane
          lines={[
            'Toggle script-src or style-src sources to see how the CSP header is assembled.',
            'Generate a nonce or SHA hash for the selected inline snippet—the result is added to the active directive.',
            "Copy the finished Content-Security-Policy header to reuse it in server or framework configs.",
          ]}
          resources={[
            { label: 'MDN: Content Security Policy', url: 'https://developer.mozilla.org/docs/Web/HTTP/CSP' },
            { label: 'Chrome DevRel: Script nonces', url: 'https://developer.chrome.com/docs/web-platform/content-security-policy/#script-nonce' },
            { label: 'OWASP CSP Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html' },
          ]}
        />
      </div>
    </LabMode>
  );
}
