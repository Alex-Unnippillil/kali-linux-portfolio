"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { useSettings } from '../../../hooks/useSettings';
import {
  CHECKLIST_TASK_ORDER,
  CHECKLIST_TARGET_MINUTES,
  ChecklistSelection,
  ChecklistTaskKey,
  ChecklistTaskState,
  FirstBootChecklistState,
  computeChecklistProgress,
  createChecklistSummary,
  createInitialChecklistState,
  finalizeChecklistState,
  loadFirstBootChecklistState,
  saveFirstBootChecklistState,
} from '../../../utils/firstBootChecklist';

const FEATURE_FLAG = process.env.NEXT_PUBLIC_ENABLE_FIRST_BOOT_CHECKLIST;
const CHECKLIST_DISABLED = FEATURE_FLAG === 'disabled';

const COMPLETE_LABEL: Record<ChecklistTaskKey, { complete: string; incomplete: string }> = {
  hostname: {
    complete: 'Mark hostname step complete',
    incomplete: 'Mark hostname step incomplete',
  },
  userAccount: {
    complete: 'Mark user account step complete',
    incomplete: 'Mark user account step incomplete',
  },
  ssh: {
    complete: 'Mark SSH step complete',
    incomplete: 'Mark SSH step incomplete',
  },
  updates: {
    complete: 'Mark updates step complete',
    incomplete: 'Mark updates step incomplete',
  },
  firewall: {
    complete: 'Mark firewall step complete',
    incomplete: 'Mark firewall step incomplete',
  },
};

const TASK_TITLES: Record<ChecklistTaskKey, string> = {
  hostname: 'Set the system hostname',
  userAccount: 'Create the primary user account',
  ssh: 'Secure SSH access',
  updates: 'Apply updates & record patching cadence',
  firewall: 'Review firewall policies',
};

const TASK_DESCRIPTIONS: Record<ChecklistTaskKey, React.ReactNode> = {
  hostname: (
    <>
      <p className="text-sm text-ubt-grey">
        Choose a descriptive hostname so audit logs and prompts identify this workstation. Run
        <code className="mx-1 bg-black/40 px-1 py-0.5 rounded">sudo hostnamectl set-hostname &lt;name&gt;</code>
        and confirm it persists after a reboot.
      </p>
    </>
  ),
  userAccount: (
    <>
      <p className="text-sm text-ubt-grey">
        Record the primary user you created with <code className="mx-1 bg-black/40 px-1 py-0.5 rounded">adduser</code> or your
        provisioning tooling. Note any administrative groups (e.g. <code className="mx-1 bg-black/40 px-1 py-0.5 rounded">sudo</code>)
        or security policies you enforced.
      </p>
    </>
  ),
  ssh: (
    <>
      <p className="text-sm text-ubt-grey">
        Decide if SSH should be enabled on first boot. If enabled, prefer key-based auth, disable password logins, and
        consider moving the daemon off port 22. If you&apos;re offline, plan how keys will be synced before re-enabling network
        access.
      </p>
    </>
  ),
  updates: (
    <>
      <p className="text-sm text-ubt-grey">
        Capture the last update command (for example
        <code className="mx-1 bg-black/40 px-1 py-0.5 rounded">sudo apt update && sudo apt upgrade</code>) and document your
        next patching window. When offline, note when the machine should reconnect for mirror syncs.
      </p>
    </>
  ),
  firewall: (
    <>
      <p className="text-sm text-ubt-grey">
        Enable a host firewall such as UFW or document why it stays disabled. List allowed services and confirm logging so
        you can trace inbound attempts once the machine is on the network.
      </p>
    </>
  ),
};

function isTaskReady(key: ChecklistTaskKey, task: ChecklistTaskState): boolean {
  switch (key) {
    case 'hostname':
    case 'userAccount':
      return Boolean(task.value && task.value.trim().length > 0);
    case 'updates':
      return Boolean(task.value && task.value.trim().length > 0);
    case 'ssh':
    case 'firewall':
      return task.selection === 'enabled' || task.selection === 'disabled';
    default:
      return false;
  }
}

function formatDuration(durationMs: number | null) {
  if (!durationMs || durationMs <= 0) {
    return 'under a minute';
  }
  const minutes = Math.round(durationMs / 60000);
  if (minutes < 1) {
    return 'under a minute';
  }
  if (minutes === 1) {
    return '1 minute';
  }
  return `${minutes} minutes`;
}

const FirstBootChecklist: React.FC = () => {
  const [state, setState] = useState<FirstBootChecklistState>(() => {
    const stored = loadFirstBootChecklistState();
    if (stored) {
      return stored;
    }
    const initial = createInitialChecklistState();
    saveFirstBootChecklistState(initial);
    return initial;
  });
  const { allowNetwork } = useSettings();

  const offline = useMemo(() => {
    if (!allowNetwork) return true;
    if (typeof navigator === 'undefined') return false;
    return navigator && navigator.onLine === false;
  }, [allowNetwork]);

  const applyState = useCallback(
    (updater: (prev: FirstBootChecklistState) => FirstBootChecklistState) => {
      setState((prev) => {
        const updated = updater(prev);
        const finalised = finalizeChecklistState(updated);
        saveFirstBootChecklistState(finalised);
        return finalised;
      });
    },
    [],
  );

  const progress = useMemo(() => computeChecklistProgress(state), [state]);

  const summary = useMemo(() => createChecklistSummary(state, offline), [state, offline]);
  const completionMs = summary?.durationMs ?? null;
  const underTarget = completionMs !== null && completionMs <= CHECKLIST_TARGET_MINUTES * 60 * 1000;

  const handleValueChange = useCallback(
    (key: ChecklistTaskKey, value: string) => {
      applyState((prev) => {
        const task = prev.tasks[key];
        const trimmed = value;
        const shouldReset = task.completed && !trimmed.trim();
        const nextTask: ChecklistTaskState = {
          ...task,
          value: trimmed,
          ...(shouldReset
            ? {
                completed: false,
                completedAt: undefined,
              }
            : {}),
        };
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [key]: nextTask,
          },
        };
      });
    },
    [applyState],
  );

  const handleNotesChange = useCallback(
    (key: ChecklistTaskKey, notes: string) => {
      applyState((prev) => ({
        ...prev,
        tasks: {
          ...prev.tasks,
          [key]: {
            ...prev.tasks[key],
            notes,
          },
        },
      }));
    },
    [applyState],
  );

  const handleSelectionChange = useCallback(
    (key: ChecklistTaskKey, selection: ChecklistSelection) => {
      applyState((prev) => {
        const task = prev.tasks[key];
        const nextTask: ChecklistTaskState = {
          ...task,
          selection,
        };
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [key]: nextTask,
          },
        };
      });
    },
    [applyState],
  );

  const toggleCompletion = useCallback(
    (key: ChecklistTaskKey, completed: boolean) => {
      applyState((prev) => {
        const task = prev.tasks[key];
        const nextTask: ChecklistTaskState = {
          ...task,
          completed,
          completedAt: completed ? new Date(Date.now()).toISOString() : undefined,
        };
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [key]: nextTask,
          },
        };
      });
    },
    [applyState],
  );

  const handleExport = useCallback(() => {
    if (!summary) return;
    if (typeof window === 'undefined') return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = summary.completedAt.replace(/[:]/g, '-');
    link.download = `first-boot-summary-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [summary]);

  const renderSummary = () => {
    if (!summary) return null;
    return (
      <section className="mt-6 rounded border border-white/10 bg-black/40 p-4" aria-live="polite">
        <h2 className="text-lg font-semibold text-white">Setup summary</h2>
        <p className={`mt-2 text-sm ${underTarget ? 'text-green-300' : 'text-ubt-grey'}`}>
          Completed in {formatDuration(completionMs)}{' '}
          {underTarget ? `(${CHECKLIST_TARGET_MINUTES}-minute target met)` : '(review timing)'}
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="font-semibold text-white">Hostname</dt>
            <dd className="text-ubt-grey">{summary.tasks.hostname.value || 'Not recorded'}</dd>
          </div>
          <div>
            <dt className="font-semibold text-white">Primary user</dt>
            <dd className="text-ubt-grey">
              {summary.tasks.userAccount.value || 'Not recorded'}
              {summary.tasks.userAccount.notes ? ` — ${summary.tasks.userAccount.notes}` : ''}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-white">SSH</dt>
            <dd className="text-ubt-grey">
              {summary.tasks.ssh.selection ? summary.tasks.ssh.selection : 'Not configured'}
              {summary.tasks.ssh.notes ? ` — ${summary.tasks.ssh.notes}` : ''}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-white">Updates</dt>
            <dd className="text-ubt-grey">
              {summary.tasks.updates.value || 'Not recorded'}
              {summary.tasks.updates.notes ? ` — ${summary.tasks.updates.notes}` : ''}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-white">Firewall</dt>
            <dd className="text-ubt-grey">
              {summary.tasks.firewall.selection ? summary.tasks.firewall.selection : 'Not configured'}
              {summary.tasks.firewall.notes ? ` — ${summary.tasks.firewall.notes}` : ''}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-white">Offline mode</dt>
            <dd className="text-ubt-grey">{summary.offline ? 'Offline / network blocked' : 'Online'}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-ubt-grey">
          <span>Started: {new Date(summary.startedAt).toLocaleString()}</span>
          <span>Completed: {new Date(summary.completedAt).toLocaleString()}</span>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="mt-4 inline-flex items-center rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-black hover:bg-orange-300"
        >
          Export summary (JSON)
        </button>
      </section>
    );
  };

  if (CHECKLIST_DISABLED) {
    return (
      <div className="flex h-full w-full flex-col overflow-y-auto bg-ub-cool-grey p-6 text-ubt-grey">
        <h1 className="text-xl font-semibold text-white">First Boot Checklist</h1>
        <p className="mt-2 text-sm">
          The onboarding checklist is disabled via
          <code className="mx-1 bg-black/40 px-1 py-0.5">NEXT_PUBLIC_ENABLE_FIRST_BOOT_CHECKLIST</code>.
          Enable the flag to guide new sessions. Existing progress and summaries remain available below.
        </p>
        {renderSummary() || (
          <p className="mt-4 text-sm text-ubt-grey">No stored progress yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-semibold">First Boot Checklist</h1>
        <p className="mt-1 text-sm text-ubt-grey">
          Complete these guided steps to finish workstation provisioning. Progress saves locally so you can return later.
        </p>
      </header>
      <section className="border-b border-white/10 px-6 py-3" aria-label="Progress">
        <div className="flex items-center justify-between text-sm text-ubt-grey">
          <span>Progress</span>
          <span className="font-mono text-white">{progress}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="mt-2 h-2 w-full rounded bg-black/30"
        >
          <div
            className="h-2 rounded bg-ub-orange transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>
      {offline && (
        <div className="mx-6 mt-4 rounded border border-yellow-400/60 bg-yellow-500/10 p-3 text-sm text-yellow-100">
          Network access is currently offline or blocked by settings. Follow the offline guidance in each step and document
          how connectivity will be restored.
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-6">
          {CHECKLIST_TASK_ORDER.map((key) => {
            const task = state.tasks[key];
            const ready = isTaskReady(key, task);
            const buttonLabel = task.completed
              ? COMPLETE_LABEL[key].incomplete
              : COMPLETE_LABEL[key].complete;

            const handleCompleteClick = () => {
              if (!task.completed && !ready) return;
              toggleCompletion(key, !task.completed);
            };

            return (
              <section
                key={key}
                className={`rounded border border-white/10 bg-black/30 p-4 shadow transition ${
                  task.completed ? 'ring-1 ring-ub-orange' : ''
                }`}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{TASK_TITLES[key]}</h2>
                    <div className="mt-1 space-y-2 text-left text-ubt-grey">{TASK_DESCRIPTIONS[key]}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCompleteClick}
                    aria-label={buttonLabel}
                    disabled={!task.completed && !ready}
                    className={`mt-2 inline-flex items-center rounded px-3 py-1 text-sm font-semibold transition md:mt-0 ${
                      task.completed
                        ? 'bg-green-500 text-black hover:bg-green-400'
                        : ready
                        ? 'bg-ub-orange text-black hover:bg-orange-300'
                        : 'cursor-not-allowed bg-white/10 text-ubt-grey'
                    }`}
                  >
                    {buttonLabel}
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  {key === 'hostname' && (
                    <>
                      <label className="flex flex-col gap-1 text-ubt-grey" htmlFor="hostname-input">
                        Hostname
                        <input
                          id="hostname-input"
                          value={task.value ?? ''}
                          onChange={(e) => handleValueChange(key, e.target.value)}
                          placeholder="e.g. kali-lab"
                          className="rounded border border-white/20 bg-black/40 px-3 py-2 text-white placeholder-ubt-grey focus:border-ub-orange focus:outline-none"
                        />
                      </label>
                    </>
                  )}
                  {key === 'userAccount' && (
                    <>
                      <label className="flex flex-col gap-1 text-ubt-grey" htmlFor="user-account-input">
                        Primary username
                        <input
                          id="user-account-input"
                          value={task.value ?? ''}
                          onChange={(e) => handleValueChange(key, e.target.value)}
                          placeholder="e.g. analyst"
                          className="rounded border border-white/20 bg-black/40 px-3 py-2 text-white placeholder-ubt-grey focus:border-ub-orange focus:outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-ubt-grey" htmlFor="user-account-notes">
                        Groups / notes
                        <textarea
                          id="user-account-notes"
                          value={task.notes ?? ''}
                          onChange={(e) => handleNotesChange(key, e.target.value)}
                          placeholder="e.g. Added to sudo, enforced MFA login"
                          className="h-20 rounded border border-white/20 bg-black/40 px-3 py-2 text-white placeholder-ubt-grey focus:border-ub-orange focus:outline-none"
                        />
                      </label>
                    </>
                  )}
                  {key === 'ssh' && (
                    <>
                      <fieldset className="space-y-2" aria-labelledby="ssh-choice-label">
                        <legend id="ssh-choice-label" className="text-ubt-grey">
                          SSH state
                        </legend>
                        <label className="flex items-center gap-2 text-ubt-grey">
                          <input
                            type="radio"
                            name="ssh-state"
                            value="enabled"
                            checked={task.selection === 'enabled'}
                            onChange={() => handleSelectionChange(key, 'enabled')}
                          />
                          Enabled with keys and hardened config
                        </label>
                        <label className="flex items-center gap-2 text-ubt-grey">
                          <input
                            type="radio"
                            name="ssh-state"
                            value="disabled"
                            checked={task.selection === 'disabled'}
                            onChange={() => handleSelectionChange(key, 'disabled')}
                          />
                          Disabled until rollout is complete
                        </label>
                      </fieldset>
                      <label className="flex flex-col gap-1 text-ubt-grey" htmlFor="ssh-notes">
                        Notes (port, key paths, bastion requirements)
                        <textarea
                          id="ssh-notes"
                          value={task.notes ?? ''}
                          onChange={(e) => handleNotesChange(key, e.target.value)}
                          className="h-24 rounded border border-white/20 bg-black/40 px-3 py-2 text-white placeholder-ubt-grey focus:border-ub-orange focus:outline-none"
                        />
                      </label>
                    </>
                  )}
                  {key === 'updates' && (
                    <>
                      <label className="flex flex-col gap-1 text-ubt-grey" htmlFor="updates-command">
                        Last command run
                        <textarea
                          id="updates-command"
                          value={task.value ?? ''}
                          onChange={(e) => handleValueChange(key, e.target.value)}
                          placeholder="sudo apt update && sudo apt upgrade"
                          className="h-20 rounded border border-white/20 bg-black/40 px-3 py-2 text-white placeholder-ubt-grey focus:border-ub-orange focus:outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-ubt-grey" htmlFor="updates-notes">
                        Next maintenance window or offline plan
                        <textarea
                          id="updates-notes"
                          value={task.notes ?? ''}
                          onChange={(e) => handleNotesChange(key, e.target.value)}
                          placeholder="Reconnect to mirror on Monday, run unattended-upgrades nightly"
                          className="h-20 rounded border border-white/20 bg-black/40 px-3 py-2 text-white placeholder-ubt-grey focus:border-ub-orange focus:outline-none"
                        />
                      </label>
                    </>
                  )}
                  {key === 'firewall' && (
                    <>
                      <fieldset className="space-y-2" aria-labelledby="firewall-choice-label">
                        <legend id="firewall-choice-label" className="text-ubt-grey">
                          Firewall posture
                        </legend>
                        <label className="flex items-center gap-2 text-ubt-grey">
                          <input
                            type="radio"
                            name="firewall-state"
                            value="enabled"
                            checked={task.selection === 'enabled'}
                            onChange={() => handleSelectionChange(key, 'enabled')}
                          />
                          Enabled (e.g. ufw allow OpenSSH)
                        </label>
                        <label className="flex items-center gap-2 text-ubt-grey">
                          <input
                            type="radio"
                            name="firewall-state"
                            value="disabled"
                            checked={task.selection === 'disabled'}
                            onChange={() => handleSelectionChange(key, 'disabled')}
                          />
                          Disabled (document justification)
                        </label>
                      </fieldset>
                      <label className="flex flex-col gap-1 text-ubt-grey" htmlFor="firewall-notes">
                        Rules / logging notes
                        <textarea
                          id="firewall-notes"
                          value={task.notes ?? ''}
                          onChange={(e) => handleNotesChange(key, e.target.value)}
                          placeholder="ufw allow from bastion, log dropped inbound"
                          className="h-24 rounded border border-white/20 bg-black/40 px-3 py-2 text-white placeholder-ubt-grey focus:border-ub-orange focus:outline-none"
                        />
                      </label>
                    </>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        {progress === 100 && renderSummary()}
      </div>
    </div>
  );
};

export default FirstBootChecklist;

