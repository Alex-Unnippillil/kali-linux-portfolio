export type SettingsTabId = 'appearance' | 'accessibility' | 'privacy';

export interface SettingsSectionMeta {
  id: string;
  tabId: SettingsTabId;
  label: string;
  keywords?: string[];
}

export interface SettingsSearchIndexEntry extends SettingsSectionMeta {
  haystack: string;
}

const normalize = (value: string): string => value.trim().toLowerCase();

export const buildSettingsSearchIndex = (
  sections: readonly SettingsSectionMeta[],
): SettingsSearchIndexEntry[] =>
  sections.map((section) => ({
    ...section,
    haystack: normalize(
      [section.label, ...(section.keywords ?? [])].join(' '),
    ),
  }));

export const filterSettingsSections = (
  index: readonly SettingsSearchIndexEntry[],
  query: string,
): SettingsSearchIndexEntry[] => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [...index];
  }

  return index.filter((entry) => entry.haystack.includes(normalizedQuery));
};

export const sortSettingsMatches = (
  matches: readonly SettingsSearchIndexEntry[],
  query: string,
): SettingsSearchIndexEntry[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...matches];
  }

  return [...matches].sort((a, b) => {
    const aIndex = a.haystack.indexOf(normalizedQuery);
    const bIndex = b.haystack.indexOf(normalizedQuery);

    if (aIndex === bIndex) {
      return a.label.localeCompare(b.label);
    }

    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
};

export const createSettingsSearch = (
  sections: readonly SettingsSectionMeta[],
) => {
  const index = buildSettingsSearchIndex(sections);
  return (query: string) => sortSettingsMatches(filterSettingsSections(index, query), query);
};
