import React, { useEffect, useState } from 'react';
import { calculateBaseScore, humanizeScore } from 'cvss4';

interface MetricOption {
  value: string;
  label: string;
  tooltip: string;
}

interface MetricDef {
  key: string;
  label: string;
  options: MetricOption[];
}

const metricsV31: MetricDef[] = [
  {
    key: 'AV',
    label: 'Attack Vector',
    options: [
      { value: 'N', label: 'Network', tooltip: 'Network - exploit remotely over the Internet' },
      { value: 'A', label: 'Adjacent', tooltip: 'Adjacent - attacker must be on local network' },
      { value: 'L', label: 'Local', tooltip: 'Local - requires local or shell access' },
      { value: 'P', label: 'Physical', tooltip: 'Physical - requires physical interaction' },
    ],
  },
  {
    key: 'AC',
    label: 'Attack Complexity',
    options: [
      { value: 'L', label: 'Low', tooltip: 'Low - no special conditions required' },
      { value: 'H', label: 'High', tooltip: 'High - needs specific circumstances' },
    ],
  },
  {
    key: 'PR',
    label: 'Privileges Required',
    options: [
      { value: 'N', label: 'None', tooltip: 'None - no authentication needed' },
      { value: 'L', label: 'Low', tooltip: 'Low - requires basic user privileges' },
      { value: 'H', label: 'High', tooltip: 'High - requires admin/root rights' },
    ],
  },
  {
    key: 'UI',
    label: 'User Interaction',
    options: [
      { value: 'N', label: 'None', tooltip: 'None - runs without user action' },
      { value: 'R', label: 'Required', tooltip: 'Required - user must click or open something' },
    ],
  },
  {
    key: 'S',
    label: 'Scope',
    options: [
      { value: 'U', label: 'Unchanged', tooltip: 'Unchanged - impacts same component' },
      { value: 'C', label: 'Changed', tooltip: 'Changed - can affect other components' },
    ],
  },
  {
    key: 'C',
    label: 'Confidentiality',
    options: [
      { value: 'H', label: 'High', tooltip: 'High - complete data disclosure' },
      { value: 'L', label: 'Low', tooltip: 'Low - some data leaked' },
      { value: 'N', label: 'None', tooltip: 'None - no confidentiality impact' },
    ],
  },
  {
    key: 'I',
    label: 'Integrity',
    options: [
      { value: 'H', label: 'High', tooltip: 'High - total data compromise' },
      { value: 'L', label: 'Low', tooltip: 'Low - limited modification' },
      { value: 'N', label: 'None', tooltip: 'None - no integrity impact' },
    ],
  },
  {
    key: 'A',
    label: 'Availability',
    options: [
      { value: 'H', label: 'High', tooltip: 'High - service completely down' },
      { value: 'L', label: 'Low', tooltip: 'Low - reduced performance' },
      { value: 'N', label: 'None', tooltip: 'None - no availability impact' },
    ],
  },
];

const metricsV4: MetricDef[] = [
  {
    key: 'AV',
    label: 'Attack Vector',
    options: [
      { value: 'N', label: 'Network', tooltip: 'Network - remotely exploitable' },
      { value: 'A', label: 'Adjacent', tooltip: 'Adjacent - same network segment' },
      { value: 'L', label: 'Local', tooltip: 'Local - local access required' },
      { value: 'P', label: 'Physical', tooltip: 'Physical - physical access required' },
    ],
  },
  {
    key: 'AC',
    label: 'Attack Complexity',
    options: [
      { value: 'L', label: 'Low', tooltip: 'Low - straightforward exploit' },
      { value: 'H', label: 'High', tooltip: 'High - requires unusual conditions' },
    ],
  },
  {
    key: 'AT',
    label: 'Attack Requirements',
    options: [
      { value: 'N', label: 'None', tooltip: 'None - no additional requirements' },
      { value: 'P', label: 'Present', tooltip: 'Present - extra conditions like specific config' },
    ],
  },
  {
    key: 'PR',
    label: 'Privileges Required',
    options: [
      { value: 'N', label: 'None', tooltip: 'None - attacker needs no privileges' },
      { value: 'L', label: 'Low', tooltip: 'Low - basic user privileges' },
      { value: 'H', label: 'High', tooltip: 'High - administrative privileges' },
    ],
  },
  {
    key: 'UI',
    label: 'User Interaction',
    options: [
      { value: 'N', label: 'None', tooltip: 'None - no user involvement' },
      { value: 'P', label: 'Passive', tooltip: 'Passive - user must be present' },
      { value: 'A', label: 'Active', tooltip: 'Active - user must perform an action' },
    ],
  },
  {
    key: 'VC',
    label: 'Vulnerability Confidentiality',
    options: [
      { value: 'H', label: 'High', tooltip: 'High - complete data loss' },
      { value: 'L', label: 'Low', tooltip: 'Low - partial data loss' },
      { value: 'N', label: 'None', tooltip: 'None - no confidentiality impact' },
    ],
  },
  {
    key: 'VI',
    label: 'Vulnerability Integrity',
    options: [
      { value: 'H', label: 'High', tooltip: 'High - system integrity fully compromised' },
      { value: 'L', label: 'Low', tooltip: 'Low - limited modification' },
      { value: 'N', label: 'None', tooltip: 'None - no integrity impact' },
    ],
  },
  {
    key: 'VA',
    label: 'Vulnerability Availability',
    options: [
      { value: 'H', label: 'High', tooltip: 'High - system unavailable' },
      { value: 'L', label: 'Low', tooltip: 'Low - reduced performance' },
      { value: 'N', label: 'None', tooltip: 'None - no availability impact' },
    ],
  },
  {
    key: 'SC',
    label: 'System Confidentiality',
    options: [
      { value: 'H', label: 'High', tooltip: 'High - data on the impacted system exposed' },
      { value: 'L', label: 'Low', tooltip: 'Low - limited data exposure' },
      { value: 'N', label: 'None', tooltip: 'None - confidentiality unaffected' },
    ],
  },
  {
    key: 'SI',
    label: 'System Integrity',
    options: [
      { value: 'H', label: 'High', tooltip: 'High - system integrity lost' },
      { value: 'L', label: 'Low', tooltip: 'Low - partial tampering' },
      { value: 'N', label: 'None', tooltip: 'None - integrity intact' },
    ],
  },
  {
    key: 'SA',
    label: 'System Availability',
    options: [
      { value: 'H', label: 'High', tooltip: 'High - system unavailable' },
      { value: 'L', label: 'Low', tooltip: 'Low - minor availability impact' },
      { value: 'N', label: 'None', tooltip: 'None - availability unaffected' },
    ],
  },
];

const metricSets: Record<string, MetricDef[]> = {
  '3.1': metricsV31,
  '4.0': metricsV4,
};

const severityColor = (sev: string) => {
  switch (sev) {
    case 'Critical':
      return 'bg-red-600';
    case 'High':
      return 'bg-orange-500';
    case 'Medium':
      return 'bg-yellow-500 text-black';
    case 'Low':
      return 'bg-green-600';
    case 'None':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

const parseVector = (vec: string): Record<string, string> => {
  const out: Record<string, string> = {};
  vec
    .split('/')
    .slice(1)
    .forEach((part) => {
      const [k, v] = part.split(':');
      if (k && v) out[k] = v;
    });
  return out;
};

const CvssBuilder: React.FC = () => {
  const [version, setVersion] = useState<'3.1' | '4.0'>('3.1');
  const [values, setValues] = useState<Record<string, string>>({});
  const [cve, setCve] = useState('');

  const metrics = metricSets[version];
  const allSelected = metrics.every((m) => values[m.key]);
  const vector =
    `CVSS:${version}` +
    metrics
      .filter((m) => values[m.key])
      .map((m) => `/${m.key}:${values[m.key]}`)
      .join('');
  const score = allSelected ? calculateBaseScore(vector) : null;
  const severity = score !== null ? humanizeScore(vector) : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`cvss_vector_${version}`);
      if (stored) setValues(parseVector(stored));
    } catch (e) {
      console.error('Error accessing localStorage', e);
    }
  }, [version]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (vector) localStorage.setItem(`cvss_vector_${version}`, vector);
    } catch (e) {
      console.error('Error accessing localStorage', e);
    }
  }, [vector, version]);

  const handleSelect = (metric: string, value: string) => {
    setValues((prev) => ({ ...prev, [metric]: value }));
  };

  const copyVector = () => {
    if (vector) navigator.clipboard?.writeText(vector);
  };

  const loadCve = async () => {
    const id = cve.trim().toUpperCase();
    if (!id) return;
    try {
      const res = await fetch(`/api/cve?keyword=${encodeURIComponent(id)}`);
      const data = await res.json();
      const vuln = (data.vulnerabilities || []).find((v: any) => v.cve?.id === id);
      const vec =
        vuln?.cve?.metrics?.cvssMetricV40?.[0]?.cvssData?.vectorString ||
        vuln?.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.vectorString;
      if (vec) {
        const ver = vec.startsWith('CVSS:4.0') ? '4.0' : '3.1';
        setVersion(ver);
        setValues(parseVector(vec));
      }
    } catch (e) {
      console.error('Failed to load CVE', e);
    }
  };

  return (
    <div className="h-full w-full p-4 overflow-auto bg-gray-900 text-white print:bg-white print:text-black">
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <label htmlFor="cvss-version" className="text-sm">
          Version:
        </label>
        <select
          id="cvss-version"
          className="p-1 rounded text-black"
          value={version}
          onChange={(e) => {
            setVersion(e.target.value as '3.1' | '4.0');
            setValues({});
          }}
        >
          <option value="3.1">3.1</option>
          <option value="4.0">4.0</option>
        </select>
        <input
          className="p-1 rounded text-black"
          placeholder="CVE-YYYY-XXXX"
          value={cve}
          onChange={(e) => setCve(e.target.value)}
        />
        <button onClick={loadCve} className="px-2 bg-gray-700 rounded">
          Load CVE
        </button>
        {cve && (
          <a
            href={`https://www.cve.org/CVERecord?id=${cve}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-400"
          >
            View CVE
          </a>
        )}
        <button onClick={() => window.print()} className="px-2 bg-gray-700 rounded ml-auto">
          Print
        </button>
      </div>
      {metrics.map((m) => (
        <div key={m.key} className="mb-4">
          <div className="font-semibold mb-1">{m.label}</div>
          <div className="flex flex-wrap gap-2">
            {m.options.map((opt) => (
              <label
                key={opt.value}
                title={opt.tooltip}
                className="flex items-center gap-1 cursor-pointer"
              >
                <input
                  type="radio"
                  name={m.key}
                  value={opt.value}
                  checked={values[m.key] === opt.value}
                  onChange={() => handleSelect(m.key, opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-4">
        <div className="mb-1 flex items-center gap-2 flex-wrap">
          <span>
            Vector: <code className="break-all">{vector || '-'}</code>
          </span>
          <button
            onClick={copyVector}
            className="px-1 bg-gray-700 rounded"
            disabled={!vector}
          >
            Copy
          </button>
        </div>
        <div>Score: {score !== null ? score.toFixed(1) : '-'}</div>
        {score !== null && (
          <div className={`inline-block px-2 mt-1 rounded ${severityColor(severity)}`}>
            {severity}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-1 text-xs">
          <span className="px-2 rounded bg-gray-500">None</span>
          <span className="px-2 rounded bg-green-600">Low</span>
          <span className="px-2 rounded bg-yellow-500 text-black">Medium</span>
          <span className="px-2 rounded bg-orange-500">High</span>
          <span className="px-2 rounded bg-red-600">Critical</span>
        </div>
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer">Vector terms</summary>
        <div className="mt-2 space-y-2 text-sm">
          {metrics.map((m) => (
            <div key={m.key}>
              <div className="font-semibold">
                {m.key} - {m.label}
              </div>
              <ul className="ml-4 list-disc">
                {m.options.map((opt) => (
                  <li key={opt.value}>
                    {opt.value} - {opt.label}: {opt.tooltip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

export default CvssBuilder;
export const displayCvssCalculator = () => <CvssBuilder />;
