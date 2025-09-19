import { renderHook } from '@testing-library/react';
import { useSearchIndex } from '../hooks/useSearchIndex';

describe('useSearchIndex', () => {
  const apps = [
    { id: 'terminal', title: 'Terminal', icon: '' },
    { id: 'wireshark', title: 'Wireshark', icon: '' },
    { id: 'dsniff', title: 'dsniff', icon: '' },
    { id: 'john', title: 'John the Ripper', icon: '' },
    { id: 'hashcat', title: 'Hashcat', icon: '' },
    { id: 'hydra', title: 'Hydra', icon: '' },
  ];

  it('matches apps by title substring', () => {
    const { result } = renderHook(() => useSearchIndex(apps));
    expect(result.current.search('term').map((app) => app.id)).toEqual(['terminal']);
  });

  it('resolves a single alias to its app id', () => {
    const { result } = renderHook(() => useSearchIndex(apps));
    expect(result.current.search('cmd').map((app) => app.id)).toEqual(['terminal']);
  });

  it('supports partial alias matches', () => {
    const { result } = renderHook(() => useSearchIndex(apps));
    expect(result.current.search('packet sniff').map((app) => app.id)).toEqual(['wireshark', 'dsniff']);
  });

  it('returns multiple apps for a shared alias', () => {
    const { result } = renderHook(() => useSearchIndex(apps));
    expect(result.current.search('password cracker').map((app) => app.id)).toEqual(['john', 'hashcat']);
  });

  it('filters to valid ids when synonyms reference unknown apps', () => {
    const { result } = renderHook(() => useSearchIndex(apps.slice(0, 2)));
    expect(result.current.search('password cracker')).toHaveLength(0);
  });
});
