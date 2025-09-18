import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  parseVpnProfile,
  detectProfileType,
} from '../../../utils/vpnParser';
import type {
  OpenVpnConfig,
  WireGuardConfig,
} from '../../../utils/vpnParser';
import {
  connect,
  disconnect,
  getExternalIp,
  isConnected,
  isKillSwitchEnabled,
  runLeakTest,
  setKillSwitchEnabled,
} from '../../../utils/networkState';
import type { LeakTestResult } from '../../../utils/networkState';
import {
  loadProfiles,
  saveProfiles,
  type StoredVpnProfile,
  type LeakTestEntry,
} from '../../../utils/vpnStorage';
import { logEvent } from '../../../utils/analytics';

const KILL_SWITCH_PREF_KEY = 'vpn-manager:kill-switch';

const createId = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `vpn-${Date.now().toString(36)}-${Math.random()
      .toString(16)
      .slice(2, 8)}`);

const formatTimestamp = (iso: string): string => {
  try {
    const date = new Date(iso);
    return date.toLocaleString();
  } catch {
    return iso;
  }
};

const summarizeOpenVpn = (config: OpenVpnConfig | undefined) => {
  if (!config) return 'No remote specified';
  const remote = config.remote ?? 'Unknown remote';
  const proto = config.protocol ?? 'udp';
  const rawPort = config.port ?? (() => {
    const value = config.options['port'];
    if (Array.isArray(value)) return Number.parseInt(value[0] ?? '', 10);
    if (typeof value === 'string') return Number.parseInt(value, 10);
    return undefined;
  })();
  const port = !rawPort || Number.isNaN(rawPort) ? '1194' : String(rawPort);
  return `${remote} • ${proto.toUpperCase()} • ${port}`;
};

const summarizeWireGuard = (config: WireGuardConfig | undefined) => {
  if (!config) return 'No peers configured';
  const endpoint = config.peers[0]?.endpoint ?? 'Endpoint unknown';
  const address =
    config.interface['Address']?.[0] ??
    config.interface['Address6']?.[0] ??
    config.interface['address']?.[0];
  return address ? `${endpoint} • ${address}` : endpoint;
};

const initialStatus = 'Import an OpenVPN (.ovpn) or WireGuard (.conf) profile to begin.';

const VpnManager: React.FC = () => {
  const [profiles, setProfiles] = useState<StoredVpnProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sessionIps, setSessionIps] = useState<Record<string, string>>({});
  const [currentIp, setCurrentIp] = useState<string>(getExternalIp());
  const [killSwitch, setKillSwitch] = useState<boolean>(isKillSwitchEnabled());
  const [status, setStatus] = useState<string>(initialStatus);
  const [isBusy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const persistProfiles = useCallback(async (next: StoredVpnProfile[]) => {
    setProfiles(next);
    try {
      await saveProfiles(next);
    } catch {
      setError('Unable to persist profiles to secure storage.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadProfiles();
        if (cancelled) return;
        setProfiles(stored);
        if (stored.length > 0) {
          setSelectedId(stored[0].id);
          setStatus('Select a profile to connect or run leak tests.');
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load VPN profiles.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(KILL_SWITCH_PREF_KEY);
      const enabled = stored === 'true';
      const ip = setKillSwitchEnabled(enabled);
      setKillSwitch(enabled);
      if (!isConnected()) {
        setCurrentIp(ip);
      }
    } catch {
      // ignore preference errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(KILL_SWITCH_PREF_KEY, killSwitch ? 'true' : 'false');
    } catch {
      // ignore persistence errors
    }
  }, [killSwitch]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  const updateProfile = useCallback(
    async (id: string, updates: Partial<StoredVpnProfile>) => {
      const next = profiles.map((profile) =>
        profile.id === id
          ? {
              ...profile,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : profile,
      );
      await persistProfiles(next);
    },
    [persistProfiles, profiles],
  );

  const appendLeakTest = useCallback(
    async (id: string, entry: LeakTestEntry) => {
      const next = profiles.map((profile) =>
        profile.id === id
          ? {
              ...profile,
              leakTests: [entry, ...profile.leakTests].slice(0, 5),
              updatedAt: new Date().toISOString(),
            }
          : profile,
      );
      await persistProfiles(next);
    },
    [persistProfiles, profiles],
  );

  const handleToggleKillSwitch = useCallback(() => {
    const next = !killSwitch;
    const ip = setKillSwitchEnabled(next);
    setKillSwitch(next);
    if (!activeId) {
      setCurrentIp(ip);
      setStatus(
        next
          ? 'Kill switch engaged. Traffic blocked while disconnected.'
          : 'Kill switch disabled. Default connection restored while disconnected.',
      );
    }
  }, [activeId, killSwitch]);

  const handleConnect = useCallback(
    async (profile: StoredVpnProfile) => {
      setBusy(true);
      setError(null);
      try {
        const { ip, latencyMs } = connect();
        setCurrentIp(ip);
        setSessionIps((prev) => ({ ...prev, [profile.id]: ip }));
        setActiveId(profile.id);
        await updateProfile(profile.id, { lastConnectedAt: new Date().toISOString() });
        setStatus(
          `Connected to ${profile.name}. Exit IP ${ip}, simulated latency ${latencyMs} ms.`,
        );
      } finally {
        setBusy(false);
      }
    },
    [updateProfile],
  );

  const handleDisconnect = useCallback(
    (profile: StoredVpnProfile) => {
      setBusy(true);
      try {
        const ip = disconnect();
        setCurrentIp(ip);
        setActiveId(null);
        setSessionIps((prev) => {
          const next = { ...prev };
          delete next[profile.id];
          return next;
        });
        setStatus(
          killSwitch
            ? 'Disconnected. Kill switch is blocking outbound traffic.'
            : `Disconnected. External IP reverted to ${ip}.`,
        );
      } finally {
        setBusy(false);
      }
    },
    [killSwitch],
  );

  const handleLeakTest = useCallback(
    async (profile: StoredVpnProfile) => {
      const expectedIp = sessionIps[profile.id] ?? null;
      const result: LeakTestResult = runLeakTest(expectedIp);
      const entry: LeakTestEntry = {
        id: createId(),
        timestamp: result.timestamp,
        ip: result.ip,
        targetIp: result.targetIp,
        leaking: result.leaking,
        dnsLeaking: result.dnsLeaking,
        webRtcLeaking: result.webRtcLeaking,
      };
      await appendLeakTest(profile.id, entry);
      setStatus(
        result.leaking
          ? 'Potential leak detected. Review your profile configuration.'
          : 'Leak test passed. No leaks detected.',
      );
      if (!result.leaking) {
        logEvent({ category: 'VPN Manager', action: 'leak-test-pass', label: profile.name });
      }
    },
    [appendLeakTest, sessionIps],
  );

  const handleDeleteProfile = useCallback(
    async (id: string) => {
      const next = profiles.filter((profile) => profile.id !== id);
      await persistProfiles(next);
      setSessionIps((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (activeId === id) {
        disconnect();
        setActiveId(null);
      }
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
    },
    [activeId, persistProfiles, profiles, selectedId],
  );

  const handleImport = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const text = await file.text();
        const type = detectProfileType(file.name, text);
        const parsed = parseVpnProfile(file.name, text);
        const name = file.name.replace(/\.(ovpn|conf)$/i, '');
        const now = new Date().toISOString();
        const newProfile: StoredVpnProfile = {
          id: createId(),
          name: name || 'Imported Profile',
          type,
          createdAt: now,
          updatedAt: now,
          autoConnect: false,
          favourite: false,
          notes:
            type === 'openvpn'
              ? summarizeOpenVpn(parsed as OpenVpnConfig)
              : summarizeWireGuard(parsed as WireGuardConfig),
          leakTests: [],
          openVpn: type === 'openvpn' ? (parsed as OpenVpnConfig) : undefined,
          wireGuard: type === 'wireguard' ? (parsed as WireGuardConfig) : undefined,
        };
        const next = [...profiles, newProfile];
        await persistProfiles(next);
        setSelectedId(newProfile.id);
        setStatus(`Profile "${newProfile.name}" imported successfully.`);
      } catch (err) {
        setError((err as Error).message || 'Unable to import VPN profile.');
      } finally {
        setBusy(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [persistProfiles, profiles],
  );

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await handleImport(file);
    },
    [handleImport],
  );

  return (
    <div
      className="h-full w-full bg-ub-cool-grey text-white"
      data-testid="vpn-manager"
    >
      <div className="flex h-full flex-col gap-4 p-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">VPN Manager</h1>
            <p className="text-sm text-gray-300">Current IP: {currentIp}</p>
            <p className="text-sm text-gray-400">Kill switch: {killSwitch ? 'Enabled' : 'Disabled'}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleToggleKillSwitch}
              className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500"
            >
              {killSwitch ? 'Disable kill switch' : 'Enable kill switch'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded border border-blue-400 px-3 py-1 text-sm hover:bg-blue-500 hover:text-black"
              disabled={isBusy}
            >
              Import profile
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ovpn,.conf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </header>

        <section className="rounded border border-gray-700 bg-black/30 p-3">
          <p className="text-sm" aria-live="polite">
            {status}
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </section>

        <div className="grid flex-1 gap-4 md:grid-cols-[260px,1fr]">
          <aside className="rounded border border-gray-700 bg-black/30 p-3">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
              Profiles
            </h2>
            {profiles.length === 0 ? (
              <p className="text-sm text-gray-400">No profiles stored yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {profiles.map((profile) => {
                  const isSelected = profile.id === selectedId;
                  const isActive = profile.id === activeId;
                  return (
                    <li key={profile.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(profile.id)}
                        className={`w-full rounded border px-3 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? 'border-blue-400 bg-blue-900/60'
                            : 'border-transparent bg-black/20 hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{profile.name}</span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${
                              isActive ? 'bg-green-500 text-black' : 'bg-gray-700'
                            }`}
                          >
                            {isActive ? 'Connected' : 'Stored'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-300">
                          {profile.type === 'openvpn'
                            ? summarizeOpenVpn(profile.openVpn)
                            : summarizeWireGuard(profile.wireGuard)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section className="flex flex-col gap-4 rounded border border-gray-700 bg-black/30 p-4">
            {selectedProfile ? (
              <div className="flex flex-col gap-4">
                <header>
                  <h2 className="text-lg font-semibold">{selectedProfile.name}</h2>
                  <p className="text-sm text-gray-300">
                    {selectedProfile.type === 'openvpn'
                      ? summarizeOpenVpn(selectedProfile.openVpn)
                      : summarizeWireGuard(selectedProfile.wireGuard)}
                  </p>
                  {selectedProfile.notes && (
                    <p className="mt-1 text-xs text-gray-400">{selectedProfile.notes}</p>
                  )}
                </header>

                <div className="flex flex-wrap gap-2">
                  {activeId === selectedProfile.id ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(selectedProfile)}
                      className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-500"
                      disabled={isBusy}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(selectedProfile)}
                      className="rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-500"
                      disabled={isBusy}
                    >
                      Connect
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleLeakTest(selectedProfile)}
                    className="rounded border border-blue-400 px-3 py-1 text-sm hover:bg-blue-500 hover:text-black"
                    disabled={isBusy}
                  >
                    Run leak test
                  </button>
                  <details className="rounded border border-gray-700 bg-black/30 p-3 text-sm">
                    <summary className="cursor-pointer font-semibold">Profile settings</summary>
                    <div className="mt-2 flex flex-col gap-2 text-xs">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedProfile.autoConnect)}
                          onChange={(event) =>
                            updateProfile(selectedProfile.id, {
                              autoConnect: event.target.checked,
                            })
                          }
                        />
                        Auto-connect on launch
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedProfile.favourite)}
                          onChange={(event) =>
                            updateProfile(selectedProfile.id, {
                              favourite: event.target.checked,
                            })
                          }
                        />
                        Mark as favourite
                      </label>
                      <label className="flex flex-col gap-1">
                        <span>Notes</span>
                        <textarea
                          className="min-h-[60px] rounded border border-gray-700 bg-black/40 p-2"
                          defaultValue={selectedProfile.notes ?? ''}
                          onBlur={(event) =>
                            updateProfile(selectedProfile.id, {
                              notes: event.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(selectedProfile.id)}
                        className="self-start rounded bg-red-700 px-3 py-1 text-white hover:bg-red-600"
                        disabled={isBusy}
                      >
                        Delete profile
                      </button>
                    </div>
                  </details>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Leak tests
                  </h3>
                  {selectedProfile.leakTests.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-400">No leak tests run yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm">
                      {selectedProfile.leakTests.map((entry) => (
                        <li
                          key={entry.id}
                          className={`rounded border px-3 py-2 ${
                            entry.leaking
                              ? 'border-red-500 bg-red-900/40'
                              : 'border-green-500 bg-green-900/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <span className="font-medium">
                              {entry.leaking ? 'Leak detected' : 'No leaks detected'}
                            </span>
                            <span className="text-xs text-gray-200">
                              {formatTimestamp(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-200">
                            Exit IP: {entry.ip} • Expected: {entry.targetIp}
                          </p>
                          {entry.leaking && (
                            <p className="text-xs text-red-200">
                              DNS leak: {entry.dnsLeaking ? 'Yes' : 'No'} • WebRTC leak:{' '}
                              {entry.webRtcLeaking ? 'Yes' : 'No'}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Select a stored profile to view details and run actions.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export const displayVpnManager = () => <VpnManager />;

export default VpnManager;
