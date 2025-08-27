import React, { useEffect, useMemo, useState } from 'react';
import HostBubbleChart from './HostBubbleChart';
import sampleReport from './sample-report.json';

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
  const [scans] = useState(sampleReport);
  const [jobs, setJobs] = useState([]);
  const [newJob, setNewJob] = useState({ scanId: '', schedule: '' });
  const [feedbackScan, setFeedbackScan] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [falsePositives, setFalsePositives] = useState([]);

  const hostData = useMemo(
    () =>
      scans.map((scan, i) => ({
        id: scan.id ?? i,
        host: scan.host ?? scan.name ?? `Host ${i + 1}`,
        cvss: scan.cvss ?? ((i % 10) + 1),
        severity: scan.severity,
      })),
    [scans]
  );

  useEffect(() => {
    setJobs(loadJobDefinitions());
    setFalsePositives(loadFalsePositives());
  }, []);

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

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <h2 className="text-xl mb-4">Scans</h2>
      <HostBubbleChart hosts={hostData} />
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
                {scan.name} ({scan.severity})
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
      {falsePositives.length > 0 && (
        <p className="mt-4 text-sm">
          Recorded false positives: {falsePositives.length}
        </p>
      )}
    </div>
  );
};

export default Nessus;

export const displayNessus = () => {
  return <Nessus />;
};

