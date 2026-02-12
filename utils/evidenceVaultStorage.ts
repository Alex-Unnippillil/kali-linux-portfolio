import { del, get, set } from 'idb-keyval';

export type EvidenceMetadata = {
  caseId?: string;
  source?: string;
  location?: string;
  analyst?: string;
  collectedAt?: string;
  classification?: string;
  tags: string[];
};

export type EvidenceAttachment = {
  id: string;
  kind: 'note' | 'file';
  title: string;
  description?: string;
  createdAt: string;
  tags: string[];
  body?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  downloadUrl?: string;
};

export type EvidenceRecord = {
  id: string;
  title: string;
  summary: string;
  status: string;
  metadata: EvidenceMetadata;
  attachments: EvidenceAttachment[];
};

const STORAGE_KEY = 'evidence-vault.records';

const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;

export const loadEvidenceRecords = async (): Promise<EvidenceRecord[]> => {
  if (!isBrowser) return [];
  try {
    const stored = await get<EvidenceRecord[] | undefined>(STORAGE_KEY);
    if (!Array.isArray(stored)) return [];
    return stored;
  } catch (err) {
    console.warn('Unable to read evidence vault records', err);
    return [];
  }
};

export const persistEvidenceRecords = async (
  records: EvidenceRecord[]
): Promise<void> => {
  if (!isBrowser) return;
  try {
    await set(STORAGE_KEY, records);
  } catch (err) {
    console.warn('Unable to persist evidence vault records', err);
  }
};

export const clearEvidenceRecords = async (): Promise<void> => {
  if (!isBrowser) return;
  try {
    await del(STORAGE_KEY);
  } catch (err) {
    console.warn('Unable to clear evidence vault records', err);
  }
};

export { STORAGE_KEY as EVIDENCE_VAULT_STORAGE_KEY };
