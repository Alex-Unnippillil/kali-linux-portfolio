import { transliterate } from '../utils/search/transliterate';

export type TransliterationWorkerRequest = {
  id: number;
  type: 'bulk';
  payload: string[];
};

export type TransliterationWorkerResponse =
  | { id: number; type: 'result'; payload: string[] }
  | { id: number; type: 'error'; error: string };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = event => {
  const data = event.data as TransliterationWorkerRequest;
  if (!data || typeof data.id !== 'number' || data.type !== 'bulk') {
    return;
  }
  try {
    const payload = data.payload ?? [];
    const result = payload.map(transliterate);
    const message: TransliterationWorkerResponse = {
      id: data.id,
      type: 'result',
      payload: result,
    };
    ctx.postMessage(message);
  } catch (error) {
    const message: TransliterationWorkerResponse = {
      id: data.id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown transliteration error',
    };
    ctx.postMessage(message);
  }
};

export {};
