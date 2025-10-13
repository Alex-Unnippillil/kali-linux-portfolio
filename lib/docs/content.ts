import { promises as fs } from 'fs';
import path from 'node:path';
import { marked } from 'marked';

import { DOCS_LATEST_VERSION_ID, DOCS_VERSION_IDS, getDocsVersionLabel } from './versions';
import { joinDocSlugSegments, slugifyDocSegment } from './slug';
import type {
  DocContentFormat,
  DocNavItem,
  DocNavSection,
  DocRecord,
  DocsIndex,
  LoadedDoc,
} from './types';

marked.setOptions({ mangle: false, headerIds: true });

const DOCS_ROOT = path.join(process.cwd(), 'docs', 'versions');

const SUPPORTED_MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const SUPPORTED_TEXT_EXTENSIONS = new Set(['.txt']);

function assertVersion(versionId: string): void {
  if (!DOCS_VERSION_IDS.includes(versionId)) {
    throw new Error(`Unknown documentation version: ${versionId}`);
  }
}

function isSupportedFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return SUPPORTED_MARKDOWN_EXTENSIONS.has(ext) || SUPPORTED_TEXT_EXTENSIONS.has(ext);
}

function determineFormat(fileName: string): DocContentFormat {
  const ext = path.extname(fileName).toLowerCase();
  if (SUPPORTED_MARKDOWN_EXTENSIONS.has(ext)) {
    return 'markdown';
  }
  if (SUPPORTED_TEXT_EXTENSIONS.has(ext)) {
    return 'text';
  }
  throw new Error(`Unsupported documentation file format: ${fileName}`);
}

function toTitleCaseFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function extractTitle(raw: string): string | undefined {
  const match = raw.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function inferTitleFromPath(segments: string[]): string {
  if (segments.length === 0) {
    return 'Untitled Document';
  }
  const last = segments[segments.length - 1];
  return toTitleCaseFromSlug(last);
}

async function walkDocs(
  versionId: string,
  dir: string,
  parentSegments: string[]
): Promise<DocRecord[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const docs: DocRecord[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const childSegments = [...parentSegments, slugifyDocSegment(entry.name)];
      const nestedDocs = await walkDocs(versionId, entryPath, childSegments);
      docs.push(...nestedDocs);
    } else if (entry.isFile() && isSupportedFile(entry.name)) {
      const raw = await fs.readFile(entryPath, 'utf8');
      const format = determineFormat(entry.name);
      const lastSegment = slugifyDocSegment(entry.name);
      const slugSegments = [...parentSegments, lastSegment];
      const slug = joinDocSlugSegments(slugSegments);
      const title = extractTitle(raw) ?? inferTitleFromPath(slugSegments);

      docs.push({
        versionId,
        slug,
        slugSegments,
        title,
        raw,
        format,
        sourcePath: entryPath,
      });
    }
  }

  return docs;
}

function buildNav(docs: DocRecord[]): DocNavSection[] {
  const sectionMap = new Map<string, DocNavSection>();

  for (const doc of docs) {
    const sectionKey = doc.slugSegments.length > 1 ? doc.slugSegments[0] : 'general';
    const sectionTitle = sectionKey === 'general' ? 'General' : toTitleCaseFromSlug(sectionKey);
    if (!sectionMap.has(sectionKey)) {
      sectionMap.set(sectionKey, { id: sectionKey, title: sectionTitle, items: [] });
    }
    const section = sectionMap.get(sectionKey)!;
    section.items.push({ slug: doc.slug, title: doc.title });
  }

  const sections = Array.from(sectionMap.values());
  sections.sort((a, b) => {
    if (a.id === 'general') return -1;
    if (b.id === 'general') return 1;
    return a.title.localeCompare(b.title);
  });

  for (const section of sections) {
    section.items.sort((a, b) => a.title.localeCompare(b.title));
  }

  return sections;
}

export async function buildDocsIndex(versionId: string): Promise<DocsIndex> {
  assertVersion(versionId);
  const versionDir = path.join(DOCS_ROOT, versionId);
  const stats = await fs.stat(versionDir).catch(() => undefined);
  if (!stats || !stats.isDirectory()) {
    throw new Error(`Documentation directory missing for version ${versionId}`);
  }

  const docs = await walkDocs(versionId, versionDir, []);
  docs.sort((a, b) => a.slug.localeCompare(b.slug));

  const nav = buildNav(docs);
  const slugMap = new Map(docs.map((doc) => [doc.slug, doc]));

  return { versionId, docs, nav, slugMap };
}

export function renderDocContent(record: DocRecord): string {
  if (record.format === 'markdown') {
    return marked.parse(record.raw);
  }

  const escaped = record.raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<pre><code>${escaped}</code></pre>`;
}

export async function loadDoc(
  versionId: string,
  slug: string
): Promise<LoadedDoc | undefined> {
  const index = await buildDocsIndex(versionId);
  const record = index.slugMap.get(slug);
  if (!record) return undefined;
  return {
    requestedVersionId: versionId,
    resolvedVersionId: versionId,
    record,
  };
}

export async function loadDocWithFallback(
  requestedVersionId: string,
  slug: string
): Promise<LoadedDoc | undefined> {
  const index = await buildDocsIndex(requestedVersionId);
  const record = index.slugMap.get(slug);
  if (record) {
    return {
      requestedVersionId,
      resolvedVersionId: requestedVersionId,
      record,
    };
  }

  if (requestedVersionId === DOCS_LATEST_VERSION_ID) {
    return undefined;
  }

  const latest = await buildDocsIndex(DOCS_LATEST_VERSION_ID);
  const fallback = latest.slugMap.get(slug);
  if (!fallback) {
    return undefined;
  }

  return {
    requestedVersionId,
    resolvedVersionId: DOCS_LATEST_VERSION_ID,
    fallbackVersionId: DOCS_LATEST_VERSION_ID,
    record: fallback,
  };
}

export function augmentNavWithFallback(
  nav: DocNavSection[],
  fallback: LoadedDoc | undefined
): DocNavSection[] {
  if (!fallback?.fallbackVersionId) {
    return nav;
  }

  const unavailableSection: DocNavSection = {
    id: 'unavailable',
    title: `Unavailable in ${getDocsVersionLabel(fallback.requestedVersionId)}`,
    items: [
      {
        slug: fallback.record.slug,
        title: fallback.record.title,
        unavailable: true,
      },
    ],
  };

  return [...nav, unavailableSection];
}

export function getDocsDirectory(versionId: string): string {
  assertVersion(versionId);
  return path.join(DOCS_ROOT, versionId);
}
