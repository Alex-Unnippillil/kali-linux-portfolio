import { formatLogEntry, generateCorrelationId, LogEntry } from '../../lib/logger';
import { getDb } from '../../utils/safeIDB';

const DB_NAME = 'ops-dashboard';
const STORE_INCIDENTS = 'incidents';
const VERSION = 1;

export interface IncidentFormValues {
  start: string;
  end: string;
  impact: string;
  notes: string;
}

interface IncidentEntity extends IncidentFormValues {
  id?: number;
  createdAt: string;
  correlationId: string;
}

export interface IncidentRecord extends IncidentFormValues {
  id: number;
  createdAt: string;
  correlationId: string;
}

let dbPromise: ReturnType<typeof getDb> | null = null;
let memoryStore: IncidentRecord[] = [];
let memoryId = 1;

function openDb() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_INCIDENTS)) {
          const store = db.createObjectStore(STORE_INCIDENTS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

function toIncidentRecord(entity: IncidentEntity): IncidentRecord {
  return {
    id: entity.id ?? 0,
    start: entity.start,
    end: entity.end,
    impact: entity.impact,
    notes: entity.notes,
    createdAt: entity.createdAt,
    correlationId: entity.correlationId,
  };
}

function sortIncidents(records: IncidentRecord[]): IncidentRecord[] {
  return records.sort((a, b) => {
    const aTime = Date.parse(a.start || a.createdAt);
    const bTime = Date.parse(b.start || b.createdAt);
    const aInvalid = Number.isNaN(aTime);
    const bInvalid = Number.isNaN(bTime);
    if (aInvalid && bInvalid) return 0;
    if (aInvalid) return 1;
    if (bInvalid) return -1;
    return bTime - aTime;
  });
}

export async function listIncidents(): Promise<IncidentRecord[]> {
  const dbp = openDb();
  if (!dbp) {
    return sortIncidents([...memoryStore]);
  }
  try {
    const db = await dbp;
    const entities = (await db.getAll(STORE_INCIDENTS)) as IncidentEntity[];
    const records = entities.map(toIncidentRecord).map((record, index) => ({
      ...record,
      id: record.id || index + 1,
    }));
    return sortIncidents(records);
  } catch {
    return sortIncidents([...memoryStore]);
  }
}

export async function addIncident(values: IncidentFormValues): Promise<IncidentRecord> {
  const entity: IncidentEntity = {
    ...values,
    impact: values.impact.trim(),
    notes: values.notes.trim(),
    createdAt: new Date().toISOString(),
    correlationId: generateCorrelationId(),
  };

  const dbp = openDb();
  if (!dbp) {
    const fallbackEntity = { ...entity, id: memoryId++ };
    const fallbackRecord = toIncidentRecord(fallbackEntity);
    memoryStore = sortIncidents([...memoryStore, fallbackRecord]);
    return fallbackRecord;
  }

  try {
    const db = await dbp;
    const id = await db.add(STORE_INCIDENTS, entity);
    const numericId = typeof id === 'number' ? id : Number(id);
    const record: IncidentRecord = {
      ...entity,
      id: Number.isFinite(numericId) ? numericId : memoryId++,
    };
    return record;
  } catch {
    const fallbackEntity = { ...entity, id: memoryId++ };
    const fallbackRecord = toIncidentRecord(fallbackEntity);
    memoryStore = sortIncidents([...memoryStore, fallbackRecord]);
    return fallbackRecord;
  }
}

export function formatIncidentLog(incident: IncidentRecord): LogEntry {
  return formatLogEntry('info', 'ops.incident.recorded', incident.correlationId, {
    incidentId: incident.id,
    start: incident.start,
    end: incident.end,
    impact: incident.impact,
    notes: incident.notes,
    createdAt: incident.createdAt,
  });
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function incidentsToJson(incidents: IncidentRecord[]): string {
  const entries = incidents.map(formatIncidentLog);
  return JSON.stringify(entries, null, 2);
}

const CSV_HEADERS = [
  'level',
  'message',
  'correlationId',
  'incidentId',
  'start',
  'end',
  'impact',
  'notes',
  'createdAt',
];

export function incidentsToCsv(incidents: IncidentRecord[]): string {
  const rows = incidents.map((incident) => {
    const entry = formatIncidentLog(incident);
    return CSV_HEADERS.map((key) => escapeCsv(entry[key])).join(',');
  });
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}
