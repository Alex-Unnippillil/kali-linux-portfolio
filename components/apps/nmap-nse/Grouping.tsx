import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ScriptFinding = {
  name: string;
  output?: string;
};

type HostPort = {
  port: number;
  service: string;
  cvss: number;
  scripts?: ScriptFinding[];
};

type Host = {
  ip: string;
  ports: HostPort[];
};

export type GroupDetail = {
  group: string;
  asn?: string;
  country?: string;
  note?: string;
};

type GroupingProps = {
  hosts?: Host[];
  onAssignmentsChange?: (assignments: Record<string, GroupDetail>) => void;
};

type ParsedRow = Record<string, string>;

const STORAGE_KEY = 'nmap-nse-group-mappings';

const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
};

const parseCsv = (text: string): ParsedRow[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: ParsedRow = {};
    headers.forEach((header, idx) => {
      const value = values[idx]?.trim();
      if (value) {
        row[header] = value;
      }
    });
    return row;
  });
};

const getLabelForRow = (row: ParsedRow): string => {
  return (
    row.group ||
    row.label ||
    row.asn ||
    row.organisation ||
    row.organization ||
    row.org ||
    row.country ||
    row.geo ||
    'Unassigned'
  );
};

const mapRowsToDetails = (rows: ParsedRow[]): Record<string, GroupDetail> => {
  return rows.reduce<Record<string, GroupDetail>>((acc, row) => {
    const ip = (row.ip || row.address || row.host || '').trim();
    if (!ip) {
      return acc;
    }

    const detail: GroupDetail = {
      group: getLabelForRow(row),
    };

    if (row.asn) detail.asn = row.asn;
    if (row.country || row.geo) detail.country = row.country || row.geo;
    if (row.note || row.comment) detail.note = row.note || row.comment;

    acc[ip] = detail;
    return acc;
  }, {});
};

const Grouping: React.FC<GroupingProps> = ({ hosts = [], onAssignmentsChange }) => {
  const [mappings, setMappings] = useState<Record<string, GroupDetail>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hostList = hosts;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Record<string, GroupDetail>;
        setMappings(stored);
      }
    } catch (err) {
      console.error('Failed to load stored mappings', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify(mappings);
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch (err) {
      console.error('Failed to persist mappings', err);
    }
  }, [mappings]);

  const resolvedAssignments = useMemo(() => {
    return hostList.reduce<Record<string, GroupDetail>>((acc, host) => {
      const match = mappings[host.ip];
      if (match) {
        acc[host.ip] = match;
      } else {
        acc[host.ip] = { group: 'Unassigned' };
      }
      return acc;
    }, {});
  }, [hostList, mappings]);

  useEffect(() => {
    if (onAssignmentsChange) {
      onAssignmentsChange(resolvedAssignments);
    }
  }, [resolvedAssignments, onAssignmentsChange]);

  const summary = useMemo(() => {
    const stats: Record<
      string,
      {
        hosts: number;
        services: number;
        asn: Set<string>;
        countries: Set<string>;
      }
    > = {};

    hostList.forEach((host) => {
      const assignment = resolvedAssignments[host.ip];
      const label = assignment?.group || 'Unassigned';
      if (!stats[label]) {
        stats[label] = {
          hosts: 0,
          services: 0,
          asn: new Set<string>(),
          countries: new Set<string>(),
        };
      }

      const bucket = stats[label];
      bucket.hosts += 1;
      bucket.services += host.ports?.length ?? 0;
      if (assignment?.asn) bucket.asn.add(assignment.asn);
      if (assignment?.country) bucket.countries.add(assignment.country);
    });

    return Object.entries(stats).map(([group, info]) => ({
      group,
      hosts: info.hosts,
      services: info.services,
      asn: Array.from(info.asn),
      countries: Array.from(info.countries),
    }));
  }, [hostList, resolvedAssignments]);

  const maxHosts = useMemo(() => {
    if (summary.length === 0) return 1;
    return Math.max(...summary.map((item) => item.hosts));
  }, [summary]);

  const handleFileSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const rows = parseCsv(text);
        if (rows.length === 0) {
          setError('No rows found in CSV. Expected headers like ip,asn,country.');
          return;
        }
        const mapped = mapRowsToDetails(rows);
        setMappings(mapped);
        setError(null);
      } catch (err) {
        console.error('Failed to parse CSV', err);
        setError('Unable to parse CSV. Ensure it is UTF-8 encoded and comma separated.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
    // reset input so same file can be uploaded twice
    event.target.value = '';
  }, []);

  const triggerFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearMappings = useCallback(() => {
    setMappings({});
    setError(null);
  }, []);

  return (
    <section className="mb-6 rounded border border-gray-800 bg-gray-900/60 p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Grouping intelligence</h3>
          <p className="text-xs text-gray-300">
            Import ASN or geo CSV mappings (ip, asn, country, group) to instantly tag hosts. Data stays in this browser session.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={triggerFileDialog}
            className="rounded bg-ub-grey px-2 py-1 text-xs font-semibold text-black hover:bg-ub-yellow focus:outline-none focus:ring-2 focus:ring-ub-yellow"
          >
            Upload CSV
          </button>
          <button
            type="button"
            onClick={clearMappings}
            className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-200 hover:border-ub-yellow hover:text-white focus:outline-none focus:ring-2 focus:ring-ub-yellow"
          >
            Clear
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelection}
          aria-label="Upload ASN or geo mapping CSV"
          className="hidden"
        />
      </div>
      {error && <div className="mb-3 rounded border border-red-700 bg-red-900/60 p-2 text-xs text-red-200">{error}</div>}
      <div className="space-y-3">
        {summary.length === 0 ? (
          <p className="text-xs text-gray-300">No hosts loaded yet.</p>
        ) : (
          summary.map((item) => {
            const width = Math.max(8, Math.round((item.hosts / maxHosts) * 100));
            return (
              <div key={item.group} className="rounded bg-black/40 p-3">
                <div className="flex items-center justify-between text-sm font-semibold text-white">
                  <span>{item.group}</span>
                  <span>
                    {item.hosts} host{item.hosts !== 1 ? 's' : ''} · {item.services} service{item.services !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-800">
                  <div
                    className="h-full rounded bg-purple-600"
                    style={{ width: `${width}%` }}
                    aria-hidden
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
                  {item.asn.length > 0 && (
                    <span className="rounded bg-purple-900/40 px-1.5 py-0.5">ASN: {item.asn.join(', ')}</span>
                  )}
                  {item.countries.length > 0 && (
                    <span className="rounded bg-blue-900/40 px-1.5 py-0.5">Geo: {item.countries.join(', ')}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-200">Assignments</h4>
        <ul className="mt-2 space-y-1 text-xs text-gray-300">
          {hostList.map((host) => {
            const assignment = resolvedAssignments[host.ip];
            return (
              <li key={host.ip} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-blue-300">{host.ip}</span>
                <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-white">
                  {assignment?.group || 'Unassigned'}
                </span>
                {assignment?.asn && (
                  <span className="rounded bg-purple-900/40 px-1.5 py-0.5">ASN {assignment.asn}</span>
                )}
                {assignment?.country && (
                  <span className="rounded bg-blue-900/40 px-1.5 py-0.5">{assignment.country}</span>
                )}
                {assignment?.note && (
                  <span className="rounded bg-gray-700/70 px-1.5 py-0.5">{assignment.note}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default Grouping;
