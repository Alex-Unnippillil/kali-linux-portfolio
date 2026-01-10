export interface DocNavItem {
  slug: string;
  title: string;
  unavailable?: boolean;
}

export interface DocNavSection {
  id: string;
  title: string;
  items: DocNavItem[];
}

export type DocContentFormat = 'markdown' | 'text';

export interface DocRecord {
  versionId: string;
  slug: string;
  slugSegments: string[];
  title: string;
  raw: string;
  format: DocContentFormat;
  sourcePath: string;
}

export interface DocsIndex {
  versionId: string;
  docs: DocRecord[];
  nav: DocNavSection[];
  slugMap: Map<string, DocRecord>;
}

export interface LoadedDoc {
  requestedVersionId: string;
  resolvedVersionId: string;
  fallbackVersionId?: string;
  record: DocRecord;
}
