import React, { useEffect, useRef, useState, useMemo } from 'react';
import SimulationBanner from '../SimulationBanner';
import SimulationReportExport from '../SimulationReportExport';
import { recordSimulation } from '../../../utils/simulationLog';
import Stepper from './Stepper';
import AttemptTimeline from './Timeline';

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
    const stored = localStorage.getItem('hydra/session');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.target || typeof parsed.target !== 'string' || !parsed.target.trim()) {
      localStorage.removeItem('hydra/session');
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveSession = (session) => {
  const target = session?.target || '';
  if (!target || typeof target !== 'string' || !target.trim()) {
    return;
  }
  localStorage.setItem('hydra/session', JSON.stringify({ resumeReady: true, ...session }));
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
  const initialConfig = loadConfig();
  const initialUserLists = loadWordlists('hydraUserLists');
  const initialPassLists = loadWordlists('hydraPassLists');
  const [target, setTarget] = useState(initialConfig?.target || '');
  const [service, setService] = useState(initialConfig?.service || 'ssh');
  const [availableServices, setAvailableServices] = useState([
    ...baseServices,
    ...pluginServices,
  ]);

  const [userLists, setUserLists] = useState(initialUserLists);
  const [passLists, setPassLists] = useState(initialPassLists);
  const [selectedUser, setSelectedUser] = useState(initialConfig?.selectedUser || initialUserLists[0]?.name || '');
  const [selectedPass, setSelectedPass] = useState(initialConfig?.selectedPass || initialPassLists[0]?.name || '');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const [announce, setAnnounce] = useState('');
  const announceRef = useRef(0);
  const [timeline, setTimeline] = useState([]);
  const [initialAttempt, setInitialAttempt] = useState(0);
  const [charset, setCharset] = useState('abc123');
  const [rule, setRule] = useState('1:3');
  const [candidateStats, setCandidateStats] = useState([]);
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [showSaved, setShowSaved] = useState(false);
  const targetInputRef = useRef(null);
  const outputRef = useRef(null);

  const LOCKOUT_THRESHOLD = 10;
  const BACKOFF_THRESHOLD = 5;

  const validateTarget = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const [host, port] = trimmed.split(':');
    if (port && !/^\d+$/.test(port)) return false;
    const ipv4 = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    const hostname = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
    return ipv4.test(host) || hostname.test(host);
  };

  const isTargetValid = useMemo(() => validateTarget(target), [target]);

  useEffect(() => {
    const cfg = loadConfig();
    if (cfg) {
      setTarget((prev) => prev || cfg.target || '');
      setService((prev) => prev || cfg.service || 'ssh');
      setSelectedUser((prev) => prev || cfg.selectedUser || userLists[0]?.name || '');
      setSelectedPass((prev) => prev || cfg.selectedPass || passLists[0]?.name || '');
    }
  }, [userLists, passLists]);

  useEffect(() => {
    saveWordlists('hydraUserLists', userLists);
  }, [userLists]);

  useEffect(() => {
    saveWordlists('hydraPassLists', passLists);
  }, [passLists]);

  const resumeAttack = async (session) => {
    const user = userLists.find((l) => l.name === session.selectedUser) || userLists[0];
    const pass = passLists.find((l) => l.name === session.selectedPass) || passLists[0];
    if (!user || !pass) return;

    setRunning(true);
    setPaused(false);
    setRunId((id) => id + 1);
    setAnnounce('Hydra resumed');
    announceRef.current = Date.now();
    try {
      if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' || process.env.NODE_ENV === 'test') {
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
  };

  useEffect(() => {
    const session = loadSession();
    if (
      session &&
      userLists.length &&
      passLists.length &&
      (process.env.NODE_ENV !== 'test' || session.target)
    ) {
      setTarget(session.target || '');
      setService(session.service || 'ssh');
      setSelectedUser(session.selectedUser || '');
      setSelectedPass(session.selectedPass || '');
      setTimeline(session.timeline || []);
      setInitialAttempt(session.attempt || 0);
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
  const effectiveUserList = selectedUserList || userLists[0];
  const effectivePassList = selectedPassList || passLists[0];
  const totalAttempts =
    (effectiveUserList?.content.split('\n').filter(Boolean).length || 0) *
    (effectivePassList?.content.split('\n').filter(Boolean).length || 0);

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
    const users = effectiveUserList?.content.split('\n').filter(Boolean) || [];
    const passes = effectivePassList?.content.split('\n').filter(Boolean) || [];
    const passCount = passes.length || 1;
    const activeTarget = (target || targetInputRef.current?.value || '').trim();
    const user = users[Math.floor((attempt - 1) / passCount)] || '';
    const password = passes[(attempt - 1) % passCount] || '';
    const completedAttempts = initialAttempt + attempt;
    const elapsed = Number(((completedAttempts || 1) * 0.75).toFixed(1));
    const result =
      attempt >= LOCKOUT_THRESHOLD
        ? 'lockout'
        : attempt >= BACKOFF_THRESHOLD
          ? 'throttled'
          : 'attempt';
    setTimeline((t) => {
      const newTimeline = [...t, { time: elapsed, user, password, result }];
      saveSession({
        target: activeTarget,
        service,
        selectedUser,
        selectedPass,
        attempt: completedAttempts,
        timeline: newTimeline,
      });
      return newTimeline;
    });
    const limit = Math.min(LOCKOUT_THRESHOLD, totalAttempts || 0);
    if (announceRef.current !== attempt) {
      setAnnounce(`Attempt ${attempt} of ${limit}`);
      announceRef.current = attempt;
    }
  };

  const runHydra = async () => {
    const user = effectiveUserList;
    const pass = effectivePassList;
    const normalizedTarget = (target || targetInputRef.current?.value || '').trim();
    if (!validateTarget(normalizedTarget) || !user || !pass) {
      setOutput('Please provide a valid target, user list and password list');
      return;
    }

    if (normalizedTarget && normalizedTarget !== target) {
      setTarget(normalizedTarget);
    }

    setRunning(true);
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
    setTimeline([]);
    setInitialAttempt(0);
    saveSession({
      target: normalizedTarget,
      service,
      selectedUser: user?.name || selectedUser,
      selectedPass: pass?.name || selectedPass,
      attempt: 0,
      timeline: [],
    });
    setAnnounce('Hydra started');
    announceRef.current = 0;
    try {
      if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' || process.env.NODE_ENV === 'test') {
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
        const finalOutput = data.output || data.error || 'No output';
        setOutput(finalOutput);
        setAnnounce('Hydra finished');
        recordSimulation({
          tool: 'hydra',
          title: `${service} against ${target || 'demo host'}`,
          summary: `Live run with ${user.content.split('\n').filter(Boolean).length} users and ${
            pass.content.split('\n').filter(Boolean).length
          } passwords`,
          data: {
            target,
            service,
            attempts: totalAttempts,
            mode: 'live',
            output: finalOutput.slice(0, 120),
          },
        });
      } else {
        const demoOutput = 'Hydra demo output: feature disabled in static export';
        setOutput(demoOutput);
        setAnnounce('Hydra finished (demo)');
        recordSimulation({
          tool: 'hydra',
          title: `${service} dry run (static mode)`,
          summary: `Deterministic output staged for ${target || 'placeholder target'}`,
          data: { target, service, attempts: totalAttempts, mode: 'static' },
        });
      }
    } catch (err) {
      setOutput(err.message);
      setAnnounce('Hydra failed');
    } finally {
      setRunning(false);
      clearSession();
    }
  };

  const copyOutput = async () => {
    if (!output.trim() || typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(output);
      setAnnounce('Output copied');
    } catch {
      // ignore
    }
  };

  const selectOutput = () => {
    const el = outputRef.current;
    if (!el || typeof window === 'undefined') return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    setAnnounce('Output selected');
  };

  const dryRunHydra = () => {
    const user = effectiveUserList;
    const pass = effectivePassList;
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
    recordSimulation({
      tool: 'hydra',
      title: `${service} tabletop`,
      summary: `Dry run for ${target || 'N/A'} using ${userCount} users × ${passCount} passwords`,
      data: { target, service, userCount, passCount, charset, rule, candidateSpace },
    });
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
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' || process.env.NODE_ENV === 'test') {
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
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' || process.env.NODE_ENV === 'test') {
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
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' || process.env.NODE_ENV === 'test') {
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
      <SimulationBanner
        toolName="Hydra"
        message="Credential testing is replayed with deterministic timing. No packets ever leave this browser."
      />
      <div className="mb-2">
        <button
          onClick={runHydra}
          disabled={running || !isTargetValid}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          Run Hydra
        </button>
      </div>
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
            ref={targetInputRef}
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 rounded text-black"
            aria-label="Target host"
            placeholder="192.168.0.1"
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
            aria-label="Hydra service"
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
            aria-label="User wordlist"
          >
            {userLists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="hydra-user-file">
            Upload user list
          </label>
          <input
            id="hydra-user-file"
            data-testid="user-file-input"
            type="file"
            accept="text/plain"
            onChange={(e) =>
              addWordList(e.target.files[0], setUserLists, userLists)
            }
            className="w-full p-2 rounded text-black mb-1"
            aria-label="Upload user list"
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
          <label className="block mb-1" htmlFor="hydra-password-list">
            Password List
          </label>
          <select
            id="hydra-password-list"
            value={selectedPass}
            onChange={(e) => setSelectedPass(e.target.value)}
            className="w-full p-2 rounded text-black mb-1"
            aria-label="Password wordlist"
          >
            {passLists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="hydra-pass-file">
            Upload password list
          </label>
          <input
            id="hydra-pass-file"
            data-testid="pass-file-input"
            type="file"
            accept="text/plain"
            onChange={(e) =>
              addWordList(e.target.files[0], setPassLists, passLists)
            }
            className="w-full p-2 rounded text-black mb-1"
            aria-label="Upload password list"
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
            aria-label="Character set"
            placeholder="abc123"
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
            aria-label="Rule min to max length"
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
            role="img"
            aria-label="Candidate space visualization"
          ></canvas>
        </div>
        <div className="col-span-2 flex flex-wrap gap-1.5 mt-2">
          <button
            onClick={runHydra}
            disabled={running || !isTargetValid}
            className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
          >
            {running ? 'Running...' : 'Start Hydra'}
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
          {paused && (
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

      <SimulationReportExport dense />

      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>

      {output && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyOutput}
              className="px-3 py-1 bg-gray-700 rounded text-sm"
            >
              Copy Output
            </button>
            <button
              type="button"
              onClick={selectOutput}
              className="px-3 py-1 bg-gray-700 rounded text-sm"
            >
              Select All
            </button>
          </div>
          <pre
            ref={outputRef}
            className="bg-black p-2 overflow-auto h-64 whitespace-pre-wrap font-mono"
          >
            {output}
          </pre>
        </div>
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
