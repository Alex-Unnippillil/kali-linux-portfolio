import type { TrashItem } from '../../apps/trash/state';

export const DUPLICATE_TRASH_DIR = '.duplicate-finder-trash';
const DEFAULT_QUICK_SAMPLE_BYTES = 64 * 1024;
const DEFAULT_TEXT_SAMPLE_BYTES = 2 * 1024;

export interface ScannedFile {
  handle: FileSystemFileHandle;
  directory: FileSystemDirectoryHandle;
  name: string;
  relativePath: string;
  size: number;
  lastModified: number;
  type: string;
}

export interface DuplicateGroup {
  id: string;
  hash: string;
  files: ScannedFile[];
  confidence: number;
  reasons: string[];
  size: number;
}

export interface HeuristicMatch {
  id: string;
  key: string;
  files: ScannedFile[];
  confidence: number;
  reasons: string[];
  size: number;
}

export interface DuplicateScanResult {
  confirmed: DuplicateGroup[];
  probable: HeuristicMatch[];
}

export interface ScanOptions {
  quickSampleBytes?: number;
  sampleTextBytes?: number;
  signal?: AbortSignal;
  onProgress?: (processed: number, total: number) => void;
}

export interface CollectOptions {
  signal?: AbortSignal;
  currentPath?: string;
  skipDirectories?: string[];
  maxFiles?: number;
}

export interface DuplicateTrashPayload {
  type: 'duplicate-file';
  relativePath: string;
  backupName: string;
  size: number;
}

export interface MoveToTrashSuccess {
  file: ScannedFile;
  trashItem: TrashItem;
  payload: DuplicateTrashPayload;
}

export interface MoveToTrashFailure {
  file: ScannedFile;
  error: string;
}

export interface MoveToTrashOutcome {
  successes: MoveToTrashSuccess[];
  failures: MoveToTrashFailure[];
  bytesMoved: number;
}

export type TrashPayload = DuplicateTrashPayload;

const DEFAULT_SKIP_DIRS = [DUPLICATE_TRASH_DIR, '.Trash', '.trash'];

const shouldAbort = (signal?: AbortSignal) => signal?.aborted ?? false;

const throwIfAborted = (signal?: AbortSignal) => {
  if (shouldAbort(signal)) {
    throw new DOMException('Operation aborted', 'AbortError');
  }
};

const bufferToHex = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

const fallbackDigest = (buffer: ArrayBuffer) => {
  const view = new Uint8Array(buffer);
  let hash = 0;
  for (let i = 0; i < view.length; i += 1) {
    hash = (hash * 31 + view[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const computeDigest = async (buffer: ArrayBuffer) => {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return bufferToHex(digest);
    }
  } catch {
    // fall back below
  }
  return fallbackDigest(buffer);
};

const normalisePath = (value: string) => value.replace(/\\/g, '/').replace(/\/+/g, '/');

const joinPath = (...parts: string[]) => {
  const sanitised = parts
    .map(part => normalisePath(part).trim())
    .filter(Boolean)
    .map(part => part.replace(/^\/+|\/+$|^\.\/+/g, ''));
  return sanitised.join('/') || '';
};

const normaliseName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/copy|final|edited|backup|duplicate/g, '')
    .replace(/[_\-\s]+/g, ' ')
    .replace(/\d+/g, '')
    .trim();

const computeSampleSimilarity = (a: string, b: string) => {
  if (!a || !b) return 0;
  const len = Math.min(a.length, b.length, 1024);
  if (len === 0) return 0;
  let matches = 0;
  for (let i = 0; i < len; i += 1) {
    if (a.charCodeAt(i) === b.charCodeAt(i)) matches += 1;
  }
  return matches / len;
};

const formatReason = (name: string, value: string | number) => `${name}: ${value}`;

const ensureDirectoryPath = async (
  root: FileSystemDirectoryHandle,
  segments: string[],
  options: FileSystemGetDirectoryOptions = { create: true },
) => {
  let dir = root;
  for (const segment of segments) {
    if (!segment) continue;
    dir = await dir.getDirectoryHandle(segment, options);
  }
  return dir;
};

const getFileInfo = async (handle: FileSystemFileHandle) => {
  const file = await handle.getFile();
  return {
    file,
    size: file.size,
    lastModified: file.lastModified || Date.now(),
    type: file.type || '',
  };
};

const readTextSample = async (file: File, bytes: number) => {
  try {
    const slice = file.slice(0, bytes);
    return await slice.text();
  } catch {
    return '';
  }
};

const computeQuickHash = async (
  file: File,
  quickSampleBytes: number,
  signal?: AbortSignal,
) => {
  throwIfAborted(signal);
  const slice = file.slice(0, quickSampleBytes);
  const buffer = await slice.arrayBuffer();
  return computeDigest(buffer);
};

const computeFullHash = async (file: File, signal?: AbortSignal) => {
  throwIfAborted(signal);
  const buffer = await file.arrayBuffer();
  return computeDigest(buffer);
};

interface Candidate extends ScannedFile {
  file: File;
  quickHash: string;
  sample: string;
}

const buildCandidate = async (
  file: ScannedFile,
  quickSampleBytes: number,
  textSampleBytes: number,
  signal?: AbortSignal,
): Promise<Candidate> => {
  const { file: blob, size, lastModified, type } = await getFileInfo(file.handle);
  const quickHash = await computeQuickHash(blob, quickSampleBytes, signal);
  const sample = await readTextSample(blob, textSampleBytes);
  return {
    ...file,
    size,
    lastModified,
    type,
    file: blob,
    quickHash,
    sample,
  };
};

const evaluateHeuristicScore = (a: Candidate, b: Candidate) => {
  const reasons: string[] = [];
  let score = 0;

  if (Math.abs(a.size - b.size) <= 64) {
    score += 0.35;
    reasons.push(formatReason('size', `${a.size}`));
  }

  const nameA = normaliseName(a.name);
  const nameB = normaliseName(b.name);
  if (nameA && nameA === nameB) {
    score += 0.35;
    reasons.push('name variant match');
  }

  const extA = a.name.split('.').pop()?.toLowerCase();
  const extB = b.name.split('.').pop()?.toLowerCase();
  if (extA && extA === extB) {
    score += 0.1;
    reasons.push(`extension: .${extA}`);
  }

  if (Math.abs(a.lastModified - b.lastModified) <= 5 * 60 * 1000) {
    score += 0.1;
    reasons.push('modified within 5m');
  }

  const similarity = computeSampleSimilarity(a.sample, b.sample);
  if (similarity >= 0.92) {
    score += 0.15;
    reasons.push(formatReason('sample similarity', similarity.toFixed(2)));
  }

  return { score: Math.min(score, 1), reasons };
};

export async function collectFiles(
  dir: FileSystemDirectoryHandle,
  options: CollectOptions = {},
): Promise<ScannedFile[]> {
  const { signal, currentPath = '', skipDirectories = DEFAULT_SKIP_DIRS, maxFiles } = options;
  const files: ScannedFile[] = [];
  const skips = new Set(skipDirectories.map(name => name.toLowerCase()));
  let count = 0;

  const walk = async (handle: FileSystemDirectoryHandle, prefix: string) => {
    throwIfAborted(signal);
    for await (const [name, entry] of handle.entries()) {
      throwIfAborted(signal);
      if (entry.kind === 'directory') {
        if (skips.has(name.toLowerCase())) continue;
        const nextPrefix = joinPath(prefix, name);
        await walk(entry as FileSystemDirectoryHandle, nextPrefix);
      } else if (entry.kind === 'file') {
        const relativePath = joinPath(prefix, name);
        files.push({
          handle: entry as FileSystemFileHandle,
          directory: handle,
          name,
          relativePath,
          size: 0,
          lastModified: Date.now(),
          type: '',
        });
        count += 1;
        if (maxFiles && count >= maxFiles) {
          return;
        }
      }
    }
  };

  await walk(dir, currentPath ? normalisePath(currentPath) : '');

  return files;
}

export async function findDuplicates(
  files: ScannedFile[],
  options: ScanOptions = {},
): Promise<DuplicateScanResult> {
  const {
    quickSampleBytes = DEFAULT_QUICK_SAMPLE_BYTES,
    sampleTextBytes = DEFAULT_TEXT_SAMPLE_BYTES,
    signal,
    onProgress,
  } = options;

  if (!files.length) return { confirmed: [], probable: [] };

  const candidatesBySize = new Map<number, Candidate[]>();
  let processed = 0;

  for (const file of files) {
    throwIfAborted(signal);
    const candidate = await buildCandidate(file, quickSampleBytes, sampleTextBytes, signal);
    const list = candidatesBySize.get(candidate.size) ?? [];
    list.push(candidate);
    candidatesBySize.set(candidate.size, list);
    processed += 1;
    onProgress?.(processed, files.length);
  }

  const confirmed: DuplicateGroup[] = [];
  const probable: HeuristicMatch[] = [];

  for (const [size, group] of candidatesBySize) {
    if (group.length <= 1) continue;

    const quickMap = new Map<string, Candidate[]>();
    group.forEach(candidate => {
      const list = quickMap.get(candidate.quickHash) ?? [];
      list.push(candidate);
      quickMap.set(candidate.quickHash, list);
    });

    const confirmedInGroup = new Set<string>();

    for (const [, quickGroup] of quickMap) {
      if (quickGroup.length <= 1) continue;

      const hashMap = new Map<string, Candidate[]>();
      for (const candidate of quickGroup) {
        const hash = await computeFullHash(candidate.file, signal);
        const list = hashMap.get(hash) ?? [];
        list.push(candidate);
        hashMap.set(hash, list);
      }

      for (const [hash, matches] of hashMap) {
        if (matches.length <= 1) continue;
        const id = `hash:${hash}`;
        confirmed.push({
          id,
          hash,
          files: matches.map(({ file: _file, sample: _sample, quickHash: _quick, ...rest }) => rest),
          confidence: 1,
          reasons: ['Identical SHA-256 hash'],
          size,
        });
        matches.forEach(match => confirmedInGroup.add(match.relativePath));
      }
    }

    const leftovers = group.filter(candidate => !confirmedInGroup.has(candidate.relativePath));
    if (leftovers.length <= 1) continue;

    const heuristicsMap = new Map<string, { members: Candidate[]; reasons: Set<string>; confidence: number }>();

    for (let i = 0; i < leftovers.length; i += 1) {
      for (let j = i + 1; j < leftovers.length; j += 1) {
        const a = leftovers[i];
        const b = leftovers[j];
        const { score, reasons } = evaluateHeuristicScore(a, b);
        if (score >= 0.8) {
          const key = normaliseName(a.name) || normaliseName(b.name) || `${a.name}|${b.name}`;
          const entry = heuristicsMap.get(key) ?? {
            members: [],
            reasons: new Set<string>(),
            confidence: 0,
          };
          entry.members.push(a, b);
          reasons.forEach(reason => entry.reasons.add(reason));
          entry.confidence = Math.max(entry.confidence, score);
          heuristicsMap.set(key, entry);
        }
      }
    }

    heuristicsMap.forEach((value, key) => {
      const uniqueMembers: Candidate[] = [];
      const seen = new Set<string>();
      value.members.forEach(member => {
        if (seen.has(member.relativePath)) return;
        seen.add(member.relativePath);
        uniqueMembers.push(member);
      });
      if (uniqueMembers.length <= 1) return;
      probable.push({
        id: `heuristic:${key}:${size}`,
        key,
        files: uniqueMembers.map(({ file: _file, sample: _sample, quickHash: _quick, ...rest }) => rest),
        confidence: Math.min(1, value.confidence + 0.05),
        reasons: Array.from(value.reasons),
        size,
      });
    });
  }

  return {
    confirmed,
    probable,
  };
}

const uniqueSlug = (path: string) =>
  path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const ensureTrashDir = async (root: FileSystemDirectoryHandle) =>
  ensureDirectoryPath(root, [DUPLICATE_TRASH_DIR]);

export async function moveFilesToDuplicateTrash(
  files: ScannedFile[],
  root: FileSystemDirectoryHandle,
  basePath = '',
  options: { signal?: AbortSignal; icon?: string } = {},
): Promise<MoveToTrashOutcome> {
  const { signal, icon } = options;
  if (!files.length) return { successes: [], failures: [], bytesMoved: 0 };
  const trashDir = await ensureTrashDir(root);
  const successes: MoveToTrashSuccess[] = [];
  const failures: MoveToTrashFailure[] = [];
  let bytesMoved = 0;
  const now = Date.now();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    try {
      throwIfAborted(signal);
      const { file: blob } = await getFileInfo(file.handle);
      const backupName = `${now}-${index}-${uniqueSlug(joinPath(basePath, file.relativePath)) || 'file'}`;
      const backupHandle = await trashDir.getFileHandle(backupName, { create: true });
      const writer = await backupHandle.createWritable();
      await writer.write(blob);
      await writer.close();
      await file.directory.removeEntry(file.name);

      const payload: DuplicateTrashPayload = {
        type: 'duplicate-file',
        relativePath: joinPath(basePath, file.relativePath),
        backupName,
        size: blob.size,
      };

      const trashItem: TrashItem = {
        id: 'duplicate-finder',
        title: file.name,
        icon: icon || '/themes/Yaru/apps/radar-symbolic.svg',
        closedAt: Date.now(),
        payload,
      };

      successes.push({ file, trashItem, payload });
      bytesMoved += blob.size;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      failures.push({ file, error: message });
    }
  }

  return { successes, failures, bytesMoved };
}

export async function restoreDuplicateFromTrash(
  payload: DuplicateTrashPayload,
  root: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const trashDir = await ensureTrashDir(root);
    const backupHandle = await trashDir.getFileHandle(payload.backupName);
    const file = await backupHandle.getFile();
    const targetPath = normalisePath(payload.relativePath);
    const segments = targetPath.split('/');
    const fileName = segments.pop();
    if (!fileName) return false;
    const targetDir = await ensureDirectoryPath(root, segments);
    const targetHandle = await targetDir.getFileHandle(fileName, { create: true });
    const writer = await targetHandle.createWritable();
    await writer.write(file);
    await writer.close();
    await trashDir.removeEntry(payload.backupName);
    return true;
  } catch {
    return false;
  }
}

export async function discardDuplicateTrashPayload(
  payload: DuplicateTrashPayload,
  root: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const trashDir = await ensureTrashDir(root);
    await trashDir.removeEntry(payload.backupName);
    return true;
  } catch {
    return false;
  }
}

export const isDuplicateTrashPayload = (
  payload: unknown,
): payload is DuplicateTrashPayload =>
  typeof payload === 'object' &&
  payload !== null &&
  (payload as { type?: unknown }).type === 'duplicate-file' &&
  typeof (payload as { backupName?: unknown }).backupName === 'string' &&
  typeof (payload as { relativePath?: unknown }).relativePath === 'string';

