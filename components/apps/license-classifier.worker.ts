import {
  getLicenseInfo,
  matchLicense,
  parseSpdxExpression,
  detectLicenseConflicts,
  type LicenseInfo,
  type LicenseMatchResult,
  type LicenseConflict,
} from '../../lib/licenseMatcher';

interface AnalyzeMessage {
  type: 'analyze';
  files: File[];
}

interface CancelMessage {
  type: 'cancel';
}

type WorkerMessage = AnalyzeMessage | CancelMessage;

interface AnalysisResult {
  detected: LicenseInfo[];
  fuzzy: LicenseMatchResult | null;
  conflicts: LicenseConflict[];
}

let cancelled = false;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (msg.type === 'analyze') {
    cancelled = false;
    const { files } = msg;
    for (let i = 0; i < files.length; i += 1) {
      if (cancelled) break;
      const file = files[i];
      const content = await file.text();
      const parsed = parseSpdxExpression(content);
      const detected = parsed.ids.map((id) => getLicenseInfo(id));
      const fuzzy = matchLicense(content);
      const conflicts = detectLicenseConflicts(
        parsed.ids,
        parsed.hasAnd && !parsed.hasOr,
      );
      const result: AnalysisResult = { detected, fuzzy, conflicts };
      (self as any).postMessage({ type: 'file', file: file.name, result });
      (self as any).postMessage({ type: 'progress', processed: i + 1, total: files.length });
    }
    (self as any).postMessage({ type: cancelled ? 'cancelled' : 'done' });
  }
};

export default null as any;
