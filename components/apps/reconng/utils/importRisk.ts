export type RiskLevel = 'low' | 'medium' | 'high';

export interface ImportRisk {
  level: RiskLevel;
  reasons: string[];
}

export interface ImportLogEntry {
  fileName: string;
  fileType: string;
  fileSize: number;
  level: RiskLevel;
  timestamp: number;
}

const SAFE_MIME_TYPES = new Set([
  'application/json',
  'text/json',
  'application/x-json',
  'application/vnd.api+json',
  '',
]);

const JSON_EXTENSIONS = new Set(['json']);
const HIGH_RISK_EXTENSIONS = new Set(['zip', 'exe', 'dll', 'bin']);

const HIGH_SIZE_BYTES = 512 * 1024; // 512 KB
const MEDIUM_SIZE_BYTES = 128 * 1024; // 128 KB

export const IMPORT_LOG_KEY = 'reconng-template-import-log';

export function computeImportRisk(file: Pick<File, 'name' | 'type' | 'size'>): ImportRisk {
  const reasons: string[] = [];
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  let level: RiskLevel = 'low';

  if (!JSON_EXTENSIONS.has(extension) && file.type === '') {
    level = 'high';
    reasons.push('Unknown file extension. Only JSON files are expected.');
  }

  if (!SAFE_MIME_TYPES.has(file.type) && JSON_EXTENSIONS.has(extension)) {
    level = level === 'high' ? 'high' : 'medium';
    reasons.push('MIME type does not match JSON.');
  }

  if (!JSON_EXTENSIONS.has(extension) && file.type && !SAFE_MIME_TYPES.has(file.type)) {
    level = 'high';
    reasons.push('File type is not supported for template import.');
  }

  if (HIGH_RISK_EXTENSIONS.has(extension)) {
    level = 'high';
    reasons.push('Executable or archive formats are blocked.');
  }

  if (file.size > HIGH_SIZE_BYTES) {
    level = 'high';
    reasons.push('File is larger than 512 KB.');
  } else if (file.size > MEDIUM_SIZE_BYTES && level !== 'high') {
    level = 'medium';
    reasons.push('File is larger than 128 KB.');
  }

  if (reasons.length === 0) {
    reasons.push('File matches expected JSON template format.');
  }

  return { level, reasons };
}

export function logImportMetadata(entry: ImportLogEntry) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const existingRaw = window.localStorage.getItem(IMPORT_LOG_KEY);
    const existing: ImportLogEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
    const next = [...existing.slice(-24), entry];
    window.localStorage.setItem(IMPORT_LOG_KEY, JSON.stringify(next));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to record import log entry', error);
  }
}
