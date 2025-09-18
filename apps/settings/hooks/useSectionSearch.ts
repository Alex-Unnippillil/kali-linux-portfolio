import { useMemo, useState } from 'react';
import {
  navigation,
  SettingsControl,
  SettingsSection,
  SettingsSectionId,
} from '../navigation';

export type SectionSearchResult = SettingsControl;

const normalize = (value: string) => value.trim().toLowerCase();

export interface UseSectionSearch {
  query: string;
  setQuery: (value: string) => void;
  clear: () => void;
  results: SectionSearchResult[];
  highlightSlugs: Set<string>;
  hasQuery: boolean;
  section?: SettingsSection;
  normalizedQuery: string;
}

export function useSectionSearch(activeSectionId: SettingsSectionId): UseSectionSearch {
  const [query, setQuery] = useState('');

  const section = useMemo(
    () => navigation.find((item) => item.id === activeSectionId),
    [activeSectionId],
  );

  const normalizedQuery = useMemo(() => normalize(query), [query]);

  const results = useMemo(() => {
    if (!section || normalizedQuery.length === 0) return [];
    return section.controls.filter((control) => {
      const haystack = [
        control.label,
        control.description,
        ...(control.keywords ?? []),
      ].filter(Boolean) as string[];
      return haystack.some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [section, normalizedQuery]);

  const highlightSlugs = useMemo(
    () => new Set(results.map((control) => control.slug)),
    [results],
  );

  const clear = () => setQuery('');

  return {
    query,
    setQuery,
    clear,
    results,
    highlightSlugs,
    hasQuery: normalizedQuery.length > 0,
    section,
    normalizedQuery,
  };
}
