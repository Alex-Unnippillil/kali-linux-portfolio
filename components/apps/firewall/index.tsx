import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from 'react';
import { logEvent } from '../../../utils/analytics';
import {
  FIREWALL_ACTIONS,
  FIREWALL_PROFILES,
  FIREWALL_PROTOCOLS,
  addRule,
  getFirewallState,
  removeRule,
  setActiveProfile,
  updateRule,
  type FirewallAction,
  type FirewallProfile,
  type FirewallRule,
  type FirewallRuleInput,
  type FirewallState,
} from '../../../utils/firewallStore';

const PROFILE_LABELS: Record<FirewallProfile, string> = {
  home: 'Home',
  work: 'Work',
  public: 'Public',
};

const PROFILE_DESCRIPTIONS: Record<FirewallProfile, string> = {
  home: 'Balanced defaults for trusted home networks with outbound web access enabled.',
  work: 'Adds allowances for VPN and remote desktop tools used on corporate networks.',
  public: 'Locks down most inbound traffic when connected to cafés, airports, or other public Wi-Fi.',
};

const ACTION_LABELS: Record<FirewallAction, string> = {
  allow: 'Allow',
  block: 'Block',
};

const createEmptyDraft = (): FirewallRuleInput => ({
  app: '',
  port: '',
  protocol: 'TCP',
  action: 'allow',
});

export default function FirewallApp() {
  const [state, setState] = useState<FirewallState>(() => getFirewallState());
  const [draft, setDraft] = useState<FirewallRuleInput>(() => createEmptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeRules = state.profiles[state.activeProfile];
  const isEditing = editingId !== null;
  const submitLabel = isEditing ? 'Update Rule' : 'Add Rule';

  const resetForm = useCallback(() => {
    setDraft(createEmptyDraft());
    setEditingId(null);
    setError(null);
  }, []);

  const handleProfileChange = useCallback(
    (profile: FirewallProfile) => {
      if (profile === state.activeProfile) {
        return;
      }
      const nextState = setActiveProfile(profile);
      setState(nextState);
      resetForm();
      logEvent({
        category: 'firewall',
        action: 'profile_change',
        label: PROFILE_LABELS[profile],
      });
    },
    [resetForm, state.activeProfile]
  );

  const handleInputChange = useCallback(
    (field: keyof FirewallRuleInput) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { value } = event.target;
        setDraft((prev) => ({
          ...prev,
          [field]: value,
        }));
        if (error) {
          setError(null);
        }
      },
    [error]
  );

  const handleEdit = useCallback((rule: FirewallRule) => {
    setEditingId(rule.id);
    setDraft({
      app: rule.app,
      port: rule.port,
      protocol: rule.protocol,
      action: rule.action,
    });
    setError(null);
  }, []);

  const handleDelete = useCallback(
    (rule: FirewallRule) => {
      const nextState = removeRule(state.activeProfile, rule.id);
      setState(nextState);
      if (editingId === rule.id) {
        resetForm();
      }
    },
    [editingId, resetForm, state.activeProfile]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedPort = draft.port.trim();
      if (trimmedPort.length === 0) {
        setError('Port is required.');
        return;
      }
      const ruleInput: FirewallRuleInput = {
        app: draft.app,
        port: trimmedPort,
        protocol: draft.protocol,
        action: draft.action,
      };
      const nextState = isEditing && editingId
        ? updateRule(state.activeProfile, editingId, ruleInput)
        : addRule(state.activeProfile, ruleInput);
      setState(nextState);
      resetForm();
    },
    [draft, editingId, isEditing, resetForm, state.activeProfile]
  );

  const actionOptions = useMemo(
    () => FIREWALL_ACTIONS.map((action) => (
      <option key={action} value={action}>
        {ACTION_LABELS[action]}
      </option>
    )),
    []
  );

  const protocolOptions = useMemo(
    () => FIREWALL_PROTOCOLS.map((protocol) => (
      <option key={protocol} value={protocol}>
        {protocol}
      </option>
    )),
    []
  );

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white">
      <header className="border-b border-ubt-grey px-4 py-3">
        <h1 className="text-lg font-semibold">Firewall Profiles</h1>
        <p className="text-xs text-ubt-grey">
          Simulate how Kali would manage inbound and outbound rules across common network scenarios.
        </p>
      </header>
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">Profile</h2>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Firewall profiles">
            {FIREWALL_PROFILES.map((profile) => {
              const isActive = state.activeProfile === profile;
              return (
                <button
                  key={profile}
                  type="button"
                  onClick={() => handleProfileChange(profile)}
                  aria-pressed={isActive}
                  className={`rounded px-3 py-1 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue ${
                    isActive
                      ? 'bg-ubt-blue text-white shadow'
                      : 'bg-black/40 text-ubt-grey hover:bg-black/60'
                  }`}
                >
                  {PROFILE_LABELS[profile]}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-ubt-grey" data-testid="profile-description">
            {PROFILE_DESCRIPTIONS[state.activeProfile]}
          </p>
        </section>
        <section className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">Rules</h2>
            <span className="text-xs text-ubt-grey">{activeRules.length} rule{activeRules.length === 1 ? '' : 's'}</span>
          </div>
          <div className="overflow-x-auto rounded border border-ubt-grey bg-black/30">
            {activeRules.length === 0 ? (
              <p className="p-4 text-sm text-ubt-grey">No rules defined for this profile.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-black/40 text-ubt-grey">
                  <tr>
                    <th className="px-4 py-2 font-medium">Application</th>
                    <th className="px-4 py-2 font-medium">Protocol</th>
                    <th className="px-4 py-2 font-medium">Port</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                    <th className="px-4 py-2 text-right font-medium">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRules.map((rule) => (
                    <tr key={rule.id} className="border-t border-ubt-grey/40">
                      <td className="px-4 py-2">{rule.app}</td>
                      <td className="px-4 py-2">{rule.protocol}</td>
                      <td className="px-4 py-2">{rule.port}</td>
                      <td className="px-4 py-2">{ACTION_LABELS[rule.action]}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(rule)}
                            className="rounded bg-black/40 px-2 py-1 text-xs text-ubt-grey transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rule)}
                            className="rounded bg-black/40 px-2 py-1 text-xs text-red-300 transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            aria-label={`Delete rule for ${rule.app} on port ${rule.port}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">Rule Editor</h2>
          <form className="mt-3 space-y-3 rounded border border-ubt-grey bg-black/30 p-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col text-xs uppercase tracking-wide" htmlFor="firewall-application">
                Application
                <input
                  id="firewall-application"
                  type="text"
                  value={draft.app}
                  onChange={handleInputChange('app')}
                  aria-label="Application"
                  placeholder="e.g. Web Browser"
                  className="mt-1 rounded bg-ub-cool-grey px-2 py-1 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
                />
              </label>
              <label className="flex flex-col text-xs uppercase tracking-wide" htmlFor="firewall-protocol">
                Protocol
                <select
                  id="firewall-protocol"
                  value={draft.protocol}
                  onChange={handleInputChange('protocol')}
                  className="mt-1 rounded bg-ub-cool-grey px-2 py-1 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
                >
                  {protocolOptions}
                </select>
              </label>
              <label className="flex flex-col text-xs uppercase tracking-wide" htmlFor="firewall-port">
                Port
                <input
                  id="firewall-port"
                  type="text"
                  value={draft.port}
                  onChange={handleInputChange('port')}
                  aria-label="Port"
                  placeholder="e.g. 443 or Any"
                  className="mt-1 rounded bg-ub-cool-grey px-2 py-1 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
                />
              </label>
              <label className="flex flex-col text-xs uppercase tracking-wide" htmlFor="firewall-action">
                Action
                <select
                  id="firewall-action"
                  value={draft.action}
                  onChange={handleInputChange('action')}
                  className="mt-1 rounded bg-ub-cool-grey px-2 py-1 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
                >
                  {actionOptions}
                </select>
              </label>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="rounded bg-ubt-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-ubt-blue/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
              >
                {submitLabel}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded bg-black/40 px-3 py-2 text-sm text-ubt-grey transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
