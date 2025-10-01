import {
  GLOBAL_APP_ID,
  GLOBAL_APP_LABEL,
  PerformanceBudget,
  PerformanceBudgetMap,
  PerformanceMetric,
  OverrideLogEntry,
  OverrideMetricLog,
  getDefaultBudget,
  getEffectiveBudget,
  readBudgetsFromStorage,
  readOverrideLogFromStorage,
  sanitiseBudget,
  writeBudgetsToStorage,
  writeOverrideLogToStorage,
  clampOverrides,
} from './performanceBudgets';

export interface UsageInput {
  rows?: number;
  mb?: number;
  duration?: number;
}

export interface UsageMeta {
  type?: string;
  description?: string;
  estimatedImpact?: string;
  promptOnExceed?: boolean;
}

interface AppMetadata {
  title: string;
  path?: string;
  icon?: string;
}

type Listener = () => void;

const buildId = () =>
  `pb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const KB = 1024;
const MB = KB * KB;

export class PerformanceBudgetManager {
  private budgets: PerformanceBudgetMap = {};
  private overrides: OverrideLogEntry[] = [];
  private activeApp: string = GLOBAL_APP_ID;
  private metadata: Record<string, AppMetadata> = {
    [GLOBAL_APP_ID]: { title: GLOBAL_APP_LABEL },
  };
  private listeners: Set<Listener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.budgets = readBudgetsFromStorage();
      this.overrides = clampOverrides(readOverrideLogFromStorage());
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('PerformanceBudgetManager listener failed', err);
      }
    });
  }

  getBudgets(): PerformanceBudgetMap {
    return { ...this.budgets };
  }

  getEffectiveBudget(appId: string): PerformanceBudget {
    return getEffectiveBudget(appId, this.budgets);
  }

  getOverrides(): OverrideLogEntry[] {
    return [...this.overrides];
  }

  clearOverrides() {
    this.overrides = [];
    writeOverrideLogToStorage(this.overrides);
    this.emit();
  }

  getMetadata(): Record<string, AppMetadata> {
    return { ...this.metadata };
  }

  setMetadata(metadata: Record<string, AppMetadata>) {
    this.metadata = { [GLOBAL_APP_ID]: { title: GLOBAL_APP_LABEL }, ...metadata };
    this.emit();
  }

  setActiveApp(appId?: string | null) {
    this.activeApp = appId || GLOBAL_APP_ID;
  }

  clearActiveApp(appId: string) {
    if (this.activeApp === appId) {
      this.activeApp = GLOBAL_APP_ID;
    }
  }

  getActiveApp(): string {
    return this.activeApp || GLOBAL_APP_ID;
  }

  updateBudget(appId: string, next: PerformanceBudget) {
    const sanitised = sanitiseBudget(next);
    const defaultBudget = getDefaultBudget();
    const effective: PerformanceBudget = {
      rows: sanitised.rows ?? null,
      mb: sanitised.mb ?? null,
      duration: sanitised.duration ?? null,
    };
    const isDefault =
      (effective.rows == null || effective.rows === defaultBudget.rows) &&
      (effective.mb == null || effective.mb === defaultBudget.mb) &&
      (effective.duration == null || effective.duration === defaultBudget.duration);
    if (isDefault) {
      delete this.budgets[appId];
    } else {
      this.budgets[appId] = effective;
    }
    writeBudgetsToStorage(this.budgets);
    this.emit();
  }

  removeBudget(appId: string) {
    if (this.budgets[appId]) {
      delete this.budgets[appId];
      writeBudgetsToStorage(this.budgets);
      this.emit();
    }
  }

  private describeMetric(metric: PerformanceMetric, value?: number, budget?: number) {
    if (typeof value !== 'number') return '';
    const formatter = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: metric === 'mb' ? 2 : 0,
    });
    const budgetText =
      typeof budget === 'number'
        ? formatter.format(budget) + (metric === 'mb' ? ' MB' : metric === 'duration' ? ' ms' : ' rows')
        : 'no limit';
    const valueText =
      formatter.format(value) + (metric === 'mb' ? ' MB' : metric === 'duration' ? ' ms' : ' rows');
    return `${valueText} (budget ${budgetText})`;
  }

  private estimateImpact(metrics: OverrideMetricLog[]): string {
    const parts: string[] = [];
    metrics.forEach((entry) => {
      const budget = entry.budget ?? 0;
      const overBy = entry.value - budget;
      if (entry.metric === 'rows' && overBy > 0) {
        if (overBy > 5000) {
          parts.push('Large table size may freeze scrolling.');
        } else {
          parts.push('Additional rows can slow filtering and highlighting.');
        }
      }
      if (entry.metric === 'mb' && overBy > 0) {
        if (overBy > 25) {
          parts.push('High transfer volume could saturate network bandwidth.');
        } else {
          parts.push('Extra transfer size may delay other requests.');
        }
      }
      if (entry.metric === 'duration' && overBy > 0) {
        if (entry.value > 60000) {
          parts.push('Long-running task risks triggering browser timeouts.');
        } else {
          parts.push('Extended processing may make the UI feel unresponsive.');
        }
      }
    });
    return parts.join(' ') || 'Potential slowdown detected.';
  }

  private buildPrompt(
    appId: string,
    type: string,
    description: string | undefined,
    metrics: OverrideMetricLog[],
    estimatedImpact?: string,
  ) {
    const appTitle = this.metadata[appId]?.title || appId;
    const lines = metrics
      .map((entry) => `• ${entry.metric.toUpperCase()}: ${this.describeMetric(entry.metric, entry.value, entry.budget)}`)
      .join('\n');
    const detail = description ? `\n\nRequested: ${description}` : '';
    const impact = estimatedImpact || this.estimateImpact(metrics);
    return `${appTitle} ${type ? ` ${type}` : ''} exceeds its budget:\n${lines}${detail}\n\nEstimated impact: ${impact}\n\nContinue anyway?`;
  }

  private addOverride(entry: OverrideLogEntry) {
    this.overrides = clampOverrides([entry, ...this.overrides]);
    writeOverrideLogToStorage(this.overrides);
    this.emit();
  }

  private collectOverages(appId: string, usage: UsageInput): OverrideMetricLog[] {
    const budget = this.getEffectiveBudget(appId);
    const overages: OverrideMetricLog[] = [];
    const metrics: PerformanceMetric[] = ['rows', 'mb', 'duration'];
    metrics.forEach((metric) => {
      const value = usage[metric];
      const limit = (budget as Record<string, number | null>)[metric];
      if (typeof value === 'number' && limit != null && value > limit) {
        overages.push({ metric, value, budget: limit });
      }
    });
    return overages;
  }

  shouldAllow(appId: string, usage: UsageInput, meta: UsageMeta = {}): boolean {
    const resolvedAppId = appId || GLOBAL_APP_ID;
    const overages = this.collectOverages(resolvedAppId, usage);
    if (overages.length === 0) {
      return true;
    }
    const { promptOnExceed = true } = meta;
    let decision: 'allowed' | 'blocked' = 'allowed';
    let allow = true;
    if (promptOnExceed && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const message = this.buildPrompt(
        resolvedAppId,
        meta.type || 'operation',
        meta.description,
        overages,
        meta.estimatedImpact,
      );
      allow = window.confirm(message);
      decision = allow ? 'allowed' : 'blocked';
    }
    const logEntry: OverrideLogEntry = {
      id: buildId(),
      appId: resolvedAppId,
      timestamp: Date.now(),
      decision,
      metrics: overages,
      description: meta.description,
      estimatedImpact: meta.estimatedImpact || this.estimateImpact(overages),
      type: meta.type,
    };
    this.addOverride(logEntry);
    return allow;
  }

  reportNetworkUsage(
    appId: string,
    usage: { responseBytes?: number; requestBytes?: number; duration?: number; description?: string },
  ): boolean {
    const metrics: UsageInput = {};
    if (typeof usage.responseBytes === 'number') {
      metrics.mb = usage.responseBytes / MB;
    }
    if (typeof usage.requestBytes === 'number') {
      const uploadMb = usage.requestBytes / MB;
      metrics.mb = Math.max(metrics.mb ?? 0, uploadMb);
    }
    if (typeof usage.duration === 'number') {
      metrics.duration = usage.duration;
    }
    return this.shouldAllow(appId, metrics, {
      type: 'network request',
      description: usage.description,
      estimatedImpact:
        usage.duration && usage.duration > 60000
          ? 'Slow response may block follow-up actions.'
          : undefined,
    });
  }
}

export const performanceBudgetManager = new PerformanceBudgetManager();

