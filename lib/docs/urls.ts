import { DOCS_LATEST_VERSION_ID } from './versions';

export function buildDocsVersionPath(versionId: string, slug?: string): string {
  const base = `/docs/${versionId}`;
  return slug ? `${base}/${slug}` : base;
}

export function buildDocsLatestPath(slug?: string): string {
  return buildDocsVersionPath('latest', slug);
}

export function buildDocsCanonicalPath(slug?: string): string {
  return buildDocsVersionPath(DOCS_LATEST_VERSION_ID, slug);
}

export function buildDocsPreferredPath(
  slug?: string,
  options?: { versionId?: string; useLatestAlias?: boolean }
): string {
  const versionId = options?.versionId;
  if (!slug) {
    if (!versionId || options?.useLatestAlias || versionId === DOCS_LATEST_VERSION_ID) {
      return buildDocsLatestPath();
    }
    return buildDocsVersionPath(versionId);
  }

  if (!versionId || options?.useLatestAlias || versionId === DOCS_LATEST_VERSION_ID) {
    return buildDocsLatestPath(slug);
  }

  return buildDocsVersionPath(versionId, slug);
}
