/* eslint-disable no-restricted-globals */
import {
  ArchiveEntry,
  ExtractedEntryChunk,
  createTarArchive,
  createZipArchive,
  extractTarArchive,
  extractZipArchive,
} from './archiveWorkerCore';

interface CreateMessage {
  id: string;
  action: 'create';
  format: 'zip' | 'tar';
  entries: ArchiveEntry[];
  name: string;
}

interface ExtractMessage {
  id: string;
  action: 'extract';
  format: 'zip' | 'tar';
  archive: File;
}

interface CancelMessage {
  id: string;
  action: 'cancel';
}

type WorkerMessage = CreateMessage | ExtractMessage | CancelMessage;

type WorkerResultMessage =
  | { id: string; type: 'progress'; processed: number; total: number }
  | { id: string; type: 'result'; buffer: ArrayBuffer; mimeType: string; name: string }
  | { id: string; type: 'entry'; entry: Omit<ExtractedEntryChunk, 'chunk'> & { chunk: ArrayBuffer } }
  | { id: string; type: 'error'; message: string }
  | { id: string; type: 'cancelled' }
  | { id: string; type: 'done' };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

const controllers = new Map<string, AbortController>();

function send(message: WorkerResultMessage, transfer?: Transferable[]) {
  if (transfer) {
    ctx.postMessage(message, transfer);
  } else {
    ctx.postMessage(message);
  }
}

function toTransferable(chunk: Uint8Array): ArrayBuffer {
  if (chunk.byteLength === 0) {
    return new ArrayBuffer(0);
  }
  if (chunk.byteOffset === 0 && chunk.byteLength === chunk.buffer.byteLength) {
    return chunk.buffer;
  }
  return chunk.slice().buffer;
}

async function handleCreate(message: CreateMessage) {
  const { id, format, entries, name } = message;
  const controller = new AbortController();
  controllers.set(id, controller);
  try {
    const onProgress = (processed: number, total: number) => {
      send({ id, type: 'progress', processed, total });
    };
    const buffer =
      format === 'zip'
        ? await createZipArchive(entries, { signal: controller.signal, onProgress })
        : await createTarArchive(entries, { signal: controller.signal, onProgress });
    const mimeType = format === 'zip' ? 'application/zip' : 'application/x-tar';
    send(
      {
        id,
        type: 'result',
        buffer: buffer.buffer,
        mimeType,
        name,
      },
      buffer.byteLength ? [buffer.buffer] : undefined,
    );
    send({ id, type: 'done' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      send({ id, type: 'cancelled' });
    } else {
      send({ id, type: 'error', message: (error as Error).message });
    }
  } finally {
    controllers.delete(id);
  }
}

async function handleExtract(message: ExtractMessage) {
  const { id, format, archive } = message;
  const controller = new AbortController();
  controllers.set(id, controller);
  try {
    const onProgress = (processed: number, total: number) => {
      send({ id, type: 'progress', processed, total });
    };
    const onEntry = (entry: ExtractedEntryChunk) => {
      const transferable = toTransferable(entry.chunk);
      send(
        {
          id,
          type: 'entry',
          entry: {
            path: entry.path,
            final: entry.final,
            directory: entry.directory,
            permissions: entry.permissions,
            lastModified: entry.lastModified,
            chunk: transferable,
          },
        },
        transferable.byteLength ? [transferable] : undefined,
      );
    };
    if (format === 'zip') {
      await extractZipArchive(archive, {
        signal: controller.signal,
        onProgress,
        onEntry,
      });
    } else {
      await extractTarArchive(archive, {
        signal: controller.signal,
        onProgress,
        onEntry,
      });
    }
    send({ id, type: 'done' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      send({ id, type: 'cancelled' });
    } else {
      send({ id, type: 'error', message: (error as Error).message });
    }
  } finally {
    controllers.delete(id);
  }
}

ctx.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const data = event.data;
  if (data.action === 'cancel') {
    controllers.get(data.id)?.abort();
    controllers.delete(data.id);
    return;
  }
  if (data.action === 'create') {
    handleCreate(data).catch((error) => {
      send({ id: data.id, type: 'error', message: (error as Error).message });
    });
  } else if (data.action === 'extract') {
    handleExtract(data).catch((error) => {
      send({ id: data.id, type: 'error', message: (error as Error).message });
    });
  }
});

export default null as any;
