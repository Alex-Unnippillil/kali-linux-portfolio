export type SubnetVersion = 'IPv4' | 'IPv6';

export interface SubnetCsvRow {
  address: string;
  prefix: number;
  version: SubnetVersion;
  network?: string;
  firstHost?: string;
  lastHost?: string;
  hostCount?: string;
  mask?: string;
  notes?: string;
}

const HEADER_CONFIG: Array<{ header: string; key: keyof SubnetCsvRow }> = [
  { header: 'ip', key: 'address' },
  { header: 'prefix', key: 'prefix' },
  { header: 'version', key: 'version' },
  { header: 'network', key: 'network' },
  { header: 'firstHost', key: 'firstHost' },
  { header: 'lastHost', key: 'lastHost' },
  { header: 'hostCount', key: 'hostCount' },
  { header: 'mask', key: 'mask' },
  { header: 'notes', key: 'notes' },
];

export const CSV_HEADERS = HEADER_CONFIG.map((config) => config.header);

const HEADER_ALIASES: Record<string, keyof SubnetCsvRow> = {
  ip: 'address',
  address: 'address',
  host: 'address',
  target: 'address',
  cidr: 'prefix',
  prefix: 'prefix',
  masklength: 'prefix',
  netmasklength: 'prefix',
  bits: 'prefix',
  version: 'version',
  type: 'version',
  family: 'version',
  network: 'network',
  networkaddress: 'network',
  base: 'network',
  firsthost: 'firstHost',
  first: 'firstHost',
  start: 'firstHost',
  lasthost: 'lastHost',
  last: 'lastHost',
  end: 'lastHost',
  hostcount: 'hostCount',
  hosts: 'hostCount',
  totalhosts: 'hostCount',
  usablehosts: 'hostCount',
  mask: 'mask',
  netmask: 'mask',
  subnetmask: 'mask',
  notes: 'notes',
  note: 'notes',
  comment: 'notes',
  description: 'notes',
};

const stripBom = (value: string) => value.replace(/^\uFEFF/, '');

const escapeCsvValue = (value: string) => {
  if (value === '') return '';
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const tokeniseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let currentCell = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  const pushCell = () => {
    currentRow.push(currentCell);
    currentCell = '';
  };

  const pushRow = () => {
    const cleaned = currentRow.map((cell) => stripBom(cell).trim());
    const hasContent = cleaned.some((cell) => cell.length > 0);
    if (rows.length === 0 || hasContent) {
      rows.push(cleaned);
    }
    currentRow = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      pushCell();
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && input[i + 1] === '\n') {
        i += 1;
      }
      pushCell();
      pushRow();
    } else {
      currentCell += char;
    }
  }

  pushCell();
  if (currentRow.length) {
    pushRow();
  }

  return rows;
};

const normalizeVersion = (value: unknown): SubnetVersion => {
  if (typeof value === 'number') {
    return value === 6 ? 'IPv6' : 'IPv4';
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return 'IPv4';
    if (
      normalized === 'ipv6' ||
      normalized === 'ip6' ||
      normalized === 'v6' ||
      normalized === '6'
    ) {
      return 'IPv6';
    }
    if (normalized.includes('ipv6') || normalized.includes('v6') || normalized.includes('6')) {
      return 'IPv6';
    }
  }
  return 'IPv4';
};

const sanitizeNumeric = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const sanitizeText = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return undefined;
};

export const serializeSubnetRows = (rows: SubnetCsvRow[]): string => {
  const header = CSV_HEADERS.join(',');
  const body = rows.map((row) => {
    return HEADER_CONFIG.map(({ key }) => {
      const raw = row[key];
      if (raw === undefined || raw === null) return '';
      const value = typeof raw === 'number' ? raw.toString() : raw;
      return escapeCsvValue(value);
    }).join(',');
  });
  return [header, ...body].join('\r\n');
};

export const parseSubnetCsv = (csv: string): SubnetCsvRow[] => {
  if (!csv || !csv.trim()) return [];
  const rows = tokeniseCsv(stripBom(csv));
  if (!rows.length) return [];
  const [headerRow, ...dataRows] = rows;
  const columnKeys = headerRow.map((header) => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    return HEADER_ALIASES[normalized] ?? null;
  });

  const output: SubnetCsvRow[] = [];

  dataRows.forEach((row) => {
    if (row.length === 0) return;
    const draft: Partial<Record<keyof SubnetCsvRow, unknown>> = {};
    row.forEach((value, index) => {
      const key = columnKeys[index];
      if (!key) return;
      if (key === 'prefix') {
        draft.prefix = sanitizeNumeric(value);
      } else if (key === 'version') {
        draft.version = value;
      } else {
        draft[key] = value;
      }
    });

    const address = sanitizeText(draft.address);
    const prefix = sanitizeNumeric(draft.prefix ?? undefined);
    if (!address || prefix === null) return;

    const normalized: SubnetCsvRow = {
      address,
      prefix,
      version: normalizeVersion(draft.version),
    };

    (['network', 'firstHost', 'lastHost', 'hostCount', 'mask', 'notes'] as const).forEach((key) => {
      const value = sanitizeText(draft[key]);
      if (value !== undefined) {
        normalized[key] = value;
      }
    });

    output.push(normalized);
  });

  return output;
};
