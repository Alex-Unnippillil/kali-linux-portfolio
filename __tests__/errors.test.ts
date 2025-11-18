import {
  ERROR_CODES,
  getErrorDefinition,
  getErrorHelpArticle,
  searchHelpArticles,
} from '../utils/errors';

describe('error metadata', () => {
  it('maps every error code to a help article', () => {
    for (const code of ERROR_CODES) {
      const definition = getErrorDefinition(code);
      expect(definition.articleSlug).toBeTruthy();
      const article = getErrorHelpArticle(code);
      expect(article?.slug).toBe(definition.articleSlug);
    }
  });

  it('falls back to ERR_UNKNOWN for unknown codes', () => {
    const definition = getErrorDefinition('ERR_NOT_REAL');
    expect(definition.code).toBe('ERR_UNKNOWN');
    const article = getErrorHelpArticle('ERR_NOT_REAL');
    expect(article?.slug).toBe('troubleshooting-basics');
  });
});

describe('offline help search', () => {
  it('matches keywords and content across articles', () => {
    const networkResults = searchHelpArticles('offline retry');
    expect(networkResults.map((article) => article.slug)).toContain('network-timeout');

    const accessResults = searchHelpArticles('permission role');
    expect(accessResults.map((article) => article.slug)).toContain('access-denied');
  });

  it('requires non-empty query', () => {
    expect(searchHelpArticles('')).toHaveLength(0);
    expect(searchHelpArticles('   ')).toHaveLength(0);
  });

  it('returns unique matches even when keywords overlap', () => {
    const results = searchHelpArticles('error');
    const slugs = results.map((article) => article.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });
});
