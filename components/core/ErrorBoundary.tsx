import { Component, ErrorInfo, ReactNode } from 'react';
import { createLogger } from '../../lib/logger';

interface Props {
  children: ReactNode;
}

type PermissionStateValue = 'granted' | 'denied' | 'prompt' | 'error';

interface PermissionSnapshot {
  name: string;
  state: PermissionStateValue;
}

interface MemorySnapshot {
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  deviceMemory?: number;
}

interface SchemaSnapshot {
  route?: string;
  activeAppId?: string | null;
  openApps?: Array<{ id: string | null; label: string }>;
  contexts?: Array<{ context: string; count: number }>;
}

interface DiagnosticsSummary {
  timestamp: string;
  summary: string;
  errorMessage: string;
  componentStack: string;
  permissions: PermissionSnapshot[];
  memory?: MemorySnapshot;
  schema?: SchemaSnapshot;
  nextSteps: string[];
}

interface State {
  hasError: boolean;
  diagnostics?: DiagnosticsSummary;
  copyStatus: 'idle' | 'copied' | 'failed';
}

const log = createLogger();

const PERMISSIONS_TO_QUERY: string[] = [
  'geolocation',
  'notifications',
  'push',
  'camera',
  'microphone',
  'clipboard-read',
  'clipboard-write',
  'background-sync',
  'persistent-storage',
];

function truncate(value: string, maxLength = 120): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

async function collectPermissionSnapshot(): Promise<PermissionSnapshot[]> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return [];
  }

  const entries = await Promise.all(
    PERMISSIONS_TO_QUERY.map(async (name) => {
      try {
        const status = await navigator.permissions.query({ name } as PermissionDescriptor);
        return { name, state: status.state as PermissionStateValue };
      } catch {
        return { name, state: 'error' as PermissionStateValue };
      }
    }),
  );

  return entries.filter((entry, index) => {
    const firstIndex = entries.findIndex((e) => e.name === entry.name);
    return firstIndex === index;
  });
}

function collectMemorySnapshot(): MemorySnapshot | undefined {
  if (typeof performance === 'undefined') {
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      return { deviceMemory: Number((navigator as unknown as { deviceMemory?: number }).deviceMemory) || undefined };
    }
    return undefined;
  }

  const perfWithMemory = performance as Performance & { memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number; usedJSHeapSize: number } };
  if (!perfWithMemory.memory) {
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      return { deviceMemory: Number((navigator as unknown as { deviceMemory?: number }).deviceMemory) || undefined };
    }
    return undefined;
  }

  const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = perfWithMemory.memory;

  return {
    jsHeapSizeLimit,
    totalJSHeapSize,
    usedJSHeapSize,
    deviceMemory:
      typeof navigator !== 'undefined' && 'deviceMemory' in navigator
        ? Number((navigator as unknown as { deviceMemory?: number }).deviceMemory) || undefined
        : undefined,
  };
}

function collectSchemaSnapshot(): SchemaSnapshot | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const openAppElements = Array.from(document.querySelectorAll('[data-context="app"][data-app-id]'));
  const openApps = openAppElements.slice(0, 10).map((element) => {
    const id = element.getAttribute('data-app-id');
    const labelledBy = element.getAttribute('aria-label') || element.textContent || '';
    return {
      id,
      label: truncate(labelledBy.trim(), 60),
    };
  });

  const contextCounts = Array.from(document.querySelectorAll('[data-context]')).reduce<Record<string, number>>((acc, element) => {
    const context = element.getAttribute('data-context') || 'unknown';
    acc[context] = (acc[context] || 0) + 1;
    return acc;
  }, {});

  const sortedContexts = Object.entries(contextCounts)
    .map(([context, count]) => ({ context, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const activeApp = document.activeElement?.closest?.('[data-context="app"][data-app-id]') || null;

  const route = typeof window !== 'undefined' ? window.location.pathname : undefined;

  return {
    route,
    activeAppId: activeApp?.getAttribute('data-app-id') ?? null,
    openApps,
    contexts: sortedContexts,
  };
}

function summarizeErrorCause(error: unknown, errorInfo: ErrorInfo): { summary: string; nextSteps: string[] } {
  const message = truncate(
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error',
    140,
  );
  const componentStackTop = errorInfo?.componentStack?.split('\n').find((line) => line.trim().length > 0);
  const componentName = componentStackTop
    ? componentStackTop.replace(/^\s*at\s+/i, '').trim()
    : undefined;
  const lowerMessage = message.toLowerCase();

  let summary = 'A rendering error occurred.';
  const nextSteps = new Set<string>();

  if (componentName) {
    summary = `A rendering error occurred near ${componentName}.`;
  }

  if (lowerMessage.includes('permission')) {
    summary = 'The app is missing a required browser permission.';
    nextSteps.add('Review the browser permission prompts and ensure access is granted.');
  }

  if (lowerMessage.includes('memory') || lowerMessage.includes('quota')) {
    summary = 'The app may have exhausted available memory or storage.';
    nextSteps.add('Close other heavy apps or tabs and retry the action.');
  }

  if (lowerMessage.includes('schema') || lowerMessage.includes('validation') || lowerMessage.includes('shape')) {
    summary = 'App data did not match the expected schema.';
    nextSteps.add('Reset or reload the module to refresh its data schema.');
  }

  nextSteps.add('Refresh the window or return to the desktop and relaunch the app.');
  nextSteps.add('Share the diagnostics snapshot with the maintainer if the issue persists.');

  return { summary, nextSteps: Array.from(nextSteps) };
}

async function collectDiagnostics(error: unknown, errorInfo: ErrorInfo): Promise<DiagnosticsSummary> {
  const [permissions, memory, schema] = await Promise.all([
    collectPermissionSnapshot(),
    Promise.resolve(collectMemorySnapshot()),
    Promise.resolve(collectSchemaSnapshot()),
  ]);

  const { summary, nextSteps } = summarizeErrorCause(error, errorInfo);

  const componentStack = truncate(errorInfo?.componentStack || 'Unavailable', 400);

  return {
    timestamp: new Date().toISOString(),
    summary,
    errorMessage: truncate(
      error instanceof Error ? `${error.name}: ${error.message}` : typeof error === 'string' ? error : 'Unknown error',
      160,
    ),
    componentStack,
    permissions,
    memory,
    schema,
    nextSteps,
  };
}

class ErrorBoundary extends Component<Props, State> {
  private isMountedFlag = false;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, diagnostics: undefined, copyStatus: 'idle' };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, diagnostics: undefined, copyStatus: 'idle' };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    const safeMeta = {
      message: error instanceof Error ? error.message : String(error),
      componentStack: truncate(errorInfo?.componentStack || 'Unavailable', 200),
    };
    log.error('ErrorBoundary caught an error', safeMeta);

    collectDiagnostics(error, errorInfo)
      .then((diagnostics) => {
        log.error('ErrorBoundary diagnostics captured', diagnostics);
        if (this.isMountedFlag) {
          this.setState({ diagnostics });
        }
      })
      .catch((diagnosticsError) => {
        log.error('ErrorBoundary diagnostics failed', {
          message: diagnosticsError instanceof Error ? diagnosticsError.message : String(diagnosticsError),
        });
      });
  }

  componentDidMount(): void {
    this.isMountedFlag = true;
  }

  componentWillUnmount(): void {
    this.isMountedFlag = false;
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, diagnostics: undefined, copyStatus: 'idle' });
    }
  }

  private getDiagnosticsPayload(): string {
    if (!this.state.diagnostics) {
      return '';
    }

    const payload = {
      ...this.state.diagnostics,
    };

    return JSON.stringify(payload, null, 2);
  }

  private async handleCopyDiagnostics() {
    const payload = this.getDiagnosticsPayload();
    if (!payload) {
      this.setState({ copyStatus: 'failed' });
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = payload;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      this.setState({ copyStatus: 'copied' });
    } catch (error) {
      log.error('ErrorBoundary copy failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      this.setState({ copyStatus: 'failed' });
    }
  }

  render() {
    if (this.state.hasError) {
      const { diagnostics, copyStatus } = this.state;

      const copyMessage =
        copyStatus === 'copied'
          ? 'Diagnostics copied to clipboard.'
          : copyStatus === 'failed'
          ? 'Copy failed. Select and copy the text manually.'
          : 'Copy diagnostics to share with support.';

      return (
        <div role="alert" className="p-6 mx-auto max-w-3xl text-left bg-black bg-opacity-40 rounded-lg text-white">
          <h1 className="text-2xl font-bold" data-i18n-key="errorBoundary.title">
            Something went wrong.
          </h1>
          <p className="mt-2 text-sm text-slate-200" data-i18n-key="errorBoundary.subtitle">
            We captured a safe diagnostic snapshot to help identify the issue.
          </p>

          {diagnostics && (
            <div className="mt-4 space-y-6" data-i18n-key="errorBoundary.diagnosticsSection">
              <section aria-labelledby="error-cause-heading" className="space-y-2">
                <h2 id="error-cause-heading" className="text-lg font-semibold" data-i18n-key="errorBoundary.causeHeading">
                  Likely cause
                </h2>
                <p className="text-sm text-slate-200">{diagnostics.summary}</p>
                <p className="text-xs text-slate-300" data-i18n-key="errorBoundary.errorMessage">
                  {diagnostics.errorMessage}
                </p>
              </section>

              {diagnostics.nextSteps.length > 0 && (
                <section aria-labelledby="error-next-steps-heading" className="space-y-2">
                  <h2
                    id="error-next-steps-heading"
                    className="text-lg font-semibold"
                    data-i18n-key="errorBoundary.nextStepsHeading"
                  >
                    Recommended next steps
                  </h2>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                    {diagnostics.nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section aria-labelledby="error-diagnostics-heading" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    id="error-diagnostics-heading"
                    className="text-lg font-semibold"
                    data-i18n-key="errorBoundary.snapshotHeading"
                  >
                    Diagnostics snapshot
                  </h2>
                  <button
                    type="button"
                    onClick={() => this.handleCopyDiagnostics()}
                    className="px-3 py-1 text-sm font-medium bg-slate-700 hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none rounded"
                    aria-describedby="error-diagnostics-description error-diagnostics-copy-status"
                    data-i18n-key="errorBoundary.copyButton"
                  >
                    Copy diagnostics
                  </button>
                </div>
                <p
                  id="error-diagnostics-description"
                  className="text-xs text-slate-300"
                  data-i18n-key="errorBoundary.snapshotDescription"
                >
                  The snapshot omits sensitive fields and lists permissions, memory usage, and active apps for debugging.
                </p>
                <pre
                  className="p-3 overflow-auto text-xs bg-slate-900 rounded border border-slate-700"
                  tabIndex={0}
                  aria-label="Diagnostic details"
                >
                  {this.getDiagnosticsPayload()}
                </pre>
                <p
                  id="error-diagnostics-copy-status"
                  role="status"
                  aria-live="polite"
                  className="text-xs text-slate-300"
                  data-i18n-key="errorBoundary.copyStatus"
                >
                  {copyMessage}
                </p>
              </section>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
