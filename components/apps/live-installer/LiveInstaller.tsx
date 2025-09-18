import React, { useEffect, useMemo } from 'react';
import useLiveInstallerState, { DEFAULT_DEVICE_ID } from '../../../hooks/useLiveInstallerState';

const RESERVED_SYSTEM_GB = 4;
const PROGRESS_INCREMENT = 12;
const PROGRESS_TICK_MS = 400;

interface DeviceOption {
  id: string;
  label: string;
  capacity: number;
  notes: string;
}

interface FilesystemOption {
  id: string;
  label: string;
  description: string;
  href: string;
}

export const SIMULATED_DEVICES: DeviceOption[] = [
  {
    id: DEFAULT_DEVICE_ID,
    label: 'Portable SSD • 128 GB NVMe enclosure',
    capacity: 128,
    notes: 'Fast writes, ideal for frequent rebuilds.',
  },
  {
    id: 'usb-32',
    label: 'USB 3.1 Flash Drive • 32 GB',
    capacity: 32,
    notes: 'Balanced size for daily use.',
  },
  {
    id: 'usb-16',
    label: 'USB 2.0 Flash Drive • 16 GB',
    capacity: 16,
    notes: 'Legacy hardware compatibility.',
  },
];

export const FILESYSTEM_CHOICES: FilesystemOption[] = [
  {
    id: 'ext4',
    label: 'ext4 (Recommended)',
    description:
      'Stable default with journaling support and broad compatibility across Linux distributions.',
    href: 'https://www.kali.org/docs/usb/live-usb-persistence/',
  },
  {
    id: 'btrfs',
    label: 'Btrfs (Snapshots)',
    description:
      'Advanced features for snapshots and compression. Requires more RAM but helps recover quickly.',
    href: 'https://wiki.archlinux.org/title/btrfs',
  },
  {
    id: 'xfs',
    label: 'XFS (High throughput)',
    description:
      'Suited for large file workloads and sustained writes. Great for forensic collections.',
    href: 'https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_file_systems/assembly_considerations-when-choosing-an-xfs-file-system_configuring-and-managing-file-systems',
  },
];

const steps = [
  { title: 'Device', description: 'Pick the removable drive that will host Kali Live.' },
  {
    title: 'Persistence',
    description: 'Size the writable overlay while leaving headroom for the live system.',
  },
  { title: 'Filesystem', description: 'Choose how persistence should be formatted.' },
  { title: 'Simulation', description: 'Partition, format, and provision persistence.' },
  { title: 'Verification', description: 'Validate the media before first boot.' },
];

const formatEta = (progress: number) => {
  if (progress >= 100) return 'Complete';
  const remainingSteps = Math.ceil((100 - progress) / PROGRESS_INCREMENT);
  const seconds = remainingSteps * (PROGRESS_TICK_MS / 1000);
  return `~${Math.max(1, Math.round(seconds))}s remaining`;
};

const LiveInstaller: React.FC = () => {
  const { state, setState, clear } = useLiveInstallerState();
  const selectedDevice = useMemo(
    () => SIMULATED_DEVICES.find((device) => device.id === state.selectedDeviceId) || null,
    [state.selectedDeviceId],
  );

  useEffect(() => {
    if (!selectedDevice) {
      setState((prev) => ({ ...prev, selectedDeviceId: DEFAULT_DEVICE_ID }));
    }
  }, [selectedDevice, setState]);

  const maxPersistence = useMemo(() => {
    if (!selectedDevice) return 1;
    return Math.max(1, selectedDevice.capacity - RESERVED_SYSTEM_GB);
  }, [selectedDevice]);

  useEffect(() => {
    if (!selectedDevice) return;
    if (state.persistenceSize > maxPersistence) {
      setState((prev) => ({ ...prev, persistenceSize: maxPersistence }));
    } else if (state.persistenceSize < 1) {
      setState((prev) => ({ ...prev, persistenceSize: 1 }));
    }
  }, [selectedDevice, state.persistenceSize, maxPersistence, setState]);

  useEffect(() => {
    if (state.simulationStatus !== 'running') return;
    const interval = window.setInterval(() => {
      setState((prev) => {
        if (prev.simulationStatus !== 'running') {
          return prev;
        }
        let partitionProgress = prev.partitionProgress;
        let persistenceProgress = prev.persistenceProgress;
        let simulationStatus = prev.simulationStatus;

        if (partitionProgress < 100) {
          partitionProgress = Math.min(100, partitionProgress + PROGRESS_INCREMENT);
        } else if (persistenceProgress < 100) {
          persistenceProgress = Math.min(100, persistenceProgress + PROGRESS_INCREMENT);
        } else {
          simulationStatus = 'complete';
        }

        if (
          partitionProgress === prev.partitionProgress &&
          persistenceProgress === prev.persistenceProgress &&
          simulationStatus === prev.simulationStatus
        ) {
          return prev;
        }

        return {
          ...prev,
          partitionProgress,
          persistenceProgress,
          simulationStatus,
        };
      });
    }, PROGRESS_TICK_MS);

    return () => window.clearInterval(interval);
  }, [state.simulationStatus, setState]);

  useEffect(() => {
    if (state.simulationStatus === 'complete' && state.step === 3) {
      setState((prev) => ({ ...prev, step: 4 }));
    }
  }, [state.simulationStatus, state.step, setState]);

  useEffect(() => {
    if (state.verificationStatus !== 'running') return;
    const attempt = state.verificationAttempts;
    const timer = window.setTimeout(() => {
      setState((prev) => {
        if (prev.verificationStatus !== 'running') {
          return prev;
        }
        const shouldFail = attempt === 1;
        return {
          ...prev,
          verificationStatus: shouldFail ? 'failed' : 'success',
          lastVerificationError: shouldFail
            ? 'Checksum mismatch detected on the persistence volume. Remove and reinsert the media, then retry.'
            : null,
        };
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [state.verificationStatus, state.verificationAttempts, setState]);

  const goToStep = (index: number) => {
    setState((prev) => ({ ...prev, step: Math.min(Math.max(index, 0), steps.length - 1) }));
  };

  const goNext = () => goToStep(state.step + 1);
  const goBack = () => {
    if (state.step === 0) return;
    if (state.simulationStatus === 'running' || state.verificationStatus === 'running') return;
    goToStep(state.step - 1);
  };

  const startSimulation = () => {
    if (!selectedDevice) return;
    setState((prev) => ({
      ...prev,
      step: 3,
      simulationStatus: 'running',
      partitionProgress: 0,
      persistenceProgress: 0,
      verificationStatus: 'pending',
      verificationAttempts: 0,
      lastVerificationError: null,
    }));
  };

  const startVerification = () => {
    if (state.verificationStatus === 'running') return;
    setState((prev) => ({
      ...prev,
      verificationStatus: 'running',
      verificationAttempts: prev.verificationAttempts + 1,
    }));
  };

  const resetWizard = () => {
    clear();
  };

  const persistenceFreeSpace = selectedDevice
    ? Math.max(0, selectedDevice.capacity - RESERVED_SYSTEM_GB - state.persistenceSize)
    : 0;

  const canGoNext = useMemo(() => {
    switch (state.step) {
      case 0:
        return Boolean(state.selectedDeviceId);
      case 1:
        return state.persistenceSize >= 1 && state.persistenceSize <= maxPersistence;
      case 2:
        return Boolean(state.filesystem);
      case 3:
        return state.simulationStatus === 'complete';
      case 4:
        return state.verificationStatus === 'success';
      default:
        return false;
    }
  }, [state.step, state.selectedDeviceId, state.persistenceSize, state.filesystem, state.simulationStatus, state.verificationStatus, maxPersistence]);

  const hasSavedProgress =
    state.step !== 0 ||
    state.simulationStatus !== 'idle' ||
    state.verificationStatus === 'failed' ||
    state.verificationAttempts > 0;

  const primaryActionLabel = (() => {
    if (state.step === steps.length - 1) {
      return 'Finish';
    }
    if (state.step === 3) {
      return 'Go to verification';
    }
    return 'Next';
  })();

  const handlePrimaryAction = () => {
    if (state.step === steps.length - 1 && state.verificationStatus === 'success') {
      resetWizard();
      return;
    }
    if (canGoNext) {
      goNext();
    }
  };

  const renderStep = () => {
    switch (state.step) {
      case 0:
        return (
          <div className="space-y-4">
            <p className="text-sm text-ubt-grey">
              Pick the removable drive that matches your target hardware. The installer wipes it in the
              real world, so keep backups handy.
            </p>
            <div className="space-y-3" role="radiogroup" aria-label="Target device">
              {SIMULATED_DEVICES.map((device) => (
                <label
                  key={device.id}
                  className={`flex cursor-pointer flex-col rounded-lg border p-4 transition hover:border-ubt-blue focus-within:border-ubt-blue ${
                    state.selectedDeviceId === device.id
                      ? 'border-ubt-blue bg-ub-midnight'
                      : 'border-ubt-grey bg-ub-dark'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">{device.label}</span>
                    <span className="text-sm text-ubt-grey">{device.capacity} GB</span>
                  </div>
                  <p className="mt-2 text-sm text-ubt-grey">{device.notes}</p>
                  <input
                    type="radio"
                    name="live-installer-device"
                    className="sr-only"
                    value={device.id}
                    aria-label={device.label}
                    checked={state.selectedDeviceId === device.id}
                    onChange={() =>
                      setState((prev) => ({
                        ...prev,
                        selectedDeviceId: device.id,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-ubt-grey">
              Persistence keeps your changes between boots. Leave a few gigabytes free so Kali can
              decompress and run updates.
            </p>
            <label htmlFor="persistence-size" className="block text-sm font-medium">
              Persistent storage size
            </label>
              <input
                id="persistence-size"
                type="range"
                min={1}
                max={maxPersistence}
                value={state.persistenceSize}
                aria-label="Persistent storage size"
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    persistenceSize: Number(event.target.value),
                }))
              }
              className="w-full"
            />
            <div className="flex flex-wrap items-center justify-between text-sm text-ubt-grey">
              <span>{state.persistenceSize} GB allocated for persistence</span>
              {selectedDevice && (
                <span>
                  {persistenceFreeSpace} GB free after reserving {RESERVED_SYSTEM_GB} GB for the live system
                </span>
              )}
            </div>
            {selectedDevice && state.persistenceSize > maxPersistence - 2 && (
              <p className="rounded border border-amber-400 bg-amber-900/40 p-3 text-sm text-amber-100">
                You are very close to the device limit. Consider reducing persistence to keep upgrade space.
              </p>
            )}
            <a
              href="https://www.kali.org/docs/usb/live-usb-persistence/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm text-ubt-blue hover:underline"
            >
              Read the official Kali persistence sizing guidance
            </a>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-ubt-grey">
              Different filesystems trade speed, reliability, and advanced features. Pick one that matches
              your workflow.
            </p>
            <div className="space-y-3" role="radiogroup" aria-label="Persistence filesystem">
              {FILESYSTEM_CHOICES.map((fs) => (
                <label
                  key={fs.id}
                  className={`flex cursor-pointer flex-col rounded-lg border p-4 transition hover:border-ubt-blue focus-within:border-ubt-blue ${
                    state.filesystem === fs.id
                      ? 'border-ubt-blue bg-ub-midnight'
                      : 'border-ubt-grey bg-ub-dark'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">{fs.label}</span>
                    <a
                      href={fs.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-ubt-blue hover:underline"
                    >
                      Docs
                    </a>
                  </div>
                  <p className="mt-2 text-sm text-ubt-grey">{fs.description}</p>
                  <input
                    type="radio"
                    className="sr-only"
                    value={fs.id}
                    aria-label={fs.label}
                    checked={state.filesystem === fs.id}
                    onChange={() =>
                      setState((prev) => ({
                        ...prev,
                        filesystem: fs.id,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-ubt-grey">
              The installer walks through partitioning the device, formatting persistence, and copying a
              fresh ISO. Nothing is written to disk here—it is purely instructional.
            </p>
            <div className="rounded-lg border border-ubt-grey bg-ub-dark p-4">
              <h3 className="text-lg font-semibold">Planned layout</h3>
              <ul className="mt-2 space-y-1 text-sm text-ubt-grey">
                <li>• Device: {selectedDevice?.label ?? 'Unknown device'}</li>
                <li>• Persistence: {state.persistenceSize} GB on {state.filesystem}</li>
                <li>• Live system reserve: {RESERVED_SYSTEM_GB} GB</li>
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startSimulation}
                disabled={state.simulationStatus === 'running'}
                className={`rounded px-4 py-2 text-sm font-medium transition ${
                  state.simulationStatus === 'running'
                    ? 'cursor-not-allowed bg-ubt-grey text-ubc-grey'
                    : 'bg-ubt-blue text-white hover:bg-blue-500'
                }`}
              >
                {state.simulationStatus === 'complete' ? 'Rerun simulation' : 'Start simulation'}
              </button>
              {state.simulationStatus === 'running' && (
                <span className="text-sm text-ubt-grey">Working through steps…</span>
              )}
            </div>
            <section className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm text-ubt-grey">
                  <span>Partitioning device</span>
                  <span>{formatEta(state.partitionProgress)}</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={state.partitionProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Partitioning progress"
                  className="h-3 w-full rounded-full bg-ub-cool-grey"
                >
                  <div
                    className="h-3 rounded-full bg-ubt-blue transition-all"
                    style={{ width: `${state.partitionProgress}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-ubt-grey">
                  <span>Provisioning persistence</span>
                  <span>{formatEta(state.persistenceProgress)}</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={state.persistenceProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Persistence provisioning progress"
                  className="h-3 w-full rounded-full bg-ub-cool-grey"
                >
                  <div
                    className="h-3 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${state.persistenceProgress}%` }}
                  />
                </div>
              </div>
            </section>
            {state.simulationStatus === 'complete' ? (
              <p className="rounded border border-emerald-400 bg-emerald-900/40 p-3 text-sm text-emerald-100">
                Simulation complete. Proceed to verification to double-check the media before first boot.
              </p>
            ) : (
              <p className="text-xs text-ubt-grey">
                Need a refresher on each step? Review the{' '}
                <a
                  href="https://www.kali.org/docs/usb/kali-linux-live-usb-install/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-ubt-blue hover:underline"
                >
                  Kali live installer walkthrough
                </a>
                .
              </p>
            )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-ubt-grey">
              Run the post-install verification to ensure the persistence partition mounts cleanly. The
              first attempt intentionally fails to demonstrate recovery guidance.
            </p>
            <div className="rounded-lg border border-ubt-grey bg-ub-dark p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={startVerification}
                  disabled={state.verificationStatus === 'running'}
                  className={`rounded px-4 py-2 text-sm font-medium transition ${
                    state.verificationStatus === 'running'
                      ? 'cursor-not-allowed bg-ubt-grey text-ubc-grey'
                      : 'bg-ubt-blue text-white hover:bg-blue-500'
                  }`}
                >
                  {state.verificationStatus === 'success' ? 'Re-run verification' : 'Start verification'}
                </button>
                {state.verificationStatus === 'running' && (
                  <span className="text-sm text-ubt-grey" role="status">
                    Calculating hashes…
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {state.verificationStatus === 'failed' && (
                  <>
                    <p className="rounded border border-red-400 bg-red-900/40 p-3 text-red-100">
                      Verification failed: {state.lastVerificationError}
                    </p>
                    <p className="text-ubt-grey">
                      Reseat the drive, ensure it is not write-protected, then retry the verification. If
                      issues persist, rerun the simulation to rebuild partitions.
                    </p>
                    <button
                      type="button"
                      onClick={startVerification}
                      className="rounded bg-ubt-blue px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
                    >
                      Retry verification
                    </button>
                  </>
                )}
                {state.verificationStatus === 'success' && (
                  <p className="rounded border border-emerald-400 bg-emerald-900/40 p-3 text-emerald-100">
                    All checks passed. Your live media is ready to boot with persistence enabled.
                  </p>
                )}
                {state.verificationStatus === 'pending' && (
                  <p className="text-ubt-grey">
                    Ready when you are. Verification ensures the bootloader, ISO, and persistence file match
                    their checksums.
                  </p>
                )}
                {state.verificationStatus === 'idle' && (
                  <p className="text-ubt-grey">
                    Complete the simulation first to enable verification.
                  </p>
                )}
              </div>
            </div>
            <a
              href="https://www.kali.org/docs/usb/live-usb-persistence/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm text-ubt-blue hover:underline"
            >
              Review persistence troubleshooting in the Kali documentation
            </a>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Live USB Installer (Simulation)</h1>
            <p className="text-sm text-ubt-grey">
              Follow the wizard to prepare a Kali Linux live USB with persistence. Nothing is written to
              disk—use it as a rehearsal before running the real tools.
            </p>
          </div>
          <button
            type="button"
            onClick={resetWizard}
            className="self-start rounded border border-ubt-grey px-3 py-1 text-xs font-medium text-ubt-grey hover:border-ubt-blue hover:text-white"
          >
            Reset progress
          </button>
        </header>

        {hasSavedProgress && (
          <div className="rounded border border-ubt-grey bg-ub-midnight p-3 text-xs text-ubt-grey">
            Restored your last session. You can pick up where you left off or reset to start over.
          </div>
        )}

        <div className="rounded-lg border border-red-500 bg-red-900/60 p-4 text-sm text-red-100">
          <p className="font-semibold">⚠️ Data loss warning</p>
          <p className="mt-2">
            Real installations erase every partition on the target device. Double-check you have the right
            drive and back up any important files. Review the{' '}
            <a
              href="https://www.kali.org/docs/usb/kali-linux-live-usb-install/"
              target="_blank"
              rel="noreferrer"
              className="text-red-200 underline"
            >
              official Kali USB installer guide
            </a>{' '}
            before running the command-line tools.
          </p>
        </div>

        <nav className="flex flex-col gap-3 rounded-lg border border-ubt-grey bg-ub-dark p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => {
              const isActive = state.step === index;
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => goToStep(index)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    isActive ? 'bg-ubt-blue text-white' : 'bg-ub-midnight text-ubt-grey hover:bg-ubt-grey/20'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="font-medium">Step {index + 1}:</span> {step.title}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-ubt-grey">{steps[state.step]?.description}</p>
        </nav>

        <main className="rounded-lg border border-ubt-grey bg-ub-dark p-6">
          {renderStep()}
        </main>

        <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={state.step === 0 || state.simulationStatus === 'running' || state.verificationStatus === 'running'}
              className={`rounded px-4 py-2 text-sm font-medium transition ${
                state.step === 0 || state.simulationStatus === 'running' || state.verificationStatus === 'running'
                  ? 'cursor-not-allowed bg-ubt-grey text-ubc-grey'
                  : 'border border-ubt-grey text-ubt-grey hover:border-ubt-blue hover:text-white'
              }`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={!canGoNext}
              className={`rounded px-4 py-2 text-sm font-medium transition ${
                canGoNext ? 'bg-ubt-blue text-white hover:bg-blue-500' : 'cursor-not-allowed bg-ubt-grey text-ubc-grey'
              }`}
            >
              {primaryActionLabel}
            </button>
          </div>
          <div className="text-xs text-ubt-grey">
            Need help? The{' '}
            <a
              href="https://www.kali.org/docs/usb/"
              target="_blank"
              rel="noreferrer"
              className="text-ubt-blue hover:underline"
            >
              Kali USB documentation hub
            </a>{' '}
            covers advanced scenarios like dual persistence or encrypted storage.
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LiveInstaller;
