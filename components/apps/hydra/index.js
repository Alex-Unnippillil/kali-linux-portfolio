import React, { useEffect, useRef, useState, useMemo } from 'react';
import useFormFSM from '../../../hooks/useFormFSM';
import Stepper from './Stepper';
import AttemptTimeline from './Timeline';

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
  const form = useFormFSM();
  const running = form.status === 'Running';
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
  const runAbortRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [showSaved, setShowSaved] = useState(false);

  const LOCKOUT_THRESHOLD = 10;
  const BACKOFF_THRESHOLD = 5;

  const markDirty = () => {
    form.change();
  };

  const handleTargetChange = (value) => {
    markDirty();
    setTarget(value);
  };

  const handleServiceChange = (value) => {
    markDirty();
    setService(value);
  };

  const handleSelectedUserChange = (value) => {
    markDirty();
    setSelectedUser(value);
  };

  const handleSelectedPassChange = (value) => {
    markDirty();
    setSelectedPass(value);
  };

  const handleCharsetChange = (value) => {
    markDirty();
    setCharset(value);
  };

  const handleRuleChange = (value) => {
    markDirty();
    setRule(value);
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
    }
  }, []);

  useEffect(() => {
    saveWordlists('hydraUserLists', userLists);
  }, [userLists]);

  useEffect(() => {
    saveWordlists('hydraPassLists', passLists);
  }, [passLists]);

  const ensureHydraReady = (mode, overrides = {}) => {
    const userList = overrides.userList ?? selectedUserList;
    const passList = overrides.passList ?? selectedPassList;

    if (mode !== 'dry-run') {
      if (!isTargetValid) {
        const message = 'Please provide a valid target, user list and password list';
        form.invalidate(message);
        setOutput(message);
        setAnnounce('Hydra validation failed');
        return null;
      }
      if (!userList || !passList) {
        const message = 'Please provide a valid target, user list and password list';
        form.invalidate(message);
        setOutput(message);
        setAnnounce('Hydra validation failed');
        return null;
      }
    }

    form.validate();
    return { userList, passList };
  };

  const resumeAttack = (session) => {
    const user = userLists.find((l) => l.name === session.selectedUser);
    const pass = passLists.find((l) => l.name === session.selectedPass);
    if (!user || !pass) return;

    const lists = ensureHydraReady('resume', { userList: user, passList: pass });
    if (!lists) return;

    setPaused(false);
    setRunId((id) => id + 1);
    setAnnounce('Hydra resumed');
    announceRef.current = Date.now();
    setTimeline(session.timeline || []);
    setInitialAttempt(session.attempt || 0);
    const lastTime = session.timeline?.slice(-1)[0]?.time || 0;
    startRef.current = Date.now() - lastTime * 1000;

    form.submit({
      mode: 'resume',
      target: session.target,
      service: session.service,
      userList: lists.userList?.content,
      passList: lists.passList?.content,
      session,
    });
  };

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
      markDirty();
    };
    reader.readAsText(file);
  };

  const removeWordList = (name, listsSetter, lists) => {
    listsSetter(lists.filter((l) => l.name !== name));
    markDirty();
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

  const runHydra = () => {
    const lists = ensureHydraReady('run');
    if (!lists) return;

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
    form.submit({
      mode: 'run',
      target,
      service,
      userList: lists.userList?.content,
      passList: lists.passList?.content,
    });
  };

  const dryRunHydra = () => {
    form.validate();
    form.submit({
      mode: 'dry-run',
      target,
      service,
      userList: selectedUserList?.content || '',
      passList: selectedPassList?.content || '',
      charset,
      rule,
      candidateSpace,
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

  const cancelHydra = async () => {
    form.cancel();
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
    setTimeline([]);
    startRef.current = null;
    if (runAbortRef.current) {
      runAbortRef.current.abort();
      runAbortRef.current = null;
    }
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
    }
    setAnnounce('Hydra cancelled');
    clearSession();
  };

  form.useSubmitEffect((current) => {
    const submission = current.payload || {};
    const mode = submission.mode;

    if (!mode) {
      form.resolve();
      return undefined;
    }

    if (mode === 'dry-run') {
      const userCount = (submission.userList || '')
        .split('\n')
        .filter(Boolean).length;
      const passCount = (submission.passList || '')
        .split('\n')
        .filter(Boolean).length;
      const report = [
        `Target: ${submission.target || target || 'N/A'}`,
        `Service: ${submission.service || service}`,
        `Users: ${userCount}`,
        `Passwords: ${passCount}`,
        `Charset: ${submission.charset || charset} (${(submission.charset || charset).length})`,
        `Rule: ${submission.rule || rule}`,
        `Estimated candidate space: ${(
          submission.candidateSpace ?? candidateSpace
        ).toLocaleString()}`,
        'Dry run only - no network requests made.',
      ].join('\n');
      setOutput(report);
      setAnnounce('Dry run complete');
      form.resolve(report);
      return undefined;
    }

    if (mode !== 'run' && mode !== 'resume') {
      form.resolve();
      return undefined;
    }

    const controller = new AbortController();
    runAbortRef.current = controller;
    let cancelled = false;

    const execute = async () => {
      try {
        if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
          const res = await fetch('/api/hydra', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target: submission.target,
              service: submission.service,
              userList: submission.userList,
              passList: submission.passList,
              resume: mode === 'resume',
            }),
            signal: controller.signal,
          });
          const data = await res.json();
          if (cancelled) {
            return;
          }
          setOutput(data.output || data.error || 'No output');
          setAnnounce('Hydra finished');
          form.resolve(data);
        } else {
          if (cancelled) {
            return;
          }
          const message = 'Hydra demo output: feature disabled in static export';
          setOutput(message);
          setAnnounce('Hydra finished (demo)');
          form.resolve({ output: message });
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message = err?.message || 'Hydra failed';
        setOutput(message);
        setAnnounce('Hydra failed');
        form.reject(message);
      } finally {
        if (!cancelled) {
          runAbortRef.current = null;
          clearSession();
        }
      }
    };

    execute();

    return () => {
      cancelled = true;
      controller.abort();
    };
  });

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
              onClick={() => handleServiceChange(m.value)}
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
            onChange={(e) => handleTargetChange(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="192.168.0.1"
          />
        </div>
        <div>
          <label className="block mb-1">Service</label>
          <select
            value={service}
            onChange={(e) => handleServiceChange(e.target.value)}
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
          <label className="block mb-1">User List</label>
          <select
            value={selectedUser}
            onChange={(e) => handleSelectedUserChange(e.target.value)}
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
            onChange={(e) => handleSelectedPassChange(e.target.value)}
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
            onChange={(e) => handleCharsetChange(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="abc123"
          />
        </div>
        <div className="col-span-2">
          <label className="block mb-1">Rule (min:max length)</label>
          <input
            type="text"
            value={rule}
            onChange={(e) => handleRuleChange(e.target.value)}
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

