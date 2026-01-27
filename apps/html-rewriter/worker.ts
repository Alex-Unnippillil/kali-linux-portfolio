import { diffLines } from 'diff';

type DiffPayload = {
  type: 'diff';
  id: number;
  original: string;
  updated: string;
};

type DiffResponse = {
  type: 'diff';
  id: number;
  diff: Array<{ value: string; added?: boolean; removed?: boolean }>;
};

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<DiffPayload>) => void) | null;
  postMessage: (data: DiffResponse) => void;
};

ctx.onmessage = (event: MessageEvent<DiffPayload>) => {
  if (event.data?.type !== 'diff') return;
  const { id, original, updated } = event.data;
  const diff = diffLines(original, updated).map((part) => ({
    value: part.value,
    added: part.added,
    removed: part.removed,
  }));
  const response: DiffResponse = { type: 'diff', id, diff };
  ctx.postMessage(response);
};

export {};
