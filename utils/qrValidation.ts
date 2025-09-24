export const MAX_QR_PAYLOAD_LENGTH = 1200;
export const MAX_BATCH_ITEMS = 50;

const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/g;
const FILENAME_SAFE = /[^a-z0-9-_]+/gi;

export interface ValidationResult {
  ok: boolean;
  sanitized: string;
  error?: string;
}

export const normalizeInput = (value: string): string => value.replace(/\r\n?/g, '\n');

export const sanitizeInput = (value: string): string =>
  normalizeInput(value).replace(CONTROL_CHAR_PATTERN, '');

export const validateQrText = (raw: string): ValidationResult => {
  const sanitized = sanitizeInput(raw);
  const hasContent = sanitized.trim().length > 0;
  if (!hasContent) {
    return { ok: false, sanitized, error: 'Enter text to encode.' };
  }
  if (sanitized.length > MAX_QR_PAYLOAD_LENGTH) {
    return {
      ok: false,
      sanitized,
      error: `Limit QR payloads to ${MAX_QR_PAYLOAD_LENGTH} characters.`,
    };
  }
  return { ok: true, sanitized };
};

export const escapeWifiValue = (value: string): string =>
  sanitizeInput(value).replace(/[\\;:,\"]/g, '\\$&');

export interface ParsedBatchItem {
  value: string;
  name: string;
  line: number;
}

export interface BatchParseResult {
  items: ParsedBatchItem[];
  errors: string[];
}

const sanitizeName = (raw: string, fallback: string): string => {
  const cleaned = sanitizeInput(raw).trim();
  if (!cleaned) return fallback;
  return cleaned.replace(FILENAME_SAFE, '-').replace(/-+/g, '-').slice(0, 64);
};

export const parseBatchCsv = (csv: string): BatchParseResult => {
  const lines = normalizeInput(csv)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const errors: string[] = [];
  if (!lines.length) {
    return { items: [], errors: ['Add at least one row in the batch CSV.'] };
  }
  if (lines.length > MAX_BATCH_ITEMS) {
    errors.push(`Batch limit is ${MAX_BATCH_ITEMS} rows.`);
  }
  const limited = lines.slice(0, MAX_BATCH_ITEMS);
  const items: ParsedBatchItem[] = [];
  limited.forEach((line, index) => {
    const lineNumber = index + 1;
    const [valueCol, nameCol] = line.split(',', 2);
    const { ok, sanitized, error } = validateQrText(valueCol || '');
    if (!ok) {
      errors.push(`Line ${lineNumber}: ${error ?? 'Invalid value.'}`);
      return;
    }
    const name = sanitizeName(nameCol ?? '', `code-${lineNumber}`);
    items.push({ value: sanitized, name, line: lineNumber });
  });
  return { items, errors };
};
