
import { loadFauxFileSystem, saveFauxFileSystem } from '../../../services/fileExplorer/fauxFileSystem';

export interface FileEntry {
    name: string;
    kind: 'file' | 'directory';
}

export interface TerminalFileSystem {
    resolvePath(cwd: string, target: string): string;
    getHandle(
        path: string,
        create?: 'file' | 'directory' | false
    ): Promise<{ kind: 'file' | 'directory' } | null>;
    readDirectory(path: string): Promise<FileEntry[] | null>;
    readFile(path: string): Promise<string | null>;
    writeFile(path: string, content: string): Promise<boolean>;
    createDirectory(path: string): Promise<boolean>;
    deleteEntry(path: string): Promise<boolean>;
    exists(path: string): Promise<boolean>;
}

const resolvePath = (cwd: string, target: string, homePath = '/home'): string => {
    if (!target) return cwd;

    if (target === '~') return homePath;
    if (target.startsWith('~/')) return homePath + target.slice(1);

    const path = target.startsWith('/') ? target : `${cwd === '/' ? '' : cwd}/${target}`;

    const parts = path.split('/').filter(Boolean);
    const stack: string[] = [];

    for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') {
            stack.pop();
        } else {
            stack.push(part);
        }
    }

    return '/' + stack.join('/');
};

export class VirtualFileSystem implements TerminalFileSystem {
    private root: FileSystemDirectoryHandle | null = null;

    constructor(root: FileSystemDirectoryHandle | null) {
        this.root = root;
    }

    setRoot(root: FileSystemDirectoryHandle | null) {
        this.root = root;
    }

    resolvePath(cwd: string, target: string): string {
        return resolvePath(cwd, target);
    }

    async getHandle(
        path: string,
        create: 'file' | 'directory' | false = false
    ): Promise<FileSystemHandle | null> {
        if (!this.root) return null;

        const parts = path.split('/').filter(Boolean);
        let current: FileSystemDirectoryHandle = this.root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;

            try {
                if (isLast && create === 'file') {
                    return await current.getFileHandle(part, { create: true });
                }

                // If we are looking for a file at this stage (not last), it's an error unless strictly directory traversal
                // If creating directory
                if (isLast && create === 'directory') {
                    return await current.getDirectoryHandle(part, { create: true });
                }

                // Just traversing
                current = await current.getDirectoryHandle(part, { create: false });

                if (isLast && !create) return current;

            } catch (e) {
                // handle not found or type mismatch
                // If we are creating, we might need to create intermediate directories? 
                // For now assume mkdir -p logic or standard mkdir? 
                // Standard mkdir usually fails if parent doesn't exist.
                // Let's assume standard behavior: fail if parent missing.
                // BUT for 'cd', 'ls' etc we just return null on failure
                if (isLast && create === 'file') {
                    // Maybe parent doesn't exist? current is parent.
                    // If getFileHandle failed, it might be typemismatch or access denied
                }
                return null;
            }
        }

        // If path is root '/'
        if (parts.length === 0) return this.root;

        return current;
    }

    async readDirectory(path: string): Promise<FileEntry[] | null> {
        const handle = await this.getHandle(path);
        if (!handle || handle.kind !== 'directory') return null;

        const dirHandle = handle as FileSystemDirectoryHandle;
        const entries: FileEntry[] = [];

        try {
            // @ts-ignore - TS definitions for OPFS iteration might be missing/old
            for await (const [name, entry] of dirHandle.entries()) {
                entries.push({ name, kind: entry.kind });
            }
        } catch (e) {
            console.error('Error reading directory', e);
            return [];
        }
        return entries.sort((a, b) => {
            if (a.kind === b.kind) return a.name.localeCompare(b.name);
            return a.kind === 'directory' ? -1 : 1;
        });
    }

    async readFile(path: string): Promise<string | null> {
        const handle = await this.getHandle(path);
        if (!handle || handle.kind !== 'file') return null;

        try {
            const file = await (handle as FileSystemFileHandle).getFile();
            return await file.text();
        } catch {
            return null;
        }
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        // We need to resolve parent dir first to be safe, but getHandle with create='file' works if parent exists
        // But getHandle logic above assumes traversing directories. 
        // Let's rely on getHandle to find the file or create it if parent exists.

        try {
            // Need to split to get parent
            const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
            const fileName = path.split('/').pop()!;

            const parentHandle = await this.getHandle(parentPath);
            if (!parentHandle || parentHandle.kind !== 'directory') return false;

            const dirHandle = parentHandle as FileSystemDirectoryHandle;
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return true;
        } catch (e) {
            console.error('Write failed', e);
            return false;
        }
    }

    async createDirectory(path: string): Promise<boolean> {
        try {
            const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
            const dirName = path.split('/').pop()!;

            const parentHandle = await this.getHandle(parentPath);
            if (!parentHandle || parentHandle.kind !== 'directory') return false;

            await (parentHandle as FileSystemDirectoryHandle).getDirectoryHandle(dirName, { create: true });
            return true;
        } catch {
            return false;
        }
    }

    async deleteEntry(path: string): Promise<boolean> {
        try {
            const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
            const name = path.split('/').pop()!;

            const parentHandle = await this.getHandle(parentPath);
            if (!parentHandle || parentHandle.kind !== 'directory') return false;

            await (parentHandle as FileSystemDirectoryHandle).removeEntry(name);
            return true;
        } catch {
            return false;
        }
    }

    async exists(path: string): Promise<boolean> {
        const handle = await this.getHandle(path);
        return !!handle;
    }
}

interface FauxFileNode {
    id: string;
    name: string;
    type: 'folder' | 'file';
    content?: string;
    url?: string;
    children?: FauxFileNode[];
}

const createNodeId = () => `terminal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export class FauxFileSystem implements TerminalFileSystem {
    private root: FauxFileNode | null = null;
    private homePath = '/';

    constructor(homePath = '/') {
        this.homePath = homePath;
    }

    resolvePath(cwd: string, target: string): string {
        return resolvePath(cwd, target, this.homePath);
    }

    private loadTree() {
        this.root = loadFauxFileSystem() as FauxFileNode;
        return this.root;
    }

    private persistTree(tree: FauxFileNode) {
        saveFauxFileSystem(tree);
        this.root = tree;
    }

    private getRoot(): FauxFileNode {
        return this.root ?? this.loadTree();
    }

    private findEntry(
        path: string,
    ): { node: FauxFileNode | null; parent: FauxFileNode | null; name: string } {
        const root = this.getRoot();
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 0) {
            return { node: root, parent: null, name: '/' };
        }
        let current: FauxFileNode | null = root;
        let parent: FauxFileNode | null = null;
        for (let i = 0; i < parts.length; i += 1) {
            const segment = parts[i];
            if (!current || current.type !== 'folder') {
                return { node: null, parent: null, name: segment };
            }
            const children = Array.isArray(current.children) ? current.children : [];
            const next = children.find(
                (child) => child?.name?.toLowerCase() === segment.toLowerCase(),
            );
            if (!next) {
                return { node: null, parent: current, name: segment };
            }
            parent = current;
            current = next;
        }
        return { node: current, parent, name: current?.name ?? '' };
    }

    async getHandle(
        path: string,
        create: 'file' | 'directory' | false = false
    ): Promise<{ kind: 'file' | 'directory' } | null> {
        const entry = this.findEntry(path);
        if (entry.node) {
            return { kind: entry.node.type === 'folder' ? 'directory' : 'file' };
        }

        if (!create || !entry.parent) return null;

        if (create === 'directory') {
            const folder: FauxFileNode = {
                id: createNodeId(),
                name: entry.name,
                type: 'folder',
                children: [],
            };
            entry.parent.children = [...(entry.parent.children ?? []), folder];
            this.persistTree(this.getRoot());
            return { kind: 'directory' };
        }

        const file: FauxFileNode = {
            id: createNodeId(),
            name: entry.name,
            type: 'file',
            content: '',
        };
        entry.parent.children = [...(entry.parent.children ?? []), file];
        this.persistTree(this.getRoot());
        return { kind: 'file' };
    }

    async readDirectory(path: string): Promise<FileEntry[] | null> {
        const entry = this.findEntry(path);
        if (!entry.node || entry.node.type !== 'folder') return null;
        const entries = Array.isArray(entry.node.children) ? entry.node.children : [];
        return entries
            .map((child) => ({
                name: child.name,
                kind: child.type === 'folder' ? 'directory' : 'file',
            }))
            .sort((a, b) => {
                if (a.kind === b.kind) return a.name.localeCompare(b.name);
                return a.kind === 'directory' ? -1 : 1;
            });
    }

    async readFile(path: string): Promise<string | null> {
        const entry = this.findEntry(path);
        if (!entry.node || entry.node.type !== 'file') return null;
        if (typeof entry.node.content === 'string') return entry.node.content;
        if (entry.node.url) {
            return `File available at ${entry.node.url}`;
        }
        return '';
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        const entry = this.findEntry(path);
        if (entry.node && entry.node.type === 'file') {
            entry.node.content = content;
            this.persistTree(this.getRoot());
            return true;
        }

        if (!entry.parent || entry.parent.type !== 'folder') return false;
        const file: FauxFileNode = {
            id: createNodeId(),
            name: entry.name,
            type: 'file',
            content,
        };
        entry.parent.children = [...(entry.parent.children ?? []), file];
        this.persistTree(this.getRoot());
        return true;
    }

    async createDirectory(path: string): Promise<boolean> {
        const entry = this.findEntry(path);
        if (entry.node) return false;
        if (!entry.parent || entry.parent.type !== 'folder') return false;
        const folder: FauxFileNode = {
            id: createNodeId(),
            name: entry.name,
            type: 'folder',
            children: [],
        };
        entry.parent.children = [...(entry.parent.children ?? []), folder];
        this.persistTree(this.getRoot());
        return true;
    }

    async deleteEntry(path: string): Promise<boolean> {
        const entry = this.findEntry(path);
        if (!entry.parent || !entry.parent.children) return false;
        const next = entry.parent.children.filter((child) => child.name !== entry.name);
        if (next.length === entry.parent.children.length) return false;
        entry.parent.children = next;
        this.persistTree(this.getRoot());
        return true;
    }

    async exists(path: string): Promise<boolean> {
        const entry = this.findEntry(path);
        return !!entry.node;
    }
}
