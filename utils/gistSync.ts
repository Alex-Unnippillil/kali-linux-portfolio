const STORAGE_PREFIX = 'gist-sync:';

interface GistRecord {
  content: string;
  syncedContent: string;
  updatedAt: number;
}

const now = () => Date.now();

const readRecord = (id: string): GistRecord => {
  if (typeof window === 'undefined') {
    return { content: '', syncedContent: '', updatedAt: now() };
  }
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) {
      return { content: '', syncedContent: '', updatedAt: now() };
    }
    const parsed = JSON.parse(raw) as GistRecord;
    return {
      content: parsed.content ?? '',
      syncedContent: parsed.syncedContent ?? parsed.content ?? '',
      updatedAt: parsed.updatedAt ?? now(),
    };
  } catch {
    return { content: '', syncedContent: '', updatedAt: now() };
  }
};

const writeRecord = (id: string, record: GistRecord) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${id}`,
      JSON.stringify(record),
    );
  } catch {
    // ignore storage write errors
  }
};

export interface SyncGistOptions {
  id: string;
  incomingContent: string;
  metadata?: Record<string, unknown>;
}

export const syncGistContent = async ({
  id,
  incomingContent,
  metadata,
}: SyncGistOptions): Promise<string> => {
  if (typeof window === 'undefined') return incomingContent;

  return new Promise((resolve) => {
    const record = readRecord(id);
    const base = record.syncedContent ?? '';
    const local = record.content ?? base;
    const remote = incomingContent;

    const apply = (result: string) => {
      const merged: GistRecord = {
        content: result,
        syncedContent: result,
        updatedAt: now(),
      };
      writeRecord(id, merged);
      resolve(result);
    };

    if (local === base) {
      apply(remote);
      return;
    }
    if (remote === base) {
      writeRecord(id, { content: local, syncedContent: local, updatedAt: now() });
      resolve(local);
      return;
    }
    if (remote === local) {
      apply(remote);
      return;
    }

    window.dispatchEvent(
      new CustomEvent('gist-sync-conflict', {
        detail: {
          key: id,
          base,
          local,
          incoming: remote,
          metadata,
          apply: (merged: string) => apply(merged),
          onCancel: () => {
            resolve(local);
          },
        },
      }),
    );
  });
};

export const updateLocalGistContent = (id: string, content: string) => {
  const record = readRecord(id);
  const next: GistRecord = {
    content,
    syncedContent: record.syncedContent ?? record.content ?? '',
    updatedAt: now(),
  };
  writeRecord(id, next);
};

export const setGistBaseline = (id: string, content: string) => {
  const record: GistRecord = {
    content,
    syncedContent: content,
    updatedAt: now(),
  };
  writeRecord(id, record);
};

export const getGistContent = (id: string): string => readRecord(id).content;

export const clearGistRecord = (id: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
  } catch {
    // ignore
  }
};

