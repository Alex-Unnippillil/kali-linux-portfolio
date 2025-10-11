import React, { useEffect, useMemo, useRef, useState } from 'react';
import HostBubbleChart from './HostBubbleChart';
import PluginFeedViewer from './PluginFeedViewer';
import ScanComparison from './ScanComparison';
import PluginScoreHeatmap from './PluginScoreHeatmap';
import FormError from '../../ui/FormError';
import scanOneFixture from './fixtures/scan-1.json';
import scanTwoFixture from './fixtures/scan-2.json';

// helpers for persistent storage of jobs and false positives
export const loadJobDefinitions = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('nessusJobs') || '[]');
  } catch {
    return [];
  }
};

export const saveJobDefinition = (job) => {
  if (typeof window === 'undefined') return [];
  const jobs = loadJobDefinitions();
  const updated = [...jobs, job];
  localStorage.setItem('nessusJobs', JSON.stringify(updated));
  return updated;
};

export const loadFalsePositives = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('nessusFalsePositives') || '[]');
  } catch {
    return [];
  }
};

export const recordFalsePositive = (findingId, reason) => {
  if (typeof window === 'undefined') return [];
  const fps = loadFalsePositives();
  const updated = [...fps, { findingId, reason }];
  localStorage.setItem('nessusFalsePositives', JSON.stringify(updated));
  return updated;
};

const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'Info', 'Unknown'];
const severityWeights = {
  Critical: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Info: 1,
  Unknown: 0,
};

const normalizeSeverity = (severity) => {
  if (!severity) return 'Unknown';
  const normalized = severity.toString().trim().toLowerCase();
  if (normalized === 'informational') return 'Info';
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return severityOrder.includes(capitalized) ? capitalized : 'Unknown';
};

const normalizeFinding = (finding) => ({
  id: String(finding.id ?? finding.pluginId ?? finding.pluginID ?? ''),
  name: finding.name || finding.pluginName || 'Untitled finding',
  cvss:
    typeof finding.cvss === 'number'
      ? finding.cvss
      : Number(finding.cvss || finding.cvss3_base_score || finding.cvss_base_score || 0),
  severity: normalizeSeverity(finding.severity || finding.risk_factor),
  host: finding.host || finding.hostname || 'Unknown host',
  description: finding.description || '',
  solution: finding.solution || '',
  pluginFamily: finding.pluginFamily || finding.family || 'General',
});

const buildScan = (id, name, description, data) => {
  const normalizedFindings = data.map(normalizeFinding);
  const counts = severityOrder.reduce((acc, level) => ({ ...acc, [level]: 0 }), {});
  normalizedFindings.forEach((finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
  });
  return {
    id,
    name,
    description,
    data: normalizedFindings,
    counts,
    findingCount: normalizedFindings.length,
  };
};

const labScans = [
  buildScan(
    'scan-1',
    'External perimeter baseline',
    'Focuses on TLS, HTTP, and SSH exposure from the public-facing lab network.',
    scanOneFixture
  ),
  buildScan(
    'scan-2',
    'Internal validation sweep',
    'Remediation follow-up validating patch coverage inside the lab VLAN.',
    scanTwoFixture
  ),
];

const scanLookup = labScans.reduce((acc, scan) => {
  acc[scan.id] = scan;
  return acc;
}, {});

const computeHostData = (findings) => {
  const hosts = new Map();
  findings.forEach((finding) => {
    const hostName = finding.host || 'Unknown host';
    const entry = hosts.get(hostName) || {
      host: hostName,
      totalCvss: 0,
      count: 0,
      severity: 'Unknown',
    };
    entry.totalCvss += Number.isFinite(finding.cvss) ? finding.cvss : 0;
    entry.count += 1;
    if (
      severityWeights[normalizeSeverity(finding.severity)] >
      severityWeights[entry.severity]
    ) {
      entry.severity = normalizeSeverity(finding.severity);
    }
    hosts.set(hostName, entry);
  });
  return Array.from(hosts.values()).map((entry, index) => ({
    id: `${entry.host}-${index}`,
    host: entry.host,
    cvss: entry.count
      ? Math.min(10, Number((entry.totalCvss / entry.count).toFixed(1)))
      : 0,
    severity: entry.severity,
  }));
};

const Nessus = () => {
  const defaultScan = labScans[0] || {
    id: null,
    name: 'Sample Nessus scan',
    data: [],
    counts: {},
    findingCount: 0,
  };

  const [selectedScanId, setSelectedScanId] = useState(defaultScan.id);
  const [dataSource, setDataSource] = useState({
    type: 'fixture',
    label: defaultScan.name,
  });
  const [findings, setFindings] = useState(defaultScan.data);
  const [filter, setFilter] = useState('All');
  const [jobs, setJobs] = useState([]);
  const [newJob, setNewJob] = useState({ scanId: '', schedule: '' });
  const [feedbackId, setFeedbackId] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [falsePositives, setFalsePositives] = useState([]);
  const [parseError, setParseError] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const parserWorkerRef = useRef(null);
  const uploadedFileNameRef = useRef('');

  useEffect(() => {
    setJobs(loadJobDefinitions());
    setFalsePositives(loadFalsePositives());
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      parserWorkerRef.current = new Worker(
        new URL('../../../workers/nessus-parser.ts', import.meta.url)
      );
      parserWorkerRef.current.onmessage = (e) => {
        const { findings: parsed = [], error: err } = e.data || {};
        if (err) {
          setParseError(err);
          return;
        }
        const normalized = parsed.map(normalizeFinding);
        setFindings(normalized);
        setSelectedScanId(null);
        setDataSource({
          type: 'upload',
          label: uploadedFileNameRef.current || 'Uploaded report',
        });
        setFilter('All');
        setParseError('');
      };
      return () => parserWorkerRef.current?.terminate();
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!selectedScanId) return;
    const scan = scanLookup[selectedScanId];
    if (!scan) {
      setError('Selected scan fixture is unavailable.');
      return;
    }
    setFindings(scan.data);
    setDataSource({ type: 'fixture', label: scan.name });
    setFilter('All');
    setError('');
  }, [selectedScanId]);

  useEffect(() => {
    setSelected(null);
    setFeedbackId(null);
    setFeedbackText('');
  }, [findings]);

  const severitySummary = useMemo(() => {
    const summary = severityOrder.reduce(
      (acc, level) => ({ ...acc, [level]: 0 }),
      {}
    );
    findings.forEach((finding) => {
      const severity = normalizeSeverity(finding.severity);
      summary[severity] = (summary[severity] || 0) + 1;
    });
    return summary;
  }, [findings]);

  const severityFilters = useMemo(() => {
    const total = findings.length;
    const baseFilters = [
      { id: 'All', label: 'All', count: total },
      ...severityOrder.map((level) => ({
        id: level,
        label: level,
        count: severitySummary[level] || 0,
      })),
    ];
    return baseFilters.filter((option) => option.count > 0 || option.id === 'All');
  }, [findings, severitySummary]);

  const filteredFindings = useMemo(() => {
    if (filter === 'All') return findings;
    return findings.filter(
      (finding) => normalizeSeverity(finding.severity) === filter
    );
  }, [findings, filter]);

  const hostData = useMemo(() => computeHostData(findings), [findings]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!parserWorkerRef.current) {
      setParseError('Parser worker is unavailable in this environment.');
      return;
    }
    try {
      const text = await file.text();
      uploadedFileNameRef.current = file.name;
      parserWorkerRef.current.postMessage(text);
    } catch (err) {
      setParseError('Failed to read file');
    }
  };

  const exportCSV = () => {
    const header = ['Host', 'ID', 'Finding', 'CVSS', 'Severity'];
    const rows = findings.map((f) => [
      f.host,
      f.id,
      f.name,
      f.cvss,
      f.severity,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nessus-findings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addJob = (e) => {
    e.preventDefault();
    if (!newJob.scanId) return;
    const updated = saveJobDefinition(newJob);
    setJobs(updated);
    setNewJob({ scanId: '', schedule: '' });
  };

  const submitFeedback = (e) => {
    e.preventDefault();
    if (!feedbackId) return;
    recordFalsePositive(feedbackId, feedbackText);
    setFalsePositives(loadFalsePositives());
    setFeedbackId(null);
    setFeedbackText('');
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="mb-4 rounded border border-blue-700 bg-blue-900/40 p-4">
        <h2 className="text-lg font-semibold text-blue-200">Lab mode enabled</h2>
        <p className="text-sm text-blue-100">
          Authentication and live scan retrieval are disabled. Explore the
          simulator with curated Nessus report fixtures or upload a sanitized
          export to practice analysis workflows.
        </p>
      </div>

      <section className="mb-4" aria-labelledby="nessus-scan-library">
        <div className="mb-2 flex items-center justify-between">
          <h3 id="nessus-scan-library" className="text-xl">
            Lab scan library
          </h3>
          <span className="text-xs text-gray-400">
            Viewing: {dataSource.label}{' '}
            {dataSource.type === 'fixture' ? '(fixture)' : '(uploaded)'}
          </span>
        </div>
        <p className="mb-3 text-sm text-gray-300">
          Pick a canned export to load trends instantly. Each card lists a
          severity mix pulled from the stored JSON fixtures so you know which
          scenarios are covered.
        </p>
        <div className="flex flex-col gap-2">
          {labScans.map((scan) => (
            <button
              key={scan.id}
              type="button"
              onClick={() => setSelectedScanId(scan.id)}
              aria-pressed={selectedScanId === scan.id}
              className={`rounded border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                selectedScanId === scan.id
                  ? 'border-blue-500 bg-blue-900/40'
                  : 'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{scan.name}</span>
                <span className="text-xs text-gray-300">
                  {scan.findingCount} findings
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-300">{scan.description}</p>
              <ul className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                {severityOrder
                  .filter((level) => scan.counts[level])
                  .map((level) => (
                    <li key={level}>
                      {level}: {scan.counts[level]}
                    </li>
                  ))}
              </ul>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-4" aria-labelledby="nessus-upload">
        <h3 id="nessus-upload" className="text-lg mb-2">
          Upload Nessus XML
        </h3>
        <input
          type="file"
          accept=".nessus,.xml"
          onChange={handleFile}
          className="text-black"
        />
        {parseError && <FormError className="mt-2">{parseError}</FormError>}
        {error && <FormError className="mt-2">{error}</FormError>}
      </section>

      <section className="mb-4" aria-labelledby="nessus-findings-nav">
        <h3 id="nessus-findings-nav" className="text-lg mb-2">
          Findings navigation
        </h3>
        <div className="flex flex-wrap gap-2">
          {severityFilters.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={`px-3 py-1 rounded-full text-sm border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                filter === option.id
                  ? 'bg-white text-black border-gray-300'
                  : 'bg-gray-800 text-white border-gray-600'
              }`}
            >
              {option.label}
              <span className="ml-1 text-xs text-gray-300">
                ({option.count})
              </span>
            </button>
          ))}
        </div>
      </section>

      {findings.length > 0 ? (
        <div className="mb-6">
          <button
            onClick={exportCSV}
            className="mb-3 bg-green-600 px-3 py-1 rounded text-sm"
          >
            Export CSV
          </button>
          <div className="overflow-auto max-h-64 border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">Host</th>
                  <th className="text-left p-2">Vulnerability</th>
                  <th className="text-left p-2">CVSS</th>
                  <th className="text-left p-2">Severity</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFindings.map((finding) => (
                  <tr
                    key={`${finding.id}-${finding.host}`}
                    className="border-t border-gray-700 hover:bg-gray-800"
                    onClick={() => setSelected(finding)}
                  >
                    <td className="p-2">{finding.host}</td>
                    <td className="p-2">{finding.name}</td>
                    <td className="p-2">{finding.cvss}</td>
                    <td className="p-2">{finding.severity}</td>
                    <td className="p-2" onClick={(evt) => evt.stopPropagation()}>
                      {falsePositives.some((fp) => fp.findingId === finding.id) ? (
                        <span className="text-xs text-green-400">Marked</span>
                      ) : feedbackId === finding.id ? (
                        <form onSubmit={submitFeedback} className="space-y-1">
                          <label className="sr-only" htmlFor={`fp-${finding.id}`}>
                            False positive reason
                          </label>
                          <input
                            id={`fp-${finding.id}`}
                            className="w-full p-1 rounded text-black"
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Reason"
                          />
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="bg-green-600 px-2 py-1 rounded text-xs"
                            >
                              Submit
                            </button>
                            <button
                              type="button"
                              className="bg-gray-600 px-2 py-1 rounded text-xs"
                              onClick={() => setFeedbackId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="text-xs bg-yellow-600 px-2 py-1 rounded"
                          onClick={() => setFeedbackId(finding.id)}
                        >
                          False Positive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredFindings.length === 0 && (
            <p className="mt-2 text-sm text-gray-400">
              No findings in this severity bucket.
            </p>
          )}
        </div>
      ) : (
        <p className="mb-6 text-sm text-gray-400">
          No findings loaded yet. Choose a fixture or upload a report to get
          started.
        </p>
      )}

      <HostBubbleChart hosts={hostData} />
      <PluginFeedViewer />
      <ScanComparison />
      <PluginScoreHeatmap findings={findings} />

      <form onSubmit={addJob} className="mb-4 flex flex-wrap gap-2">
        <input
          className="p-1 rounded text-black"
          placeholder="Scan ID"
          value={newJob.scanId}
          onChange={(e) => setNewJob({ ...newJob, scanId: e.target.value })}
        />
        <input
          className="p-1 rounded text-black"
          placeholder="Schedule"
          value={newJob.schedule}
          onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })}
        />
        <button type="submit" className="bg-blue-600 px-2 py-1 rounded">
          Add Job
        </button>
      </form>
      {jobs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg mb-1">Scheduled Jobs</h3>
          <ul className="space-y-1 text-sm">
            {jobs.map((job, idx) => (
              <li key={`${job.scanId}-${idx}`}>
                Scan {job.scanId} – {job.schedule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected && (
        <div className="fixed top-0 right-0 w-80 h-full bg-gray-800 p-4 overflow-auto shadow-lg">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mb-2 bg-red-600 px-2 py-1 rounded text-sm"
          >
            Close
          </button>
          <h3 className="text-xl mb-2">{selected.name}</h3>
          <p className="text-sm mb-2">
            <span className="font-bold">Host:</span> {selected.host}
          </p>
          <p className="text-sm mb-2">
            <span className="font-bold">CVSS:</span> {selected.cvss} ({' '}
            {selected.severity})
          </p>
          <p className="text-sm mb-2">
            <span className="font-bold">Plugin family:</span>{' '}
            {selected.pluginFamily}
          </p>
          <p className="mb-2 text-sm whitespace-pre-wrap">
            {selected.description || 'No description provided.'}
          </p>
          <p className="text-sm text-green-300">
            {selected.solution || 'No solution provided.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Nessus;

export const displayNessus = () => {
  return <Nessus />;
};
