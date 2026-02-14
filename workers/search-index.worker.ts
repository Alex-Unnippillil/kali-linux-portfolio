export type SearchSource = 'apps' | 'settings' | 'files' | 'help';

export interface SearchRecord {
  id: string;
  title: string;
  description?: string;
  url?: string;
  keywords?: string[];
  path?: string;
  content?: string;
  boost?: number;
}

export interface SearchResult {
  id: string;
  source: SearchSource;
  title: string;
  description?: string;
  url?: string;
  keywords?: string[];
  path?: string;
  score: number;
}

export interface HydrateMessage {
  kind: 'hydrate';
  source: SearchSource;
  records: SearchRecord[];
}

export interface UpsertMessage {
  kind: 'upsert';
  source: SearchSource;
  records: SearchRecord[];
}

export interface RemoveMessage {
  kind: 'remove';
  ids: string[];
  source?: SearchSource;
}

export interface ClearMessage {
  kind: 'clear';
}

export interface QueryMessage {
  kind: 'query';
  requestId: number;
  query: string;
  limit?: number;
  sources?: SearchSource[];
}

export interface CancelMessage {
  kind: 'cancel';
  requestId: number;
}

export type SearchIndexRequest =
  | HydrateMessage
  | UpsertMessage
  | RemoveMessage
  | ClearMessage
  | QueryMessage
  | CancelMessage;

export interface AckResponse {
  kind: 'ack';
  action: 'hydrate' | 'upsert' | 'remove' | 'clear';
  source?: SearchSource;
  ids?: string[];
}

export interface ErrorResponse {
  kind: 'error';
  message: string;
  requestId?: number;
}

export interface ResultsResponse {
  kind: 'results';
  requestId: number;
  results: SearchResult[];
}

export type SearchIndexResponse = AckResponse | ErrorResponse | ResultsResponse;

type IndexedDocument = {
  key: string;
  id: string;
  source: SearchSource;
  title: string;
  titleNormalized: string;
  description?: string;
  url?: string;
  keywords?: string[];
  path?: string;
  content?: string;
  boost: number;
  fullText: string;
  terms: string[];
};

type SearchOptions = {
  limit?: number;
  sources?: SearchSource[];
};

const DEFAULT_BOOST: Record<SearchSource, number> = {
  apps: 4,
  settings: 3,
  files: 2,
  help: 2,
};

class MiniSearchIndex {
  private documents = new Map<string, IndexedDocument>();

  private invertedIndex = new Map<string, Set<string>>();

  private sourceMap = new Map<SearchSource, Set<string>>();

  hydrate(source: SearchSource, records: SearchRecord[]): void {
    this.removeSource(source);
    this.upsert(source, records);
  }

  upsert(source: SearchSource, records: SearchRecord[]): void {
    for (const record of records) {
      if (!record?.id || !record.title) continue;
      const indexed = this.prepareDocument(source, record);
      this.insert(indexed);
    }
  }

  remove(ids: string[], source?: SearchSource): void {
    if (source) {
      for (const id of ids) {
        const key = this.makeKey(source, id);
        this.removeByKey(key);
      }
      return;
    }

    for (const id of ids) {
      for (const [key, doc] of this.documents.entries()) {
        if (doc.id === id) {
          this.removeByKey(key);
          break;
        }
      }
    }
  }

  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.sourceMap.clear();
  }

  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const { limit = 20, sources } = options;
    const normalizedQuery = normalize(query);
    const tokens = tokenize(normalizedQuery);
    const phrase = normalizedQuery.trim();

    const hits: Array<{ doc: IndexedDocument; score: number }> = [];

    for (const doc of this.documents.values()) {
      if (sources && sources.length > 0 && !sources.includes(doc.source)) {
        continue;
      }

      const score = this.scoreDocument(doc, tokens, phrase);
      const threshold = doc.boost + (tokens.length > 0 ? 0.05 : 0);
      if (tokens.length > 0 && score <= threshold) {
        continue;
      }

      hits.push({ doc, score });
    }

    hits.sort((a, b) => {
      if (b.score === a.score) {
        return a.doc.title.localeCompare(b.doc.title);
      }
      return b.score - a.score;
    });

    const limited = hits.slice(0, Math.max(1, limit));

    return limited.map(({ doc, score }) => ({
      id: doc.id,
      source: doc.source,
      title: doc.title,
      description: doc.description,
      url: doc.url,
      keywords: doc.keywords,
      path: doc.path,
      score: Number(score.toFixed(3)),
    }));
  }

  private makeKey(source: SearchSource, id: string): string {
    return `${source}:${id}`;
  }

  private removeSource(source: SearchSource): void {
    const ids = this.sourceMap.get(source);
    if (!ids) return;
    for (const key of ids) {
      this.removeByKey(key);
    }
    this.sourceMap.delete(source);
  }

  private removeByKey(key: string): void {
    const doc = this.documents.get(key);
    if (!doc) return;
    this.documents.delete(key);
    for (const term of doc.terms) {
      const bucket = this.invertedIndex.get(term);
      if (!bucket) continue;
      bucket.delete(key);
      if (bucket.size === 0) {
        this.invertedIndex.delete(term);
      }
    }
    const sourceIds = this.sourceMap.get(doc.source);
    if (sourceIds) {
      sourceIds.delete(key);
      if (sourceIds.size === 0) {
        this.sourceMap.delete(doc.source);
      }
    }
  }

  private insert(doc: IndexedDocument): void {
    const existing = this.documents.get(doc.key);
    if (existing) {
      this.removeByKey(existing.key);
    }

    this.documents.set(doc.key, doc);

    let sourceIds = this.sourceMap.get(doc.source);
    if (!sourceIds) {
      sourceIds = new Set<string>();
      this.sourceMap.set(doc.source, sourceIds);
    }
    sourceIds.add(doc.key);

    for (const term of doc.terms) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Set<string>());
      }
      this.invertedIndex.get(term)!.add(doc.key);
    }
  }

  private prepareDocument(source: SearchSource, record: SearchRecord): IndexedDocument {
    const key = this.makeKey(source, record.id);
    const boost = typeof record.boost === 'number' ? record.boost : DEFAULT_BOOST[source];

    const textParts = [record.title, record.description, record.keywords?.join(' '), record.path, record.content];
    const fullText = normalize(textParts.filter(Boolean).join(' '));
    const titleNormalized = normalize(record.title);

    const termSet = new Set<string>();
    for (const part of textParts) {
      for (const token of tokenize(part)) {
        termSet.add(token);
      }
    }

    return {
      key,
      id: record.id,
      source,
      title: record.title,
      titleNormalized,
      description: record.description,
      url: record.url,
      keywords: record.keywords,
      path: record.path,
      content: record.content,
      boost,
      fullText,
      terms: Array.from(termSet),
    };
  }

  private scoreDocument(doc: IndexedDocument, tokens: string[], phrase: string): number {
    let score = doc.boost;

    if (tokens.length === 0) {
      return score + Math.min(doc.terms.length * 0.02, 0.6);
    }

    if (phrase && doc.titleNormalized.includes(phrase)) {
      score += 1.5;
    } else if (phrase && doc.fullText.includes(phrase)) {
      score += 1;
    }

    let hasMatch = false;
    for (const token of tokens) {
      const tokenScore = this.scoreToken(token, doc);
      if (tokenScore > 0) {
        hasMatch = true;
        score += tokenScore;
      }
    }

    if (!hasMatch) {
      return doc.boost;
    }

    if (tokens.every((token) => doc.fullText.includes(token))) {
      score += 0.5;
    }

    return score;
  }

  private scoreToken(token: string, doc: IndexedDocument): number {
    let best = 0;

    if (doc.titleNormalized.includes(token)) {
      best = Math.max(best, 1);
    }

    if (doc.fullText.includes(token)) {
      best = Math.max(best, 0.75);
    }

    for (const term of doc.terms) {
      const candidateScore = scoreTerm(token, term);
      if (candidateScore > best) {
        best = candidateScore;
        if (best >= 1) {
          break;
        }
      }
    }

    return best;
  }
}

function normalize(input?: string | null): string {
  if (!input) return '';
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(input?: string | null): string[] {
  const normalized = normalize(input);
  if (!normalized) return [];
  const matches = normalized.match(/[a-z0-9]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function scoreTerm(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (candidate === query) return 1;
  if (candidate.startsWith(query)) return 0.85;
  if (candidate.includes(query)) return 0.65;

  const distance = levenshtein(query, candidate);
  const maxLen = Math.max(query.length, candidate.length);
  if (maxLen === 0) return 0;
  const similarity = 1 - distance / maxLen;
  return similarity > 0.5 ? similarity * 0.6 : 0;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

const index = new MiniSearchIndex();
const cancelledQueries = new Set<number>();

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<SearchIndexRequest>) => {
  const message = event.data;

  switch (message.kind) {
    case 'hydrate':
      index.hydrate(message.source, message.records ?? []);
      ctx.postMessage({ kind: 'ack', action: 'hydrate', source: message.source } satisfies AckResponse);
      break;
    case 'upsert':
      index.upsert(message.source, message.records ?? []);
      ctx.postMessage({ kind: 'ack', action: 'upsert', source: message.source } satisfies AckResponse);
      break;
    case 'remove':
      index.remove(message.ids ?? [], message.source);
      ctx.postMessage({ kind: 'ack', action: 'remove', source: message.source, ids: message.ids } satisfies AckResponse);
      break;
    case 'clear':
      index.clear();
      ctx.postMessage({ kind: 'ack', action: 'clear' } satisfies AckResponse);
      break;
    case 'cancel':
      cancelledQueries.add(message.requestId);
      break;
    case 'query': {
      const { requestId } = message;
      if (cancelledQueries.has(requestId)) {
        cancelledQueries.delete(requestId);
        break;
      }
      try {
        const results = index.search(message.query, {
          limit: message.limit,
          sources: message.sources,
        });
        if (cancelledQueries.has(requestId)) {
          cancelledQueries.delete(requestId);
          break;
        }
        ctx.postMessage({ kind: 'results', requestId, results } satisfies ResultsResponse);
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Unknown search error';
        ctx.postMessage({ kind: 'error', requestId, message: err } satisfies ErrorResponse);
      }
      break;
    }
    default:
      break;
  }
};

export {};
