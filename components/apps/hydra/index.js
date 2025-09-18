import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Stepper from './Stepper';
import AttemptTimeline from './Timeline';

const baseServices = ['ssh', 'ftp', 'http-get', 'http-post-form', 'smtp'];
const pluginServices = [];

const serviceConfigDefinitions = {
  ssh: {
    label: 'SSH',
    icon: '/themes/Yaru/apps/ssh.svg',
    defaults: { port: '22' },
    fields: [
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        placeholder: '22',
        description: 'Hydra will append this port when the target does not include one.',
      },
    ],
    guidance:
      'Ensure the SSH service is reachable on the configured port before launching a run.',
  },
  ftp: {
    label: 'FTP',
    icon: '/themes/Yaru/apps/ftp.svg',
    defaults: { port: '21', passive: true },
    fields: [
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        placeholder: '21',
        description: 'Use 21 for standard FTP or override for alternate ports.',
      },
      {
        key: 'passive',
        label: 'Passive mode',
        type: 'checkbox',
        description: 'Enable PASV mode to mimic NAT/firewall friendly data channels.',
      },
    ],
    guidance:
      'Most demos prefer passive mode so the client opens the data channel.',
  },
  'http-get': {
    label: 'HTTP GET',
    icon: '/themes/Yaru/apps/http.svg',
    defaults: { path: '/' },
    fields: [
      {
        key: 'path',
        label: 'Request path',
        type: 'text',
        placeholder: '/admin',
        description: 'Provide the relative path Hydra should request on every attempt.',
      },
    ],
    guidance:
      'Match the route that guards the login to preview the exact wordlist spray.',
  },
  'http-post-form': {
    label: 'HTTP Form',
    icon: '/themes/Yaru/apps/http.svg',
    defaults: {
      path: '/login',
      usernameField: 'username',
      passwordField: 'password',
    },
    fields: [
      {
        key: 'path',
        label: 'Form path',
        type: 'text',
        placeholder: '/login',
        description: 'Relative path to the HTML login form.',
      },
      {
        key: 'usernameField',
        label: 'Username field',
        type: 'text',
        placeholder: 'username',
        description: 'Name attribute used for usernames in the form payload.',
      },
      {
        key: 'passwordField',
        label: 'Password field',
        type: 'text',
        placeholder: 'password',
        description: 'Name attribute used for passwords in the form payload.',
      },
    ],
    guidance:
      'Hydra needs the exact field names from the HTML form to substitute credentials.',
  },
  smtp: {
    label: 'SMTP',
    icon: '/themes/Yaru/apps/hydra.svg',
    defaults: { port: '587', startTls: true },
    fields: [
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        placeholder: '587',
        description: 'Common ports include 25, 465 (SSL), and 587 (submission).',
      },
      {
        key: 'startTls',
        label: 'STARTTLS negotiation',
        type: 'checkbox',
        description: 'Toggle STARTTLS to mirror secure submission requirements.',
      },
    ],
    guidance:
      'Set the port and STARTTLS flag to match the target mail server policy.',
  },
};

const cloneServiceDefaults = () => {
  const defaults = {};
  Object.entries(serviceConfigDefinitions).forEach(([key, def]) => {
    defaults[key] = def?.defaults ? { ...def.defaults } : {};
  });
  return defaults;
};

const validatePort = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'Enter a port to continue.';
  }
  if (!/^\d+$/.test(String(value))) {
    return 'Port must be numeric.';
  }
  const num = Number(value);
  if (num < 1 || num > 65535) {
    return 'Choose a port between 1 and 65535.';
  }
  return '';
};

const validateServiceConfig = (service, config = {}) => {
  const errors = {};
  switch (service) {
    case 'ssh':
    case 'ftp':
    case 'smtp': {
      const message = validatePort(config.port);
      if (message) {
        errors.port = message;
      }
      break;
    }
    case 'http-get': {
      const path = (config.path || '').trim();
      if (!path) {
        errors.path = 'Provide the relative path to request.';
      } else if (!path.startsWith('/')) {
        errors.path = 'Paths should start with / to remain relative.';
      }
      break;
    }
    case 'http-post-form': {
      const path = (config.path || '').trim();
      if (!path) {
        errors.path = 'Set the login form path.';
      } else if (!path.startsWith('/')) {
        errors.path = 'Paths should start with / to remain relative.';
      }
      if (!(config.usernameField || '').trim()) {
        errors.usernameField = 'Enter the username field name.';
      }
      if (!(config.passwordField || '').trim()) {
        errors.passwordField = 'Enter the password field name.';
      }
      break;
    }
    default:
      break;
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
};

const formatServiceConfigSummary = (service, config = {}) => {
  const definition = serviceConfigDefinitions[service];
  if (!definition) {
    return 'Service options: (none)';
  }
  return [
    'Service options:',
    ...definition.fields.map((field) => {
      const value = config[field.key];
      if (field.type === 'checkbox') {
        return `- ${field.label}: ${value ? 'enabled' : 'disabled'}`;
      }
      return `- ${field.label}: ${value || 'not set'}`;
    }),
  ].join('\n');
};

const getServiceLabel = (service) =>
  serviceConfigDefinitions[service]?.label || service;

const normalisePath = (path) => {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
};

const buildPreparedTarget = (baseTarget, service, config = {}) => {
  const trimmed = (baseTarget || '').trim();
  if (!trimmed) return '';
  switch (service) {
    case 'ssh':
    case 'ftp':
    case 'smtp': {
      const port = (config.port || '').toString().trim();
      if (port && !trimmed.includes(':')) {
        return `${trimmed}:${port}`;
      }
      return trimmed;
    }
    case 'http-get': {
      const path = normalisePath((config.path || '').trim());
      return `${trimmed.replace(/\/$/, '')}${path || ''}`;
    }
    case 'http-post-form': {
      const path = normalisePath((config.path || '').trim());
      const usernameField = (config.usernameField || 'username').trim() || 'username';
      const passwordField = (config.passwordField || 'password').trim() || 'password';
      const base = `${trimmed.replace(/\/$/, '')}${path || ''}`;
      return `${base}:${usernameField}=^USER^&${passwordField}=^PASS^:F=401`;
    }
    default:
      return trimmed;
  }
};

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
  const [initialAttempt, setInitialAttempt] = useState(0);
  const startRef = useRef(null);
  const [charset, setCharset] = useState('abc123');
  const [rule, setRule] = useState('1:3');
  const [candidateStats, setCandidateStats] = useState([]);
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [showSaved, setShowSaved] = useState(false);
  const [serviceConfigs, setServiceConfigs] = useState(cloneServiceDefaults);

  const ensureServiceConfig = useCallback((svc) => {
    setServiceConfigs((prev) => {
      if (prev[svc]) {
        return prev;
      }
      return {
        ...prev,
        [svc]: {
          ...(serviceConfigDefinitions[svc]?.defaults || {}),
        },
      };
    });
  }, []);

  useEffect(() => {
    ensureServiceConfig(service);
  }, [service, ensureServiceConfig]);

  const currentServiceConfig = serviceConfigs[service] || {};
  const currentServiceDefinition = serviceConfigDefinitions[service];
  const serviceValidation = useMemo(
    () => validateServiceConfig(service, currentServiceConfig),
    [service, currentServiceConfig]
  );
  const serviceButtonEntries = useMemo(
    () => Object.entries(serviceConfigDefinitions),
    []
  );

  const handleServiceChange = useCallback(
    (nextService) => {
      ensureServiceConfig(nextService);
      setService(nextService);
    },
    [ensureServiceConfig, setService]
  );

  const updateServiceConfig = useCallback(
    (key, value) => {
      setServiceConfigs((prev) => ({
        ...prev,
        [service]: {
          ...(serviceConfigDefinitions[service]?.defaults || {}),
          ...(prev[service] || {}),
          [key]: value,
        },
      }));
    },
    [service, setServiceConfigs]
  );

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
      if (cfg.serviceConfigs) {
        setServiceConfigs((prev) => {
          const defaults = cloneServiceDefaults();
          const next = { ...defaults, ...prev };
          Object.entries(cfg.serviceConfigs || {}).forEach(([key, value]) => {
            next[key] = {
              ...(defaults[key] || {}),
              ...(prev[key] || {}),
              ...value,
            };
          });
          return next;
        });
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

    if (session.service && session.serviceConfig) {
      setServiceConfigs((prev) => ({
        ...prev,
        [session.service]: {
          ...(serviceConfigDefinitions[session.service]?.defaults || {}),
          ...(prev[session.service] || {}),
          ...session.serviceConfig,
        },
      }));
    }

    const resumeTarget =
      session.preparedTarget || session.target || session.targetInput;

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
            target: resumeTarget,
            service: session.service,
            userList: user.content,
            passList: pass.content,
            options: session.serviceConfig,
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
      setTarget(session.targetInput || session.target || '');
      setService(session.service || 'ssh');
      setSelectedUser(session.selectedUser || '');
      setSelectedPass(session.selectedPass || '');
      if (session.service && session.serviceConfig) {
        setServiceConfigs((prev) => ({
          ...prev,
          [session.service]: {
            ...(serviceConfigDefinitions[session.service]?.defaults || {}),
            ...(prev[session.service] || {}),
            ...session.serviceConfig,
          },
        }));
      }
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
      const preparedTarget = buildPreparedTarget(
        target,
        service,
        currentServiceConfig
      );
      setTimeline((t) => {
        const newTimeline = [
          ...t,
          { time: parseFloat(elapsed), user, password, result },
        ];
        saveSession({
          targetInput: target,
          target: preparedTarget,
          preparedTarget,
          service,
          selectedUser,
          selectedPass,
          serviceConfig: currentServiceConfig,
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

    if (!serviceValidation.isValid) {
      const guidance = Object.values(serviceValidation.errors).join('\n');
      setOutput(
        `Fix the ${service} configuration before running:\n${guidance}`
      );
      setAnnounce('Hydra validation failed');
      return;
    }

    const preparedTarget = buildPreparedTarget(
      target,
      service,
      currentServiceConfig
    );

    setRunning(true);
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
    setTimeline([]);
    startRef.current = Date.now();
    setInitialAttempt(0);
    const sessionConfig = {
      targetInput: target,
      target: preparedTarget,
      preparedTarget,
      service,
      selectedUser,
      selectedPass,
      serviceConfig: currentServiceConfig,
      attempt: 0,
      timeline: [],
    };
    saveSession(sessionConfig);
    setAnnounce('Hydra started');
    announceRef.current = Date.now();
    try {
      if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
        const res = await fetch('/api/hydra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: preparedTarget,
            service,
            userList: user.content,
            passList: pass.content,
            options: currentServiceConfig,
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
    const preparedTarget = buildPreparedTarget(
      target,
      service,
      currentServiceConfig
    );
    const report = [
      `Target: ${target || 'N/A'}`,
      preparedTarget && preparedTarget !== target
        ? `Prepared target: ${preparedTarget}`
        : null,
      `Service: ${service}`,
      `Users: ${userCount}`,
      `Passwords: ${passCount}`,
      `Charset: ${charset} (${charset.length})`,
      `Rule: ${rule}`,
      `Estimated candidate space: ${candidateSpace.toLocaleString()}`,
      formatServiceConfigSummary(service, currentServiceConfig),
      !serviceValidation.isValid
        ? [
            'Service validation warnings:',
            ...Object.values(serviceValidation.errors).map((msg) => `- ${msg}`),
          ].join('\n')
        : null,
      'Dry run only - no network requests made.',
    ]
      .filter(Boolean)
      .join('\n');
    setOutput(report);
    setAnnounce('Dry run complete');
  };

  const handleSaveConfig = () => {
    saveConfigStorage({
      target,
      service,
      selectedUser,
      selectedPass,
      serviceConfigs,
    });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1500);
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          { target, service, selectedUser, selectedPass, serviceConfigs },
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
    setRunning(false);
    setPaused(false);
    setRunId((id) => id + 1);
    setOutput('');
    setTimeline([]);
    startRef.current = null;
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

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="col-span-2 flex flex-wrap gap-1.5">
          {serviceButtonEntries.map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleServiceChange(key)}
              className={`flex items-center p-2 rounded border text-sm transition-colors ${
                service === key
                  ? 'bg-blue-600 border-blue-400'
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
              }`}
            >
              {meta.icon && (
                <img src={meta.icon} alt={meta.label} className="w-6 h-6 mr-2" />
              )}
              <span>{meta.label}</span>
            </button>
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
            onChange={(e) => handleServiceChange(e.target.value)}
            className="w-full p-2 rounded text-black"
          >
            {availableServices.map((s) => (
              <option key={s} value={s}>
                {getServiceLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <div className="bg-gray-800 rounded p-3 space-y-3">
            <div className="flex items-start gap-3">
              {currentServiceDefinition?.icon && (
                <img
                  src={currentServiceDefinition.icon}
                  alt={getServiceLabel(service)}
                  className="w-8 h-8"
                />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {getServiceLabel(service)} options
                </p>
                <p className="text-xs text-gray-300">
                  {currentServiceDefinition?.guidance ||
                    'No additional configuration required for this service.'}
                </p>
              </div>
            </div>
            {currentServiceDefinition ? (
              <div className="grid gap-3 md:grid-cols-2">
                {currentServiceDefinition.fields.map((field) => (
                  <div key={field.key} className="flex flex-col">
                    {field.type === 'checkbox' ? (
                      <label className="inline-flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={Boolean(currentServiceConfig[field.key])}
                          onChange={(e) =>
                            updateServiceConfig(field.key, e.target.checked)
                          }
                        />
                        <span>{field.label}</span>
                      </label>
                    ) : (
                      <>
                        <label className="text-sm font-semibold mb-1">
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          value={currentServiceConfig[field.key] ?? ''}
                          onChange={(e) =>
                            updateServiceConfig(field.key, e.target.value)
                          }
                          className="w-full p-2 rounded text-black"
                          placeholder={field.placeholder}
                        />
                      </>
                    )}
                    {field.description && (
                      <p className="text-xs text-gray-300 mt-1">
                        {field.description}
                      </p>
                    )}
                    {serviceValidation.errors[field.key] && (
                      <p className="text-xs text-red-400 mt-1">
                        {serviceValidation.errors[field.key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-300">
                This service does not expose additional demo controls.
              </p>
            )}
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
            disabled={running || !isTargetValid || !serviceValidation.isValid}
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

