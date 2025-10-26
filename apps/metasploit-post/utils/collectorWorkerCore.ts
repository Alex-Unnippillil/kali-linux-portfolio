import { strToU8, zipSync, type ZipInputFile } from 'fflate';

export interface ArtifactPayload {
  name: string;
  content: string;
}

export interface BatchResult {
  name: string;
  buffer: Uint8Array;
  entries: number;
  size: number;
}

export type ProgressCallback = (completed: number, total: number, batchCount: number) => void;

export const MAX_ARCHIVE_SIZE = 10 * 1024 * 1024; // 10 MB

const sanitizeName = (name: string, index: number) => {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
  const base = cleaned || `artifact-${index + 1}`;
  return `${String(index + 1).padStart(4, '0')}-${base}`;
};

const createZipFromArtifacts = (items: ArtifactPayload[]): Uint8Array => {
  const archive: Record<string, ZipInputFile> = {};
  items.forEach((artifact, idx) => {
    archive[sanitizeName(artifact.name, idx)] = [
      strToU8(artifact.content, true),
      {
        level: 9,
        mtime: new Date('2024-01-01T00:00:00Z'),
      },
    ];
  });
  return zipSync(archive, { level: 9 });
};

export const buildBatches = (
  artifacts: ArtifactPayload[],
  maxBytes = MAX_ARCHIVE_SIZE,
  onProgress?: ProgressCallback,
): BatchResult[] => {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    return [];
  }

  const total = artifacts.length;
  const batches: BatchResult[] = [];
  let currentBatch: ArtifactPayload[] = [];
  let processed = 0;

  const flushCurrent = () => {
    if (currentBatch.length === 0) {
      return;
    }
    const archive = createZipFromArtifacts(currentBatch);
    batches.push({
      name: `msf-artifacts-batch-${String(batches.length + 1).padStart(2, '0')}.zip`,
      buffer: archive,
      entries: currentBatch.length,
      size: archive.byteLength,
    });
    currentBatch = [];
  };

  artifacts.forEach((artifact, idx) => {
    const candidate = [...currentBatch, artifact];
    const zippedCandidate = createZipFromArtifacts(candidate);

    if (zippedCandidate.byteLength > maxBytes && currentBatch.length > 0) {
      flushCurrent();
      currentBatch.push(artifact);
    } else {
      currentBatch = candidate;
    }

    const interimArchive =
      currentBatch.length === candidate.length ? zippedCandidate : createZipFromArtifacts(currentBatch);

    if (interimArchive.byteLength > maxBytes && currentBatch.length === 1) {
      // Edge case: single artifact exceeds max size. We still emit it so the UI can notify the operator.
      batches.push({
        name: `msf-artifacts-batch-${String(batches.length + 1).padStart(2, '0')}.zip`,
        buffer: interimArchive,
        entries: currentBatch.length,
        size: interimArchive.byteLength,
      });
      currentBatch = [];
    }

    processed = idx + 1;
    onProgress?.(processed, total, batches.length + (currentBatch.length > 0 ? 1 : 0));
  });

  flushCurrent();

  return batches;
};
