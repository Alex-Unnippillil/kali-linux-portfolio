import React, { useEffect, useMemo, useState } from 'react';

import SearchPalette from './SearchPalette';
import { getSourceMetadata, sourceMatches, useQueryOptions } from './searchIndex';
import LabMode from '../../LabMode';
import CommandBuilder from '../../CommandBuilder';
import FixturesLoader from '../../FixturesLoader';
import ResultViewer from '../../ResultViewer';
import ExplainerPane from '../../ExplainerPane';
import { safeLocalStorage } from '../../../utils/safeStorage';

type TabId = 'repeater' | 'suricata' | 'zeek' | 'sigma' | 'yara' | 'mitre' | 'fixtures';

interface SuricataLog {
  [key: string]: unknown;
}

interface ZeekLog {
  [key: string]: unknown;
}

interface SigmaRule {
  id?: string;
  title?: string;
  [key: string]: unknown;
}

interface MitreTechnique {
  id: string;
  name: string;
}

interface MitreResult extends MitreTechnique {
  tactic: string;
}

interface MitreTactic {
  id: string;
  name: string;
  techniques: MitreTechnique[];
}

interface MitreData {
  tactics: MitreTactic[];
}

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'repeater', label: 'Repeater' },
  { id: 'suricata', label: 'Suricata Logs' },
  { id: 'zeek', label: 'Zeek Logs' },
  { id: 'sigma', label: 'Sigma Explorer' },
  { id: 'yara', label: 'YARA Tester' },
  { id: 'mitre', label: 'MITRE ATT&CK' },
  { id: 'fixtures', label: 'Fixtures' },
];

const SecurityTools: React.FC = () => {
  const [active, setActive] = useState<TabId>('repeater');
  const [query, setQuery] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [fixtureData, setFixtureData] = useState<unknown[]>([]);

  const [suricata, setSuricata] = useState<SuricataLog[]>([]);
  const [zeek, setZeek] = useState<ZeekLog[]>([]);
  const [sigma, setSigma] = useState<SigmaRule[]>([]);
  const [mitre, setMitre] = useState<MitreData>({ tactics: [] });
  const [sampleText, setSampleText] = useState('');

  const queryOptions = useQueryOptions();

  useEffect(() => {
    fetch('/fixtures/suricata.json')
      .then((response) => response.json())
      .then((data: SuricataLog[]) => setSuricata(data))
      .catch(() => setSuricata([]));

    fetch('/fixtures/zeek.json')
      .then((response) => response.json())
      .then((data: ZeekLog[]) => setZeek(data))
      .catch(() => setZeek([]));

    fetch('/fixtures/sigma.json')
      .then((response) => response.json())
      .then((data: SigmaRule[]) => setSigma(data))
      .catch(() => setSigma([]));

    fetch('/fixtures/mitre.json')
      .then((response) => response.json())
      .then((data: MitreData) => setMitre(data))
      .catch(() => setMitre({ tactics: [] }));

    fetch('/fixtures/yara_sample.txt')
      .then((response) => response.text())
      .then(setSampleText)
      .catch(() => setSampleText(''));
  }, []);

  const [yaraRule, setYaraRule] = useState<string>("rule Demo { strings: $a = 'MALWARE' condition: $a }");
  const [yaraResult, setYaraResult] = useState('');

  const runYara = () => {
    const matched = sampleText.toUpperCase().includes('MALWARE');
    setYaraResult(matched ? 'Demo rule matched sample.txt' : 'No matches');
  };

  useEffect(() => {
    const stored = safeLocalStorage?.getItem('security-tools-lab-ok');
    setAuthorized(stored === 'true');
  }, []);

  const acceptLab = () => {
    try {
      safeLocalStorage?.setItem('security-tools-lab-ok', 'true');
    } catch {
      // ignore storage failures
    }
    setAuthorized(true);
  };

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  const hasQuery = lowerQuery.length > 0;

  const suricataResults = useMemo(() => {
    if (!hasQuery) return [] as SuricataLog[];
    const meta = getSourceMetadata('suricata');
    if (meta && !sourceMatches(meta, queryOptions)) return [] as SuricataLog[];
    return suricata.filter((log) =>
      JSON.stringify(log).toLowerCase().includes(lowerQuery),
    );
  }, [hasQuery, lowerQuery, queryOptions, suricata]);

  const zeekResults = useMemo(() => {
    if (!hasQuery) return [] as ZeekLog[];
    const meta = getSourceMetadata('zeek');
    if (meta && !sourceMatches(meta, queryOptions)) return [] as ZeekLog[];
    return zeek.filter((log) => JSON.stringify(log).toLowerCase().includes(lowerQuery));
  }, [hasQuery, lowerQuery, queryOptions, zeek]);

  const sigmaResults = useMemo(() => {
    if (!hasQuery) return [] as SigmaRule[];
    const meta = getSourceMetadata('sigma');
    if (meta && !sourceMatches(meta, queryOptions)) return [] as SigmaRule[];
    return sigma.filter((rule) =>
      JSON.stringify(rule).toLowerCase().includes(lowerQuery),
    );
  }, [hasQuery, lowerQuery, queryOptions, sigma]);

  const mitreResults = useMemo<MitreResult[]>(() => {
    if (!hasQuery) return [];
    const meta = getSourceMetadata('mitre');
    if (meta && !sourceMatches(meta, queryOptions)) return [];
    return mitre.tactics.flatMap((tactic) =>
      tactic.techniques
        .filter((technique) =>
          `${technique.id} ${technique.name}`.toLowerCase().includes(lowerQuery),
        )
        .map((technique) => ({ tactic: tactic.name, ...technique })),
    );
  }, [hasQuery, lowerQuery, mitre, queryOptions]);

  const yaraMatch = useMemo(() => {
    if (!hasQuery) return false;
    const meta = getSourceMetadata('yara');
    if (meta && !sourceMatches(meta, queryOptions)) return false;
    return sampleText.toLowerCase().includes(lowerQuery);
  }, [hasQuery, lowerQuery, queryOptions, sampleText]);

  const hasResults = useMemo(
    () =>
      suricataResults.length > 0 ||
      zeekResults.length > 0 ||
      sigmaResults.length > 0 ||
      mitreResults.length > 0 ||
      yaraMatch,
    [mitreResults.length, sigmaResults.length, suricataResults.length, yaraMatch, zeekResults.length],
  );

  const renderTabButton = ({ id, label }: { id: TabId; label: string }) => (
    <button
      key={id}
      type="button"
      onClick={() => setActive(id)}
      className={`mr-1 mb-2 px-2 py-1 text-xs transition ${
        active === id ? 'bg-ub-yellow text-black' : 'bg-ub-cool-grey text-white hover:bg-white/20'
      }`}
    >
      {label}
    </button>
  );

  if (!authorized) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-ub-dark p-4 text-center text-white">
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
          type="button"
          onClick={acceptLab}
          className="rounded bg-ub-green px-2 py-1 text-xs text-black"
        >
          Enter Lab
        </button>
      </div>
    );
  }

  return (
    <LabMode>
      <div className="flex h-full w-full overflow-auto bg-ub-dark p-2 text-white">
        <div className="flex-1 pr-2">
          <SearchPalette query={query} onQueryChange={setQuery} />
          {hasQuery ? (
            <div className="space-y-3 text-xs">
              {suricataResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold">Suricata</h3>
                  {suricataResults.map((log, index) => (
                    <pre key={`suricata-${index}`} className="mb-1 overflow-auto bg-black p-1">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  ))}
                </div>
              )}
              {zeekResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold">Zeek</h3>
                  {zeekResults.map((log, index) => (
                    <pre key={`zeek-${index}`} className="mb-1 overflow-auto bg-black p-1">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  ))}
                </div>
              )}
              {sigmaResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold">Sigma</h3>
                  {sigmaResults.map((rule, index) => {
                    const key = rule.id ?? `sigma-${index}`;
                    return (
                      <div key={key} className="mb-2">
                        <h4 className="font-bold">{rule.title ?? 'Rule'}</h4>
                        <pre className="overflow-auto bg-black p-1">
                          {JSON.stringify(rule, null, 2)}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}
              {mitreResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold">MITRE ATT&CK</h3>
                  <ul className="list-inside list-disc">
                    {mitreResults.map((technique) => (
                      <li key={technique.id}>
                        {technique.id} - {technique.name} ({technique.tactic})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {yaraMatch && (
                <div>
                  <h3 className="text-sm font-bold">YARA Sample</h3>
                  <div>Sample text contains &quot;{trimmedQuery}&quot;</div>
                </div>
              )}
              {!hasResults && (
                <div className="rounded border border-white/10 bg-black/60 p-2">
                  <div>No results found.</div>
                  <div className="mt-1 text-[0.65rem] text-ubt-grey">
                    Adjust your filters or broaden the search terms to include more datasets.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs">
                All tools are static demos using local fixtures. No external network activity occurs.
              </p>
              <div className="mb-2 flex flex-wrap">{tabs.map(renderTabButton)}</div>

              {active === 'repeater' && (
                <div>
                  <CommandBuilder
                    doc="Build a curl command. Output is copy-only and not executed."
                    build={({ target = '', opts = '' }) => `curl ${opts} ${target}`.trim()}
                  />
                </div>
              )}

              {active === 'suricata' && (
                <div>
                  <p className="mb-2 text-xs">Sample Suricata alerts from local JSON fixture.</p>
                  {suricata.map((log, index) => (
                    <pre key={`suricata-${index}`} className="mb-1 overflow-auto bg-black p-1 text-xs">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  ))}
                </div>
              )}

              {active === 'zeek' && (
                <div>
                  <p className="mb-2 text-xs">Sample Zeek logs from local JSON fixture.</p>
                  {zeek.map((log, index) => (
                    <pre key={`zeek-${index}`} className="mb-1 overflow-auto bg-black p-1 text-xs">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  ))}
                </div>
              )}

              {active === 'sigma' && (
                <div>
                  <p className="mb-2 text-xs">Static Sigma rules loaded from fixture.</p>
                  {sigma.map((rule, index) => {
                    const key = rule.id ?? `sigma-${index}`;
                    return (
                      <div key={key} className="mb-2">
                        <h3 className="text-sm font-bold">{rule.title ?? 'Rule'}</h3>
                        <pre className="overflow-auto bg-black p-1 text-xs">
                          {JSON.stringify(rule, null, 2)}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}

              {active === 'yara' && (
                <div>
                  <p className="mb-2 text-xs">Simplified YARA tester using sample text. Pattern matching is simulated.</p>
                  <textarea
                    value={yaraRule}
                    onChange={(event) => setYaraRule(event.target.value)}
                    className="h-24 w-full bg-white p-1 text-black"
                  />
                  <div className="mt-2 text-xs">Sample file:</div>
                  <textarea value={sampleText} readOnly className="h-24 w-full bg-white p-1 text-black" />
                  <button
                    type="button"
                    onClick={runYara}
                    className="mt-2 rounded bg-ub-green px-2 py-1 text-xs text-black"
                  >
                    Scan
                  </button>
                  {yaraResult && <div className="mt-2 text-xs">{yaraResult}</div>}
                </div>
              )}

              {active === 'mitre' && (
                <div>
                  <p className="mb-2 text-xs">Mini MITRE ATT&CK navigator from static data.</p>
                  {mitre.tactics.map((tactic) => (
                    <div key={tactic.id} className="mb-2">
                      <h3 className="text-sm font-bold">{tactic.name}</h3>
                      <ul className="list-inside list-disc text-xs">
                        {tactic.techniques.map((technique) => (
                          <li key={technique.id}>{technique.id} - {technique.name}</li>
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
          lines={["Use this lab to explore static security data."]}
          resources={[
            { label: 'NIST SP 800-115', url: 'https://csrc.nist.gov/publications/detail/sp/800-115/final' },
            { label: 'OWASP Testing Guide', url: 'https://owasp.org/www-project-web-security-testing-guide/' },
          ]}
        />
      </div>
    </LabMode>
  );
};

export default SecurityTools;
