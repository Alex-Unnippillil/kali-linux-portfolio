import React, { useEffect, useMemo, useState } from 'react';
import HostBubbleChart from './HostBubbleChart';

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

export const recordFalsePositive = (scanId, reason) => {
  if (typeof window === 'undefined') return [];
  const fps = loadFalsePositives();
  const updated = [...fps, { scanId, reason }];
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
  const [feedbackScan, setFeedbackScan] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [falsePositives, setFalsePositives] = useState([]);

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
  }, []);

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
    recordFalsePositive(feedbackScan, feedbackText);
    setFalsePositives(loadFalsePositives());
    setFeedbackScan(null);
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
          {error && (
            <p
              id="nessus-error"
              role="alert"
              className="text-red-500 text-sm"
            >
              {error}
            </p>
          )}
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
      <HostBubbleChart hosts={hostData} />
      {error && <div className="text-red-500 mb-2">{error}</div>}
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
            <div className="flex justify-between items-center">
              <span>
                {scan.name} - {scan.status}
              </span>
              <button
                className="text-xs bg-yellow-600 px-2 py-1 rounded"
                onClick={() => setFeedbackScan(scan.id)}
              >
                False Positive
              </button>
            </div>
            {feedbackScan === scan.id && (
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
                    onClick={() => setFeedbackScan(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Nessus;

export const displayNessus = () => {
  return <Nessus />;
};

