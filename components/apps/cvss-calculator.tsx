import React, { useEffect, useState } from 'react';
import {
  calculateBaseScore,
  humanizeBaseMetric,
  humanizeBaseMetricValue,
  validate,
} from 'cvss4';

type MetricMap = Record<string, string>;

const severityFromScore = (s: number) => {
  if (s === 0) return 'None';
  if (s <= 3.9) return 'Low';
  if (s <= 6.9) return 'Medium';
  if (s <= 8.9) return 'High';
  return 'Critical';
};

const parseVector = (vector: string): MetricMap => {
  const parts = vector.split('/');
  const start = parts[0].startsWith('CVSS') ? 1 : 0;
  const obj: MetricMap = {};
  parts.slice(start).forEach((p) => {
    const [k, v] = p.split(':');
    if (k && v) obj[k] = v;
  });
  return obj;
};

const metricExamplesV3: Record<string, Record<string, string>> = {
  AV: {
    N: 'Network - exploit remotely over the Internet',
    A: 'Adjacent - attacker must be on local network',
    L: 'Local - requires local or shell access',
    P: 'Physical - requires physical interaction',
  },
  AC: {
    L: 'Low - no special conditions required',
    H: 'High - needs specific circumstances',
  },
  PR: {
    N: 'None - no authentication needed',
    L: 'Low - requires basic user privileges',
    H: 'High - requires admin/root rights',
  },
  UI: {
    N: 'None - runs without user action',
    R: 'Required - user must click or open something',
  },
  S: {
    U: 'Unchanged - impacts same component',
    C: 'Changed - can affect other components',
  },
  C: {
    H: 'High - complete data disclosure',
    L: 'Low - some data leaked',
    N: 'None - no confidentiality impact',
  },
  I: {
    H: 'High - total data compromise',
    L: 'Low - limited modification',
    N: 'None - no integrity impact',
  },
  A: {
    H: 'High - service completely down',
    L: 'Low - reduced performance',
    N: 'None - no availability impact',
  },
};

const metricExamplesV4: Record<string, Record<string, string>> = {
  AV: {
    N: 'Network - remotely exploitable',
    A: 'Adjacent - same network segment',
    L: 'Local - local access required',
    P: 'Physical - physical access required',
  },
  AC: {
    L: 'Low - straightforward exploit',
    H: 'High - requires unusual conditions',
  },
  AT: {
    N: 'None - no additional requirements',
    P: 'Present - extra conditions like specific config',
  },
  PR: {
    N: 'None - attacker needs no privileges',
    L: 'Low - basic user privileges',
    H: 'High - administrative privileges',
  },
  UI: {
    N: 'None - no user involvement',
    P: 'Passive - user must be present',
    A: 'Active - user must perform an action',
  },
  VC: {
    H: 'High - complete data loss',
    L: 'Low - partial data loss',
    N: 'None - no confidentiality impact',
  },
  VI: {
    H: 'High - system integrity fully compromised',
    L: 'Low - limited modification',
    N: 'None - no integrity impact',
  },
  VA: {
    H: 'High - system unavailable',
    L: 'Low - reduced performance',
    N: 'None - no availability impact',
  },
  SC: {
    H: 'High - data on the impacted system exposed',
    L: 'Low - limited data exposure',
    N: 'None - confidentiality unaffected',
  },
  SI: {
    H: 'High - system integrity lost',
    L: 'Low - partial tampering',
    N: 'None - integrity intact',
  },
  SA: {
    H: 'High - system unavailable',
    L: 'Low - minor availability impact',
    N: 'None - availability unaffected',
  },
};

const CvssCalculator: React.FC = () => {
  const [vectorV3, setVectorV3] = useState('');
  const [vectorV4, setVectorV4] = useState('');
  const [scoreV3, setScoreV3] = useState<number | null>(null);
  const [scoreV4, setScoreV4] = useState<number | null>(null);
  const [severityV3, setSeverityV3] = useState('');
  const [severityV4, setSeverityV4] = useState('');
  const [metricsV3, setMetricsV3] = useState<MetricMap>({});
  const [metricsV4, setMetricsV4] = useState<MetricMap>({});

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const v3 = params.get('v3');
    const v4 = params.get('v4');
    if (v3) setVectorV3(decodeURIComponent(v3));
    if (v4) setVectorV4(decodeURIComponent(v4));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (vectorV3) params.set('v3', vectorV3);
    if (vectorV4) params.set('v4', vectorV4);
    const h = params.toString();
    window.history.replaceState(null, '', h ? `#${h}` : '');
  }, [vectorV3, vectorV4]);

  useEffect(() => {
    if (!vectorV3) {
      setScoreV3(null);
      setSeverityV3('');
      setMetricsV3({});
      return;
    }
    try {
      validate(vectorV3);
      const s = calculateBaseScore(vectorV3);
      setScoreV3(s);
      setSeverityV3(severityFromScore(s));
      setMetricsV3(parseVector(vectorV3));
    } catch {
      setScoreV3(null);
      setSeverityV3('Invalid vector');
      setMetricsV3({});
    }
  }, [vectorV3]);

  useEffect(() => {
    if (!vectorV4) {
      setScoreV4(null);
      setSeverityV4('');
      setMetricsV4({});
      return;
    }
    try {
      validate(vectorV4);
      const s = calculateBaseScore(vectorV4);
      setScoreV4(s);
      setSeverityV4(severityFromScore(s));
      setMetricsV4(parseVector(vectorV4));
    } catch {
      setScoreV4(null);
      setSeverityV4('Invalid vector');
      setMetricsV4({});
    }
  }, [vectorV4]);

  const pasteV3 = async () => {
    const text = await navigator.clipboard.readText();
    setVectorV3(text.trim());
  };

  const pasteV4 = async () => {
    const text = await navigator.clipboard.readText();
    setVectorV4(text.trim());
  };

  const copyPermalink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  const renderTable = (metrics: MetricMap, examples: Record<string, Record<string, string>>) => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr>
          <th className="border-b pb-1">Metric</th>
          <th className="border-b pb-1">Value</th>
          <th className="border-b pb-1">Example</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(metrics).map(([k, v]) => (
          <tr key={k}>
            <td className="py-1 pr-4">{humanizeBaseMetric(k)}</td>
            <td className="py-1 pr-4">{humanizeBaseMetricValue(v, k)}</td>
            <td className="py-1">{examples[k]?.[v] || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <h2 className="text-lg mb-2">CVSS v3.1</h2>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={vectorV3}
              onChange={(e) => setVectorV3(e.target.value)}
              placeholder="Enter CVSS v3.1 vector"
              className="flex-grow p-2 rounded text-black"
            />
            <button onClick={pasteV3} className="px-2 rounded bg-gray-700">Paste</button>
          </div>
          <div className="mb-4">
            <div>Base Score: {scoreV3 !== null ? scoreV3.toFixed(1) : '-'}</div>
            <div>Severity: {severityV3 || '-'}</div>
          </div>
          {Object.keys(metricsV3).length > 0 && renderTable(metricsV3, metricExamplesV3)}
        </div>
        <div className="flex-1">
          <h2 className="text-lg mb-2">CVSS v4</h2>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={vectorV4}
              onChange={(e) => setVectorV4(e.target.value)}
              placeholder="Enter CVSS v4 vector"
              className="flex-grow p-2 rounded text-black"
            />
            <button onClick={pasteV4} className="px-2 rounded bg-gray-700">Paste</button>
          </div>
          <div className="mb-4">
            <div>Base Score: {scoreV4 !== null ? scoreV4.toFixed(1) : '-'}</div>
            <div>Severity: {severityV4 || '-'}</div>
          </div>
          {Object.keys(metricsV4).length > 0 && renderTable(metricsV4, metricExamplesV4)}
        </div>
      </div>
      {scoreV3 !== null && scoreV4 !== null && (
        <div className="mt-4">
          <h3 className="text-lg mb-1">Comparison</h3>
          <div>Score shift (v4 - v3.1): {(scoreV4 - scoreV3).toFixed(1)}</div>
        </div>
      )}
      <button onClick={copyPermalink} className="mt-4 px-2 rounded bg-gray-700">
        Copy Permalink
      </button>
    </div>
  );
};

export default CvssCalculator;

export const displayCvssCalculator = () => <CvssCalculator />;

