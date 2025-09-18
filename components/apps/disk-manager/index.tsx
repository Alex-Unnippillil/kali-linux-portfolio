'use client';

import React, {
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
  FormEvent,
} from 'react';
import {
  initialDiskState,
  filesystemOptions,
  type Disk,
  type DiskPartition,
} from '../../../utils/diskState';

type ActionType = 'resize' | 'format' | 'mount' | null;

type LogEntry = {
  id: string;
  message: string;
  type: 'info' | 'warning';
};

const simulationNotice =
  'Simulation only — this utility updates mock state to demonstrate disk management workflows.';

const formatSize = (value: number) => `${value.toFixed(1)} GB`;

const DiskManagerApp: React.FC = () => {
  const [state, setState] = useState(initialDiskState);
  const [selectedDiskId, setSelectedDiskId] = useState<string>(
    initialDiskState.disks[0]?.id ?? ''
  );
  const [selectedPartitionId, setSelectedPartitionId] = useState<string | null>(
    initialDiskState.disks[0]?.partitions[0]?.id ?? null
  );
  const [action, setAction] = useState<ActionType>(null);
  const [sizeInput, setSizeInput] = useState('');
  const [filesystemInput, setFilesystemInput] = useState(filesystemOptions[0]);
  const [mountPointInput, setMountPointInput] = useState('');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const selectedDisk = useMemo<Disk | undefined>(
    () => state.disks.find((disk) => disk.id === selectedDiskId) ?? state.disks[0],
    [state.disks, selectedDiskId]
  );

  useEffect(() => {
    if (!selectedDisk) return;
    if (!selectedPartitionId || !selectedDisk.partitions.some((p) => p.id === selectedPartitionId)) {
      setSelectedPartitionId(selectedDisk.partitions[0]?.id ?? null);
    }
  }, [selectedDisk, selectedPartitionId]);

  const selectedPartition = useMemo<DiskPartition | null>(
    () =>
      selectedDisk?.partitions.find((partition) => partition.id === selectedPartitionId) ??
      selectedDisk?.partitions[0] ??
      null,
    [selectedDisk, selectedPartitionId]
  );

  useEffect(() => {
    if (!selectedPartition) return;
    if (!action) {
      setSizeInput(selectedPartition.sizeGB.toString());
      setFilesystemInput(selectedPartition.filesystem);
      setMountPointInput(selectedPartition.mountPoint ?? '');
    }
  }, [selectedPartition, action]);

  const pushLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [{ id: `${Date.now()}-${Math.random()}`, message, type }, ...prev].slice(0, 10));
  };

  const resetAction = (nextPartition?: DiskPartition) => {
    const reference = nextPartition ?? selectedPartition;
    setAction(null);
    setConfirmationInput('');
    if (reference) {
      setSizeInput(reference.sizeGB.toString());
      setFilesystemInput(reference.filesystem);
      setMountPointInput(reference.mountPoint ?? '');
    }
  };

  const handleDiskChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedDiskId(event.target.value);
    setSelectedPartitionId(null);
    setAction(null);
    setWarning(null);
  };

  const handlePartitionSelect = (partitionId: string) => {
    setSelectedPartitionId(partitionId);
    setAction(null);
    setConfirmationInput('');
    setWarning(null);
  };

  const startAction = (type: ActionType) => {
    if (!selectedPartition) return;
    if (selectedPartition.isEncrypted) {
      const message = `Partition ${selectedPartition.name} is encrypted. Decrypt it before attempting ${type}.`;
      setWarning(message);
      pushLog(message, 'warning');
      return;
    }

    if (type === 'format' && selectedPartition.isBoot) {
      const message = `Boot partition ${selectedPartition.name} cannot be formatted from this simulator.`;
      setWarning(message);
      pushLog(message, 'warning');
      return;
    }

    setAction(type);
    setConfirmationInput('');
    if (type === 'resize') {
      setSizeInput(selectedPartition.sizeGB.toString());
    }
    if (type === 'format') {
      setFilesystemInput(selectedPartition.filesystem);
    }
    if (type === 'mount') {
      setMountPointInput(selectedPartition.mountPoint ?? '');
    }

    if (selectedPartition.isBoot && type !== 'mount') {
      setWarning(
        `Caution: ${selectedPartition.name} is a boot partition. Ensure you have recovery media before proceeding.`
      );
    } else {
      setWarning(null);
    }
  };

  const handleResize = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDisk || !selectedPartition) return;

    const newSize = Number(sizeInput);
    if (!Number.isFinite(newSize) || newSize <= 0) {
      setWarning('Enter a valid size greater than 0 GB.');
      return;
    }

    const otherSize = selectedDisk.partitions
      .filter((partition) => partition.id !== selectedPartition.id)
      .reduce((total, partition) => total + partition.sizeGB, 0);
    const maxSize = selectedDisk.sizeGB - otherSize;
    if (newSize > maxSize + 0.0001) {
      setWarning(`The maximum available size is ${maxSize.toFixed(1)} GB for this partition.`);
      return;
    }

    if (newSize < selectedPartition.usedGB - 0.0001) {
      setWarning(
        `New size cannot be smaller than the used capacity (${formatSize(selectedPartition.usedGB)}).`
      );
      return;
    }

    const shrinking = newSize < selectedPartition.sizeGB - 0.0001;
    if (shrinking && confirmationInput !== selectedPartition.name) {
      setWarning(`Type "${selectedPartition.name}" to confirm shrinking the partition.`);
      return;
    }

    const roundedSize = Number(newSize.toFixed(1));
    const updatedPartition: DiskPartition = {
      ...selectedPartition,
      sizeGB: roundedSize,
      usedGB: Math.min(selectedPartition.usedGB, roundedSize),
    };

    setState((prev) => ({
      disks: prev.disks.map((disk) =>
        disk.id === selectedDisk.id
          ? {
              ...disk,
              partitions: disk.partitions.map((partition) =>
                partition.id === selectedPartition.id ? updatedPartition : partition
              ),
            }
          : disk
      ),
    }));

    pushLog(
      `Resized ${selectedPartition.name} to ${formatSize(roundedSize)}${
        shrinking ? ' (shrink)' : ''
      }.`
    );
    setWarning('Resize simulated. Run filesystem checks before using the partition.');
    resetAction(updatedPartition);
  };

  const handleFormat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDisk || !selectedPartition) return;

    if (confirmationInput !== selectedPartition.name) {
      setWarning(`Type "${selectedPartition.name}" to confirm formatting.`);
      return;
    }

    const updatedPartition: DiskPartition = {
      ...selectedPartition,
      filesystem: filesystemInput,
      usedGB: 0,
      isEncrypted: false,
      mountPoint: null,
    };

    setState((prev) => ({
      disks: prev.disks.map((disk) =>
        disk.id === selectedDisk.id
          ? {
              ...disk,
              partitions: disk.partitions.map((partition) =>
                partition.id === selectedPartition.id ? updatedPartition : partition
              ),
            }
          : disk
      ),
    }));

    pushLog(`Formatted ${selectedPartition.name} as ${filesystemInput}.`);
    setWarning('Format simulated. Restore data from backups if required.');
    resetAction(updatedPartition);
  };

  const handleMount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDisk || !selectedPartition) return;

    const mountPoint = mountPointInput.trim();
    if (!mountPoint) {
      setWarning('Provide a mount point before continuing.');
      return;
    }

    const updatedPartition: DiskPartition = {
      ...selectedPartition,
      mountPoint,
    };

    setState((prev) => ({
      disks: prev.disks.map((disk) =>
        disk.id === selectedDisk.id
          ? {
              ...disk,
              partitions: disk.partitions.map((partition) =>
                partition.id === selectedPartition.id ? updatedPartition : partition
              ),
            }
          : disk
      ),
    }));

    pushLog(
      `${selectedPartition.mountPoint ? 'Updated mount point' : 'Mounted'} ${selectedPartition.name} at ${mountPoint}.`
    );
    setWarning('Mount simulated. Update /etc/fstab in a real environment.');
    resetAction(updatedPartition);
  };

  const diskUsage = selectedDisk
    ? selectedDisk.partitions.reduce((total, partition) => total + partition.usedGB, 0)
    : 0;
  const diskUsagePercent = selectedDisk ? Math.min(100, (diskUsage / selectedDisk.sizeGB) * 100) : 0;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-ub-cool-grey p-4 text-white">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Disk Manager</h1>
          <p className="text-xs text-ubt-grey">
            Inspect partitions, simulate resizing, formatting, and mounting flows safely.
          </p>
        </div>
        <label className="flex w-full flex-col text-xs text-ubt-grey md:w-auto md:text-sm">
          <span className="mb-1 uppercase tracking-wide">Disk</span>
          <select
            value={selectedDisk?.id ?? ''}
            onChange={handleDiskChange}
            className="rounded border border-gray-700 bg-black px-2 py-1 text-white focus:border-ubt-blue focus:outline-none"
            aria-label="Select disk"
          >
            {state.disks.map((disk) => (
              <option key={disk.id} value={disk.id}>
                {disk.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
        {simulationNotice}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-ubt-grey">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
            Partition Layout
          </h2>
          {selectedDisk && (
            <span>
              {formatSize(diskUsage)} used / {formatSize(selectedDisk.sizeGB)} total ({diskUsagePercent.toFixed(1)}%)
            </span>
          )}
        </div>
        <div className="flex h-16 overflow-hidden rounded border border-gray-800">
          {selectedDisk?.partitions.map((partition, index) => {
            const isSelected = partition.id === selectedPartition?.id;
            return (
              <button
                key={partition.id}
                type="button"
                aria-label={`Select partition ${partition.name}`}
                onClick={() => handlePartitionSelect(partition.id)}
                className={`relative flex-1 border-r border-gray-900 text-left transition-colors last:border-r-0 ${
                  isSelected ? 'bg-ubt-blue text-black' : 'bg-black/40 hover:bg-black/60'
                }`}
                style={{ flexGrow: partition.sizeGB, flexBasis: 0 }}
              >
                <span className="absolute left-2 top-2 text-xs font-semibold">{partition.name}</span>
                <span className="absolute left-2 bottom-2 text-[11px] text-ubt-grey">
                  {formatSize(partition.sizeGB)}
                </span>
                {partition.isEncrypted && (
                  <span className="absolute right-2 top-2 text-[10px] uppercase tracking-wide text-yellow-300">
                    Enc
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <section className="overflow-hidden rounded border border-gray-800 bg-black/40">
          <h2 className="border-b border-gray-800 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-ubt-grey">
            Partitions
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-black/40 text-ubt-grey">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Size</th>
                  <th className="px-3 py-2 font-semibold">Used</th>
                  <th className="px-3 py-2 font-semibold">Filesystem</th>
                  <th className="px-3 py-2 font-semibold">Mount</th>
                  <th className="px-3 py-2 font-semibold">Flags</th>
                </tr>
              </thead>
              <tbody>
                {selectedDisk?.partitions.map((partition) => {
                  const isSelected = partition.id === selectedPartition?.id;
                  return (
                    <tr
                      key={partition.id}
                      className={`${isSelected ? 'bg-ubt-blue/10' : 'hover:bg-black/40'} cursor-pointer`}
                      onClick={() => handlePartitionSelect(partition.id)}
                    >
                      <td className="px-3 py-2 text-white">{partition.name}</td>
                      <td className="px-3 py-2 text-ubt-grey">{partition.role}</td>
                      <td className="px-3 py-2 text-ubt-grey">{formatSize(partition.sizeGB)}</td>
                      <td className="px-3 py-2 text-ubt-grey">{formatSize(partition.usedGB)}</td>
                      <td className="px-3 py-2 text-ubt-grey">{partition.filesystem}</td>
                      <td className="px-3 py-2 text-ubt-grey">{partition.mountPoint ?? 'Not mounted'}</td>
                      <td className="px-3 py-2 text-ubt-grey">
                        {[partition.isBoot ? 'boot' : null, partition.isEncrypted ? 'encrypted' : null]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded border border-gray-800 bg-black/40 p-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">
              Selected Partition
            </h2>
            <p
              className="mt-1 text-lg font-semibold text-white"
              data-testid="selected-partition-name"
            >
              {selectedPartition?.name ?? 'None'}
            </p>
            {selectedPartition && (
              <>
                <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-800">
                  <div
                    className="h-full bg-ubt-blue"
                    style={{
                      width: `${Math.min(100, (selectedPartition.usedGB / selectedPartition.sizeGB) * 100).toFixed(1)}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-ubt-grey">
                  {formatSize(selectedPartition.usedGB)} used of {formatSize(selectedPartition.sizeGB)}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-ubt-grey">
                  <div>
                    <dt className="uppercase tracking-wide text-[10px]">Filesystem</dt>
                    <dd className="text-white">{selectedPartition.filesystem}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-[10px]">Mount</dt>
                    <dd className="text-white">{selectedPartition.mountPoint ?? 'Not mounted'}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-[10px]">Role</dt>
                    <dd className="text-white">{selectedPartition.role}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-[10px]">Flags</dt>
                    <dd className="text-white">
                      {[selectedPartition.isBoot ? 'Boot' : null, selectedPartition.isEncrypted ? 'Encrypted' : null]
                        .filter(Boolean)
                        .join(', ') || 'None'}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              className="rounded bg-ubt-blue px-3 py-1 text-black hover:bg-ubt-blue/80"
              onClick={() => startAction('resize')}
            >
              Resize
            </button>
            <button
              type="button"
              className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-500"
              onClick={() => startAction('format')}
            >
              Format
            </button>
            <button
              type="button"
              className="rounded bg-gray-700 px-3 py-1 text-white hover:bg-gray-600"
              onClick={() => startAction('mount')}
            >
              Mount
            </button>
          </div>

          {action === 'resize' && selectedPartition && (
            <form onSubmit={handleResize} className="space-y-2 text-xs">
              <h3 className="text-sm font-semibold text-white">Resize Partition</h3>
              <label className="flex flex-col gap-1">
                <span className="uppercase tracking-wide text-ubt-grey">New size (GB)</span>
                <input
                  type="number"
                  step="0.1"
                  value={sizeInput}
                  onChange={(event) => setSizeInput(event.target.value)}
                  className="rounded border border-gray-700 bg-black px-2 py-1 text-white focus:border-ubt-blue focus:outline-none"
                />
              </label>
              <p className="text-ubt-grey">
                Maximum size: {formatSize(selectedDisk.sizeGB)} total minus other allocations.
              </p>
              {Number(sizeInput) < selectedPartition.sizeGB && (
                <label className="flex flex-col gap-1">
                  <span className="uppercase tracking-wide text-ubt-grey">
                    Type "{selectedPartition.name}" to confirm shrink
                  </span>
                  <input
                    value={confirmationInput}
                    onChange={(event) => setConfirmationInput(event.target.value)}
                    className="rounded border border-gray-700 bg-black px-2 py-1 text-white focus:border-ubt-blue focus:outline-none"
                  />
                </label>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded bg-ubt-blue px-3 py-1 text-black hover:bg-ubt-blue/80"
                >
                  Confirm Resize
                </button>
                <button
                  type="button"
                  className="rounded bg-gray-700 px-3 py-1 text-white hover:bg-gray-600"
                  onClick={() => resetAction()}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {action === 'format' && selectedPartition && (
            <form onSubmit={handleFormat} className="space-y-2 text-xs">
              <h3 className="text-sm font-semibold text-white">Format Partition</h3>
              <label className="flex flex-col gap-1">
                <span className="uppercase tracking-wide text-ubt-grey">New filesystem</span>
                <select
                  value={filesystemInput}
                  onChange={(event) => setFilesystemInput(event.target.value)}
                  className="rounded border border-gray-700 bg-black px-2 py-1 text-white focus:border-ubt-blue focus:outline-none"
                  aria-label="New filesystem"
                >
                  {filesystemOptions.map((fs) => (
                    <option key={fs} value={fs}>
                      {fs}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="uppercase tracking-wide text-ubt-grey">
                  Type "{selectedPartition.name}" to confirm formatting
                </span>
                <input
                  value={confirmationInput}
                  onChange={(event) => setConfirmationInput(event.target.value)}
                  className="rounded border border-gray-700 bg-black px-2 py-1 text-white focus:border-red-500 focus:outline-none"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-500"
                >
                  Confirm Format
                </button>
                <button
                  type="button"
                  className="rounded bg-gray-700 px-3 py-1 text-white hover:bg-gray-600"
                  onClick={() => resetAction()}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {action === 'mount' && selectedPartition && (
            <form onSubmit={handleMount} className="space-y-2 text-xs">
              <h3 className="text-sm font-semibold text-white">Mount Partition</h3>
              <label className="flex flex-col gap-1">
                <span className="uppercase tracking-wide text-ubt-grey">Mount point</span>
                <input
                  value={mountPointInput}
                  onChange={(event) => setMountPointInput(event.target.value)}
                  className="rounded border border-gray-700 bg-black px-2 py-1 text-white focus:border-ubt-blue focus:outline-none"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded bg-gray-200 px-3 py-1 text-black hover:bg-gray-100"
                >
                  Confirm Mount
                </button>
                <button
                  type="button"
                  className="rounded bg-gray-700 px-3 py-1 text-white hover:bg-gray-600"
                  onClick={() => resetAction()}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {warning && (
        <div
          className="rounded border border-yellow-500/60 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200"
          role="alert"
        >
          {warning}
        </div>
      )}

      <section className="rounded border border-gray-800 bg-black/40 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">Operation Log</h2>
        <ul className="mt-2 space-y-2 text-xs">
          {logs.length === 0 ? (
            <li className="text-ubt-grey">No operations recorded yet.</li>
          ) : (
            logs.map((log) => (
              <li
                key={log.id}
                className={`rounded border px-3 py-2 ${
                  log.type === 'warning'
                    ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200'
                    : 'border-gray-700 bg-black/60 text-ubt-grey'
                }`}
              >
                {log.message}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
};

export default DiskManagerApp;
export const displayDiskManager = () => <DiskManagerApp />;
