'use client';

import { useCallback } from 'react';
import usePersistentState from './usePersistentState';

export type EvidenceMetadata = Record<string, string | number>;

export interface EvidenceItem {
  id: string;
  label: string;
  kind: string;
  tags: string[];
  summary?: string;
  thumbnail?: string;
  attachment?: string;
  attachmentType?: string;
  attachmentName?: string;
  metadata: EvidenceMetadata;
  createdAt: string;
}

export interface EvidenceInput {
  id?: string;
  label: string;
  kind?: string;
  tags?: string[];
  summary?: string;
  thumbnail?: string;
  attachment?: string;
  attachmentType?: string;
  attachmentName?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface EvidenceManifestEntry {
  manifestId: string;
  evidenceId: string;
  label: string;
  kind: string;
  tags: string[];
  summary?: string;
  thumbnail?: string;
  metadata: EvidenceMetadata;
  createdAt: string;
}

type EvidenceArrayValidator = (value: unknown) => value is EvidenceItem[];

const STORAGE_KEY = 'evidence-store';

export const formatManifestId = (index: number, prefix = 'EV-'): string => {
  const idNumber = (index + 1).toString().padStart(2, '0');
  return `${prefix}${idNumber}`;
};

const aliasSensitivePath = (value: string): string => {
  if (!value) return value;
  if (/^[a-z]+:\/\//i.test(value)) return value;
  if (value.startsWith('case://') || value.startsWith('…/')) return value;
  const normalized = value.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) {
    return value;
  }
  const tail = segments.slice(-2).join('/');
  return `case://${tail}`;
};

const sanitizeMetadata = (
  metadata: Record<string, unknown> | undefined,
): EvidenceMetadata => {
  const result: EvidenceMetadata = {};
  if (!metadata) return result;
  Object.entries(metadata).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'number') {
      if (Number.isFinite(value)) {
        result[key] = value;
      }
      return;
    }
    if (typeof value === 'boolean') {
      result[key] = value ? 'true' : 'false';
      return;
    }
    if (value instanceof Date) {
      result[key] = value.toISOString();
      return;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (/path|dir|location/i.test(key) || /[\\/]/.test(trimmed)) {
        result[key] = aliasSensitivePath(trimmed);
      } else {
        result[key] = trimmed;
      }
      return;
    }
    try {
      result[key] = JSON.stringify(value);
    } catch {
      // ignore values that cannot be serialized
    }
  });
  return result;
};

const isEvidenceItem = (value: unknown): value is EvidenceItem => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<EvidenceItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.label === 'string' &&
    typeof item.kind === 'string' &&
    Array.isArray(item.tags) &&
    item.tags.every((tag) => typeof tag === 'string') &&
    item.metadata !== undefined &&
    typeof item.metadata === 'object' &&
    typeof item.createdAt === 'string'
  );
};

const validateEvidenceArray: EvidenceArrayValidator = (
  value,
): value is EvidenceItem[] => Array.isArray(value) && value.every(isEvidenceItem);

export const buildManifestEntries = (
  items: EvidenceItem[],
  prefix = 'EV-',
): EvidenceManifestEntry[] =>
  items.map((item, index) => ({
    manifestId: formatManifestId(index, prefix),
    evidenceId: item.id,
    label: item.label,
    kind: item.kind,
    tags: [...item.tags],
    summary: item.summary,
    thumbnail: item.thumbnail,
    metadata: sanitizeMetadata(item.metadata),
    createdAt: item.createdAt,
  }));

const createEvidenceId = () =>
  `evidence-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function useEvidenceStore() {
  const [items, setItems] = usePersistentState<EvidenceItem[]>(
    STORAGE_KEY,
    [],
    validateEvidenceArray,
  );

  const addEvidence = useCallback(
    (input: EvidenceInput): EvidenceItem => {
      const id = input.id ?? createEvidenceId();
      const entry: EvidenceItem = {
        id,
        label: input.label.trim() || 'Untitled evidence',
        kind: input.kind?.trim() || 'note',
        tags: (input.tags || []).filter(Boolean),
        summary: input.summary?.trim() || undefined,
        thumbnail: input.thumbnail,
        attachment: input.attachment,
        attachmentType: input.attachmentType,
        attachmentName: input.attachmentName,
        metadata: sanitizeMetadata(input.metadata),
        createdAt: input.createdAt ?? new Date().toISOString(),
      };
      setItems((prev) => [...prev, entry]);
      return entry;
    },
    [setItems],
  );

  const updateEvidence = useCallback(
    (id: string, update: Partial<EvidenceInput>): EvidenceItem | null => {
      let updated: EvidenceItem | null = null;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const merged: EvidenceItem = {
            ...item,
            label: update.label ? update.label.trim() : item.label,
            kind: update.kind ? update.kind.trim() : item.kind,
            tags: update.tags ? update.tags.filter(Boolean) : item.tags,
            summary:
              update.summary !== undefined
                ? update.summary?.trim() || undefined
                : item.summary,
            thumbnail:
              update.thumbnail !== undefined ? update.thumbnail : item.thumbnail,
            attachment:
              update.attachment !== undefined ? update.attachment : item.attachment,
            attachmentType:
              update.attachmentType !== undefined
                ? update.attachmentType
                : item.attachmentType,
            attachmentName:
              update.attachmentName !== undefined
                ? update.attachmentName
                : item.attachmentName,
            metadata: update.metadata
              ? sanitizeMetadata({ ...item.metadata, ...update.metadata })
              : item.metadata,
            createdAt: update.createdAt ?? item.createdAt,
          };
          updated = merged;
          return merged;
        }),
      );
      return updated;
    },
    [setItems],
  );

  const removeEvidence = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [setItems],
  );

  const clearEvidence = useCallback(() => {
    setItems([]);
  }, [setItems]);

  return {
    items,
    addEvidence,
    updateEvidence,
    removeEvidence,
    clearEvidence,
  } as const;
}

export { aliasSensitivePath };
