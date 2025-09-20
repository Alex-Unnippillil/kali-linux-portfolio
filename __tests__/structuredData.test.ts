import {
  generatePersonSchema,
  generateProjectItemList,
  generatePortfolioJsonLd,
} from '@/utils/structuredData';

const getItemListElements = (result: Record<string, unknown>): Array<Record<string, unknown>> =>
  (result.itemListElement as Array<Record<string, unknown>>) ?? [];

describe('structured data generator', () => {
  it('builds a Person schema with core metadata', () => {
    const schema = generatePersonSchema();
    const sameAs = (schema.sameAs as string[]) ?? [];
    const knowsAbout = (schema.knowsAbout as string[]) ?? [];

    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Alex Unnippillil',
      url: 'https://unnippillil.com',
      jobTitle: 'Cybersecurity Specialist',
    });
    expect(sameAs).toEqual(
      expect.arrayContaining([
        'https://github.com/Alex-Unnippillil',
        'https://www.linkedin.com/in/unnippillil/',
      ]),
    );
    expect(knowsAbout).toContain('Cybersecurity');
  });

  it('creates an ItemList for projects with descriptions and keywords', () => {
    const result = generateProjectItemList(
      [
        {
          name: 'Encryption Toolkit',
          link: 'https://example.com/encryption',
          description: ['AES cipher demo', 'CLI utilities'],
          domains: ['Python', 'Security'],
        },
        {
          name: 'Network Visualizer',
          link: 'https://example.com/network',
          description: 'Graphs a network topology',
        },
      ],
      { listName: 'Test Projects', listUrl: 'https://example.com/projects' },
    );

    expect(result).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Test Projects',
      url: 'https://example.com/projects',
      numberOfItems: 2,
    });

    const items = getItemListElements(result);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      url: 'https://example.com/encryption',
      item: {
        '@type': 'SoftwareSourceCode',
        name: 'Encryption Toolkit',
        url: 'https://example.com/encryption',
        description: 'AES cipher demo CLI utilities',
        keywords: 'Python, Security',
      },
    });
  });

  it('deduplicates projects by link and respects limit', () => {
    const result = generateProjectItemList(
      [
        { name: 'One', link: 'https://example.com/project' },
        { name: 'Duplicate', link: 'https://example.com/project' },
        { name: 'Two', link: 'https://example.com/second' },
      ],
      { limit: 1 },
    );

    const items = getItemListElements(result);
    expect(result.numberOfItems).toBe(1);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      position: 1,
      url: 'https://example.com/project',
    });
  });

  it('packages person and project data when generating the portfolio bundle', () => {
    const bundle = generatePortfolioJsonLd([
      { name: 'One', link: 'https://example.com/one' },
    ]);

    expect(bundle).toHaveLength(2);
    expect(bundle[0]).toMatchObject({ '@type': 'Person' });
    expect(bundle[1]).toMatchObject({ '@type': 'ItemList' });
  });
});
