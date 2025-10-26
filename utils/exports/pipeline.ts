export type ExportStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExportResult {
  bytesWritten: number;
  downloadUrl?: string;
  redactions?: string[];
  metadata?: Record<string, unknown>;
}

export interface ExportProgressUpdate {
  bytesCompleted?: number;
  bytesTotal?: number;
  redactions?: string[];
  tempFiles?: string[];
}

export interface ExportJobController {
  signal: AbortSignal;
  updateProgress: (update: ExportProgressUpdate) => void;
  setResumeToken: (token: string | null) => void;
  getJob: () => ExportTask;
}

export interface ExportJobRequest {
  id?: string;
  label: string;
  source: string;
  resumable?: boolean;
  redactions?: string[];
  totalBytes?: number;
  start: (controller: ExportJobController) => Promise<ExportResult>;
  resume?: (controller: ExportJobController) => Promise<ExportResult>;
  cancel?: (controller: ExportJobController) => Promise<void>;
  cleanup?: (task: ExportTask) => Promise<void>;
}

export interface ExportTask {
  id: string;
  label: string;
  source: string;
  status: ExportStatus;
  resumable: boolean;
  redactions: string[];
  bytesCompleted: number;
  bytesTotal?: number;
  createdAt: number;
  updatedAt: number;
  retries: number;
  error?: string;
  resumeToken?: string | null;
  tempFiles: string[];
  result?: ExportResult;
}

export interface ExportTaskView extends ExportTask {
  canCancel: boolean;
  canResume: boolean;
  canRetry: boolean;
  isRunning: boolean;
  isQueued: boolean;
}

export interface ExportSnapshot {
  active: ExportTaskView[];
  completed: ExportTaskView[];
}

interface ExportHandlers {
  start: ExportJobRequest['start'];
  resume?: ExportJobRequest['resume'];
  cancel?: ExportJobRequest['cancel'];
  cleanup?: ExportJobRequest['cleanup'];
}

interface ExportJobInternal extends ExportTask {
  pendingResume: boolean;
  controller?: AbortController;
}

export interface ExportPipelineOptions {
  history?: ExportTask[];
  onHistoryChange?: (history: ExportTask[]) => void;
}

const DEFAULT_HISTORY: ExportTask[] = [];

const createId = () => `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export class ExportPipeline {
  private jobs = new Map<string, ExportJobInternal>();

  private handlers = new Map<string, ExportHandlers>();

  private queue: string[] = [];

  private listeners = new Set<(snapshot: ExportSnapshot) => void>();

  private activeId: string | null = null;

  private onHistoryChange?: (history: ExportTask[]) => void;

  constructor(options: ExportPipelineOptions = {}) {
    this.onHistoryChange = options.onHistoryChange;
    const history = options.history ?? DEFAULT_HISTORY;
    history.forEach((entry) => {
      const job: ExportJobInternal = {
        ...entry,
        redactions: [...entry.redactions],
        tempFiles: [...entry.tempFiles],
        result: entry.result ? { ...entry.result } : undefined,
        pendingResume: false,
        controller: undefined,
      };
      this.jobs.set(entry.id, job);
    });
  }

  queueExport(request: ExportJobRequest): string {
    const id = request.id ?? createId();
    const existing = this.jobs.get(id);
    if (existing && existing.status !== 'completed') {
      throw new Error(`Export with id ${id} already exists`);
    }

    const now = Date.now();
    const job: ExportJobInternal = {
      id,
      label: request.label,
      source: request.source,
      status: 'queued',
      resumable: Boolean(request.resumable),
      redactions: request.redactions ? [...request.redactions] : [],
      bytesCompleted: 0,
      bytesTotal: request.totalBytes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      retries: existing?.retries ?? 0,
      error: undefined,
      resumeToken: existing?.resumeToken ?? null,
      tempFiles: [],
      result: undefined,
      pendingResume: false,
      controller: undefined,
    };

    this.jobs.set(id, job);
    this.handlers.set(id, {
      start: request.start,
      resume: request.resume,
      cancel: request.cancel,
      cleanup: request.cleanup,
    });

    this.enqueue(id);
    this.emit();
    return id;
  }

  async cancelExport(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return false;
    }

    if (job.status === 'queued') {
      this.removeFromQueue(id);
    }

    job.status = 'cancelled';
    job.updatedAt = Date.now();
    job.pendingResume = false;

    const handlers = this.handlers.get(id);
    const controller = job.controller;
    if (controller && !controller.signal.aborted) controller.abort();

    if (handlers?.cancel) {
      try {
        await handlers.cancel(this.createControllerForCancellation(job));
      } catch (error) {
        job.error = error instanceof Error ? error.message : String(error);
      }
    }

    if (handlers?.cleanup) {
      try {
        await handlers.cleanup(this.cloneTask(job));
      } catch (error) {
        job.error = error instanceof Error ? error.message : String(error);
      }
    }

    job.tempFiles = [];
    job.controller = undefined;
    this.persistHistory();
    this.emit();

    if (this.activeId === id) {
      this.activeId = null;
      this.scheduleNext();
    }

    return true;
  }

  async resumeExport(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job) return false;
    const handlers = this.handlers.get(id);
    if (!handlers) return false;

    const canResume =
      job.resumable &&
      (job.status === 'cancelled' || job.status === 'failed') &&
      typeof handlers.resume === 'function';

    if (!canResume) return false;

    job.status = 'queued';
    job.updatedAt = Date.now();
    job.pendingResume = true;
    job.error = undefined;
    job.retries += 1;
    job.result = undefined;
    job.tempFiles = [];
    this.enqueue(id);
    this.persistHistory();
    this.emit();
    return true;
  }

  retryExport(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    const handlers = this.handlers.get(id);
    if (!handlers) return false;
    if (job.status !== 'failed' && job.status !== 'cancelled') return false;

    job.status = 'queued';
    job.updatedAt = Date.now();
    job.pendingResume = false;
    job.error = undefined;
    job.result = undefined;
    job.resumeToken = null;
    job.tempFiles = [];
    job.bytesCompleted = 0;
    job.retries += 1;
    this.enqueue(id);
    this.persistHistory();
    this.emit();
    return true;
  }

  getSnapshot(): ExportSnapshot {
    const tasks = Array.from(this.jobs.values()).map((job) => this.toView(job));
    const active = tasks
      .filter((task) => task.status === 'queued' || task.status === 'running')
      .sort((a, b) => a.createdAt - b.createdAt);
    const completed = tasks
      .filter((task) => task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled')
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return { active, completed };
  }

  subscribe(listener: (snapshot: ExportSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private enqueue(id: string) {
    if (!this.queue.includes(id)) {
      this.queue.push(id);
    }
    this.scheduleNext();
  }

  private removeFromQueue(id: string) {
    this.queue = this.queue.filter((queuedId) => queuedId !== id);
  }

  private scheduleNext() {
    if (this.activeId) return;

    while (this.queue.length > 0) {
      const nextId = this.queue.shift();
      if (!nextId) break;
      const job = this.jobs.get(nextId);
      if (!job || job.status !== 'queued') continue;
      this.activeId = nextId;
      this.runJob(job);
      break;
    }
  }

  private runJob(job: ExportJobInternal) {
    const handlers = this.handlers.get(job.id);
    if (!handlers) {
      this.failJob(job, new Error('No export handlers registered'));
      return;
    }

    const executor = job.pendingResume && handlers.resume ? handlers.resume : handlers.start;
    if (!executor) {
      this.failJob(job, new Error('No available executor for export job'));
      return;
    }

    job.status = 'running';
    job.pendingResume = false;
    job.updatedAt = Date.now();
    job.controller = new AbortController();
    const controller = job.controller;

    const runtime: ExportJobController = {
      signal: controller.signal,
      updateProgress: (update) => this.applyProgress(job.id, update),
      setResumeToken: (token) => this.setResumeToken(job.id, token),
      getJob: () => this.cloneTask(job),
    };

    this.emit();

    Promise.resolve()
      .then(() => executor(runtime))
      .then((result) => {
        const current = this.jobs.get(job.id);
        if (!current || current.status !== 'running') return;
        this.completeJob(current, result);
      })
      .catch((error) => {
        const current = this.jobs.get(job.id);
        if (!current) return;
        if (current.status === 'cancelled') return;
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        this.failJob(current, error);
      })
      .finally(() => {
        const current = this.jobs.get(job.id);
        if (current && current.controller === controller) {
          current.controller = undefined;
        }
        if (this.activeId === job.id) {
          this.activeId = null;
          this.scheduleNext();
        }
      });
  }

  private completeJob(job: ExportJobInternal, result: ExportResult) {
    job.status = 'completed';
    job.updatedAt = Date.now();
    job.result = result;
    job.bytesCompleted = result.bytesWritten;
    job.bytesTotal = result.bytesWritten;
    if (result.redactions) {
      job.redactions = [...result.redactions];
    }
    job.tempFiles = [];
    job.resumeToken = null;
    this.handlers.delete(job.id);
    this.persistHistory();
    this.emit();
  }

  private failJob(job: ExportJobInternal, error: unknown) {
    job.status = 'failed';
    job.updatedAt = Date.now();
    job.error = error instanceof Error ? error.message : String(error);
    job.controller = undefined;
    this.persistHistory();
    this.emit();
  }

  private applyProgress(id: string, update: ExportProgressUpdate) {
    const job = this.jobs.get(id);
    if (!job) return;
    if (typeof update.bytesCompleted === 'number') {
      job.bytesCompleted = update.bytesCompleted;
    }
    if (typeof update.bytesTotal === 'number') {
      job.bytesTotal = update.bytesTotal;
    }
    if (update.redactions) {
      job.redactions = [...update.redactions];
    }
    if (update.tempFiles) {
      const unique = new Set([...job.tempFiles, ...update.tempFiles]);
      job.tempFiles = Array.from(unique);
    }
    job.updatedAt = Date.now();
    this.emit();
  }

  private setResumeToken(id: string, token: string | null) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.resumeToken = token;
    job.updatedAt = Date.now();
    this.emit();
  }

  private createControllerForCancellation(job: ExportJobInternal): ExportJobController {
    return {
      signal: job.controller?.signal ?? new AbortController().signal,
      updateProgress: (update) => this.applyProgress(job.id, update),
      setResumeToken: (token) => this.setResumeToken(job.id, token),
      getJob: () => this.cloneTask(job),
    };
  }

  private toView(job: ExportJobInternal): ExportTaskView {
    const handlers = this.handlers.get(job.id);
    const canCancel = job.status === 'running' || job.status === 'queued';
    const canResume =
      job.resumable &&
      (job.status === 'cancelled' || job.status === 'failed') &&
      Boolean(handlers?.resume);
    const canRetry =
      (job.status === 'cancelled' || job.status === 'failed') && Boolean(handlers?.start);

    return {
      ...this.cloneTask(job),
      canCancel,
      canResume,
      canRetry,
      isRunning: job.status === 'running',
      isQueued: job.status === 'queued',
    };
  }

  private cloneTask(job: ExportJobInternal): ExportTask {
    return {
      id: job.id,
      label: job.label,
      source: job.source,
      status: job.status,
      resumable: job.resumable,
      redactions: [...job.redactions],
      bytesCompleted: job.bytesCompleted,
      bytesTotal: job.bytesTotal,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      retries: job.retries,
      error: job.error,
      resumeToken: job.resumeToken ?? null,
      tempFiles: [...job.tempFiles],
      result: job.result ? { ...job.result } : undefined,
    };
  }

  private persistHistory() {
    if (!this.onHistoryChange) return;
    const history = Array.from(this.jobs.values())
      .filter(
        (job) =>
          job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled',
      )
      .map((job) => this.cloneTask(job))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    this.onHistoryChange(history);
  }

  private emit() {
    if (this.listeners.size === 0) return;
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export default ExportPipeline;
