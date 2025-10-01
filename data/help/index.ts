import rawArticles from './articles.json';

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  keywords: string[];
  content: string[];
}

type IndexedHelpArticle = HelpArticle & { searchText: string };

const HELP_ARTICLES_INTERNAL: IndexedHelpArticle[] = (rawArticles as HelpArticle[]).map((article) => {
  const keywords = [...article.keywords];
  const content = [...article.content];
  const searchText = [article.title, article.summary, keywords.join(' '), content.join(' ')]
    .join(' ')
    .toLowerCase();
  return {
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    keywords,
    content,
    searchText,
  };
});

HELP_ARTICLES_INTERNAL.forEach((article) => {
  Object.freeze(article.keywords);
  Object.freeze(article.content);
});

Object.freeze(HELP_ARTICLES_INTERNAL);

const HELP_ARTICLE_INDEX = new Map<string, IndexedHelpArticle>(
  HELP_ARTICLES_INTERNAL.map((article) => [article.slug, article])
);

export const HELP_ARTICLES: readonly HelpArticle[] = HELP_ARTICLES_INTERNAL;

export function listHelpArticles(): readonly HelpArticle[] {
  return HELP_ARTICLES;
}

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLE_INDEX.get(slug);
}

export function searchHelpArticles(query: string, limit = 5): HelpArticle[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const seen = new Set<string>();
  const matches: HelpArticle[] = [];

  for (const article of HELP_ARTICLES_INTERNAL) {
    if (article.searchText.includes(normalized) || article.keywords.some((keyword) => keyword.toLowerCase().includes(normalized))) {
      if (!seen.has(article.slug)) {
        seen.add(article.slug);
        matches.push(article);
        if (matches.length >= limit) {
          break;
        }
      }
      continue;
    }

    const words = normalized.split(/\s+/);
    const allWordsPresent = words.every((word) => article.searchText.includes(word));
    if (allWordsPresent && !seen.has(article.slug)) {
      seen.add(article.slug);
      matches.push(article);
      if (matches.length >= limit) {
        break;
      }
    }
  }

  return matches;
}
