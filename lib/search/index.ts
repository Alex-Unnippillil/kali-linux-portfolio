import { wrap, type Remote, releaseProxy } from 'comlink';
import type {
  SearchDocument,
  SearchQueryOptions,
  SearchQueryResponse,
  SearchWorkerApi,
} from '../../workers/search.worker';
import { SearchEngine } from './engine';

type SearchWorkerClient = Remote<SearchWorkerApi> | SearchWorkerApi;

type PrepareOptions = {
  /** Optional signature to detect stale caches */
  signature?: string;
};

type RunSearchOptions = SearchQueryOptions & {
  timeoutMs?: number;
};

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

let workerInstance: Worker | null = null;
let workerRemote: Remote<SearchWorkerApi> | null = null;
let clientPromise: Promise<SearchWorkerClient> | null = null;
let currentSignature: string | null = null;
let fallbackClient: SearchWorkerClient | null = null;
let testClient: SearchWorkerClient | null = null;

const terminateWorker = () => {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  if (workerRemote) {
    releaseProxy(workerRemote);
    workerRemote = null;
  }
  clientPromise = null;
};

const createFallbackClient = (): SearchWorkerClient => {
  const engine = new SearchEngine();
  return {
    async setDocuments(documents: SearchDocument[]) {
      engine.setDocuments(documents);
    },
    async query(payload: { query: string; options?: SearchQueryOptions }) {
      return engine.query(payload.query, payload.options);
    },
    async clear() {
      engine.clear();
    },
  } satisfies Mutable<SearchWorkerApi>;
};

const getClient = async (): Promise<SearchWorkerClient> => {
  if (testClient) {
    return testClient;
  }

  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    if (!fallbackClient) {
      fallbackClient = createFallbackClient();
    }
    return fallbackClient;
  }

  if (!clientPromise) {
    clientPromise = Promise.resolve().then(() => {
      workerInstance = new Worker(new URL('../../workers/search.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerRemote = wrap<SearchWorkerApi>(workerInstance);
      return workerRemote;
    });
  }

  return clientPromise;
};

const computeSignature = (documents: readonly SearchDocument[], provided?: string) => {
  if (provided) return provided;
  return JSON.stringify(
    documents.map(doc => [doc.id, doc.title, doc.keywords ?? [], doc.description ?? '']),
  );
};

export const prepareSearchIndex = async (
  documents: readonly SearchDocument[],
  options: PrepareOptions = {},
) => {
  const signature = computeSignature(documents, options.signature);
  if (signature === currentSignature) {
    return { reused: true } as const;
  }

  const client = await getClient();
  await client.setDocuments([...documents]);
  currentSignature = signature;
  return { reused: false } as const;
};

export const runSearch = async (
  query: string,
  options: RunSearchOptions = {},
): Promise<SearchQueryResponse> => {
  const client = await getClient();
  const searchPromise = client.query({ query, options });

  if (!options.timeoutMs) {
    return searchPromise;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<SearchQueryResponse>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Search timed out')), options.timeoutMs);
  });

  // Avoid unhandled rejections when we time out and later resolve
  searchPromise.catch(() => {});

  try {
    return await Promise.race([searchPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const resetSearchIndex = async () => {
  currentSignature = null;
  if (testClient) {
    await testClient.clear();
    return;
  }
  if (fallbackClient) {
    await fallbackClient.clear();
    fallbackClient = null;
  }
  terminateWorker();
};

export const setSearchWorkerImplementationForTesting = (client: SearchWorkerClient | null) => {
  testClient = client;
  currentSignature = null;
  terminateWorker();
};

export type { SearchDocument, SearchQueryOptions, SearchQueryResponse } from '../../workers/search.worker';
