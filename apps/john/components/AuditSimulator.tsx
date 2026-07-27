'use client';

import React, { useMemo, useState } from 'react';
import johnPlaceholders from '../../../components/apps/john/placeholders';

interface UserRecord {
  username: string;
  password: string;
}

interface Finding {
  user: UserRecord;
  tip: string;
}

const SAMPLE_USERS: UserRecord[] = johnPlaceholders.auditUsers;

const WEAK_PASSWORDS = new Set(johnPlaceholders.weakPasswords);

const AuditSimulator: React.FC = () => {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const runAudit = () => {
    const results: Finding[] = SAMPLE_USERS.filter((u) => isWeak(u.password)).map((u) => ({
      user: u,
      tip: 'Pair passphrases with MFA and rotate credentials after incidents.',
    }));
    setFindings(results);
    setExpandedUser(results.length ? results[0].user.username : null);
  };

  const isWeak = (pwd: string) => {
    const lower = pwd.toLowerCase();
    if (pwd.length < 8) return true;
    return WEAK_PASSWORDS.has(lower);
  };

  const findingsSummary = useMemo(() => {
    if (!findings.length) return 'No audit results yet.';
    return findings
      .map((finding) => `${finding.user.username} → ${finding.user.password}`)
      .join('\n');
  }, [findings]);

  return (
    <section
      aria-labelledby="audit-simulator"
      className="mt-6 rounded-2xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[color:var(--kali-border)] px-5 py-4">
        <div>
          <h3
            id="audit-simulator"
            className="text-sm font-semibold uppercase tracking-wide text-[color:var(--kali-text)]"
          >
            Weak password audit
          </h3>
          <p className="text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
            Offline interpretation helper using bundled training accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={runAudit}
          className="rounded bg-kali-control px-3 py-2 text-xs font-semibold text-black shadow transition hover:bg-kali-control/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)]"
        >
          Run audit
        </button>
      </header>
      <div className="space-y-4 px-5 py-5 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_85%,transparent)]">
        <p className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] px-3 py-3">
          <span className="font-semibold text-[color:var(--kali-text)]">Purpose:</span> Highlight passwords that match classroom weak-password lists. No network lookups occur.
        </p>
        {findings.length === 0 ? (
          <p className="text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
            Launch the audit to see which demo accounts need immediate action.
          </p>
        ) : (
          <div className="space-y-3" aria-live="polite">
            <p className="text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
              {findings.length} accounts flagged. Use the collapsible cards below to discuss remediation steps.
            </p>
            <ul className="space-y-3">
              {findings.map(({ user, tip }) => {
                const isExpanded = expandedUser === user.username;
                return (
                  <li key={user.username}>
                    <button
                      type="button"
                      onClick={() => setExpandedUser(isExpanded ? null : user.username)}
                      aria-expanded={isExpanded}
                      className="flex w-full flex-col gap-2 rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] px-4 py-3 text-left transition-colors hover:border-[color:color-mix(in_srgb,var(--kali-control)_45%,var(--kali-border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--kali-text)]">
                          <span aria-hidden="true">🚨</span>
                          {user.username}
                        </div>
                        <span className="rounded-full border border-[color:color-mix(in_srgb,var(--color-severity-critical)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-critical)_18%,transparent)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-severity-critical)]">
                          Weak
                        </span>
                      </div>
                      <span className="text-[11px] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
                        {isExpanded ? 'Hide interpretation' : 'Show interpretation'}
                      </span>
                      {isExpanded && (
                        <div className="space-y-3 rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-3 py-3">
                          <p>
                            <span className="font-semibold text-[color:var(--kali-terminal-green)]">Password:</span>{' '}
                            <span className="font-mono">{user.password}</span>
                          </p>
                          <p>{tip}</p>
                          <p className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-severity-medium)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-medium)_18%,transparent)] px-3 py-2 text-[color:var(--color-severity-medium)]">
                            Encourage passphrase upgrades and disable this credential until rotated.
                          </p>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <details className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] p-3">
              <summary className="cursor-pointer text-sm font-medium text-[color:var(--kali-text)] focus:outline-none">
                📋 Copy audit summary
              </summary>
              <textarea
                readOnly
                value={findingsSummary}
                className="mt-2 h-24 w-full rounded border border-[color:var(--kali-border)] bg-[var(--kali-bg)] p-2 font-mono text-xs text-[color:var(--kali-text)]"
                aria-label="Audit summary"
              />
            </details>
          </div>
        )}
      </div>
    </section>
  );
};

export default AuditSimulator;
