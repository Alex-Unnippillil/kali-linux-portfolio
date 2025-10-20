import {
  filterAndRankSections,
  normalizeItems,
  type SectionSource,
  type SearchSection,
  type SearchableSourceItem,
} from '../utils/commandPalette/indexing';
import type { CommandPaletteItemType } from '../utils/commandPalette/types';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

type WarmPayload = {
  sections?: SectionSource[];
  docsManifestUrl?: string;
  sitemapUrl?: string;
  recentSelections?: SearchableSourceItem[];
};

type SearchPayload = {
  requestId: number;
  query: string;
  sections?: SectionSource[];
  recentSelections?: SearchableSourceItem[];
};

type IncomingMessage =
  | { type: 'warm'; payload: WarmPayload }
  | { type: 'search'; payload: SearchPayload };

type DocsManifestEntry = {
  id: string;
  title: string;
  summary?: string;
  path: string;
};

type CachedSection = {
  url?: string;
  section: SectionSource;
};

let docsCache: CachedSection | null = null;
let routesCache: CachedSection | null = null;
let warmPromise: Promise<void> | null = null;
let cachedStaticSections: SectionSource[] = [];
let cachedDocsUrl: string | undefined;
let cachedSitemapUrl: string | undefined;

const titleizeSegment = (segment: string): string =>
  segment
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildRouteTitle = (path: string): string => {
  if (path === '/' || path === '') return 'Home';
  const parts = path.split('/').filter(Boolean);
  return parts.map(titleizeSegment).join(' / ');
};

const ensureDocsSection = async (manifestUrl?: string): Promise<SectionSource | null> => {
  if (!manifestUrl) return null;
  if (docsCache && docsCache.url === manifestUrl) {
    return docsCache.section;
  }
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Failed to load docs manifest: ${response.status}`);
    const data: DocsManifestEntry[] = await response.json();
    const items = Array.isArray(data)
      ? data.map((entry) => ({
          id: entry.id,
          title: entry.title || entry.id,
          subtitle: entry.summary,
          href: entry.path,
          keywords: [entry.title, entry.summary, entry.path].filter(Boolean) as string[],
        }))
      : [];
    const section: SectionSource = {
      type: 'doc',
      items: normalizeItems(items, 'doc' as CommandPaletteItemType),
    };
    docsCache = { url: manifestUrl, section };
    return section;
  } catch (error) {
    console.warn('Command palette worker failed to build docs section:', error);
    return null;
  }
};

const ensureRoutesSection = async (sitemapUrl?: string): Promise<SectionSource | null> => {
  if (!sitemapUrl) return null;
  if (routesCache && routesCache.url === sitemapUrl) {
    return routesCache.section;
  }
  try {
    const response = await fetch(sitemapUrl);
    if (!response.ok) throw new Error(`Failed to load sitemap: ${response.status}`);
    const xml = await response.text();
    const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)];
    const paths = new Set<string>();
    matches.forEach((match) => {
      const value = match[1];
      try {
        const url = new URL(value, self.location?.origin || 'https://example.com');
        paths.add(url.pathname);
      } catch {
        if (value.startsWith('/')) {
          paths.add(value);
        }
      }
    });
    const items = Array.from(paths)
      .filter(Boolean)
      .map((path) => {
        const normalized = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
        return {
          id: normalized || '/',
          title: buildRouteTitle(normalized),
          subtitle: 'Site page',
          href: normalized || '/',
          keywords: normalized.split('/').filter(Boolean),
        };
      });
    const section: SectionSource = {
      type: 'route',
      items: normalizeItems(items, 'route' as CommandPaletteItemType),
    };
    routesCache = { url: sitemapUrl, section };
    return section;
  } catch (error) {
    console.warn('Command palette worker failed to build routes section:', error);
    return null;
  }
};

const warmStaticSections = async (payload: WarmPayload): Promise<void> => {
  cachedDocsUrl = payload.docsManifestUrl;
  cachedSitemapUrl = payload.sitemapUrl;
  const [docsSection, routesSection] = await Promise.all([
    ensureDocsSection(payload.docsManifestUrl),
    ensureRoutesSection(payload.sitemapUrl),
  ]);
  cachedStaticSections = [docsSection, routesSection].filter(Boolean) as SectionSource[];
};

const ensureWarm = async (): Promise<void> => {
  if (warmPromise) {
    await warmPromise.catch(() => {});
  } else if (!cachedStaticSections.length && (cachedDocsUrl || cachedSitemapUrl)) {
    warmPromise = warmStaticSections({ docsManifestUrl: cachedDocsUrl, sitemapUrl: cachedSitemapUrl });
    await warmPromise.catch(() => {});
  }
};

const handleWarm = (payload: WarmPayload) => {
  warmPromise = warmStaticSections(payload).catch((error) => {
    console.warn('Command palette worker warm error:', error);
  });
  warmPromise.finally(() => {
    warmPromise = null;
    ctx.postMessage({ type: 'ready' } satisfies WorkerReadyMessage);
  });
};

const handleSearch = async (payload: SearchPayload) => {
  try {
    await ensureWarm();
    const sources: SectionSource[] = [];
    if (Array.isArray(payload.sections)) {
      sources.push(...payload.sections);
    }
    if (cachedStaticSections.length) {
      sources.push(...cachedStaticSections);
    }
    const sections: SearchSection[] = filterAndRankSections(sources, payload.query, payload.recentSelections);
    ctx.postMessage({
      type: 'result',
      requestId: payload.requestId,
      sections,
    });
  } catch (error) {
    console.warn('Command palette worker search error:', error);
    ctx.postMessage({ type: 'error' });
  }
};

ctx.addEventListener('message', (event: MessageEvent<IncomingMessage>) => {
  const { data } = event;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'warm') {
    handleWarm(data.payload);
    return;
  }
  if (data.type === 'search') {
    handleSearch(data.payload);
  }
});

type WorkerReadyMessage = {
  type: 'ready';
};
