import type { Annotation } from '../screen-recorder/annotations';

export interface EvidenceAsset {
  name: string;
  mimeType?: string;
  size?: number;
  path?: string;
  blob?: Blob;
}

export interface EvidenceRecord {
  id: string;
  label: string;
  tags: string[];
  createdAt: number;
  description?: string;
  assets: EvidenceAsset[];
  metadata?: Record<string, unknown>;
  annotations?: Annotation[];
}

type Listener = (items: EvidenceRecord[]) => void;

let store: EvidenceRecord[] = [];
const listeners = new Set<Listener>();

const emit = () => {
  const snapshot = [...store];
  listeners.forEach((listener) => listener(snapshot));
};

export const getEvidenceStore = (): EvidenceRecord[] => [...store];

export const ingestEvidenceRecord = (
  record: EvidenceRecord,
): EvidenceRecord[] => {
  store = [...store.filter((item) => item.id !== record.id), record];
  emit();
  return [...store];
};

export const removeEvidenceRecord = (id: string): EvidenceRecord[] => {
  store = store.filter((item) => item.id !== id);
  emit();
  return [...store];
};

export const subscribeToEvidenceStore = (
  listener: Listener,
): (() => void) => {
  listeners.add(listener);
  listener([...store]);
  return () => {
    listeners.delete(listener);
  };
};

export const resetEvidenceStore = () => {
  store = [];
  emit();
};
