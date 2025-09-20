import { DiskEntryKind, DiskNode, pathToId } from '@/types/disk';

export interface CsvHeader {
  key: string;
  label: string;
  formatter?: (value: unknown, row: Record<string, unknown>) => string;
}

export interface CsvOptions {
  delimiter?: string;
  includeHeader?: boolean;
  newline?: string;
  bom?: boolean;
}

export interface DiskUsageCsvRow {
  path: string;
  name: string;
  type: DiskEntryKind;
  size: number;
  sizeHuman: string;
  percent: number;
  fileCount: number;
  dirCount: number;
  modified?: string;
}

export interface DiskExportOptions {
  filename?: string;
  download?: boolean;
  headers?: CsvHeader[];
}

const DEFAULT_HEADERS: CsvHeader[] = [
  { key: 'path', label: 'Path' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  {
    key: 'size',
    label: 'Size (bytes)',
  },
  {
    key: 'sizeHuman',
    label: 'Size (human)',
  },
  {
    key: 'percent',
    label: 'Relative %',
    formatter: (value) =>
      typeof value === 'number' ? value.toFixed(4) : String(value ?? ''),
  },
  { key: 'fileCount', label: 'Files' },
  { key: 'dirCount', label: 'Directories' },
  { key: 'modified', label: 'Last Modified' },
];

export const formatBytes = (bytes: number, decimals = 1): string => {
  if (!Number.isFinite(bytes)) return '0 B';
  const sign = bytes < 0 ? -1 : 1;
  const absolute = Math.abs(bytes);
  if (absolute < 1024) {
    return `${(sign * absolute).toFixed(0)} B`;
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const exponent = Math.min(Math.floor(Math.log(absolute) / Math.log(1024)), units.length - 1);
  const value = (absolute / 1024 ** exponent) * sign;
  return `${value.toFixed(decimals)} ${units[exponent]}`;
};

export const toCSV = (
  rows: Record<string, unknown>[],
  headers: CsvHeader[] = [],
  options: CsvOptions = {},
): string => {
  const delimiter = options.delimiter ?? ',';
  const newline = options.newline ?? '\r\n';
  const includeHeader = options.includeHeader ?? true;
  const resolvedHeaders = headers.length
    ? headers
    : Object.keys(rows[0] ?? {}).map((key) => ({ key, label: key }));

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(delimiter) || /[\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = includeHeader
    ? resolvedHeaders.map((header) => escapeCell(header.label)).join(delimiter)
    : null;

  const bodyLines = rows.map((row) =>
    resolvedHeaders
      .map((header) => {
        const raw = row[header.key];
        return escapeCell(header.formatter ? header.formatter(raw, row) : raw);
      })
      .join(delimiter),
  );

  const content = [headerLine, ...bodyLines].filter((line): line is string => Boolean(line)).join(newline);
  return options.bom ? `\ufeff${content}` : content;
};

export const downloadCSV = (csv: string, filename: string): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const buildDiskUsageRows = (
  root: DiskNode,
  totalBytes: number = root.size,
): DiskUsageCsvRow[] => {
  const rows: DiskUsageCsvRow[] = [];

  const walk = (node: DiskNode) => {
    const percent = totalBytes > 0 ? (node.size / totalBytes) * 100 : 0;
    const row: DiskUsageCsvRow = {
      path: pathToId(node.path),
      name: node.name,
      type: node.type,
      size: node.size,
      sizeHuman: formatBytes(node.size),
      percent,
      fileCount: node.fileCount,
      dirCount: node.dirCount,
      modified: node.modified ? new Date(node.modified).toISOString() : undefined,
    };
    rows.push(row);
    node.children?.forEach((child) => walk(child));
  };

  walk(root);
  return rows;
};

export const exportDiskUsage = (
  root: DiskNode,
  options: DiskExportOptions = {},
): string => {
  const rows = buildDiskUsageRows(root);
  const headers = options.headers ?? DEFAULT_HEADERS;
  const csv = toCSV(rows as unknown as Record<string, unknown>[], headers, {
    includeHeader: true,
    delimiter: ',',
    newline: '\r\n',
    bom: true,
  });

  if (options.download !== false && typeof window !== 'undefined') {
    const filename = options.filename ?? 'disk-usage.csv';
    downloadCSV(csv, filename);
  }

  return csv;
};
