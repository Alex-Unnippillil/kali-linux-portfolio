import type {
  ArticleJsonLd,
  JsonLdAuthor,
  JsonLdOrganization,
  JsonLdPerson,
  ProjectFrontmatter,
  ProjectJsonLd,
  SoftwareSourceCodeJsonLd,
} from './types';

const DEFAULT_AUTHOR: JsonLdPerson = {
  '@type': 'Person',
  name: 'Alex Unnippillil',
};

const DEFAULT_BASE_URL = 'https://unnippillil.com';

const ARTICLE_HINTS = new Set([
  'article',
  'articles',
  'blog',
  'blogpost',
  'blogposting',
  'news',
  'newsarticle',
  'post',
  'writing',
]);

const SOFTWARE_HINTS = new Set([
  'app',
  'application',
  'code',
  'library',
  'project',
  'software',
  'softwaresourcecode',
  'tool',
]);

export function inferProjectSchemaType(
  frontMatter: ProjectFrontmatter | undefined,
): ArticleJsonLd['@type'] | SoftwareSourceCodeJsonLd['@type'] {
  const hints = [
    frontMatter?.jsonLdType,
    frontMatter?.schemaType,
    frontMatter?.contentType,
    frontMatter?.type,
    frontMatter?.layout,
  ];

  for (const hint of hints) {
    const normalized = normalizeType(hint);
    if (!normalized) continue;
    if (ARTICLE_HINTS.has(normalized)) {
      return 'Article';
    }
    if (SOFTWARE_HINTS.has(normalized)) {
      return 'SoftwareSourceCode';
    }
  }

  return 'SoftwareSourceCode';
}

export function createProjectJsonLd(
  frontMatter: ProjectFrontmatter | undefined,
  slug?: string,
  siteUrl?: string,
): ProjectJsonLd {
  const fm = frontMatter ?? {};
  const schemaType = inferProjectSchemaType(fm);
  const resolvedSlug = normalizeString(slug) ?? fm.slug ?? undefined;
  const baseUrl = resolveBaseUrl(siteUrl);
  const canonicalUrl = fm.url ?? (resolvedSlug ? `${baseUrl}/projects/${resolvedSlug}` : undefined);
  const headline = fm.headline ?? fm.title ?? formatHeadline(resolvedSlug);
  const description = fm.description ?? fm.summary ?? fm.excerpt;
  const keywords = dedupeStrings([
    ...toStringArray(fm.keywords),
    ...toStringArray(fm.tags),
    ...toStringArray(fm.topics),
  ]);
  const images = dedupeStrings([
    ...toStringArray(fm.image),
    ...toStringArray(fm.images),
    ...toStringArray(fm.cover),
    ...toStringArray(fm.coverImage),
    ...toStringArray(fm.hero),
    ...toStringArray(fm.banner),
    ...toStringArray(fm.thumbnail),
  ]);
  const sameAs = dedupeStrings([
    ...toStringArray(fm.sameAs),
    ...toStringArray(fm.links),
  ]);
  const datePublished = fm.datePublished ?? fm.published ?? fm.date;
  const dateModified = fm.dateModified ?? fm.updated ?? fm.lastModified;
  const author = resolveAuthors(fm);

  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    headline,
    author,
    description,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl
      ? {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        }
      : undefined,
    image: images.length ? (images.length === 1 ? images[0] : images) : undefined,
    keywords: keywords.length ? keywords : undefined,
    datePublished,
    dateModified,
  };

  if (schemaType === 'Article') {
    const section = fm.articleSection ?? fm.section ?? chooseArticleSection(fm.category);
    return compactObject({
      ...base,
      articleSection: section,
    }) as ArticleJsonLd;
  }

  const codeRepository = fm.codeRepository ?? fm.repo ?? fm.repository;
  const programmingLanguage = fm.programmingLanguage ?? fm.language;
  const runtimePlatform = fm.runtimePlatform ?? fm.runtime;
  const operatingSystem = fm.operatingSystem ?? fm.os ?? fm.platform;
  const applicationCategory = fm.applicationCategory ?? fm.categoryLabel;
  const downloadUrl = fm.downloadUrl ?? fm.download;
  const version = fm.softwareVersion ?? fm.version;
  const license = fm.license;
  const name = fm.title ?? headline;

  return compactObject({
    ...base,
    name,
    codeRepository,
    programmingLanguage,
    runtimePlatform,
    operatingSystem,
    applicationCategory,
    downloadUrl,
    version,
    license,
    sameAs: sameAs.length ? sameAs : undefined,
  }) as SoftwareSourceCodeJsonLd;
}

function resolveAuthors(fm: ProjectFrontmatter): JsonLdAuthor | JsonLdAuthor[] {
  const candidates = [fm.author, fm.authors, fm.by, fm.creator];
  const parsed = dedupeAuthors(
    candidates.flatMap((candidate) => toAuthorArray(candidate)),
  );
  if (!parsed.length) {
    return DEFAULT_AUTHOR;
  }
  return parsed.length === 1 ? parsed[0] : parsed;
}

function toAuthorArray(candidate: unknown): JsonLdAuthor[] {
  if (candidate == null) return [];
  if (Array.isArray(candidate)) {
    return candidate.flatMap((entry) => toAuthorArray(entry));
  }
  const parsed = parseAuthor(candidate);
  return parsed ? [parsed] : [];
}

function parseAuthor(value: unknown): JsonLdAuthor | null {
  if (typeof value === 'string') {
    const name = normalizeString(value);
    if (!name) return null;
    return { ...DEFAULT_AUTHOR, name };
  }
  if (isPlainObject(value)) {
    const record = value as Record<string, unknown>;
    const name = normalizeString(record.name);
    const url = normalizeString(record.url);
    const rawType = normalizeString(record['@type'] ?? record.type);
    const type: JsonLdAuthor['@type'] = rawType === 'organization' ? 'Organization' : 'Person';
    if (!name) {
      return null;
    }
    const author: JsonLdAuthor = type === 'Organization'
      ? ({ '@type': 'Organization', name } as JsonLdOrganization)
      : ({ '@type': 'Person', name } as JsonLdPerson);
    if (url) {
      author.url = url;
    }
    return author;
  }
  return null;
}

function dedupeAuthors(authors: JsonLdAuthor[]): JsonLdAuthor[] {
  const seen = new Set<string>();
  const result: JsonLdAuthor[] = [];
  for (const author of authors) {
    const key = `${author['@type']}|${author.name}|${author.url ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(author);
  }
  return result;
}

function chooseArticleSection(category: unknown): string | undefined {
  const value = normalizeString(category);
  if (!value) return undefined;
  const compact = value.replace(/\s+/g, '').toLowerCase();
  if (ARTICLE_HINTS.has(compact) || SOFTWARE_HINTS.has(compact)) {
    return undefined;
  }
  return value;
}

function normalizeType(value: unknown): string | undefined {
  const raw = normalizeString(value);
  if (!raw) return undefined;
  return raw.replace(/[^a-z]/gi, '').toLowerCase();
}

function resolveBaseUrl(siteUrl?: string): string {
  const provided = normalizeString(siteUrl) ?? normalizeString(process.env.NEXT_PUBLIC_SITE_URL);
  const base = provided ?? DEFAULT_BASE_URL;
  return base.replace(/\/+$/, '');
}

function formatHeadline(slug?: string, fallback = 'Project'): string {
  if (!slug) return fallback;
  const normalized = slug.trim();
  if (!normalized) return fallback;
  const parts = normalized
    .split(/[\/_-]+/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  return parts.length ? parts.join(' ') : fallback;
}

function toStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => toStringArray(item));
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeString(value);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compactObject<T extends Record<string, unknown>>(input: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const cleaned = compactValue(value);
    if (cleaned !== undefined) {
      result[key] = cleaned;
    }
  }
  return result as T;
}

function compactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => compactValue(item))
      .filter((item) => item !== undefined);
    if (!cleaned.length) return undefined;
    return cleaned;
  }
  if (isPlainObject(value)) {
    const entries: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const cleaned = compactValue(entry);
      if (cleaned !== undefined) {
        entries[key] = cleaned;
      }
    }
    return Object.keys(entries).length ? entries : undefined;
  }
  if (typeof value === 'string') {
    return normalizeString(value);
  }
  if (value === undefined || value === null) {
    return undefined;
  }
  return value;
}
