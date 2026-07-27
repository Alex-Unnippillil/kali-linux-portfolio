"use client";

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  InvalidPassphraseError,
  RestoreMode,
  createEncryptedBackup,
  restoreFromBackup,
} from '../../utils/backup';

interface BackupRestoreProps {
  defaultRestoreMode?: RestoreMode;
  fileNamePrefix?: string;
}

const DEFAULT_FILENAME_PREFIX = 'kali-backup';

const formatTimestamp = () => {
  const now = new Date();
  return now
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '-');
};

const BackupRestore: React.FC<BackupRestoreProps> = ({
  defaultRestoreMode = 'merge',
  fileNamePrefix = DEFAULT_FILENAME_PREFIX,
}) => {
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreMode, setRestoreMode] = useState<RestoreMode>(defaultRestoreMode);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const disableActions = isWorking;

  const announce = useCallback((text: string) => {
    setLiveMessage(text);
  }, []);

  const resetFeedback = useCallback(() => {
    setMessage(null);
    setError(null);
    announce('');
  }, [announce]);

  const handleBackup = useCallback(async () => {
    if (!backupPassphrase.trim()) {
      const msg = 'Enter a passphrase to create a backup.';
      setError(msg);
      announce(msg);
      return;
    }
    setIsWorking(true);
    resetFeedback();
    try {
      const data = await createEncryptedBackup(backupPassphrase);
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = formatTimestamp();
      link.download = `${fileNamePrefix}-${timestamp}.bin`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      const success = 'Backup created successfully.';
      setMessage(success);
      announce(success);
    } catch (err) {
      console.error(err);
      const failure = 'Unable to create backup. Please try again.';
      setError(failure);
      announce(failure);
    } finally {
      setIsWorking(false);
    }
  }, [announce, backupPassphrase, fileNamePrefix, resetFeedback]);

  const handleRestore = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      const msg = 'Select a backup file before restoring.';
      setError(msg);
      announce(msg);
      return;
    }
    if (!restorePassphrase.trim()) {
      const msg = 'Enter the backup passphrase to restore.';
      setError(msg);
      announce(msg);
      return;
    }

    setIsWorking(true);
    resetFeedback();
    try {
      const buffer = await file.arrayBuffer();
      await restoreFromBackup(buffer, restorePassphrase, { mode: restoreMode });
      const success = restoreMode === 'replace'
        ? 'Restore complete. Existing data was replaced.'
        : 'Restore complete. Data merged successfully.';
      setMessage(success);
      announce(success);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      let failure = 'Unable to restore the selected backup.';
      if (err instanceof InvalidPassphraseError) {
        failure = 'The provided passphrase is incorrect. Please try again.';
      }
      setError(failure);
      announce(failure);
    } finally {
      setIsWorking(false);
    }
  }, [announce, resetFeedback, restoreMode, restorePassphrase]);

  const restoreDescription = useMemo(() => (
    restoreMode === 'replace'
      ? 'Replace existing data with the backup contents.'
      : 'Merge backup data with your current data.'
  ), [restoreMode]);

  return (
    <div className="flex flex-col gap-4 text-ubt-grey" aria-live="off">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-white">Create backup</h2>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Passphrase</span>
          <input
            type="password"
            value={backupPassphrase}
            onChange={event => setBackupPassphrase(event.target.value)}
            className="rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-white"
            placeholder="Enter a passphrase"
            aria-describedby="backup-passphrase-help"
          />
        </label>
        <p id="backup-passphrase-help" className="text-xs text-ubt-grey/70">
          You&apos;ll need this passphrase to restore the backup later.
        </p>
        <button
          type="button"
          onClick={handleBackup}
          className="self-start rounded bg-ubt-blue px-4 py-2 font-semibold text-white hover:bg-ubt-blue/90 disabled:opacity-50"
          disabled={disableActions}
        >
          {isWorking ? 'Working…' : 'Download backup'}
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-white">Restore backup</h2>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Backup file</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".bin,application/octet-stream"
            className="rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Passphrase</span>
          <input
            type="password"
            value={restorePassphrase}
            onChange={event => setRestorePassphrase(event.target.value)}
            className="rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-white"
            placeholder="Enter the backup passphrase"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Restore mode</span>
          <select
            value={restoreMode}
            onChange={event => setRestoreMode(event.target.value as RestoreMode)}
            className="rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-white"
          >
            <option value="merge">Merge with existing data</option>
            <option value="replace">Replace existing data</option>
          </select>
        </label>
        <p className="text-xs text-ubt-grey/70" aria-live="polite">{restoreDescription}</p>
        <button
          type="button"
          onClick={handleRestore}
          className="self-start rounded bg-ubt-blue px-4 py-2 font-semibold text-white hover:bg-ubt-blue/90 disabled:opacity-50"
          disabled={disableActions}
        >
          {isWorking ? 'Working…' : 'Restore backup'}
        </button>
      </section>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>

      {message && (
        <p className="rounded border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-200" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default BackupRestore;

