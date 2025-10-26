import React, { useMemo, useState } from 'react';

type HashcatSessionStatus = 'Completed' | 'Aborted' | 'Failed';

type RecoverySummary = {
  cracked: number;
  total: number;
  examples?: string[];
};

export interface HashcatSession {
  id: string;
  label: string;
  startedAt: string;
  durationMinutes: number;
  hashType: string;
  attackMode: string;
  mask?: string;
  wordlist: string;
  ruleSet: string;
  averageSpeed: string;
  guessCount: number;
  recovery: RecoverySummary;
  status: HashcatSessionStatus;
  notes?: string;
}

const demoSessions: HashcatSession[] = [
  {
    id: 'sim-01',
    label: 'Password rotation drill',
    startedAt: '2024-03-11T09:15:00Z',
    durationMinutes: 28,
    hashType: 'MD5',
    attackMode: 'Straight',
    mask: undefined,
    wordlist: 'rockyou-100.txt',
    ruleSet: 'best64',
    averageSpeed: '112.4 kH/s',
    guessCount: 188000,
    recovery: {
      cracked: 1,
      total: 1,
      examples: ['password123'],
    },
    status: 'Completed',
    notes:
      'Demo-only exercise validating ruleset behaviour. Wordlist trimmed to 100 items for safety.',
  },
  {
    id: 'sim-02',
    label: 'Mask stress test',
    startedAt: '2024-04-02T18:45:00Z',
    durationMinutes: 42,
    hashType: 'SHA1',
    attackMode: 'Hybrid Wordlist + Mask',
    mask: '?u?l?l?l?d?d',
    wordlist: 'top-200-phrases.txt',
    ruleSet: 'quick',
    averageSpeed: '84.9 kH/s',
    guessCount: 265000,
    recovery: {
      cracked: 0,
      total: 1,
    },
    status: 'Aborted',
    notes: 'Session halted once demo target threshold was met. No live hashes were tested.',
  },
  {
    id: 'sim-03',
    label: 'Cost factor analysis',
    startedAt: '2024-05-08T14:10:00Z',
    durationMinutes: 55,
    hashType: 'bcrypt',
    attackMode: 'Straight',
    mask: undefined,
    wordlist: 'curated-internal-list.txt',
    ruleSet: 'none',
    averageSpeed: '920 H/s',
    guessCount: 41000,
    recovery: {
      cracked: 0,
      total: 1,
    },
    status: 'Failed',
    notes:
      'bcrypt cost parameter simulated at 12. Session demonstrates slow hash scenarios without touching production data.',
  },
  {
    id: 'sim-04',
    label: 'GPU warm-up benchmark',
    startedAt: '2024-05-21T10:30:00Z',
    durationMinutes: 12,
    hashType: 'SHA256',
    attackMode: 'Brute-force',
    mask: '?l?l?l?l',
    wordlist: 'synthetic-mask',
    ruleSet: 'none',
    averageSpeed: '1.2 MH/s',
    guessCount: 55000,
    recovery: {
      cracked: 1,
      total: 1,
      examples: ['test'],
    },
    status: 'Completed',
    notes:
      'Quick-start workload to show relative GPU utilisation during demo onboarding.',
  },
];

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const buildSummary = (session: HashcatSession) => ({
  id: session.id,
  label: session.label,
  startedAt: session.startedAt,
  durationMinutes: session.durationMinutes,
  hashType: session.hashType,
  attackMode: session.attackMode,
  mask: session.mask,
  wordlist: session.wordlist,
  ruleSet: session.ruleSet,
  averageSpeed: session.averageSpeed,
  guessCount: session.guessCount,
  recovery: session.recovery,
  status: session.status,
  notes: session.notes,
  disclaimer: 'Simulation only. No real cracking performed.',
});

const exportMetadata = (sessions: HashcatSession[], filename: string) => {
  if (typeof window === 'undefined' || !sessions.length) return;
  const payload = sessions.map(buildSummary);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const comparisonFields = [
  {
    key: 'hashType',
    label: 'Hash type',
    accessor: (session: HashcatSession) => session.hashType,
  },
  {
    key: 'attackMode',
    label: 'Attack mode',
    accessor: (session: HashcatSession) => session.attackMode,
  },
  {
    key: 'mask',
    label: 'Mask',
    accessor: (session: HashcatSession) => session.mask ?? '—',
  },
  {
    key: 'wordlist',
    label: 'Wordlist',
    accessor: (session: HashcatSession) => session.wordlist,
  },
  {
    key: 'ruleSet',
    label: 'Rule set',
    accessor: (session: HashcatSession) => session.ruleSet,
  },
  {
    key: 'averageSpeed',
    label: 'Average speed',
    accessor: (session: HashcatSession) => session.averageSpeed,
  },
  {
    key: 'guessCount',
    label: 'Total guesses',
    accessor: (session: HashcatSession) => session.guessCount.toLocaleString(),
  },
  {
    key: 'durationMinutes',
    label: 'Duration',
    accessor: (session: HashcatSession) => `${session.durationMinutes} min`,
  },
  {
    key: 'recovery',
    label: 'Recovery result',
    accessor: (session: HashcatSession) =>
      `${session.recovery.cracked}/${session.recovery.total} cracked`,
  },
  {
    key: 'status',
    label: 'Outcome',
    accessor: (session: HashcatSession) => session.status,
  },
] as const;

const statusStyles: Record<HashcatSessionStatus, string> = {
  Completed: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  Aborted: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  Failed: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
};

const Sessions: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const orderedSessions = useMemo(
    () =>
      [...demoSessions].sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      ),
    []
  );

  const sessionMap = useMemo(() => {
    return new Map(orderedSessions.map((session) => [session.id, session]));
  }, [orderedSessions]);

  const selectedSessions = useMemo(
    () => selectedIds.map((id) => sessionMap.get(id)).filter(Boolean) as HashcatSession[],
    [selectedIds, sessionMap]
  );

  const toggleSession = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const comparison = useMemo(() => {
    if (selectedSessions.length !== 2) return null;
    const [a, b] = selectedSessions;
    return comparisonFields.map((field) => {
      const valueA = field.accessor(a);
      const valueB = field.accessor(b);
      const changed = valueA !== valueB;
      return {
        key: field.key,
        label: field.label,
        valueA,
        valueB,
        changed,
      };
    });
  }, [selectedSessions]);

  const handleExportSelected = () => {
    if (!selectedSessions.length) return;
    const name =
      selectedSessions.length === 1
        ? `${selectedSessions[0].id}-metadata.json`
        : `comparison-${selectedSessions[0].id}-vs-${selectedSessions[1].id}.json`;
    exportMetadata(selectedSessions, name);
  };

  const handleExportAll = () => {
    exportMetadata(orderedSessions, 'hashcat-demo-sessions.json');
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto bg-ub-cool-grey p-4 text-white">
      <header className="rounded border border-ub-border bg-ub-dark-400 p-4 shadow">
        <h1 className="text-xl font-semibold">Hashcat Session Timeline</h1>
        <p className="mt-2 text-sm text-ubt-grey">
          Simulated runs showcasing how attack parameters influence outcomes. All
          entries are sandboxed demonstrations and never execute live cracking
          tasks.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportSelected}
            disabled={!selectedSessions.length}
            className="rounded bg-ub-dracula px-3 py-1 text-sm font-medium disabled:cursor-not-allowed disabled:bg-ub-dracula/30"
          >
            Export selected summary
          </button>
          <button
            type="button"
            onClick={handleExportAll}
            className="rounded border border-ub-border px-3 py-1 text-sm font-medium hover:bg-ub-dark-500"
          >
            Export all metadata
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ol className="flex flex-col gap-3">
          {orderedSessions.map((session) => {
            const isSelected = selectedIds.includes(session.id);
            return (
              <li key={session.id}>
                <article
                  className={`relative flex flex-col gap-3 rounded border border-ub-border bg-ub-dark-400 p-4 transition focus-within:ring-2 focus-within:ring-ubt-blue/70 ${isSelected ? 'ring-2 ring-ubt-blue' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-medium">{session.label}</h2>
                      <p className="text-xs uppercase tracking-wide text-ubt-grey">
                        {formatDate(session.startedAt)} · {session.durationMinutes} min
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusStyles[session.status]}`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <dl className="grid gap-2 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-ubt-grey">Hash type</dt>
                      <dd className="font-mono">{session.hashType}</dd>
                    </div>
                    <div>
                      <dt className="text-ubt-grey">Attack mode</dt>
                      <dd>{session.attackMode}</dd>
                    </div>
                    <div>
                      <dt className="text-ubt-grey">Mask</dt>
                      <dd className="font-mono">{session.mask ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-ubt-grey">Wordlist</dt>
                      <dd>{session.wordlist}</dd>
                    </div>
                    <div>
                      <dt className="text-ubt-grey">Rule set</dt>
                      <dd>{session.ruleSet}</dd>
                    </div>
                    <div>
                      <dt className="text-ubt-grey">Speed</dt>
                      <dd>{session.averageSpeed}</dd>
                    </div>
                    <div>
                      <dt className="text-ubt-grey">Guesses</dt>
                      <dd>{session.guessCount.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-ubt-grey">Recovery</dt>
                      <dd>
                        {session.recovery.cracked}/{session.recovery.total} cracked
                      </dd>
                    </div>
                  </dl>

                  {session.notes && (
                    <p className="rounded bg-ub-dark-500/60 p-3 text-xs text-ubt-grey">
                      {session.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSession(session.id)}
                      className={`rounded px-3 py-1 text-xs font-semibold transition ${isSelected ? 'bg-ubt-blue text-white' : 'bg-ub-dracula hover:bg-ub-dracula-dark'}`}
                    >
                      {isSelected ? 'Selected for comparison' : 'Compare session'}
                    </button>
                    <button
                      type="button"
                      onClick={() => exportMetadata([session], `${session.id}-metadata.json`)}
                      className="rounded border border-ub-border px-3 py-1 text-xs font-semibold hover:bg-ub-dark-500"
                    >
                      Export metadata
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>

        <aside className="flex min-h-[200px] flex-col gap-3 rounded border border-ub-border bg-ub-dark-400 p-4">
          <h3 className="text-lg font-medium">Parameter comparison</h3>
          {comparison ? (
            <table className="w-full table-fixed border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ubt-grey">
                  <th className="w-1/3">Parameter</th>
                  <th className="w-1/3">{selectedSessions[0].label}</th>
                  <th className="w-1/3">{selectedSessions[1].label}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr
                    key={row.key as string}
                    className={row.changed ? 'rounded bg-amber-500/10 text-amber-100' : ''}
                  >
                    <th className="py-1 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-ubt-grey">
                      {row.label}
                    </th>
                    <td className="py-1 pr-3 font-mono text-sm text-white">
                      {row.valueA}
                    </td>
                    <td className="py-1 font-mono text-sm text-white">
                      {row.valueB}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-ubt-grey">
              Select two sessions to highlight changes across attack parameters and
              outcomes.
            </p>
          )}
          {selectedSessions.length === 1 && (
            <p className="rounded bg-ub-dark-500/60 p-3 text-xs text-ubt-grey">
              Tip: choose a second session to reveal highlighted differences in
              configuration, performance, and results.
            </p>
          )}
          {!selectedSessions.length && (
            <p className="rounded bg-ub-dark-500/60 p-3 text-xs text-ubt-grey">
              This dashboard remains a demo sandbox. It visualises curated
              metadata without dispatching any real attacks.
            </p>
          )}
        </aside>
      </section>
    </div>
  );
};

export default Sessions;

export const displayHashcatSessions = () => <Sessions />;
