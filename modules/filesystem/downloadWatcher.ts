import { logEvent } from "../../utils/analytics";
import { publish, subscribe } from "../../utils/pubsub";
import {
  DownloadMetadata,
  DownloadRuleConfig,
  DownloadRuleId,
  getDownloadSource,
  loadDownloadRules,
  resolveDownloadPath,
  subscribeToDownloadRules,
} from "../../utils/files/downloadRules";

const DOWNLOAD_DIRECTORY = "downloads";
const CONFLICT_TOPIC = "downloads:conflict";
const DEFAULT_INTERVAL = 8000;
const CONFLICT_TIMEOUT = 15000;

export interface DownloadConflictFileInfo {
  name: string;
  size: number;
  lastModified: number;
}

export interface DownloadConflictEvent {
  id: string;
  name: string;
  destination: string[];
  pathLabel: string;
  metadata: DownloadMetadata;
  rules: DownloadRuleId[];
  existing: DownloadConflictFileInfo;
  incoming: DownloadConflictFileInfo;
}

export type ConflictResolution =
  | { action: "replace" }
  | { action: "skip" }
  | { action: "keep-both" };

export interface DownloadWatcherOptions {
  interval?: number;
  directory?: string;
}

interface MoveRecord {
  originalSegments: string[];
  destinationSegments: string[];
  originalName: string;
  finalName: string;
}

interface ConflictResolverEntry {
  resolve: (resolution: ConflictResolution) => void;
}

const sanitizeSegment = (segment: string): string =>
  segment.replace(/[\\/]+/g, "-").trim() || "untitled";

const formatPath = (segments: string[]): string =>
  ["Downloads", ...segments].map(sanitizeSegment).join(" / ");

class DownloadWatcher {
  private interval: number;
  private directoryName: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private downloadsDir: FileSystemDirectoryHandle | null = null;
  private running = false;
  private known = new Set<string>();
  private rules: DownloadRuleConfig[] = loadDownloadRules();
  private lastBatch: MoveRecord[] = [];
  private unsubscribeRules: (() => void) | null = null;
  private conflictResolvers = new Map<string, ConflictResolverEntry>();

  constructor(private readonly options: DownloadWatcherOptions = {}) {
    this.interval = options.interval ?? DEFAULT_INTERVAL;
    this.directoryName = options.directory ?? DOWNLOAD_DIRECTORY;
  }

  async start(): Promise<boolean> {
    if (this.running) return true;
    if (typeof navigator === "undefined") return false;
    if (!navigator.storage?.getDirectory) return false;
    try {
      const root = await navigator.storage.getDirectory();
      this.downloadsDir = await root.getDirectoryHandle(this.directoryName, {
        create: true,
      });
    } catch {
      this.downloadsDir = null;
      return false;
    }

    this.rules = loadDownloadRules();
    this.unsubscribeRules = subscribeToDownloadRules((rules) => {
      this.rules = rules;
    });
    await this.indexExisting();
    this.running = true;
    this.timer = setInterval(() => {
      this.scan().catch(() => {});
    }, this.interval);
    return true;
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    this.downloadsDir = null;
    this.known.clear();
    this.lastBatch = [];
    this.unsubscribeRules?.();
    this.unsubscribeRules = null;
    this.conflictResolvers.clear();
  }

  async undoLastBatch(): Promise<boolean> {
    if (!this.downloadsDir || this.lastBatch.length === 0) return false;
    const toRestore = [...this.lastBatch].reverse();
    let restored = 0;
    for (const move of toRestore) {
      try {
        const sourceDir = await this.getDir(move.destinationSegments, false);
        if (!sourceDir) continue;
        const fileHandle = await sourceDir.getFileHandle(move.finalName);
        const file = await fileHandle.getFile();
        const targetDir = await this.getDir(move.originalSegments, true);
        if (!targetDir) continue;
        let restoreName = move.originalName;
        const existing = await this.tryGetFile(targetDir, restoreName);
        if (existing) {
          restoreName = await this.generateUniqueName(targetDir, restoreName);
        }
        const targetHandle = await targetDir.getFileHandle(restoreName, {
          create: true,
        });
        const writable = await targetHandle.createWritable();
        await writable.write(await file.arrayBuffer());
        await writable.close();
        await sourceDir.removeEntry(move.finalName);
        restored += 1;
      } catch {
        // Ignore undo failure for individual files
      }
    }
    if (restored > 0) {
      this.lastBatch = [];
      await this.indexExisting();
      try {
        logEvent({ category: "downloads", action: "undo", value: restored });
      } catch {}
      return true;
    }
    return false;
  }

  resolveConflict(id: string, resolution: ConflictResolution): void {
    const entry = this.conflictResolvers.get(id);
    if (!entry) return;
    this.conflictResolvers.delete(id);
    entry.resolve(resolution);
  }

  private async indexExisting(): Promise<void> {
    if (!this.downloadsDir) return;
    this.known.clear();
    try {
      for await (const entry of (this.downloadsDir as any).values()) {
        if (entry.kind === "file") {
          this.known.add(entry.name);
        }
      }
    } catch {}
  }

  private async scan(): Promise<void> {
    if (!this.running || !this.downloadsDir) return;
    const current = new Set<string>();
    const newHandles: FileSystemFileHandle[] = [];
    try {
      for await (const entry of (this.downloadsDir as any).values()) {
        if (entry.kind !== "file") continue;
        current.add(entry.name);
        if (!this.known.has(entry.name)) {
          newHandles.push(entry as FileSystemFileHandle);
        }
      }
    } catch {
      return;
    }

    this.known = current;
    if (newHandles.length === 0) return;
    await this.processNewFiles(newHandles);
  }

  private async processNewFiles(handles: FileSystemFileHandle[]): Promise<void> {
    if (!this.downloadsDir) return;
    const moves: MoveRecord[] = [];
    for (const handle of handles) {
      try {
        const file = await handle.getFile();
        const metadata: DownloadMetadata = {
          name: handle.name,
          size: file.size,
          mimeType: file.type,
          sourceUrl: getDownloadSource(handle.name),
        };
        const { segments, applied } = resolveDownloadPath(metadata, this.rules);
        if (!segments.length) continue;
        const move = await this.moveFile(handle, file, segments, metadata, applied);
        if (move) moves.push(move);
      } catch {
        // Ignore failures per file
      }
    }
    if (moves.length) {
      this.lastBatch = moves;
      try {
        logEvent({
          category: "downloads",
          action: "tidy",
          value: moves.length,
          label: moves.map((m) => `${m.originalName}->${m.finalName}`).join(","),
        });
      } catch {}
    }
  }

  private async moveFile(
    handle: FileSystemFileHandle,
    file: File,
    segments: string[],
    metadata: DownloadMetadata,
    appliedRules: DownloadRuleId[],
  ): Promise<MoveRecord | null> {
    if (!this.downloadsDir) return null;
    const targetDir = await this.getDir(segments, true);
    if (!targetDir) return null;
    let targetName = handle.name;
    const conflictHandle = await this.tryGetFile(targetDir, targetName);
    if (conflictHandle) {
      const resolution = await this.requestConflictResolution(
        handle,
        file,
        segments,
        metadata,
        appliedRules,
        conflictHandle,
      );
      if (resolution.action === "skip") {
        return null;
      }
      if (resolution.action === "keep-both") {
        targetName = await this.generateUniqueName(targetDir, targetName);
      }
      if (resolution.action === "replace") {
        try {
          await targetDir.removeEntry(targetName);
        } catch {}
      }
    }

    try {
      const targetHandle = await targetDir.getFileHandle(targetName, {
        create: true,
      });
      const writable = await targetHandle.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();
      await this.downloadsDir.removeEntry(handle.name);
      return {
        originalSegments: [],
        destinationSegments: segments.slice(),
        originalName: handle.name,
        finalName: targetName,
      };
    } catch {
      return null;
    }
  }

  private async getDir(
    segments: string[],
    create: boolean,
  ): Promise<FileSystemDirectoryHandle | null> {
    if (!this.downloadsDir) return null;
    let dir: FileSystemDirectoryHandle = this.downloadsDir;
    for (const raw of segments) {
      const segment = sanitizeSegment(raw);
      try {
        dir = await dir.getDirectoryHandle(segment, { create });
      } catch {
        if (!create) return null;
        return null;
      }
    }
    return dir;
  }

  private async tryGetFile(
    dir: FileSystemDirectoryHandle,
    name: string,
  ): Promise<FileSystemFileHandle | null> {
    try {
      return await dir.getFileHandle(name);
    } catch {
      return null;
    }
  }

  private splitName(name: string): { base: string; ext: string } {
    const idx = name.lastIndexOf(".");
    if (idx <= 0) return { base: name, ext: "" };
    return { base: name.slice(0, idx), ext: name.slice(idx) };
  }

  private async generateUniqueName(
    dir: FileSystemDirectoryHandle,
    name: string,
  ): Promise<string> {
    const { base, ext } = this.splitName(name);
    let index = 1;
    while (index < 1000) {
      const candidate = `${base} (${index})${ext}`;
      const exists = await this.tryGetFile(dir, candidate);
      if (!exists) return candidate;
      index += 1;
    }
    return `${base}-${Date.now()}${ext}`;
  }

  private async requestConflictResolution(
    handle: FileSystemFileHandle,
    incomingFile: File,
    segments: string[],
    metadata: DownloadMetadata,
    appliedRules: DownloadRuleId[],
    existingHandle: FileSystemFileHandle,
  ): Promise<ConflictResolution> {
    if (typeof window === "undefined") {
      return { action: "keep-both" };
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const destination = segments.map(sanitizeSegment);
    const existingFile = await existingHandle.getFile();
    const event: DownloadConflictEvent = {
      id,
      name: handle.name,
      destination,
      pathLabel: formatPath(destination),
      metadata,
      rules: appliedRules,
      existing: {
        name: existingHandle.name,
        size: existingFile.size,
        lastModified: existingFile.lastModified,
      },
      incoming: {
        name: handle.name,
        size: incomingFile.size,
        lastModified: incomingFile.lastModified,
      },
    };
    publish(CONFLICT_TOPIC, event);
    return await new Promise<ConflictResolution>((resolve) => {
      const timeout = window.setTimeout(() => {
        if (this.conflictResolvers.has(id)) {
          this.conflictResolvers.delete(id);
          resolve({ action: "keep-both" });
        }
      }, CONFLICT_TIMEOUT);
      this.conflictResolvers.set(id, {
        resolve: (result) => {
          window.clearTimeout(timeout);
          this.conflictResolvers.delete(id);
          resolve(result);
        },
      });
    });
  }
}

let watcherInstance: DownloadWatcher | null = null;

export const startDownloadWatcher = async (
  options: DownloadWatcherOptions = {},
): Promise<boolean> => {
  if (watcherInstance) return true;
  const watcher = new DownloadWatcher(options);
  const started = await watcher.start();
  if (started) {
    watcherInstance = watcher;
  }
  return started;
};

export const stopDownloadWatcher = (): void => {
  watcherInstance?.stop();
  watcherInstance = null;
};

export const undoLastDownloadBatch = async (): Promise<boolean> => {
  if (!watcherInstance) return false;
  return await watcherInstance.undoLastBatch();
};

export const resolveDownloadConflict = (
  id: string,
  resolution: ConflictResolution,
): void => {
  watcherInstance?.resolveConflict(id, resolution);
};

export const subscribeToDownloadConflicts = (
  callback: (event: DownloadConflictEvent) => void,
): (() => void) => {
  if (typeof window === "undefined") return () => {};
  return subscribe(CONFLICT_TOPIC, (payload) => {
    callback(payload as DownloadConflictEvent);
  });
};

