export type ExportFormat = 'json' | 'csv';

type SerializableRecord = Record<string, unknown>;

const toCSV = (rows: SerializableRecord[]): string => {
  if (!rows.length) return '';
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  const escape = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = rows.map((row) => headers.map((header) => escape(row[header])).join(','));
  return [headers.join(','), ...lines].join('\n');
};

const normaliseRows = (data: unknown): SerializableRecord[] => {
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    if (item && typeof item === 'object') {
      return item as SerializableRecord;
    }
    return { value: item };
  });
};

const serialise = (data: unknown, format: ExportFormat): string => {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  return toCSV(normaliseRows(data));
};

export const exportToClipboard = async (
  data: unknown,
  format: ExportFormat,
): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }
  const content = serialise(data, format);
  if (!content) return false;
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.warn('Clipboard export failed', error);
    return false;
  }
};

export const exportToFile = (
  data: unknown,
  format: ExportFormat,
  filename: string,
): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  const content = serialise(data, format);
  if (!content) return false;

  const blob = new Blob([content], {
    type: format === 'json' ? 'application/json' : 'text/csv',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

