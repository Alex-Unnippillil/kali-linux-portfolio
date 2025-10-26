import React, { useEffect, useRef, useState, useMemo } from 'react';
import Stepper from './Stepper';
import AttemptTimeline from './Timeline';
import {
  createHydraSimulation,
  DEFAULT_HYDRA_SEED,
  normalizeHydraSeed,
} from './simulation';

const baseServices = ['ssh', 'ftp', 'http-get', 'http-post-form', 'smtp'];
const pluginServices = [];

export const registerHydraProtocol = (protocol) => {
  if (typeof window === 'undefined') {
    return;
  }

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
  const [mode, setMode] = useState('idle');
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const [announce, setAnnounce] = useState('');
  const simulationRef = useRef(null);
  const modeRef = useRef('idle');
  const [timeline, setTimeline] = useState([]);
  const [initialAttempt, setInitialAttempt] = useState(0);
  const resumedRef = useRef(false);
  const [seed, setSeed] = useState(DEFAULT_HYDRA_SEED);
  const [charset, setCharset] = useState('abc123');
  const [rule, setRule] = useState('1:3');
  const [candidateStats, setCandidateStats] = useState([]);
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [showSaved, setShowSaved] = useState(false);

  const LOCKOUT_THRESHOLD = 10;
  const BACKOFF_THRESHOLD = 5;

  const updateMode = (nextMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
  };

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
      if (cfg.seed) {
        setSeed(normalizeHydraSeed(cfg.seed));
      }
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

    const resumeSeed = normalizeHydraSeed(session.seed || seed);
    const simulation = createHydraSimulation({
      seed: resumeSeed,
      userList: user.content,
      passList: pass.content,
      backoffThreshold: BACKOFF_THRESHOLD,
      lockoutThreshold: LOCKOUT_THRESHOLD,
    });
    simulationRef.current = simulation;

    const resumeAttempt = session.attempt || session.timeline?.length || 0;
    const existingTimeline = simulation.events.filter(
      (event) => event.attempt <= resumeAttempt
    );

    setTimeline(existingTimeline);
    setInitialAttempt(resumeAttempt);
    setSeed(resumeSeed);
    updateMode('run');
    setPaused(false);
    setRunId((id) => id + 1);
    setAnnounce('Hydra resumed');

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
      clearSession();
      setPaused(false);
      updateMode('idle');
    }
  };

  useEffect(() => {
    if (resumedRef.current) return;
    const session = loadSession();
    if (session && userLists.length && passLists.length) {
      resumedRef.current = true;
      setTarget(session.target || '');
      setService(session.service || 'ssh');
      setSelectedUser(session.selectedUser || '');
      setSelectedPass(session.selectedPass || '');
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
    const limit = Math.min(LOCKOUT_THRESHOLD, totalAttempts);
    if (attempt <= 0 || attempt > limit) return;

    const simulation = simulationRef.current;
    if (!simulation) return;

    const event = simulation.next(attempt);
    if (!event) return;

    setTimeline((prev) => {
      if (prev.some((existing) => existing.attempt === attempt)) {
        return prev;
      }
      const nextTimeline = [...prev, event];
      if (modeRef.current === 'run') {
        saveSession({
          target,
          service,
          selectedUser,
          selectedPass,
          seed: simulation.seed,
          attempt,
          timeline: nextTimeline,
        });
      }
      return nextTimeline;
    });

    setAnnounce(`Attempt ${attempt} of ${limit}`);

    if (modeRef.current !== 'run' && attempt >= limit) {
      setAnnounce(
        modeRef.current === 'replay'
          ? `Replay complete (seed ${simulation.seed})`
          : 'Hydra finished (demo)'
      );
      updateMode('idle');
      setPaused(false);
      clearSession();
    }
  };

  const runHydra = async ({ replay = false } = {}) => {
    const user = selectedUserList;
    const pass = selectedPassList;
    if (!isTargetValid || !user || !pass) {
      setOutput('Please provide a valid target, user list and password list');
      return;
    }

    const normalizedSeed = normalizeHydraSeed(seed);
    const simulation = createHydraSimulation({
      seed: normalizedSeed,
      userList: user.content,
      passList: pass.content,
      backoffThreshold: BACKOFF_THRESHOLD,
      lockoutThreshold: LOCKOUT_THRESHOLD,
    });

    if (simulation.totalAttempts === 0) {
      setTimeline([]);
      setInitialAttempt(0);
      setAnnounce('No attempts available with the selected lists');
      setOutput('No attempts available with the selected lists');
      updateMode('idle');
      return;
    }

    simulationRef.current = simulation;
    const scenarioMode = replay
      ? 'replay'
      : process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
      ? 'demo'
      : 'run';

    updateMode(scenarioMode);
    setPaused(false);
    setRunId((id) => id + 1);
    setTimeline([]);
    setInitialAttempt(0);

    if (scenarioMode === 'run') {
      saveSession({
        target,
        service,
        selectedUser,
        selectedPass,
        seed: simulation.seed,
        attempt: 0,
        timeline: [],
      });
      setOutput('');
      setAnnounce(`Hydra started (seed ${simulation.seed})`);
    } else if (scenarioMode === 'replay') {
      setOutput(`Replaying simulation with seed ${simulation.seed}`);
      setAnnounce(`Replaying scenario (seed ${simulation.seed})`);
      clearSession();
      return;
    } else {
      setOutput('Hydra demo output: feature disabled in static export');
      setAnnounce('Hydra demo started');
      clearSession();
      return;
    }

    try {
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
    } catch (err) {
      setOutput(err.message);
      setAnnounce('Hydra failed');
    } finally {
      clearSession();
      setPaused(false);
      updateMode('idle');
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
      `Seed: ${normalizeHydraSeed(seed)}`,
      `Charset: ${charset} (${charset.length})`,
      `Rule: ${rule}`,
      `Estimated candidate space: ${candidateSpace.toLocaleString()}`,
      'Dry run only - no network requests made.',
    ].join('\n');
    setOutput(report);
    setAnnounce('Dry run complete');
  };

  const handleSaveConfig = () => {
    saveConfigStorage({
      target,
      service,
      selectedUser,
      selectedPass,
      seed: normalizeHydraSeed(seed),
    });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1500);
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            target,
            service,
            selectedUser,
            selectedPass,
            seed: normalizeHydraSeed(seed),
          },
          null,
          2
        )
      );
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleImportConfig = () => {
    const input = window.prompt('Paste Hydra config JSON');
    if (!input) return;
    try {
      const data = JSON.parse(input);
      setTarget(data.target || '');
      setService(data.service || 'ssh');
      if (data.selectedUser) setSelectedUser(data.selectedUser);
      if (data.selectedPass) setSelectedPass(data.selectedPass);
      if (data.seed) setSeed(normalizeHydraSeed(data.seed));
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch (err) {
      setAnnounce('Failed to import config');
    }
  };

  const randomizeSeed = () => {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      setSeed(buffer[0].toString(36));
    } else {
      setSeed(Math.random().toString(36).slice(2, 10));
    }
  };

  const pauseHydra = async () => {
    if (modeRef.current !== 'run') return;
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
    if (modeRef.current !== 'run') return;
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
    const wasRunning = modeRef.current === 'run';
    updateMode('idle');
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
    setTimeline([]);
    simulationRef.current = null;
    if (wasRunning && process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
    }
    setAnnounce('Hydra cancelled');
    clearSession();
  };

  const isActive = mode !== 'idle';
  const isRealRun = mode === 'run';

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
        <div className="col-span-2">
          <label className="block mb-1">Simulation Seed</label>
          <div className="flex flex-wrap gap-1.5">
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-full p-2 rounded text-black md:flex-1 md:w-auto"
              placeholder={DEFAULT_HYDRA_SEED}
            />
            <button
              onClick={randomizeSeed}
              className="px-4 py-2 bg-gray-700 rounded"
            >
              Randomize
            </button>
            <button
              onClick={() => runHydra({ replay: true })}
              disabled={isActive || !isTargetValid}
              className="px-4 py-2 bg-blue-700 rounded disabled:opacity-50"
            >
              Replay Seed
            </button>
          </div>
        </div>
        <div>
          <label className="block mb-1">User List</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full p-2 rounded text-black mb-1"
          >
            {userLists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            data-testid="user-file-input"
            type="file"
            accept="text/plain"
            onChange={(e) =>
              addWordList(e.target.files[0], setUserLists, userLists)
            }
            className="w-full p-2 rounded text-black mb-1"
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
          <label className="block mb-1">Password List</label>
          <select
            value={selectedPass}
            onChange={(e) => setSelectedPass(e.target.value)}
            className="w-full p-2 rounded text-black mb-1"
          >
            {passLists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            data-testid="pass-file-input"
            type="file"
            accept="text/plain"
            onChange={(e) =>
              addWordList(e.target.files[0], setPassLists, passLists)
            }
            className="w-full p-2 rounded text-black mb-1"
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
            disabled={isActive || !isTargetValid}
            className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
          >
            {isActive ? 'Running...' : 'Run Hydra'}
          </button>
          <button
            onClick={dryRunHydra}
            disabled={isActive}
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
          <button
            onClick={handleImportConfig}
            className="px-4 py-2 bg-gray-700 rounded"
          >
            Import Config
          </button>
          {isRealRun && !paused && (
            <button
              data-testid="pause-button"
              onClick={pauseHydra}
              className="px-4 py-2 bg-yellow-600 rounded"
            >
              Pause
            </button>
          )}
          {isRealRun && paused && (
            <button
              data-testid="resume-button"
              onClick={resumeHydra}
              className="px-4 py-2 bg-blue-600 rounded"
            >
              Resume
            </button>
          )}
          {isRealRun && (
            <button
              data-testid="cancel-button"
              onClick={cancelHydra}
              className="px-4 py-2 bg-red-600 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <Stepper
        active={isActive && !paused}
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

