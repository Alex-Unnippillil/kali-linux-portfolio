import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import Stepper from './Stepper';
import AttemptTimeline from './Timeline';
import { userFixtures, passwordFixtures, LAB_NOTICE } from './fixtures';

const baseServices = ['ssh', 'ftp', 'http-get', 'http-post-form', 'smtp'];
const pluginServices = [];

const ensureFixtureLists = (lists, fixtures) => {
  const fixtureMap = new Map(fixtures.map((fixture) => [fixture.name, fixture]));
  let changed = false;

  const normalized = lists.map((list) => {
    const fixture = fixtureMap.get(list.name);
    if (fixture) {
      const next = { ...fixture, readOnly: true };
      if (
        list.content !== next.content ||
        list.description !== next.description ||
        list.readOnly !== true
      ) {
        changed = true;
      }
      return next;
    }
    return list;
  });

  fixtureMap.forEach((fixture, name) => {
    if (!normalized.some((list) => list.name === name)) {
      changed = true;
      normalized.push({ ...fixture, readOnly: true });
    }
  });

  return changed ? normalized : lists;
};

const countEntries = (content = '') =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;

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
  const [labMode, setLabMode] = usePersistentState('hydra:labMode', false);

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
    const storedUsers = ensureFixtureLists(
      loadWordlists('hydraUserLists'),
      userFixtures
    );
    const storedPasses = ensureFixtureLists(
      loadWordlists('hydraPassLists'),
      passwordFixtures
    );
    setUserLists(storedUsers);
    setPassLists(storedPasses);
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

  const resumeAttack = useCallback(
    async (session) => {
      const user = userLists.find((l) => l.name === session.selectedUser);
      const pass = passLists.find((l) => l.name === session.selectedPass);
      if (!user || !pass) return;

      if (!labMode) {
        setAnnounce('Enable lab mode to resume Hydra.');
        return;
      }

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
              action: 'resume',
              target: session.target,
              service: session.service,
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
    },
    [labMode, passLists, userLists]
  );

  useEffect(() => {
    const session = loadSession();
    if (session && userLists.length && passLists.length) {
      setTarget(session.target || '');
      setService(session.service || 'ssh');
      setSelectedUser(session.selectedUser || '');
      setSelectedPass(session.selectedPass || '');
      setTimeline(session.timeline || []);
      setInitialAttempt(session.attempt || 0);
      const lastTime = session.timeline?.slice(-1)[0]?.time || 0;
      startRef.current = Date.now() - lastTime * 1000;
      if (labMode) {
        resumeAttack(session);
      } else {
        setAnnounce('Enable lab mode to resume the saved Hydra session.');
      }
    }
  }, [userLists, passLists, labMode, resumeAttack]);

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
      const text = e.target.result || '';
      const baseName = file.name;
      const existing = lists.find((l) => l.name === baseName);

      if (existing && existing.readOnly) {
        let suffix = 1;
        let candidate = `${baseName} (${suffix})`;
        while (lists.some((l) => l.name === candidate)) {
          suffix += 1;
          candidate = `${baseName} (${suffix})`;
        }
        listsSetter([
          ...lists,
          {
            name: candidate,
            label: candidate,
            content: text,
            readOnly: false,
          },
        ]);
        return;
      }

      if (existing) {
        listsSetter(
          lists.map((l) =>
            l.name === baseName
              ? { ...l, content: text, label: l.label || baseName, readOnly: false }
              : l
          )
        );
        return;
      }

      listsSetter([
        ...lists,
        {
          name: baseName,
          label: baseName,
          content: text,
          readOnly: false,
        },
      ]);
    };
    reader.readAsText(file);
  };

  const removeWordList = (name, listsSetter, lists) => {
    const targetList = lists.find((l) => l.name === name);
    if (!targetList || targetList.readOnly) {
      return;
    }
    listsSetter(lists.filter((l) => l.name !== name));
  };

  const selectedUserList = userLists.find((l) => l.name === selectedUser);
  const selectedPassList = passLists.find((l) => l.name === selectedPass);
  const totalAttempts =
    (selectedUserList?.content.split('\n').filter(Boolean).length || 0) *
    (selectedPassList?.content.split('\n').filter(Boolean).length || 0);

  const commandPreview = useMemo(() => {
    const userFlag = selectedUserList
      ? `-L ${selectedUserList.name}`
      : '-L <users.txt>';
    const passFlag = selectedPassList
      ? `-P ${selectedPassList.name}`
      : '-P <passwords.txt>';
    const targetPart = target.trim() || '<target>';
    const servicePrefix = service.includes('://')
      ? service
      : `${service}://`;
    return `hydra ${userFlag} ${passFlag} ${servicePrefix}${targetPart}`;
  }, [selectedUserList, selectedPassList, service, target]);

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

  const handleAttempt = (attempt) => {
    const now = Date.now();
    if (attempt > 0 && startRef.current) {
      const elapsed = ((now - startRef.current) / 1000).toFixed(1);
      const users =
        selectedUserList?.content.split('\n').filter(Boolean) || [];
      const passes =
        selectedPassList?.content.split('\n').filter(Boolean) || [];
      const passCount = passes.length || 1;
      const user = users[Math.floor((attempt - 1) / passCount)] || '';
      const password = passes[(attempt - 1) % passCount] || '';
      const result =
        attempt >= LOCKOUT_THRESHOLD
          ? 'lockout'
          : attempt >= BACKOFF_THRESHOLD
          ? 'throttled'
          : 'attempt';
      setTimeline((t) => {
        const newTimeline = [
          ...t,
          { time: parseFloat(elapsed), user, password, result },
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
    }
    if (now - announceRef.current > 1000) {
      const limit = Math.min(LOCKOUT_THRESHOLD, totalAttempts);
      setAnnounce(`Attempt ${attempt} of ${limit}`);
      announceRef.current = now;
    }
  };

  const runHydra = async () => {
    const user = selectedUserList;
    const pass = selectedPassList;
    if (!isTargetValid || !user || !pass) {
      setOutput('Please provide a valid target, user list and password list');
      return;
    }

    if (!labMode) {
      setOutput(
        'Enable lab mode to send the simulated Hydra command to the API stub.'
      );
      setAnnounce('Lab mode required');
      return;
    }

    setRunning(true);
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
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
    if (!user || !pass) {
      setOutput('Select a user list and password list to build a command.');
      setAnnounce('Lists required for dry run');
      return;
    }
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
      `Command preview: ${commandPreview}`,
      labMode
        ? 'Lab mode enabled – API stub is available for safe simulations.'
        : 'Lab mode disabled – this stays offline as a rehearsal.',
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
    if (!labMode) {
      setAnnounce('Lab mode disabled – nothing to pause.');
      return;
    }
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
    if (!labMode) {
      setAnnounce('Enable lab mode to resume the simulation.');
      return;
    }
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

  const cancelHydra = async () => {
    setRunning(false);
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
    setTimeline([]);
    startRef.current = null;
    if (labMode && process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
    }
    setAnnounce('Hydra cancelled');
    clearSession();
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={labMode}
            onChange={(e) => setLabMode(e.target.checked)}
            aria-label="Enable lab mode"
          />
          Lab mode
        </label>
        <span className="text-xs text-gray-300">
          {labMode ? 'Simulated API calls enabled.' : 'Commands stay offline.'}
        </span>
      </div>
      {!labMode && (
        <div
          role="alert"
          data-testid="hydra-lab-banner"
          className="mb-4 rounded border border-yellow-500 bg-yellow-900/40 p-3 text-sm text-yellow-200"
        >
          {LAB_NOTICE}
        </div>
      )}
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
          <label className="block mb-1">Target</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="192.168.0.1"
          />
        </div>
        <div>
          <label className="block mb-1">Service</label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full p-2 rounded text-black"
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
          >
            {userLists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.label || l.name}
              </option>
            ))}
          </select>
          <p className="mb-1 text-xs text-gray-400">
            Prefilled lab fixtures are read-only. Upload files to add your own
            lists alongside them.
          </p>
          <input
            data-testid="user-file-input"
            type="file"
            accept="text/plain"
            onChange={(e) =>
              addWordList(e.target.files[0], setUserLists, userLists)
            }
            className="w-full p-2 rounded text-black mb-2"
          />
          <ul className="space-y-1">
            {userLists.map((l) => (
              <li
                key={l.name}
                data-testid={`user-list-${l.name}`}
                className="flex items-start justify-between gap-2 rounded bg-gray-800/60 p-2 text-xs"
              >
                <div>
                  <div className="font-semibold">{l.label || l.name}</div>
                  {l.description && (
                    <div className="text-gray-400">{l.description}</div>
                  )}
                  <div className="text-gray-500">
                    {countEntries(l.content)} entries ·{' '}
                    {l.readOnly ? 'lab fixture' : 'upload'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeWordList(l.name, setUserLists, userLists)}
                  className={`text-red-400 hover:text-red-200 ${
                    l.readOnly ? 'cursor-not-allowed opacity-40' : ''
                  }`}
                  disabled={l.readOnly}
                  aria-label={`Remove ${l.name}`}
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
          >
            {passLists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.label || l.name}
              </option>
            ))}
          </select>
          <p className="mb-1 text-xs text-gray-400">
            Password fixtures demonstrate common spray sets and seasonal
            rotations for tabletop analysis.
          </p>
          <input
            data-testid="pass-file-input"
            type="file"
            accept="text/plain"
            onChange={(e) =>
              addWordList(e.target.files[0], setPassLists, passLists)
            }
            className="w-full p-2 rounded text-black mb-2"
          />
          <ul className="space-y-1">
            {passLists.map((l) => (
              <li
                key={l.name}
                data-testid={`pass-list-${l.name}`}
                className="flex items-start justify-between gap-2 rounded bg-gray-800/60 p-2 text-xs"
              >
                <div>
                  <div className="font-semibold">{l.label || l.name}</div>
                  {l.description && (
                    <div className="text-gray-400">{l.description}</div>
                  )}
                  <div className="text-gray-500">
                    {countEntries(l.content)} entries ·{' '}
                    {l.readOnly ? 'lab fixture' : 'upload'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeWordList(l.name, setPassLists, passLists)}
                  className={`text-red-400 hover:text-red-200 ${
                    l.readOnly ? 'cursor-not-allowed opacity-40' : ''
                  }`}
                  disabled={l.readOnly}
                  aria-label={`Remove ${l.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className="block mb-1">Charset</label>
          <input
            type="text"
            value={charset}
            onChange={(e) => setCharset(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="abc123"
          />
        </div>
        <div className="col-span-2">
          <label className="block mb-1">Rule (min:max length)</label>
          <input
            type="text"
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="1:3"
          />
          <p className="mt-1 text-sm">
            Candidate space: {candidateSpace.toLocaleString()}
          </p>
          <canvas
            ref={canvasRef}
            width="300"
            height="100"
            className="bg-gray-800 mt-2 w-full"
          ></canvas>
        </div>
        <div className="col-span-2 flex flex-wrap gap-1.5 mt-2">
          <button
            onClick={runHydra}
            disabled={
              running ||
              !isTargetValid ||
              !selectedUserList ||
              !selectedPassList ||
              !labMode
            }
            className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
            title={
              !labMode
                ? 'Enable lab mode to run the simulated Hydra command.'
                : undefined
            }
          >
            {running ? 'Running...' : 'Run Hydra'}
          </button>
          <button
            onClick={dryRunHydra}
            disabled={running || !selectedUserList || !selectedPassList}
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
              data-testid="cancel-button"
              onClick={cancelHydra}
              className="px-4 py-2 bg-red-600 rounded"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="col-span-2">
          <h3 className="text-sm font-semibold">Command preview</h3>
          <pre
            data-testid="hydra-command-preview"
            className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-black/60 p-2 text-xs font-mono"
          >
            {commandPreview}
          </pre>
          <p className="mt-1 text-xs text-gray-400">
            {labMode
              ? 'Lab mode enabled – running Hydra calls the safe API stub.'
              : 'Lab mode disabled – explore the preview or enable lab mode to use the simulation.'}
          </p>
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
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-2">Host</th>
              <th className="px-2">User</th>
              <th className="px-2">Pass</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((t, idx) => (
              <tr key={idx} className="border-t border-gray-800">
                <td className="px-2">{target}</td>
                <td className="px-2">{t.user}</td>
                <td className="px-2">{t.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

