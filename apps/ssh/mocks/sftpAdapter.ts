export type SftpSide = 'local' | 'remote';

export interface SftpEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: SftpEntry[];
}

export interface SftpSnapshot {
  local: SftpEntry[];
  remote: SftpEntry[];
}

export interface SftpOperationResult {
  success: boolean;
  message: string;
}

export interface SftpCopyOptions {
  from: SftpSide;
  to: SftpSide;
  path: string[];
  targetPath?: string[];
  newName?: string;
}

export interface SftpMoveOptions extends SftpCopyOptions {}

export interface SftpDeleteOptions {
  side: SftpSide;
  path: string[];
}

export interface SftpAdapter {
  getSnapshot(): SftpSnapshot;
  subscribe(listener: (snapshot: SftpSnapshot) => void): () => void;
  list(side: SftpSide, path?: string[]): SftpEntry[] | null;
  pathExists(side: SftpSide, path: string[]): boolean;
  entryExists(side: SftpSide, path: string[]): boolean;
  copy(options: SftpCopyOptions): SftpOperationResult;
  move(options: SftpMoveOptions): SftpOperationResult;
  delete(options: SftpDeleteOptions): SftpOperationResult;
}

const cloneEntries = (entries: SftpEntry[]): SftpEntry[] =>
  entries.map((entry) => ({
    ...entry,
    children: entry.children ? cloneEntries(entry.children) : undefined,
  }));

const cloneEntry = (entry: SftpEntry): SftpEntry => ({
  ...entry,
  children: entry.children ? cloneEntries(entry.children) : undefined,
});

class InMemorySftpAdapter implements SftpAdapter {
  private tree: Record<SftpSide, SftpEntry[]>;

  private listeners = new Set<(snapshot: SftpSnapshot) => void>();

  constructor(local: SftpEntry[], remote: SftpEntry[]) {
    this.tree = {
      local: cloneEntries(local),
      remote: cloneEntries(remote),
    };
  }

  getSnapshot(): SftpSnapshot {
    return {
      local: cloneEntries(this.tree.local),
      remote: cloneEntries(this.tree.remote),
    };
  }

  subscribe(listener: (snapshot: SftpSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  list(side: SftpSide, path: string[] = []): SftpEntry[] | null {
    const container = this.getContainer(side, path);
    if (!container) return null;
    return cloneEntries(container);
  }

  pathExists(side: SftpSide, path: string[]): boolean {
    return this.getContainer(side, path) !== null;
  }

  entryExists(side: SftpSide, path: string[]): boolean {
    return this.findEntry(side, path) !== null;
  }

  copy({ from, to, path, targetPath = [], newName }: SftpCopyOptions): SftpOperationResult {
    const source = this.findEntry(from, path);
    if (!source) {
      return { success: false, message: 'File not found.' };
    }
    if (source.entry.type !== 'file') {
      return { success: false, message: 'Only files can be copied in this demo.' };
    }
    const destination = this.getContainer(to, targetPath);
    if (!destination) {
      return { success: false, message: 'Target folder not found.' };
    }
    const duplicated = cloneEntry(source.entry);
    duplicated.name = newName ?? duplicated.name;
    const existingIndex = destination.findIndex((entry) => entry.name === duplicated.name);
    if (existingIndex !== -1) destination.splice(existingIndex, 1);
    destination.push(duplicated);
    this.emit();
    return {
      success: true,
      message: `Copied ${source.entry.name} to ${to}.`,
    };
  }

  move({ from, to, path, targetPath = [], newName }: SftpMoveOptions): SftpOperationResult {
    const source = this.findEntry(from, path);
    if (!source) {
      return { success: false, message: 'File not found.' };
    }
    if (source.entry.type !== 'file') {
      return { success: false, message: 'Only files can be moved in this demo.' };
    }
    const destination = this.getContainer(to, targetPath);
    if (!destination) {
      return { success: false, message: 'Target folder not found.' };
    }
    const moved = cloneEntry(source.entry);
    moved.name = newName ?? moved.name;
    const originalName = source.entry.name;
    const existingIndex = destination.findIndex((entry) => entry.name === moved.name);
    if (existingIndex !== -1) destination.splice(existingIndex, 1);
    destination.push(moved);
    source.parent.splice(source.index, 1);
    this.emit();
    return {
      success: true,
      message: `Moved ${originalName} to ${to}.`,
    };
  }

  delete({ side, path }: SftpDeleteOptions): SftpOperationResult {
    const target = this.findEntry(side, path);
    if (!target) {
      return { success: false, message: 'File not found.' };
    }
    if (target.entry.type !== 'file') {
      return { success: false, message: 'Only files can be deleted in this demo.' };
    }
    const [removed] = target.parent.splice(target.index, 1);
    this.emit();
    return {
      success: true,
      message: `Deleted ${removed.name} from ${side}.`,
    };
  }

  private emit() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private getContainer(side: SftpSide, path: string[]): SftpEntry[] | null {
    let entries = this.tree[side];
    if (path.length === 0) return entries;
    for (const segment of path) {
      const directory = entries.find((entry) => entry.name === segment && entry.type === 'directory');
      if (!directory) return null;
      if (!directory.children) {
        directory.children = [];
      }
      entries = directory.children;
    }
    return entries;
  }

  private findEntry(side: SftpSide, path: string[]):
    | { entry: SftpEntry; parent: SftpEntry[]; index: number }
    | null {
    if (path.length === 0) return null;
    const parentPath = path.slice(0, -1);
    const container = this.getContainer(side, parentPath);
    if (!container) return null;
    const name = path[path.length - 1];
    const index = container.findIndex((entry) => entry.name === name);
    if (index === -1) return null;
    return { entry: container[index], parent: container, index };
  }
}

export const createSftpAdapter = (local: SftpEntry[], remote: SftpEntry[]): SftpAdapter =>
  new InMemorySftpAdapter(local, remote);

export default InMemorySftpAdapter;
