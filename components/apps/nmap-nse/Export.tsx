import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';

export type NmapScript = {
  name: string;
  output?: string | null;
};

export type NmapPort = {
  port: number;
  protocol?: string | null;
  service?: string | null;
  state?: string | null;
  product?: string | null;
  version?: string | null;
  cvss?: number | null;
  scripts?: NmapScript[] | null;
};

export type NmapHost = {
  ip: string;
  hostname?: string | null;
  mac?: string | null;
  vendor?: string | null;
  os?: string | null;
  notes?: string | null;
  ports?: NmapPort[] | null;
};

type FlattenRow = {
  host: NmapHost;
  port: NmapPort;
  script: NmapScript | null;
};

type ExportFormat = 'csv' | 'jsonl';

export type RedactionState = {
  maskIps: boolean;
  maskHostnames: boolean;
  scrubCredentials: boolean;
  truncateOutput: boolean;
};

type ExportProps = {
  hosts?: NmapHost[];
  selectedScripts: string[];
};

type FieldGroup = 'host' | 'port' | 'script';

type FieldValue = string | number | null;

type FieldDefinition = {
  key:
    | 'host.ip'
    | 'host.hostname'
    | 'host.mac'
    | 'host.vendor'
    | 'host.os'
    | 'host.notes'
    | 'port.port'
    | 'port.protocol'
    | 'port.service'
    | 'port.state'
    | 'port.product'
    | 'port.version'
    | 'port.cvss'
    | 'script.name'
    | 'script.output';
  label: string;
  jsonKey: string;
  group: FieldGroup;
  extractor: (row: FlattenRow) => FieldValue;
};

const FIELD_DEFINITIONS = [
  {
    key: 'host.ip',
    label: 'Host IP',
    jsonKey: 'host_ip',
    group: 'host',
    extractor: (row: FlattenRow) => row.host.ip || null
  },
  {
    key: 'host.hostname',
    label: 'Hostname',
    jsonKey: 'hostname',
    group: 'host',
    extractor: (row: FlattenRow) => row.host.hostname ?? null
  },
  {
    key: 'host.mac',
    label: 'MAC Address',
    jsonKey: 'mac',
    group: 'host',
    extractor: (row: FlattenRow) => row.host.mac ?? null
  },
  {
    key: 'host.vendor',
    label: 'Vendor',
    jsonKey: 'vendor',
    group: 'host',
    extractor: (row: FlattenRow) => row.host.vendor ?? null
  },
  {
    key: 'host.os',
    label: 'Detected OS',
    jsonKey: 'os',
    group: 'host',
    extractor: (row: FlattenRow) => row.host.os ?? null
  },
  {
    key: 'host.notes',
    label: 'Notes',
    jsonKey: 'notes',
    group: 'host',
    extractor: (row: FlattenRow) => row.host.notes ?? null
  },
  {
    key: 'port.port',
    label: 'Port',
    jsonKey: 'port',
    group: 'port',
    extractor: (row: FlattenRow) => row.port.port ?? null
  },
  {
    key: 'port.protocol',
    label: 'Protocol',
    jsonKey: 'protocol',
    group: 'port',
    extractor: (row: FlattenRow) => row.port.protocol ?? 'tcp'
  },
  {
    key: 'port.service',
    label: 'Service',
    jsonKey: 'service',
    group: 'port',
    extractor: (row: FlattenRow) => row.port.service ?? null
  },
  {
    key: 'port.state',
    label: 'State',
    jsonKey: 'state',
    group: 'port',
    extractor: (row: FlattenRow) => row.port.state ?? null
  },
  {
    key: 'port.product',
    label: 'Product',
    jsonKey: 'product',
    group: 'port',
    extractor: (row: FlattenRow) => row.port.product ?? null
  },
  {
    key: 'port.version',
    label: 'Version',
    jsonKey: 'version',
    group: 'port',
    extractor: (row: FlattenRow) => row.port.version ?? null
  },
  {
    key: 'port.cvss',
    label: 'CVSS',
    jsonKey: 'cvss',
    group: 'port',
    extractor: (row: FlattenRow) => row.port.cvss ?? null
  },
  {
    key: 'script.name',
    label: 'Script',
    jsonKey: 'script_name',
    group: 'script',
    extractor: (row: FlattenRow) => row.script?.name ?? null
  },
  {
    key: 'script.output',
    label: 'Script Output',
    jsonKey: 'script_output',
    group: 'script',
    extractor: (row: FlattenRow) => row.script?.output ?? null
  }
] as const satisfies readonly FieldDefinition[];

type FieldKey = (typeof FIELD_DEFINITIONS)[number]['key'];

type ExportStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

type ProgressState = {
  processed: number;
  total: number;
};

const DEFAULT_FIELDS: FieldKey[] = [
  'host.ip',
  'port.port',
  'port.service',
  'script.name',
  'script.output'
];

export const DEFAULT_REDACTIONS: RedactionState = {
  maskIps: true,
  maskHostnames: false,
  scrubCredentials: true,
  truncateOutput: true
};

const MAX_OUTPUT_LENGTH = 400;
const CSV_MIME = 'text/csv;charset=utf-8';
const JSONL_MIME = 'application/jsonl;charset=utf-8';
const BUFFER_THRESHOLD = 64 * 1024; // 64KB
const PROGRESS_STEP = 1000;
const YIELD_INTERVAL = 2000;

const ipv4Regex = /\b(\d{1,3}\.){3}\d{1,3}\b/g;
const ipv6Regex = /\b(?:[a-f0-9]{1,4}:){2,7}[a-f0-9]{1,4}\b/gi;
const credentialRegex = /(password|secret|token|key|credential)\s*[:=]\s*([^\s]+)/gi;

const fieldLookup: Record<FieldKey, FieldDefinition> = FIELD_DEFINITIONS.reduce(
  (acc, field) => {
    acc[field.key] = field;
    return acc;
  },
  {} as Record<FieldKey, FieldDefinition>
);

const groupLabels: Record<FieldGroup, string> = {
  host: 'Host fields',
  port: 'Port fields',
  script: 'Script fields'
};

const waitForNextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    window.requestAnimationFrame(() => resolve());
  });

export const maskIpv4 = (ip: string): string => {
  const parts = ip.split('.');
  if (parts.length !== 4) return '<redacted-ip>';
  return `${parts[0]}.${parts[1]}.x.x`;
};

export const maskIpv6 = (ip: string): string => {
  const segments = ip.split(':');
  if (segments.length < 2) return '<redacted-ipv6>';
  return `${segments[0]}:${segments[1]}::/64`;
};

export const maskIpsInValue = (value: string, field: FieldKey): string => {
  if (field === 'host.ip') {
    return maskIpv4(value);
  }
  let masked = value.replace(ipv4Regex, '<redacted-ip>');
  masked = masked.replace(ipv6Regex, '<redacted-ipv6>');
  return masked;
};

export const scrubCredentials = (value: string): string =>
  value.replace(credentialRegex, (_match, key: string) => `${key}: <redacted>`);

export const truncateOutput = (value: string): string => {
  if (value.length <= MAX_OUTPUT_LENGTH) return value;
  const truncated = value.slice(0, MAX_OUTPUT_LENGTH - 1).trimEnd();
  return `${truncated}… [truncated]`;
};

export const applyRedactions = (
  record: Partial<Record<FieldKey, FieldValue>>,
  redaction: RedactionState
): Partial<Record<FieldKey, FieldValue>> => {
  const next: Partial<Record<FieldKey, FieldValue>> = {};
  (Object.keys(record) as FieldKey[]).forEach((key) => {
    const raw = record[key];
    if (raw === null || raw === undefined) {
      next[key] = raw;
      return;
    }
    if (typeof raw !== 'string') {
      next[key] = raw;
      return;
    }
    let value = raw;
    if (redaction.maskIps) {
      value = maskIpsInValue(value, key);
    }
    if (redaction.maskHostnames && key === 'host.hostname') {
      value = '<redacted-hostname>';
    }
    if (redaction.scrubCredentials) {
      value = scrubCredentials(value);
    }
    if (redaction.truncateOutput && key === 'script.output') {
      value = truncateOutput(value);
    }
    next[key] = value;
  });
  return next;
};

export const toCsvRow = (fields: FieldKey[], record: Partial<Record<FieldKey, FieldValue>>): string => {
  const escapeCell = (value: FieldValue): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || /[\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const cells = fields.map((field) => escapeCell(record[field] ?? null));
  return `${cells.join(',')}\n`;
};

export const toJsonlRow = (
  fields: FieldKey[],
  record: Partial<Record<FieldKey, FieldValue>>
): string => {
  const obj: Record<string, FieldValue> = {};
  fields.forEach((field) => {
    obj[fieldLookup[field].jsonKey] = record[field] ?? null;
  });
  return `${JSON.stringify(obj)}\n`;
};

export function* iterateRows(
  hosts: NmapHost[] | undefined,
  selectedScripts: string[]
): Generator<FlattenRow> {
  const scriptFilter = selectedScripts?.length ? new Set(selectedScripts) : null;
  for (const host of hosts ?? []) {
    const ports = host.ports ?? [];
    for (const port of ports) {
      const scripts = port.scripts ?? [];
      const relevantScripts = scriptFilter
        ? scripts.filter((script) => scriptFilter.has(script.name))
        : scripts;
      if (relevantScripts.length === 0) {
        if (!scriptFilter) {
          yield { host, port, script: null };
        }
        continue;
      }
      for (const script of relevantScripts) {
        yield { host, port, script };
      }
    }
  }
}

export const countRows = (hosts: NmapHost[] | undefined, selectedScripts: string[]): number => {
  let total = 0;
  for (const _row of iterateRows(hosts, selectedScripts)) {
    total += 1;
  }
  return total;
};

export const createRecord = (
  row: FlattenRow,
  fields: FieldKey[]
): Partial<Record<FieldKey, FieldValue>> => {
  const record: Partial<Record<FieldKey, FieldValue>> = {};
  fields.forEach((field) => {
    record[field] = fieldLookup[field].extractor(row);
  });
  return record;
};

const downloadBlob = (blob: Blob, filename: string) => {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

type StreamOptions = {
  hosts: NmapHost[] | undefined;
  selectedScripts: string[];
  fields: FieldKey[];
  redaction: RedactionState;
  format: ExportFormat;
  filename: string;
  onProgress?: (processed: number, total: number) => void;
  signal?: AbortSignal;
};

export const streamExport = async ({
  hosts,
  selectedScripts,
  fields,
  redaction,
  format,
  filename,
  onProgress,
  signal
}: StreamOptions): Promise<void> => {
  const total = countRows(hosts, selectedScripts);
  if (total === 0) {
    throw new Error('Nothing to export with the current selection.');
  }

  const mime = format === 'csv' ? CSV_MIME : JSONL_MIME;
  const chunks: BlobPart[] = [];
  let buffer = '';
  let processed = 0;
  let progressMarker = 0;

  if (format === 'csv') {
    const header = fields.map((field) => fieldLookup[field].label).join(',');
    chunks.push(`${header}\n`);
  }

  for (const row of iterateRows(hosts, selectedScripts)) {
    if (signal?.aborted) {
      throw new DOMException('Export aborted', 'AbortError');
    }
    const record = applyRedactions(createRecord(row, fields), redaction);
    buffer += format === 'csv' ? toCsvRow(fields, record) : toJsonlRow(fields, record);
    processed += 1;

    if (buffer.length >= BUFFER_THRESHOLD) {
      chunks.push(buffer);
      buffer = '';
    }

    if (processed - progressMarker >= PROGRESS_STEP) {
      progressMarker = processed;
      onProgress?.(processed, total);
      await waitForNextFrame();
    } else if (processed % YIELD_INTERVAL === 0) {
      await waitForNextFrame();
    }
  }

  if (buffer) {
    chunks.push(buffer);
  }

  if (processed !== total) {
    throw new Error('Row count mismatch during export.');
  }

  onProgress?.(processed, total);

  const blob = new Blob(chunks, { type: mime });
  downloadBlob(blob, filename);
};

const ExportPanel: React.FC<ExportProps> = ({ hosts, selectedScripts }) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [fields, setFields] = useState<FieldKey[]>(DEFAULT_FIELDS);
  const [redaction, setRedaction] = useState<RedactionState>(DEFAULT_REDACTIONS);
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState<ProgressState>({ processed: 0, total: 0 });
  const controllerRef = useRef<AbortController | null>(null);
  const formatId = useId();
  const redactionId = useId();
  const fieldsId = useId();
  const csvLabelId = `${formatId}-csv-label`;
  const jsonlLabelId = `${formatId}-jsonl-label`;
  const redactionLabelIds = {
    maskIps: `${redactionId}-mask-ips-label`,
    maskHostnames: `${redactionId}-mask-hostnames-label`,
    scrubCredentials: `${redactionId}-scrub-credentials-label`,
    truncateOutput: `${redactionId}-truncate-output-label`
  } as const;

  const totalRows = useMemo(
    () => countRows(hosts, selectedScripts),
    [hosts, selectedScripts]
  );

  useEffect(() => {
    setProgress({ processed: 0, total: totalRows });
  }, [totalRows]);

  const groupedFields = useMemo(() => {
    return FIELD_DEFINITIONS.reduce(
      (acc, field) => {
        (acc[field.group] ||= []).push(field);
        return acc;
      },
      {} as Record<FieldGroup, FieldDefinition[]>
    );
  }, []);

  const toggleField = useCallback(
    (field: FieldKey) => {
      setFields((prev) => {
        if (prev.includes(field)) {
          const next = prev.filter((f) => f !== field);
          return next.length ? next : prev;
        }
        return [...prev, field];
      });
    },
    [setFields]
  );

  const toggleRedaction = useCallback(
    (key: keyof RedactionState) => {
      setRedaction((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const handleExport = useCallback(async () => {
    if (!hosts || hosts.length === 0) {
      setStatus('error');
      setMessage('No hosts loaded. Run a scan or load demo data before exporting.');
      return;
    }
    if (fields.length === 0) {
      setStatus('error');
      setMessage('Select at least one field to export.');
      return;
    }
    if (totalRows === 0) {
      setStatus('error');
      setMessage('No rows match the current filters.');
      return;
    }
    const filename = `nmap-export-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.${format}`;

    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    setStatus('running');
    setMessage('Preparing export…');
    setProgress({ processed: 0, total: totalRows });

    try {
      await streamExport({
        hosts,
        selectedScripts,
        fields,
        redaction,
        format,
        filename,
        signal: controller.signal,
        onProgress: (processed, total) => {
          setProgress({ processed, total });
        }
      });
      setStatus('done');
      setMessage(`Exported ${totalRows.toLocaleString()} rows to ${format.toUpperCase()}.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('cancelled');
        setMessage('Export cancelled.');
      } else if (error instanceof Error) {
        setStatus('error');
        setMessage(error.message);
      } else {
        setStatus('error');
        setMessage('Export failed.');
      }
    } finally {
      controllerRef.current = null;
    }
  }, [fields, format, hosts, redaction, selectedScripts, totalRows]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const percent = progress.total
    ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
    : 0;

  return (
    <section className="mt-6 border-t border-gray-700 pt-4">
      <h2 className="text-lg mb-2">Export results</h2>
      <p className="text-sm text-gray-300 mb-4">
        Stream large result sets to JSON Lines or CSV without exhausting memory. Select the fields you need and apply
        redaction policies before downloading.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="border border-gray-700 rounded p-3">
          <legend className="px-1 text-sm uppercase tracking-wide text-gray-400">Format</legend>
          <div className="flex items-center gap-2 text-sm">
            <input
              id={`${formatId}-csv`}
              type="radio"
              name={`${formatId}-format`}
              value="csv"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
              aria-labelledby={csvLabelId}
            />
            <label id={csvLabelId} htmlFor={`${formatId}-csv`} className="cursor-pointer">
              CSV (spreadsheets)
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <input
              id={`${formatId}-jsonl`}
              type="radio"
              name={`${formatId}-format`}
              value="jsonl"
              checked={format === 'jsonl'}
              onChange={() => setFormat('jsonl')}
              aria-labelledby={jsonlLabelId}
            />
            <label id={jsonlLabelId} htmlFor={`${formatId}-jsonl`} className="cursor-pointer">
              JSON Lines (stream-friendly)
            </label>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            {totalRows > 0
              ? `${totalRows.toLocaleString()} row${totalRows === 1 ? '' : 's'} ready for export.`
              : 'No rows match the current filters.'}
          </p>
        </fieldset>
        <fieldset className="border border-gray-700 rounded p-3">
          <legend className="px-1 text-sm uppercase tracking-wide text-gray-400">Redaction</legend>
          <div className="flex items-center gap-2 text-sm">
            <input
              id={`${redactionId}-mask-ips`}
              type="checkbox"
              checked={redaction.maskIps}
              onChange={() => toggleRedaction('maskIps')}
              aria-labelledby={redactionLabelIds.maskIps}
            />
            <label
              id={redactionLabelIds.maskIps}
              htmlFor={`${redactionId}-mask-ips`}
              className="cursor-pointer"
            >
              Mask IPs in host and outputs
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <input
              id={`${redactionId}-mask-hostnames`}
              type="checkbox"
              checked={redaction.maskHostnames}
              onChange={() => toggleRedaction('maskHostnames')}
              aria-labelledby={redactionLabelIds.maskHostnames}
            />
            <label
              id={redactionLabelIds.maskHostnames}
              htmlFor={`${redactionId}-mask-hostnames`}
              className="cursor-pointer"
            >
              Mask hostnames
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <input
              id={`${redactionId}-scrub-credentials`}
              type="checkbox"
              checked={redaction.scrubCredentials}
              onChange={() => toggleRedaction('scrubCredentials')}
              aria-labelledby={redactionLabelIds.scrubCredentials}
            />
            <label
              id={redactionLabelIds.scrubCredentials}
              htmlFor={`${redactionId}-scrub-credentials`}
              className="cursor-pointer"
            >
              Scrub credentials (password, token, key)
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <input
              id={`${redactionId}-truncate-output`}
              type="checkbox"
              checked={redaction.truncateOutput}
              onChange={() => toggleRedaction('truncateOutput')}
              aria-labelledby={redactionLabelIds.truncateOutput}
            />
            <label
              id={redactionLabelIds.truncateOutput}
              htmlFor={`${redactionId}-truncate-output`}
              className="cursor-pointer"
            >
              Truncate verbose script output
            </label>
          </div>
        </fieldset>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {(Object.keys(groupedFields) as FieldGroup[]).map((group) => (
          <fieldset key={group} className="border border-gray-700 rounded p-3">
            <legend className="px-1 text-sm uppercase tracking-wide text-gray-400">
              {groupLabels[group]}
            </legend>
            <div className="space-y-2 text-sm">
              {groupedFields[group].map((field) => {
                const sanitizedKey = field.key.replace(/[^a-z0-9]/gi, '-');
                const checkboxId = `${fieldsId}-${sanitizedKey}`;
                const labelId = `${checkboxId}-label`;
                return (
                  <div key={field.key} className="flex items-center gap-2">
                    <input
                      id={checkboxId}
                      aria-labelledby={labelId}
                      type="checkbox"
                      checked={fields.includes(field.key)}
                      onChange={() => toggleField(field.key)}
                    />
                    <label htmlFor={checkboxId} id={labelId} className="cursor-pointer">
                      {field.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={status === 'running' || totalRows === 0}
          className="px-3 py-1.5 rounded bg-ub-grey text-black font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow disabled:opacity-60"
        >
          {status === 'running' ? 'Exporting…' : `Export ${format.toUpperCase()}`}
        </button>
        {status === 'running' && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 rounded border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
          >
            Cancel
          </button>
        )}
        <div className="flex-1 min-w-[200px]">
          <div className="h-2 bg-gray-800 rounded">
            <div
              className="h-full bg-ub-orange rounded"
              style={{ width: `${percent}%` }}
              role="progressbar"
              aria-label="Export progress"
              aria-valuemin={0}
              aria-valuemax={Math.max(progress.total, 1)}
              aria-valuenow={progress.processed}
            />
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {progress.total > 0
              ? `${progress.processed.toLocaleString()} / ${progress.total.toLocaleString()} rows (${percent}%)`
              : 'Waiting for export'}
          </div>
        </div>
      </div>
      {message && (
        <p
          className={`mt-3 text-sm ${
            status === 'error'
              ? 'text-red-400'
              : status === 'done'
              ? 'text-green-400'
              : status === 'cancelled'
              ? 'text-yellow-400'
              : 'text-gray-300'
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
};

export default ExportPanel;
