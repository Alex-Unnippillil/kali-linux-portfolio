import lunr from 'lunr';

export interface DesignSearchDocument {
  id: string;
  title: string;
  section: string;
  body: string;
  keywords?: string[];
}

interface CachedIndex {
  index: lunr.Index;
  documents: Record<string, DesignSearchDocument>;
}

let cache: CachedIndex | null = null;

const normaliseDocuments = (docs: DesignSearchDocument[]): Record<string, DesignSearchDocument> => {
  const dictionary: Record<string, DesignSearchDocument> = {};
  docs.forEach((doc) => {
    dictionary[doc.id] = doc;
  });
  return dictionary;
};

export const buildDesignIndex = (docs: DesignSearchDocument[]): lunr.Index => {
  const documents = normaliseDocuments(docs);
  const idx = lunr(function () {
    this.ref('id');
    this.field('title', { boost: 5 });
    this.field('section', { boost: 3 });
    this.field('body');
    this.field('keywords', { boost: 4 });

    docs.forEach((doc) => {
      this.add({ ...doc, keywords: doc.keywords?.join(' ') ?? '' });
    });
  });

  cache = {
    index: idx,
    documents,
  };

  return idx;
};

export const ensureDesignIndex = (docs: DesignSearchDocument[]): CachedIndex => {
  if (!cache) {
    buildDesignIndex(docs);
  }
  return cache!;
};

export const searchDesign = (query: string): DesignSearchDocument[] => {
  if (!cache || !query.trim()) return cache?.documents ? Object.values(cache.documents) : [];
  try {
    const hits = cache.index.search(query);
    return hits
      .map((hit) => cache!.documents[hit.ref])
      .filter((doc): doc is DesignSearchDocument => Boolean(doc));
  } catch {
    return [];
  }
};

export const clearDesignIndex = () => {
  cache = null;
};
