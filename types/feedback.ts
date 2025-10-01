export interface VitalsSnapshot {
  timestamp: string;
  userAgent?: string;
  language?: string;
  platform?: string;
  online?: boolean;
  connectionType?: string;
  viewport?: { width?: number; height?: number };
  memory?: {
    jsHeapSizeLimit?: number;
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
    deviceMemory?: number;
  };
}

export interface DiagnosticsBundle {
  stateHash: string;
  vitals: VitalsSnapshot;
}

export interface FeedbackSubmission {
  summary: string;
  description: string;
  includeDiagnostics: boolean;
  diagnostics?: DiagnosticsBundle | null;
  timestamp: string;
  channel: 'desktop-feedback';
}
