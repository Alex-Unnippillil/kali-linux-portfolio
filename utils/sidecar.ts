import { z } from 'zod';

export const SIDECAR_EXTENSION = '.meta.json';

export interface SidecarMetadata {
  version: number;
  notes: string;
  tags: string[];
  rating: number | null;
  favorite: boolean;
  color: string | null;
  custom: Record<string, unknown>;
  updatedAt?: string;
}

export type SidecarPatch = Partial<Omit<SidecarMetadata, 'version' | 'custom'>> & {
  custom?: Record<string, unknown>;
};

export interface MergeConflict {
  field: keyof Omit<SidecarMetadata, 'version'> | `custom.${string}`;
  existing: unknown;
  incoming: unknown;
}

export interface MergeResult {
  merged: SidecarMetadata;
  conflicts: MergeConflict[];
  changed: boolean;
}

export interface SidecarExportEntry {
  path: string;
  data: SidecarMetadata;
}

export interface SidecarExportPayload {
  version: number;
  generatedAt: string;
  entries: SidecarExportEntry[];
}

export interface SidecarImportConflict {
  path: string;
  existing: SidecarMetadata;
  incoming: SidecarMetadata;
  conflicts: MergeConflict[];
}

export interface SidecarImportResult {
  applied: string[];
  conflicts: SidecarImportConflict[];
  skipped: string[];
}

type DirectoryHandle = FileSystemDirectoryHandle;

type FileHandle = FileSystemFileHandle & {
  createWritable: () => Promise<{ write: (data: string | Blob) => Promise<void>; close: () => Promise<void> }>;
  getFile: () => Promise<{ text: () => Promise<string> }>;
};

const KNOWN_FIELDS: Array<keyof SidecarMetadata> = [
  'version',
  'notes',
  'tags',
  'rating',
  'favorite',
  'color',
  'custom',
  'updatedAt',
];

const sidecarSchema = z
  .object({
    version: z.number().int().min(1).default(1),
    notes: z.string().default(''),
    tags: z.array(z.string()).default([]),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    favorite: z.boolean().default(false),
    color: z.string().nullable().optional(),
    custom: z.record(z.unknown()).default({}),
    updatedAt: z.string().optional(),
  })
  .passthrough();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function canonicalTimestamp(input?: string): string | undefined {
  if (!input) return undefined;
  const parsed = Date.parse(input);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function sanitizeTags(tags?: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const trimmed = tag.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    output.push(trimmed);
  }
  return output;
}

function sanitizeRating(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  return Math.min(5, Math.max(1, rounded));
}

function sanitizeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function mergeCustom(base: Record<string, unknown>, patch?: Record<string, unknown>): Record<string, unknown> {
  if (!patch || !isPlainObject(patch)) return { ...base };
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = value;
  }
  return merged;
}

export function emptySidecar(): SidecarMetadata {
  return {
    version: 1,
    notes: '',
    tags: [],
    rating: null,
    favorite: false,
    color: null,
    custom: {},
    updatedAt: undefined,
  };
}

export function normalizeSidecar(input: unknown): SidecarMetadata {
  const defaults = emptySidecar();
  const parsed = sidecarSchema.safeParse(input);
  if (!parsed.success) return defaults;
  const data = parsed.data;
  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!KNOWN_FIELDS.includes(key as keyof SidecarMetadata)) {
      extras[key] = value;
    }
  }
  const combinedCustom = mergeCustom(
    isPlainObject(data.custom) ? (data.custom as Record<string, unknown>) : {},
    extras,
  );

  return {
    version: 1,
    notes: typeof data.notes === 'string' ? data.notes : '',
    tags: sanitizeTags(data.tags),
    rating: sanitizeRating(data.rating),
    favorite: !!data.favorite,
    color: sanitizeColor(data.color),
    custom: combinedCustom,
    updatedAt: canonicalTimestamp(data.updatedAt),
  };
}

function sanitizePatch(patch: SidecarPatch): Partial<SidecarMetadata> {
  const sanitized: Partial<SidecarMetadata> = {};
  if (Object.prototype.hasOwnProperty.call(patch, 'notes')) {
    sanitized.notes = typeof patch.notes === 'string' ? patch.notes : '';
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'tags')) {
    sanitized.tags = sanitizeTags(patch.tags);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'rating')) {
    sanitized.rating = patch.rating === null ? null : sanitizeRating(patch.rating);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'favorite')) {
    sanitized.favorite = !!patch.favorite;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'color')) {
    sanitized.color = sanitizeColor(patch.color);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'custom')) {
    sanitized.custom = mergeCustom({}, patch.custom);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'updatedAt')) {
    sanitized.updatedAt = canonicalTimestamp(patch.updatedAt);
  }
  return sanitized;
}

export function applySidecarUpdate(
  existing: SidecarMetadata | null | undefined,
  patch: SidecarPatch,
  options: { timestamp?: string } = {},
): SidecarMetadata {
  const base = existing ? normalizeSidecar(existing) : emptySidecar();
  const sanitizedPatch = sanitizePatch(patch);
  const merged: SidecarMetadata = {
    version: 1,
    notes: Object.prototype.hasOwnProperty.call(sanitizedPatch, 'notes')
      ? sanitizedPatch.notes ?? ''
      : base.notes,
    tags: Object.prototype.hasOwnProperty.call(sanitizedPatch, 'tags')
      ? sanitizedPatch.tags ?? []
      : base.tags,
    rating: Object.prototype.hasOwnProperty.call(sanitizedPatch, 'rating')
      ? sanitizedPatch.rating ?? null
      : base.rating,
    favorite: Object.prototype.hasOwnProperty.call(sanitizedPatch, 'favorite')
      ? sanitizedPatch.favorite ?? false
      : base.favorite,
    color: Object.prototype.hasOwnProperty.call(sanitizedPatch, 'color')
      ? sanitizedPatch.color ?? null
      : base.color,
    custom: Object.prototype.hasOwnProperty.call(sanitizedPatch, 'custom')
      ? mergeCustom(base.custom, sanitizedPatch.custom)
      : { ...base.custom },
    updatedAt:
      canonicalTimestamp(options.timestamp) ??
      sanitizedPatch.updatedAt ??
      new Date().toISOString(),
  };

  return merged;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (val as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return val;
  });
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'object' && typeof b === 'object') {
    return stableStringify(a) === stableStringify(b);
  }
  return false;
}

function timestampScore(value?: string): number {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

export function mergeSidecarRecords(
  existing: SidecarMetadata | null | undefined,
  incoming: SidecarMetadata | null | undefined,
  strategy: 'newer' | 'incoming' | 'existing' = 'newer',
): MergeResult {
  const base = existing ? normalizeSidecar(existing) : emptySidecar();
  const candidate = incoming ? normalizeSidecar(incoming) : emptySidecar();
  const merged: SidecarMetadata = { ...base, custom: { ...base.custom } };
  const conflicts: MergeConflict[] = [];
  let changed = false;

  const fields: Array<keyof Omit<SidecarMetadata, 'version'>> = [
    'notes',
    'tags',
    'rating',
    'favorite',
    'color',
    'updatedAt',
  ];

  const baseTimestamp = timestampScore(base.updatedAt);
  const incomingTimestamp = timestampScore(candidate.updatedAt);

  const preferIncoming = strategy === 'incoming';
  const preferExisting = strategy === 'existing';

  for (const field of fields) {
    const existingValue = base[field];
    const incomingValue = candidate[field];
    if (deepEqual(existingValue, incomingValue)) continue;

    let takeIncoming = false;
    if (preferIncoming) {
      takeIncoming = true;
    } else if (preferExisting) {
      takeIncoming = false;
    } else {
      if (!Number.isNaN(incomingTimestamp) && Number.isNaN(baseTimestamp)) {
        takeIncoming = true;
      } else if (Number.isNaN(incomingTimestamp) && !Number.isNaN(baseTimestamp)) {
        takeIncoming = false;
      } else if (!Number.isNaN(incomingTimestamp) && !Number.isNaN(baseTimestamp)) {
        takeIncoming = incomingTimestamp >= baseTimestamp;
      } else {
        conflicts.push({ field, existing: existingValue, incoming: incomingValue });
        continue;
      }
    }

    if (takeIncoming) {
      merged[field] = incomingValue as SidecarMetadata[typeof field];
      changed = true;
    }
  }

  const existingCustom = base.custom ?? {};
  const incomingCustom = candidate.custom ?? {};
  const customKeys = new Set([...Object.keys(existingCustom), ...Object.keys(incomingCustom)]);
  for (const key of customKeys) {
    const existingValue = existingCustom[key];
    const incomingValue = incomingCustom[key];
    if (deepEqual(existingValue, incomingValue)) continue;
    let takeIncoming = false;
    if (preferIncoming) {
      takeIncoming = true;
    } else if (preferExisting) {
      takeIncoming = false;
    } else if (!Number.isNaN(incomingTimestamp) && !Number.isNaN(baseTimestamp)) {
      takeIncoming = incomingTimestamp >= baseTimestamp;
    } else if (!Number.isNaN(incomingTimestamp) && Number.isNaN(baseTimestamp)) {
      takeIncoming = true;
    } else if (Number.isNaN(incomingTimestamp) && !Number.isNaN(baseTimestamp)) {
      takeIncoming = false;
    } else {
      conflicts.push({ field: `custom.${key}`, existing: existingValue, incoming: incomingValue });
      continue;
    }
    if (takeIncoming) {
      merged.custom[key] = incomingValue;
      changed = true;
    }
  }

  if (changed && !merged.updatedAt) {
    merged.updatedAt = candidate.updatedAt ?? base.updatedAt ?? new Date().toISOString();
  }

  return { merged, conflicts, changed };
}

export function getSidecarFileName(entryName: string): string {
  return entryName.endsWith(SIDECAR_EXTENSION) ? entryName : `${entryName}${SIDECAR_EXTENSION}`;
}

export function stripSidecarExtension(fileName: string): string {
  return fileName.endsWith(SIDECAR_EXTENSION)
    ? fileName.slice(0, -SIDECAR_EXTENSION.length)
    : fileName;
}

export function isSidecarFileName(name: string): boolean {
  return name.endsWith(SIDECAR_EXTENSION);
}

async function readRawSidecar(dir: DirectoryHandle, entryName: string): Promise<SidecarMetadata | null> {
  try {
    const handle = (await dir.getFileHandle(getSidecarFileName(entryName))) as FileHandle;
    const file = await handle.getFile();
    const text = await file.text();
    return normalizeSidecar(JSON.parse(text));
  } catch {
    return null;
  }
}

async function writeRawSidecar(
  dir: DirectoryHandle,
  entryName: string,
  data: SidecarMetadata,
): Promise<boolean> {
  try {
    const handle = (await dir.getFileHandle(getSidecarFileName(entryName), {
      create: true,
    })) as FileHandle;
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function readSidecar(
  dir: DirectoryHandle,
  entryName: string,
): Promise<SidecarMetadata | null> {
  return await readRawSidecar(dir, entryName);
}

export async function writeSidecar(
  dir: DirectoryHandle,
  entryName: string,
  patch: SidecarPatch | SidecarMetadata,
  options: { mode?: 'patch' | 'replace'; timestamp?: string } = {},
): Promise<SidecarMetadata> {
  const mode = options.mode ?? 'patch';
  if (mode === 'replace') {
    const normalized = normalizeSidecar(patch);
    const withTimestamp = options.timestamp
      ? { ...normalized, updatedAt: canonicalTimestamp(options.timestamp) }
      : normalized;
    await writeRawSidecar(dir, entryName, withTimestamp);
    return withTimestamp;
  }
  const existing = await readRawSidecar(dir, entryName);
  const updated = applySidecarUpdate(existing, patch as SidecarPatch, {
    timestamp: options.timestamp,
  });
  await writeRawSidecar(dir, entryName, updated);
  return updated;
}

export async function deleteSidecar(dir: DirectoryHandle, entryName: string): Promise<boolean> {
  try {
    await dir.removeEntry(getSidecarFileName(entryName));
    return true;
  } catch {
    return false;
  }
}

function splitPath(path: string): { segments: string[]; leaf: string } {
  const segments = path
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  const leaf = segments.pop() ?? '';
  return { segments, leaf };
}

async function ensureDirectory(
  base: DirectoryHandle,
  segments: string[],
  options: FileSystemGetDirectoryOptions = { create: true },
): Promise<DirectoryHandle | null> {
  let current: DirectoryHandle = base;
  for (const segment of segments) {
    try {
      current = (await current.getDirectoryHandle(segment, options)) as DirectoryHandle;
    } catch {
      return null;
    }
  }
  return current;
}

export async function readSidecarAtPath(
  base: DirectoryHandle,
  path: string,
): Promise<SidecarMetadata | null> {
  const { segments, leaf } = splitPath(path);
  const dir = await ensureDirectory(base, segments, { create: false });
  if (!dir || !leaf) return null;
  return await readSidecar(dir, leaf);
}

export async function writeSidecarAtPath(
  base: DirectoryHandle,
  path: string,
  data: SidecarPatch | SidecarMetadata,
  options: { mode?: 'patch' | 'replace'; timestamp?: string } = {},
): Promise<SidecarMetadata | null> {
  const { segments, leaf } = splitPath(path);
  if (!leaf) return null;
  const dir = await ensureDirectory(base, segments, { create: true });
  if (!dir) return null;
  return await writeSidecar(dir, leaf, data, options);
}

export async function deleteSidecarAtPath(
  base: DirectoryHandle,
  path: string,
): Promise<boolean> {
  const { segments, leaf } = splitPath(path);
  const dir = await ensureDirectory(base, segments, { create: false });
  if (!dir || !leaf) return false;
  return await deleteSidecar(dir, leaf);
}

export async function exportSidecars(
  base: DirectoryHandle,
  options: { basePath?: string } = {},
): Promise<SidecarExportPayload> {
  const prefix = options.basePath
    ? options.basePath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/^\.\/?/, '')
    : '';
  const entries: SidecarExportEntry[] = [];

  async function walk(dir: DirectoryHandle, pathPrefix: string) {
    for await (const [name, handle] of dir.entries()) {
      if ((handle as any).kind === 'directory') {
        await walk(handle as DirectoryHandle, `${pathPrefix}${name}/`);
      } else if (isSidecarFileName(name)) {
        const raw = await readRawSidecar(dir, stripSidecarExtension(name));
        if (!raw) continue;
        entries.push({ path: `${pathPrefix}${stripSidecarExtension(name)}`, data: raw });
      }
    }
  }

  await walk(base, prefix ? `${prefix.replace(/\/?$/, '/')}` : '');

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries,
  };
}

const exportPayloadSchema = z.object({
  version: z.number().int().min(1),
  generatedAt: z.string().optional(),
  entries: z
    .array(
      z.object({
        path: z.string(),
        data: z.any(),
      }),
    )
    .default([]),
});

export async function importSidecars(
  base: DirectoryHandle,
  payload: unknown,
  options: { strategy?: 'newer' | 'incoming' | 'existing'; basePath?: string } = {},
): Promise<SidecarImportResult> {
  let data: SidecarExportPayload;
  if (typeof payload === 'string') {
    data = exportPayloadSchema.parse(JSON.parse(payload)) as SidecarExportPayload;
  } else {
    data = exportPayloadSchema.parse(payload) as SidecarExportPayload;
  }

  const applied: string[] = [];
  const conflicts: SidecarImportConflict[] = [];
  const skipped: string[] = [];

  for (const entry of data.entries) {
    const targetPath = options.basePath ? `${options.basePath}/${entry.path}`.replace(/\/+/g, '/') : entry.path;
    const { segments, leaf } = splitPath(targetPath);
    if (!leaf) {
      skipped.push(targetPath);
      continue;
    }
    const dir = await ensureDirectory(base, segments, { create: true });
    if (!dir) {
      skipped.push(targetPath);
      continue;
    }

    const incomingMeta = normalizeSidecar(entry.data);
    const existing = await readSidecar(dir, leaf);

    if (!existing) {
      await writeSidecar(dir, leaf, incomingMeta, { mode: 'replace' });
      applied.push(targetPath);
      continue;
    }

    const merged = mergeSidecarRecords(existing, incomingMeta, options.strategy ?? 'newer');
    if (merged.conflicts.length) {
      conflicts.push({
        path: targetPath,
        existing,
        incoming: incomingMeta,
        conflicts: merged.conflicts,
      });
      continue;
    }

    await writeSidecar(dir, leaf, merged.merged, {
      mode: 'replace',
      timestamp: merged.merged.updatedAt,
    });
    applied.push(targetPath);
  }

  return { applied, conflicts, skipped };
}

export async function applyImportResolution(
  base: DirectoryHandle,
  conflict: SidecarImportConflict,
  resolution: 'existing' | 'incoming',
): Promise<SidecarMetadata | null> {
  if (resolution === 'existing') {
    return await writeSidecarAtPath(base, conflict.path, conflict.existing, {
      mode: 'replace',
      timestamp: conflict.existing.updatedAt,
    });
  }
  return await writeSidecarAtPath(base, conflict.path, conflict.incoming, {
    mode: 'replace',
    timestamp: conflict.incoming.updatedAt,
  });
}

