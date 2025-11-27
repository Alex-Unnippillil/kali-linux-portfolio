import { SearchEngine, type SearchDocument } from '../lib/search/engine';

describe('SearchEngine', () => {
  const documents: SearchDocument[] = [
    { id: 'nmap', title: 'Nmap Scanner', keywords: ['network', 'scanner'] },
    { id: 'wireshark', title: 'Wireshark Protocol Analyzer', keywords: ['network', 'packets'] },
    { id: 'metasploit', title: 'Metasploit Framework', keywords: ['exploit', 'framework'] },
  ];

  it('indexes documents and returns sorted matches', () => {
    const engine = new SearchEngine();
    engine.setDocuments(documents);

    const result = engine.query('network scanner');

    expect(result.results.map(r => r.id)).toEqual(['nmap', 'wireshark']);
    expect(result.metrics.evaluated).toBe(documents.length);
    expect(result.metrics.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('respects the limit option and handles case-insensitive matches', () => {
    const engine = new SearchEngine();
    engine.setDocuments(documents);

    const result = engine.query('NETWORK', { limit: 1 });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe('nmap');
  });

  it('returns an empty result set when no tokens are provided', () => {
    const engine = new SearchEngine();
    engine.setDocuments(documents);

    expect(engine.query('')).toEqual(
      expect.objectContaining({
        results: [],
        metrics: expect.objectContaining({ evaluated: 0 }),
      }),
    );
  });

  it('can be re-indexed with new documents', () => {
    const engine = new SearchEngine();
    engine.setDocuments(documents);
    engine.setDocuments([{ id: 'hashcat', title: 'Hashcat Password Cracker', keywords: ['password'] }]);

    const result = engine.query('password');

    expect(result.results.map(r => r.id)).toEqual(['hashcat']);
    expect(result.metrics.evaluated).toBe(1);
  });
});
