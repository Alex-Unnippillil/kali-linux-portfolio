import React, { useState, useMemo, useCallback, useEffect } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { setValue, getAll } from '../utils/moduleStore';
import { useNetworkProfile, DEFAULT_NETWORK_PROFILE } from '../hooks/useNetworkProfile';
import type { NetworkProfile } from '../hooks/useNetworkProfile';

interface ModuleOption {
  name: string;
  required: boolean;
}

interface Module {
  id: string;
  name: string;
  description: string;
  tags: string[];
  options: ModuleOption[];
  sample: string;
}

const modules: Module[] = [
  {
    id: 'port-scan',
    name: 'Port Scanner',
    description: 'Scans for open network ports',
    tags: ['network', 'scanner'],
    options: [{ name: 'TARGET', required: true }],
    sample: '[+] 192.168.0.1: Ports 22,80 open',
  },
  {
    id: 'bruteforce',
    name: 'Brute Force',
    description: 'Attempts common passwords',
    tags: ['attack', 'password'],
    options: [
      { name: 'TARGET', required: true },
      { name: 'WORDLIST', required: true },
    ],
    sample: '[-] No valid password found',
  },
  {
    id: 'vuln-check',
    name: 'Vuln Check',
    description: 'Checks for known CVEs',
    tags: ['vulnerability', 'scanner'],
    options: [{ name: 'HOST', required: true }],
    sample: '[+] CVE-2024-1234 present on host',
  },
];

const cloneProfileForState = (profile: NetworkProfile): NetworkProfile => ({
  proxyEnabled: profile.proxyEnabled,
  proxyUrl: profile.proxyUrl,
  vpnConnected: profile.vpnConnected,
  vpnLabel: profile.vpnLabel,
  dnsServers: [...profile.dnsServers],
  env: { ...profile.env },
});

const formatEnv = (env: Record<string, string>) =>
  Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

const parseDns = (value: string) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const parseEnv = (value: string) => {
  const next: Record<string, string> = {};
  value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (!key) return;
      next[key.trim()] = rest.join('=').trim();
    });
  return next;
};

const ModuleWorkspace: React.FC = () => {
  const [workspaces, setWorkspaces] = usePersistentState<string[]>(
    'workspaces',
    [],
  );
  const [newWorkspace, setNewWorkspace] = useState('');
  const [currentWorkspace, setCurrentWorkspace] = useState('');

  const {
    applyWorkspaceProfile,
    updateWorkspaceProfile,
    getWorkspaceProfile,
    activeWorkspace: activeNetworkWorkspace,
    profile: activeProfile,
  } = useNetworkProfile();
  const [profileDraft, setProfileDraft] = useState<NetworkProfile>(() =>
    cloneProfileForState(DEFAULT_NETWORK_PROFILE),
  );
  const [dnsInput, setDnsInput] = useState('');
  const [envInput, setEnvInput] = useState('');

  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Module | null>(null);
  const [optionValues, setOptionValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState('');
  const [storeData, setStoreData] = useState<Record<string, string>>({});

  const tags = useMemo(
    () => Array.from(new Set(modules.flatMap((m) => m.tags))),
    [],
  );
  const filteredModules = useMemo(
    () => (filter ? modules.filter((m) => m.tags.includes(filter)) : modules),
    [filter],
  );

  useEffect(() => {
    if (!currentWorkspace && workspaces.length > 0) {
      setCurrentWorkspace(workspaces[0]);
    }
  }, [currentWorkspace, workspaces]);

  useEffect(() => {
    if (!currentWorkspace) return;
    applyWorkspaceProfile(currentWorkspace);
  }, [currentWorkspace, applyWorkspaceProfile]);

  useEffect(() => {
    if (!currentWorkspace) {
      setProfileDraft(cloneProfileForState(DEFAULT_NETWORK_PROFILE));
      setDnsInput('');
      setEnvInput('');
      return;
    }
    const source =
      activeNetworkWorkspace === currentWorkspace
        ? activeProfile
        : getWorkspaceProfile(currentWorkspace);
    const clone = cloneProfileForState(source);
    setProfileDraft(clone);
    setDnsInput(clone.dnsServers.join(', '));
    setEnvInput(formatEnv(clone.env));
  }, [
    currentWorkspace,
    activeNetworkWorkspace,
    activeProfile,
    getWorkspaceProfile,
  ]);

  const addWorkspace = useCallback(() => {
    const name = newWorkspace.trim();
    if (!name) return;
    if (!workspaces.includes(name)) {
      setWorkspaces([...workspaces, name]);
    }
    setCurrentWorkspace(name);
    setNewWorkspace('');
  }, [newWorkspace, workspaces, setWorkspaces]);

  const selectModule = useCallback((mod: Module) => {
    setSelected(mod);
    const initial: Record<string, string> = {};
    mod.options.forEach((o) => {
      initial[o.name] = '';
    });
    setOptionValues(initial);
    setResult('');
  }, []);

  const runCommand = useCallback(() => {
    if (!selected) return;
    const opts = selected.options
      .map((o) => `${o.name}=${optionValues[o.name] || ''}`)
      .join(' ');
    const cmd = `${selected.id} ${opts}`.trim();
    const res = `$ ${cmd}\n${selected.sample}`;
    setResult(res);
    setValue(selected.id, res);
    setStoreData(getAll());
  }, [selected, optionValues]);

  return (
    <div className="p-4 space-y-4 bg-ub-cool-grey text-white min-h-screen">
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">Workspaces</h1>
        <div className="flex gap-2">
          <input
            value={newWorkspace}
            onChange={(e) => setNewWorkspace(e.target.value)}
            placeholder="New workspace"
            className="p-1 rounded text-black"
          />
          <button
            onClick={addWorkspace}
            className="px-2 py-1 bg-ub-orange rounded text-black"
          >
            Create
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {workspaces.map((ws) => (
            <button
              key={ws}
              onClick={() => setCurrentWorkspace(ws)}
              className={`px-2 py-1 rounded ${
                currentWorkspace === ws ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {ws}
            </button>
          ))}
        </div>
      </section>
      {currentWorkspace && (
        <>
          <section
            className="space-y-3 rounded bg-gray-800 p-4 border border-gray-700"
            aria-label="Network profile configuration"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Network Profile</h2>
              <span className="text-xs text-gray-300">
                Proxy {profileDraft.proxyEnabled ? 'enabled' : 'disabled'} · VPN{' '}
                {profileDraft.vpnConnected ? 'on' : 'off'}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span>Proxy URL</span>
                <input
                  value={profileDraft.proxyUrl}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, proxyUrl: e.target.value }))
                  }
                  onBlur={() =>
                    currentWorkspace &&
                    updateWorkspaceProfile(currentWorkspace, {
                      proxyUrl: profileDraft.proxyUrl,
                    })
                  }
                  placeholder="http://127.0.0.1:8080"
                  className="p-2 rounded border border-gray-700 bg-gray-900 text-white"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={profileDraft.proxyEnabled}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setProfileDraft((prev) => ({ ...prev, proxyEnabled: next }));
                    if (currentWorkspace) {
                      updateWorkspaceProfile(currentWorkspace, { proxyEnabled: next });
                    }
                  }}
                />
                <span>Enable proxy</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={profileDraft.vpnConnected}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setProfileDraft((prev) => ({ ...prev, vpnConnected: next }));
                    if (currentWorkspace) {
                      updateWorkspaceProfile(currentWorkspace, { vpnConnected: next });
                    }
                  }}
                />
                <span>VPN connected</span>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>VPN label</span>
                <input
                  value={profileDraft.vpnLabel}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, vpnLabel: e.target.value }))
                  }
                  onBlur={() =>
                    currentWorkspace &&
                    updateWorkspaceProfile(currentWorkspace, {
                      vpnLabel: profileDraft.vpnLabel,
                    })
                  }
                  disabled={!profileDraft.vpnConnected}
                  placeholder="Lab VPN"
                  className="p-2 rounded border border-gray-700 bg-gray-900 text-white disabled:opacity-50"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span>DNS servers (comma separated)</span>
                <input
                  value={dnsInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDnsInput(value);
                    setProfileDraft((prev) => ({ ...prev, dnsServers: parseDns(value) }));
                  }}
                  onBlur={() =>
                    currentWorkspace &&
                    updateWorkspaceProfile(currentWorkspace, {
                      dnsServers: parseDns(dnsInput),
                    })
                  }
                  placeholder="1.1.1.1, 1.0.0.1"
                  className="p-2 rounded border border-gray-700 bg-gray-900 text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span>Environment variables (KEY=value per line)</span>
                <textarea
                  value={envInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEnvInput(value);
                    setProfileDraft((prev) => ({ ...prev, env: parseEnv(value) }));
                  }}
                  onBlur={() =>
                    currentWorkspace &&
                    updateWorkspaceProfile(currentWorkspace, {
                      env: parseEnv(envInput),
                    })
                  }
                  className="h-24 p-2 rounded border border-gray-700 bg-gray-900 text-white"
                  placeholder={'API_KEY=demo\nTOKEN=lab'}
                />
              </label>
            </div>
          </section>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('')}
              className={`px-2 py-1 text-sm rounded ${
                filter === '' ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-2 py-1 text-sm rounded ${
                  filter === t ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModules.map((m) => (
              <button
                key={m.id}
                onClick={() => selectModule(m)}
                className="p-3 text-left bg-ub-grey rounded border border-gray-700"
              >
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-sm text-gray-300">{m.description}</p>
              </button>
            ))}
          </div>
          {selected && (
            <div className="space-y-2">
              <h2 className="font-semibold">Command Composer</h2>
              {selected.options.map((opt) => (
                <div key={opt.name}>
                  <label className="block text-sm">
                    {opt.name} {opt.required ? '*' : ''}
                    <input
                      value={optionValues[opt.name]}
                      onChange={(e) =>
                        setOptionValues({
                          ...optionValues,
                          [opt.name]: e.target.value,
                        })
                      }
                      className="mt-1 w-full p-1 rounded text-black"
                    />
                  </label>
                </div>
              ))}
              <button
                onClick={runCommand}
                className="px-2 py-1 bg-green-600 rounded text-black"
              >
                Run
              </button>
              {result && (
                <div className="flex items-start gap-2">
                  <pre
                    className="flex-1 bg-black text-green-400 p-2 overflow-auto font-mono"
                    role="log"
                  >
                    {result}
                  </pre>
                  <button
                    onClick={() =>
                      navigator.clipboard?.writeText(result)
                    }
                    className="px-2 py-1 text-sm rounded bg-gray-700"
                  >
                    Copy
                  </button>
                </div>
              )}
              {Object.keys(storeData).length > 0 && (
                <div>
                  <h3 className="font-semibold">Stored Values</h3>
                  <ul className="text-xs">
                    {Object.entries(storeData).map(([k, v]) => (
                      <li key={k}>
                        <strong>{k}</strong>: {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ModuleWorkspace;

