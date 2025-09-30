export type SearchWorkerInitializeMessage = {
  type: 'initialize';
  payload: {
    apps: WorkerAppMeta[];
  };
};

export type SearchWorkerSearchMessage = {
  type: 'search';
  payload: {
    query: string;
    appIds?: string[];
    requestId: number;
  };
};

export type SearchWorkerShutdownMessage = {
  type: 'shutdown';
};

export type WorkerAppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

type SearchWorkerRequest =
  | SearchWorkerInitializeMessage
  | SearchWorkerSearchMessage
  | SearchWorkerShutdownMessage;

type SearchWorkerResultMessage = {
  type: 'result';
  payload: {
    requestId: number;
    duration: number;
    apps: WorkerAppMeta[];
  };
};

type SearchWorkerReadyMessage = {
  type: 'ready';
};

type SearchWorkerErrorMessage = {
  type: 'error';
  payload: {
    message: string;
    requestId?: number;
  };
};

type SearchWorkerResponse =
  | SearchWorkerResultMessage
  | SearchWorkerReadyMessage
  | SearchWorkerErrorMessage;

type IndexedApp = WorkerAppMeta & {
  normalizedTitle: string;
};

const toNormalized = (value: string) => value.normalize('NFKD').toLowerCase();

let index = new Map<string, IndexedApp>();

const postResponse = (response: SearchWorkerResponse) => {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(response);
};

const handleInitialize = (apps: WorkerAppMeta[]) => {
  index = new Map(
    apps.map(app => [app.id, { ...app, normalizedTitle: toNormalized(app.title) }]),
  );
  postResponse({ type: 'ready' });
};

const handleSearch = (query: string, appIds: string[] | undefined, requestId: number) => {
  if (!index || index.size === 0) {
    postResponse({
      type: 'error',
      payload: {
        requestId,
        message: 'Search index is not ready.',
      },
    });
    return;
  }

  const normalizedQuery = toNormalized(query.trim());
  const sourceApps = (appIds && appIds.length > 0
    ? appIds.map(id => index.get(id)).filter((app): app is IndexedApp => Boolean(app))
    : Array.from(index.values()));

  const start = performance.now();
  const matched =
    normalizedQuery.length === 0
      ? sourceApps
      : sourceApps.filter(app => app.normalizedTitle.includes(normalizedQuery));
  const duration = performance.now() - start;

  postResponse({
    type: 'result',
    payload: {
      requestId,
      duration,
      apps: matched.map(({ normalizedTitle, ...meta }) => meta),
    },
  });
};

const handleShutdown = () => {
  index.clear();
};

self.onmessage = (event: MessageEvent<SearchWorkerRequest>) => {
  const message = event.data;
  if (!message) return;

  try {
    switch (message.type) {
      case 'initialize':
        handleInitialize(message.payload.apps);
        break;
      case 'search':
        handleSearch(message.payload.query, message.payload.appIds, message.payload.requestId);
        break;
      case 'shutdown':
        handleShutdown();
        break;
      default: {
        const exhaustiveCheck: never = message;
        throw new Error(`Unknown message type: ${(exhaustiveCheck as any)?.type ?? 'unknown'}`);
      }
    }
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : 'An unexpected error occurred in the search worker.';
    postResponse({
      type: 'error',
      payload: {
        message: messageText,
        requestId: message.type === 'search' ? message.payload.requestId : undefined,
      },
    });
  }
};

export {}; // ensure module scope
