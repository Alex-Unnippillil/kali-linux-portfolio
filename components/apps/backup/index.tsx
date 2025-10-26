import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  BACKUP_PRESETS,
  enumeratePresetFiles,
  listRestorePoints,
  verifyRestorePoint,
  type BackupFile,
  type BackupPresetId,
  type RestorePoint,
  type VerificationResult,
} from '../../../utils/backupMock';

type Frequency = 'manual' | 'hourly' | 'daily' | 'weekly';
const FREQUENCIES: Frequency[] = ['manual', 'hourly', 'daily', 'weekly'];

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

type Weekday = (typeof WEEKDAYS)[number];

type RestorePhase = 'select' | 'enumerating' | 'verifying' | 'complete';

interface BackupSchedule {
  frequency: Frequency;
  time: string;
  day: Weekday;
  retention: number;
}

const createDefaultSchedule = (): BackupSchedule => ({
  frequency: 'daily',
  time: '02:00',
  day: 'Sunday',
  retention: 14,
});

const isFrequency = (value: unknown): value is Frequency =>
  typeof value === 'string' && FREQUENCIES.includes(value as Frequency);

const isWeekday = (value: unknown): value is Weekday =>
  typeof value === 'string' && WEEKDAYS.includes(value as Weekday);

const isBackupSchedule = (value: unknown): value is BackupSchedule => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    isFrequency(candidate.frequency) &&
    typeof candidate.time === 'string' &&
    isWeekday(candidate.day) &&
    typeof candidate.retention === 'number' &&
    Number.isFinite(candidate.retention)
  );
};

const isPresetId = (value: string): value is BackupPresetId =>
  BACKUP_PRESETS.some((preset) => preset.id === value);

const describeSchedule = (config: BackupSchedule) => {
  const retentionText = `keeping ${config.retention} snapshot${
    config.retention === 1 ? '' : 's'
  }`;

  switch (config.frequency) {
    case 'manual':
      return `Manual snapshots only — remember to trigger backups from the dashboard while ${retentionText}.`;
    case 'hourly':
      return `Hourly snapshots (${retentionText}).`;
    case 'daily':
      return `Daily at ${config.time} — ${retentionText}.`;
    case 'weekly':
      return `Weekly on ${config.day} at ${config.time} — ${retentionText}.`;
    default:
      return retentionText;
  }
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** exponent;
  const precision = exponent === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[exponent]}`;
};

const shortHash = (hash: string) => (hash.length > 12 ? `${hash.slice(0, 12)}…` : hash);

const stepLabels: Record<RestorePhase, string> = {
  select: 'Select snapshot',
  enumerating: 'Enumerate files',
  verifying: 'Verify checksums',
  complete: 'Finalize restore',
};

const stepSequence: RestorePhase[] = [
  'select',
  'enumerating',
  'verifying',
  'complete',
];

const BackupApp: React.FC = () => {
  const [presetId, setPresetId] = usePersistentState<BackupPresetId>(
    'desktop:backup:preset',
    () => BACKUP_PRESETS[0].id,
    (value): value is BackupPresetId =>
      typeof value === 'string' && isPresetId(value),
  );

  const [schedule, setSchedule] = usePersistentState<BackupSchedule>(
    'desktop:backup:schedule',
    createDefaultSchedule,
    isBackupSchedule,
  );

  const [restorePointId, setRestorePointId] = useState('');
  const [phase, setPhase] = useState<RestorePhase>('select');
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [verifications, setVerifications] = useState<VerificationResult[]>([]);
  const [integrity, setIntegrity] = useState<'pending' | 'verified' | 'issues'>(
    'pending',
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const operationRef = useRef(0);

  const selectedPreset = useMemo(
    () => BACKUP_PRESETS.find((preset) => preset.id === presetId) ?? BACKUP_PRESETS[0],
    [presetId],
  );

  const restorePoints = useMemo(
    () => listRestorePoints(presetId),
    [presetId],
  );

  useEffect(() => {
    setRestorePointId((current) => {
      if (restorePoints.length === 0) return '';
      if (current && restorePoints.some((point) => point.id === current)) {
        return current;
      }
      return restorePoints[0].id;
    });
  }, [restorePoints]);

  const resetWizard = useCallback(() => {
    operationRef.current += 1;
    setPhase('select');
    setFiles([]);
    setVerifications([]);
    setLogs([]);
    setIntegrity('pending');
    setBusy(false);
  }, []);

  useEffect(() => {
    resetWizard();
  }, [restorePointId, resetWizard]);

  const selectedRestorePoint = useMemo<RestorePoint | null>(
    () => restorePoints.find((point) => point.id === restorePointId) ?? null,
    [restorePoints, restorePointId],
  );

  const verificationLookup = useMemo(() => {
    const map = new Map<string, VerificationResult>();
    verifications.forEach((result) => {
      map.set(result.file.path, result);
    });
    return map;
  }, [verifications]);

  const handlePresetChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (isPresetId(value)) {
        setPresetId(value);
      }
    },
    [setPresetId],
  );

  const handleFrequencyChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value as Frequency;
      if (!isFrequency(value)) return;
      setSchedule((prev) => ({
        ...prev,
        frequency: value,
      }));
    },
    [setSchedule],
  );

  const handleTimeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSchedule((prev) => ({
        ...prev,
        time: value || prev.time,
      }));
    },
    [setSchedule],
  );

  const handleDayChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value as Weekday;
      if (!isWeekday(value)) return;
      setSchedule((prev) => ({
        ...prev,
        day: value,
      }));
    },
    [setSchedule],
  );

  const handleRetentionChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10);
      setSchedule((prev) => ({
        ...prev,
        retention: Number.isFinite(value) && value > 0 ? value : prev.retention,
      }));
    },
    [setSchedule],
  );

  const handleRestorePointChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setRestorePointId(event.target.value);
    },
    [],
  );

  const handleRestore = useCallback(async () => {
    if (!selectedRestorePoint || busy) return;

    const opId = operationRef.current + 1;
    operationRef.current = opId;

    setBusy(true);
    setPhase('enumerating');
    setIntegrity('pending');
    setVerifications([]);
    setFiles([]);
    setLogs([`Starting restore from ${selectedRestorePoint.label}`]);

    try {
      const enumerated = await enumeratePresetFiles(selectedRestorePoint.preset);
      if (operationRef.current !== opId) return;

      setFiles(enumerated);
      setLogs((prev) => [
        ...prev,
        `Enumerated ${enumerated.length} file${
          enumerated.length === 1 ? '' : 's'
        } for ${selectedRestorePoint.label}.`,
      ]);

      setPhase('verifying');

      const verificationResults = await verifyRestorePoint(
        selectedRestorePoint,
        enumerated,
      );
      if (operationRef.current !== opId) return;

      setVerifications(verificationResults);
      const hasIssues = verificationResults.some((result) => !result.ok);
      const perFileLogs = verificationResults.map((result) =>
        result.ok
          ? `✔ ${result.file.path} checksum verified.`
          : `✖ ${result.file.path} checksum mismatch (expected ${shortHash(
              result.expected,
            )}, got ${shortHash(result.actual)}).`,
      );
      setLogs((prev) => [
        ...prev,
        ...perFileLogs,
        hasIssues
          ? 'Integrity check completed with mismatches.'
          : 'Integrity check completed successfully.',
      ]);
      setIntegrity(hasIssues ? 'issues' : 'verified');
      setPhase('complete');
    } catch (error) {
      if (operationRef.current !== opId) return;
      const message =
        error instanceof Error ? error.message : 'Unknown restore error';
      setLogs((prev) => [...prev, `Restore aborted: ${message}`]);
      setIntegrity('issues');
      setPhase('complete');
    } finally {
      if (operationRef.current === opId) {
        setBusy(false);
      }
    }
  }, [busy, selectedRestorePoint]);

  const scheduleSummary = useMemo(
    () => describeSchedule(schedule),
    [schedule],
  );

  const integrityLabel = useMemo(() => {
    switch (integrity) {
      case 'verified':
        return 'Integrity: Verified';
      case 'issues':
        return 'Integrity: Issues detected';
      default:
        return 'Integrity: Pending verification';
    }
  }, [integrity]);

  const integrityClass =
    integrity === 'verified'
      ? 'text-green-400'
      : integrity === 'issues'
      ? 'text-red-400'
      : 'text-ubt-grey';

  const steps = useMemo(
    () =>
      stepSequence.map((id) => {
        const stepIndex = stepSequence.indexOf(id);
        const currentIndex = stepSequence.indexOf(phase);
        const status: 'complete' | 'current' | 'upcoming' =
          phase === 'complete'
            ? stepIndex <= currentIndex
              ? 'complete'
              : 'upcoming'
            : stepIndex < currentIndex
            ? 'complete'
            : stepIndex === currentIndex
            ? 'current'
            : 'upcoming';

        return {
          id,
          label: stepLabels[id],
          status,
        };
      }),
    [phase],
  );

  return (
    <div
      className="flex h-full w-full flex-col bg-ub-cool-grey text-white"
      data-testid="backup-app"
    >
      <header className="border-b border-white/10 px-4 py-3">
        <h1 className="text-xl font-semibold">Backup Planner</h1>
        <p className="text-sm text-ubt-grey">
          Create safe backup routines and rehearse restores with simulated data.
        </p>
      </header>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-4 rounded-lg border border-white/10 bg-black/30 p-4">
            <div>
              <h2 className="text-lg font-semibold">Presets</h2>
              <p className="text-sm text-ubt-grey">
                Choose what the nightly job protects. Presets can be combined
                with custom schedules.
              </p>
            </div>
            <div
              role="radiogroup"
              aria-label="Backup preset"
              className="space-y-3"
            >
              {BACKUP_PRESETS.map((preset) => {
                const selected = preset.id === selectedPreset.id;
                return (
                  <label
                    key={preset.id}
                    className={`block rounded-lg border p-3 transition focus-within:ring-2 focus-within:ring-ub-orange ${
                      selected
                        ? 'border-ub-orange bg-black/40 shadow-lg shadow-ub-orange/10'
                        : 'border-white/10 bg-black/20 hover:border-white/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="backup-preset"
                      value={preset.id}
                      checked={selected}
                      onChange={handlePresetChange}
                      className="sr-only"
                      aria-label={preset.label}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold">
                        {preset.label}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-ubt-grey">
                        {preset.recommended}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ubt-grey">
                      {preset.description}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-ubt-grey">
                      {preset.includes.map((entry) => (
                        <li key={entry} className="flex items-center gap-2">
                          <span aria-hidden className="text-ubt-grey">
                            •
                          </span>
                          <span className="font-mono text-xs text-white/80">
                            {entry}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </label>
                );
              })}
            </div>
            <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Schedule</h3>
                <span className="text-xs uppercase tracking-wide text-ubt-grey">
                  Persistent via localStorage
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-ubt-grey">
                  Frequency
                  <select
                    aria-label="Backup frequency"
                    value={schedule.frequency}
                    onChange={handleFrequencyChange}
                    className="mt-1 w-full rounded border border-white/20 bg-black/50 px-2 py-1 text-white focus:border-ub-orange focus:outline-none"
                  >
                    {FREQUENCIES.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-ubt-grey">
                  Backup time
                  <input
                    aria-label="Backup time"
                    type="time"
                    value={schedule.time}
                    onChange={handleTimeChange}
                    disabled={schedule.frequency === 'manual' || schedule.frequency === 'hourly'}
                    className="mt-1 w-full rounded border border-white/20 bg-black/50 px-2 py-1 text-white focus:border-ub-orange focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
                <label className="text-sm text-ubt-grey">
                  Weekday
                  <select
                    aria-label="Weekday"
                    value={schedule.day}
                    onChange={handleDayChange}
                    disabled={schedule.frequency !== 'weekly'}
                    className="mt-1 w-full rounded border border-white/20 bg-black/50 px-2 py-1 text-white focus:border-ub-orange focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-ubt-grey">
                  Retention (snapshots)
                  <input
                    aria-label="Retention"
                    type="number"
                    min={1}
                    max={90}
                    value={schedule.retention}
                    onChange={handleRetentionChange}
                    className="mt-1 w-full rounded border border-white/20 bg-black/50 px-2 py-1 text-white focus:border-ub-orange focus:outline-none"
                  />
                </label>
              </div>
              <p
                className="text-sm text-white"
                data-testid="schedule-summary"
              >
                {scheduleSummary}
              </p>
              <p className="text-xs text-ubt-grey">
                Preset tip: {selectedPreset.scheduleTip}
              </p>
            </div>
          </section>
          <section className="space-y-4 rounded-lg border border-white/10 bg-black/30 p-4">
            <div>
              <h2 className="text-lg font-semibold">Restore wizard</h2>
              <p className="text-sm text-ubt-grey">
                Run through a rehearsal restore to ensure integrity before an
                incident. File enumeration and checksum validation are
                simulated for safety.
              </p>
            </div>
            <div className="space-y-3">
              <label className="block text-sm text-ubt-grey">
                Restore point
                <select
                  aria-label="Restore point"
                  value={restorePointId}
                  onChange={handleRestorePointChange}
                  className="mt-1 w-full rounded border border-white/20 bg-black/50 px-2 py-1 text-white focus:border-ub-orange focus:outline-none"
                >
                  {restorePoints.length === 0 ? (
                    <option value="" disabled>
                      No snapshots available
                    </option>
                  ) : (
                    restorePoints.map((point) => (
                      <option key={point.id} value={point.id}>
                        {point.label} · {point.size}
                      </option>
                    ))
                  )}
                </select>
              </label>
              {selectedRestorePoint ? (
                <div className="rounded border border-white/10 bg-black/40 p-3 text-xs text-ubt-grey">
                  <p className="text-sm font-semibold text-white">
                    {selectedRestorePoint.label}
                  </p>
                  <p>{selectedRestorePoint.summary}</p>
                  <p className="mt-1 uppercase tracking-wide text-[0.65rem] text-ubt-grey">
                    Captured {new Date(selectedRestorePoint.createdAt).toLocaleString()} — {selectedRestorePoint.size}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ubt-grey">
                  Select a snapshot to begin the rehearsal restore.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={!selectedRestorePoint || busy}
                  className="rounded bg-ub-orange px-3 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Start restore
                </button>
                <button
                  type="button"
                  onClick={resetWizard}
                  className="rounded border border-white/20 px-3 py-2 text-sm text-ubt-grey transition hover:border-white/40 hover:text-white"
                >
                  Reset
                </button>
              </div>
              <ol className="space-y-1 text-sm text-ubt-grey" aria-label="Restore steps">
                {steps.map((step) => (
                  <li key={step.id} className="flex items-center gap-2">
                    <span
                      className={`text-xs ${
                        step.status === 'complete'
                          ? 'text-green-400'
                          : step.status === 'current'
                          ? 'text-ub-orange'
                          : 'text-ubt-grey'
                      }`}
                      aria-hidden
                    >
                      {step.status === 'complete'
                        ? '✔'
                        : step.status === 'current'
                        ? '➜'
                        : '•'}
                    </span>
                    <span
                      className={
                        step.status === 'current'
                          ? 'text-white'
                          : step.status === 'complete'
                          ? 'text-green-400'
                          : undefined
                      }
                    >
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="rounded border border-white/10 bg-black/40 p-3">
                <p
                  className={`text-sm font-semibold ${integrityClass}`}
                  data-testid="restore-status"
                >
                  {integrityLabel}
                </p>
                <ul
                  role="log"
                  aria-live="polite"
                  data-testid="restore-log"
                  className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-ubt-grey"
                >
                  {logs.length === 0 ? (
                    <li>No restore activity yet.</li>
                  ) : (
                    logs.map((entry, index) => (
                      <li key={`${entry}-${index}`}>{entry}</li>
                    ))
                  )}
                </ul>
              </div>
              {files.length > 0 && (
                <div className="max-h-48 overflow-auto rounded border border-white/10">
                  <table
                    className="min-w-full divide-y divide-white/10 text-left text-xs"
                    data-testid="restore-files"
                  >
                    <thead className="bg-black/40 uppercase tracking-wide text-ubt-grey">
                      <tr>
                        <th className="px-3 py-2 font-medium">File</th>
                        <th className="px-3 py-2 font-medium">Size</th>
                        <th className="px-3 py-2 font-medium">Checksum</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-black/20">
                      {files.map((file) => {
                        const result = verificationLookup.get(file.path);
                        return (
                          <tr key={file.path} className="align-top">
                            <td className="px-3 py-2 font-mono text-[0.7rem] text-white/80" title={file.modified}>
                              {file.path}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-ubt-grey">
                              {formatBytes(file.size)}
                            </td>
                            <td className="px-3 py-2 font-mono text-[0.7rem] text-ubt-grey">
                              {shortHash(file.checksum)}
                            </td>
                            <td className="px-3 py-2">
                              {result ? (
                                result.ok ? (
                                  <span className="text-green-400">Verified</span>
                                ) : (
                                  <span className="text-red-400">
                                    Mismatch ({shortHash(result.actual)})
                                  </span>
                                )
                              ) : (
                                <span className="text-ubt-grey">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BackupApp;
