export type IndexerJobStatus = 'idle' | 'indexing' | 'paused' | 'completed' | 'cancelled' | 'error';

export interface IndexerMetadata {
  path: string;
  size: number;
  modified: number;
}

export interface IndexerProgressDetail {
  jobId: number;
  filesProcessed: number;
  bytesProcessed: number;
  pending: number;
  elapsedMs: number;
  currentPath?: string;
}

export interface IndexerCompleteDetail {
  jobId: number;
  filesIndexed: number;
  bytesIndexed: number;
  durationMs: number;
}

export interface IndexerSearchHit {
  path: string;
  line: number;
  text: string;
}

export type IndexerWorkerEvent =
  | { type: 'progress'; detail: IndexerProgressDetail }
  | { type: 'complete'; detail: IndexerCompleteDetail }
  | { type: 'paused'; jobId: number }
  | { type: 'resumed'; jobId: number }
  | { type: 'cancelled'; jobId: number }
  | { type: 'index-update'; jobId: number; metadata: IndexerMetadata }
  | { type: 'search-result'; jobId: number; query: string; hits: IndexerSearchHit[]; requestId?: number }
  | { type: 'error'; jobId: number; message: string };

export interface IndexerEngineOptions {
  throttleMs?: number;
  maxFileSizeBytes?: number;
  includeBinary?: boolean;
}

type DirectoryQueueItem =
  | { type: 'dir'; handle: FileSystemDirectoryHandle; path: string }
  | { type: 'file'; handle: FileSystemFileHandle; path: string };

const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB per file safeguard

const TOKEN_REGEX = /[\p{L}\p{N}\-_]+/gu;

export class IndexerEngine {
  private jobId = 0;
  private queue: DirectoryQueueItem[] = [];
  private processing = false;
  private paused = false;
  private cancelled = false;
  private startedAt = 0;
  private filesProcessed = 0;
  private bytesProcessed = 0;
  private invertedIndex = new Map<string, Map<string, number>>();
  private fileTokens = new Map<string, Map<string, number>>();
  private fileHandles = new Map<string, FileSystemFileHandle>();
  private fileMetadata = new Map<string, IndexerMetadata>();
  private onEvent: (event: IndexerWorkerEvent) => void;
  private options: Required<IndexerEngineOptions>;

  constructor(onEvent: (event: IndexerWorkerEvent) => void, options?: IndexerEngineOptions) {
    this.onEvent = onEvent;
    this.options = {
      throttleMs: options?.throttleMs ?? 8,
      maxFileSizeBytes: options?.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE,
      includeBinary: options?.includeBinary ?? false,
    };
  }

  start(directoryHandle: FileSystemDirectoryHandle, jobId: number, options?: IndexerEngineOptions) {
    if (!directoryHandle) return;
    this.reset(jobId, options);
    this.queue.push({ type: 'dir', handle: directoryHandle, path: '' });
    void this.processQueue();
  }

  pause(jobId: number) {
    if (jobId !== this.jobId) return;
    if (this.paused || this.cancelled) return;
    this.paused = true;
    this.onEvent({ type: 'paused', jobId });
  }

  resume(jobId: number) {
    if (jobId !== this.jobId) return;
    if (!this.paused || this.cancelled) return;
    this.paused = false;
    this.onEvent({ type: 'resumed', jobId });
    void this.processQueue();
  }

  cancel(jobId: number) {
    if (jobId !== this.jobId) return;
    this.cancelled = true;
    this.queue = [];
    this.processing = false;
    this.onEvent({ type: 'cancelled', jobId });
  }

  async updateFile(path: string, handle: FileSystemFileHandle) {
    if (!path || !handle) return;
    if (!this.fileHandles.has(path)) {
      this.fileHandles.set(path, handle);
    }
    await this.indexFile(path, handle);
  }

  async search(jobId: number, query: string, limit = 50, requestId?: number) {
    if (jobId !== this.jobId) return;
    const hits = await this.performSearch(query, limit);
    this.onEvent({ type: 'search-result', jobId, query, hits, requestId });
  }

  private reset(jobId: number, options?: IndexerEngineOptions) {
    this.jobId = jobId;
    this.queue = [];
    this.processing = false;
    this.paused = false;
    this.cancelled = false;
    this.startedAt = this.now();
    this.filesProcessed = 0;
    this.bytesProcessed = 0;
    this.invertedIndex.clear();
    this.fileTokens.clear();
    this.fileHandles.clear();
    this.fileMetadata.clear();
    if (options) {
      this.options = {
        throttleMs: options?.throttleMs ?? this.options.throttleMs,
        maxFileSizeBytes: options?.maxFileSizeBytes ?? this.options.maxFileSizeBytes,
        includeBinary: options?.includeBinary ?? this.options.includeBinary,
      };
    }
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0 && !this.cancelled) {
        if (this.paused) {
          this.processing = false;
          return;
        }
        const item = this.queue.shift();
        if (!item) break;
        if (item.type === 'dir') {
          await this.expandDirectory(item.handle, item.path);
        } else if (item.type === 'file') {
          await this.indexFile(item.path, item.handle);
        }
        await this.yieldControl();
      }
      if (!this.cancelled && !this.paused && this.queue.length === 0) {
        const durationMs = this.now() - this.startedAt;
        this.onEvent({
          type: 'complete',
          detail: {
            jobId: this.jobId,
            filesIndexed: this.filesProcessed,
            bytesIndexed: this.bytesProcessed,
            durationMs,
          },
        });
      }
    } catch (error) {
      this.onEvent({
        type: 'error',
        jobId: this.jobId,
        message: error instanceof Error ? error.message : 'Unknown indexing error',
      });
    } finally {
      this.processing = false;
    }
  }

  private async expandDirectory(handle: FileSystemDirectoryHandle, basePath: string) {
    try {
      for await (const [name, child] of handle.entries()) {
        const path = basePath ? `${basePath}/${name}` : name;
        if (child.kind === 'directory') {
          this.queue.push({ type: 'dir', handle: child, path });
        } else if (child.kind === 'file') {
          this.queue.push({ type: 'file', handle: child, path });
        }
      }
    } catch (error) {
      this.onEvent({
        type: 'error',
        jobId: this.jobId,
        message: error instanceof Error ? error.message : 'Unable to read directory',
      });
    }
  }

  private async indexFile(path: string, handle: FileSystemFileHandle) {
    try {
      const file = await handle.getFile();
      if (!this.options.includeBinary && !this.isTextType(file)) {
        return;
      }
      if (file.size > this.options.maxFileSizeBytes) {
        return;
      }

      const tokens = await this.tokenizeFile(file);
      this.registerFile(path, handle, tokens, file);
      this.filesProcessed += 1;
      this.bytesProcessed += file.size;
      const elapsedMs = this.now() - this.startedAt;
      this.onEvent({
        type: 'index-update',
        jobId: this.jobId,
        metadata: {
          path,
          size: file.size,
          modified: file.lastModified ?? Date.now(),
        },
      });
      this.onEvent({
        type: 'progress',
        detail: {
          jobId: this.jobId,
          filesProcessed: this.filesProcessed,
          bytesProcessed: this.bytesProcessed,
          pending: this.queue.length,
          elapsedMs,
          currentPath: path,
        },
      });
    } catch (error) {
      this.onEvent({
        type: 'error',
        jobId: this.jobId,
        message: error instanceof Error ? error.message : `Unable to index ${path}`,
      });
    }
  }

  private registerFile(
    path: string,
    handle: FileSystemFileHandle,
    tokens: Map<string, number>,
    file: File
  ) {
    const prevTokens = this.fileTokens.get(path);
    if (prevTokens) {
      for (const token of prevTokens.keys()) {
        const entry = this.invertedIndex.get(token);
        if (entry) {
          entry.delete(path);
          if (entry.size === 0) this.invertedIndex.delete(token);
        }
      }
    }
    this.fileTokens.set(path, tokens);
    this.fileHandles.set(path, handle);
    this.fileMetadata.set(path, {
      path,
      size: file.size,
      modified: file.lastModified ?? Date.now(),
    });
    for (const [token, count] of tokens.entries()) {
      let entry = this.invertedIndex.get(token);
      if (!entry) {
        entry = new Map();
        this.invertedIndex.set(token, entry);
      }
      entry.set(path, count);
    }
  }

  private async tokenizeFile(file: File) {
    if (typeof file.stream !== 'function') {
      const text = await file.text();
      const tokens = new Map<string, number>();
      this.addTokens(text, tokens);
      return tokens;
    }

    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    const tokens = new Map<string, number>();
    let remainder = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const content = remainder + chunk;
      remainder = this.captureRemainder(content, tokens);
      if (this.cancelled || this.paused) break;
    }
    const finalChunk = decoder.decode();
    if (finalChunk) {
      const content = remainder + finalChunk;
      remainder = this.captureRemainder(content, tokens);
    } else if (remainder) {
      this.addTokens(remainder, tokens);
      remainder = '';
    }
    if (remainder) {
      this.addTokens(remainder, tokens);
    }
    return tokens;
  }

  private captureRemainder(content: string, tokens: Map<string, number>) {
    if (!content) return '';
    let lastIndex = content.length;
    const match = content.match(/[\p{L}\p{N}\-_]+$/u);
    if (match && match.index !== undefined) {
      lastIndex = match.index;
    }
    const segment = content.slice(0, lastIndex);
    if (segment) this.addTokens(segment, tokens);
    return content.slice(lastIndex);
  }

  private addTokens(text: string, tokens: Map<string, number>) {
    const matches = text.toLowerCase().match(TOKEN_REGEX);
    if (!matches) return;
    for (const token of matches) {
      tokens.set(token, (tokens.get(token) ?? 0) + 1);
    }
  }

  private async performSearch(query: string, limit: number): Promise<IndexerSearchHit[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const terms = Array.from(new Set(normalized.match(TOKEN_REGEX) ?? []));
    if (terms.length === 0) return [];

    let candidatePaths: Set<string> | null = null;
    for (const term of terms) {
      const entry = this.invertedIndex.get(term);
      if (!entry) {
        candidatePaths = new Set();
        break;
      }
      const paths = new Set(entry.keys());
      if (candidatePaths === null) {
        candidatePaths = paths;
      } else {
        candidatePaths = new Set([...candidatePaths].filter((p) => paths.has(p)));
      }
      if (candidatePaths.size === 0) break;
    }

    const hits: IndexerSearchHit[] = [];
    if (!candidatePaths || candidatePaths.size === 0) {
      return hits;
    }

    for (const path of candidatePaths) {
      if (hits.length >= limit) break;
      const handle = this.fileHandles.get(path);
      if (!handle) continue;
      try {
        const file = await handle.getFile();
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i += 1) {
          if (lines[i].toLowerCase().includes(normalized)) {
            hits.push({ path, line: i + 1, text: lines[i] });
            if (hits.length >= limit) break;
          }
        }
      } catch {
        // Ignore read errors for search results
      }
    }
    return hits;
  }

  private async yieldControl() {
    if (this.options.throttleMs <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, this.options.throttleMs));
  }

  private isTextType(file: File) {
    if (!file.type) return true;
    return file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('xml');
  }

  private now() {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }
}

