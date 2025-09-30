import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AppDocConfig } from '@/types/app-docs';

interface DocResponseBody {
  id: string;
  title: string;
  summary?: string;
  markdown: string;
}

type DocsIndex = Record<string, AppDocConfig>;

let docsIndexCache: DocsIndex | null = null;

const DOCS_ROOT = path.join(process.cwd(), 'docs');
const INDEX_PATH = path.join(DOCS_ROOT, 'app-docs.json');

async function loadDocsIndex(): Promise<DocsIndex> {
  if (docsIndexCache) {
    return docsIndexCache;
  }
  const raw = await fs.readFile(INDEX_PATH, 'utf8');
  const parsed = JSON.parse(raw) as DocsIndex;
  docsIndexCache = parsed;
  return parsed;
}

function resolveDocPath(source: string) {
  const resolved = path.resolve(process.cwd(), source);
  if (!resolved.startsWith(DOCS_ROOT)) {
    throw new Error('Invalid documentation source path');
  }
  return resolved;
}

function toBulletList(items: unknown[]): string | null {
  const valid = items
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  if (!valid.length) return null;
  return valid.map((item) => `- ${item}`).join('\n');
}

function toOrderedList(items: unknown[]): string | null {
  const valid = items
    .map((item, index) => (typeof item === 'string' ? `${index + 1}. ${item.trim()}` : ''))
    .filter(Boolean);
  if (!valid.length) return null;
  return valid.join('\n');
}

function convertJsonDoc(value: unknown): { markdown: string; title?: string } {
  if (!value || typeof value !== 'object') {
    const fallback = JSON.stringify(value, null, 2);
    return { markdown: `\`\`\`json\n${fallback}\n\`\`\`` };
  }

  const doc = value as Record<string, unknown>;
  const parts: string[] = [];
  const intro = typeof doc.intro === 'string' ? doc.intro.trim() : '';
  if (intro) {
    parts.push(intro);
  }

  const sections = Array.isArray(doc.sections) ? doc.sections : [];
  sections.forEach((section) => {
    if (!section || typeof section !== 'object') return;
    const sectionData = section as Record<string, unknown>;
    const heading = typeof sectionData.heading === 'string' ? sectionData.heading.trim() : '';
    if (heading) {
      parts.push(`## ${heading}`);
    }

    const body = sectionData.body;
    if (typeof body === 'string') {
      const text = body.trim();
      if (text) parts.push(text);
    } else if (Array.isArray(body)) {
      const bullets = toBulletList(body);
      if (bullets) parts.push(bullets);
    }

    const steps = sectionData.steps;
    if (Array.isArray(steps)) {
      const ordered = toOrderedList(steps);
      if (ordered) parts.push(ordered);
    }
  });

  if (!parts.length) {
    const fallback = JSON.stringify(value, null, 2);
    return { markdown: `\`\`\`json\n${fallback}\n\`\`\`` };
  }

  const title = typeof doc.title === 'string' ? doc.title : undefined;
  return { markdown: parts.join('\n\n'), title };
}

async function loadMarkdownForDoc(config: AppDocConfig): Promise<{ markdown: string; title?: string }> {
  const docPath = resolveDocPath(config.source);
  const raw = await fs.readFile(docPath, 'utf8');

  if (config.source.endsWith('.json')) {
    const parsed = JSON.parse(raw);
    return convertJsonDoc(parsed);
  }

  return { markdown: raw };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DocResponseBody | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Missing documentation id' });
    return;
  }

  try {
    const docsIndex = await loadDocsIndex();
    const docConfig = docsIndex[id];

    if (!docConfig) {
      res.status(404).json({ error: 'Documentation not found' });
      return;
    }

    const { markdown, title: derivedTitle } = await loadMarkdownForDoc(docConfig);
    const response: DocResponseBody = {
      id,
      markdown,
      title: docConfig.title || derivedTitle || 'Documentation',
      summary: docConfig.summary,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Failed to load documentation', error);
    res.status(500).json({ error: 'Failed to load documentation' });
  }
}
