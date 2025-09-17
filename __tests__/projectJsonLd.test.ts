import { createProjectJsonLd, inferProjectSchemaType } from '../lib/jsonld/project';
import type { ProjectFrontmatter } from '../lib/jsonld/types';

describe('createProjectJsonLd', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it('builds Article JSON-LD when the frontmatter is marked as an article', () => {
    const frontMatter: ProjectFrontmatter = {
      title: 'Writing Tools',
      type: 'article',
      author: 'Alex Writer',
      description: 'Deep dive on internal writing utilities.',
      tags: ['security', 'guides'],
      image: '/hero.png',
      datePublished: '2024-12-01',
      dateModified: '2024-12-05',
      section: 'Guides',
    };

    const jsonLd = createProjectJsonLd(frontMatter, 'writing-tools');

    expect(jsonLd['@type']).toBe('Article');
    expect(jsonLd.headline).toBe('Writing Tools');
    expect(jsonLd.author).toEqual({ '@type': 'Person', name: 'Alex Writer' });
    expect(jsonLd.url).toBe('https://example.com/projects/writing-tools');
    expect(jsonLd.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': 'https://example.com/projects/writing-tools',
    });
    expect(jsonLd.keywords).toEqual(['security', 'guides']);
    expect(jsonLd.image).toBe('/hero.png');
    expect(jsonLd.articleSection).toBe('Guides');
  });

  it('builds SoftwareSourceCode JSON-LD for software projects', () => {
    const frontMatter: ProjectFrontmatter = {
      title: 'Packet Analyzer',
      type: 'software',
      author: { name: 'Alex Dev', url: 'https://example.com/about' },
      repo: 'https://github.com/example/packet-analyzer',
      programmingLanguage: 'TypeScript',
      runtime: 'Node.js',
      operatingSystem: 'Cross-platform',
      applicationCategory: 'SecurityTool',
      downloadUrl: 'https://example.com/downloads/packet-analyzer.zip',
      version: '1.2.0',
      tags: ['security', 'network'],
      sameAs: ['https://github.com/example/packet-analyzer', 'https://github.com/example/packet-analyzer'],
    };

    const jsonLd = createProjectJsonLd(frontMatter, 'packet-analyzer', 'https://projects.example.com');

    expect(jsonLd['@type']).toBe('SoftwareSourceCode');
    expect(jsonLd.name).toBe('Packet Analyzer');
    expect(jsonLd.author).toEqual({
      '@type': 'Person',
      name: 'Alex Dev',
      url: 'https://example.com/about',
    });
    expect(jsonLd.codeRepository).toBe('https://github.com/example/packet-analyzer');
    expect(jsonLd.programmingLanguage).toBe('TypeScript');
    expect(jsonLd.runtimePlatform).toBe('Node.js');
    expect(jsonLd.operatingSystem).toBe('Cross-platform');
    expect(jsonLd.applicationCategory).toBe('SecurityTool');
    expect(jsonLd.downloadUrl).toBe('https://example.com/downloads/packet-analyzer.zip');
    expect(jsonLd.version).toBe('1.2.0');
    expect(jsonLd.keywords).toEqual(['security', 'network']);
    expect(jsonLd.sameAs).toEqual(['https://github.com/example/packet-analyzer']);
    expect(jsonLd.url).toBe('https://projects.example.com/projects/packet-analyzer');
  });

  it('falls back to sensible defaults when optional fields are missing', () => {
    const jsonLd = createProjectJsonLd({}, 'untitled-project', 'https://portfolio.example');

    expect(jsonLd['@type']).toBe('SoftwareSourceCode');
    expect(jsonLd.headline).toBe('Untitled Project');
    expect(jsonLd.author).toEqual({ '@type': 'Person', name: 'Alex Unnippillil' });
    expect(jsonLd.url).toBe('https://portfolio.example/projects/untitled-project');
    expect(jsonLd.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': 'https://portfolio.example/projects/untitled-project',
    });
    expect(jsonLd).not.toHaveProperty('description');
    expect(jsonLd).not.toHaveProperty('keywords');
    expect(jsonLd).not.toHaveProperty('image');
  });
});

describe('inferProjectSchemaType', () => {
  it('detects article from layout hint', () => {
    expect(
      inferProjectSchemaType({
        layout: 'Article',
      }),
    ).toBe('Article');
  });

  it('defaults to software when hints are missing', () => {
    expect(inferProjectSchemaType({})).toBe('SoftwareSourceCode');
  });
});
