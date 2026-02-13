import { isBrowser } from './isBrowser';

const CHANNEL_NAME = 'kali-tab-coordinator';
const HEARTBEAT_INTERVAL = 1500;
const LEADER_TIMEOUT = HEARTBEAT_INTERVAL * 3;
const INITIAL_ELECTION_DELAY = 400;
const DEBUG_LOG_LIMIT = 60;

type HelloMessage = { type: 'hello'; tabId: string; ts: number };
type LeaderMessage = { type: 'leader'; tabId: string; ts: number; since: number };
type HeartbeatMessage = { type: 'heartbeat'; tabId: string; ts: number; since: number };
type JobProgressMessage = {
  type: 'job-progress';
  tabId: string;
  ts: number;
  jobId: string;
  payload: unknown;
  sync?: boolean;
};
type JobCommandMessage = {
  type: 'job-command';
  tabId: string;
  ts: number;
  jobId: string;
  command: unknown;
};
type JobSyncRequestMessage = {
  type: 'job-sync-request';
  tabId: string;
  ts: number;
  jobId: string;
};

type CoordinatorMessage =
  | HelloMessage
  | LeaderMessage
  | HeartbeatMessage
  | JobProgressMessage
  | JobCommandMessage
  | JobSyncRequestMessage;

export interface TabCoordinatorState {
  tabId: string;
  leaderId: string | null;
  leaderSince: number | null;
  lastHeartbeat: number | null;
  isLeader: boolean;
}

export interface DebugEntry {
  id: string;
  timestamp: number;
  message: string;
  data?: Record<string, unknown>;
}

export interface ProgressMeta {
  originId: string;
  timestamp: number;
  isSync: boolean;
}

interface LeaderContext<TProgress> {
  sendProgress: (progress: TProgress) => void;
}

export interface JobRegistration<TProgress = unknown, TCommand = unknown> {
  debugLabel?: string;
  onLeaderStart?: (ctx: LeaderContext<TProgress>) => void | (() => void);
  onLeaderStop?: () => void;
  onProgress?: (progress: TProgress, meta: ProgressMeta) => void;
  onCommand?: (command: TCommand, fromTabId: string) => void;
}

export interface JobHandle<TCommand = unknown, TProgress = unknown> {
  sendCommand: (command: TCommand) => void;
  publishProgress: (progress: TProgress) => void;
  isLeader: () => boolean;
  dispose: () => void;
}

export interface TabCoordinator {
  readonly supported: boolean;
  readonly tabId: string;
  getState(): TabCoordinatorState;
  subscribe(listener: (state: TabCoordinatorState) => void): () => void;
  getDebugLog(): DebugEntry[];
  subscribeDebug(listener: (entries: DebugEntry[]) => void): () => void;
  registerJob<TProgress, TCommand>(
    jobId: string,
    registration: JobRegistration<TProgress, TCommand>,
  ): JobHandle<TCommand, TProgress>;
}

interface InternalJobState<TProgress = unknown, TCommand = unknown> {
  jobId: string;
  handler?: JobRegistration<TProgress, TCommand>;
  leaderCleanup?: () => void;
  latestProgress?: TProgress;
  latestOriginId?: string;
  latestTimestamp?: number;
  pendingSync?: boolean;
}

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tab-${Math.random().toString(36).slice(2, 10)}`;
};

const cloneState = (state: TabCoordinatorState): TabCoordinatorState => ({ ...state });

class BroadcastTabCoordinator implements TabCoordinator {
  public readonly supported = true;
  public readonly tabId: string;

  private channel: BroadcastChannel;
  private state: TabCoordinatorState;
  private stateListeners = new Set<(state: TabCoordinatorState) => void>();
  private debugLog: DebugEntry[] = [];
  private debugListeners = new Set<(entries: DebugEntry[]) => void>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private monitorTimer: ReturnType<typeof setInterval> | null = null;
  private jobs = new Map<string, InternalJobState<any, any>>();
  private disposed = false;

  constructor() {
    this.tabId = createId();
    this.state = {
      tabId: this.tabId,
      leaderId: null,
      leaderSince: null,
      lastHeartbeat: null,
      isLeader: false,
    };

    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.addEventListener('message', this.onMessage);

    this.logDebug('Coordinator initialized');
    this.postMessage({ type: 'hello', tabId: this.tabId, ts: Date.now() });
    setTimeout(() => {
      if (!this.state.leaderId && !this.disposed) {
        this.logDebug('No leader detected, attempting to claim leadership');
        this.becomeLeader();
      }
    }, INITIAL_ELECTION_DELAY + Math.floor(Math.random() * 200));

    this.monitorTimer = setInterval(() => this.checkLeaderTimeout(), HEARTBEAT_INTERVAL);
    window.addEventListener('beforeunload', this.handleUnload);
  }

  public getState(): TabCoordinatorState {
    return cloneState(this.state);
  }

  public subscribe(listener: (state: TabCoordinatorState) => void): () => void {
    this.stateListeners.add(listener);
    listener(cloneState(this.state));
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public getDebugLog(): DebugEntry[] {
    return [...this.debugLog];
  }

  public subscribeDebug(listener: (entries: DebugEntry[]) => void): () => void {
    this.debugListeners.add(listener);
    listener(this.getDebugLog());
    return () => {
      this.debugListeners.delete(listener);
    };
  }

  public registerJob<TProgress, TCommand>(
    jobId: string,
    registration: JobRegistration<TProgress, TCommand>,
  ): JobHandle<TCommand, TProgress> {
    const job = this.getOrCreateJob<TProgress, TCommand>(jobId);

    if (job.handler) {
      this.logDebug('Replacing job registration', { jobId });
      this.stopJob(jobId, job);
    } else {
      this.logDebug('Registered job', { jobId, label: registration.debugLabel });
    }

    job.handler = registration as JobRegistration<any, any>;

    if (this.state.isLeader) {
      this.startJob(jobId, job);
    } else if (!job.latestProgress && !job.pendingSync) {
      job.pendingSync = true;
      this.requestJobSync(jobId);
    }

    if (job.latestProgress !== undefined && registration.onProgress) {
      registration.onProgress(job.latestProgress as TProgress, {
        originId: job.latestOriginId ?? (this.state.leaderId ?? ''),
        timestamp: job.latestTimestamp ?? Date.now(),
        isSync: true,
      });
    }

    const handle: JobHandle<TCommand, TProgress> = {
      sendCommand: (command: TCommand) => this.sendJobCommand(jobId, command),
      publishProgress: (progress: TProgress) => {
        if (this.state.isLeader) {
          this.emitJobProgress(jobId, progress, false);
        } else {
          this.logDebug('Ignored publishProgress because tab is not leader', { jobId });
        }
      },
      isLeader: () => this.state.isLeader,
      dispose: () => {
        this.stopJob(jobId, job);
        if (job.latestProgress === undefined) {
          this.jobs.delete(jobId);
        }
      },
    };

    return handle;
  }

  private getOrCreateJob<TProgress, TCommand>(jobId: string): InternalJobState<TProgress, TCommand> {
    let job = this.jobs.get(jobId) as InternalJobState<TProgress, TCommand> | undefined;
    if (!job) {
      job = { jobId };
      this.jobs.set(jobId, job as InternalJobState<any, any>);
    }
    return job;
  }

  private startJob(jobId: string, job: InternalJobState<any, any>) {
    if (!this.state.isLeader || job.leaderCleanup || !job.handler?.onLeaderStart) return;

    const sendProgress = (progress: unknown) => this.emitJobProgress(jobId, progress, false);
    try {
      const cleanup = job.handler.onLeaderStart({ sendProgress });
      job.leaderCleanup = typeof cleanup === 'function' ? cleanup : undefined;
      this.logDebug('Started job as leader', { jobId, label: job.handler.debugLabel });
    } catch (err) {
      this.logDebug('Job leader start failed', { jobId, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  private stopJob(jobId: string, job?: InternalJobState<any, any>) {
    const target = job ?? this.jobs.get(jobId);
    if (!target) return;
    if (target.leaderCleanup) {
      try {
        target.leaderCleanup();
      } catch (err) {
        this.logDebug('Job cleanup threw', { jobId, error: err instanceof Error ? err.message : 'unknown' });
      }
      target.leaderCleanup = undefined;
    }
    try {
      target.handler?.onLeaderStop?.();
    } catch (err) {
      this.logDebug('onLeaderStop threw', { jobId, error: err instanceof Error ? err.message : 'unknown' });
    }
    target.handler = undefined;
  }

  private emitJobProgress(jobId: string, progress: unknown, sync: boolean) {
    const job = this.getOrCreateJob(jobId);
    job.latestProgress = progress;
    job.latestOriginId = this.tabId;
    job.latestTimestamp = Date.now();
    job.pendingSync = false;
    this.postMessage({
      type: 'job-progress',
      jobId,
      payload: progress,
      tabId: this.tabId,
      ts: job.latestTimestamp,
      sync,
    });
    if (job.handler?.onProgress) {
      job.handler.onProgress(progress, {
        originId: this.tabId,
        timestamp: job.latestTimestamp,
        isSync: sync,
      });
    }
  }

  private sendJobCommand(jobId: string, command: unknown) {
    if (!this.state.leaderId) {
      this.logDebug('No known leader, broadcasting command anyway', { jobId });
    }
    this.postMessage({
      type: 'job-command',
      jobId,
      command,
      tabId: this.tabId,
      ts: Date.now(),
    });
  }

  private requestJobSync(jobId: string) {
    this.postMessage({
      type: 'job-sync-request',
      jobId,
      tabId: this.tabId,
      ts: Date.now(),
    });
    this.logDebug('Requested job sync', { jobId });
  }

  private handleJobProgress(message: JobProgressMessage) {
    const job = this.getOrCreateJob(message.jobId);
    job.latestProgress = message.payload;
    job.latestOriginId = message.tabId;
    job.latestTimestamp = message.ts;
    job.pendingSync = false;

    if (job.handler?.onProgress) {
      job.handler.onProgress(message.payload, {
        originId: message.tabId,
        timestamp: message.ts,
        isSync: Boolean(message.sync),
      });
    }
  }

  private handleJobCommand(message: JobCommandMessage) {
    if (!this.state.isLeader) return;
    const job = this.jobs.get(message.jobId);
    if (!job?.handler?.onCommand) return;
    try {
      job.handler.onCommand(message.command, message.tabId);
    } catch (err) {
      this.logDebug('onCommand threw', { jobId: message.jobId, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  private handleJobSyncRequest(message: JobSyncRequestMessage) {
    if (!this.state.isLeader) return;
    const job = this.jobs.get(message.jobId);
    if (!job?.latestProgress) return;
    this.emitJobProgress(message.jobId, job.latestProgress, true);
  }

  private onMessage = (event: MessageEvent<CoordinatorMessage>) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if ((message as any).tabId === this.tabId) return;

    switch (message.type) {
      case 'hello':
        if (this.state.isLeader) {
          this.broadcastLeader();
        }
        break;
      case 'leader':
        this.handleLeaderAnnouncement(message.tabId, message.since);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message.tabId, message.since);
        break;
      case 'job-progress':
        this.handleJobProgress(message);
        break;
      case 'job-command':
        this.handleJobCommand(message);
        break;
      case 'job-sync-request':
        this.handleJobSyncRequest(message);
        break;
      default:
        break;
    }
  };

  private handleLeaderAnnouncement(tabId: string, since: number) {
    if (this.state.isLeader) {
      const currentSince = this.state.leaderSince ?? Number.MAX_SAFE_INTEGER;
      if (
        currentSince < since ||
        (currentSince === since && this.tabId <= tabId)
      ) {
        this.broadcastLeader();
        return;
      }
      this.logDebug('Yielding leadership to peer', { leaderId: tabId, since });
      this.stopLeadership();
    }

    const currentSince = this.state.leaderSince ?? Number.MAX_SAFE_INTEGER;
    const currentLeader = this.state.leaderId;
    if (
      !currentLeader ||
      since < currentSince ||
      (since === currentSince && (!currentLeader || tabId < currentLeader))
    ) {
      this.updateState({
        leaderId: tabId,
        leaderSince: since,
        lastHeartbeat: Date.now(),
        isLeader: false,
      });
      this.logDebug('Recognized leader', { leaderId: tabId, since });
    }
  }

  private handleHeartbeat(tabId: string, since: number) {
    if (this.state.leaderId !== tabId) {
      this.handleLeaderAnnouncement(tabId, since);
      return;
    }
    this.updateState({
      leaderId: tabId,
      leaderSince: since,
      lastHeartbeat: Date.now(),
      isLeader: false,
    });
  }

  private checkLeaderTimeout() {
    if (this.state.isLeader) {
      this.broadcastHeartbeat();
      return;
    }
    const { leaderId, lastHeartbeat } = this.state;
    if (!leaderId || !lastHeartbeat || Date.now() - lastHeartbeat > LEADER_TIMEOUT) {
      this.logDebug('Leader heartbeat missing, attempting takeover', { leaderId });
      this.becomeLeader();
    }
  }

  private becomeLeader(since = Date.now()) {
    if (this.state.isLeader) return;
    this.updateState({
      leaderId: this.tabId,
      leaderSince: since,
      lastHeartbeat: Date.now(),
      isLeader: true,
    });
    this.startLeadership();
  }

  private startLeadership() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => this.broadcastHeartbeat(), HEARTBEAT_INTERVAL);
    this.broadcastLeader();
    this.jobs.forEach((job, jobId) => this.startJob(jobId, job));
    this.logDebug('Leadership active', { since: this.state.leaderSince ?? Date.now() });
  }

  private stopLeadership() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.jobs.forEach((job, jobId) => this.stopJob(jobId, job));
    if (this.state.isLeader) {
      this.updateState({ isLeader: false });
    }
  }

  private broadcastLeader() {
    const since = this.state.leaderSince ?? Date.now();
    this.postMessage({
      type: 'leader',
      tabId: this.tabId,
      ts: Date.now(),
      since,
    });
  }

  private broadcastHeartbeat() {
    const since = this.state.leaderSince ?? Date.now();
    this.postMessage({
      type: 'heartbeat',
      tabId: this.tabId,
      ts: Date.now(),
      since,
    });
    this.updateState({ lastHeartbeat: Date.now() });
  }

  private postMessage(message: CoordinatorMessage) {
    try {
      this.channel.postMessage(message);
    } catch (err) {
      this.logDebug('BroadcastChannel post failed', {
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  private updateState(patch: Partial<TabCoordinatorState>) {
    const next = { ...this.state, ...patch };
    if (
      next.leaderId === this.state.leaderId &&
      next.leaderSince === this.state.leaderSince &&
      next.lastHeartbeat === this.state.lastHeartbeat &&
      next.isLeader === this.state.isLeader
    ) {
      return;
    }
    this.state = next;
    this.stateListeners.forEach((listener) => listener(cloneState(this.state)));
  }

  private logDebug(message: string, data?: Record<string, unknown>) {
    const entry: DebugEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      message,
      data,
    };
    this.debugLog.push(entry);
    if (this.debugLog.length > DEBUG_LOG_LIMIT) this.debugLog.shift();
    this.debugListeners.forEach((listener) => listener(this.getDebugLog()));
  }

  private handleUnload = () => {
    if (this.disposed) return;
    this.disposed = true;
    this.stopLeadership();
    if (this.monitorTimer) clearInterval(this.monitorTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    try {
      this.channel.removeEventListener('message', this.onMessage);
      this.channel.close();
    } catch {
      // ignore channel close errors
    }
    window.removeEventListener('beforeunload', this.handleUnload);
    this.logDebug('Tab coordinator disposed');
  };
}

class NoopTabCoordinator implements TabCoordinator {
  public readonly supported = false;
  public readonly tabId: string;
  private state: TabCoordinatorState;

  constructor() {
    const now = Date.now();
    this.tabId = `solo-${Math.random().toString(36).slice(2, 8)}`;
    this.state = {
      tabId: this.tabId,
      leaderId: this.tabId,
      leaderSince: now,
      lastHeartbeat: now,
      isLeader: true,
    };
  }

  getState(): TabCoordinatorState {
    return cloneState(this.state);
  }

  subscribe(listener: (state: TabCoordinatorState) => void): () => void {
    listener(cloneState(this.state));
    return () => {};
  }

  getDebugLog(): DebugEntry[] {
    return [];
  }

  subscribeDebug(listener: (entries: DebugEntry[]) => void): () => void {
    listener([]);
    return () => {};
  }

  registerJob<TProgress, TCommand>(
    _jobId: string,
    registration: JobRegistration<TProgress, TCommand>,
  ): JobHandle<TCommand, TProgress> {
    const sendProgress = (progress: TProgress) => {
      registration.onProgress?.(progress, {
        originId: this.tabId,
        timestamp: Date.now(),
        isSync: false,
      });
    };

    let cleanup: (() => void) | void;
    if (registration.onLeaderStart) {
      cleanup = registration.onLeaderStart({ sendProgress });
    }

    return {
      sendCommand: () => {},
      publishProgress: sendProgress,
      isLeader: () => true,
      dispose: () => {
        cleanup?.();
        registration.onLeaderStop?.();
      },
    };
  }
}

let coordinator: TabCoordinator;

if (isBrowser && typeof BroadcastChannel !== 'undefined') {
  coordinator = new BroadcastTabCoordinator();
} else {
  coordinator = new NoopTabCoordinator();
}

if (isBrowser) {
  try {
    (window as unknown as Record<string, unknown>).__TAB_COORDINATOR__ = {
      getState: () => coordinator.getState(),
      getDebugLog: () => coordinator.getDebugLog(),
    };
  } catch {
    // ignore assignment failures
  }
}

export default coordinator;
