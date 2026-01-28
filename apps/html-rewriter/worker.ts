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

const diffLinesCustom = (original: string, updated: string) => {
  const originalLines = original.split('\n');
  const updatedLines = updated.split('\n');
  const diff: Array<{ value: string; added?: boolean; removed?: boolean }> = [];
  let originalIndex = 0;
  let updatedIndex = 0;

  while (originalIndex < originalLines.length || updatedIndex < updatedLines.length) {
    const originalLine = originalLines[originalIndex];
    const updatedLine = updatedLines[updatedIndex];

    if (
      originalIndex < originalLines.length &&
      updatedIndex < updatedLines.length &&
      originalLine === updatedLine
    ) {
      diff.push({ value: `${originalLine}\n` });
      originalIndex += 1;
      updatedIndex += 1;
      continue;
    }

    if (originalIndex < originalLines.length) {
      diff.push({ value: `${originalLine}\n`, removed: true });
      originalIndex += 1;
    }

    if (updatedIndex < updatedLines.length) {
      diff.push({ value: `${updatedLine}\n`, added: true });
      updatedIndex += 1;
    }
  }

  return diff;
};

ctx.onmessage = (event: MessageEvent<DiffPayload>) => {
  if (event.data?.type !== 'diff') return;
  const { id, original, updated } = event.data;
  const diff = diffLinesCustom(original, updated);
  const response: DiffResponse = { type: 'diff', id, diff };
  ctx.postMessage(response);
};

export {};
