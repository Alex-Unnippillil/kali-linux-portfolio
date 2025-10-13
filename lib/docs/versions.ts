export interface DocsVersion {
  id: string;
  label: string;
  summary: string;
  releaseDate: string;
  isCurrent: boolean;
}

export const DOCS_VERSIONS: DocsVersion[] = [
  {
    id: 'v1',
    label: 'Version 1',
    summary: 'Initial release of the structured documentation portal.',
    releaseDate: '2025-01-07',
    isCurrent: true,
  },
];

export const DOCS_VERSION_IDS = DOCS_VERSIONS.map((version) => version.id);

export const DOCS_LATEST_VERSION =
  DOCS_VERSIONS.find((version) => version.isCurrent) ?? DOCS_VERSIONS[0];

export const DOCS_LATEST_VERSION_ID = DOCS_LATEST_VERSION.id;

export function getDocsVersionById(id: string | undefined | null): DocsVersion | undefined {
  if (!id) return undefined;
  return DOCS_VERSIONS.find((version) => version.id === id);
}

export function getDocsVersionLabel(id: string | undefined | null): string {
  return getDocsVersionById(id)?.label ?? (id ?? 'Unknown');
}

export function isDocsVersionCurrent(id: string | undefined | null): boolean {
  if (!id) return false;
  return getDocsVersionById(id)?.id === DOCS_LATEST_VERSION_ID;
}
