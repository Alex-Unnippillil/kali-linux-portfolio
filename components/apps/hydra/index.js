import React, { useEffect, useRef, useState, useMemo } from 'react';
import Stepper from './Stepper';
import AttemptTimeline from './Timeline';

const SUMMARY_STATUSES = ['success', 'failure', 'throttled', 'lockout'];
const STOPPED_STATUS = 'stopped';
const FILTER_STATUSES = [...SUMMARY_STATUSES, STOPPED_STATUS];

const STATUS_LABELS = {
  success: 'Success',
  failure: 'Failure',
  throttled: 'Throttled',
  lockout: 'Lockout',
  stopped: 'Stopped',
};

const normalizeStatus = (status) => {
  if (!status) return 'failure';
  if (FILTER_STATUSES.includes(status)) return status;
  if (status === 'attempt') return 'failure';
  return 'failure';
};

const formatTimelineEntry = (entry, fallbackHost = '') => {
  const status = normalizeStatus(entry.status || entry.result);
  const attemptValue =
    typeof entry.attempt === 'number'
      ? entry.attempt
      : entry.attempt
      ? Number(entry.attempt) || 0
      : 0;
  const timeValue =
    typeof entry.time === 'number'
      ? entry.time
      : entry.time
      ? Number(entry.time) || 0
      : 0;

  return {
    attempt: attemptValue,
    time: timeValue,
    user: entry.user || '',
    password: entry.password || '',
    host: entry.host || fallbackHost || 'N/A',
    status,
    result: status,
    timestamp: entry.timestamp || new Date().toISOString(),
    note: entry.note,
  };
};

const normalizeTimelineEntries = (entries = [], fallbackHost = '') => {
  const now = Date.now();
  return entries.map((entry, index) =>
    formatTimelineEntry(
      {
        ...entry,
        attempt:
          typeof entry.attempt === 'number'
            ? entry.attempt
            : entry.attempt
            ? Number(entry.attempt) || 0
            : index + 1,
        timestamp:
          entry.timestamp ||
          new Date(now - (entries.length - index) * 1000).toISOString(),
      },
      fallbackHost
    )
  );
};

const baseServices = ['ssh', 'ftp', 'http-get', 'http-post-form', 'smtp'];
const pluginServices = [];

export const registerHydraProtocol = (protocol) => {
  if (!pluginServices.includes(protocol)) {
    pluginServices.push(protocol);
    window.dispatchEvent(new Event('hydra-protocols-changed'));
  }
};

const loadWordlists = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const saveWordlists = (key, lists) => {
  localStorage.setItem(key, JSON.stringify(lists));
};

const loadSession = () => {
  try {
    return JSON.parse(localStorage.getItem('hydra/session') || 'null');
  } catch {
    return null;
  }
};

const saveSession = (session) => {
  localStorage.setItem('hydra/session', JSON.stringify(session));
};

const clearSession = () => {
  localStorage.removeItem('hydra/session');
};

const loadConfig = () => {
  try {
    return JSON.parse(localStorage.getItem('hydra/config') || 'null');
  } catch {
    return null;
  }
};

const saveConfigStorage = (config) => {
  localStorage.setItem('hydra/config', JSON.stringify(config));
};

const HydraApp = () => {
  const [target, setTarget] = useState('');
  const [service, setService] = useState('ssh');
  const [availableServices, setAvailableServices] = useState([
    ...baseServices,
    ...pluginServices,
  ]);

  const [userLists, setUserLists] = useState([]);
  const [passLists, setPassLists] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPass, setSelectedPass] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const [announce, setAnnounce] = useState('');
  const announceRef = useRef(0);
  const [timeline, setTimeline] = useState([]);
  const [statusFilters, setStatusFilters] = useState(() => [...FILTER_STATUSES]);
  const [initialAttempt, setInitialAttempt] = useState(0);
  const startRef = useRef(null);
  const [charset, setCharset] = useState('abc123');
  const [rule, setRule] = useState('1:3');
  const [candidateStats, setCandidateStats] = useState([]);
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [showSaved, setShowSaved] = useState(false);

  const LOCKOUT_THRESHOLD = 10;
  const BACKOFF_THRESHOLD = 5;

  const isTargetValid = useMemo(() => {
    const trimmed = target.trim();
    if (!trimmed) return false;
    const [host, port] = trimmed.split(':');
    if (port && !/^\d+$/.test(port)) return false;
    const ipv4 = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    const hostname = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
    return ipv4.test(host) || hostname.test(host);
  }, [target]);

  useEffect(() => {
    setUserLists(loadWordlists('hydraUserLists'));
    setPassLists(loadWordlists('hydraPassLists'));
    const cfg = loadConfig();
    if (cfg) {
      setTarget(cfg.target || '');
      setService(cfg.service || 'ssh');
      setSelectedUser(cfg.selectedUser || '');
      setSelectedPass(cfg.selectedPass || '');
    }
  }, []);

  useEffect(() => {
    saveWordlists('hydraUserLists', userLists);
  }, [userLists]);

  useEffect(() => {
    saveWordlists('hydraPassLists', passLists);
  }, [passLists]);

  const resumeAttack = async (session) => {
    const user = userLists.find((l) => l.name === session.selectedUser);
    const pass = passLists.find((l) => l.name === session.selectedPass);
    if (!user || !pass) return;

    setRunning(true);
    setPaused(false);
    setRunId((id) => id + 1);
    setAnnounce('Hydra resumed');
    announceRef.current = Date.now();
    try {
      if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
        const res = await fetch('/api/hydra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: session.target,
            service: session.service,
            userList: user.content,
            passList: pass.content,
            resume: true,
          }),
        });
        const data = await res.json();
        setOutput(data.output || data.error || 'No output');
        setAnnounce('Hydra finished');
      } else {
        setOutput('Hydra demo output: feature disabled in static export');
        setAnnounce('Hydra finished (demo)');
      }
    } catch (err) {
      setOutput(err.message);
      setAnnounce('Hydra failed');
    } finally {
      setRunning(false);
      clearSession();
    }
  };

  useEffect(() => {
    const session = loadSession();
    if (session && userLists.length && passLists.length) {
      setTarget(session.target || '');
      setService(session.service || 'ssh');
      setSelectedUser(session.selectedUser || '');
      setSelectedPass(session.selectedPass || '');
      const normalized = normalizeTimelineEntries(
        session.timeline || [],
        session.target || ''
      );
      setTimeline(normalized);
      setInitialAttempt(session.attempt || 0);
      const lastTime = normalized.slice(-1)[0]?.time || 0;
      startRef.current = Date.now() - lastTime * 1000;
      resumeAttack(session);
    }
    // resumeAttack is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLists, passLists]);

  useEffect(() => {
    if (userLists.length && !selectedUser) {
      setSelectedUser(userLists[0].name);
    }
  }, [userLists, selectedUser]);

  useEffect(() => {
    if (passLists.length && !selectedPass) {
      setSelectedPass(passLists[0].name);
    }
  }, [passLists, selectedPass]);

  useEffect(() => {
    const update = () =>
      setAvailableServices([...baseServices, ...pluginServices]);
    window.addEventListener('hydra-protocols-changed', update);
    return () =>
      window.removeEventListener('hydra-protocols-changed', update);
  }, []);

  const addWordList = (file, listsSetter, lists) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const newLists = [...lists, { name: file.name, content: e.target.result }];
      listsSetter(newLists);
    };
    reader.readAsText(file);
  };

  const removeWordList = (name, listsSetter, lists) => {
    listsSetter(lists.filter((l) => l.name !== name));
  };

  const selectedUserList = userLists.find((l) => l.name === selectedUser);
  const selectedPassList = passLists.find((l) => l.name === selectedPass);
  const totalAttempts =
    (selectedUserList?.content.split('\n').filter(Boolean).length || 0) *
    (selectedPassList?.content.split('\n').filter(Boolean).length || 0);

  useEffect(() => {
    const limit = Math.min(LOCKOUT_THRESHOLD, totalAttempts);
    const completed = initialAttempt + timeline.length;
    setProgress(limit ? Math.min((completed / limit) * 100, 100) : 0);
  }, [totalAttempts, timeline, initialAttempt]);

  useEffect(() => {
    const [minStr, maxStr] = rule.split(':');
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    if (!charset || isNaN(min) || isNaN(max) || min > max) {
      setCandidateStats([]);
      return;
    }
    const len = charset.length;
    const stats = [];
    for (let l = min; l <= max; l++) {
      stats.push({ length: l, count: Math.pow(len, l) });
    }
    setCandidateStats(stats);
  }, [charset, rule]);

  const candidateSpace = candidateStats.reduce(
    (acc, s) => acc + s.count,
    0
  );

  const statusCounts = useMemo(() => {
    const counts = SUMMARY_STATUSES.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {});
    timeline.forEach((entry) => {
      const status = normalizeStatus(entry.status || entry.result);
      if (typeof counts[status] === 'number') {
        counts[status] += 1;
      }
    });
    return counts;
  }, [timeline]);

  const filteredTimeline = useMemo(
    () =>
      timeline.filter((entry) =>
        statusFilters.includes(normalizeStatus(entry.status || entry.result))
      ),
    [timeline, statusFilters]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!candidateStats.length) return;
    const max = Math.max(...candidateStats.map((s) => s.count));
    const barWidth = canvas.width / candidateStats.length;
    candidateStats.forEach((s, idx) => {
      const barHeight = (s.count / max) * canvas.height;
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(
        idx * barWidth,
        canvas.height - barHeight,
        barWidth - 2,
        barHeight
      );
      ctx.fillStyle = '#fff';
      ctx.fillText(
        String(s.length),
        idx * barWidth + barWidth / 2 - 4,
        canvas.height - 4
      );
    });
  }, [candidateStats]);

  const toggleStatusFilter = (status) => {
    setStatusFilters((current) => {
      if (current.includes(status)) {
        return current.filter((s) => s !== status);
      }
      return [...current, status];
    });
  };

  const exportCSV = () => {
    if (typeof window === 'undefined' || timeline.length === 0) return;
    const allStatusesSelected =
      statusFilters.length === FILTER_STATUSES.length &&
      FILTER_STATUSES.every((status) => statusFilters.includes(status));
    const data = allStatusesSelected ? timeline : filteredTimeline;
    const header = ['Host', 'User', 'Password', 'Result', 'Timestamp'];
    const escapeValue = (value) => {
      const stringValue = String(value ?? '').replace(/"/g, '""');
      return `"${stringValue}"`;
    };
    const rows = data.map((entry) => {
      const statusKey = normalizeStatus(entry.status || entry.result);
      const statusLabel =
        STATUS_LABELS[statusKey] || entry.status || '';
      const statusWithNote = entry.note
        ? `${statusLabel} — ${entry.note}`
        : statusLabel;
      return [
        escapeValue(entry.host || target || 'N/A'),
        escapeValue(entry.user || ''),
        escapeValue(entry.password || ''),
        escapeValue(statusWithNote),
        escapeValue(entry.timestamp || ''),
      ].join(',');
    });
    const csvContent = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hydra_attempts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAttempt = (attempt) => {
    const now = Date.now();
    if (attempt > 0 && startRef.current) {
      const elapsed = Number(((now - startRef.current) / 1000).toFixed(1));
      const users =
        selectedUserList?.content.split('\n').filter(Boolean) || [];
      const passes =
        selectedPassList?.content.split('\n').filter(Boolean) || [];
      const passCount = passes.length || 1;
      const user = users[Math.floor((attempt - 1) / passCount)] || '';
      const password = passes[(attempt - 1) % passCount] || '';
      const status =
        attempt >= LOCKOUT_THRESHOLD
          ? 'lockout'
          : totalAttempts > 0 && attempt >= totalAttempts
          ? 'success'
          : attempt >= BACKOFF_THRESHOLD
          ? 'throttled'
          : 'failure';
      setTimeline((t) => {
        const newTimeline = [
          ...t,
          formatTimelineEntry(
            {
              attempt,
              time: elapsed,
              user,
              password,
              status,
              host: target,
              timestamp: new Date(now).toISOString(),
            },
            target
          ),
        ];
        saveSession({
          target,
          service,
          selectedUser,
          selectedPass,
          attempt,
          timeline: newTimeline,
        });
        return newTimeline;
      });
      const limit = Math.min(
        LOCKOUT_THRESHOLD,
        totalAttempts || LOCKOUT_THRESHOLD
      );
      let message = `Attempt ${attempt} of ${limit}`;
      if (status === 'success') {
        message = `Success with ${user}/${password}`;
      } else if (status === 'lockout') {
        message = `Lockout triggered after ${attempt} attempts`;
      } else if (status === 'throttled') {
        message = `Throttled after attempt ${attempt}`;
      }
      if (status !== 'failure' || now - announceRef.current > 1000) {
        setAnnounce(message);
        announceRef.current = now;
      }
    }
  };

  const runHydra = async () => {
    const user = selectedUserList;
    const pass = selectedPassList;
    if (!isTargetValid || !user || !pass) {
      setOutput('Please provide a valid target, user list and password list');
      return;
    }

    setRunning(true);
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
    setStatusFilters([...FILTER_STATUSES]);
    setTimeline([]);
    startRef.current = Date.now();
    setInitialAttempt(0);
    saveSession({
      target,
      service,
      selectedUser,
      selectedPass,
      attempt: 0,
      timeline: [],
    });
    setAnnounce('Hydra started');
    announceRef.current = Date.now();
    try {
      if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
        const res = await fetch('/api/hydra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target,
            service,
            userList: user.content,
            passList: pass.content,
          }),
        });
        const data = await res.json();
        setOutput(data.output || data.error || 'No output');
        setAnnounce('Hydra finished');
      } else {
        setOutput('Hydra demo output: feature disabled in static export');
        setAnnounce('Hydra finished (demo)');
      }
    } catch (err) {
      setOutput(err.message);
      setAnnounce('Hydra failed');
    } finally {
      setRunning(false);
      clearSession();
    }
  };

  const dryRunHydra = () => {
    const user = selectedUserList;
    const pass = selectedPassList;
    const userCount = user?.content.split('\n').filter(Boolean).length || 0;
    const passCount = pass?.content.split('\n').filter(Boolean).length || 0;
    const report = [
      `Target: ${target || 'N/A'}`,
      `Service: ${service}`,
      `Users: ${userCount}`,
      `Passwords: ${passCount}`,
      `Charset: ${charset} (${charset.length})`,
      `Rule: ${rule}`,
      `Estimated candidate space: ${candidateSpace.toLocaleString()}`,
      'Dry run only - no network requests made.',
    ].join('\n');
    setOutput(report);
    setAnnounce('Dry run complete');
  };

  const handleSaveConfig = () => {
    saveConfigStorage({ target, service, selectedUser, selectedPass });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1500);
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({ target, service, selectedUser, selectedPass }, null, 2)
      );
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const pauseHydra = async () => {
    setPaused(true);
    setAnnounce('Hydra paused');
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });
    }
  };

  const resumeHydra = async () => {
    setPaused(false);
    setAnnounce('Hydra resumed');
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      });
    }
  };

  const stopHydra = async () => {
    if (!running && !paused) {
      return;
    }
    const now = Date.now();
    const elapsedSeconds = startRef.current
      ? Number(((now - startRef.current) / 1000).toFixed(1))
      : 0;
    const lastAttempt = [...timeline]
      .reverse()
      .find((entry) => typeof entry.attempt === 'number' && entry.attempt > 0)
      ?.attempt;
    const stopEntry = formatTimelineEntry(
      {
        attempt: lastAttempt ?? 0,
        time: elapsedSeconds,
        user: '',
        password: '',
        status: STOPPED_STATUS,
        host: target,
        timestamp: new Date(now).toISOString(),
        note: 'Run stopped by user',
      },
      target
    );
    setTimeline((current) => [...current, stopEntry]);
    setRunning(false);
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
    setAnnounce('Hydra stopped by user');
    announceRef.current = now;
    startRef.current = null;
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
    }
    clearSession();
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="col-span-2 flex gap-1.5">
          {[
            { label: 'SSH', value: 'ssh', icon: '/themes/Yaru/apps/ssh.svg' },
            { label: 'FTP', value: 'ftp', icon: '/themes/Yaru/apps/ftp.svg' },
          ].map((m) => (
            <div
              key={m.value}
              onClick={() => setService(m.value)}
              className={`flex items-center p-2 rounded border cursor-pointer text-sm ${
                service === m.value ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <img src={m.icon} alt={m.label} className="w-6 h-6 mr-2" />
              <span>{m.label}</span>
            </div>
          ))}
        </div>
        <div>
          <label className="block mb-1" htmlFor="hydra-target">
            Target
          </label>
          <input
            id="hydra-target"
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="192.168.0.1"
            aria-label="Target host or IP address"
          />
        </div>
        <div>
          <label className="block mb-1" htmlFor="hydra-service">
            Service
          </label>
          <select
            id="hydra-service"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full p-2 rounded text-black"
            aria-label="Protocol or service to target"
          >
            {availableServices.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1" htmlFor="hydra-user-list">
            User List
          </label>
          <select
            id="hydra-user-list"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full p-2 rounded text-black mb-1"
            aria-label="Select user wordlist"
          >
            {userLists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            data-testid="user-file-input"
            id="hydra-user-upload"
            type="file"
            accept="text/plain"
            onChange={(e) =>
              addWordList(e.target.files[0], setUserLists, userLists)
            }
            className="w-full p-2 rounded text-black mb-1"
            aria-label="Upload user wordlist"
          />
          <ul>
            {userLists.map((l) => (
              <li key={l.name} className="flex justify-between">
                {l.name}
                <button
                  onClick={() => removeWordList(l.name, setUserLists, userLists)}
                  className="text-red-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className="block mb-1" htmlFor="hydra-pass-list">
            Password List
          </label>
          <select
            id="hydra-pass-list"
            value={selectedPass}
            onChange={(e) => setSelectedPass(e.target.value)}
            className="w-full p-2 rounded text-black mb-1"
            aria-label="Select password wordlist"
          >
            {passLists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            data-testid="pass-file-input"
            id="hydra-pass-upload"
            type="file"
            accept="text/plain"
            onChange={(e) =>
              addWordList(e.target.files[0], setPassLists, passLists)
            }
            className="w-full p-2 rounded text-black mb-1"
            aria-label="Upload password wordlist"
          />
          <ul>
            {passLists.map((l) => (
              <li key={l.name} className="flex justify-between">
                {l.name}
                <button
                  onClick={() => removeWordList(l.name, setPassLists, passLists)}
                  className="text-red-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className="block mb-1" htmlFor="hydra-charset">
            Charset
          </label>
          <input
            id="hydra-charset"
            type="text"
            value={charset}
            onChange={(e) => setCharset(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="abc123"
            aria-label="Candidate character set"
          />
        </div>
        <div className="col-span-2">
          <label className="block mb-1" htmlFor="hydra-rule">
            Rule (min:max length)
          </label>
          <input
            id="hydra-rule"
            type="text"
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="1:3"
            aria-label="Candidate length range"
          />
          <p className="mt-1 text-sm">
            Candidate space: {candidateSpace.toLocaleString()}
          </p>
          <canvas
            ref={canvasRef}
            width="300"
            height="100"
            className="bg-gray-800 mt-2 w-full"
            aria-label="Candidate space visualization"
          ></canvas>
        </div>
        <div className="col-span-2 flex flex-wrap gap-1.5 mt-2">
          <button
            onClick={runHydra}
            disabled={running || !isTargetValid}
            className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
          >
            {running ? 'Running...' : 'Run Hydra'}
          </button>
          <button
            onClick={dryRunHydra}
            disabled={running}
            className="px-4 py-2 bg-purple-600 rounded disabled:opacity-50"
          >
            Dry Run
          </button>
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-gray-700 rounded"
          >
            Save Config
          </button>
          <button
            onClick={handleCopyConfig}
            className="px-4 py-2 bg-gray-700 rounded"
          >
            Copy Config
          </button>
          {running && !paused && (
            <button
              data-testid="pause-button"
              onClick={pauseHydra}
              className="px-4 py-2 bg-yellow-600 rounded"
            >
              Pause
            </button>
          )}
          {running && paused && (
            <button
              data-testid="resume-button"
              onClick={resumeHydra}
              className="px-4 py-2 bg-blue-600 rounded"
            >
              Resume
            </button>
          )}
          {running && (
            <button
              data-testid="stop-button"
              onClick={stopHydra}
              className="px-4 py-2 bg-red-600 rounded font-semibold shadow-md"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      <Stepper
        active={running && !paused}
        totalAttempts={totalAttempts}
        backoffThreshold={BACKOFF_THRESHOLD}
        lockoutThreshold={LOCKOUT_THRESHOLD}
        runId={runId}
        initialAttempt={initialAttempt}
        onAttemptChange={handleAttempt}
      />
      <div className="mt-4 flex items-center gap-2">
        <img
          src="/themes/Yaru/status/changes-prevent-symbolic.svg"
          alt="credentials"
          className="w-5 h-5"
        />
        <div className="flex-1 bg-gray-700 h-2 rounded">
          <div
            className="bg-green-500 h-2 rounded"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      <p className="mt-2 text-sm text-yellow-300">
        This demo slows after {BACKOFF_THRESHOLD} tries to mimic password spray
        throttling and stops at {LOCKOUT_THRESHOLD} attempts to illustrate
        account lockout.
      </p>
      <AttemptTimeline attempts={timeline} />
      {timeline.length > 0 && (
        <div className="mt-4 rounded border border-gray-800 bg-gray-900/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Results Summary</h3>
            <button
              onClick={exportCSV}
              disabled={timeline.length === 0}
              className="px-3 py-1.5 rounded border border-gray-600 bg-gray-800 text-sm disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
          <table
            className="mt-2 w-full text-sm"
            aria-label="Attempt summary"
          >
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Count</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_STATUSES.map((status) => (
                <tr key={status} className="border-t border-gray-800/60">
                  <td className="px-2 py-1">{STATUS_LABELS[status]}</td>
                  <td className="px-2 py-1">{statusCounts[status] || 0}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-800/60 font-semibold">
                <td className="px-2 py-1">Total logged attempts</td>
                <td className="px-2 py-1">
                  {SUMMARY_STATUSES.reduce(
                    (sum, status) => sum + (statusCounts[status] || 0),
                    0
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3">
            <span className="text-xs uppercase tracking-wide text-gray-400">
              Filter attempt log
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {FILTER_STATUSES.map((status) => {
                const inputId = `hydra-status-${status}`;
                const checked = statusFilters.includes(status);
                return (
                  <label
                    key={status}
                    htmlFor={inputId}
                    className={`flex items-center gap-1 rounded border px-2 py-1 text-sm ${
                      checked
                        ? 'border-blue-400 bg-blue-600/40'
                        : 'border-gray-700 bg-gray-900'
                    }`}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStatusFilter(status)}
                      className="accent-blue-400"
                      aria-label={`Toggle ${STATUS_LABELS[status]} attempts`}
                    />
                    <span>{STATUS_LABELS[status]}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {filteredTimeline.length > 0 ? (
            <table
              className="mt-3 w-full text-xs md:text-sm"
              aria-label="Attempt log"
            >
              <thead>
                <tr className="text-left text-gray-300">
                  <th className="px-2 py-1">Attempt</th>
                  <th className="px-2 py-1">Host</th>
                  <th className="px-2 py-1">User</th>
                  <th className="px-2 py-1">Password</th>
                  <th className="px-2 py-1">Result</th>
                  <th className="px-2 py-1">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimeline.map((entry, idx) => {
                  const status = normalizeStatus(entry.status || entry.result);
                  const statusLabel = STATUS_LABELS[status] || status || '';
                  return (
                    <tr
                      key={`${entry.timestamp || idx}-${status}-${idx}`}
                      className="border-t border-gray-800/60"
                    >
                      <td className="px-2 py-1">{entry.attempt ?? idx + 1}</td>
                      <td className="px-2 py-1">{entry.host || target || 'N/A'}</td>
                      <td className="px-2 py-1">{entry.user || '—'}</td>
                      <td className="px-2 py-1">{entry.password || '—'}</td>
                      <td className="px-2 py-1">
                        {statusLabel}
                        {entry.note ? ` — ${entry.note}` : ''}
                      </td>
                      <td className="px-2 py-1 whitespace-pre-wrap break-words">
                        {entry.timestamp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-sm text-gray-400">
              No attempts match the selected filters.
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-sm text-gray-300">
        Common password lists succeed because many users choose simple,
        predictable passwords or reuse credentials across sites. These habits
        allow attackers to guess passwords without exploring the full candidate
        space.
      </p>

      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>

      {output && (
        <pre className="mt-4 bg-black p-2 overflow-auto h-64 whitespace-pre-wrap font-mono">{output}</pre>
      )}
      {showSaved && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-3 py-1 rounded text-sm">
          Saved
        </div>
      )}
    </div>
  );
};

export default HydraApp;

export const displayHydra = () => {
  return <HydraApp />;
};

