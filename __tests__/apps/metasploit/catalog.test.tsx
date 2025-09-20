import {
  normalizeModules,
  buildModuleTrie,
  searchModulesByTokens,
  filterModuleList,
  type Module,
  type FilterState,
} from '../../../apps/metasploit';

describe('Metasploit catalog filtering', () => {
  const rawModules = [
    {
      name: 'auxiliary/test/windows',
      description: 'Windows enumeration module',
      type: 'auxiliary',
      severity: 'low',
      rank: 'good',
      platform: 'Windows',
      disclosure_date: '2022-01-15',
      tags: ['enum'],
      cve: ['CVE-2022-0001'],
      doc: 'Doc 1',
    },
    {
      name: 'auxiliary/test/linux',
      description: 'Linux privilege module',
      type: 'auxiliary',
      severity: 'low',
      rank: 'excellent',
      platform: ['Linux', 'Unix'],
      disclosure_date: '2021-06-10',
      tags: ['privesc'],
      cve: [],
      doc: 'Doc 2',
    },
    {
      name: 'auxiliary/test/multi',
      description: 'Multi stage router helper',
      type: 'auxiliary',
      severity: 'low',
      platform: 'Cisco, Linux',
      disclosure_date: '2020-02-01',
      tags: ['enum'],
      cve: ['CVE-2020-0002'],
      doc: 'Doc 3',
    },
  ] as unknown as Module[];

  const normalized = normalizeModules(rawModules);
  const trie = buildModuleTrie(normalized);
  const baseFilters: FilterState = {
    query: '',
    tag: '',
    ranks: [],
    platforms: [],
    startDate: '',
    endDate: '',
  };

  it('normalizes module metadata for filtering facets', () => {
    expect(normalized[0].platform).toEqual(['Windows']);
    expect(normalized[1].platform).toEqual(['Linux', 'Unix']);
    expect(normalized[2].platform).toEqual(['Cisco', 'Linux']);
    expect(normalized[2].rank).toBe('normal');
    expect(normalized[0].disclosure).toBe('2022-01-15');
    expect(normalized[2].reference).toEqual(
      expect.arrayContaining(['Doc 3', 'CVE-2020-0002']),
    );
  });

  it('indexes modules in a trie for fast prefix search', () => {
    expect(searchModulesByTokens(trie, normalized.length, '')).toEqual([0, 1, 2]);

    const linuxMatches = searchModulesByTokens(trie, normalized.length, 'linux');
    expect(linuxMatches).toEqual([1, 2]);

    const linuxModuleMatches = searchModulesByTokens(
      trie,
      normalized.length,
      'linux module',
    );
    expect(linuxModuleMatches).toEqual([1]);

    const helperMatches = searchModulesByTokens(
      trie,
      normalized.length,
      'linux helper',
    );
    expect(helperMatches).toEqual([2]);

    const windowsMatches = searchModulesByTokens(
      trie,
      normalized.length,
      'windows',
    );
    expect(windowsMatches).toEqual([0]);
  });

  it('filters modules by multi-select facets and date range', () => {
    const allMatches = searchModulesByTokens(trie, normalized.length, '');

    const rankFiltered = filterModuleList(normalized, allMatches, {
      ...baseFilters,
      ranks: ['excellent'],
    });
    expect(rankFiltered).toHaveLength(1);
    expect(rankFiltered[0].name).toBe('auxiliary/test/linux');

    const platformFiltered = filterModuleList(normalized, allMatches, {
      ...baseFilters,
      platforms: ['Linux'],
    });
    expect(platformFiltered.map((mod) => mod.name)).toEqual([
      'auxiliary/test/linux',
      'auxiliary/test/multi',
    ]);

    const dateFiltered = filterModuleList(normalized, allMatches, {
      ...baseFilters,
      startDate: '2021-01-01',
      endDate: '2021-12-31',
    });
    expect(dateFiltered).toHaveLength(1);
    expect(dateFiltered[0].name).toBe('auxiliary/test/linux');
  });

  it('combines trie search with facet constraints', () => {
    const linuxMatches = searchModulesByTokens(trie, normalized.length, 'linux');
    const filtered = filterModuleList(normalized, linuxMatches, {
      ...baseFilters,
      ranks: ['excellent'],
      platforms: ['Linux'],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('auxiliary/test/linux');
  });
});
