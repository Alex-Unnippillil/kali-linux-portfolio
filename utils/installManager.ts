import { publish, subscribe } from './pubsub';
import {
  clearInstallSnapshots,
  InstallPhase,
  InstallSnapshot,
  loadInstallSnapshots,
  removeInstallSnapshot,
  saveInstallSnapshot,
} from './safeStorage';

const INSTALL_TOPIC = 'installer:jobs';

const DOWNLOAD_INTERVAL = 600;
const VERIFY_DELAY = 500;
const INSTALL_DELAY = 500;

export interface InstallJob {
  id: string;
  pluginId: string;
  packages: string[];
  completedPackages: string[];
  phase: InstallPhase;
  active: boolean;
  updatedAt: number;
  error?: string;
}

interface RuntimeJob {
  job: InstallJob;
  interval?: ReturnType<typeof setInterval>;
  timeout?: ReturnType<typeof setTimeout>;
}

const jobs = new Map<string, RuntimeJob>();

const cloneJob = (job: InstallJob): InstallJob => ({
  ...job,
  packages: [...job.packages],
  completedPackages: [...job.completedPackages],
});

const emit = () => {
  publish(
    INSTALL_TOPIC,
    Array.from(jobs.values()).map(({ job }) => cloneJob(job)),
  );
};

const persist = (job: InstallJob) => {
  const snapshot: InstallSnapshot = {
    id: job.id,
    pluginId: job.pluginId,
    phase: job.phase,
    packages: [...job.packages],
    completedPackages: [...job.completedPackages],
    updatedAt: job.updatedAt,
    error: job.error,
  };
  saveInstallSnapshot(snapshot);
};

const stopTimers = (runtime: RuntimeJob) => {
  if (runtime.interval) {
    clearInterval(runtime.interval);
    runtime.interval = undefined;
  }
  if (runtime.timeout) {
    clearTimeout(runtime.timeout);
    runtime.timeout = undefined;
  }
};

const completeJob = (runtime: RuntimeJob) => {
  stopTimers(runtime);
  const { job } = runtime;
  job.phase = 'completed';
  job.active = false;
  job.updatedAt = Date.now();
  removeInstallSnapshot(job.id);
  emit();
};

const scheduleFinalization = (runtime: RuntimeJob) => {
  const { job } = runtime;
  job.phase = 'verifying';
  job.updatedAt = Date.now();
  persist(job);
  emit();

  runtime.timeout = setTimeout(() => {
    runtime.timeout = undefined;
    job.phase = 'installing';
    job.updatedAt = Date.now();
    persist(job);
    emit();

    runtime.timeout = setTimeout(() => {
      runtime.timeout = undefined;
      completeJob(runtime);
    }, INSTALL_DELAY);
  }, VERIFY_DELAY);
};

const processNextPackage = (runtime: RuntimeJob) => {
  const { job } = runtime;
  const nextIndex = job.completedPackages.length;
  if (nextIndex >= job.packages.length) {
    stopTimers(runtime);
    scheduleFinalization(runtime);
    return;
  }
  const pkg = job.packages[nextIndex];
  job.completedPackages = [...job.completedPackages, pkg];
  job.updatedAt = Date.now();
  persist(job);
  emit();

  if (job.completedPackages.length >= job.packages.length) {
    stopTimers(runtime);
    scheduleFinalization(runtime);
  }
};

const startDownloadTimer = (runtime: RuntimeJob) => {
  const { job } = runtime;
  job.phase = 'downloading';
  job.active = true;
  job.updatedAt = Date.now();
  persist(job);
  emit();

  runtime.interval = setInterval(() => {
    processNextPackage(runtime);
  }, DOWNLOAD_INTERVAL);
};

const ensureRuntime = (jobId: string): RuntimeJob | undefined => jobs.get(jobId);

const createRuntime = (snapshot: InstallSnapshot): RuntimeJob => ({
  job: {
    id: snapshot.id,
    pluginId: snapshot.pluginId,
    packages: [...snapshot.packages],
    completedPackages: [...snapshot.completedPackages],
    phase: snapshot.phase,
    active: false,
    updatedAt: snapshot.updatedAt,
    error: snapshot.error,
  },
});

const runBasedOnPhase = (runtime: RuntimeJob) => {
  const { job } = runtime;
  stopTimers(runtime);
  job.active = true;

  if (job.completedPackages.length >= job.packages.length) {
    if (job.phase === 'completed') {
      job.active = false;
      emit();
      return;
    }
    scheduleFinalization(runtime);
    return;
  }

  startDownloadTimer(runtime);
};

export const getInstallJobs = (): InstallJob[] =>
  Array.from(jobs.values()).map(({ job }) => cloneJob(job));

export const subscribeToInstallJobs = (
  handler: (jobs: InstallJob[]) => void,
): (() => void) => {
  handler(getInstallJobs());
  return subscribe(INSTALL_TOPIC, (data: unknown) => {
    handler(Array.isArray(data) ? (data as InstallJob[]) : getInstallJobs());
  });
};

export const loadStoredInstallJobs = (): InstallJob[] => {
  const snapshots = loadInstallSnapshots();
  snapshots.forEach((snapshot) => {
    if (!jobs.has(snapshot.id)) {
      jobs.set(snapshot.id, createRuntime(snapshot));
    }
  });
  emit();
  return getInstallJobs();
};

export const startInstallJob = (
  pluginId: string,
  packages: string[],
): InstallJob => {
  const existing = ensureRuntime(pluginId);
  if (existing) {
    stopTimers(existing);
  }

  const runtime: RuntimeJob = {
    job: {
      id: pluginId,
      pluginId,
      packages: [...packages],
      completedPackages: [],
      phase: 'pending',
      active: false,
      updatedAt: Date.now(),
    },
  };

  jobs.set(pluginId, runtime);
  persist(runtime.job);
  emit();
  runBasedOnPhase(runtime);
  return cloneJob(runtime.job);
};

export const resumeInstallJob = (pluginId: string): InstallJob | null => {
  const runtime = ensureRuntime(pluginId);
  if (!runtime) return null;
  if (runtime.job.phase === 'completed') {
    runtime.job.active = false;
    emit();
    return cloneJob(runtime.job);
  }
  if (runtime.job.phase === 'failed') {
    runtime.job.active = false;
    emit();
    return cloneJob(runtime.job);
  }
  runBasedOnPhase(runtime);
  return cloneJob(runtime.job);
};

export const restartInstallJob = (
  pluginId: string,
  packages?: string[],
): InstallJob | null => {
  const existing = ensureRuntime(pluginId);
  const packageList = packages ?? existing?.job.packages ?? [];
  if (existing) {
    stopTimers(existing);
    jobs.delete(pluginId);
  }
  removeInstallSnapshot(pluginId);
  if (packageList.length === 0) return null;
  return startInstallJob(pluginId, packageList);
};

export const clearInstallJob = (pluginId: string) => {
  const runtime = ensureRuntime(pluginId);
  if (runtime) {
    stopTimers(runtime);
    jobs.delete(pluginId);
  }
  removeInstallSnapshot(pluginId);
  emit();
};

export const markInstallFailed = (pluginId: string, message: string) => {
  const runtime = ensureRuntime(pluginId);
  if (!runtime) return;
  stopTimers(runtime);
  runtime.job.phase = 'failed';
  runtime.job.active = false;
  runtime.job.error = message;
  runtime.job.updatedAt = Date.now();
  persist(runtime.job);
  emit();
};

export const resetInstallManager = () => {
  jobs.forEach((runtime) => stopTimers(runtime));
  jobs.clear();
};

export const clearAllInstallSnapshots = () => {
  clearInstallSnapshots();
};
