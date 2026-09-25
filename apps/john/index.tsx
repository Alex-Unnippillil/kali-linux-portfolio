'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AuditSimulator from './components/AuditSimulator';
import johnPlaceholders from '../../components/apps/john/placeholders';
import LabMode from '../../components/LabMode';
import LabPanels from './components/LabPanels';
import { useLabFixtures } from './lib/fixtures';

type HashStatus = 'pending' | 'cracked' | 'failed';

type StrengthLevel = 'weak' | 'medium' | 'strong';

interface HashItem {
  hash: string;
  progress: number;
  status: HashStatus;
  password?: string;
  strength?: StrengthLevel;
}

interface Notice {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  subtitle,
  status,
  actions,
  children,
  id,
}) => (
  <section
    className="rounded-2xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] shadow-inner backdrop-blur"
    aria-labelledby={id}
  >
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--kali-border)] px-5 py-4">
      <div className="space-y-1">
        <h2
          id={id}
          className="text-sm font-semibold uppercase tracking-wide text-[color:var(--kali-text)]"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
        {status}
        {actions}
      </div>
    </header>
    <div className="space-y-4 px-5 py-5 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_88%,transparent)]">
      {children}
    </div>
  </section>
);

const PASSWORDS: Record<string, string> = johnPlaceholders.hashedPasswords.reduce(
  (acc, item) => {
    acc[item.hash] = item.plaintext;
    return acc;
  },
  {} as Record<string, string>
);

const DEFAULT_WORDLIST = johnPlaceholders.defaultWordlist.join('\n');

const HINTS = [
  'Pair the format flag with the sample hashes before running.',
  'Switch to incremental mode when the curated lists stall.',
  'Audit the weak-password report to plan new wordlists.',
];

const initialHashes: HashItem[] = johnPlaceholders.hashedPasswords
  .map((item) => item.hash)
  .concat([johnPlaceholders.fallbackHash])
  .map((hash) => ({ hash, progress: 0, status: 'pending' }));

const STRENGTH_META: Record<StrengthLevel, { icon: string; title: string; guidance: string }> = {
  weak: {
    icon: '⚠️',
    title: 'Weak password',
    guidance:
      'Easily guessed via curated wordlists or prior breaches. Encourage multi-word passphrases and symbols.',
  },
  medium: {
    icon: '🛡️',
    title: 'Moderate password',
    guidance:
      'Resists quick dictionary attacks but still benefits from extra length and special characters.',
  },
  strong: {
    icon: '✨',
    title: 'Strong password',
    guidance:
      'Complex mix of character sets and length. Reinforce with a password manager for uniqueness.',
  },
};

const STATUS_BADGES: Record<HashStatus, string> = {
  pending:
    'border border-[color:color-mix(in_srgb,var(--color-severity-medium)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-medium)_14%,transparent)] text-[color:color-mix(in_srgb,var(--color-severity-medium)_70%,var(--kali-text))]',
  failed:
    'border border-[color:color-mix(in_srgb,var(--color-severity-critical)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-critical)_20%,transparent)] text-[color:var(--color-severity-critical)]',
  cracked:
    'border border-[color:color-mix(in_srgb,var(--color-severity-low)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-low)_20%,transparent)] text-[color:var(--color-severity-low)]',
};

const STRENGTH_BADGES: Record<StrengthLevel, string> = {
  weak:
    'border border-[color:color-mix(in_srgb,var(--color-severity-critical)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-critical)_18%,transparent)] text-[color:var(--color-severity-critical)]',
  medium:
    'border border-[color:color-mix(in_srgb,var(--color-severity-medium)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-medium)_18%,transparent)] text-[color:var(--color-severity-medium)]',
  strong:
    'border border-[color:color-mix(in_srgb,var(--color-severity-low)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-low)_18%,transparent)] text-[color:var(--color-severity-low)]',
};

const tagToneClass = {
  success:
    'border-[color:color-mix(in_srgb,var(--color-severity-low)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-low)_18%,transparent)] text-[color:var(--color-severity-low)]',
  info:
    'border-[color:color-mix(in_srgb,var(--color-info)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-info)_18%,transparent)] text-[color:var(--color-info)]',
  warning:
    'border-[color:color-mix(in_srgb,var(--color-severity-medium)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-medium)_18%,transparent)] text-[color:var(--color-severity-medium)]',
} as const;

const MODES = [
  {
    key: 'single',
    label: 'Single hash focus',
    description: 'Point John at a known candidate to validate a password quickly.',
    example: 'john --format=raw-md5 --single sample.hash',
  },
  {
    key: 'incremental',
    label: 'Incremental brute-force',
    description: 'Generate short keyspaces in memory for a classroom-safe brute-force.',
    example: 'john --incremental=Lower demo.hash',
  },
  {
    key: 'wordlist',
    label: 'Wordlist playback',
    description: 'Replay curated workshop lists to simulate fast cracks.',
    example: 'john --wordlist=training.txt --format=raw-md5 demo.hash',
  },
] as const;

const generateIncremental = (length: number, limit = 100) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const results: string[] = [];
  const helper = (prefix: string) => {
    if (results.length >= limit) return;
    if (prefix.length === length) {
      results.push(prefix);
      return;
    }
    for (const c of chars) {
      helper(prefix + c);
      if (results.length >= limit) break;
    }
  };
  helper('');
  return results;
};

const JohnApp: React.FC = () => {
  const fixtures = useLabFixtures();
  const [mode, setMode] = useState<'single' | 'incremental' | 'wordlist'>('wordlist');
  const [wordlist, setWordlist] = useState(DEFAULT_WORDLIST);
  const [singleValue, setSingleValue] = useState('password');
  const [incLength, setIncLength] = useState(3);
  const [running, setRunning] = useState(false);
  const [hashes, setHashes] = useState<HashItem[]>(initialHashes);
  const [runMessage, setRunMessage] = useState<Notice | null>(null);
  const [utilityNotice, setUtilityNotice] = useState<Notice | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [eta, setEta] = useState('00:00');
  const [averageSpeed, setAverageSpeed] = useState('0 hashes/min');
  const [expandedHash, setExpandedHash] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const getStrength = (pw: string): StrengthLevel => {
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    if (pw.length >= 10 && hasUpper && hasLower && hasNumber && hasSpecial) return 'strong';
    if (pw.length >= 6 && ((hasUpper && hasLower) || hasNumber)) return 'medium';
    return 'weak';
  };

  const start = () => {
    const candidates =
      mode === 'wordlist'
        ? wordlist.split(/\r?\n/).filter(Boolean)
        : mode === 'incremental'
        ? generateIncremental(incLength)
        : [singleValue];

    setHashes(initialHashes.map((h) => ({ ...h })));
    setRunMessage(null);
    setUtilityNotice(null);
    setRunning(true);
    setStartTime(Date.now());
    setEta('00:00');
    setAverageSpeed('0 hashes/min');
    setExpandedHash(null);

    const step = Math.max(1, Math.floor(100 / Math.max(candidates.length, 1)));
    const intervals: NodeJS.Timeout[] = [];

    initialHashes.forEach((_, idx) => {
      intervals[idx] = setInterval(() => {
        setHashes((prev) => {
          const next = [...prev];
          const item = next[idx];
          if (item.status !== 'pending') {
            clearInterval(intervals[idx]);
            return next;
          }
          item.progress = Math.min(item.progress + step, 100);
          if (item.progress === 100) {
            if (PASSWORDS[item.hash]) {
              const pw = PASSWORDS[item.hash];
              item.status = 'cracked';
              item.password = pw;
              item.strength = getStrength(pw);
            } else {
              item.status = 'failed';
            }
            clearInterval(intervals[idx]);
          }
          return next;
        });
      }, 280);
    });
  };

  useEffect(() => {
    if (!running) return;
    if (hashes.every((h) => h.status !== 'pending')) {
      setRunning(false);
      const allCracked = hashes.every((h) => h.status === 'cracked');
      setRunMessage({
        type: allCracked ? 'success' : 'error',
        text: allCracked ? 'All hashes cracked. Great work!' : 'Some hashes resisted the simulated attack.',
      });
    }
  }, [hashes, running]);

  useEffect(() => {
    if (!startTime) {
      setAverageSpeed('0 hashes/min');
      return;
    }

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    if (elapsedSeconds > 0) {
      const completedCount = hashes.filter((h) => h.status !== 'pending').length;
      if (completedCount > 0) {
        const perMinute = completedCount / (elapsedSeconds / 60);
        const formatted = perMinute >= 10 ? perMinute.toFixed(0) : perMinute.toFixed(1);
        setAverageSpeed(`${formatted} hashes/min`);
      } else {
        setAverageSpeed('0 hashes/min');
      }
    }

    const overallProgress = hashes.reduce((sum, h) => sum + h.progress, 0) / hashes.length;

    if (!running || overallProgress <= 0) {
      if (!running) {
        setEta('00:00');
      }
      return;
    }

    const totalTime = elapsedSeconds / (overallProgress / 100);
    const remaining = Math.max(totalTime - elapsedSeconds, 0);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    setEta(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
  }, [hashes, running, startTime]);

  useEffect(() => {
    if (runMessage?.type === 'success') {
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), 3200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [runMessage]);

  useEffect(() => {
    if (!utilityNotice) return;
    const timer = setTimeout(() => setUtilityNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [utilityNotice]);

  const overallProgress = useMemo(
    () => hashes.reduce((sum, h) => sum + h.progress, 0) / hashes.length,
    [hashes]
  );

  const crackedCount = hashes.filter((h) => h.status === 'cracked').length;
  const completedCount = hashes.filter((h) => h.status !== 'pending').length;
  const hintsUsed = Math.min(crackedCount, HINTS.length);
  const hintsRemaining = Math.max(HINTS.length - hintsUsed, 0);
  const nextHints = HINTS.slice(hintsUsed, hintsUsed + 2);

  const summaryText = useMemo(() => {
    const crackedPasswords = hashes.filter((h) => h.status === 'cracked');
    const failedPasswords = hashes.filter((h) => h.status === 'failed');
    const header = `John the Ripper classroom run — Mode: ${
      MODES.find((m) => m.key === mode)?.label ?? mode
    }`;
    const crackedLines = crackedPasswords.length
      ? crackedPasswords
          .map((h) => `${h.password} (${h.hash.slice(0, 6)}…${h.hash.slice(-4)}) → ${h.strength}`)
          .join('\n')
      : 'No hashes cracked yet.';
    const failedLines = failedPasswords.length
      ? `Failed hashes: ${failedPasswords
          .map((h) => `${h.hash.slice(0, 6)}…${h.hash.slice(-4)}`)
          .join(', ')}`
      : 'No failures recorded.';
    return `${header}\nCracked (${crackedPasswords.length}):\n${crackedLines}\n${failedLines}\nAverage speed: ${averageSpeed}`;
  }, [averageSpeed, hashes, mode]);

  const copyResults = async (announce = true) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      if (announce) {
        setUtilityNotice({
          type: 'error',
          text: 'Clipboard access is unavailable in this environment.',
        });
      }
      return false;
    }
    try {
      await navigator.clipboard.writeText(summaryText);
      if (announce) {
        setUtilityNotice({ type: 'success', text: 'Results copied to clipboard.' });
      }
      return true;
    } catch (error) {
      if (announce) {
        setUtilityNotice({ type: 'error', text: 'Copy failed. Try the export option instead.' });
      }
      return false;
    }
  };

  const exportResults = () => {
    try {
      const payload = {
        generatedAt: new Date().toISOString(),
        mode,
        cracked: hashes
          .filter((h) => h.status === 'cracked')
          .map((h) => ({
            hash: h.hash,
            password: h.password,
            strength: h.strength,
          })),
        failed: hashes.filter((h) => h.status === 'failed').map((h) => h.hash),
        averageSpeed,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `john-simulation-${Date.now()}.json`;
      anchor.rel = 'noopener';
      anchor.click();
      URL.revokeObjectURL(url);
      setUtilityNotice({ type: 'success', text: 'Exported results as JSON.' });
    } catch (error) {
      setUtilityNotice({ type: 'error', text: 'Unable to export results in this browser.' });
    }
  };

  const shareResults = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share?.({
          title: 'John simulator summary',
          text: summaryText,
        });
        setUtilityNotice({ type: 'success', text: 'Share sheet opened.' });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') return;
        setUtilityNotice({ type: 'error', text: 'Share request was blocked.' });
        return;
      }
    }

    const copied = await copyResults(false);
    setUtilityNotice({
      type: copied ? 'info' : 'error',
      text: copied
        ? 'Share unsupported here. Results copied to clipboard instead.'
        : 'Share unsupported and copy failed. Try exporting the JSON.',
    });
  };

  return (
    <div className="relative h-full w-full overflow-auto bg-[var(--kali-bg)] text-[color:var(--kali-text)]">
      {celebrating && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-start justify-center pt-24">
          <div className="rounded-full border border-[color:color-mix(in_srgb,var(--color-severity-low)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-low)_18%,transparent)] px-6 py-3 text-sm font-semibold text-[color:var(--color-severity-low)] shadow-xl animate-pulse">
            ✅ Simulation success! Every hash cracked.
          </div>
        </div>
      )}
      <div className="mx-auto flex h-full w-full flex-col gap-6 p-4 lg:max-w-6xl lg:flex-row">
        <section className="flex-1 space-y-6">
          <p className="text-xs text-[color:var(--color-warning)]">
            {johnPlaceholders.banners.page}
          </p>

          <DashboardCard
            id="john-attack-card"
            title="Attack orchestration"
            subtitle="Configure wordlists or incremental runs before launching the simulated crack."
            status={
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                  running
                    ? 'bg-[color:color-mix(in_srgb,var(--kali-control)_18%,transparent)] text-[color:var(--kali-control)] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--kali-control)_55%,transparent)]'
                    : 'bg-[var(--kali-panel-highlight)] text-[color:color-mix(in_srgb,var(--kali-text)_82%,transparent)] ring-1 ring-inset ring-[color:var(--kali-border)]'
                }`}
              >
                {running ? 'Active run' : 'Idle'}
              </span>
            }
            actions={
              <button
                type="button"
                onClick={start}
                disabled={running}
                className="rounded bg-kali-control px-4 py-2 text-xs font-semibold text-black shadow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? 'Running…' : 'Start simulation'}
              </button>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              {MODES.map((m) => {
                const isActive = mode === m.key;
                return (
                  <article
                    key={m.key}
                    className={`flex flex-col rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] p-4 transition-colors duration-150 hover:border-[color:color-mix(in_srgb,var(--kali-control)_45%,var(--kali-border))] hover:bg-[color:color-mix(in_srgb,var(--kali-control)_12%,var(--kali-panel-highlight))] ${
                      isActive
                        ? 'border-[color:var(--kali-control)] bg-[color:color-mix(in_srgb,var(--kali-control)_18%,var(--kali-panel))]'
                        : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setMode(m.key)}
                      aria-pressed={isActive}
                      className="flex flex-1 flex-col gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold text-[color:var(--kali-text)]">{m.label}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                            isActive
                              ? 'bg-[color:color-mix(in_srgb,var(--kali-control)_18%,transparent)] text-[color:var(--kali-control)] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--kali-control)_55%,transparent)]'
                              : 'bg-[var(--kali-panel)] text-[color:color-mix(in_srgb,var(--kali-text)_82%,transparent)] ring-1 ring-inset ring-[color:var(--kali-border)]'
                          }`}
                        >
                          Mode
                        </span>
                      </div>
                      <p className="text-xs text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)]">{m.description}</p>
                      <div className="space-y-1 text-xs">
                        <span className="text-[11px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">Example</span>
                        <code className="block rounded bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent)] px-3 py-2 text-[11px] text-[color:var(--kali-terminal-green)]">
                          {m.example}
                        </code>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2" aria-live="polite">
              {mode === 'single' && (
                <label className="flex flex-col gap-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)]">
                  <span className="text-[11px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_78%,transparent)]">
                    Candidate value
                  </span>
                  <input
                    type="text"
                    value={singleValue}
                    onChange={(e) => setSingleValue(e.target.value)}
                    className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-bg)] px-3 py-2 text-sm text-[color:var(--kali-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)]"
                    aria-label="Single candidate"
                  />
                </label>
              )}

              {mode === 'wordlist' && (
                <label className="flex flex-col gap-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)] md:col-span-2">
                  <span className="text-[11px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_78%,transparent)]">
                    Wordlist entries
                  </span>
                  <textarea
                    value={wordlist}
                    onChange={(e) => setWordlist(e.target.value)}
                    className="min-h-[140px] rounded border border-[color:var(--kali-border)] bg-[var(--kali-bg)] p-3 text-sm text-[color:var(--kali-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)]"
                    aria-label="Wordlist"
                  />
                  <span className="text-[11px] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
                    Offline sample entries are preloaded to avoid any network calls.
                  </span>
                </label>
              )}

              {mode === 'incremental' && (
                <label className="flex flex-col gap-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)]">
                  <span className="text-[11px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_78%,transparent)]">
                    Length
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={incLength}
                    onChange={(e) => setIncLength(parseInt(e.target.value, 10) || 1)}
                    className="w-28 rounded border border-[color:var(--kali-border)] bg-[var(--kali-bg)] px-3 py-2 text-sm text-[color:var(--kali-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)]"
                    aria-label="Incremental length"
                  />
                  <span className="text-[11px] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
                    Generates lowercase keyspaces locally for quick demonstrations.
                  </span>
                </label>
              )}
            </div>

            <div className="rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] p-4 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
              <p className="font-medium text-[color:var(--kali-text)]">Lab guidance</p>
              <p>
                Keep this simulator in lab mode for demonstrations. All datasets are bundled with the app so it performs entirely offline.
              </p>
            </div>
          </DashboardCard>

          <DashboardCard
            id="john-hash-monitor"
            title="Hash monitor"
            subtitle="Track progress for each sample hash with smooth updates."
            status={
              <span className="text-[11px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
                {running ? 'Live monitoring' : 'Awaiting start'}
              </span>
            }
            actions={
              <span className="rounded-full border px-3 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,var(--kali-text)_75%,transparent)]">
                ETA: {eta}
              </span>
            }
          >
            <div
              className="space-y-3"
              aria-live="polite"
              aria-busy={running}
            >
              <div className="space-y-2">
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--kali-border)_45%,transparent)]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(overallProgress)}
                  aria-label="Overall cracking progress"
                >
                  <div
                    className="h-2 rounded-full bg-kali-control transition-all duration-500 ease-out"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
                  <span>Overall progress</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
              </div>

              <ul className="divide-y divide-[color:var(--kali-border)]/40 overflow-hidden rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)]">
                {hashes.map((h) => {
                  const isExpanded = expandedHash === h.hash;
                  return (
                    <li key={h.hash}>
                      <button
                        type="button"
                        onClick={() => setExpandedHash(isExpanded ? null : h.hash)}
                        aria-expanded={isExpanded}
                        className="flex w-full flex-col gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:color-mix(in_srgb,var(--kali-control)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)]"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-2 sm:w-2/3">
                            <span className="block truncate font-mono text-xs text-[color:color-mix(in_srgb,var(--kali-text)_85%,transparent)]">
                              {h.hash}
                            </span>
                            <div className="h-1.5 w-full rounded-full bg-[color:color-mix(in_srgb,var(--kali-border)_45%,transparent)]">
                              <div
                                className="h-1.5 rounded-full bg-kali-control transition-all duration-500 ease-out"
                                style={{ width: `${h.progress}%` }}
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end">
                            {h.status === 'cracked' && h.strength ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${STRENGTH_BADGES[h.strength]}`}
                              >
                                {h.strength}
                              </span>
                            ) : (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${STATUS_BADGES[h.status]}`}
                              >
                                {h.status === 'pending' ? 'In progress' : 'Failed'}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">
                          {isExpanded ? 'Collapse details' : 'Expand details'}
                        </span>
                      </button>
                      {isExpanded && (
                        <div
                          className="space-y-3 border-t border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-4 py-4 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]"
                          role="region"
                          aria-label="Hash interpretation"
                        >
                          {h.status === 'cracked' && h.password && h.strength ? (
                            <>
                              <div className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${STRENGTH_BADGES[h.strength]}`}>
                                <span className="text-lg" aria-hidden="true">
                                  {STRENGTH_META[h.strength].icon}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-[color:var(--kali-text)]">
                                    {STRENGTH_META[h.strength].title}
                                  </p>
                                  <p>{STRENGTH_META[h.strength].guidance}</p>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p>
                                  <span className="font-semibold text-[color:var(--kali-terminal-green)]">Recovered password:</span>{' '}
                                  <span className="font-mono">{h.password}</span>
                                </p>
                                <p>
                                  The hash completed at {h.progress}% progress with the current candidate queue.
                                </p>
                              </div>
                            </>
                          ) : (
                            <p>
                              This hash has not yielded a password yet. Try adjusting the wordlist or switching to incremental mode for a broader keyspace.
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </DashboardCard>

          <DashboardCard
            id="john-results"
            title="Results & interpretations"
            subtitle="Summaries, export tools, and guided explanations for the classroom."
            status={
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  tagToneClass[
                    crackedCount === hashes.length
                      ? 'success'
                      : crackedCount > 0
                      ? 'info'
                      : 'warning'
                  ]
                }`}
              >
                {crackedCount} / {hashes.length} cracked
              </span>
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyResults()}
                  className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] px-3 py-1 text-[11px] font-semibold transition hover:border-[color:color-mix(in_srgb,var(--kali-control)_40%,var(--kali-border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)]"
                >
                  Copy summary
                </button>
                <button
                  type="button"
                  onClick={exportResults}
                  className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] px-3 py-1 text-[11px] font-semibold transition hover:border-[color:color-mix(in_srgb,var(--kali-control)_40%,var(--kali-border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)]"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={shareResults}
                  className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] px-3 py-1 text-[11px] font-semibold transition hover:border-[color:color-mix(in_srgb,var(--kali-control)_40%,var(--kali-border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)]"
                >
                  Share results
                </button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="space-y-2 rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[color:color-mix(in_srgb,var(--kali-text)_90%,transparent)]">Average speed</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tagToneClass.info}`}>
                    {averageSpeed}
                  </span>
                </div>
                <p className="text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
                  Based on completed hashes divided by elapsed runtime. Updates while the simulator runs.
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] p-4">
                <p className="font-medium text-[color:color-mix(in_srgb,var(--kali-text)_90%,transparent)]">Hints remaining</p>
                <span
                  className={`inline-flex w-max items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    tagToneClass[hintsRemaining > 0 ? 'warning' : 'success']
                  }`}
                >
                  🧠 {hintsRemaining}
                </span>
                {hintsRemaining > 0 ? (
                  <ul className="space-y-1 text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
                    {nextHints.map((hint) => (
                      <li key={hint} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{hint}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
                    All workshop tips have been revealed. Challenge learners to propose stronger policies.
                  </p>
                )}
              </div>

              {runMessage && (
                <div
                  className={`rounded-lg border px-4 py-3 text-[color:var(--kali-text)] ${
                    runMessage.type === 'success'
                      ? 'border-[color:color-mix(in_srgb,var(--color-severity-low)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-low)_18%,transparent)]'
                      : 'border-[color:color-mix(in_srgb,var(--color-severity-critical)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-critical)_18%,transparent)]'
                  }`}
                  role="status"
                  aria-live="assertive"
                >
                  {runMessage.text}
                </div>
              )}

              {utilityNotice && (
                <div
                  className={`rounded-lg border px-4 py-3 text-[color:var(--kali-text)] ${
                    utilityNotice.type === 'success'
                      ? 'border-[color:color-mix(in_srgb,var(--color-severity-low)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-low)_14%,transparent)]'
                      : utilityNotice.type === 'info'
                      ? 'border-[color:color-mix(in_srgb,var(--color-info)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-info)_14%,transparent)]'
                      : 'border-[color:color-mix(in_srgb,var(--color-severity-critical)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-critical)_14%,transparent)]'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {utilityNotice.text}
                </div>
              )}

              <div className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel-highlight)] p-4">
                <h3 className="text-sm font-semibold text-[color:var(--kali-text)]">Interpretation toolkit</h3>
                <p className="mt-1 text-[color:color-mix(in_srgb,var(--kali-text)_65%,transparent)]">
                  Use these talking points while reviewing cracked passwords with learners.
                </p>
                <ul className="mt-3 space-y-2 text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
                  <li>
                    <details className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-3">
                      <summary className="cursor-pointer text-sm font-medium text-[color:var(--kali-text)] focus:outline-none">
                        🔍 Pattern reuse
                      </summary>
                      <p className="mt-2 text-xs">
                        Highlight how predictable sequences make reuse dangerous across breached services.
                      </p>
                    </details>
                  </li>
                  <li>
                    <details className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-3">
                      <summary className="cursor-pointer text-sm font-medium text-[color:var(--kali-text)] focus:outline-none">
                        🧮 Entropy boosts
                      </summary>
                      <p className="mt-2 text-xs">
                        Demonstrate how a few extra characters can dramatically expand the keyspace.
                      </p>
                    </details>
                  </li>
                  <li>
                    <details className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-3">
                      <summary className="cursor-pointer text-sm font-medium text-[color:var(--kali-text)] focus:outline-none">
                        🔐 Password managers
                      </summary>
                      <p className="mt-2 text-xs">
                        Encourage tooling that automates unique, strong passwords to avoid human guesswork.
                      </p>
                    </details>
                  </li>
                </ul>
              </div>
            </div>

            <AuditSimulator />
          </DashboardCard>
        </section>

        <div className="flex-1 rounded-2xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)]">
          <LabMode>
            <LabPanels fixtures={fixtures} />
          </LabMode>
        </div>
      </div>
    </div>
  );
};

export default JohnApp;
