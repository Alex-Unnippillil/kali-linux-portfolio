import glossaryData from '../data/glossary.json';
import { createGlossaryLookup, filterGlossaryEntries, GlossaryEntry } from '../utils/glossary';

describe('glossary utilities', () => {
  const entries = glossaryData as GlossaryEntry[];

  it('returns all entries when query is empty', () => {
    const result = filterGlossaryEntries(entries, '');
    expect(result).toHaveLength(entries.length);
  });

  it('matches terms by alias and id tokens', () => {
    const result = filterGlossaryEntries(entries, 'pstree');
    expect(result.some((entry) => entry.id === 'process-tree')).toBe(true);
  });

  it('requires all query tokens to be present', () => {
    const result = filterGlossaryEntries(entries, 'memory process');
    expect(result.every((entry) => entry.tags?.includes('memory'))).toBe(true);
  });

  it('builds a lookup keyed by aliases', () => {
    const lookup = createGlossaryLookup(entries);
    expect(lookup.pstree?.id).toBe('process-tree');
    expect(lookup['process-tree']?.term).toBeDefined();
    expect(lookup.yara?.id).toBe('yara-scan');
  });
});
