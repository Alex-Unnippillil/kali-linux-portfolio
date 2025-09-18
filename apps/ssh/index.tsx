'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/base/Modal';
import FormError from '../../components/ui/FormError';
import TabbedWindow from '../../components/ui/TabbedWindow';
import { SSHAuthType, SSHProfile, useSSHProfiles } from './state/profiles';

interface ProfileFormState {
  label: string;
  hostname: string;
  port: string;
  username: string;
  authType: SSHAuthType;
}

interface SessionTab {
  id: string;
  title: string;
  hostname: string;
  port: number;
  username: string;
  authType: SSHAuthType;
  fingerprint: string;
  profileLabel?: string;
}

interface QuickConnectionDraft {
  label: string;
  hostname: string;
  port: number;
  username: string;
  authType: SSHAuthType;
}

type PendingConnection =
  | {
      kind: 'saved';
      profileId: string;
      profile: SSHProfile;
      fingerprint: string;
    }
  | {
      kind: 'quick';
      draft: QuickConnectionDraft;
      fingerprint: string;
    };

const DEFAULT_FORM: ProfileFormState = {
  label: '',
  hostname: '',
  port: '22',
  username: '',
  authType: 'password',
};

const AUTH_OPTIONS: { value: SSHAuthType; label: string }[] = [
  { value: 'password', label: 'Password' },
  { value: 'publicKey', label: 'Public Key' },
  { value: 'keyboardInteractive', label: 'Keyboard Interactive' },
  { value: 'agent', label: 'SSH Agent' },
];

const createSessionId = () => `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const parsePort = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 22;
  return Math.min(Math.max(parsed, 1), 65535);
};

const SSHSessionView: React.FC<{ session: SessionTab }> = ({ session }) => {
  const userTarget = session.username ? `${session.username}@${session.hostname}` : session.hostname;
  return (
    <div className="space-y-3">
      <p className="text-green-300">
        Established encrypted channel to <span className="font-semibold">{userTarget}</span> on port{' '}
        {session.port}.
      </p>
      {session.profileLabel && (
        <p className="text-sm text-green-200">Profile: {session.profileLabel}</p>
      )}
      <div className="rounded border border-green-800 bg-gray-900 p-3 text-sm text-green-200">
        <p>
          <span className="font-semibold">Authentication:</span> {session.authType}
        </p>
        <p className="break-all">
          <span className="font-semibold">Host fingerprint:</span> {session.fingerprint}
        </p>
      </div>
      <p className="text-xs text-green-300">
        This is a simulation. Commands are not executed, but the workflow mirrors how you would verify fingerprints before
        trusting a new host.
      </p>
    </div>
  );
};

const SSHWorkspace: React.FC = () => {
  const { profiles, isReady, addProfile, updateProfile, removeProfile, recordFingerprint } = useSSHProfiles();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProfileFormState>(DEFAULT_FORM);
  const [fingerprintInput, setFingerprintInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [sessions, setSessions] = useState<SessionTab[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  useEffect(() => {
    if (!isReady) return;
    if (profiles.length === 0) {
      setSelectedId(null);
      setFormState(DEFAULT_FORM);
      return;
    }
    if (selectedId && profiles.some((profile) => profile.id === selectedId)) {
      return;
    }
    setSelectedId(profiles[0].id);
  }, [isReady, profiles, selectedId]);

  useEffect(() => {
    if (!selectedProfile) {
      setFormState((prev) => ({ ...DEFAULT_FORM, authType: prev.authType }));
      return;
    }
    setFormState({
      label: selectedProfile.label,
      hostname: selectedProfile.hostname,
      port: selectedProfile.port.toString(),
      username: selectedProfile.username,
      authType: selectedProfile.authType,
    });
  }, [selectedProfile]);

  useEffect(() => {
    if (sessions.length === 0) {
      setActiveSessionId(null);
    } else if (!sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[sessions.length - 1].id);
    }
  }, [sessions, activeSessionId]);

  const handleNewProfile = () => {
    setSelectedId(null);
    setFormState(DEFAULT_FORM);
    setFingerprintInput('');
    setFormError(null);
  };

  const handleFormChange = (key: keyof ProfileFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setFormState((prev) => ({ ...prev, [key]: value }));
    };

  const handleSaveProfile = () => {
    const hostname = formState.hostname.trim();
    if (!hostname) {
      setFormError('Hostname is required.');
      return;
    }
    const label = formState.label.trim() || hostname;
    const username = formState.username.trim();
    const port = parsePort(formState.port);
    const updates = { label, hostname, username, port, authType: formState.authType };

    if (selectedId) {
      updateProfile(selectedId, updates);
      setFormError(null);
    } else {
      const created = addProfile(updates);
      setSelectedId(created.id);
      setFormError(null);
    }
  };

  const handleDeleteProfile = () => {
    if (!selectedId) return;
    removeProfile(selectedId);
    handleNewProfile();
  };

  const openSession = (details: QuickConnectionDraft, fingerprint: string, profileLabel?: string) => {
    const id = createSessionId();
    const title = details.label || (details.username ? `${details.username}@${details.hostname}` : details.hostname);
    const session: SessionTab = {
      id,
      title,
      hostname: details.hostname,
      port: details.port,
      username: details.username,
      authType: details.authType,
      fingerprint,
      profileLabel,
    };
    setSessions((prev) => [...prev, session]);
    setActiveSessionId(id);
  };

  const handleConnect = () => {
    const hostname = formState.hostname.trim();
    if (!hostname) {
      setFormError('Hostname is required.');
      return;
    }
    const fingerprint = fingerprintInput.trim();
    if (!fingerprint) {
      setFormError('Fingerprint is required to connect.');
      return;
    }
    const label = formState.label.trim() || hostname;
    const username = formState.username.trim();
    const port = parsePort(formState.port);
    const draft: QuickConnectionDraft = {
      label,
      hostname,
      port,
      username,
      authType: formState.authType,
    };

    if (selectedProfile) {
      const updated =
        updateProfile(selectedProfile.id, draft) ?? {
          ...selectedProfile,
          ...draft,
          id: selectedProfile.id,
          trustedFingerprints: [...selectedProfile.trustedFingerprints],
        };
      const trusted = updated.trustedFingerprints.includes(fingerprint);
      if (trusted) {
        const finalProfile = recordFingerprint(updated.id, fingerprint) ?? updated;
        openSession(
          {
            label: finalProfile.label,
            hostname: finalProfile.hostname,
            port: finalProfile.port,
            username: finalProfile.username,
            authType: finalProfile.authType,
          },
          fingerprint,
          finalProfile.label,
        );
        setFingerprintInput('');
      } else {
        setPending({ kind: 'saved', profileId: updated.id, profile: updated, fingerprint });
      }
      setFormError(null);
      return;
    }

    setPending({ kind: 'quick', draft, fingerprint });
    setFormError(null);
  };

  const cancelPending = () => {
    setPending(null);
  };

  const confirmTrust = () => {
    if (!pending) return;
    if (pending.kind === 'saved') {
      const stored =
        recordFingerprint(pending.profileId, pending.fingerprint) ?? {
          ...pending.profile,
          trustedFingerprints: [...pending.profile.trustedFingerprints, pending.fingerprint],
        };
      openSession(
        {
          label: stored.label,
          hostname: stored.hostname,
          port: stored.port,
          username: stored.username,
          authType: stored.authType,
        },
        pending.fingerprint,
        stored.label,
      );
    } else {
      openSession(pending.draft, pending.fingerprint);
    }
    setFingerprintInput('');
    setPending(null);
  };

  const closeSession = (id: string) => {
    setSessions((prev) => {
      const index = prev.findIndex((session) => session.id === id);
      const next = prev.filter((session) => session.id !== id);
      setActiveSessionId((current) => {
        if (current !== id) return current;
        if (next.length === 0) return null;
        const fallback = next[index] || next[index - 1] || next[0];
        return fallback.id;
      });
      return next;
    });
  };

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const connectLabel = selectedProfile ? 'Connect' : 'Quick Connect';
  const saveLabel = selectedProfile ? 'Save Changes' : 'Save Profile';
  const trustedFingerprints = selectedProfile?.trustedFingerprints ?? [];

  return (
    <div className="flex h-full flex-col gap-6 bg-gray-900 p-4 text-white">
      <div>
        <h1 className="text-2xl font-semibold">SSH Connection Manager</h1>
        <p className="text-sm text-gray-300">
          Maintain reusable connection profiles, verify host fingerprints, and launch simulated SSH sessions safely.
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-6 xl:flex-row">
        <section className="xl:w-1/3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Saved Profiles</h2>
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500"
              onClick={handleNewProfile}
            >
              New Profile
            </button>
          </div>
          {profiles.length === 0 ? (
            <p className="mb-4 text-sm text-gray-400">No profiles yet. Create one to store frequently used hosts.</p>
          ) : (
            <ul className="mb-4 space-y-2" role="list">
              {profiles.map((profile) => {
                const isActive = profile.id === selectedId;
                const label = profile.label || profile.hostname;
                return (
                  <li key={profile.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(profile.id)}
                      className={`flex w-full justify-between rounded border px-3 py-2 text-left text-sm ${
                        isActive
                          ? 'border-blue-400 bg-blue-900/40'
                          : 'border-gray-700 bg-gray-800 hover:border-blue-400'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="text-xs text-gray-400">{profile.hostname}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {selectedProfile && trustedFingerprints.length > 0 && (
            <div className="mb-4 rounded border border-gray-700 bg-gray-900 p-3">
              <h3 className="text-sm font-semibold text-gray-200">Trusted fingerprints</h3>
              <ul className="mt-2 space-y-1 text-xs text-gray-300" role="list">
                {trustedFingerprints.map((fp) => (
                  <li key={fp} className="break-all border-b border-gray-800 pb-1 last:border-none last:pb-0">
                    {fp}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form
            className="space-y-4 rounded border border-gray-800 bg-gray-900 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSaveProfile();
            }}
          >
            <div>
              <label htmlFor="ssh-profile-label" className="mb-1 block text-sm font-medium">
                Profile name
              </label>
              <input
                id="ssh-profile-label"
                type="text"
                value={formState.label}
                onChange={handleFormChange('label')}
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="ssh-hostname" className="mb-1 block text-sm font-medium">
                Hostname or IP
              </label>
              <input
                id="ssh-hostname"
                type="text"
                value={formState.hostname}
                onChange={handleFormChange('hostname')}
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="ssh-port" className="mb-1 block text-sm font-medium">
                  Port
                </label>
                <input
                  id="ssh-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={formState.port}
                  onChange={handleFormChange('port')}
                  className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                />
              </div>
              <div>
                <label htmlFor="ssh-username" className="mb-1 block text-sm font-medium">
                  Username
                </label>
                <input
                  id="ssh-username"
                  type="text"
                  value={formState.username}
                  onChange={handleFormChange('username')}
                  className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ssh-auth" className="mb-1 block text-sm font-medium">
                Authentication method
              </label>
              <select
                id="ssh-auth"
                value={formState.authType}
                onChange={handleFormChange('authType')}
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              >
                {AUTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ssh-fingerprint" className="mb-1 block text-sm font-medium">
                Host fingerprint
              </label>
              <input
                id="ssh-fingerprint"
                type="text"
                value={fingerprintInput}
                onChange={(event) => setFingerprintInput(event.target.value)}
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                placeholder="SHA256:..."
              />
              <p className="mt-1 text-xs text-gray-400">
                Provide the fingerprint reported by the server before establishing trust.
              </p>
            </div>
            {formError && <FormError>{formError}</FormError>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded bg-green-600 px-3 py-1 text-sm font-medium hover:bg-green-500"
              >
                {saveLabel}
              </button>
              {selectedProfile && (
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  className="rounded bg-red-600 px-3 py-1 text-sm font-medium hover:bg-red-500"
                >
                  Delete Profile
                </button>
              )}
              <button
                type="button"
                onClick={handleConnect}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium hover:bg-blue-500"
              >
                {connectLabel}
              </button>
            </div>
          </form>
        </section>
        <section className="flex flex-1 flex-col">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Session Tabs</h2>
            <p className="text-xs text-gray-400">
              Open connections appear as tabs. Close a tab to end the simulated session.
            </p>
          </div>
          <div className="flex flex-col overflow-hidden rounded border border-gray-800 bg-gray-900">
            <div role="tablist" aria-label="SSH sessions" className="flex flex-wrap border-b border-gray-800 bg-gray-800 text-sm">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div key={session.id} className="flex items-stretch">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`flex items-center gap-2 px-3 py-2 ${
                        isActive ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                      }`}
                      onClick={() => setActiveSessionId(session.id)}
                    >
                      <span className="max-w-[160px] truncate">{session.title}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Close session ${session.title}`}
                      className={`px-2 text-lg ${isActive ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                      onClick={() => closeSession(session.id)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <span className="px-3 py-2 text-xs text-gray-400">No sessions yet</span>
              )}
            </div>
            <div className="flex-1 overflow-auto bg-black p-4">
              {activeSession ? (
                <SSHSessionView session={activeSession} />
              ) : (
                <p className="text-sm text-gray-400">
                  No active sessions. Select a profile or enter host details to connect.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
      <Modal isOpen={pending !== null} onClose={cancelPending}>
        {pending && (
          <div className="max-w-md rounded border border-gray-700 bg-gray-900 p-6 text-white shadow-xl">
            <h2 className="text-xl font-semibold">Trust unknown host?</h2>
            <p className="mt-2 text-sm text-gray-300">
              We do not have a trusted fingerprint for this host. Compare the presented fingerprint with an out-of-band
              source before trusting the connection.
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="font-semibold text-gray-200">Host</dt>
                <dd className="text-gray-300">
                  {pending.kind === 'saved' ? pending.profile.hostname : pending.draft.hostname}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-200">Port</dt>
                <dd className="text-gray-300">
                  {pending.kind === 'saved' ? pending.profile.port : pending.draft.port}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-200">Fingerprint</dt>
                <dd className="break-all text-gray-300">{pending.fingerprint}</dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelPending}
                className="rounded bg-gray-700 px-3 py-1 text-sm font-medium hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTrust}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium hover:bg-blue-500"
              >
                Trust and Connect
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const SSHPreview: React.FC = () => (
  <TabbedWindow
    className="min-h-screen bg-gray-900 text-white"
    initialTabs={[
      {
        id: 'workspace',
        title: 'Workspace',
        content: <SSHWorkspace />,
        closable: false,
      },
    ]}
  />
);

export default SSHPreview;

