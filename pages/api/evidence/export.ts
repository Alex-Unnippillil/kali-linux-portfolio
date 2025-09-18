import type { NextApiRequest, NextApiResponse } from 'next';
import JSZip from 'jszip';

type RawManifest = {
  version?: unknown;
  generatedAt?: unknown;
  workspace?: unknown;
  items?: unknown;
};

type SanitizedManifest = {
  version: number;
  generatedAt: string;
  workspace: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
};

const removeUndefined = (input: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );

const sanitizeWorkspace = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const workspace = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  const stringKeys = ['origin', 'path', 'exportedBy', 'filter', 'appVersion'] as const;
  stringKeys.forEach((key) => {
    const candidate = workspace[key];
    if (typeof candidate === 'string') {
      sanitized[key] = candidate;
    }
  });

  const numberKeys = ['totalSelected', 'totalAvailable', 'notesSelected', 'filesSelected'] as const;
  numberKeys.forEach((key) => {
    const candidate = workspace[key];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      sanitized[key] = candidate;
    }
  });

  const tagSummary = workspace.tagSummary;
  if (Array.isArray(tagSummary)) {
    const tags = tagSummary
      .map((tag) => String(tag).trim())
      .filter((tag) => tag.length > 0);
    if (tags.length > 0) {
      sanitized.tagSummary = tags;
    }
  }

  return sanitized;
};

const sanitizeItem = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  const idValue = item.id;
  if (typeof idValue === 'string' || typeof idValue === 'number') {
    sanitized.id = idValue;
  }

  const typeValue = item.type;
  if (typeof typeValue === 'string') {
    sanitized.type = typeValue;
  }

  const stringKeys = ['title', 'name', 'hash', 'path', 'mimeType', 'createdAt', 'lastModified'] as const;
  stringKeys.forEach((key) => {
    const candidate = item[key];
    if (typeof candidate === 'string') {
      sanitized[key] = candidate;
    }
  });

  if (typeof item.size === 'number' && Number.isFinite(item.size)) {
    sanitized.size = item.size;
  }

  if (Array.isArray(item.tags)) {
    const tags = item.tags
      .map((tag) => String(tag).trim())
      .filter((tag) => tag.length > 0);
    if (tags.length > 0) {
      sanitized.tags = tags;
    }
  }

  return Object.keys(sanitized).length > 0 ? removeUndefined(sanitized) : null;
};

const sanitizeManifest = (payload: RawManifest): SanitizedManifest => {
  const generatedAt =
    typeof payload.generatedAt === 'string' ? payload.generatedAt : new Date().toISOString();
  const version = typeof payload.version === 'number' ? payload.version : 1;
  const itemsSource = Array.isArray(payload.items) ? payload.items : [];
  const items = itemsSource
    .map((entry) => sanitizeItem(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));

  return {
    version,
    generatedAt,
    workspace: sanitizeWorkspace(payload.workspace),
    items,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { manifest } = (req.body || {}) as { manifest?: RawManifest };

  if (!manifest || typeof manifest !== 'object') {
    res.status(400).json({ error: 'Manifest payload required' });
    return;
  }

  try {
    const sanitized = sanitizeManifest(manifest);
    const zip = new JSZip();
    zip.file('index.json', JSON.stringify(sanitized, null, 2));
    const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="evidence-manifest.zip"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(archive);
  } catch (error) {
    console.error('Manifest export failed', error);
    res.status(500).json({ error: 'Unable to generate manifest archive' });
  }
}
