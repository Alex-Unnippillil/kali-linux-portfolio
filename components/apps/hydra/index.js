import React, { useEffect, useRef, useState } from 'react';
import Stepper from './Stepper';
import { CSRF_TOKEN, CSRF_HEADER } from '../../../utils/csrf';

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
  const controllerRef = useRef(null);
  const timeoutRef = useRef(null);

  const LOCKOUT_THRESHOLD = 10;

  useEffect(() => {
    setUserLists(loadWordlists('hydraUserLists'));
    setPassLists(loadWordlists('hydraPassLists'));
  }, []);

  useEffect(() => {
    saveWordlists('hydraUserLists', userLists);
  }, [userLists]);

  useEffect(() => {
    saveWordlists('hydraPassLists', passLists);
  }, [passLists]);

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

  useEffect(() => () => {
    controllerRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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

  const handleAttempt = (attempt) => {
    const now = Date.now();
    if (now - announceRef.current > 1000) {
      const limit = Math.min(LOCKOUT_THRESHOLD, totalAttempts);
      setAnnounce(`Attempt ${attempt} of ${limit}`);
      announceRef.current = now;
    }
  };

  const runHydra = async () => {
    const user = selectedUserList;
    const pass = selectedPassList;
    if (!/^([a-zA-Z0-9.-]{1,255})$/.test(target.trim())) {
      setOutput('Invalid target');
      return;
    }
    if (!availableServices.includes(service) || !user || !pass) {
      setOutput('Please provide valid target, service and lists');
      return;
    }
    if (user.content.length > 10000 || pass.content.length > 10000) {
      setOutput('Wordlists too large');
      return;
    }

    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    timeoutRef.current = setTimeout(() => controllerRef.current?.abort(), 60000);
    const { signal } = controllerRef.current;

    setRunning(true);
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
    setAnnounce('Hydra started');
    announceRef.current = Date.now();
    try {
      const res = await fetch('/api/hydra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER]: CSRF_TOKEN,
        },
        body: JSON.stringify({
          target,
          service,
          userList: user.content,
          passList: pass.content,
        }),
        signal,
      });
      const data = await res.json();
      setOutput(data.output || data.error || 'No output');
      setAnnounce('Hydra finished');
    } catch (err) {
      if (err.name === 'AbortError') {
        setOutput('Request cancelled');
      } else {
        setOutput(err.message);
      }
      setAnnounce('Hydra failed');
    } finally {
      setRunning(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  const pauseHydra = async () => {
    setPaused(true);
    setAnnounce('Hydra paused');
    await fetch('/api/hydra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [CSRF_HEADER]: CSRF_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });
  };

  const resumeHydra = async () => {
    setPaused(false);
    setAnnounce('Hydra resumed');
    await fetch('/api/hydra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [CSRF_HEADER]: CSRF_TOKEN },
      body: JSON.stringify({ action: 'resume' }),
    });
  };

  const cancelHydra = async () => {
    setRunning(false);
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
    controllerRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await fetch('/api/hydra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [CSRF_HEADER]: CSRF_TOKEN },
      body: JSON.stringify({ action: 'cancel' }),
    });
    setAnnounce('Hydra cancelled');
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="space-y-2">
        <div>
          <label htmlFor="hydra-target" className="block mb-1">Target</label>
          <input
            id="hydra-target"
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="192.168.0.1"
          />
        </div>
        <div>
          <label htmlFor="hydra-service" className="block mb-1">Service</label>
          <select
            id="hydra-service"
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
          <label htmlFor="hydra-userlist" className="block mb-1">User List</label>
          <select
            id="hydra-userlist"
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
            aria-label="Upload user list"
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
          <label htmlFor="hydra-passlist" className="block mb-1">Password List</label>
          <select
            id="hydra-passlist"
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
            aria-label="Upload password list"
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
        <button
          onClick={runHydra}
          disabled={running}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run Hydra'}
        </button>
        {running && (
          <progress className="w-full h-1" aria-label="Hydra progress" />
        )}
        {running && !paused && (
          <button
            data-testid="pause-button"
            onClick={pauseHydra}
            className="ml-2 px-4 py-2 bg-yellow-600 rounded"
          >
            Pause
          </button>
        )}
        {running && paused && (
          <button
            data-testid="resume-button"
            onClick={resumeHydra}
            className="ml-2 px-4 py-2 bg-blue-600 rounded"
          >
            Resume
          </button>
        )}
        {running && (
          <button
            data-testid="cancel-button"
            onClick={cancelHydra}
            className="ml-2 px-4 py-2 bg-red-600 rounded"
          >
            Cancel
          </button>
        )}
      </div>

      <Stepper
        active={running && !paused}
        totalAttempts={totalAttempts}
        backoffThreshold={5}
        lockoutThreshold={LOCKOUT_THRESHOLD}
        runId={runId}
        onAttemptChange={handleAttempt}
      />

      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>

      {output && (
        <pre className="mt-4 bg-black p-2 overflow-auto h-64 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
};

export default HydraApp;

export const displayHydra = () => {
  return <HydraApp />;
};

