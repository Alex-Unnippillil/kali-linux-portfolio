export interface SearchDocument {
  id: string;
  title: string;
  /** Optional keywords or synonyms that should increase match score */
  keywords?: string[];
  /** Free-form description to improve fuzzy matches */
  description?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  matchedTerms: string[];
}

export interface SearchQueryOptions {
  limit?: number;
}

export interface SearchQueryResponse {
  results: SearchResult[];
  metrics: {
    evaluated: number;
    elapsedMs: number;
  };
}

interface IndexedDocument {
  id: string;
  title: string;
  /** Concatenated, lower-cased searchable text */
  corpus: string;
  tokens: Set<string>;
}

const tokenize = (input: string): string[] =>
  input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);

export class SearchEngine {
  private index = new Map<string, IndexedDocument>();

  setDocuments(documents: SearchDocument[]): void {
    this.index.clear();
    for (const doc of documents) {
      const corpusParts = [doc.title, ...(doc.keywords ?? []), doc.description ?? ''];
      const corpus = corpusParts
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const tokens = new Set(tokenize(corpus));
      this.index.set(doc.id, {
        id: doc.id,
        title: doc.title,
        corpus,
        tokens,
      });
    }
  }

  clear(): void {
    this.index.clear();
  }

  query(query: string, options: SearchQueryOptions = {}): SearchQueryResponse {
    const tokens = tokenize(query);
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const limit = Math.max(options.limit ?? Number.POSITIVE_INFINITY, 0);

    if (tokens.length === 0) {
      return {
        results: [],
        metrics: {
          evaluated: 0,
          elapsedMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start,
        },
      };
    }

    const results: SearchResult[] = [];
    let evaluated = 0;

    for (const doc of this.index.values()) {
      evaluated += 1;
      let score = 0;
      const matchedTerms: string[] = [];

      for (const token of tokens) {
        if (doc.tokens.has(token)) {
          score += 3;
          matchedTerms.push(token);
        } else if (doc.corpus.includes(token)) {
          score += 1;
          matchedTerms.push(token);
        }
      }

      if (score > 0) {
        // Slightly prioritize shorter titles to surface primary matches first
        const lengthBonus = Math.max(1, 10 - tokenize(doc.title).length);
        results.push({
          id: doc.id,
          score: score + lengthBonus * 0.01,
          matchedTerms,
        });
      }
    }

    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.id.localeCompare(b.id);
    });

    const limited = Number.isFinite(limit) ? results.slice(0, limit) : results;
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();

    return {
      results: limited,
      metrics: {
        evaluated,
        elapsedMs: end - start,
      },
    };
  }
}
