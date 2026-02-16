import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import HostBubbleChart from './HostBubbleChart';
import PluginFeedViewer from './PluginFeedViewer';
import ScanComparison from './ScanComparison';
import PluginScoreHeatmap from './PluginScoreHeatmap';
import FormError from '../../ui/FormError';

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
    const parsed = JSON.parse(localStorage.getItem('nessusFalsePositives') || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        findingKey:
          typeof item.findingKey === 'string' && item.findingKey.length > 0
            ? item.findingKey
            : undefined,
        findingId:
          typeof item.findingId === 'string' && item.findingId.length > 0
            ? item.findingId
            : undefined,
        reason: typeof item.reason === 'string' ? item.reason : '',
      }))
      .filter((item) => item.findingKey || item.findingId);
  } catch {
    return [];
  }
};

export const upsertFalsePositive = (findingKey, findingId, reason) => {
  if (typeof window === 'undefined') return [];
  const fps = loadFalsePositives();
  const index = fps.findIndex((fp) => fp.findingKey === findingKey);
  const value = { findingKey, findingId, reason };
  const updated = [...fps];
  if (index >= 0) {
    updated[index] = value;
  } else {
    updated.push(value);
  }
  localStorage.setItem('nessusFalsePositives', JSON.stringify(updated));
  return updated;
};

export const removeFalsePositive = (findingKey) => {
  if (typeof window === 'undefined') return [];
  const updated = loadFalsePositives().filter((fp) => fp.findingKey !== findingKey);
  localStorage.setItem('nessusFalsePositives', JSON.stringify(updated));
  return updated;
};

export const recordFalsePositive = (findingId, reason) =>
  upsertFalsePositive(findingId, findingId, reason);

const findingKeyFor = (finding) => `${finding.host}::${finding.id}`;

const Nessus = () => {
  const [url, setUrl] = useState('https://localhost:8834');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [scans, setScans] = useState([]);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [newJob, setNewJob] = useState({ scanId: '', schedule: '' });
  const [feedbackKey, setFeedbackKey] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [falsePositives, setFalsePositives] = useState([]);
  const [findings, setFindings] = useState([]);
  const [parseError, setParseError] = useState('');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('All');
  const [host, setHost] = useState('All');
  const [hideFalsePositives, setHideFalsePositives] = useState(false);
  const [sortBy, setSortBy] = useState('cvss');
  const parserWorkerRef = useRef(null);
  const deferredQuery = useDeferredValue(query);

  const hostData = useMemo(
    () =>
      scans.map((scan, i) => ({
        id: scan.id ?? i,
        host: scan.name ?? `Host ${i + 1}`,
        cvss: scan.cvss ?? ((i % 10) + 1),
        severity:
          scan.severity || ['Low', 'Medium', 'High', 'Critical'][i % 4],
      })),
    [scans]
  );

  useEffect(() => {
    setJobs(loadJobDefinitions());
    setFalsePositives(loadFalsePositives());
    parserWorkerRef.current = new Worker(
      new URL('../../../workers/nessus-parser.ts', import.meta.url)
    );
    parserWorkerRef.current.onmessage = (e) => {
      const { findings: parsed = [], error: err } = e.data || {};
      if (err) {
        setParseError(err);
        setFindings([]);
      } else {
        setFindings(parsed);
        setParseError('');
      }
    };
    return () => parserWorkerRef.current?.terminate();
  }, []);

  const falsePositivesByKey = useMemo(
    () => new Map(falsePositives.map((fp) => [fp.findingKey ?? fp.findingId, fp])),
    [falsePositives]
  );

  const falsePositivesByFindingId = useMemo(
    () => new Map(falsePositives.map((fp) => [fp.findingId, fp]).filter(([id]) => id)),
    [falsePositives]
  );

  const getFalsePositive = (finding) => {
    const findingKey = findingKeyFor(finding);
    return falsePositivesByKey.get(findingKey) || falsePositivesByFindingId.get(finding.id);
  };

  const hostOptions = useMemo(
    () => ['All', ...Array.from(new Set(findings.map((finding) => finding.host))).sort()],
    [findings]
  );

  const filteredFindings = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return findings
      .filter((finding) => {
        if (!normalizedQuery) return true;
        return [finding.host, finding.name, finding.id]
          .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
      })
      .filter((finding) => severity === 'All' || finding.severity === severity)
      .filter((finding) => host === 'All' || finding.host === host)
      .filter((finding) => {
        if (!hideFalsePositives) return true;
        const findingKey = findingKeyFor(finding);
        return !(falsePositivesByKey.get(findingKey) || falsePositivesByFindingId.get(finding.id));
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'host') return a.host.localeCompare(b.host);
        return Number(b.cvss || 0) - Number(a.cvss || 0);
      });
  }, [deferredQuery, findings, severity, host, hideFalsePositives, sortBy, falsePositivesByFindingId, falsePositivesByKey]);

  const filteredSeverityCounts = useMemo(
    () =>
      filteredFindings.reduce(
        (acc, finding) => {
          const level = finding.severity || 'Unknown';
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        },
        { Critical: 0, High: 0, Medium: 0, Low: 0, Unknown: 0 }
      ),
    [filteredFindings]
  );

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      parserWorkerRef.current.postMessage(text);
    } catch (err) {
      setParseError('Failed to read file');
    }
  };

  const exportCSV = () => {
    const header = ['Host', 'ID', 'Finding', 'CVSS', 'Severity', 'FalsePositiveReason'];
    const rows = filteredFindings.map((f) => [
      f.host,
      f.id,
      f.name,
      f.cvss,
      f.severity,
      getFalsePositive(f)?.reason || '',
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

  const login = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${url}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error('Authentication failed');
      const data = await res.json();
      setToken(data.token);
      fetchScans(data.token, url);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchScans = async (tkn = token, baseUrl = url) => {
    try {
      const res = await fetch(`${baseUrl}/scans`, {
        headers: {
          'X-Cookie': `token=${tkn}`,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (!res.ok) throw new Error('Unable to fetch scans');
      const data = await res.json();
      setScans(data.scans || []);
    } catch (err) {
      setError(err.message);
    }
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
    if (!feedbackKey) return;
    const [findingHost = '', findingId = ''] = feedbackKey.split('::');
    const updated = upsertFalsePositive(feedbackKey, findingId, feedbackText);
    setFalsePositives(updated);
    if (selected?.host === findingHost && selected?.id === findingId) {
      setSelected({ ...selected });
    }
    setFeedbackKey(null);
    setFeedbackText('');
  };

  const handleUnmark = (findingKey) => {
    const updated = removeFalsePositive(findingKey);
    setFalsePositives(updated);
    if (feedbackKey === findingKey) {
      setFeedbackKey(null);
      setFeedbackText('');
    }
  };

  const logout = () => {
    setToken('');
    setScans([]);
  };

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-kali-surface/95 text-kali-text">
        <form onSubmit={login} className="w-64 space-y-2 p-4">
          <label htmlFor="nessus-url" className="block text-sm">
            Nessus URL
          </label>
          <input
            id="nessus-url"
            className="w-full p-2 rounded text-black"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'nessus-error' : undefined}
            placeholder="https://nessus:8834"
            aria-label="Nessus URL"
          />
          <label htmlFor="nessus-username" className="block text-sm">
            Username
          </label>
          <input
            id="nessus-username"
            className="w-full p-2 rounded text-black"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'nessus-error' : undefined}
            aria-label="Username"
          />
          <label htmlFor="nessus-password" className="block text-sm">
            Password
          </label>
          <input
            id="nessus-password"
            type="password"
            className="w-full p-2 rounded text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'nessus-error' : undefined}
            aria-label="Password"
          />
          <button
            type="submit"
            className="w-full rounded bg-kali-primary py-2 text-kali-inverse transition hover:bg-kali-primary/90"
          >
            Login
          </button>
          {error && <FormError id="nessus-error">{error}</FormError>}
        </form>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-kali-surface/95 p-4 text-kali-text">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Scans</h2>
        <button
          onClick={logout}
          className="rounded bg-kali-error px-2 py-1 text-sm font-medium text-white transition hover:bg-kali-error/90"
        >
          Logout
        </button>
      </div>
      <div className="mb-4">
        <label htmlFor="nessus-upload" className="block text-sm mb-1">
          Upload Nessus XML
        </label>
        <input
          id="nessus-upload"
          type="file"
          accept=".nessus,.xml"
          onChange={handleFile}
          className="text-black mb-2"
          aria-label="Upload Nessus XML"
        />
        {parseError && <FormError>{parseError}</FormError>}
        {findings.length > 0 && (
          <div className="mt-2">
            <div className="mb-3 rounded border border-gray-700 bg-kali-surface p-2">
              <div className="mb-2 grid gap-2 md:grid-cols-5">
                <input
                  className="rounded border border-gray-700 bg-kali-surface-muted p-2 text-sm text-kali-text"
                  placeholder="Search host, plugin name, plugin ID"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search findings"
                />
                <select
                  className="rounded border border-gray-700 bg-kali-surface-muted p-2 text-sm text-kali-text"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  aria-label="Filter by severity"
                >
                  {['All', 'Critical', 'High', 'Medium', 'Low', 'Unknown'].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded border border-gray-700 bg-kali-surface-muted p-2 text-sm text-kali-text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  aria-label="Filter by host"
                >
                  {hostOptions.map((hostName) => (
                    <option key={hostName} value={hostName}>
                      {hostName}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 rounded border border-gray-700 bg-kali-surface-muted p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hideFalsePositives}
                    onChange={(e) => setHideFalsePositives(e.target.checked)}
                    aria-label="Hide false positives"
                  />
                  Hide false positives
                </label>
                <select
                  className="rounded border border-gray-700 bg-kali-surface-muted p-2 text-sm text-kali-text"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort findings"
                >
                  <option value="cvss">CVSS (desc)</option>
                  <option value="name">Name</option>
                  <option value="host">Host</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs" aria-live="polite">
                <span>Showing {filteredFindings.length} of {findings.length} findings</span>
                {['Critical', 'High', 'Medium', 'Low', 'Unknown'].map((level) => (
                  <span key={level} className="rounded bg-kali-surface-muted px-2 py-1">
                    {level}: {filteredSeverityCounts[level] || 0}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={exportCSV}
              className="mb-2 rounded bg-kali-success px-2 py-1 text-sm font-medium text-kali-inverse transition hover:bg-kali-success/90"
            >
              Export CSV
            </button>
            <div className="overflow-auto max-h-64 border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-1">Host</th>
                    <th className="text-left p-1">Vulnerability</th>
                    <th className="text-left p-1">CVSS</th>
                    <th className="text-left p-1">Severity</th>
                    <th className="text-left p-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.map((f) => {
                    const findingKey = findingKeyFor(f);
                    const falsePositive = getFalsePositive(f);
                    const isEditing = feedbackKey === findingKey;
                    return (
                      <tr
                      key={findingKey}
                      className="border-t border-gray-700 cursor-pointer"
                      onClick={() => setSelected(f)}
                    >
                      <td className="p-1">{f.host}</td>
                      <td className="p-1">{f.name}</td>
                      <td className="p-1">{f.cvss}</td>
                      <td className="p-1">{f.severity}</td>
                      <td className="p-1">
                        {falsePositive ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-kali-success">Marked</span>
                            <button
                              type="button"
                              className="rounded bg-kali-error px-2 py-1 text-xs font-medium text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnmark(findingKey);
                              }}
                            >
                              Unmark
                            </button>
                          </div>
                        ) : isEditing ? (
                          <form
                            onSubmit={submitFeedback}
                            className="space-y-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              className="w-full p-1 rounded text-black"
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              placeholder="Reason"
                              aria-label="False positive reason"
                            />
                            <div className="flex space-x-2">
                              <button
                                type="submit"
                                className="rounded bg-kali-success px-2 py-1 text-xs font-medium text-kali-inverse transition hover:bg-kali-success/90"
                              >
                                Submit
                              </button>
                              <button
                                type="button"
                                className="rounded bg-kali-surface-muted px-2 py-1 text-xs text-kali-text/80 transition hover:bg-kali-surface"
                                onClick={() => {
                                  setFeedbackKey(null);
                                  setFeedbackText('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            className="text-xs font-medium text-kali-inverse transition hover:brightness-105 rounded bg-kali-severity-medium px-2 py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFeedbackKey(findingKey);
                              setFeedbackText('');
                            }}
                          >
                            False Positive
                          </button>
                        )}
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <HostBubbleChart hosts={hostData} />
      <PluginFeedViewer />
      <ScanComparison />
      <PluginScoreHeatmap findings={findings} />
      {error && <FormError className="mb-2">{error}</FormError>}
      <form onSubmit={addJob} className="mb-4 space-x-2">
          <input
            className="p-1 rounded text-black"
            placeholder="Scan ID"
            value={newJob.scanId}
            onChange={(e) => setNewJob({ ...newJob, scanId: e.target.value })}
            aria-label="Scan ID"
          />
          <input
            className="p-1 rounded text-black"
            placeholder="Schedule"
            value={newJob.schedule}
            onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })}
            aria-label="Scan schedule"
          />
        <button
          type="submit"
          className="rounded bg-kali-primary px-2 py-1 text-sm font-medium text-kali-inverse transition hover:bg-kali-primary/90"
        >
          Add Job
        </button>
      </form>
      {jobs.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg mb-1">Scheduled Jobs</h3>
          <ul className="space-y-1">
            {jobs.map((job, idx) => (
              <li key={idx} className="text-sm">
                Scan {job.scanId} - {job.schedule}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="space-y-1">
        {scans.map((scan) => (
          <li key={scan.id} className="border-b border-gray-700 pb-1">
            <div className="flex justify-between items-center">
              <span>
                {scan.name} - {scan.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-kali-overlay/80 backdrop-blur-sm">
          <aside className="h-full w-80 overflow-auto border border-white/10 bg-kali-surface-raised/95 p-4 text-kali-text shadow-kali-panel">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mb-2 rounded bg-kali-error px-2 py-1 text-sm font-medium text-white transition hover:bg-kali-error/90"
            >
              Close
            </button>
            <h3 className="mb-2 text-xl">{selected.name}</h3>
            <p className="mb-2 text-sm">
              <span className="font-bold">Host:</span> {selected.host}
            </p>
            <p className="mb-2 text-sm">
              <span className="font-bold">CVSS:</span> {selected.cvss} ({selected.severity})
            </p>
            <p className="mb-2 whitespace-pre-wrap text-sm">{selected.description}</p>
            {getFalsePositive(selected) && (
              <div className="mb-2 rounded border border-kali-success/40 bg-kali-success/10 p-2 text-sm">
                <p className="font-medium text-kali-success">Marked false positive</p>
                <p className="mt-1 text-kali-text/90">
                  Reason: {getFalsePositive(selected)?.reason || 'No reason provided.'}
                </p>
                <button
                  type="button"
                  className="mt-2 rounded bg-kali-error px-2 py-1 text-xs font-medium text-white transition hover:bg-kali-error/90"
                  onClick={() => handleUnmark(findingKeyFor(selected))}
                >
                  Unmark
                </button>
              </div>
            )}
            <p className="text-sm text-kali-success">
              {selected.solution || 'No solution provided.'}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Nessus;

export const displayNessus = () => {
  return <Nessus />;
};
