import React, { useEffect, useMemo, useRef, useState } from 'react';
import HostBubbleChart from './HostBubbleChart';
import PluginFeedViewer from './PluginFeedViewer';
import ScanComparison from './ScanComparison';
import PluginScoreHeatmap from './PluginScoreHeatmap';
import FormError from '../../ui/FormError';
import StatusBadge from '../../common/StatusBadge';

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

const Nessus = () => {
  const [url, setUrl] = useState('https://localhost:8834');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [scans, setScans] = useState([]);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [newJob, setNewJob] = useState({ scanId: '', schedule: '' });
  const [feedbackId, setFeedbackId] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [falsePositives, setFalsePositives] = useState([]);
  const [findings, setFindings] = useState([]);
  const [parseError, setParseError] = useState('');
  const [selected, setSelected] = useState(null);
  const parserWorkerRef = useRef(null);

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
    recordFalsePositive(feedbackId, feedbackText);
    setFalsePositives(loadFalsePositives());
    setFeedbackId(null);
    setFeedbackText('');
  };

  const logout = () => {
    setToken('');
    setScans([]);
  };

  if (!token) {
    return (
      <div className="h-full w-full bg-gray-900 text-white flex items-center justify-center">
        <form onSubmit={login} className="space-y-2 p-4 w-64">
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
          />
          <button type="submit" className="w-full bg-blue-600 py-2 rounded">
            Login
          </button>
          {error && <FormError id="nessus-error">{error}</FormError>}
        </form>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Scans</h2>
        <button onClick={logout} className="bg-red-600 px-2 py-1 rounded">
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
        />
        {parseError && <FormError>{parseError}</FormError>}
        {findings.length > 0 && (
          <div className="mt-2">
            <button
              onClick={exportCSV}
              className="bg-green-600 px-2 py-1 rounded mb-2"
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
                  {findings.map((f, i) => (
                    <tr
                      key={i}
                      className="border-t border-gray-700 cursor-pointer"
                      onClick={() => setSelected(f)}
                    >
                      <td className="p-1">{f.host}</td>
                      <td className="p-1">{f.name}</td>
                      <td className="p-1">{f.cvss}</td>
                      <td className="p-1">{f.severity}</td>
                      <td className="p-1">
                        {falsePositives.some((fp) => fp.findingId === f.id) ? (
                          <span className="text-xs text-green-400">Marked</span>
                        ) : feedbackId === f.id ? (
                          <form onSubmit={submitFeedback} className="space-y-1">
                            <input
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
                            className="text-xs bg-yellow-600 px-2 py-1 rounded"
                            onClick={() => setFeedbackId(f.id)}
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
            <div className="flex justify-between items-center gap-2">
              <span className="flex items-center gap-2">
                {scan.name}
                <StatusBadge status={scan.status} />
              </span>
              <button
                className="text-xs bg-yellow-600 px-2 py-1 rounded"
                onClick={() => setFeedbackId(scan.id)}
              >
                False Positive
              </button>
            </div>
            {feedbackId === scan.id && (
              <form onSubmit={submitFeedback} className="mt-2 space-y-1">
                <input
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
            )}
          </li>
        ))}
      </ul>
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
            <span className="font-bold">CVSS:</span> {selected.cvss} ({selected.severity})
          </p>
          <p className="mb-2 text-sm whitespace-pre-wrap">{selected.description}</p>
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

